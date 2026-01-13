'use client';

import React, { useEffect, useState } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import { collection, setDoc, getDocs, deleteDoc, doc, query } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import Spinner from '@/app/components/Spinner';

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

  // Refactored to key admins by email for Security Rules compatibility
  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return alert('Enter an email');
    if (email === OWNER_EMAIL.toLowerCase()) return alert('Owner is already an admin');
    if (admins.some(a => a.email.toLowerCase() === email)) return alert('Email already added');

    setSaving(true);
    try {
      // Use email as Document ID
      await setDoc(doc(db, ADMIN_COLLECTION, email), { email });
      setAdmins(prev => [...prev, { id: email, email }]);
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
      <div className="min-h-screen bg-[#1C1917]">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold uppercase tracking-[-0.02em] text-[#FAFAFA]">Manage Administrators</h1>
            <p className="text-[#FAFAFA]/70">Add or remove admin accounts that can access the admin pages.</p>
          </div>

          <div className="bg-[#1C1917] border border-[#FB923C]/30 rounded-lg p-6 mb-6">
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder="admin@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 border border-[#FB923C]/30 rounded-md px-3 py-2 text-[#FAFAFA] placeholder-[#FAFAFA]/30 bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#FB923C]"
              />
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 bg-[#FB923C] text-[#1C1917] rounded-md hover:bg-[#FCD34D] disabled:opacity-50 font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          <div className="bg-[#1C1917] border border-[#FB923C]/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-[#FAFAFA]">Current Admins</h2>

            {loading ? (
              <div className="py-8 flex justify-center">
                <Spinner label="Loading admins" trackClassName="opacity-25 bg-[#FB923C]/30" ringClassName="text-[#FB923C]" labelClassName="text-[#FAFAFA]/70" />
              </div>
            ) : (
              <ul className="space-y-2">
                {/* Show owner explicitly */}
                <li key="owner" className="flex items-center justify-between p-3 border border-[#FB923C]/30 rounded bg-white/5">
                  <div>
                    <div className="font-medium text-[#FAFAFA]">{OWNER_EMAIL}</div>
                    <div className="text-xs text-[#FAFAFA]/50">Owner</div>
                  </div>
                </li>

                {admins.length === 0 && (
                  <li className="py-6 text-center text-[#FAFAFA]/50">No other admins added.</li>
                )}

                {admins.map((admin) => (
                  <li key={admin.id} className="flex items-center justify-between p-3 border border-[#FB923C]/30 rounded bg-white/5">
                    <div>
                      <div className="font-medium text-[#FAFAFA]">{admin.email}</div>
                      <div className="text-xs text-[#FAFAFA]/50">Admin</div>
                    </div>
                    <div>
                      <button
                        onClick={() => handleRemove(admin.id, admin.email)}
                        className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/50 rounded hover:bg-red-600/30"
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
      </div>
    </AuthGuard>
  );
}
