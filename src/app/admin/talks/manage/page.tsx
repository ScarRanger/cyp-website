'use client';

import React, { useEffect, useState } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, X, Save, Loader2 } from 'lucide-react';
import type { TalkItem } from '@/app/types/talks';

export default function ManageTalksPage() {
  const [talks, setTalks] = useState<TalkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [editingTalk, setEditingTalk] = useState<TalkItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    speaker: '',
    date: '',
    summary: '',
  });
  const [seriesMode, setSeriesMode] = useState<'none' | 'new' | 'existing'>('none');
  const [seriesNew, setSeriesNew] = useState('');
  const [seriesExisting, setSeriesExisting] = useState('');
  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  useEffect(() => {
    loadTalks();
    loadSeriesList();
  }, []);

  async function loadTalks() {
    try {
      setLoading(true);
      setError(undefined);
      const res = await fetch('/api/talks?limit=1000', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load talks');
      const data = await res.json();
      setTalks(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load talks');
    } finally {
      setLoading(false);
    }
  }

  async function loadSeriesList() {
    try {
      const res = await fetch('/api/talks/series', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setSeriesList(Array.isArray(data.series) ? data.series : []);
    } catch {
      // Ignore errors
    }
  }

  async function loadSummary(talkId: string) {
    const talk = talks.find((t) => t.id === talkId || t.key === talkId);
    if (!talk) return '';
    
    try {
      const key = talk.key || talk.id;
      const dir = key.split('/').slice(0, -1).join('/');
      const res = await fetch(`/api/talks/summary?dir=${encodeURIComponent(dir)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return data?.summary || '';
      }
    } catch {
      // Ignore errors
    }
    return '';
  }

  async function handleEdit(talk: TalkItem) {
    setEditingTalk(talk);
    const summary = await loadSummary(talk.id);
    setEditForm({
      title: talk.title,
      speaker: talk.speaker || '',
      date: talk.date || '',
      summary,
    });

    // Set series mode
    if (!talk.series) {
      setSeriesMode('none');
      setSeriesNew('');
      setSeriesExisting('');
    } else if (seriesList.includes(talk.series)) {
      setSeriesMode('existing');
      setSeriesExisting(talk.series);
      setSeriesNew('');
    } else {
      setSeriesMode('new');
      setSeriesNew(talk.series);
      setSeriesExisting('');
    }
  }

  async function handleSaveEdit() {
    if (!editingTalk) return;

    try {
      setEditLoading(true);
      setError(undefined);
      setSuccessMessage(undefined);

      // Determine series value based on mode
      let seriesValue: string | undefined;
      if (seriesMode === 'new') {
        seriesValue = seriesNew.trim() || undefined;
      } else if (seriesMode === 'existing') {
        seriesValue = seriesExisting.trim() || undefined;
      } else {
        seriesValue = undefined;
      }

      const res = await fetch('/api/talks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTalk.id,
          title: editForm.title.trim(),
          speaker: editForm.speaker.trim() || undefined,
          date: editForm.date || undefined,
          series: seriesValue,
          summary: editForm.summary.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update talk');
      }

      const data = await res.json();

      await loadTalks();
      await loadSeriesList(); // Refresh series list in case a new one was added
      setEditingTalk(null);

      // Show success message with file move count if applicable
      if (data.moved && data.moved > 0) {
        setSuccessMessage(`Talk updated successfully! Moved ${data.moved} file(s) to new location.`);
        setTimeout(() => setSuccessMessage(undefined), 5000);
      } else {
        setSuccessMessage('Talk updated successfully!');
        setTimeout(() => setSuccessMessage(undefined), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update talk');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(talkId: string) {
    try {
      setDeleteLoading(true);
      setError(undefined);

      const res = await fetch('/api/talks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: talkId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete talk');
      }

      await loadTalks();
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete talk');
    } finally {
      setDeleteLoading(false);
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Manage Talks</h1>
            <p className="text-gray-600 mt-1">Edit or delete existing talks</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              {successMessage}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : talks.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-600">No talks found</p>
              <Link
                href="/admin/talks"
                className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
              >
                Upload your first talk
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Speaker
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Series
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {talks.map((talk) => (
                      <tr key={talk.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{talk.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{talk.speaker || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{formatDate(talk.date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{talk.series || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              talk.type === 'video'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {talk.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(talk)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(talk.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingTalk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Talk</h2>
              <button
                onClick={() => setEditingTalk(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Speaker</label>
                <input
                  type="text"
                  value={editForm.speaker}
                  onChange={(e) => setEditForm({ ...editForm, speaker: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Series</label>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-900">
                      <input
                        type="radio"
                        name="series"
                        checked={seriesMode === 'none'}
                        onChange={() => setSeriesMode('none')}
                      />
                      None
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-900">
                      <input
                        type="radio"
                        name="series"
                        checked={seriesMode === 'new'}
                        onChange={() => setSeriesMode('new')}
                      />
                      New
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-900">
                      <input
                        type="radio"
                        name="series"
                        checked={seriesMode === 'existing'}
                        onChange={() => setSeriesMode('existing')}
                      />
                      Existing
                    </label>
                  </div>
                  {seriesMode === 'new' && (
                    <input
                      type="text"
                      value={seriesNew}
                      onChange={(e) => setSeriesNew(e.target.value)}
                      placeholder="e.g. Romans"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                    />
                  )}
                  {seriesMode === 'existing' && (
                    <select
                      value={seriesExisting}
                      onChange={(e) => setSeriesExisting(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                    >
                      <option value="">Select series…</option>
                      {seriesList.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                <textarea
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  rows={8}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 whitespace-pre-wrap"
                  placeholder="Add points with - bullets and line breaks"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setEditingTalk(null)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading || !editForm.title.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this talk? This will permanently delete the media
                files, thumbnail, and all associated data. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
