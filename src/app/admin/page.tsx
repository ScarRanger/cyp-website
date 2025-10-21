'use client';

import React, { useState } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import FormBuilder from '@/app/components/FormBuilder/FormBuilder';
import Link from 'next/link';
import { Plus, List, Settings } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'builder' | 'forms'>('builder');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Navigation */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <nav className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('builder')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'builder'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Form Builder
                  </button>
                  <Link
                    href="/admin/forms"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Manage Forms
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'builder' && <FormBuilder />}
        </div>
      </div>
    </AuthGuard>
  );
}
