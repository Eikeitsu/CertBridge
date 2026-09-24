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
  rows?: number;
};

export function ZnWhitelistEditor({
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
    <Card title={title ?? h.whitelistTitle} meta={meta ?? h.whitelistMeta}>
      {(hint ?? h.whitelistHint) ? (
        <p className="bf-page-sub" style={{ marginBottom: 10 }}>
          {hint ?? h.whitelistHint}
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
