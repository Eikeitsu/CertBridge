import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { CERT_EXPIRY_WARN_DAYS, CERT_INFO_KEYS, MS_PER_DAY } from "@/shared/config/certs";
import type { DetailField, FormattedCertDetail } from "./types";
import { parseRfc2253 } from "./parseDn";
import { formatDateLabel, parseOpenSslDate } from "./parseOpenSslDate";
import { formatFingerprint } from "./formatFingerprint";

export type { CertDn, DetailField, FormattedCertDetail } from "./types";
export { parseRfc2253 } from "./parseDn";
export { formatFingerprint } from "./formatFingerprint";

const KNOWN_KEYS = new Set<string>(CERT_INFO_KEYS);

function field(
  label: string,
  value: string | undefined,
  opts?: { mono?: boolean; copy?: string },
): DetailField | null {
  const text = (value || "").trim();
  if (!text) return null;
  return {
    label,
    value: text,
    mono: opts?.mono,
    copy: opts?.copy || text,
  };
}

function compact(fields: Array<DetailField | null>): DetailField[] {
  return fields.filter((item): item is DetailField => Boolean(item));
}

export function formatCertDetail(
  fields: Record<string, string>,
  fallbackTitle: string,
): FormattedCertDetail | null {
  if (fields.error && fields.ok !== FLAG_ON) return null;
  if (!fields.ok && !fields.subject && !fields.display_name) return null;

  const subject = parseRfc2253(fields.subject || "");
  const issuer = parseRfc2253(fields.issuer || "");
  const sha256 = formatFingerprint(fields.fingerprint_sha256 || "");
  const sha1 = formatFingerprint(fields.fingerprint_sha1 || "");
  const notAfter = parseOpenSslDate(fields.not_after || "");
  const notBefore = parseOpenSslDate(fields.not_before || "");
  const now = Date.now();
  const isExpired = Boolean(notAfter && notAfter.getTime() < now);
  const daysLeft =
    notAfter && !isExpired
      ? Math.max(0, Math.ceil((notAfter.getTime() - now) / MS_PER_DAY))
      : undefined;
  let validityProgress: number | undefined;
  if (notBefore && notAfter && notAfter.getTime() > notBefore.getTime()) {
    const total = notAfter.getTime() - notBefore.getTime();
    validityProgress = Math.min(
      100,
      Math.max(0, ((now - notBefore.getTime()) / total) * 100),
    );
  }
  const isSelfSigned =
    fields.self_signed === FLAG_ON ||
    (Boolean(fields.subject && fields.issuer) &&
      fields.subject.trim() === fields.issuer.trim());
  const isCa = fields.ca === FLAG_ON;

  const flags: string[] = [];
  if (isCa) flags.push("CA");
  if (isSelfSigned) flags.push("自签发");
  if (isExpired) flags.push("已过期");
  else if (daysLeft != null && daysLeft <= CERT_EXPIRY_WARN_DAYS) {
    flags.push("即将到期");
  }
  if (fields.pathlen) flags.push(`pathlen ${fields.pathlen}`);

  const extras = Object.entries(fields)
    .filter(([key, value]) => value && !KNOWN_KEYS.has(key))
    .map(([key, value]) => ({
      label: key,
      value,
      mono: true,
      copy: value,
    }));

  return {
    displayName: fields.display_name || subject.cn || fallbackTitle || "CA 证书",
    filename: fields.filename || "",
    subject,
    issuer,
    isSelfSigned,
    isCa,
    notBeforeLabel: formatDateLabel(fields.not_before || ""),
    notAfterLabel: formatDateLabel(fields.not_after || ""),
    isExpired,
    daysLeft,
    validityProgress,
    flags,
    identity: compact([
      field("文件名", fields.filename, { mono: true }),
      field("序列号", fields.serial, { mono: true }),
      field("版本", fields.version ? `X.509 v${fields.version}` : undefined),
    ]),
    validity: compact([
      field("起始", formatDateLabel(fields.not_before || ""), {
        copy: fields.not_before,
      }),
      field("截止", formatDateLabel(fields.not_after || ""), { copy: fields.not_after }),
      field(
        "剩余",
        isExpired ? "已过期" : daysLeft != null ? `${daysLeft} 天` : undefined,
      ),
    ]),
    crypto: compact([
      field("签名算法", fields.sig_alg),
      field(
        "公钥",
        fields.pubkey_alg
          ? `${fields.pubkey_alg}${fields.pubkey_bits ? ` · ${fields.pubkey_bits} bit` : ""}`
          : undefined,
      ),
    ]),
    extensions: compact([
      field(
        "基本约束",
        fields.ca === FLAG_ON
          ? "CA:TRUE"
          : fields.ca === FLAG_OFF
            ? "CA:FALSE"
            : undefined,
      ),
      field("路径长度", fields.pathlen),
      field("密钥用法", fields.key_usage),
      field("扩展密钥用法", fields.ext_key_usage),
      field("SAN", fields.san),
      field("主体密钥标识", fields.ski, { mono: true }),
      field("颁发者密钥标识", fields.aki, { mono: true }),
    ]),
    fingerprints: compact([
      field("SHA-256", sha256.display, { mono: true, copy: sha256.compact }),
      field("SHA-1", sha1.display, { mono: true, copy: sha1.compact }),
      field("subject hash", fields.hash, { mono: true }),
    ]),
    extras,
  };
}
