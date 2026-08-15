import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { PullToRefresh } from "antd-mobile";

/* ── atoms ─────────────────────────────────────────── */

export function NxSection({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="nx-section">
      {(eyebrow || title || action) && (
        <header className="nx-section__head">
          <div className="nx-section__titles">
            {eyebrow ? <p className="nx-section__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="nx-section__title">{title}</h2> : null}
          </div>
          {action ? <div className="nx-section__action">{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

export function NxCard({
  children,
  className = "",
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: "plain" | "accent" | "danger" | "ok";
}) {
  return (
    <div className={`nx-card${tone ? ` tone-${tone}` : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function NxButton({
  children,
  onClick,
  variant = "solid",
  tone = "primary",
  block,
  disabled,
  loading,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "soft" | "ghost" | "outline";
  tone?: "primary" | "neutral" | "danger";
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`nx-btn variant-${variant} tone-${tone}${block ? " is-block" : ""}${
        loading ? " is-loading" : ""
      }`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function NxSwitch({
  checked,
  onChange,
  disabled,
  loading,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`nx-switch${checked ? " is-on" : ""}${loading ? " is-loading" : ""}`}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
    >
      <span className="nx-switch__knob" />
    </button>
  );
}

export function NxSegment<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`nx-segment${disabled ? " is-disabled" : ""}`} role="tablist">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={on}
            className={`nx-segment__item${on ? " is-on" : ""}`}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function NxChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info" | "accent";
}) {
  return <span className={`nx-chip tone-${tone}`}>{children}</span>;
}

export function NxEmpty({ children }: { children: ReactNode }) {
  return <p className="nx-empty">{children}</p>;
}

export function NxToggleRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="nx-toggle-row">
      <div className="nx-toggle-row__copy">
        <p className="nx-toggle-row__label">{label}</p>
        {description ? <p className="nx-toggle-row__desc">{description}</p> : null}
      </div>
      <div className="nx-toggle-row__control">{children}</div>
    </div>
  );
}

export function NxChoiceCard<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; title: string; body: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="nx-choice-grid">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`nx-choice${on ? " is-on" : ""}`}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            <span className="nx-choice__mark" aria-hidden />
            <strong>{option.title}</strong>
            <span>{option.body}</span>
          </button>
        );
      })}
    </div>
  );
}

export function NxSlider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <label className="nx-slider">
      {label ? <span className="nx-slider__label">{label}</span> : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function NxCollapse({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`nx-collapse${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="nx-collapse__trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <span className="nx-collapse__chev" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? <div className="nx-collapse__body">{children}</div> : null}
    </div>
  );
}

export function NxSpin({
  spinning,
  label = "加载中",
  children,
}: {
  spinning: boolean;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className={`nx-spin${spinning ? " is-on" : ""}`}>
      {children}
      {spinning ? (
        <div className="nx-spin__mask" role="status" aria-live="polite">
          <div className="nx-spinner" aria-hidden />
          <span>{label}</span>
        </div>
      ) : null}
    </div>
  );
}

export function NxPull({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}) {
  return (
    <PullToRefresh
      onRefresh={async () => {
        await onRefresh();
      }}
    >
      {children}
    </PullToRefresh>
  );
}

export function NxField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="nx-field">
      <span className="nx-field__label">{label}</span>
      {children}
    </label>
  );
}

export function NxInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="nx-input" {...props} />;
}

export function NxSheet({
  open,
  onClose,
  title,
  loading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  loading?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="nx-sheet" role="presentation">
      <button
        type="button"
        className="nx-sheet__mask"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="nx-sheet__panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="nx-sheet__handle" aria-hidden />
        <header className="nx-sheet__bar">
          <h2>{title}</h2>
          <button
            type="button"
            className="nx-sheet__close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </header>
        <div className="nx-sheet__scroll">
          {loading ? (
            <div className="nx-spin__mask is-embedded">
              <div className="nx-spinner" aria-hidden />
              <span>正在解析证书</span>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function NxFilePick({
  accept,
  onPick,
  children,
}: {
  accept: string;
  onPick: (file: File) => void;
  children: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  return (
    <>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        className="nx-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <NxButton variant="soft" onClick={() => inputRef.current?.click()}>
        {children}
      </NxButton>
    </>
  );
}

export function NxHero({
  tone,
  kicker,
  title,
  description,
  badges,
  aside,
  footer,
  style,
}: {
  tone: string;
  kicker: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section className={`nx-hero tone-${tone}`} style={style}>
      <div className="nx-hero__glow" aria-hidden />
      <div className="nx-hero__row">
        <div className="nx-hero__main">
          <p className="nx-hero__kicker">
            <i className="nx-hero__dot" aria-hidden />
            {kicker}
          </p>
          <h2 className="nx-hero__title">{title}</h2>
          {description ? <p className="nx-hero__desc">{description}</p> : null}
          {badges ? <div className="nx-hero__badges">{badges}</div> : null}
        </div>
        {aside ? <div className="nx-hero__aside">{aside}</div> : null}
      </div>
      {footer ? <div className="nx-hero__foot">{footer}</div> : null}
    </section>
  );
}

export function NxMetrics({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="nx-metrics">
      {items.map((item) => (
        <div key={item.label} className="nx-metric">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function NxActionTile({
  title,
  hint,
  onClick,
  tone = "neutral",
}: {
  title: string;
  hint: string;
  onClick: () => void;
  tone?: "neutral" | "danger" | "accent";
}) {
  return (
    <button type="button" className={`nx-action-tile tone-${tone}`} onClick={onClick}>
      <strong>{title}</strong>
      <span>{hint}</span>
    </button>
  );
}

export function NxCopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <button type="button" className="nx-copy-row" onClick={onCopy}>
      <span className="nx-copy-row__label">{label}</span>
      <span className="nx-copy-row__value">{value}</span>
    </button>
  );
}
