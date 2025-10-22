'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { FormLayout } from '@/app/types/form';
import Link from 'next/link';
import { Calendar, Users, Eye, Trash2, ExternalLink, Plus } from 'lucide-react';
import AuthGuard from '@/app/components/Auth/AuthGuard';

export default function FormsManagementPage() {
  const [forms, setForms] = useState<FormLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const formsRef = collection(db, 'forms');
        const q = query(formsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const formsData: FormLayout[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          formsData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as FormLayout);
        });
        
        setForms(formsData);
      } catch (err) {
        console.error('Error fetching forms:', err);
        setError('Failed to load forms');
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'forms', formId));
      setForms(forms.filter(form => form.id !== formId));
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Failed to delete form');
    }
  };

  const toggleAccepting = async (formId: string, current?: boolean) => {
    try {
      const newValue = !(current === false ? false : true); // undefined -> true, toggled to false
      await updateDoc(doc(db, 'forms', formId), {
        acceptingResponses: newValue,
        updatedAt: new Date(),
      });
      setForms(prev => prev.map(f => f.id === formId ? { ...f, acceptingResponses: newValue, updatedAt: new Date() } as FormLayout : f));
    } catch (error) {
      console.error('Error updating acceptingResponses:', error);
      alert('Failed to update accepting responses');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forms Management</h1>
          <p className="text-gray-600">Manage your existing forms and create new ones</p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Form
        </Link>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Forms Created</h3>
          <p className="text-gray-500 mb-6">You haven't created any forms yet.</p>
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Form
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              {form.imageUrl && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={form.imageUrl}
                    alt={form.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                  {form.title}
                </h3>
                
                {form.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {form.description}
                  </p>
                )}
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    Created {form.createdAt.toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
                </div>
                
                {form.spreadsheetId && (
                  <div className="mb-4">
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${form.spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-green-600 hover:text-green-800"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Spreadsheet
                    </a>
                  </div>
                )}
                
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm">
                    <span className={`font-medium ${form.acceptingResponses === false ? 'text-red-600' : 'text-green-700'}`}>
                      {form.acceptingResponses === false ? 'Not accepting responses' : 'Accepting responses'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleAccepting(form.id, form.acceptingResponses)}
                    className={`px-3 py-1 rounded-md text-sm border ${form.acceptingResponses === false ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100'}`}
                  >
                    {form.acceptingResponses === false ? 'Start accepting' : 'Stop accepting'}
                  </button>
                </div>

                <div className="flex space-x-2">
                  <Link
                    href={`/forms/${form.id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Link>
                  <button
                    onClick={() => handleDeleteForm(form.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
