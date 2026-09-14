import { useCallback, useEffect, useState } from "react";
import { Card, Button } from "@/shared/ui/primitives";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { getZnWhitelist, setZnWhitelist } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";

type ZnWhitelistEditorProps = {
  title?: string;
  meta?: string;
  hint?: string;
  saveLabel?: string;
};

export function ZnWhitelistEditor({
  title = "抓包白名单",
  meta = "名单内不过滤 mount/maps",
  hint = "一行一个包名；# 开头为注释。保存后强停相关 App 或重启生效。",
  saveLabel = "保存白名单",
}: ZnWhitelistEditorProps) {
  const { voice } = usePackVoice();
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const { isPending, runExclusive } = useAsyncLock();

  useEffect(() => {
    let cancelled = false;
    void getZnWhitelist()
      .then((body) => {
        if (!cancelled) {
          setText(body);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(() => {
    void runExclusive(async () => {
      const result = await setZnWhitelist(text);
      if (isCliFailure(result)) {
        toast(errorFromResult(result.stdout, result.stderr), "bad");
        return;
      }
      toast(voice.hide.whitelistSaved, "ok");
    });
  }, [runExclusive, text, voice.hide.whitelistSaved]);

  return (
    <Card title={title} meta={meta}>
      <p className="cb-page-sub" style={{ marginBottom: 10 }}>
        {hint}
      </p>
      <textarea
        className="cb-textarea"
        rows={8}
        value={text}
        disabled={!loaded || isPending}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        style={{
          width: "100%",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "0.78rem",
          lineHeight: 1.45,
          padding: 10,
          borderRadius: 8,
          border: "1px solid var(--cb-line)",
          background: "var(--cb-surface-2, var(--cb-bg))",
          color: "var(--cb-ink)",
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
      <div className="cb-btn-row" style={{ marginTop: 12 }}>
        <Button variant="primary" disabled={!loaded || isPending} onClick={handleSave}>
          {saveLabel}
        </Button>
      </div>
    </Card>
  );
}
