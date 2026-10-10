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

  const options = [
    {
      key: "force",
      checked: force.forceBind,
      disabled: force.isPending,
      onChange: force.handleChange,
      title: h.forceBindTitle,
      note: h.forceBindNote,
      descOn: h.forceBindOn,
      descOff: h.forceBindOff,
    },
    {
      key: "late",
      checked: late.lateInject,
      disabled: late.isPending,
      onChange: late.handleChange,
      title: h.lateInjectTitle,
      note: h.lateInjectNote,
      descOn: h.lateInjectOn,
      descOff: h.lateInjectOff,
    },
    {
      key: "zygote",
      checked: zygote.checked,
      disabled: zygote.isPending,
      onChange: zygote.handleChange,
      title: h.bootZygoteTitle,
      note: h.bootZygoteNote,
      descOn: h.bootZygoteOn,
      descOff: h.bootZygoteOff,
    },
    {
      key: "multiApex",
      checked: multiApex.checked,
      disabled: multiApex.isPending,
      onChange: multiApex.handleChange,
      title: h.bootMultiApexTitle,
      note: h.bootMultiApexNote,
      descOn: h.bootMultiApexOn,
      descOff: h.bootMultiApexOff,
    },
    {
      key: "probe",
      checked: probe.checked,
      disabled: probe.isPending,
      onChange: probe.handleChange,
      title: h.serviceProbeTitle,
      note: h.serviceProbeNote,
      descOn: h.serviceProbeOn,
      descOff: h.serviceProbeOff,
    },
  ] as const;

  const entry = (
    <button type="button" className="bf-labs-entry" onClick={() => setOpen(true)}>
      <span className="bf-labs-entry__text">
        <span className="bf-labs-entry__title">{h.experimentEntryCta}</span>
        <span className="bf-labs-entry__meta">{h.experimentEntryHint}</span>
      </span>
      <span className="bf-labs-entry__chev" aria-hidden>
        ›
      </span>
    </button>
  );

  const sheetBody = (
    <div className="bf-labs-sheet">
      <p className="bf-labs-sheet__intro">{h.experimentIntro}</p>
      <div className="bf-labs-sheet__list">
        {options.map((opt) => (
          <div key={opt.key} className="bf-labs-sheet__item">
            <HideAllowRow
              checked={opt.checked}
              disabled={opt.disabled}
              onChange={opt.onChange}
              title={opt.title}
              note={opt.note}
              descOn={opt.descOn}
              descOff={opt.descOff}
              large={large}
            />
          </div>
        ))}
      </div>
      <div className="bf-labs-sheet__footer">
        <Button
          type="button"
          variant="ghost"
          className="bf-btn--block"
          onClick={() => setOpen(false)}
        >
          {h.experimentSheetDone}
        </Button>
      </div>
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
        <section className="pk-def-section bf-labs">
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
        <section className="pk-ops-panel bf-labs">
          <h2 className="pk-ops-panel__title">{h.experimentEntryTitle}</h2>
          <p className="pk-ops-empty">{h.experimentEntryMeta}</p>
          {entry}
        </section>
        {sheet}
      </>
    );
  }

  return (
    <>
      <Card
        title={h.experimentEntryTitle}
        meta={h.experimentEntryMeta}
        className="bf-labs"
      >
        {entry}
      </Card>
      {sheet}
    </>
  );
}
