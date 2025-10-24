export type GalleryItemType = "image" | "video";

export interface GalleryItem {
  id: string;
  type: GalleryItemType;
  title?: string;
  caption?: string;
  url: string;
  thumbnailUrl?: string;
  category?: string;
  categoryLabel?: string;
  // Optional S3 object key when the asset is stored in our bucket
  key?: string;
  createdAt: string;
}

export interface GalleryListResponse {
  items: GalleryItem[];
  nextCursor?: string;
}
