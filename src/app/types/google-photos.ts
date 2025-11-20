/**
 * Google Photos Integration Type Definitions
 * Defines all interfaces for the Google Photos feature
 */

// Connection States
export type ConnectionStatus = 'not-connected' | 'connected' | 'connection-error';

export interface ConnectionState {
  status: ConnectionStatus;
  displayName?: string;
  email?: string;
  connectedAt?: string;
  errorMessage?: string;
}

// Album Types
export interface GooglePhotosAlbum {
  id: string;
  title: string;
  coverPhotoUrl?: string;
  mediaItemsCount: number;
  productUrl?: string;
}

export interface AlbumListState {
  albums: GooglePhotosAlbum[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  loading: boolean;
  error?: string;
}

// Media Item Types
export type MediaType = 'image' | 'video';

export interface GooglePhotosMediaItem {
  id: string;
  filename: string;
  mimeType: string;
  mediaType: MediaType;
  thumbnailUrl: string;
  baseUrl: string;
  width: number;
  height: number;
  creationTime: string;
  description?: string;
}

export interface PhotoGridState {
  items: GooglePhotosMediaItem[];
  selectedIds: Set<string>;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  loading: boolean;
  error?: string;
}

// Import Job Types
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ImportItem {
  id: string;
  filename: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  errorMessage?: string;
  galleryItemId?: string; // ID after successful import
}

export interface ImportJob {
  id: string;
  albumId: string;
  albumTitle: string;
  status: ImportStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  items: ImportItem[];
  category: string; // Gallery category to import into
  year: number;
  errorMessage?: string;
}

export interface ActivityCenterState {
  activeJobs: ImportJob[];
  completedJobs: ImportJob[];
  isExpanded: boolean;
  selectedJobId?: string;
}

// UI State Management
export interface GooglePhotosUIState {
  connection: ConnectionState;
  currentView: 'albums' | 'photos' | 'import-progress';
  selectedAlbumId?: string;
  selectedAlbumTitle?: string;
  albumList: AlbumListState;
  photoGrid: PhotoGridState;
  activityCenter: ActivityCenterState;
  showImportModal: boolean;
  importConfig: {
    category: string;
    year: number;
  };
}

// Component Props
export interface GooglePhotosConnectionProps {
  connectionState: ConnectionState;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onReconnect: () => Promise<void>;
}

export interface AlbumBrowserProps {
  albums: GooglePhotosAlbum[];
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error?: string;
  onPageChange: (page: number) => void;
  onAlbumClick: (albumId: string, albumTitle: string) => void;
  onRefresh: () => Promise<void>;
}

export interface PhotoGridProps {
  items: GooglePhotosMediaItem[];
  selectedIds: Set<string>;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error?: string;
  onPageChange: (page: number) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBack: () => void;
}

export interface ImportConfirmationModalProps {
  isOpen: boolean;
  selectedCount: number;
  albumTitle: string;
  category: string;
  year: number;
  onConfirm: () => void;
  onCancel: () => void;
  onCategoryChange: (category: string) => void;
  onYearChange: (year: number) => void;
}

export interface ImportProgressViewProps {
  job: ImportJob;
  onCancel: () => void;
  onClose: () => void;
  onRetryFailed: () => void;
}

export interface ActivityCenterProps {
  state: ActivityCenterState;
  onToggleExpand: () => void;
  onSelectJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onClearCompleted: () => void;
}
