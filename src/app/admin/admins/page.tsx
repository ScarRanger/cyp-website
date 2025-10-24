'use client';

import React, { useEffect, useState } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import { collection, addDoc, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

const OWNER_EMAIL = 'rhine.pereira@gmail.com';
const ADMIN_COLLECTION = 'cyp_admins';

export default function AdminsManagementPage() {
  const [admins, setAdmins] = useState<Array<{ id: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, ADMIN_COLLECTION));
      const snap = await getDocs(q);
      const list: Array<{ id: string; email: string }> = [];
      snap.forEach((d) => {
        const data = d.data() as { email?: string };
        list.push({ id: d.id, email: data.email ?? '' });
      });
      setAdmins(list);
    } catch (err) {
      console.error('Error loading admins:', err);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return alert('Enter an email');
    if (email === OWNER_EMAIL.toLowerCase()) return alert('Owner is already an admin');
    if (admins.some(a => a.email.toLowerCase() === email)) return alert('Email already added');

    setSaving(true);
    try {
      const ref = await addDoc(collection(db, ADMIN_COLLECTION), { email });
      setAdmins(prev => [...prev, { id: ref.id, email }]);
      setNewEmail('');
    } catch (err) {
      console.error('Error adding admin:', err);
      alert('Failed to add admin');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string, email: string) => {
    if (email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      return alert('Cannot remove owner account');
    }
    if (!confirm(`Remove admin ${email}?`)) return;

    try {
      await deleteDoc(doc(db, ADMIN_COLLECTION, id));
      setAdmins(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error removing admin:', err);
      alert('Failed to remove admin');
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Administrators</h1>
          <p className="text-gray-600">Add or remove admin accounts that can access the admin pages.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex space-x-2">
            <input
              type="email"
              placeholder="admin@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Current Admins</h2>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <ul className="space-y-2">
              {/* Show owner explicitly */}
              <li key="owner" className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium text-gray-900">{OWNER_EMAIL}</div>
                  {/* <div className="text-xs text-gray-600">Owner</div> */}
                </div>
              </li>

              {admins.length === 0 && (
                <li className="py-6 text-center text-gray-600">No other admins added.</li>
              )}

              {admins.map((admin) => (
                <li key={admin.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium text-gray-900">{admin.email}</div>
                    {/* <div className="text-xs text-gray-600">Admin</div> */}
                  </div>
                  <div>
                    <button
                      onClick={() => handleRemove(admin.id, admin.email)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
