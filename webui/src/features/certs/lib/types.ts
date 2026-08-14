import type { DnAttributeKey } from "@/shared/config/certs";

export type CertDn = Partial<Record<DnAttributeKey, string>> & {
  extras: { label: string; value: string }[];
  raw: string;
};

export type DetailField = {
  label: string;
  value: string;
  copy?: string;
  mono?: boolean;
};

export type FormattedCertDetail = {
  displayName: string;
  filename: string;
  subject: CertDn;
  issuer: CertDn;
  isSelfSigned: boolean;
  isCa: boolean;
  notBeforeLabel: string;
  notAfterLabel: string;
  isExpired: boolean;
  daysLeft?: number;
  validityProgress?: number;
  flags: string[];
  identity: DetailField[];
  validity: DetailField[];
  crypto: DetailField[];
  extensions: DetailField[];
  fingerprints: DetailField[];
  extras: DetailField[];
};
