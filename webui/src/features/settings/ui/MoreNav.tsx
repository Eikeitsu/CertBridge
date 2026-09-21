import type { ReactNode } from "react";

type MoreNavRowProps = {
  title: string;
  desc?: string;
  onClick: () => void;
  extra?: ReactNode;
};

/** 更多页进入二级的行 */
export function MoreNavRow({ title, desc, onClick, extra }: MoreNavRowProps) {
  return (
    <button type="button" className="bf-more-nav" onClick={onClick}>
      <span className="bf-more-nav__text">
        <strong>{title}</strong>
        {desc ? <span>{desc}</span> : null}
      </span>
      {extra}
      <span className="bf-more-nav__chev" aria-hidden />
    </button>
  );
}

type MoreSubHeaderProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
};

export function MoreSubHeader({ title, onBack, backLabel = "更多" }: MoreSubHeaderProps) {
  return (
    <div className="bf-more-subhead">
      <button type="button" className="bf-more-back" onClick={onBack}>
        <span className="bf-more-back__chev" aria-hidden />
        {backLabel}
      </button>
      <h2 className="bf-more-subhead__title">{title}</h2>
    </div>
  );
}
