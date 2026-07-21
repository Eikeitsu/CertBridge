const CAS_RESERVED = [
  "CAS",
  "CasApi",
  "CasUi",
  "CasApp",
  "CasTheme",
  "CasNav",
  "ksu",
  "exec",
  "toast",
];

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  cpSync,
} from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { minify as minifyHtml } from "html-minifier-terser";
import CleanCSS from "clean-css";
import { minify as minifyJs } from "terser";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const srcDir = join(repoRoot, "module", "webroot");
const outDir = join(repoRoot, ".build", "webroot");

function log(msg) {
  console.log(`[build-web] ${msg}`);
}

async function minifyJavaScript(code, filename) {
  const result = await minifyJs(code, {
    module: false,
    compress: { passes: 2, drop_console: false },
    mangle: { toplevel: false, reserved: CAS_RESERVED },
    format: { comments: false },
  });
  if (!result.code) throw new Error(`terser failed: ${filename}`);
  return result.code;
}

async function buildFile(relPath) {
  const src = join(srcDir, relPath);
  const dest = join(outDir, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  const lower = relPath.toLowerCase();

  if (lower.endsWith(".html")) {
    const html = await minifyHtml(readFileSync(src, "utf8"), {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      minifyCSS: true,
      minifyJS: false,
      keepClosingSlash: true,
    });
    writeFileSync(dest, html, "utf8");
    return;
  }

  if (lower.endsWith(".css")) {
    const css = new CleanCSS({ level: 2, inline: false }).minify(
      readFileSync(src, "utf8"),
    );
    if (css.errors.length) throw new Error(css.errors.join("\n"));
    writeFileSync(dest, css.styles, "utf8");
    return;
  }

  if (lower.endsWith(".js")) {
    writeFileSync(
      dest,
      await minifyJavaScript(readFileSync(src, "utf8"), relPath),
      "utf8",
    );
    return;
  }

  cpSync(src, dest);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(relative(srcDir, full).replace(/\\/g, "/"));
  }
  return files;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const file of walk(srcDir)) {
  await buildFile(file);
  log(`built ${file}`);
}
log(`output -> ${outDir}`);
