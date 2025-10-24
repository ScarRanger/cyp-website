'use client';

import React from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import Link from 'next/link';
import { Plus, List, Settings, Image as ImageIcon } from 'lucide-react';

export default function AdminPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Quick actions to manage and create forms</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Link href="/admin/create" className="block">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                <div className="flex items-center mb-4">
                  <Plus className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Create New Form</h2>
                </div>
                <p className="text-gray-600">Open the form builder to create a new form.</p>
              </div>
            </Link>

            <Link href="/admin/forms" className="block">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                <div className="flex items-center mb-4">
                  <List className="h-5 w-5 text-green-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Manage Forms</h2>
                </div>
                <p className="text-gray-600">View, edit, toggle accepting responses, or delete forms.</p>
              </div>
            </Link>

            <Link href="/admin/gallery" className="block">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                <div className="flex items-center mb-4">
                  <ImageIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Gallery Uploads</h2>
                </div>
                <p className="text-gray-600">Upload images/videos and tag them by event/category.</p>
              </div>
            </Link>

            <Link href="/admin/gallery/manage" className="block">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                <div className="flex items-center mb-4">
                  <ImageIcon className="h-5 w-5 text-sky-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Manage Gallery</h2>
                </div>
                <p className="text-gray-600">Compact list with search, pagination, and bulk delete.</p>
              </div>
            </Link>

            <Link href="/admin/admins" className="block">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm h-full">
                <div className="flex items-center mb-4">
                  <Settings className="h-5 w-5 text-gray-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Manage Admins</h2>
                </div>
                <p className="text-gray-600">Add or remove administrator accounts.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
