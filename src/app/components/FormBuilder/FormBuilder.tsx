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
  theme?: 'light' | 'espresso';
}

// Warm Espresso Theme Colors
const espressoTheme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(251, 146, 60, 0.3)',
};

export default function FormBuilder({ initialForm, theme = 'light' }: FormBuilderProps) {
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

  const isEspresso = theme === 'espresso';

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
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);

      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to S3
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', 'image');
      formData.append('isAdminUpload', 'true');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.url) {
        // Update form with S3 CloudFront URL
        setForm(prev => ({
          ...prev,
          imageUrl: result.url
        }));
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      // Clear preview on error
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
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

  const containerClass = isEspresso ? 'bg-[#1C1917] border-[#FB923C]/30' : 'bg-white border-gray-200';
  const textClass = isEspresso ? 'text-[#FAFAFA]' : 'text-gray-900';
  const subTextClass = isEspresso ? 'text-[#FAFAFA]/70' : 'text-gray-600';
  const inputClass = isEspresso
    ? 'w-full border border-[#FB923C]/30 rounded-md px-3 py-2 bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#FB923C] text-[#FAFAFA] placeholder-white/30'
    : 'w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500';

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${textClass}`}>Form Builder</h1>
        <p className={subTextClass}>Create and customize your forms with drag-and-drop ease</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`border rounded-lg p-4 shadow-sm ${containerClass}`}>
            <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Form Settings</h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isEspresso ? 'text-[#FAFAFA]/90' : 'text-gray-700'}`}>
                  Form Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isEspresso ? 'text-[#FAFAFA]/90' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className={inputClass}
                  rows={4}
                  placeholder="Enter form description (use Enter for line breaks)"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isEspresso ? 'text-[#FAFAFA]/90' : 'text-gray-700'}`}>
                  Form Type
                </label>
                <select
                  value={form.formType || 'general'}
                  onChange={(e) => setForm(prev => ({ ...prev, formType: e.target.value as FormLayout['formType'] }))}
                  className={inputClass}
                  style={isEspresso ? { backgroundColor: '#1C1917' } : {}}
                >
                  <option value="general">General</option>
                  <option value="registration">Registration</option>
                  <option value="feedback">Feedback</option>
                  <option value="survey">Survey</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isEspresso ? 'text-[#FAFAFA]/90' : 'text-gray-700'}`}>
                  Form Header Image
                </label>
                <p className={`text-xs mb-2 ${isEspresso ? 'text-[#FAFAFA]/50' : 'text-gray-500'}`}>Recommended aspect ratio: 4:1</p>
                {uploadingImage && (
                  <div className="mb-2 text-sm text-[#FB923C]">Uploading image...</div>
                )}
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
                      disabled={uploadingImage}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center ${isEspresso ? 'border-[#FB923C]/30' : 'border-gray-300'}`}>
                    <Upload className={`mx-auto h-8 w-8 mb-2 ${isEspresso ? 'text-[#FB923C]/50' : 'text-gray-400'}`} />
                    <label className="cursor-pointer">
                      <span className={`text-sm ${isEspresso ? 'text-[#FAFAFA]/70' : 'text-gray-600'}`}>
                        {uploadingImage ? 'Uploading...' : 'Click to upload image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fields List */}
          <div className={`border rounded-lg p-4 shadow-sm ${containerClass}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${textClass}`}>Form Fields</h3>
              <div className="flex items-center space-x-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addField(e.target.value as FormField['type']);
                      e.target.value = '';
                    }
                  }}
                  className={`text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 ${isEspresso
                    ? 'bg-[#1C1917] border-[#FB923C]/30 text-[#FAFAFA] focus:ring-[#FB923C]'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                    }`}
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
                  className={`p-3 border rounded-lg transition-colors ${selectedFieldId === field.id
                    ? isEspresso ? 'border-[#FB923C] bg-[#FB923C]/10' : 'border-blue-500 bg-blue-50'
                    : isEspresso ? 'border-[#FB923C]/20 hover:border-[#FB923C]/40' : 'border-gray-200 hover:border-gray-300'
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
                      <p className={`font-medium text-sm ${textClass}`}>{field.label}</p>
                      <p className={`text-xs capitalize ${subTextClass}`}>{field.type}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {field.required && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                      <div className="flex flex-col">
                        <button
                          onClick={() => moveField(field.id, 'up')}
                          disabled={index === 0}
                          className={`disabled:opacity-30 ${isEspresso ? 'text-[#FB923C] hover:text-[#FCD34D]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveField(field.id, 'down')}
                          disabled={index === form.fields.length - 1}
                          className={`disabled:opacity-30 ${isEspresso ? 'text-[#FB923C] hover:text-[#FCD34D]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {form.fields.length === 0 && (
                <p className={`text-sm text-center py-4 ${subTextClass}`}>
                  No fields added yet. Click &quot;Add Field&quot; to get started.
                </p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveForm}
            disabled={isSaving || form.fields.length === 0}
            className={`w-full py-3 px-4 rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold ${isEspresso
              ? 'bg-[#FB923C] text-[#1C1917] hover:bg-[#FCD34D] focus:ring-[#FB923C]'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
          >
            <Save size={20} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Form'}
          </button>

          {/* Public Submission Link */}
          {form.id && (
            <div className={`mt-4 border rounded-lg p-4 shadow-sm ${containerClass}`}>
              <h4 className={`text-sm font-semibold mb-2 ${textClass}`}>Public Submission Link</h4>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin || ''}/forms/${form.id}`}
                  className={`flex-1 border rounded-md px-3 py-2 ${isEspresso ? 'bg-white/5 border-[#FB923C]/30 text-[#FAFAFA]' : 'border-gray-300 text-gray-900'}`}
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
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${isEspresso
                    ? 'bg-[#FB923C]/20 hover:bg-[#FB923C]/30 text-[#FB923C]'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
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
              theme={theme}
            />
          ) : (
            <div className={`border rounded-lg p-8 shadow-sm text-center ${containerClass}`}>
              <p className={subTextClass}>Select a field to edit its properties</p>
            </div>
          )}
        </div>

        {/* Form Preview */}
        <div className="lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-semibold ${textClass}`}>Preview</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center ${isEspresso ? 'text-[#FB923C] hover:text-[#FCD34D]' : 'text-gray-600 hover:text-gray-800'}`}
            >
              {showPreview ? <EyeOff size={20} /> : <Eye size={20} />}
              <span className="ml-1 text-sm">
                {showPreview ? 'Hide' : 'Show'} Preview
              </span>
            </button>
          </div>

          {showPreview ? (
            <FormPreview form={form} theme={theme} />
          ) : (
            <div className={`border rounded-lg p-8 shadow-sm text-center ${containerClass}`}>
              <p className={subTextClass}>Click &quot;Show Preview&quot; to see your form</p>
            </div>
          )}
        </div>
      </div>

      {/* Save/Update Result Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className={`relative z-10 w-full max-w-lg rounded-lg p-6 shadow-xl ${isEspresso ? 'bg-[#1C1917] border border-[#FB923C]/30' : 'bg-white'}`}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className={`text-lg font-semibold ${textClass}`}>
                {savedInfo.isEdit ? 'Form Updated' : 'Form Saved'}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className={`${subTextClass} hover:opacity-100`}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {savedInfo.formId && (
                <div>
                  <p className={`text-sm font-medium ${subTextClass}`}>Form ID</p>
                  <p className={`text-sm break-all ${textClass}`}>{savedInfo.formId}</p>
                </div>
              )}
              <div>
                <p className={`text-sm font-medium mb-1 ${subTextClass}`}>Submission URL</p>
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${origin || ''}/forms/${savedInfo.formId || form.id}`}
                    className={`flex-1 border rounded-md px-3 py-2 ${isEspresso ? 'bg-white/5 border-[#FB923C]/30 text-[#FAFAFA]' : 'border-gray-300 text-gray-900'}`}
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
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${isEspresso
                      ? 'bg-[#FB923C]/20 hover:bg-[#FB923C]/30 text-[#FB923C]'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                  >
                    {dialogCopied ? <Check size={16} /> : <Clipboard size={16} />}
                    <span className="text-sm">{dialogCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              {savedInfo.spreadsheetUrl && (
                <div>
                  <p className={`text-sm font-medium ${subTextClass}`}>Spreadsheet</p>
                  <a
                    href={savedInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm hover:underline break-all ${isEspresso ? 'text-[#FB923C]' : 'text-blue-600'}`}
                  >
                    {savedInfo.spreadsheetUrl}
                  </a>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDialogOpen(false)}
                className={`inline-flex items-center rounded-md border px-4 py-2 text-sm ${isEspresso
                  ? 'border-[#FB923C]/30 bg-transparent text-[#FAFAFA] hover:bg-white/5'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
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
