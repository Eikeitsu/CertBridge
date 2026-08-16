import { Button, Card, Grid, List, Space, Tag } from "antd-mobile";
import {
  CheckShieldOutline,
  ExclamationCircleOutline,
  RightOutline,
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
import { TabName, ThemePack, TrustTone } from "@/entities/module/enums";

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

  const metrics = [
    { label: voice.metrics.active, value: overview.activeCount },
    { label: voice.metrics.custom, value: overview.customCount },
    { label: voice.metrics.baseline, value: overview.baselineCount },
    { label: voice.metrics.store, value: overview.storeCount },
  ];

  const runtimeRows: [string, string][] = [
    ["Android", overview.androidLabel],
    ["Root", overview.rootLabel],
    ["APEX", overview.apexLabel],
    ["挂载", overview.mountModeLabel],
    ["版本", overview.versionLabel],
    ["临时会话", overview.hotStatusLabel],
    ["刷新于", overview.lastRefreshedAt],
  ];

  const content =
    pack === ThemePack.Material ? (
      <MaterialOverview
        voice={voice}
        overview={overview}
        statusText={statusText}
        metrics={metrics}
        runtimeRows={runtimeRows}
        isRefreshing={isRefreshing}
        onRefresh={() => void dispatch(refreshStatus(true))}
        onDiagnose={() => navigate(TAB_PATH[TabName.Log], { replace: true })}
        onCerts={() => navigate(TAB_PATH[TabName.Certs], { replace: true })}
        onReboot={handleReboot}
      />
    ) : pack === ThemePack.Fluid ? (
      <FluidOverview
        voice={voice}
        overview={overview}
        statusText={statusText}
        metrics={metrics}
        runtimeRows={runtimeRows}
        isRefreshing={isRefreshing}
        onRefresh={() => void dispatch(refreshStatus(true))}
        onDiagnose={() => navigate(TAB_PATH[TabName.Log], { replace: true })}
        onCerts={() => navigate(TAB_PATH[TabName.Certs], { replace: true })}
        onReboot={handleReboot}
      />
    ) : (
      <ClassicOverview
        voice={voice}
        overview={overview}
        statusText={statusText}
        metrics={metrics}
        runtimeRows={runtimeRows}
        isRefreshing={isRefreshing}
        onRefresh={() => void dispatch(refreshStatus(true))}
        onDiagnose={() => navigate(TAB_PATH[TabName.Log], { replace: true })}
        onCerts={() => navigate(TAB_PATH[TabName.Certs], { replace: true })}
        onReboot={handleReboot}
      />
    );

  return (
    <div className={`ov ov-${pack}${showBootSpin ? " is-loading" : ""}`}>
      {showBootSpin ? (
        <div className="ov-boot">
          <Loader label={voice.loadingHint} />
        </div>
      ) : null}
      <PageRefresh onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        {content}
      </PageRefresh>
    </div>
  );
}

type OverviewViewProps = {
  voice: ReturnType<typeof getPackVoice>;
  overview: ReturnType<typeof useTrustOverview>;
  statusText: string;
  metrics: { label: string; value: string | number }[];
  runtimeRows: [string, string][];
  isRefreshing: boolean;
  onRefresh: () => void;
  onDiagnose: () => void;
  onCerts: () => void;
  onReboot: () => void;
};

function ClassicOverview({
  voice,
  overview,
  statusText,
  metrics,
  runtimeRows,
  isRefreshing,
  onRefresh,
  onDiagnose,
  onCerts,
  onReboot,
}: OverviewViewProps) {
  return (
    <>
      <ListGroup title={voice.stageKicker}>
        <List.Item
          prefix={<CheckShieldOutline fontSize={22} />}
          description={statusText}
          extra={
            <Button size="mini" fill="outline" loading={isRefreshing} onClick={onRefresh}>
              {voice.refresh}
            </Button>
          }
        >
          {overview.trust.title}
        </List.Item>
        {overview.isPendingReboot ? (
          <List.Item prefix={<ExclamationCircleOutline />}>待重启生效</List.Item>
        ) : null}
        {overview.injectDiagnosis?.message ? (
          <List.Item
            clickable
            arrowIcon
            onClick={onDiagnose}
            description={overview.injectDiagnosis.message}
          >
            {voice.diagnose}
          </List.Item>
        ) : null}
      </ListGroup>

      <div className="cb-metrics cb-metrics--strip">
        {metrics.map((item) => (
          <div key={item.label} className="cb-metric">
            <div className="value">{item.value}</div>
            <div className="label">{item.label}</div>
          </div>
        ))}
      </div>

      <ListGroup title={voice.trustTitle}>
        {overview.activeNames.length ? (
          <List.Item>
            <ChipList items={overview.activeNames} />
          </List.Item>
        ) : (
          <List.Item>
            <EmptyHint>{voice.trustEmpty}</EmptyHint>
          </List.Item>
        )}
      </ListGroup>

      <ListGroup title={voice.runtimeTitle}>
        {runtimeRows.map(([label, value]) => (
          <List.Item key={label} extra={value}>
            {label}
          </List.Item>
        ))}
      </ListGroup>

      <ListGroup title={voice.actionsTitle}>
        <ListRow
          title={voice.manageCerts}
          subtitle={voice.manageCertsHint}
          onClick={onCerts}
        />
        {overview.isHotMountSupported ? (
          <ListRow
            title={voice.tempCerts}
            subtitle={voice.tempCertsHint}
            onClick={onCerts}
          />
        ) : null}
        <List.Item
          clickable
          arrowIcon={<RightOutline />}
          onClick={onReboot}
          description={voice.rebootHint}
        >
          <span className="ov-danger-text">{voice.rebootTitle}</span>
        </List.Item>
      </ListGroup>
    </>
  );
}

function MaterialOverview({
  voice,
  overview,
  statusText,
  metrics,
  runtimeRows,
  isRefreshing,
  onRefresh,
  onDiagnose,
  onCerts,
  onReboot,
}: OverviewViewProps) {
  return (
    <>
      <section className={`ov-hero-md tone-${overview.trust.tone}`}>
        <p className="ov-hero-md__kicker">{voice.stageKicker}</p>
        <h2 className="ov-hero-md__title">{overview.trust.title}</h2>
        <p className="ov-hero-md__desc">{statusText}</p>
        <div className="ov-hero-md__badges">
          {overview.isPendingReboot ? <Tag color="warning">待重启</Tag> : null}
          {overview.isHotMountActive ? <Tag color="primary">临时挂载</Tag> : null}
        </div>
        <div className="ov-hero-md__aside">
          <strong>{overview.activeCount}</strong>
          <span>{voice.metrics.active}</span>
        </div>
        <Space className="ov-hero-md__actions">
          <Button color="primary" fill="solid" loading={isRefreshing} onClick={onRefresh}>
            {voice.refresh}
          </Button>
          {overview.injectDiagnosis?.message ? (
            <Button fill="outline" onClick={onDiagnose}>
              {voice.diagnose}
            </Button>
          ) : null}
        </Space>
      </section>

      {overview.injectDiagnosis?.message ? (
        <Card className="ov-diag-card">{overview.injectDiagnosis.message}</Card>
      ) : null}

      <Grid columns={2} gap={12} className="ov-metric-grid">
        {metrics.map((item) => (
          <Grid.Item key={item.label}>
            <div className="ov-metric-tile">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          </Grid.Item>
        ))}
      </Grid>

      <Card title={voice.trustTitle} className="ov-md-card">
        {overview.activeNames.length ? (
          <ChipList items={overview.activeNames} />
        ) : (
          <EmptyHint>{voice.trustEmpty}</EmptyHint>
        )}
      </Card>

      <Card title={voice.runtimeTitle} className="ov-md-card">
        <List mode="default">
          {runtimeRows.map(([label, value]) => (
            <List.Item key={label} extra={value}>
              {label}
            </List.Item>
          ))}
        </List>
      </Card>

      <p className="cb-section-label">{voice.actionsTitle}</p>
      <Grid columns={2} gap={12}>
        <Grid.Item>
          <button type="button" className="ov-action-tile tone-accent" onClick={onCerts}>
            <strong>{voice.manageCerts}</strong>
            <span>{voice.manageCertsHint}</span>
          </button>
        </Grid.Item>
        {overview.isHotMountSupported ? (
          <Grid.Item>
            <button type="button" className="ov-action-tile" onClick={onCerts}>
              <strong>{voice.tempCerts}</strong>
              <span>{voice.tempCertsHint}</span>
            </button>
          </Grid.Item>
        ) : null}
        <Grid.Item>
          <button type="button" className="ov-action-tile tone-danger" onClick={onReboot}>
            <strong>{voice.rebootTitle}</strong>
            <span>{voice.rebootHint}</span>
          </button>
        </Grid.Item>
      </Grid>
    </>
  );
}

function FluidOverview({
  voice,
  overview,
  statusText,
  metrics,
  runtimeRows,
  isRefreshing,
  onRefresh,
  onDiagnose,
  onCerts,
  onReboot,
}: OverviewViewProps) {
  return (
    <>
      <section className={`ov-hero-fl tone-${overview.trust.tone}`}>
        <div className="ov-hero-fl__orb" aria-hidden />
        <p className="ov-hero-fl__kicker">{voice.stageKicker}</p>
        <h2 className="ov-hero-fl__title">{overview.trust.title}</h2>
        <p className="ov-hero-fl__desc">{statusText}</p>
        <div className="ov-hero-fl__row">
          <Button
            color="primary"
            shape="rounded"
            loading={isRefreshing}
            onClick={onRefresh}
          >
            {voice.refresh}
          </Button>
          {overview.injectDiagnosis?.message ? (
            <Button shape="rounded" fill="outline" onClick={onDiagnose}>
              {voice.diagnose}
            </Button>
          ) : null}
        </div>
      </section>

      <div className="ov-metric-rail" aria-label="指标">
        {metrics.map((item) => (
          <div key={item.label} className="ov-metric-pill">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <Card className="ov-glass-card" title={voice.trustTitle}>
        {overview.activeNames.length ? (
          <ChipList items={overview.activeNames} />
        ) : (
          <EmptyHint>{voice.trustEmpty}</EmptyHint>
        )}
      </Card>

      <Card className="ov-glass-card" title={voice.runtimeTitle}>
        <dl className="ov-runtime-soft">
          {runtimeRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="cb-section-label">{voice.actionsTitle}</p>
      <div className="ov-chip-actions">
        <button type="button" className="ov-chip-action" onClick={onCerts}>
          {voice.manageCerts}
        </button>
        {overview.isHotMountSupported ? (
          <button type="button" className="ov-chip-action" onClick={onCerts}>
            {voice.tempCerts}
          </button>
        ) : null}
        <button type="button" className="ov-chip-action is-danger" onClick={onReboot}>
          {voice.rebootTitle}
        </button>
      </div>
    </>
  );
}
