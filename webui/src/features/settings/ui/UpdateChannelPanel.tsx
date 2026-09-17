import { useCallback, useEffect, useState } from "react";
import { Button, Card, Row, Segment, Switch } from "@/shared/ui/primitives";
import { toast } from "@/shared/api/ksu";
import { downloadAndInstallModule } from "@/shared/api/moduleUpdate";
import {
  UPDATE_CHANNELS,
  UPDATE_CHANNEL_HINT,
  UPDATE_CHANNEL_LABEL,
  checkUpdateChannel,
  isPreferCdn,
  loadPersistedChannel,
  persistChannel,
  setPreferCdn,
  versionLine,
  type ChannelCheckResult,
  type UpdateChannel,
} from "@/shared/lib/updateChannel";

type UpdateChannelPanelProps = {
  dense?: boolean;
  surface?: "card" | "plain";
};

export function UpdateChannelPanel({
  dense,
  surface = "card",
}: UpdateChannelPanelProps) {
  const [channel, setChannel] = useState<UpdateChannel>("stable");
  const [preferCdn, setPreferCdnState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState(false);
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
        else if (!silent) toast("检查完成", "ok");
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), "bad");
      } finally {
        setBusy(false);
      }
    },
    [channel, preferCdn],
  );

  useEffect(() => {
    void runCheck(true);
  }, [runCheck]);

  const onSelectChannel = async (next: string) => {
    const ch = next === "ci" ? "ci" : "stable";
    if (ch === channel) return;
    if (ch === "ci") {
      const ok = window.confirm(
        "切换到 CI？\n开发构建可能不稳定，仅建议排查问题或尝鲜时使用。",
      );
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
      toast("没有可安装的包", "bad");
      return;
    }
    setInstalling(true);
    try {
      const r = await downloadAndInstallModule(zip);
      if (!r.ok) {
        toast(r.error || "安装失败", "bad");
        return;
      }
      toast(r.mode === "cli" ? "已刷入模块" : "已打开管理器，请确认安装", "ok");
      void runCheck(true);
    } finally {
      setInstalling(false);
    }
  };

  const remote = result?.remote;
  const canInstall = !!(
    result &&
    remote &&
    (result.hasUpdate || result.canSwitch)
  );

  return (
    <Card
      title="更新通道"
      meta="正式走 Pages；CI 的清单与 zip 同在 ci-dist 分支。管理器自带更新始终跟正式通道。"
      surface={surface}
      className={dense ? "bf-card--dense" : undefined}
    >
      <Segment
        options={UPDATE_CHANNELS.map((c) => ({
          value: c,
          label: UPDATE_CHANNEL_LABEL[c],
          hint: UPDATE_CHANNEL_HINT[c],
        }))}
        value={channel}
        disabled={busy || installing}
        onChange={(v) => void onSelectChannel(v)}
      />
      {channel === "ci" ? (
        <Row
          title="CI 经 jsDelivr 拉取"
          desc="默认关；失败会回退 GitHub raw"
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
          本地 / 远端：{versionLine(result?.localVersion, remote?.version)}
          {result?.localCode || remote?.versionCode
            ? `（${result?.localCode ?? "?"} → ${remote?.versionCode ?? "--"}）`
            : ""}
        </div>
        {result?.hasUpdate ? (
          <div className="bf-row__desc">有新版本可安装</div>
        ) : null}
        {result?.canSwitch && !result.hasUpdate ? (
          <div className="bf-row__desc">可切换安装当前通道版本</div>
        ) : null}
        {result?.stableNewer ? (
          <div className="bf-row__desc">
            旁路提示：正式通道已有更新 {result.stableNewer.version}
          </div>
        ) : null}
        {result?.error ? (
          <div className="bf-row__desc">{result.error}</div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <Button
          disabled={busy || installing}
          onClick={() => void runCheck(false)}
        >
          检查更新
        </Button>
        <Button
          variant="primary"
          disabled={!canInstall || busy || installing}
          onClick={() => void onInstall()}
        >
          {installing
            ? "安装中…"
            : result?.hasUpdate
              ? "下载并安装"
              : "切换安装"}
        </Button>
      </div>
    </Card>
  );
}
