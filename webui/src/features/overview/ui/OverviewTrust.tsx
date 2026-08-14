import { ChipList, EmptyHint, Panel } from "@/shared/ui";

type OverviewTrustProps = {
  title: string;
  emptyText: string;
  names: string[];
};

export function OverviewTrust({ title, emptyText, names }: OverviewTrustProps) {
  return (
    <Panel title={title}>
      {names.length ? <ChipList items={names} /> : <EmptyHint>{emptyText}</EmptyHint>}
    </Panel>
  );
}
