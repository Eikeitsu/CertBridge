import { ChipList, EmptyHint, Panel } from "@/shared/ui";

type OverviewTrustProps = {
  names: string[];
};

export function OverviewTrust({ names }: OverviewTrustProps) {
  return (
    <Panel title="当前信任">
      {names.length ? (
        <ChipList items={names} />
      ) : (
        <EmptyHint>暂无附加证书。可在「证书」页启用或导入。</EmptyHint>
      )}
    </Panel>
  );
}
