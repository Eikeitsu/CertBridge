import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Card({
  title,
  meta,
  children,
  className = "",
}: PropsWithChildren<{ title?: string; meta?: string; className?: string }>) {
  return (
    <section className={`bf-card ${className}`.trim()}>
      {title ? <h3 className="bf-card__title">{title}</h3> : null}
      {meta ? <p className="bf-card__meta">{meta}</p> : null}
      {children}
    </section>
  );
}

export function ListGroup({ label, children }: PropsWithChildren<{ label?: string }>) {
  return (
    <div>
      {label ? <div className="bf-list__label">{label}</div> : null}
      <div className="bf-list">{children}</div>
    </div>
  );
}

export function Row({
  title,
  desc,
  extra,
  onClick,
  children,
}: PropsWithChildren<{
  title?: ReactNode;
  desc?: ReactNode;
  extra?: ReactNode;
  onClick?: () => void;
}>) {
  const Element = onClick ? "button" : "div";
  return (
    <Element
      type={onClick ? "button" : undefined}
      className="bf-row"
      onClick={onClick}
      style={
        onClick ? { width: "100%", textAlign: "left", cursor: "pointer" } : undefined
      }
    >
      <div className="bf-row__main">
        {title ? <div className="bf-row__title">{title}</div> : null}
        {desc ? <div className="bf-row__desc">{desc}</div> : null}
        {children}
      </div>
      {extra ? <div className="bf-row__extra">{extra}</div> : null}
    </Element>
  );
}

export function Tag({
  tone = "default",
  children,
}: PropsWithChildren<{ tone?: "default" | "ok" | "warn" | "bad" }>) {
  return (
    <span className={`bf-tag${tone !== "default" ? ` bf-tag--${tone}` : ""}`}>
      {children}
    </span>
  );
}

export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost";
}) {
  return (
    <button
      type="button"
      className={`bf-btn${variant === "primary" ? " bf-btn--primary" : ""}${variant === "ghost" ? " bf-btn--ghost" : ""} ${className}`.trim()}
      {...props}
    />
  );
}

export function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`bf-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Segment({
  options,
  value,
  disabled,
  onChange,
}: {
  options: { value: string; label: string; hint?: string }[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="bf-segment">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          className={`bf-segment__option${value === option.value ? " is-on" : ""}`}
          onClick={() => onChange(option.value)}
        >
          <div className="bf-segment__label">{option.label}</div>
          {option.hint ? <div className="bf-segment__hint">{option.hint}</div> : null}
        </button>
      ))}
    </div>
  );
}

export function Notice({
  tone = "default",
  children,
}: PropsWithChildren<{ tone?: "default" | "alert" | "error" }>) {
  return (
    <div
      className={`bf-notice${tone === "alert" ? " bf-notice--alert" : ""}${tone === "error" ? " bf-notice--error" : ""}`}
    >
      {children}
    </div>
  );
}

export function Loader({ label = "???…" }: { label?: string }) {
  return (
    <div className="bf-loader">
      <div className="bf-loader__spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
