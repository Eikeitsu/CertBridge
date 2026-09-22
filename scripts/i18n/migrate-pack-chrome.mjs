import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const files = walk("webui/src/packs");
for (const file of files) {
  let c = readFileSync(file, "utf8");
  const orig = c;

  c = c.replace(
    /import \{ DEFAULT_VOICE \} from ["']\.\/voice["'];?\r?\n/,
    'import { usePackChrome } from "@/features/theme/hooks/usePackChrome";\n',
  );
  c = c.replace(
    /import \{ DEFAULT_VOICE \} from ["']\.\.\/voice["'];?\r?\n/,
    'import { usePackChrome } from "@/features/theme/hooks/usePackChrome";\n',
  );
  c = c.replace(
    /import \{ OPS_VOICE \} from ["']\.\/voice["'];?\r?\n/,
    'import { usePackChrome } from "@/features/theme/hooks/usePackChrome";\n',
  );
  c = c.replace(
    /import \{ OPS_VOICE \} from ["']\.\.\/voice["'];?\r?\n/,
    'import { usePackChrome } from "@/features/theme/hooks/usePackChrome";\n',
  );
  c = c.replace(
    /import \{ CONSOLE_VOICE \} from ["']\.\/voice["'];?\r?\n/,
    'import { usePackChrome } from "@/features/theme/hooks/usePackChrome";\n',
  );
  c = c.replace(
    /import \{ CONSOLE_VOICE \} from ["']\.\.\/voice["'];?\r?\n/,
    'import { usePackChrome } from "@/features/theme/hooks/usePackChrome";\n',
  );

  if (
    /DEFAULT_VOICE|OPS_VOICE|CONSOLE_VOICE/.test(c) &&
    !/usePackChrome\(\)/.test(c)
  ) {
    c = c.replace(
      /(export function \w+\([^)]*\) \{\n)/,
      "$1  const chrome = usePackChrome();\n",
    );
  }

  c = c.replace(/const v = DEFAULT_VOICE;/g, "const v = chrome;");
  c = c.replace(/const v = OPS_VOICE;/g, "const v = chrome;");
  c = c.replace(/const v = CONSOLE_VOICE;/g, "const v = chrome;");
  c = c.replace(/const v = DEFAULT_VOICE\.(\w+);/g, "const v = chrome.$1;");
  c = c.replace(/const v = OPS_VOICE\.(\w+);/g, "const v = chrome.$1;");
  c = c.replace(/const v = CONSOLE_VOICE\.(\w+);/g, "const v = chrome.$1;");
  c = c.replace(/DEFAULT_VOICE\./g, "chrome.");
  c = c.replace(/OPS_VOICE\./g, "chrome.");
  c = c.replace(/CONSOLE_VOICE\./g, "chrome.");

  c = c.replace(
    /const stabilizing =\n    overview\.trust\.tone === TrustTone\.Idle &&\n    \/[^/\n]+\/\.test\(overview\.trust\.title\);/g,
    `const title = overview.trust.title || "";
  const stabilizing =
    overview.trust.tone === TrustTone.Idle &&
    (/Stable|Inject|Check|Boot|Pending/.test(title) ||
      title.includes("\\u2728") ||
      title.includes("\\u{1F50D}"));`,
  );

  if (c !== orig) {
    writeFileSync(file, c, "utf8");
    console.log("updated", file);
  }
}
