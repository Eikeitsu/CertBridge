import { DN_KEY_MAP } from "@/shared/config/certs";
import type { CertDn } from "./types";

function splitDnParts(raw: string): string[] {
  const parts: string[] = [];
  let current = "";
  let escaped = false;
  for (const char of raw) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}

export function parseRfc2253(raw: string): CertDn {
  const dn: CertDn = { raw: raw.trim(), extras: [] };
  if (!dn.raw) return dn;
  for (const part of splitDnParts(dn.raw)) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "");
    const value = part.slice(idx + 1).trim();
    if (!value) continue;
    const mapped = DN_KEY_MAP[key];
    if (mapped && !dn[mapped]) dn[mapped] = value;
    else dn.extras.push({ label: part.slice(0, idx).trim(), value });
  }
  return dn;
}
