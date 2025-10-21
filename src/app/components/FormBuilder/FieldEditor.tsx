'use client';

import React from 'react';
import { FormField } from '@/app/types/form';
import { X, Plus, Trash2 } from 'lucide-react';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
}

export default function FieldEditor({ field, onUpdate, onDelete }: FieldEditorProps) {
  const updateField = (updates: Partial<FormField>) => {
    onUpdate({ ...field, ...updates });
  };

  const addOption = () => {
    const newOptions = [...(field.options || []), ''];
    updateField({ options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = value;
    updateField({ options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = field.options?.filter((_, i) => i !== index) || [];
    updateField({ options: newOptions });
  };

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'tel', label: 'Phone' },
    { value: 'url', label: 'URL' },
    { value: 'password', label: 'Password' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'select', label: 'Select' },
    { value: 'radio', label: 'Radio' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Time' },
    { value: 'datetime-local', label: 'DateTime' },
    { value: 'file', label: 'File' },
    { value: 'image', label: 'Image' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Field Editor</h3>
        <button
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 p-1"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Field Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Type
          </label>
          <select
            value={field.type}
            onChange={(e) => updateField({ type: e.target.value as FormField['type'] })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            {fieldTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => updateField({ label: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            placeholder="Enter field label"
          />
        </div>

        {/* Placeholder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => updateField({ placeholder: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            placeholder="Enter placeholder text"
          />
        </div>

        {/* Required */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="required"
            checked={field.required}
            onChange={(e) => updateField({ required: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="required" className="ml-2 text-sm font-medium text-gray-700">
            Required field
          </label>
        </div>

        {/* Options for select, radio, checkbox */}
        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    onClick={() => removeOption(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <Plus size={16} className="mr-1" />
                Add Option
              </button>
            </div>
          </div>
        )}

        {/* Validation Rules */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Validation Rules</h4>
          <div className="grid grid-cols-2 gap-4">
            {field.type === 'number' && (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Value</label>
                  <input
                    type="number"
                    value={field.validation?.min || ''}
                    onChange={(e) => updateField({ 
                      validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Min value"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Value</label>
                  <input
                    type="number"
                    value={field.validation?.max || ''}
                    onChange={(e) => updateField({ 
                      validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Max value"
                  />
                </div>
              </>
            )}
            {(field.type === 'text' || field.type === 'textarea') && (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Length</label>
                  <input
                    type="number"
                    value={field.validation?.minLength || ''}
                    onChange={(e) => updateField({ 
                      validation: { ...field.validation, minLength: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Min length"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Length</label>
                  <input
                    type="number"
                    value={field.validation?.maxLength || ''}
                    onChange={(e) => updateField({ 
                      validation: { ...field.validation, maxLength: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Max length"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
