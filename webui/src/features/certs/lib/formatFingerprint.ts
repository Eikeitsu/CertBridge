export function formatFingerprint(raw: string): {
  display: string;
  compact: string;
} {
  const compact = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (!compact) return { display: raw || "", compact: "" };
  const pairs = compact.match(/.{1,2}/g) || [];
  return { display: pairs.join(" "), compact };
}
