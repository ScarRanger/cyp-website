'use client';

import React, { useState } from 'react';
import { FormLayout, FormField } from '@/app/types/form';
import FieldEditor from './FieldEditor';
import FormPreview from './FormPreview';
import { Plus, Save, Eye, EyeOff, Upload, X } from 'lucide-react';

export default function FormBuilder() {
  const [form, setForm] = useState<FormLayout>({
    id: '',
    title: 'New Form',
    description: '',
    fields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const addField = (type: FormField['type'] = 'text') => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: type === 'image' ? 'Image' : 'New Field',
      placeholder: '',
      required: false,
    };
    
    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    
    setSelectedFieldId(newField.id);
  };

  const updateField = (updatedField: FormField) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === updatedField.id ? updatedField : field
      )
    }));
  };

  const deleteField = (fieldId: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
    
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setForm(prev => {
      const fields = [...prev.fields];
      const index = fields.findIndex(field => field.id === fieldId);
      
      if (direction === 'up' && index > 0) {
        [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
      } else if (direction === 'down' && index < fields.length - 1) {
        [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      }
      
      return { ...prev, fields };
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setForm(prev => ({
          ...prev,
          imageUrl: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm(prev => ({
      ...prev,
      imageUrl: undefined
    }));
  };

  const saveForm = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/forms/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (result.success) {
        setForm(prev => ({ ...prev, id: result.formId }));
        alert(`Form saved successfully!\n\nForm ID: ${result.formId}\nSpreadsheet: ${result.spreadsheetUrl}`);
      } else {
        throw new Error(result.error || 'Failed to save form');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert(`Error saving form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedField = form.fields.find(field => field.id === selectedFieldId);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Builder</h1>
        <p className="text-gray-600">Create and customize your forms with drag-and-drop ease</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  rows={3}
                  placeholder="Enter form description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Header Image
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Form header"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <label className="cursor-pointer">
                      <span className="text-sm text-gray-600">Click to upload image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fields List */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
              <div className="flex items-center space-x-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addField(e.target.value as FormField['type']);
                      e.target.value = '';
                    }
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Add Field Type</option>
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="tel">Phone</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select</option>
                  <option value="radio">Radio</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="date">Date</option>
                  <option value="file">File</option>
                  <option value="image">Image Upload</option>
                  <option value="admin-image">Display Image (Admin)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              {form.fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    selectedFieldId === field.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div 
                      onClick={() => setSelectedFieldId(field.id)}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-medium text-sm">{field.label}</p>
                      <p className="text-xs text-gray-500 capitalize">{field.type}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {field.required && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                      <div className="flex flex-col">
                        <button
                          onClick={() => moveField(field.id, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveField(field.id, 'down')}
                          disabled={index === form.fields.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {form.fields.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No fields added yet. Click "Add Field" to get started.
                </p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveForm}
            disabled={isSaving || form.fields.length === 0}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Save size={20} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Form'}
          </button>
        </div>

        {/* Field Editor */}
        <div className="lg:col-span-1">
          {selectedField ? (
            <FieldEditor
              field={selectedField}
              onUpdate={updateField}
              onDelete={() => deleteField(selectedField.id)}
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
              <p className="text-gray-500">Select a field to edit its properties</p>
            </div>
          )}
        </div>

        {/* Form Preview */}
        <div className="lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              {showPreview ? <EyeOff size={20} /> : <Eye size={20} />}
              <span className="ml-1 text-sm">
                {showPreview ? 'Hide' : 'Show'} Preview
              </span>
            </button>
          </div>
          
          {showPreview ? (
            <FormPreview form={form} />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
              <p className="text-gray-500">Click "Show Preview" to see your form</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
