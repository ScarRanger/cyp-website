'use client';

import React from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import Link from 'next/link';
import { Plus, List, Settings, Image as ImageIcon, Mic as MicIcon, CalendarDays as CalendarIcon, Ticket } from 'lucide-react';

// Warm Espresso Theme Colors
const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

export default function AdminPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ color: theme.text }}>Admin Dashboard</h1>
            <p className="opacity-70" style={{ color: theme.text }}>Quick actions to manage and create forms</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Forms */}
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center mb-4">
                <ImageIcon className="h-5 w-5 mr-2" style={{ color: theme.primary }} />
                <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Forms</h2>
              </div>
              <p className="opacity-70 mb-4" style={{ color: theme.text }}>Build new forms or manage existing ones.</p>
              <div className="flex gap-2">
                <Link href="/admin/create" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:opacity-90" style={{ backgroundColor: theme.primary, color: '#1C1917' }}>
                  <Plus className="h-4 w-4" /> Create
                </Link>
                <Link href="/admin/forms" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:bg-white/10 border" style={{ borderColor: theme.primary, color: theme.primary }}>
                  <List className="h-4 w-4" /> Manage
                </Link>
              </div>
            </div>

            {/* Gallery */}
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center mb-4">
                <ImageIcon className="h-5 w-5 mr-2" style={{ color: theme.primary }} />
                <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Gallery</h2>
              </div>
              <p className="opacity-70 mb-4" style={{ color: theme.text }}>Upload media and manage the gallery.</p>
              <div className="flex gap-2">
                <Link href="/admin/gallery" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:opacity-90" style={{ backgroundColor: theme.primary, color: '#1C1917' }}>
                  <Plus className="h-4 w-4" /> Upload
                </Link>
                <Link href="/admin/gallery/manage" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:bg-white/10 border" style={{ borderColor: theme.primary, color: theme.primary }}>
                  <List className="h-4 w-4" /> Manage
                </Link>
              </div>
            </div>

            {/* Talks */}
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center mb-4">
                <MicIcon className="h-5 w-5 mr-2" style={{ color: theme.primary }} />
                <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Talks</h2>
              </div>
              <p className="opacity-70 mb-4" style={{ color: theme.text }}>Upload sermons/talks and manage metadata.</p>
              <div className="flex gap-2">
                <Link href="/admin/talks" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:opacity-90" style={{ backgroundColor: theme.primary, color: '#1C1917' }}>
                  <Plus className="h-4 w-4" /> Upload
                </Link>
                <Link href="/admin/talks/manage" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:bg-white/10 border" style={{ borderColor: theme.primary, color: theme.primary }}>
                  <List className="h-4 w-4" /> Manage
                </Link>
              </div>
            </div>

            {/* Fundraiser */}
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center mb-4">
                <List className="h-5 w-5 mr-2" style={{ color: theme.primary }} />
                <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Fundraiser</h2>
              </div>
              <p className="opacity-70 mb-4" style={{ color: theme.text }}>Create or manage fundraiser items.</p>
              <div className="flex gap-2">
                <Link href="/admin/fundraiser" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:opacity-90" style={{ backgroundColor: theme.primary, color: '#1C1917' }}>
                  <Plus className="h-4 w-4" /> Add Item
                </Link>
                <Link href="/admin/fundraiser/manage" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:bg-white/10 border" style={{ borderColor: theme.primary, color: theme.primary }}>
                  <List className="h-4 w-4" /> Manage
                </Link>
              </div>
            </div>

            {/* Events */}
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center mb-4">
                <CalendarIcon className="h-5 w-5 mr-2" style={{ color: theme.primary }} />
                <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Events</h2>
              </div>
              <p className="opacity-70 mb-4" style={{ color: theme.text }}>Create and manage events, and link them to gallery photos.</p>
              <div className="flex gap-2">
                <Link href="/admin/events/create" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:opacity-90" style={{ backgroundColor: theme.primary, color: '#1C1917' }}>
                  <Plus className="h-4 w-4" /> New
                </Link>
                <Link href="/admin/events" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:bg-white/10 border" style={{ borderColor: theme.primary, color: theme.primary }}>
                  <List className="h-4 w-4" /> Manage
                </Link>
              </div>
            </div>

            {/* Lottery */}
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center mb-4">
                <Ticket className="h-5 w-5 mr-2" style={{ color: theme.primary }} />
                <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Lottery</h2>
              </div>
              <p className="opacity-70 mb-4" style={{ color: theme.text }}>Manage lottery ticket orders and confirmations.</p>
              <div className="flex gap-2">
                <Link href="/admin/lottery" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md font-medium transition-colors hover:opacity-90" style={{ backgroundColor: theme.primary, color: '#1C1917' }}>
                  <List className="h-4 w-4" /> Manage Orders
                </Link>
              </div>
            </div>

            <Link href="/admin/admins" className="block">
              <div className="border rounded-lg p-6 shadow-sm h-full hover:bg-white/5 transition-colors" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <div className="flex items-center mb-4">
                  <Settings className="h-5 w-5 mr-2" style={{ color: theme.primary }} />
                  <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Manage Admins</h2>
                </div>
                <p className="opacity-70" style={{ color: theme.text }}>Add or remove administrator accounts.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
