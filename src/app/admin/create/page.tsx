'use client';

import React from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import FormBuilder from '@/app/components/FormBuilder/FormBuilder';

export default function AdminCreateFormPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-semibold uppercase tracking-[-0.02em] text-gray-900 mb-2">Create New Form</h1>
          <p className="text-gray-600 mb-6">Use the builder below to configure a new form.</p>
          <FormBuilder />
        </div>
      </div>
    </AuthGuard>
  );
}
