'use client';

import React from 'react';
import type { ActivityCenterProps, ImportJob } from '@/app/types/google-photos';

/**
 * ActivityCenter Component
 * 
 * Responsibilities:
 * - Display collapsible panel showing import activity
 * - List active imports with progress
 * - List completed imports with results
 * - Show error logs for failed items
 * - Support job cancellation and retry
 * - Allow clearing completed jobs
 * - Persist across page views (doesn't block navigation)
 * 
 * Features:
 * - Collapsible/expandable panel
 * - Badge showing active job count
 * - Detailed view of selected job
 * - Quick actions for each job
 */

function JobCard({ 
  job, 
  isSelected, 
  onSelect, 
  onCancel, 
  onRetry 
}: { 
  job: ImportJob; 
  isSelected: boolean;
  onSelect: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const isActive = job.status === 'processing' || job.status === 'pending';
  const progressPercent = job.totalItems > 0 
    ? Math.round(((job.completedItems + job.failedItems) / job.totalItems) * 100)
    : 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {job.albumTitle}
          </h4>
          <p className="text-xs text-gray-600 mt-0.5">
            → {job.category} ({job.year})
          </p>
        </div>

        <div className="ml-3">
          {job.status === 'pending' && (
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
              Queued
            </span>
          )}
          {job.status === 'processing' && (
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {progressPercent}%
            </span>
          )}
          {job.status === 'completed' && (
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
              ✓ Done
            </span>
          )}
          {job.status === 'failed' && (
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
              ✗ Failed
            </span>
          )}
          {job.status === 'cancelled' && (
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
              Cancelled
            </span>
          )}
        </div>
      </div>

      {/* Progress bar for active jobs */}
      {isActive && (
        <div className="mb-2">
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span>{job.completedItems}/{job.totalItems} completed</span>
        {job.failedItems > 0 && (
          <span className="text-red-600">{job.failedItems} failed</span>
        )}
      </div>

      {/* Quick actions */}
      {isSelected && (
        <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {isActive && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium"
            >
              Cancel
            </button>
          )}
          {(job.status === 'failed' || job.status === 'completed') && job.failedItems > 0 && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-medium"
            >
              Retry Failed
            </button>
          )}
        </div>
      )}
    </button>
  );
}

export default function ActivityCenter({
  state,
  onToggleExpand,
  onSelectJob,
  onCancelJob,
  onRetryJob,
  onClearCompleted,
}: ActivityCenterProps) {
  const totalActiveJobs = state.activeJobs.length;
  const hasCompletedJobs = state.completedJobs.length > 0;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Collapsed view - floating button */}
      {!state.isExpanded && (
        <button
          onClick={onToggleExpand}
          className="relative bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-shadow p-4"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          
          {totalActiveJobs > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {totalActiveJobs}
            </span>
          )}
        </button>
      )}

      {/* Expanded view - activity panel */}
      {state.isExpanded && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-96 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-semibold text-gray-900">Import Activity</h3>
              {totalActiveJobs > 0 && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {totalActiveJobs} {totalActiveJobs === 1 ? 'job' : 'jobs'} in progress
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {hasCompletedJobs && (
                <button
                  onClick={onClearCompleted}
                  className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                >
                  Clear
                </button>
              )}
              <button
                onClick={onToggleExpand}
                className="p-1 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Active jobs */}
            {totalActiveJobs > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
                  Active ({totalActiveJobs})
                </h4>
                <div className="space-y-2">
                  {state.activeJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isSelected={state.selectedJobId === job.id}
                      onSelect={() => onSelectJob(job.id)}
                      onCancel={() => onCancelJob(job.id)}
                      onRetry={() => onRetryJob(job.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed jobs */}
            {hasCompletedJobs && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
                  Completed ({state.completedJobs.length})
                </h4>
                <div className="space-y-2">
                  {state.completedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isSelected={state.selectedJobId === job.id}
                      onSelect={() => onSelectJob(job.id)}
                      onCancel={() => onCancelJob(job.id)}
                      onRetry={() => onRetryJob(job.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {totalActiveJobs === 0 && !hasCompletedJobs && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No import activity</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
