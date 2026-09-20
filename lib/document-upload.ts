import type { PartnerDocumentType } from '@/lib/types';

export const DOCUMENT_TYPES: PartnerDocumentType[] = ['catalog', 'brand-authorization', 'pricing', 'compliance', 'other'];
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const ALLOWED_EXTENSION = /\.(pdf|jpe?g|png|webp|csv|xls|xlsx)$/i;
export const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;

export function validatePartnerFile(file: File) {
  if (!file || file.size <= 0) return 'Choose a document to upload.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'Documents must be 12 MB or smaller.';
  if (!ALLOWED_MIME.has(file.type) || !ALLOWED_EXTENSION.test(file.name)) return 'Use PDF, JPG, PNG, WebP, CSV, XLS, or XLSX files.';
  return '';
}

export function validDocumentType(value: unknown): value is PartnerDocumentType {
  return DOCUMENT_TYPES.includes(String(value) as PartnerDocumentType);
}
