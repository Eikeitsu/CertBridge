import i18n from "@/shared/i18n";

/** 将内部错误码转成用户可读文案，避免暴露环境细节 */
export function friendlyError(code?: string): string {
  const errorCode = String(code || "")
    .trim()
    .split(/\s+/)[0];
  if (!errorCode) return i18n.t("default", { ns: "errors" });
  if (i18n.exists(errorCode, { ns: "errors" })) {
    return i18n.t(errorCode, { ns: "errors" });
  }
  return errorCode;
}

export function errorFromResult(stdout: string, stderr: string): string {
  const combined = `${stdout || ""}\n${stderr || ""}`;
  const fields = Object.fromEntries(
    combined
      .split("\n")
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return separatorIndex > 0
          ? ([
              line.slice(0, separatorIndex).trim(),
              line.slice(separatorIndex + 1).trim(),
            ] as const)
          : null;
      })
      .filter(Boolean) as [string, string][],
  );
  if (fields.error) return friendlyError(fields.error);
  // stderr 可能是 shell 噪音，只取首行短码
  const stderrCode = String(stderr || "")
    .trim()
    .split(/\s+/)[0];
  return friendlyError(stderrCode || "failed");
}
