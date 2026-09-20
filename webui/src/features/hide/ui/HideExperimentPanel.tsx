import { useState } from "react";
import { BottomSheet, Button, Card } from "@/shared/ui";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { useForceBindCapture } from "../hooks/useForceBindCapture";
import { useLateInject } from "../hooks/useLateInject";
import { useExperimentFlag } from "../hooks/useExperimentFlag";
import { setBootBindZygote, setBootMultiApex, setServiceProbe } from "@/shared/api/cli";
import { HideAllowRow } from "./HideAllowRow";

type HideExperimentPanelProps = {
  /** default | ops | console 入口样式略有差异 */
  variant?: "card" | "section" | "block";
  large?: boolean;
};

export function HideExperimentPanel({
  variant = "card",
  large,
}: HideExperimentPanelProps) {
  const [open, setOpen] = useState(false);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const force = useForceBindCapture();
  const late = useLateInject();
  const zygote = useExperimentFlag({
    key: "boot_bind_zygote",
    defaultOn: false,
    setFn: setBootBindZygote,
    toastOn: h.bootZygoteToastOn,
    toastOff: h.bootZygoteToastOff,
    confirmOn: {
      title: h.bootZygoteConfirmOnTitle,
      body: h.bootZygoteConfirmOnBody,
      ok: h.bootZygoteConfirmOnOk,
    },
  });
  const multiApex = useExperimentFlag({
    key: "boot_multi_apex",
    defaultOn: false,
    setFn: setBootMultiApex,
    toastOn: h.bootMultiApexToastOn,
    toastOff: h.bootMultiApexToastOff,
    confirmOn: {
      title: h.bootMultiApexConfirmOnTitle,
      body: h.bootMultiApexConfirmOnBody,
      ok: h.bootMultiApexConfirmOnOk,
    },
  });
  const probe = useExperimentFlag({
    key: "service_probe",
    defaultOn: false,
    setFn: setServiceProbe,
    toastOn: h.serviceProbeToastOn,
    toastOff: h.serviceProbeToastOff,
  });

  const entry = (
    <Button
      type="button"
      variant="ghost"
      className="bf-btn--block"
      onClick={() => setOpen(true)}
    >
      {h.experimentEntryCta}
    </Button>
  );

  const sheetBody = (
    <div className="bf-stack bf-stack--loose">
      <p className="bf-page-sub">{h.experimentIntro}</p>
      <HideAllowRow
        checked={force.forceBind}
        disabled={force.isPending}
        onChange={force.handleChange}
        title={h.forceBindTitle}
        descOn={h.forceBindOn}
        descOff={h.forceBindOff}
        large={large}
      />
      <HideAllowRow
        checked={late.lateInject}
        disabled={late.isPending}
        onChange={late.handleChange}
        title={h.lateInjectTitle}
        descOn={h.lateInjectOn}
        descOff={h.lateInjectOff}
        large={large}
      />
      <HideAllowRow
        checked={zygote.checked}
        disabled={zygote.isPending}
        onChange={zygote.handleChange}
        title={h.bootZygoteTitle}
        descOn={h.bootZygoteOn}
        descOff={h.bootZygoteOff}
        large={large}
      />
      <HideAllowRow
        checked={multiApex.checked}
        disabled={multiApex.isPending}
        onChange={multiApex.handleChange}
        title={h.bootMultiApexTitle}
        descOn={h.bootMultiApexOn}
        descOff={h.bootMultiApexOff}
        large={large}
      />
      <HideAllowRow
        checked={probe.checked}
        disabled={probe.isPending}
        onChange={probe.handleChange}
        title={h.serviceProbeTitle}
        descOn={h.serviceProbeOn}
        descOff={h.serviceProbeOff}
        large={large}
      />
    </div>
  );

  const sheet = (
    <BottomSheet
      open={open}
      onClose={() => setOpen(false)}
      title={h.experimentSheetTitle}
      height="min(88dvh, 720px)"
    >
      {sheetBody}
    </BottomSheet>
  );

  if (variant === "section") {
    return (
      <>
        <section className="pk-def-section">
          <h2 className="pk-def-section__title">{h.experimentEntryTitle}</h2>
          <p className="pk-def-muted pk-def-muted--tight">{h.experimentEntryMeta}</p>
          <div className="pk-def-group">{entry}</div>
        </section>
        {sheet}
      </>
    );
  }

  if (variant === "block") {
    return (
      <>
        <section className="pk-ops-panel">
          <h2 className="pk-ops-panel__title">{h.experimentEntryTitle}</h2>
          <p className="bf-page-sub">{h.experimentEntryMeta}</p>
          {entry}
        </section>
        {sheet}
      </>
    );
  }

  return (
    <>
      <Card title={h.experimentEntryTitle} meta={h.experimentEntryMeta}>
        {entry}
      </Card>
      {sheet}
    </>
  );
}
