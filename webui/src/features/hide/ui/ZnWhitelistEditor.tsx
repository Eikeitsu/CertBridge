import { useCallback, useEffect, useState } from "react";
import { Card, Button } from "@/shared/ui/primitives";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { getZnFilterList, setZnFilterList, type ZnListKind } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";

type ZnWhitelistEditorProps = {
  /** blacklist = 要过滤；whitelist = 豁免不过滤 */
  listKind?: ZnListKind;
  title?: string;
  meta?: string;
  hint?: string;
  saveLabel?: string;
  rows?: number;
};

export function ZnWhitelistEditor({
  listKind = "blacklist",
  title,
  meta,
  hint,
  saveLabel,
  rows = 5,
}: ZnWhitelistEditorProps) {
  const { voice } = usePackVoice();
  const h = voice.hide;
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const { isPending, runExclusive } = useAsyncLock();

  const resolvedTitle =
    title ?? (listKind === "whitelist" ? h.whitelistTitle : h.blacklistTitle);
  const resolvedMeta =
    meta ?? (listKind === "whitelist" ? h.whitelistMeta : h.blacklistMeta);
  const resolvedHint =
    hint ?? (listKind === "whitelist" ? h.whitelistHint : h.blacklistHint);
  const savedToast = listKind === "whitelist" ? h.whitelistSaved : h.blacklistSaved;

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void getZnFilterList(listKind)
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
  }, [listKind]);

  const handleSave = useCallback(() => {
    void runExclusive(async () => {
      const result = await setZnFilterList(listKind, text);
      if (isCliFailure(result)) {
        toast(errorFromResult(result.stdout, result.stderr), "bad");
        return;
      }
      toast(savedToast, "ok");
    });
  }, [runExclusive, text, listKind, savedToast]);

  return (
    <Card title={resolvedTitle} meta={resolvedMeta}>
      {resolvedHint ? (
        <p className="bf-page-sub" style={{ marginBottom: 10 }}>
          {resolvedHint}
        </p>
      ) : null}
      <textarea
        className="bf-textarea"
        rows={rows}
        value={text}
        disabled={!loaded || isPending}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      <div className="bf-btn-row" style={{ marginTop: 12 }}>
        <Button variant="primary" disabled={!loaded || isPending} onClick={handleSave}>
          {saveLabel ?? h.whitelistSave}
        </Button>
      </div>
    </Card>
  );
}
