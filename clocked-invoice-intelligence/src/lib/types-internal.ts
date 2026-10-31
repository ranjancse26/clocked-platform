export interface ParsedDocument {
  markdown: string;
  pageCount: number | null;
  warnings: string[];
  raw?: unknown;
}
