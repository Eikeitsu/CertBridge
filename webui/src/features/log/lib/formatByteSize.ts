const KILOBYTE = 1024;

export function formatByteSize(byteCount: number): string {
  if (byteCount < KILOBYTE) return `${byteCount} B`;
  if (byteCount < KILOBYTE * KILOBYTE) {
    return `${(byteCount / KILOBYTE).toFixed(1)} KB`;
  }
  return `${(byteCount / KILOBYTE / KILOBYTE).toFixed(1)} MB`;
}
