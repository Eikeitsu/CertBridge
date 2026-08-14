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
    <section className={`cb-stage tone-${tone}`}>
      <div className="cb-stage__glow" aria-hidden />
      {showHeroValue ? (
        <div className="cb-stage__hero">
          <div className="cb-stage__hero-num">{heroValue ?? "—"}</div>
          <div className="cb-stage__hero-copy">
            <p className="cb-stage__kicker">{kicker}</p>
            <h2 className="cb-stage__title">{title}</h2>
          </div>
        </div>
      ) : (
        <>
          <p className="cb-stage__kicker">{kicker}</p>
          <h2 className="cb-stage__title">{title}</h2>
        </>
      )}
      {description ? <p className="cb-stage__desc">{description}</p> : null}
      {diagnosis}
      {flags ? <div className="cb-stage__flags">{flags}</div> : null}
      {footer ? <div className="cb-stage__foot">{footer}</div> : null}
    </section>
  );
}
