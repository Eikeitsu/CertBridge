import {
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Grid,
  List,
  NoticeBar,
  ProgressCircle,
  Space,
  Steps,
  Tag,
} from "antd-mobile";
import {
  CheckCircleFill,
  CheckShieldOutline,
  ExclamationCircleFill,
  FileOutline,
  SetOutline,
  UnorderedListOutline,
} from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { refreshStatus, requestReboot } from "@/features/status/model/statusSlice";
import {
  selectStatusBootstrapped,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { selectThemePack } from "@/features/theme/model/selectors";
import { ChipList } from "@/shared/ui/ChipList";
import { EmptyHint } from "@/shared/ui/EmptyHint";
import { ListGroup, ListRow } from "@/shared/ui/ListGroup";
import { Loader } from "@/shared/ui/Loader";
import { PageRefresh } from "@/shared/ui/PageRefresh";
import { confirmAction } from "@/shared/lib/confirmAction";
import { TAB_PATH } from "@/shared/config/navigation";
import { getPackVoice } from "@/shared/config/packVoice";
import { TabName, TrustTone } from "@/entities/module/enums";
import { CertBrandIcon } from "@/features/certs/ui/CertBrandIcon";

export function OverviewPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const pack = useAppSelector(selectThemePack);
  const voice = getPackVoice(pack);
  const overview = useTrustOverview();
  const isRefreshing = useAppSelector(selectStatusRefreshing);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const showBootSpin = overview.isLoading && !bootstrapped;

  const statusText =
    overview.injectDiagnosis?.hint ||
    (overview.trust.tone === TrustTone.Idle && overview.isLoading
      ? voice.idleDesc
      : overview.activeNames.length
        ? `${voice.activePrefix}${overview.activeNames.join("、")}`
        : overview.trust.hint || overview.description);

  const handleReboot = () => {
    confirmAction({
      title: "确认重启设备？",
      content: voice.rebootHint,
      okText: "重启",
      danger: true,
      onOk: () => dispatch(requestReboot()),
    });
  };

  const goCerts = () => navigate(TAB_PATH[TabName.Certs], { replace: true });
  const goLog = () => navigate(TAB_PATH[TabName.Log], { replace: true });
  const goMore = () => navigate(TAB_PATH[TabName.More], { replace: true });

  const circleColor =
    overview.trust.tone === TrustTone.Ok
      ? "var(--cb-ok)"
      : overview.trust.tone === TrustTone.Bad
        ? "var(--cb-bad)"
        : overview.trust.tone === TrustTone.Warn
          ? "var(--cb-warn)"
          : "var(--cb-ink-3)";

  const stepCurrent = overview.isDisabled
    ? 0
    : overview.activeCount === 0
      ? 1
      : overview.isPendingReboot
        ? 2
        : 3;

  return (
    <div className={`ov ov-${pack}${showBootSpin ? " is-loading" : ""}`}>
      {showBootSpin ? (
        <div className="ov-boot">
          <Loader label={voice.loadingHint} />
        </div>
      ) : null}

      <PageRefresh onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        <div className="ov-stack">
        {overview.isDisabled ? (
          <NoticeBar content="模块当前处于停用状态，证书注入不会执行。" color="alert" />
        ) : null}
        {overview.isPendingReboot ? (
          <NoticeBar content="有永久变更等待重启后生效。" color="alert" closeable />
        ) : null}
        {overview.injectDiagnosis?.message ? (
          <NoticeBar
            content={overview.injectDiagnosis.message}
            color="error"
            extra={
              <Button size="mini" fill="none" onClick={goLog}>
                日志
              </Button>
            }
          />
        ) : null}
        {overview.isHotStale ? (
          <NoticeBar content="临时挂载状态异常，建议卸载后重试。" color="alert" />
        ) : null}

        <Card className="ov-status-card">
          <div className="ov-status-card__row">
            <div className="ov-status-card__main">
              <p className="ov-kicker">{voice.stageKicker}</p>
              <h2 className="ov-status-title">{overview.trust.title}</h2>
              <p className="ov-status-desc">{statusText}</p>
              <Space wrap className="ov-status-tags">
                <Tag color="primary" fill="outline" round>
                  {overview.deviceLabel}
                </Tag>
                <Tag color="default" fill="outline" round>
                  {overview.androidLabel}
                </Tag>
                {overview.isHotMountActive ? (
                  <Tag color="success" round>
                    临时挂载中
                  </Tag>
                ) : null}
                {overview.isPendingReboot ? (
                  <Tag color="warning" round>
                    待重启
                  </Tag>
                ) : null}
              </Space>
            </div>
            <ProgressCircle
              percent={overview.trustScore}
              style={{
                "--size": "76px",
                "--track-width": "6px",
                "--fill-color": circleColor,
              }}
            >
              <span className="ov-score">{overview.trustScore}</span>
            </ProgressCircle>
          </div>
          <Divider />
          <p className="ov-desc-body">{overview.description}</p>
          <Space wrap>
            <Button
              color="primary"
              size="small"
              loading={isRefreshing}
              onClick={() => void dispatch(refreshStatus(true))}
            >
              {voice.refresh}
            </Button>
            <Button size="small" fill="outline" onClick={goLog}>
              {voice.diagnose}
            </Button>
            <Button size="small" fill="outline" onClick={goCerts}>
              {voice.manageCerts}
            </Button>
          </Space>
        </Card>

        <Grid columns={4} gap={8} className="ov-metric-grid">
          {[
            { label: voice.metrics.active, value: overview.activeCount },
            { label: voice.metrics.custom, value: overview.customCount },
            { label: voice.metrics.baseline, value: overview.baselineCount },
            { label: voice.metrics.store, value: overview.storeCount },
          ].map((item) => (
            <Grid.Item key={item.label}>
              <div className="ov-metric-cell">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            </Grid.Item>
          ))}
        </Grid>

        <Card
          title={
            <Badge content={overview.activeNames.length || null}>
              <span className="ov-card-title">{voice.trustTitle}</span>
            </Badge>
          }
          className="ov-block"
        >
          {overview.activeNames.length ? (
            <ChipList items={overview.activeNames} />
          ) : (
            <EmptyHint>{voice.trustEmpty}</EmptyHint>
          )}
        </Card>

        <Card title="证书管道" className="ov-block" extra={<Button size="mini" fill="none" onClick={goCerts}>管理</Button>}>
          <List>
            {overview.builtinPipeline.map((row) => (
              <List.Item
                key={row.kind}
                prefix={<CertBrandIcon kind={row.kind} />}
                description={row.stateLabel}
                extra={
                  row.active ? (
                    <CheckCircleFill style={{ color: "var(--cb-ok)", fontSize: 18 }} />
                  ) : row.enabled ? (
                    <ExclamationCircleFill style={{ color: "var(--cb-warn)", fontSize: 18 }} />
                  ) : (
                    <Tag fill="outline">{row.available ? "可用" : "缺失"}</Tag>
                  )
                }
              >
                {row.title}
              </List.Item>
            ))}
            <List.Item
              prefix={<FileOutline fontSize={22} />}
              description={`${overview.customCount} 张自定义证书`}
              extra={<Tag fill="outline">自定义</Tag>}
              onClick={goCerts}
              clickable
              arrowIcon
            >
              自定义 CA
            </List.Item>
          </List>
        </Card>

        {overview.isHotMountSupported ? (
          <Card
            title="临时挂载会话"
            className="ov-block"
            extra={
              <Tag color={overview.isHotMountActive ? "success" : "default"} fill="outline">
                {overview.hotStatusLabel}
              </Tag>
            }
          >
            <List>
              <List.Item extra={overview.isHotAllow ? "开" : "关"}>允许临时挂载</List.Item>
              <List.Item extra={overview.hotMode}>会话模式</List.Item>
              <List.Item extra={overview.hotAdded}>已加入证书</List.Item>
              <List.Item extra={overview.hotNamespaces}>命名空间</List.Item>
              {overview.isHotPartial || Number(overview.hotFailed) > 0 ? (
                <List.Item extra={overview.hotFailed}>未覆盖命名空间</List.Item>
              ) : null}
            </List>
            <Button block size="small" fill="outline" style={{ marginTop: 10 }} onClick={goCerts}>
              前往临时挂载
            </Button>
          </Card>
        ) : null}

        <ListGroup title={voice.runtimeTitle}>
          <List.Item extra={overview.deviceLabel}>设备</List.Item>
          <List.Item extra={overview.androidLabel}>系统</List.Item>
          <List.Item extra={overview.rootLabel}>Root</List.Item>
          <List.Item extra={overview.apexLabel}>APEX</List.Item>
          <List.Item extra={overview.mountModeLabel} description={overview.mountModeMeta}>
            挂载模式
          </List.Item>
          <List.Item extra={overview.tmpfsLabel} description={overview.tmpfsMeta}>
            临时路径
          </List.Item>
          <List.Item extra={overview.versionLabel}>模块版本</List.Item>
          <List.Item extra={overview.hotStatusLabel}>临时会话</List.Item>
          <List.Item extra={overview.lastRefreshedAt}>上次刷新</List.Item>
        </ListGroup>

        <Card title="建议流程" className="ov-block">
          <Steps current={stepCurrent} direction="vertical">
            <Steps.Step title="确认模块启用" description="模块停用时不会注入证书" />
            <Steps.Step title="启用或导入证书" description="Reqable / ProxyPin / 自定义 CA" />
            <Steps.Step title="刷新并检查状态" description="确认「已应用」或「待重启」" />
            <Steps.Step title="重启生效" description="永久变更写入系统信任库" />
          </Steps>
        </Card>

        <ListGroup title={voice.actionsTitle}>
          <ListRow
            leading={<CheckShieldOutline fontSize={20} />}
            title={voice.manageCerts}
            subtitle={voice.manageCertsHint}
            onClick={goCerts}
          />
          {overview.isHotMountSupported ? (
            <ListRow
              leading={<FileOutline fontSize={20} />}
              title={voice.tempCerts}
              subtitle={voice.tempCertsHint}
              onClick={goCerts}
            />
          ) : null}
          <ListRow
            leading={<UnorderedListOutline fontSize={20} />}
            title={voice.diagnose}
            subtitle="查看注入与挂载日志"
            onClick={goLog}
          />
          <ListRow
            leading={<SetOutline fontSize={20} />}
            title="外观与挂载"
            subtitle="主题包、挂载模式、临时路径"
            onClick={goMore}
          />
          <List.Item
            clickable
            arrowIcon
            onClick={handleReboot}
            description={voice.rebootHint}
          >
            <span className="ov-danger-text">{voice.rebootTitle}</span>
          </List.Item>
        </ListGroup>

        <Collapse className="ov-help">
          <Collapse.Panel key="help" title="状态说明">
            <p>
              <strong>信任分</strong>综合启用数、注入错误、待重启与模块停用估算，仅供快速扫一眼。
            </p>
            <p>
              <strong>永久证书</strong>写入系统信任库后需重启；<strong>临时挂载</strong>可即时生效，卸载即恢复。
            </p>
            <p>短描述：{overview.shortDesc}</p>
            {overview.injectDiagnosis?.reason ? (
              <p>注入原因码：{overview.injectDiagnosis.reason}</p>
            ) : null}
          </Collapse.Panel>
        </Collapse>
        </div>
      </PageRefresh>
    </div>
  );
}
