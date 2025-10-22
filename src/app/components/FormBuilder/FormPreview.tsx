'use client';

import React from 'react';
import { FormField, FormLayout } from '@/app/types/form';

interface FormPreviewProps {
  form: FormLayout;
}

export default function FormPreview({ form }: FormPreviewProps) {
  const linkify = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return (
      <div className="text-gray-600 whitespace-pre-line">
        {parts.map((part, idx) => {
          if (urlRegex.test(part)) {
            return (
              <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-words">
                {part}
              </a>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };
  const renderField = (field: FormField) => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500";
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            key={field.id}
            placeholder={field.placeholder}
            className={`${baseClasses} resize-vertical`}
            rows={3}
            disabled
          />
        );
      
      case 'select':
        return (
          <select
            key={field.id}
            className={`${baseClasses} bg-white`}
            disabled
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={field.id} className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  name={field.id}
                  value={option}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'file':
        return (
          <input
            key={field.id}
            type="file"
            className={`${baseClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
            disabled
          />
        );
      
      case 'image':
        return (
          <div key={field.id} className="space-y-2">
            <input
              type="file"
              accept="image/*"
              className={`${baseClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
              disabled
            />
            <p className="text-xs text-gray-500">Upload an image file</p>
          </div>
        );
      
      case 'admin-image':
        return (
          <div key={field.id} className="space-y-2">
            {field.imageUrl ? (
              <div className="text-center">
                <img
                  src={field.imageUrl}
                  alt={field.label}
                  className="max-w-full h-auto mx-auto rounded-lg border"
                />
                <p className="text-sm text-gray-600 mt-2">{field.label}</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">No image uploaded</p>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <input
            key={field.id}
            type={field.type}
            placeholder={field.placeholder}
            className={baseClasses}
            disabled
          />
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header image on top */}
      {form.imageUrl && (
        <div className="mb-4">
          <div className="relative w-full pb-[25%] rounded-lg overflow-hidden">
            <img
              src={form.imageUrl}
              alt="Form header"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      )}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h2>
        {form.description && linkify(form.description)}
      </div>

      <form className="space-y-6">
        {form.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            {field.type !== 'admin-image' && (
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {renderField(field)}
            {field.validation && (
              <div className="text-xs text-gray-500">
                {field.validation.minLength && `Min length: ${field.validation.minLength}`}
                {field.validation.maxLength && `Max length: ${field.validation.maxLength}`}
                {field.validation.min && `Min value: ${field.validation.min}`}
                {field.validation.max && `Max value: ${field.validation.max}`}
              </div>
            )}
          </div>
        ))}
        
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          >
            Submit Form
          </button>
        </div>
      </form>
    </div>
  );
}