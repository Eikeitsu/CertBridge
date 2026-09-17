export type SnackTone = "info" | "ok" | "warn" | "bad";

export type SnackState = {
  id: number;
  text: string;
  tone: SnackTone;
};

let current: SnackState | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function showSnack(text: string, tone: SnackTone = "info") {
  const message = String(text || "").trim();
  if (!message) return;
  nextId += 1;
  current = { id: nextId, text: message, tone };
  emit();
}

export function dismissSnack() {
  if (!current) return;
  current = null;
  emit();
}

export function subscribeSnack(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnack() {
  return current;
}
