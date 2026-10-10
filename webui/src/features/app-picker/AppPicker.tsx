import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Button } from "@/shared/ui/primitives";
import { listInstalledApps, type AppEntry } from "@/shared/api/apps";
import { toast } from "@/shared/api/ksu";
import { hueFromPackage, initialFromName, sortAppsSelectedFirst } from "./helpers";

export type AppPickerProps = {
  open: boolean;
  onClose: () => void;
  /** 当前已选包名 */
  value: string[];
  onConfirm: (packages: string[]) => void;
  title?: string;
};

const LIST_CAP = 400;

export function AppPicker({ open, onClose, value, onConfirm, title }: AppPickerProps) {
  const { t } = useTranslation("webui");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AppEntry[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(value));
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const [failedIcons, setFailedIcons] = useState<Set<string>>(() => new Set());
  const listEl = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadSeq = useRef(0);

  const teardownObserver = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  const setupObserver = useCallback(() => {
    teardownObserver();
    const root = listEl.current;
    if (!root) return;
    observerRef.current = new IntersectionObserver(
      (obsEntries) => {
        for (const entry of obsEntries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const img = el.querySelector<HTMLImageElement>(
            "img.bf-app-picker__icon[data-src]",
          );
          if (img?.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
          }
          observerRef.current?.unobserve(el);
        }
      },
      { root, rootMargin: "160px", threshold: 0.01 },
    );
    root
      .querySelectorAll<HTMLElement>(".bf-app-picker__row")
      .forEach((row) => observerRef.current?.observe(row));
  }, [teardownObserver]);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const seq = ++loadSeq.current;
      setLoading(true);
      try {
        const list = await listInstalledApps();
        if (seq !== loadSeq.current) return;
        setEntries(list);
        setLoadedOnce(true);
        if (!opts.silent) {
          toast(
            list.length
              ? t("hide.appPicker.loaded", { count: list.length })
              : t("hide.appPicker.empty"),
            list.length ? "ok" : "info",
          );
        }
        requestAnimationFrame(() => setupObserver());
      } catch {
        if (seq !== loadSeq.current) return;
        setEntries((prev) => (prev.length ? prev : []));
        toast(t("hide.appPicker.loadFail"), "bad");
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    },
    [setupObserver, t],
  );

  useEffect(() => {
    if (!open) {
      teardownObserver();
      setSearch("");
      setManualOpen(false);
      return;
    }
    const next = new Set(value);
    setSelected(next);
    setManualText([...next].join("\n"));
    setFailedIcons(new Set());
    void load({ silent: loadedOnce && entries.length > 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随 open 打开时同步
  }, [open]);

  useEffect(() => {
    if (!manualOpen) setManualText([...selected].join("\n"));
  }, [selected, manualOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entries;
    if (q) {
      list = list.filter(
        (e) =>
          e.package.toLowerCase().includes(q) || (e.name || "").toLowerCase().includes(q),
      );
    }
    return sortAppsSelectedFirst(list, selected).slice(0, LIST_CAP);
  }, [entries, search, selected]);

  const orphanSelected = useMemo(() => {
    const known = new Set(entries.map((e) => e.package));
    return [...selected].filter((pkg) => !known.has(pkg));
  }, [entries, selected]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setupObserver());
    return () => cancelAnimationFrame(id);
  }, [filtered, open, setupObserver]);

  const toggle = (pkg: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(pkg);
      else next.delete(pkg);
      return next;
    });
  };

  const onManualInput = (text: string) => {
    setManualText(text);
    const pkgs = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setSelected(new Set(pkgs));
  };

  const confirm = () => {
    if (manualOpen) {
      const pkgs = manualText
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      onConfirm(pkgs);
    } else {
      onConfirm([...selected]);
    }
    onClose();
  };

  const displayName = (pkg: string, name?: string) => {
    const n = name || entries.find((e) => e.package === pkg)?.name;
    return n && n !== pkg ? n : pkg;
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title ?? t("hide.appPicker.title")}
      height="min(88dvh, 720px)"
      footer={
        <div className="bf-app-picker__footer">
          <Button type="button" onClick={onClose}>
            {t("hide.appPicker.cancel")}
          </Button>
          <Button type="button" variant="primary" onClick={confirm}>
            {t("hide.appPicker.done")}
          </Button>
        </div>
      }
    >
      <div className="bf-app-picker">
        <p className="bf-app-picker__sub">
          {t("hide.appPicker.sub", { count: selected.size })}
        </p>
        <input
          className="bf-app-picker__search"
          type="search"
          value={search}
          placeholder={t("hide.appPicker.search")}
          onChange={(e) => setSearch(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <div ref={listEl} className="bf-app-picker__list">
          {loading && !entries.length ? (
            <div className="bf-app-picker__state">{t("hide.appPicker.loading")}</div>
          ) : (
            <>
              {filtered.map((e) => {
                const on = selected.has(e.package);
                const style = {
                  ["--bf-app-hue" as string]: String(hueFromPackage(e.package)),
                } as CSSProperties;
                return (
                  <button
                    key={e.package}
                    type="button"
                    className={`bf-app-picker__row${on ? " is-on" : ""}`}
                    onClick={() => toggle(e.package, !on)}
                  >
                    <div className="bf-app-picker__icon-wrap" style={style}>
                      {failedIcons.has(e.package) ? (
                        <span className="bf-app-picker__fallback">
                          {initialFromName(e.name)}
                        </span>
                      ) : (
                        <img
                          className="bf-app-picker__icon"
                          alt=""
                          data-src={e.iconUrl}
                          onError={() =>
                            setFailedIcons((prev) => new Set(prev).add(e.package))
                          }
                        />
                      )}
                    </div>
                    <div className="bf-app-picker__meta">
                      <div className="bf-app-picker__name">
                        {displayName(e.package, e.name)}
                      </div>
                      <div className="bf-app-picker__pkg">{e.package}</div>
                    </div>
                    <span
                      className={`bf-app-picker__check${on ? " is-on" : ""}`}
                      aria-hidden
                    />
                  </button>
                );
              })}

              {orphanSelected.length ? (
                <div className="bf-app-picker__orphan">
                  <div className="bf-app-picker__orphan-title">
                    {t("hide.appPicker.orphan")}
                  </div>
                  {orphanSelected.map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      className="bf-app-picker__row is-on"
                      onClick={() => toggle(pkg, false)}
                    >
                      <div
                        className="bf-app-picker__icon-wrap"
                        style={
                          {
                            ["--bf-app-hue" as string]: String(hueFromPackage(pkg)),
                          } as CSSProperties
                        }
                      >
                        <span className="bf-app-picker__fallback">
                          {initialFromName(pkg)}
                        </span>
                      </div>
                      <div className="bf-app-picker__meta">
                        <div className="bf-app-picker__name">{pkg}</div>
                        <div className="bf-app-picker__pkg">
                          {t("hide.appPicker.orphanHint")}
                        </div>
                      </div>
                      <span className="bf-app-picker__check is-on" aria-hidden />
                    </button>
                  ))}
                </div>
              ) : null}

              {!loading && !filtered.length && !orphanSelected.length ? (
                <div className="bf-app-picker__state">
                  <p>
                    {entries.length
                      ? t("hide.appPicker.noMatch")
                      : t("hide.appPicker.empty")}
                  </p>
                  {!entries.length ? (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={loading}
                      onClick={() => void load()}
                    >
                      {t("hide.appPicker.retry")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="bf-app-picker__manual">
          <button
            type="button"
            className="bf-app-picker__manual-toggle"
            onClick={() => setManualOpen((v) => !v)}
          >
            {manualOpen ? t("hide.appPicker.manualHide") : t("hide.appPicker.manualShow")}
          </button>
          {manualOpen ? (
            <textarea
              className="bf-textarea"
              rows={3}
              value={manualText}
              placeholder={t("hide.appPicker.manualPlaceholder")}
              onChange={(e) => onManualInput(e.target.value)}
              spellCheck={false}
            />
          ) : null}
        </div>
      </div>
    </BottomSheet>
  );
}
