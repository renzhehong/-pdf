export interface PDFPosition {
  id: string; // Unique identifier for this position pin
  page: number; // 1-based index
  x: number; // percentage (0-100) relative to page width
  y: number; // percentage (0-100) relative to page height
}

export interface Anchor {
  id: string;
  positions: PDFPosition[];
  bound: boolean;
}
