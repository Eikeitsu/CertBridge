import { useLogPageModel } from "@/features/log/hooks/useLogPageModel";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { Loader } from "@/shared/ui/Loader";
import { Switch } from "@/shared/ui/primitives";

export function DefaultLogPage() {
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
    <div className="pk-def-page">
      <header className="pk-def-pagehead">
        <h1>{v.title}</h1>
        <p>
          {lines ? t("log.linesRecent", { count: lines }) : v.empty}
          {bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""}
        </p>
      </header>

      <div className="pk-def-toolbar">
        <div className="pk-def-seg">
          {levels.map((lv) => (
            <button
              key={lv.id || "all"}
              type="button"
              className={`pk-def-seg__item${levelFilter === lv.id ? " is-on" : ""}`}
              onClick={() => setLevelFilter(lv.id)}
            >
              {lv.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pk-def-group pk-def-log-wrap">
        <div className="pk-def-row">
          <div className="pk-def-row__main">
            <strong>{t("log.wrapTitle")}</strong>
            <span>{t("log.wrapMeta")}</span>
          </div>
          <Switch checked={wrap} onChange={setWrap} />
        </div>
      </div>

      <div className="pk-def-toolbar">
        <button
          type="button"
          className="pk-def-btn is-primary"
          onClick={async () => {
            const action = await dispatch(fetchActivityLog());
            if (fetchActivityLog.fulfilled.match(action)) toast(v.refresh, "ok");
          }}
        >
          {v.refresh}
        </button>
        <button
          type="button"
          className="pk-def-btn is-ghost"
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
      </div>

      {loading || parsing ? (
        <Loader label={t("log.loading")} />
      ) : filtered.length ? (
        <div className={`pk-def-log${wrap ? "" : " is-nowrap"}`}>
          {filtered.map((line, i) => (
            <div key={`${i}-${line.raw}`} className={`pk-def-log__line lv-${line.level}`}>
              [{line.level.toUpperCase()}] {line.body}
            </div>
          ))}
        </div>
      ) : (
        <p className="pk-def-empty">{levelFilter ? t("log.emptyFiltered") : v.empty}</p>
      )}
    </div>
  );
}
