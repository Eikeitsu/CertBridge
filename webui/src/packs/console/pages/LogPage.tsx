import { useLogPageModel } from "@/features/log/hooks/useLogPageModel";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { Loader } from "@/shared/ui/Loader";

export function ConsoleLogPage() {
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
    <div className="pk-con-page pk-con-page--log">
      <pre className="pk-con-banner">
        {`# ${v.title} lines=${lines || 0} bytes=${bytes || 0}${
          bytes ? ` (${formatByteSize(bytes)})` : ""
        }`}
      </pre>
      <div className="pk-con-actions">
        {levels.map((lv) => (
          <button
            key={lv.id || "all"}
            type="button"
            className={`pk-con-btn${levelFilter === lv.id ? " is-primary" : ""}`}
            onClick={() => setLevelFilter(lv.id)}
          >
            {lv.label}
          </button>
        ))}
        <button
          type="button"
          className="pk-con-btn is-primary"
          onClick={async () => {
            const action = await dispatch(fetchActivityLog());
            if (fetchActivityLog.fulfilled.match(action)) toast(v.refresh, "ok");
          }}
        >
          {v.refresh}
        </button>
        <button
          type="button"
          className="pk-con-btn"
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
      ) : (
        <section className="pk-con-termframe">
          <div className="pk-con-termframe__bar">
            <span>journal · {t("log.linesCount", { count: filtered.length })}</span>
            <button
              type="button"
              className="pk-con-termframe__flag"
              aria-pressed={wrap}
              onClick={() => setWrap(!wrap)}
            >
              {t("log.wrap")}={wrap ? "on" : "off"}
            </button>
          </div>
          <pre className={`pk-con-term${wrap ? "" : " is-nowrap"}`}>
            {filtered.length
              ? filtered.map((l) => `[${l.level}] ${l.body}`).join("\n")
              : v.empty}
          </pre>
        </section>
      )}
    </div>
  );
}
