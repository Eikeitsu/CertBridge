type SectionLabelProps = {
  children: string;
};

export function SectionLabel({ children }: SectionLabelProps) {
  return <p className="cb-section-label">{children}</p>;
}
