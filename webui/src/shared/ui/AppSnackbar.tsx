import { useEffect, useState, useSyncExternalStore } from "react";
import { dismissSnack, getSnack, subscribeSnack } from "@/shared/lib/snack";

const HOLD_MS = 2600;
const EXIT_MS = 280;

const TONE_MARK: Record<string, string> = {
  ok: "✓",
  warn: "!",
  bad: "×",
  info: "i",
};

export function AppSnackbar() {
  const snack = useSyncExternalStore(subscribeSnack, getSnack, () => null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const current = getSnack();
    if (!current) {
      setVisible(false);
      return undefined;
    }
    const show = window.requestAnimationFrame(() => setVisible(true));
    const hide = window.setTimeout(() => setVisible(false), HOLD_MS);
    const clear = window.setTimeout(() => dismissSnack(), HOLD_MS + EXIT_MS);
    return () => {
      window.cancelAnimationFrame(show);
      window.clearTimeout(hide);
      window.clearTimeout(clear);
    };
  }, [snack?.id]);

  if (!snack) return null;

  const mark = TONE_MARK[snack.tone] || TONE_MARK.info;

  return (
    <button
      type="button"
      className={`bf-snackbar tone-${snack.tone}${visible ? " is-on" : ""}`}
      onClick={() => {
        setVisible(false);
        window.setTimeout(() => dismissSnack(), EXIT_MS);
      }}
    >
      <span className="bf-snackbar__mark" aria-hidden>
        {mark}
      </span>
      <span className="bf-snackbar__text">{snack.text}</span>
    </button>
  );
}
