'use client';

import React from 'react';
import type { AlbumBrowserProps, GooglePhotosAlbum } from '@/app/types/google-photos';

/**
 * AlbumBrowser Component
 * 
 * Responsibilities:
 * - Display albums in a paginated grid layout
 * - Show album cards with cover image, title, and item count
 * - Handle album selection to view photos
 * - Provide pagination controls
 * - Support refresh action
 * - Handle loading and error states
 * 
 * Edge Cases:
 * - Empty album list (no albums found)
 * - Albums without cover photos (show placeholder)
 * - Loading state with skeleton cards
 * - Error state with retry option
 */

function AlbumCard({ album, onClick }: { album: GooglePhotosAlbum; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 text-left"
    >
      <div className="aspect-square relative bg-gray-100">
        {album.coverPhotoUrl ? (
          <img
            src={album.coverPhotoUrl}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600">
          {album.title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {album.mediaItemsCount} {album.mediaItemsCount === 1 ? 'item' : 'items'}
        </p>
      </div>
    </button>
  );
}

function AlbumSkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200"></div>
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

export default function AlbumBrowser({
  albums,
  currentPage,
  totalPages,
  loading,
  error,
  onPageChange,
  onAlbumClick,
  onRefresh,
}: AlbumBrowserProps) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Albums</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-5 py-2.5 rounded-md bg-gray-900 text-white hover:bg-black disabled:opacity-50"
          >
            {refreshing ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!loading && albums.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Albums Found</h3>
          <p className="text-sm text-gray-600 mb-6">
            Your Google Photos account doesn't have any albums yet, or they haven't loaded.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-5 py-2.5 rounded-md bg-gray-900 text-white hover:bg-black disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="border-b border-gray-200 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Albums</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select an album to browse and import photos
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <AlbumSkeletonCard key={i} />)
          ) : (
            albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onClick={() => onAlbumClick(album.id, album.title)}
              />
            ))
          )}
        </div>

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
