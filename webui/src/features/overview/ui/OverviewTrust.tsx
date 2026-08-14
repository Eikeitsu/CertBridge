import { ChipList, EmptyHint, SectionLabel } from "@/shared/ui";

type OverviewTrustProps = {
  title: string;
  emptyText: string;
  names: string[];
};

export function OverviewTrust({ title, emptyText, names }: OverviewTrustProps) {
  return (
    <section className="cb-trust-block">
      <SectionLabel>{title}</SectionLabel>
      <div className="cb-trust-block__body">
        {names.length ? <ChipList items={names} /> : <EmptyHint>{emptyText}</EmptyHint>}
      </div>
    </section>
  );
}
