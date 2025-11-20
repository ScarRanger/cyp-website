'use client';

import React, { useState, useCallback, useEffect } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import GooglePhotosConnection from '@/app/components/GooglePhotos/GooglePhotosConnection';
import AlbumBrowser from '@/app/components/GooglePhotos/AlbumBrowser';
import PhotoGrid from '@/app/components/GooglePhotos/PhotoGrid';
import { ImportConfirmationModal, ImportProgressView } from '@/app/components/GooglePhotos/ImportWorkflow';
import ActivityCenter from '@/app/components/GooglePhotos/ActivityCenter';
import type { 
  GooglePhotosUIState, 
  ConnectionState,
  GooglePhotosAlbum,
  GooglePhotosMediaItem,
  ImportJob,
} from '@/app/types/google-photos';

/**
 * GooglePhotosPage Component
 * 
 * Main orchestration component for Google Photos integration.
 * 
 * Responsibilities:
 * - Manage overall UI state and view navigation
 * - Coordinate API calls for connection, albums, photos, and imports
 * - Handle import workflow from selection to completion
 * - Manage activity center for background imports
 * - Persist import jobs across page views
 * - Handle all error states and edge cases
 * 
 * State Management:
 * - Connection state (localStorage persistence recommended)
 * - Current view (albums | photos | import-progress)
 * - Album list with pagination
 * - Photo grid with multi-select
 * - Import jobs (active and completed)
 * - Activity center visibility
 * 
 * API Integration Points (to be implemented):
 * - POST /api/google-photos/connect - Initiate OAuth flow
 * - POST /api/google-photos/disconnect - Revoke access
 * - GET /api/google-photos/albums - Fetch album list (paginated)
 * - GET /api/google-photos/albums/[albumId]/photos - Fetch photos (paginated)
 * - POST /api/google-photos/import - Start import job (server-side)
 * - GET /api/google-photos/import/[jobId] - Poll import status
 * - POST /api/google-photos/import/[jobId]/cancel - Cancel import
 * - POST /api/google-photos/import/[jobId]/retry - Retry failed items
 */
export default function GooglePhotosPage() {
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'not-connected',
  });

  // View state
  const [currentView, setCurrentView] = useState<'albums' | 'photos' | 'import-progress'>('albums');
  
  // Albums state
  const [albums, setAlbums] = useState<GooglePhotosAlbum[]>([]);
  const [albumsPage, setAlbumsPage] = useState(1);
  const [albumsTotalPages, setAlbumsTotalPages] = useState(1);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [albumsError, setAlbumsError] = useState<string | undefined>();

  // Selected album
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | undefined>();
  const [selectedAlbumTitle, setSelectedAlbumTitle] = useState<string | undefined>();

  // Photos state
  const [photos, setPhotos] = useState<GooglePhotosMediaItem[]>([]);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosTotalPages, setPhotosTotalPages] = useState(1);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | undefined>();
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Import workflow state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCategory, setImportCategory] = useState('');
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [activeImportJob, setActiveImportJob] = useState<ImportJob | undefined>();

  // Activity center state
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [activeJobs, setActiveJobs] = useState<ImportJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<ImportJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();

  // Session ID for tracking auth state
  const [sessionId, setSessionId] = useState<string>('');

  // Events for auto-linking
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);

  // Load connection state on mount
  useEffect(() => {
    loadConnectionState();
    loadEvents();
  }, []);

  // Auto-load albums when connection is established
  useEffect(() => {
    if (connectionState.status === 'connected' && sessionId) {
      loadAlbums();
    }
  }, [connectionState.status, sessionId]);

  // Load albums when connected
  useEffect(() => {
    if (connectionState.status === 'connected' && currentView === 'albums') {
      loadAlbums();
    }
  }, [connectionState.status, currentView, albumsPage]);

  // Load photos when album selected
  useEffect(() => {
    if (selectedAlbumId && currentView === 'photos') {
      loadPhotos(selectedAlbumId, photosPage);
    }
  }, [selectedAlbumId, currentView, photosPage]);

  // Poll active import jobs for updates (disabled - imports are now synchronous)
  // useEffect(() => {
  //   if (activeJobs.length === 0) return;
  //   const interval = setInterval(() => {
  //     activeJobs.forEach(job => {
  //       pollImportStatus(job.id);
  //     });
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, [activeJobs]);

  // ===== Utility Functions =====

  const slugify = (v: string) => v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events?limit=1000', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setEvents((data.items || []).map((e: any) => ({ id: e.id, title: e.title })));
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  // ===== Connection Handlers =====

  const loadConnectionState = async () => {
    // Check URL params first (from OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('sessionId');
    const connected = params.get('connected');
    const error = params.get('error');
    
    if (error) {
      setConnectionState({
        status: 'connection-error',
        errorMessage: decodeURIComponent(error),
      });
      return;
    }
    
    if (urlSessionId && connected === 'true') {
      setSessionId(urlSessionId);
      
      // Verify connection status
      try {
        const res = await fetch(`/api/google-photos/status?sessionId=${urlSessionId}`);
        const data = await res.json();
        
        if (data.connected) {
          setConnectionState({
            status: 'connected',
            connectedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Failed to verify connection:', err);
      }
      
      // Clean up URL
      window.history.replaceState({}, '', '/admin/google-photos');
      return;
    }
    
    // Check server-side session (via cookie)
    try {
      const res = await fetch('/api/google-photos/status');
      const data = await res.json();
      
      if (data.connected && data.sessionId) {
        setSessionId(data.sessionId);
        setConnectionState({
          status: 'connected',
          connectedAt: new Date().toISOString(),
        });
      } else {
        setConnectionState({ status: 'not-connected' });
      }
    } catch (err) {
      console.error('Failed to check connection status:', err);
      setConnectionState({ status: 'not-connected' });
    }
  };

  const handleConnect = async () => {
    try {
      setConnectionState({ status: 'not-connected' });
      
      // Request auth URL from backend
      const res = await fetch('/api/google-photos/auth');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate connection');
      }
      
      // Store session ID and redirect to Google OAuth
      setSessionId(data.sessionId);
      localStorage.setItem('google-photos-sessionId', data.sessionId);
      window.location.href = data.authUrl;
    } catch (err: any) {
      setConnectionState({
        status: 'connection-error',
        errorMessage: err.message || 'Failed to connect',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      if (sessionId) {
        await fetch('/api/google-photos/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      }
      
      setConnectionState({ status: 'not-connected' });
      setSessionId('');
      localStorage.removeItem('google-photos-sessionId');
      localStorage.removeItem('google-photos-connected');
      setCurrentView('albums');
      setSelectedAlbumId(undefined);
      setSelectedPhotoIds(new Set());
    } catch (err: any) {
      console.error('Disconnect error:', err);
    }
  };

  const handleReconnect = async () => {
    await handleDisconnect();
    await handleConnect();
  };

  // ===== Album Handlers =====

  const loadAlbums = async () => {
    if (!sessionId) return;
    
    setAlbumsLoading(true);
    setAlbumsError(undefined);
    
    try {
      const res = await fetch(`/api/google-photos/albums?sessionId=${sessionId}&pageSize=50`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load albums');
      }
      
      setAlbums(data.albums);
      setAlbumsTotalPages(data.hasMore ? albumsPage + 1 : albumsPage);
    } catch (err: any) {
      setAlbumsError(err.message || 'Failed to load albums');
      
      // Handle auth errors
      if (err.message?.includes('Authentication expired') || err.message?.includes('Not authenticated')) {
        handleDisconnect();
      }
    } finally {
      setAlbumsLoading(false);
    }
  };

  const handleAlbumClick = (albumId: string, albumTitle: string) => {
    setSelectedAlbumId(albumId);
    setSelectedAlbumTitle(albumTitle);
    setCurrentView('photos');
    setPhotosPage(1);
    setSelectedPhotoIds(new Set());
  };

  const handleRefreshAlbums = async () => {
    await loadAlbums();
  };

  // ===== Photo Handlers =====

  const loadPhotos = async (albumId: string, page: number) => {
    if (!sessionId) return;
    
    setPhotosLoading(true);
    setPhotosError(undefined);
    
    try {
      const res = await fetch(`/api/google-photos/albums/${albumId}/photos?sessionId=${sessionId}&pageSize=100`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load photos');
      }
      
      setPhotos(data.photos);
      setPhotosTotalPages(data.hasMore ? photosPage + 1 : photosPage);
    } catch (err: any) {
      setPhotosError(err.message || 'Failed to load photos');
      
      // Handle auth errors
      if (err.message?.includes('Authentication expired') || err.message?.includes('Not authenticated')) {
        handleDisconnect();
      }
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleTogglePhotoSelect = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSelectAllPhotos = () => {
    setSelectedPhotoIds(new Set(photos.map(p => p.id)));
  };

  const handleDeselectAllPhotos = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleBackToAlbums = () => {
    setCurrentView('albums');
    setSelectedAlbumId(undefined);
    setSelectedAlbumTitle(undefined);
    setSelectedPhotoIds(new Set());
  };

  // ===== Import Handlers =====

  const handleStartImport = () => {
    if (selectedPhotoIds.size === 0) return;
    setShowImportModal(true);
    setImportCategory(selectedAlbumTitle?.toLowerCase().replace(/\s+/g, '-') || '');
  };

  const handleConfirmImport = async () => {
    if (!selectedAlbumId || selectedPhotoIds.size === 0 || !sessionId) return;

    setShowImportModal(false);

    // Create import job
    const jobId = `job-${Date.now()}`;
    const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id));
    
    const newJob: ImportJob = {
      id: jobId,
      albumId: selectedAlbumId,
      albumTitle: selectedAlbumTitle || 'Unknown Album',
      status: 'pending',
      createdAt: new Date().toISOString(),
      totalItems: selectedPhotos.length,
      completedItems: 0,
      failedItems: 0,
      items: selectedPhotos.map(p => ({
        id: p.id,
        filename: p.filename,
        status: 'pending',
        progress: 0,
      })),
      category: importCategory,
      year: importYear,
    };

    setActiveJobs(prev => [...prev, newJob]);
    setActivityExpanded(true);
    
    // Start import on server
    try {
      updateJobStatus(jobId, 'processing');
      
      // Auto-link to event if category matches event title
      const categorySlug = slugify(importCategory);
      const matchedEvent = events.find(ev => slugify(ev.title) === categorySlug);
      const eventId = matchedEvent?.id;
      
      const res = await fetch('/api/google-photos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mediaItemIds: Array.from(selectedPhotoIds),
          category: categorySlug,
          categoryLabel: importCategory,
          year: importYear,
          eventId: eventId, // Auto-linked if event exists
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }
      
      // Update job with results
      setActiveJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: data.failed > 0 ? 'completed' : 'completed',
              completedItems: data.imported,
              failedItems: data.failed,
              completedAt: new Date().toISOString(),
            }
          : job
      ));
      
      // Move to completed after brief delay
      setTimeout(() => {
        setActiveJobs(prev => {
          const job = prev.find(j => j.id === jobId);
          if (job) {
            setCompletedJobs(prevCompleted => [...prevCompleted, job]);
          }
          return prev.filter(j => j.id !== jobId);
        });
      }, 2000);
      
      // Save imported items to gallery metadata
      if (data.items && data.items.length > 0) {
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bulk', items: data.items }),
        });
      }
    } catch (err: any) {
      updateJobStatus(jobId, 'failed', err.message);
    }

    // Clear selection
    setSelectedPhotoIds(new Set());
  };

  const updateJobStatus = (jobId: string, status: ImportJob['status'], errorMessage?: string) => {
    setActiveJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status, errorMessage, startedAt: status === 'processing' ? new Date().toISOString() : job.startedAt }
        : job
    ));
  };

  const pollImportStatus = async (jobId: string) => {
    // Polling removed - import is now synchronous
    // Job status is updated immediately from the import API response
  };

  const handleCancelImport = (jobId: string) => {
    updateJobStatus(jobId, 'cancelled');
    setTimeout(() => {
      setActiveJobs(prev => {
        const job = prev.find(j => j.id === jobId);
        if (job) {
          setCompletedJobs(prevCompleted => [...prevCompleted, job]);
        }
        return prev.filter(j => j.id !== jobId);
      });
    }, 1000);
  };

  const handleRetryImport = async (jobId: string) => {
    const job = completedJobs.find(j => j.id === jobId);
    if (!job || !sessionId) return;
    
    // Re-import failed items
    const failedItemIds = job.items
      .filter(item => item.status === 'failed')
      .map(item => item.id);
    
    if (failedItemIds.length === 0) return;
    
    try {
      // Auto-link to event if category matches event title
      const categorySlug = slugify(job.category || 'general');
      const matchedEvent = events.find(ev => slugify(ev.title) === categorySlug);
      const eventId = matchedEvent?.id;
      
      const res = await fetch('/api/google-photos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mediaItemIds: failedItemIds,
          category: categorySlug,
          categoryLabel: job.category || 'general',
          year: job.year || new Date().getFullYear(),
          eventId: eventId,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.imported > 0) {
        // Save to gallery
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bulk', items: data.items }),
        });
        
        // Update completed job stats
        setCompletedJobs(prev => prev.map(j => 
          j.id === jobId
            ? { ...j, failedItems: Math.max(0, j.failedItems - data.imported) }
            : j
        ));
      }
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  const handleClearCompleted = () => {
    setCompletedJobs([]);
  };

  // ===== Render =====

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Google Photos Import</h1>
            <p className="text-gray-600 mt-2">
              Import photos and videos from your Google Photos albums directly into your gallery.
            </p>
          </div>

          {/* Connection panel */}
          <GooglePhotosConnection
            connectionState={connectionState}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onReconnect={handleReconnect}
          />

          {/* Main content - only show if connected */}
          {connectionState.status === 'connected' && (
            <>
              {/* Album browser view */}
              {currentView === 'albums' && (
                <AlbumBrowser
                  albums={albums}
                  currentPage={albumsPage}
                  totalPages={albumsTotalPages}
                  loading={albumsLoading}
                  error={albumsError}
                  onPageChange={setAlbumsPage}
                  onAlbumClick={handleAlbumClick}
                  onRefresh={handleRefreshAlbums}
                />
              )}

              {/* Photo grid view */}
              {currentView === 'photos' && (
                <>
                  <PhotoGrid
                    items={photos}
                    selectedIds={selectedPhotoIds}
                    currentPage={photosPage}
                    totalPages={photosTotalPages}
                    loading={photosLoading}
                    error={photosError}
                    onPageChange={setPhotosPage}
                    onToggleSelect={handleTogglePhotoSelect}
                    onSelectAll={handleSelectAllPhotos}
                    onDeselectAll={handleDeselectAllPhotos}
                    onBack={handleBackToAlbums}
                  />

                  {/* Import button - floating when photos selected */}
                  {selectedPhotoIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
                      <button
                        onClick={handleStartImport}
                        className="px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all font-medium flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Import {selectedPhotoIds.size} Selected
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Import confirmation modal */}
          <ImportConfirmationModal
            isOpen={showImportModal}
            selectedCount={selectedPhotoIds.size}
            albumTitle={selectedAlbumTitle || ''}
            category={importCategory}
            year={importYear}
            onConfirm={handleConfirmImport}
            onCancel={() => setShowImportModal(false)}
            onCategoryChange={setImportCategory}
            onYearChange={setImportYear}
          />

          {/* Activity center */}
          <ActivityCenter
            state={{
              activeJobs,
              completedJobs,
              isExpanded: activityExpanded,
              selectedJobId,
            }}
            onToggleExpand={() => setActivityExpanded(!activityExpanded)}
            onSelectJob={setSelectedJobId}
            onCancelJob={handleCancelImport}
            onRetryJob={handleRetryImport}
            onClearCompleted={handleClearCompleted}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
