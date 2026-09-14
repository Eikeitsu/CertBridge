import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Card({
  title,
  meta,
  children,
  className = "",
}: PropsWithChildren<{ title?: string; meta?: string; className?: string }>) {
  return (
    <section className={`cb-card ${className}`.trim()}>
      {title ? <h3 className="cb-card__title">{title}</h3> : null}
      {meta ? <p className="cb-card__meta">{meta}</p> : null}
      {children}
    </section>
  );
}

export function ListGroup({ label, children }: PropsWithChildren<{ label?: string }>) {
  return (
    <div>
      {label ? <div className="cb-list__label">{label}</div> : null}
      <div className="cb-list">{children}</div>
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
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className="cb-row"
      onClick={onClick}
      style={
        onClick ? { width: "100%", textAlign: "left", cursor: "pointer" } : undefined
      }
    >
      <div className="cb-row__main">
        {title ? <div className="cb-row__title">{title}</div> : null}
        {desc ? <div className="cb-row__desc">{desc}</div> : null}
        {children}
      </div>
      {extra ? <div className="cb-row__extra">{extra}</div> : null}
    </Tag>
  );
}

export function Tag({
  tone = "default",
  children,
}: PropsWithChildren<{ tone?: "default" | "ok" | "warn" | "bad" }>) {
  return (
    <span className={`cb-tag${tone !== "default" ? ` cb-tag--${tone}` : ""}`}>
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
      className={`cb-btn${variant === "primary" ? " cb-btn--primary" : ""}${variant === "ghost" ? " cb-btn--ghost" : ""} ${className}`.trim()}
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
      className={`cb-switch${checked ? " is-on" : ""}`}
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
    <div className="cb-segment">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          className={`cb-segment__option${value === option.value ? " is-on" : ""}`}
          onClick={() => onChange(option.value)}
        >
          <div className="cb-segment__label">{option.label}</div>
          {option.hint ? <div className="cb-segment__hint">{option.hint}</div> : null}
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
      className={`cb-notice${tone === "alert" ? " cb-notice--alert" : ""}${tone === "error" ? " cb-notice--error" : ""}`}
    >
      {children}
    </div>
  );
}

export function Loader({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="cb-loader">
      <div className="cb-loader__spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
