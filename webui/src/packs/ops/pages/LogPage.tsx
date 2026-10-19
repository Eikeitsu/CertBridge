import { useLogPageModel } from "@/features/log/hooks/useLogPageModel";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { Loader } from "@/shared/ui/Loader";

export function OpsLogPage() {
  const {
    t,
    dispatch,
    loading,
    bytes,
    lines,
    levelFilter,
    setLevelFilter,
    wrap,
    setWrap,
    v,
    filtered,
    parsing,
    levels,
    formatByteSize,
    clearActivityLog,
    fetchActivityLog,
  } = useLogPageModel();

  return (
    <div className="pk-ops-page pk-ops-page--log">
      <header className="pk-ops-pagehead pk-ops-pagehead--meta">
        <p>
          {lines ? t("log.linesCount", { count: lines }) : v.empty}
          {bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""}
        </p>
      </header>

      <div className="pk-ops-toolbar">
        <div className="pk-ops-chips">
          {levels.map((lv) => (
            <button
              key={lv.id || "all"}
              type="button"
              className={`pk-ops-chip${levelFilter === lv.id ? " is-on" : ""}`}
              onClick={() => setLevelFilter(lv.id)}
            >
              {lv.label}
            </button>
          ))}
        </div>
        <div className="pk-ops-actions">
          <button
            type="button"
            className="pk-ops-btn is-primary"
            onClick={async () => {
              const action = await dispatch(fetchActivityLog());
              if (fetchActivityLog.fulfilled.match(action)) toast(v.refresh, "ok");
            }}
          >
            {v.refresh}
          </button>
          <button
            type="button"
            className="pk-ops-btn"
            onClick={() =>
              confirmAction({
                title: t("log.clearConfirmTitle"),
                content: t("log.clearConfirmBody"),
                okText: v.clear,
                danger: true,
                onOk: () => dispatch(clearActivityLog()),
              })
            }
          >
            {v.clear}
          </button>
          <label className={`pk-ops-check${wrap ? " is-on" : ""}`}>
            <input
              type="checkbox"
              checked={wrap}
              onChange={(e) => setWrap(e.target.checked)}
            />
            <span>{t("log.wrap")}</span>
          </label>
        </div>
      </div>

      {loading || parsing ? (
        <Loader label={t("log.loading")} />
      ) : (
        <pre className={`pk-ops-term${wrap ? "" : " is-nowrap"}`}>
          {filtered.length
            ? filtered.map((l) => `[${l.level}] ${l.body}`).join("\n")
            : v.empty}
        </pre>
      )}
    </div>
  );
}
