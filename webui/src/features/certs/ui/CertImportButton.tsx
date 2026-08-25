import { useState } from "react";
import { CERT_IMPORT_ACCEPT } from "@/shared/config/certs";

type CertImportButtonProps = {
  disabled?: boolean;
  onImport: (file: File) => void | Promise<unknown>;
  label?: string;
};

export function CertImportButton({
  disabled,
  onImport,
  label = "导入 CA",
}: CertImportButtonProps) {
  const [importKey, setImportKey] = useState(0);

  return (
    <label
      className={`cb-btn cb-btn--primary${disabled ? " is-disabled" : ""}`}
      style={{ display: "inline-block", opacity: disabled ? 0.5 : 1 }}
    >
      {label}
      <input
        key={importKey}
        type="file"
        accept={CERT_IMPORT_ACCEPT.join(",")}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImport(file);
          setImportKey((value) => value + 1);
        }}
      />
    </label>
  );
}
