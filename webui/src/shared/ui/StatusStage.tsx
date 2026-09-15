import type { ReactNode } from "react";
import type { TrustTone } from "@/entities/module/enums";

type StatusStageProps = {
  tone: TrustTone;
  kicker?: string;
  title: string;
  description?: string;
  heroValue?: string | number;
  showHeroValue?: boolean;
  flags?: ReactNode;
  diagnosis?: ReactNode;
  footer?: ReactNode;
};

export function StatusStage({
  tone,
  kicker = "运行状态",
  title,
  description,
  heroValue,
  showHeroValue = false,
  flags,
  diagnosis,
  footer,
}: StatusStageProps) {
  return (
    <section className={`bf-stage tone-${tone}`}>
      <div className="bf-stage__glow" aria-hidden />
      {showHeroValue ? (
        <div className="bf-stage__hero">
          <div className="bf-stage__hero-num">{heroValue ?? "—"}</div>
          <div className="bf-stage__hero-copy">
            <p className="bf-stage__kicker">
              <span className={`bf-stage__tone-dot tone-${tone}`} aria-hidden />
              {kicker}
            </p>
            <h2 className="bf-stage__title">{title}</h2>
          </div>
        </div>
      ) : (
        <>
          <p className="bf-stage__kicker">
            <span className={`bf-stage__tone-dot tone-${tone}`} aria-hidden />
            {kicker}
          </p>
          <h2 className="bf-stage__title">{title}</h2>
        </>
      )}
      {description ? <p className="bf-stage__desc">{description}</p> : null}
      {diagnosis}
      {flags ? <div className="bf-stage__flags">{flags}</div> : null}
      {footer ? <div className="bf-stage__foot">{footer}</div> : null}
    </section>
  );
}
