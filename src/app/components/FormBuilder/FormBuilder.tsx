'use client';

import React, { useEffect, useState } from 'react';
import { FormLayout, FormField } from '@/app/types/form';
import FieldEditor from './FieldEditor';
import FormPreview from './FormPreview';
import { Save, Eye, EyeOff, Upload, X, Clipboard, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface FormBuilderProps {
  initialForm?: FormLayout;
}

export default function FormBuilder({ initialForm }: FormBuilderProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormLayout>(initialForm ?? {
    id: '',
    title: 'New Form',
    description: '',
    fields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    formType: 'general',
  });

  useEffect(() => {
    if (initialForm) {
      setForm(initialForm);
      setImagePreview(initialForm.imageUrl ?? null);
    }
  }, [initialForm]);
  
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCopied, setDialogCopied] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ formId?: string; spreadsheetUrl?: string; isEdit?: boolean }>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

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
    setImagePreview(null);
    setForm(prev => ({
      ...prev,
      imageUrl: undefined
    }));
  };

  const saveForm = async () => {
    setIsSaving(true);
    try {
      console.log('Saving form with fields:', form.fields);
      const isEdit = Boolean(form.id);
      const url = isEdit ? '/api/forms/update' : '/api/forms/save';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (result.success) {
        if (isEdit) {
          setSavedInfo({ formId: form.id, isEdit: true });
          setDialogOpen(true);
        } else {
          setForm(prev => ({ ...prev, id: result.formId }));
          setSavedInfo({ formId: result.formId, spreadsheetUrl: result.spreadsheetUrl, isEdit: false });
          setDialogOpen(true);
        }
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
                  rows={4}
                  placeholder="Enter form description (use Enter for line breaks)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Type
                </label>
                <select
                  value={form.formType || 'general'}
                  onChange={(e) => setForm(prev => ({ ...prev, formType: e.target.value as FormLayout['formType'] }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="general">General</option>
                  <option value="registration">Registration</option>
                  <option value="feedback">Feedback</option>
                  <option value="survey">Survey</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Header Image
                </label>
                <p className="text-xs text-gray-500 mb-2">Recommended aspect ratio: 4:1</p>
                {imagePreview ? (
                  <div className="relative">
                    <div className="relative w-full pb-[25%] rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="Form header"
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                    </div>
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
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (dragIndex === null || dragIndex === index) return;
                    setForm(prev => {
                      const newFields = [...prev.fields];
                      const [moved] = newFields.splice(dragIndex, 1);
                      newFields.splice(index, 0, moved);
                      return { ...prev, fields: newFields };
                    });
                    setDragIndex(null);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div 
                      onClick={() => setSelectedFieldId(field.id)}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-medium text-sm text-gray-900">{field.label}</p>
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
                  No fields added yet. Click &quot;Add Field&quot; to get started.
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

          {/* Public Submission Link */}
          {form.id && (
            <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Public Submission Link</h4>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin || ''}/forms/${form.id}`}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${origin || ''}/forms/${form.id}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    } catch (_) {
                      /* no-op */
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md"
                >
                  {copied ? <Check size={16} /> : <Clipboard size={16} />}
                  <span className="text-sm">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
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
              <p className="text-gray-500">Click &quot;Show Preview&quot; to see your form</p>
            </div>
          )}
        </div>
      </div>

      {/* Save/Update Result Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {savedInfo.isEdit ? 'Form Updated' : 'Form Saved'}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {savedInfo.formId && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Form ID</p>
                  <p className="text-sm text-gray-900 break-all">{savedInfo.formId}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Submission URL</p>
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${origin || ''}/forms/${savedInfo.formId || form.id}`}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(`${origin || ''}/forms/${savedInfo.formId || form.id}`);
                        setDialogCopied(true);
                        setTimeout(() => setDialogCopied(false), 1500);
                      } catch (_) { /* no-op */ }
                    }}
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md"
                  >
                    {dialogCopied ? <Check size={16} /> : <Clipboard size={16} />}
                    <span className="text-sm">{dialogCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              {savedInfo.spreadsheetUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Spreadsheet</p>
                  <a
                    href={savedInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {savedInfo.spreadsheetUrl}
                  </a>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
