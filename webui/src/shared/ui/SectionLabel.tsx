type SectionLabelProps = {
  children: string;
};

export function SectionLabel({ children }: SectionLabelProps) {
  return <p className="bf-section-label">{children}</p>;
}
