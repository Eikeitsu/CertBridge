import { useEffect, useState, useSyncExternalStore } from "react";
import { dismissSnack, getSnack, subscribeSnack } from "@/shared/lib/snack";

const HOLD_MS = 2400;
const EXIT_MS = 320;

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

  return (
    <button
      type="button"
      className={`cb-snack tone-${snack.tone}${visible ? " is-on" : ""}`}
      onClick={() => {
        setVisible(false);
        window.setTimeout(() => dismissSnack(), EXIT_MS);
      }}
    >
      {snack.text}
    </button>
  );
}
