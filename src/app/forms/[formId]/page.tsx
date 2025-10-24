'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { FormLayout } from '@/app/types/form';
import FormSubmission from '@/app/components/FormBuilder/FormSubmission';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function FormSubmissionPage() {
  const params = useParams();
  const formId = params.formId as string;
  
  const [form, setForm] = useState<FormLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const formRef = doc(db, 'forms', formId);
        const formSnap = await getDoc(formRef);
        
        if (formSnap.exists()) {
          const data = formSnap.data();
          const normalizeDate = (val: unknown): Date => {
            if (!val) return new Date();
            const maybeTs = val as { toDate?: () => Date };
            if (typeof maybeTs?.toDate === 'function') return maybeTs.toDate();
            if (val instanceof Date) return val;
            if (typeof val === 'string' || typeof val === 'number') {
              const d = new Date(val);
              return isNaN(d.getTime()) ? new Date() : d;
            }
            return new Date();
          };
          setForm({
            id: formSnap.id,
            ...data,
            createdAt: normalizeDate(data.createdAt),
            updatedAt: normalizeDate(data.updatedAt),
          } as FormLayout);
        } else {
          setError('Form not found');
        }
      } catch (err) {
        console.error('Error fetching form:', err);
        setError('Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    if (formId) {
      fetchForm();
    }
  }, [formId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold uppercase tracking-[-0.02em] text-gray-900 mb-2">Form Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error || 'The form you are looking for does not exist or has been removed.'}
            </p>
            <Link
              href="/forms"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/forms"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Link>
            <div className="text-sm text-gray-500">
              Form ID: {form.id}
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="py-8">
        <FormSubmission form={form} />
      </div>
    </div>
  );
}
