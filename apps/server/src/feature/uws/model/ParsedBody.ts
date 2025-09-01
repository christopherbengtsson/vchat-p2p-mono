export interface ParsedBody<T> {
  data: T | null;
  error?: string;
}
