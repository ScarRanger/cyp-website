export interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'url' | 'password' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'time' | 'datetime-local' | 'file' | 'image' | 'admin-image';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  imageUrl?: string; // For admin-image type
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface FormLayout {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  spreadsheetId?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: Date;
}