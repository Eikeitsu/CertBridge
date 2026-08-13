export function parseOpenSslDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+(\d{4})\s+GMT$/,
  );
  const date = match
    ? new Date(`${match[1]} ${match[2]} ${match[4]} ${match[3]} GMT`)
    : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateLabel(raw: string): string {
  const date = parseOpenSslDate(raw);
  if (!date) return raw || "—";
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}
