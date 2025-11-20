'use client';

import React from 'react';
import type { ImportConfirmationModalProps, ImportProgressViewProps, ImportJob } from '@/app/types/google-photos';

/**
 * ImportConfirmationModal Component
 * 
 * Responsibilities:
 * - Show confirmation dialog before starting import
 * - Display selected item count
 * - Allow category and year configuration
 * - Explain that import is secure and server-side
 * - Provide confirm and cancel actions
 */
export function ImportConfirmationModal({
  isOpen,
  selectedCount,
  albumTitle,
  category,
  year,
  onConfirm,
  onCancel,
  onCategoryChange,
  onYearChange,
}: ImportConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Import Photos to Gallery</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Secure Server-Side Import</p>
                <p className="text-blue-800">
                  Your photos will be securely imported through our server. Your Google Photos credentials are never exposed to the browser.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">Album:</span> {albumTitle}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium text-gray-900">Selected:</span> {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Gallery Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-300"
                placeholder="e.g., mission-trip-2025"
              />
              <p className="text-xs text-gray-500 mt-1">
                Choose which gallery category to import these photos into
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => onYearChange(parseInt(e.target.value, 10) || new Date().getFullYear())}
                min="2000"
                max="2100"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!category.trim()}
            className="px-5 py-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Start Import
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ImportProgressView Component
 * 
 * Responsibilities:
 * - Display import progress in real-time
 * - Show total, completed, and failed item counts
 * - Display status messages for each item
 * - Support cancellation of in-progress imports
 * - Allow retry of failed items
 * - Provide close action when complete
 * 
 * States:
 * - Pending: Import queued but not started
 * - Processing: Import in progress
 * - Completed: All items processed successfully
 * - Failed: Import failed completely
 * - Cancelled: User cancelled import
 */
export function ImportProgressView({
  job,
  onCancel,
  onClose,
  onRetryFailed,
}: ImportProgressViewProps) {
  const progressPercent = job.totalItems > 0 
    ? Math.round(((job.completedItems + job.failedItems) / job.totalItems) * 100)
    : 0;

  const isActive = job.status === 'processing' || job.status === 'pending';
  const isComplete = job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
  const hasFailures = job.failedItems > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Progress</h2>
            <p className="text-sm text-gray-600 mt-1">
              {job.albumTitle} → {job.category}
            </p>
          </div>
          
          {isActive && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium"
            >
              Cancel Import
            </button>
          )}

          {isComplete && (
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          {job.status === 'pending' && (
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
              Queued
            </span>
          )}
          {job.status === 'processing' && (
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing
            </span>
          )}
          {job.status === 'completed' && (
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
              ✓ Completed
            </span>
          )}
          {job.status === 'failed' && (
            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
              ✗ Failed
            </span>
          )}
          {job.status === 'cancelled' && (
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
              Cancelled
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              {job.completedItems + job.failedItems} of {job.totalItems} items processed
            </span>
            <span className="text-sm font-medium text-gray-900">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                job.status === 'completed' ? 'bg-green-600' : 
                job.status === 'failed' ? 'bg-red-600' : 
                'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{job.totalItems}</div>
            <div className="text-xs text-gray-600 mt-1">Total</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{job.completedItems}</div>
            <div className="text-xs text-gray-600 mt-1">Completed</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{job.failedItems}</div>
            <div className="text-xs text-gray-600 mt-1">Failed</div>
          </div>
        </div>

        {/* Error message */}
        {job.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{job.errorMessage}</p>
          </div>
        )}

        {/* Failed items list */}
        {hasFailures && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Failed Items</h3>
              {isComplete && (
                <button
                  onClick={onRetryFailed}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Retry Failed
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
              {job.items.filter(item => item.status === 'failed').map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate">{item.filename}</p>
                    {item.errorMessage && (
                      <p className="text-red-600 text-xs mt-0.5">{item.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success message */}
        {job.status === 'completed' && job.failedItems === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-800 font-medium">
              All {job.totalItems} items imported successfully!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
