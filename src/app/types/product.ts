export type ProductVariant = {
  id: string;
  name: string;
  images: string[];
};

export type Product = {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  inStock: boolean;
  active?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
};
