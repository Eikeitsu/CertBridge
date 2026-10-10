import type { ReactNode } from "react";
import { Card, Notice } from "@/shared/ui/primitives";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { useZnHideAllow } from "../hooks/useZnHideAllow";
import { useZnFilterMode } from "../hooks/useZnFilterMode";
import { HideAllowRow } from "./HideAllowRow";
import { ZnFilterModeRow } from "./ZnFilterModeRow";
import { ZnFilterListEditor } from "./ZnFilterListEditor";

type ZnFilterBlockProps = {
  /** default | ops | card(features) | console */
  variant?: "card" | "section" | "ops" | "console";
  large?: boolean;
  listRows?: number;
  /** ops 等包可不展示名单 hint */
  listHint?: string | false;
  /** 额外警告插槽（覆盖默认 loader 提示） */
  loaderWarn?: ReactNode;
};

/**
 * Zygisk 过滤整块：总开关 + 过滤≠umount 提示 + 名单模式 + 名单编辑。
 */
export function ZnFilterBlock({
  variant = "card",
  large,
  listRows = 5,
  listHint,
  loaderWarn,
}: ZnFilterBlockProps) {
  const zn = useZnHideAllow();
  const znMode = useZnFilterMode();
  const status = useAppSelector(selectModuleStatus);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const loaderOk = isFlagOn(status.zygisk_loader_ok);

  if (!zn.znHideSupported) return null;

  const defaultLoaderWarn =
    loaderWarn !== undefined ? (
      loaderWarn
    ) : !loaderOk ? (
      variant === "ops" ? (
        <div className="pk-ops-alert">{h.loaderWarnBody}</div>
      ) : variant === "section" ? (
        <div className="pk-def-banner is-warn">
          <strong>{h.loaderWarnTitle}</strong>
          <div>{h.loaderWarnBody}</div>
        </div>
      ) : (
        <Notice tone="alert">
          <strong>{h.loaderWarnTitle}</strong>
          <div>{h.loaderWarnBody}</div>
        </Notice>
      )
    ) : null;

  const body = (
    <div className="bf-zn-filter__body">
      <HideAllowRow
        checked={zn.znHideAllow}
        disabled={zn.isPending}
        onChange={zn.handleChange}
        title={h.znAllowTitle}
        descOn={h.znAllowOn}
        descOff={h.znAllowOff}
        large={large}
      />
      <div className="bf-zn-filter__tip">
        <div className="bf-zn-filter__tip-title">{h.filterVsUmountTitle}</div>
        <div className="bf-zn-filter__tip-body">{h.filterVsUmountBody}</div>
      </div>
      {defaultLoaderWarn}
      {zn.znHideAllow ? (
        <div className="bf-zn-filter__mode">
          <ZnFilterModeRow
            mode={znMode.mode}
            disabled={znMode.isPending}
            onChange={znMode.handleChange}
          />
        </div>
      ) : null}
    </div>
  );

  const resolvedHint =
    listHint === false
      ? ""
      : listHint !== undefined
        ? listHint
        : znMode.mode === "whitelist"
          ? h.whitelistHint
          : h.blacklistHint;

  const editor = zn.znHideAllow ? (
    <ZnFilterListEditor
      listKind={znMode.mode === "whitelist" ? "whitelist" : "blacklist"}
      saveLabel={h.whitelistSave}
      rows={listRows}
      hint={resolvedHint}
    />
  ) : null;

  if (variant === "section") {
    return (
      <>
        <section className="pk-def-section bf-zn-filter">
          <h2 className="pk-def-section__title">{h.znSwitchTitle}</h2>
          {h.znSwitchMeta ? (
            <p className="pk-def-muted pk-def-muted--tight">{h.znSwitchMeta}</p>
          ) : null}
          <div className="pk-def-group">{body}</div>
        </section>
        {editor}
      </>
    );
  }

  if (variant === "ops") {
    return (
      <>
        <section className="pk-ops-panel bf-zn-filter">
          <h2 className="pk-ops-panel__title">{h.znSwitchTitle}</h2>
          {h.znSwitchMeta ? <p className="pk-ops-empty">{h.znSwitchMeta}</p> : null}
          {body}
        </section>
        {editor}
      </>
    );
  }

  if (variant === "console") {
    return (
      <>
        <section className="pk-con-block bf-zn-filter">
          <div className="pk-con-block__head">{h.znSwitchTitle}</div>
          {body}
        </section>
        {editor}
      </>
    );
  }

  return (
    <>
      <Card title={h.znSwitchTitle} meta={h.znSwitchMeta} className="bf-zn-filter">
        {body}
      </Card>
      {editor}
    </>
  );
}
