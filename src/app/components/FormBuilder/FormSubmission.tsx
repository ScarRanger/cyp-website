'use client';

import React, { useState } from 'react';
import { FormLayout } from '@/app/types/form';
import { useForm } from 'react-hook-form';

interface FormSubmissionProps {
  form: FormLayout;
}

interface FormData {
  [key: string]: any;
}

export default function FormSubmission({ form }: FormSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      // Process form data to handle file uploads
      const processedData: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof FileList && value.length > 0) {
          const file = value[0];
          if (file.type.startsWith('image/')) {
            // Upload image to Firebase Storage
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: uploadFormData,
            });
            
            const uploadResult = await uploadResponse.json();
            
            if (uploadResult.success) {
              processedData[key] = uploadResult.url;
            } else {
              throw new Error(`Failed to upload image: ${uploadResult.error}`);
            }
          } else {
            processedData[key] = file.name; // Store filename for non-image files
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

  const renderField = (field: any) => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500";
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
            <option value="">{field.placeholder || 'Select an option'}</option>
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
            className={`${fieldClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
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
              className={`${fieldClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
            />
            <p className="text-xs text-gray-500">Upload an image file (JPG, PNG, GIF)</p>
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
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Form Submitted Successfully!</h2>
          <p className="text-green-700">Thank you for your submission.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.title}</h1>
          {form.description && (
            <p className="text-gray-600">{form.description}</p>
          )}
          {form.imageUrl && (
            <div className="mt-4">
              <img
                src={form.imageUrl}
                alt="Form header"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {form.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
              {errors[field.id] && (
                <p className="text-sm text-red-600">{errors[field.id]?.message}</p>
              )}
            </div>
          ))}
          
          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">There was an error submitting the form. Please try again.</p>
            </div>
          )}
          
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
