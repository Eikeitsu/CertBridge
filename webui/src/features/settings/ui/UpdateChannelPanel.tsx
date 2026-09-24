import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Row, Segment, Switch } from "@/shared/ui/primitives";
import { toast } from "@/shared/api/ksu";
import {
  downloadAndInstallModule,
  type ModuleUpdatePhase,
} from "@/shared/api/moduleUpdate";
import {
  UPDATE_CHANNELS,
  checkUpdateChannel,
  isPreferCdn,
  loadPersistedChannel,
  persistChannel,
  setPreferCdn,
  versionLine,
  type ChannelCheckResult,
  type UpdateChannel,
} from "@/shared/lib/updateChannel";
import { UpdateInstallProgress } from "./UpdateInstallProgress";

type UpdateChannelPanelProps = {
  dense?: boolean;
  surface?: "card" | "plain";
};

export function UpdateChannelPanel({ dense, surface = "card" }: UpdateChannelPanelProps) {
  const { t } = useTranslation("webui");
  const [channel, setChannel] = useState<UpdateChannel>("stable");
  const [preferCdn, setPreferCdnState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [phase, setPhase] = useState<ModuleUpdatePhase | null>(null);
  const [percent, setPercent] = useState(0);
  const [result, setResult] = useState<ChannelCheckResult | null>(null);

  useEffect(() => {
    void loadPersistedChannel().then(setChannel);
    setPreferCdnState(isPreferCdn());
  }, []);

  const runCheck = useCallback(
    async (silent = false) => {
      setBusy(true);
      try {
        const r = await checkUpdateChannel(channel, preferCdn);
        setResult(r);
        if (r.error) toast(r.error, "bad");
        else if (!silent) toast(t("more.update.checked"), "ok");
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), "bad");
      } finally {
        setBusy(false);
      }
    },
    [channel, preferCdn, t],
  );

  useEffect(() => {
    void runCheck(true);
  }, [runCheck]);

  const onSelectChannel = async (next: string) => {
    const ch = next === "ci" ? "ci" : "stable";
    if (ch === channel) return;
    if (ch === "ci") {
      const ok = window.confirm(t("more.update.ciConfirm"));
      if (!ok) return;
    }
    setChannel(ch);
    await persistChannel(ch);
  };

  const onPreferCdn = (on: boolean) => {
    setPreferCdnState(on);
    setPreferCdn(on);
  };

  const onInstall = async () => {
    const zip = result?.remote?.zipUrl;
    if (!zip) {
      toast(t("more.update.noPackage"), "bad");
      return;
    }
    setInstalling(true);
    setPhase("download");
    setPercent(0);
    try {
      const r = await downloadAndInstallModule(zip, (p) => {
        setPhase(p.phase);
        setPercent(p.percent);
      });
      if (!r.ok) {
        toast(r.error || t("more.update.installFailed"), "bad");
        return;
      }
      setPercent(100);
      toast(
        t(r.mode === "cli" ? "more.update.flashed" : "more.update.managerOpened"),
        "ok",
      );
      void runCheck(true);
    } finally {
      setInstalling(false);
      setPhase(null);
      setPercent(0);
    }
  };

  const remote = result?.remote;
  const canInstall = !!(result && remote && (result.hasUpdate || result.canSwitch));
  const installLabel =
    installing && phase
      ? t(`more.update.${phase}Busy`)
      : result?.hasUpdate
        ? t("more.update.downloadInstall")
        : t("more.update.switchInstall");

  return (
    <Card
      title={t("more.update.title")}
      meta={t("more.update.meta")}
      surface={surface}
      className={dense ? "bf-card--dense" : undefined}
    >
      <Segment
        options={UPDATE_CHANNELS.map((c) => ({
          value: c,
          label: t(`more.update.channels.${c}.label`),
          hint: t(`more.update.channels.${c}.hint`),
        }))}
        value={channel}
        disabled={busy || installing}
        onChange={(v) => void onSelectChannel(v)}
      />
      {channel === "ci" ? (
        <Row
          title={t("more.update.cdnTitle")}
          desc={t("more.update.cdnDesc")}
          extra={
            <Switch
              checked={preferCdn}
              disabled={busy || installing}
              onChange={onPreferCdn}
            />
          }
        />
      ) : null}
      <div className="bf-row" style={{ display: "block", paddingTop: 8 }}>
        <div className="bf-row__desc">
          {t("more.update.versions", {
            versions: versionLine(result?.localVersion, remote?.version),
          })}
          {result?.localCode || remote?.versionCode
            ? ` (${result?.localCode ?? "?"} → ${remote?.versionCode ?? "--"})`
            : ""}
        </div>
        {result?.hasUpdate ? (
          <div className="bf-row__desc">{t("more.update.updateReady")}</div>
        ) : null}
        {result?.canSwitch && !result.hasUpdate ? (
          <div className="bf-row__desc">{t("more.update.switchReady")}</div>
        ) : null}
        {result?.stableNewer ? (
          <div className="bf-row__desc">
            {t("more.update.stableNewer", { version: result.stableNewer.version })}
          </div>
        ) : null}
        {result?.error ? <div className="bf-row__desc">{result.error}</div> : null}
      </div>
      <UpdateInstallProgress active={installing} phase={phase} percent={percent} />
      <div className="bf-update-actions">
        <Button disabled={busy || installing} onClick={() => void runCheck(false)}>
          {t("more.update.check")}
        </Button>
        <Button
          variant="primary"
          className={installing ? "bf-btn--busy" : undefined}
          disabled={!canInstall || busy || installing}
          onClick={() => void onInstall()}
        >
          {installLabel}
        </Button>
      </div>
    </Card>
  );
}
