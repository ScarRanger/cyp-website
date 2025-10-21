'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { FormLayout } from '@/app/types/form';
import Link from 'next/link';
import { Calendar, Users, Eye } from 'lucide-react';

export default function FormsPage() {
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Available Forms</h1>
          <p className="text-xl text-gray-600">Select a form below to get started</p>
        </div>

        {forms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Forms Available</h3>
            <p className="text-gray-500">There are currently no active forms to fill out.</p>
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
                  
                  <Link
                    href={`/forms/${form.id}`}
                    className="inline-flex items-center w-full justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Fill Out Form
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}