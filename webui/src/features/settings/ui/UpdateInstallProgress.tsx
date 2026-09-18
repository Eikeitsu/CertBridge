import type { ModuleUpdatePhase } from "@/shared/api/moduleUpdate";

const PHASE_LABEL: Record<ModuleUpdatePhase, string> = {
  download: "正在下载",
  write: "正在写入",
  install: "正在安装",
  manager: "打开管理器",
};

type UpdateInstallProgressProps = {
  active: boolean;
  phase: ModuleUpdatePhase | null;
  percent: number;
};

function asciiBar(percent: number, width = 14): string {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * width);
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}

export function UpdateInstallProgress({
  active,
  phase,
  percent,
}: UpdateInstallProgressProps) {
  if (!active || !phase) return null;
  const label = PHASE_LABEL[phase];
  const pct = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      className={`bf-update-flow is-on is-${phase}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="bf-update-flow__head">
        <span className="bf-update-flow__label">{label}</span>
        <span className="bf-update-flow__pct">{pct}%</span>
      </div>
      <div className="bf-update-flow__track" aria-hidden>
        <div className="bf-update-flow__fill" style={{ width: `${pct}%` }} />
      </div>
      <pre className="bf-update-flow__term" aria-hidden>
        {`${phase} ${asciiBar(pct)} ${pct}%`}
      </pre>
      <div className="bf-update-flow__pulse" aria-hidden />
    </div>
  );
}
