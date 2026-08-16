import { Button, List, Space, Switch, Tag } from "antd-mobile";
import { FlagTone, type BuiltinCertKind } from "@/entities/module/enums";
import { ListGroup } from "@/shared/ui/ListGroup";
import { useBuiltinCerts } from "../hooks/useBuiltinCerts";
import { resolveBuiltinFlags, resolveBuiltinSubtitle } from "../lib/builtin";
import { CertBrandIcon } from "./CertBrandIcon";

type BuiltinCertsGroupProps = {
  title: string;
  pendingKind?: string | null;
  onOpenDetail: (id: string, title: string) => void;
  onToggle: (kind: BuiltinCertKind, checked: boolean) => void;
};

function flagColor(tone: FlagTone): "success" | "warning" | "primary" {
  if (tone === FlagTone.Ok) return "success";
  if (tone === FlagTone.Warn) return "warning";
  return "primary";
}

export function BuiltinCertsGroup({
  title,
  pendingKind,
  onOpenDetail,
  onToggle,
}: BuiltinCertsGroupProps) {
  const builtinCerts = useBuiltinCerts();

  return (
    <ListGroup title={title}>
      {builtinCerts.map((item) => {
        const canInspect = item.isAvailable || item.isActive;
        const canToggle = item.isAvailable || item.isActive || item.isEnabled;
        const flags = resolveBuiltinFlags(item);
        return (
          <List.Item
            key={item.kind}
            prefix={<CertBrandIcon kind={item.kind} />}
            description={
              <div className="cb-list-row__meta">
                <span className="cb-list-row__sub">{resolveBuiltinSubtitle(item)}</span>
                {flags.length ? (
                  <Space wrap>
                    {flags.map((flag) => (
                      <Tag key={flag.label} color={flagColor(flag.tone)} fill="outline" round>
                        {flag.label}
                      </Tag>
                    ))}
                  </Space>
                ) : null}
              </div>
            }
            extra={
              <Space align="center">
                <Switch
                  checked={item.isEnabled}
                  loading={pendingKind === item.kind}
                  disabled={!canToggle || Boolean(pendingKind && pendingKind !== item.kind)}
                  onChange={(checked) => onToggle(item.kind, checked)}
                />
                <Button
                  size="mini"
                  fill="none"
                  disabled={!canInspect}
                  onClick={() => onOpenDetail(item.kind, item.title)}
                >
                  详情
                </Button>
              </Space>
            }
          >
            {item.title}
          </List.Item>
        );
      })}
    </ListGroup>
  );
}
