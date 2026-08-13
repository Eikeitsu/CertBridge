import type { ReactNode } from "react";

import type { TrustTone } from "@/entities/module/enums";

type StatusStageProps = {
  tone: TrustTone;
  kicker?: string;
  title: string;
  description?: string;
  flags?: ReactNode;
  diagnosis?: ReactNode;
  footer?: ReactNode;
};

export function StatusStage({
  tone,
  kicker = "运行状态",
  title,
  description,
  flags,
  diagnosis,
  footer,
}: StatusStageProps) {
  return (
    <section className={`cb-stage tone-${tone}`}>
      <p className="cb-stage__kicker">{kicker}</p>
      <h2 className="cb-stage__title">{title}</h2>
      {description ? <p className="cb-stage__desc">{description}</p> : null}
      {diagnosis}
      {flags ? <div className="cb-stage__flags">{flags}</div> : null}
      {footer ? <div className="cb-stage__foot">{footer}</div> : null}
    </section>
  );
}
