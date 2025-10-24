'use client';

import React, { useEffect, useState } from 'react';
import { FormLayout, FormField } from '@/app/types/form';
import { useForm } from 'react-hook-form';
import { Button } from '@/app/components/ui/button';
import Image from 'next/image';

interface FormSubmissionProps {
  form: FormLayout;
}

type FormData = Record<string, unknown>;

export default function FormSubmission({ form }: FormSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const { register, handleSubmit, formState: { errors, isValid }, reset, getValues, setValue } = useForm<FormData>({ mode: 'onChange' });
  const formKey = `form_draft_${form.id}`;

  const linkify = (text: string) => {
    const splitRegex = /(https?:\/\/[^\s]+)/g; // for splitting only
    const parts = text.split(splitRegex);
    return (
      <div className="whitespace-pre-line text-slate-700">
        {parts.map((part, idx) => {
          const isUrl = /^https?:\/\/\S+$/i.test(part);
          if (isUrl) {
            return (
              <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="break-words text-sky-700 underline hover:text-sky-800">
                {part}
              </a>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      // Process form data to handle file uploads
      const processedData: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof FileList && value.length > 0) {
          const file = value[0];
          // Upload any file to Appwrite Storage
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('isAdminUpload', 'false');
          const fieldMeta = form.fields.find(f => f.id === key);
          const uploadType = fieldMeta?.type === 'image' ? 'image' : 'file';
          uploadFormData.append('uploadType', uploadType);

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          const uploadResult = await uploadResponse.json();

          if (uploadResult.success) {
            processedData[key] = uploadResult.url;
          } else {
            throw new Error(`Failed to upload file: ${uploadResult.error}`);
          }
        } else if (Array.isArray(value)) {
          processedData[key] = value.join(', ');
        } else {
          processedData[key] = value;
        }
      }

      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: form.id,
          data: processedData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');
        reset();
        // clear draft
        try { localStorage.removeItem(formKey); } catch {}
      } else {
        throw new Error(result.error || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Autosave draft to localStorage every few seconds and when values change
  useEffect(() => {
    // load draft if exists
    try {
      const raw = localStorage.getItem(formKey);
      if (raw) {
        const values = JSON.parse(raw);
        Object.entries(values).forEach(([k, v]) => setValue(k, v));
      }
    } catch {}

    const saveDraft = () => {
      try {
        const vals = getValues();
        localStorage.setItem(formKey, JSON.stringify(vals));
      } catch {}
    };

    const interval = setInterval(saveDraft, 5000);
    return () => clearInterval(interval);
  }, [formKey, getValues, setValue]);

  // Warn before unload if form is dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      try {
        const vals = getValues();
        const hasData = Object.keys(vals).some(k => {
          const v = (vals as Record<string, unknown>)[k];
          return v !== undefined && v !== '' && !(v instanceof FileList && v.length === 0);
        });
        if (hasData) {
          e.preventDefault();
          e.returnValue = '';
        }
      } catch {}
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [getValues]);

  // Focus first error when errors change
  useEffect(() => {
    const keys = Object.keys(errors);
    if (keys.length > 0) {
      const el = document.querySelector(`[name="${keys[0]}"]`) as HTMLElement | null;
      if (el && typeof el.focus === 'function') el.focus();
    }
  }, [errors]);

  const renderField = (field: FormField) => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 placeholder-slate-500";
    const errorClasses = "border-red-500 focus:ring-red-500";
    
    const fieldClasses = errors[field.id] ? `${baseClasses} ${errorClasses}` : baseClasses;
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...register(field.id, {
              required: field.required ? `${field.label} is required` : false,
              minLength: field.validation?.minLength ? {
                value: field.validation.minLength,
                message: `Minimum length is ${field.validation.minLength}`
              } : undefined,
              maxLength: field.validation?.maxLength ? {
                value: field.validation.maxLength,
                message: `Maximum length is ${field.validation.maxLength}`
              } : undefined,
            })}
            placeholder={field.placeholder}
            className={`${fieldClasses} resize-vertical`}
            rows={3}
          />
        );
      
      case 'select':
        return (
          <select
            {...register(field.id, {
              required: field.required ? `${field.label} is required` : false,
            })}
            className={`${fieldClasses} bg-white`}
          >
            {field.options?.map((option: string, index: number) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  {...register(field.id, {
                    required: field.required ? `${field.label} is required` : false,
                  })}
                  type="radio"
                  value={option}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  {...register(`${field.id}.${index}`, {
                    required: field.required ? `${field.label} is required` : false,
                  })}
                  type="checkbox"
                  value={option}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'file':
        return (
          <input
            {...register(field.id, {
              required: field.required ? `${field.label} is required` : false,
            })}
            type="file"
            className={`${fieldClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100`}
          />
        );
      
      case 'image':
        return (
          <div className="space-y-2">
            <input
              {...register(field.id, {
                required: field.required ? `${field.label} is required` : false,
              })}
              type="file"
              accept="image/*"
              className={`${fieldClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100`}
            />
            <p className="text-xs text-gray-500">Upload an image file (JPG, PNG, GIF)</p>
          </div>
        );
      
      case 'admin-image':
        return (
          <div className="space-y-2">
            {field.imageUrl ? (
              <div className="text-center">
                <div className="relative mx-auto h-auto w-full max-w-md">
                  <Image
                    src={field.imageUrl}
                    alt={field.label}
                    width={800}
                    height={600}
                    className="h-auto w-full rounded-lg border"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{field.label}</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">No image available</p>
                <p className="text-xs text-gray-400 mt-1">Field ID: {field.id}</p>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <input
            {...register(field.id, {
              required: field.required ? `${field.label} is required` : false,
              min: field.validation?.min,
              max: field.validation?.max,
              minLength: field.validation?.minLength ? {
                value: field.validation.minLength,
                message: `Minimum length is ${field.validation.minLength}`
              } : undefined,
              maxLength: field.validation?.maxLength ? {
                value: field.validation.maxLength,
                message: `Maximum length is ${field.validation.maxLength}`
              } : undefined,
              pattern: field.validation?.pattern ? {
                value: new RegExp(field.validation.pattern),
                message: 'Invalid format'
              } : undefined,
            })}
            type={field.type}
            placeholder={field.placeholder}
            className={fieldClasses}
          />
        );
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Form Submitted Successfully!</h2>
          <p className="text-green-700">Thank you for your submission.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Header image on top */}
        {form.imageUrl && (
          <div className="mb-4">
            <div className="relative w-full pb-[25%] rounded-lg overflow-hidden">
              <Image
                src={form.imageUrl}
                alt="Form header"
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </div>
        )}
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">{form.title}</h1>
          {form.description && linkify(form.description)}
        </div>
        {form.acceptingResponses === false ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            This form is no longer accepting responses.
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {form.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              {field.type !== 'admin-image' && (
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}
              {renderField(field)}
              {Boolean(errors[field.id]?.message) && (
                <p className="text-sm text-red-600">{String(errors[field.id]?.message)}</p>
              )}
            </div>
          ))}
          
          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">There was an error submitting the form. Please try again.</p>
            </div>
          )}
          
          <div className="pt-4">
            <Button type="submit" disabled={isSubmitting || !isValid} className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
