#!/usr/bin/env node
/**
 * Flatten locales/{lang}/{ns}.json → module/bin/i18n/{lang}.sh
 * Keys become MSG_<NS>_<FLAT_KEY> with dots/ nested paths as __.
 * Placeholders {{name}} stay as-is for i18n_fmt.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCALES = join(ROOT, "locales");
const OUT_DIR = join(ROOT, "module/bin/i18n");
const SHELL_NS = ["common", "install", "status", "errors"];

function flatten(obj, prefix = "", out = {}) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    out[prefix] = String(obj ?? "");
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = String(v ?? "");
  }
  return out;
}

function shellEscape(s) {
  return `'${String(s).replace(/'/g, `'\"'\"'`)}'`;
}

function msgVar(ns, flatKey) {
  const body = `${ns}_${flatKey}`.replace(/[^a-zA-Z0-9]+/g, "_").replace(/_+/g, "_");
  return `MSG_${body}`.replace(/_$/, "");
}

function generateLang(lang) {
  const dir = join(LOCALES, lang);
  if (!existsSync(dir)) throw new Error(`missing locales/${lang}`);
  const lines = [
    "#!/system/bin/sh",
    `# Generated from locales/${lang} — do not edit`,
    `CB_I18N_LANG=${shellEscape(lang)}`,
  ];
  for (const ns of SHELL_NS) {
    const path = join(dir, `${ns}.json`);
    if (!existsSync(path)) continue;
    const data = JSON.parse(readFileSync(path, "utf8"));
    const flat = flatten(data);
    for (const [k, v] of Object.entries(flat).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`${msgVar(ns, k)}=${shellEscape(v)}`);
    }
  }
  lines.push("");
  mkdirSync(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `${lang}.sh`);
  writeFileSync(out, lines.join("\n"), "utf8");
  console.log(`i18n: wrote ${out}`);
}

const langs = readdirSync(LOCALES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
if (!langs.length) throw new Error("no locales/* directories");
for (const lang of langs) generateLang(lang);
