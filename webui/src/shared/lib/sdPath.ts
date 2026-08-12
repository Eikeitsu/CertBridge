const SD_PATH_PATTERN =
  /^\/(?:sdcard\/|storage\/(?:emulated\/|self\/primary\/)|mnt\/media_rw\/)/;

export function isSafeSdPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (!SD_PATH_PATTERN.test(trimmed)) return false;
  if (trimmed.includes("..")) return false;
  if (/['"`\r\n]/.test(trimmed)) return false;
  return true;
}
