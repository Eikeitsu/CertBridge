import { useState } from "react";
import { CERT_IMPORT_ACCEPT_ATTR } from "@/shared/config/certs";

type CertImportButtonProps = {
  disabled?: boolean;
  busy?: boolean;
  onImport: (file: File) => void | Promise<unknown>;
  label?: string;
  busyLabel?: string;
};

export function CertImportButton({
  disabled,
  busy = false,
  onImport,
  label = "导入 CA",
  busyLabel,
}: CertImportButtonProps) {
  const [importKey, setImportKey] = useState(0);
  const locked = Boolean(disabled || busy);
  const text = busy && busyLabel ? busyLabel : label;

  return (
    <label
      className={[
        "bf-btn",
        "bf-btn--primary",
        locked ? "is-disabled" : "",
        busy ? "bf-btn--busy" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        display: "inline-flex",
        opacity: locked && !busy ? 0.5 : busy ? 0.92 : 1,
      }}
      aria-busy={busy || undefined}
    >
      {busy ? <span className="bf-btn__spin" aria-hidden /> : null}
      {text}
      <input
        key={importKey}
        type="file"
        accept={CERT_IMPORT_ACCEPT_ATTR}
        hidden
        disabled={locked}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImport(file);
          setImportKey((value) => value + 1);
        }}
      />
    </label>
  );
}
