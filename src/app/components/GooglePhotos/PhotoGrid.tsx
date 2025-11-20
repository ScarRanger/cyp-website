'use client';

import React from 'react';
import type { PhotoGridProps, GooglePhotosMediaItem } from '@/app/types/google-photos';

/**
 * PhotoGrid Component
 * 
 * Responsibilities:
 * - Display media items (photos/videos) in a responsive grid
 * - Support multi-select with checkboxes
 * - Provide "Select All" and "Deselect All" actions
 * - Show count of selected items
 * - Handle pagination
 * - Support back navigation to album list
 * - Handle loading and error states
 * - Display both images and videos
 * 
 * Edge Cases:
 * - Empty album (no media items)
 * - Mixed media types (images and videos)
 * - Failed thumbnail loads (show placeholder)
 * - Network issues (retry capability)
 */

function MediaThumbnail({ item, isSelected, onToggle }: { 
  item: GooglePhotosMediaItem; 
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
      {!imageError ? (
        <img
          src={item.thumbnailUrl}
          alt={item.filename}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Video indicator */}
      {item.mediaType === 'video' && (
        <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}

      {/* Selection overlay */}
      <div 
        className={`absolute inset-0 transition-opacity ${
          isSelected ? 'bg-blue-600/30' : 'bg-black/0 group-hover:bg-black/10'
        }`}
      />

      {/* Checkbox */}
      <div className="absolute top-2 left-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-5 h-5 rounded border-2 border-white shadow-lg cursor-pointer accent-blue-600"
        />
      </div>

      {/* Filename tooltip on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{item.filename}</p>
      </div>
    </div>
  );
}

function MediaSkeletonCard() {
  return (
    <div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
  );
}

export default function PhotoGrid({
  items,
  selectedIds,
  currentPage,
  totalPages,
  loading,
  error,
  onPageChange,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onBack,
}: PhotoGridProps) {
  const selectedCount = selectedIds.size;
  const allOnPageSelected = items.length > 0 && items.every(item => selectedIds.has(item.id));

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Photos</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-md bg-gray-900 text-white hover:bg-black"
          >
            Back to Albums
          </button>
        </div>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Photos in This Album</h3>
          <p className="text-sm text-gray-600 mb-6">
            This album doesn't contain any photos or videos.
          </p>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-md bg-gray-900 text-white hover:bg-black"
          >
            Back to Albums
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header with controls */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Albums
          </button>

          {selectedCount > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
              </span>
            </div>
          )}
        </div>

        {/* Selection controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={allOnPageSelected ? onDeselectAll : onSelectAll}
            disabled={loading || items.length === 0}
            className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {allOnPageSelected ? 'Deselect All' : 'Select All on Page'}
          </button>

          {selectedCount > 0 && (
            <button
              onClick={onDeselectAll}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {loading ? (
            Array.from({ length: 24 }).map((_, i) => <MediaSkeletonCard key={i} />)
          ) : (
            items.map((item) => (
              <MediaThumbnail
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onToggle={() => onToggleSelect(item.id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 px-4">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
