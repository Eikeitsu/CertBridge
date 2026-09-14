import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".bmp",
]);

const TEXT_EXT = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".txt",
  ".webmanifest",
  ".map",
  ".svg",
]);

function walk(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(join(dir, entry.name), rel));
    else files.push(rel);
  }
  return files;
}

function pruneEmptyDirs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = join(dir, entry.name);
    pruneEmptyDirs(child);
    if (readdirSync(child).length === 0) rmSync(child, { recursive: true });
  }
}

/**
 * 从已构建的 webroot 中删除未被 html/js/css 引用的静态图片。
 * 源码仓库里的 public 资源保留，仅裁剪进模块的产物。
 */
export function pruneUnusedWebImages(webroot, log = console.log) {
  const files = walk(webroot);
  const hasBundle = files.some(
    (rel) => rel === "index.html" || rel.endsWith(".js") || rel.endsWith(".css"),
  );
  if (!hasBundle) {
    log("skip image prune: webroot has no html/js/css");
    return { count: 0, bytes: 0 };
  }

  const corpus = files
    .filter((rel) => TEXT_EXT.has(extname(rel).toLowerCase()))
    .map((rel) => readFileSync(join(webroot, rel), "utf8"))
    .join("\n");

  let bytes = 0;
  let count = 0;
  for (const rel of files) {
    if (!IMAGE_EXT.has(extname(rel).toLowerCase())) continue;
    if (corpus.includes(rel) || corpus.includes(`./${rel}`)) continue;
    const abs = join(webroot, rel);
    bytes += statSync(abs).size;
    rmSync(abs);
    count += 1;
    log(`omit unused image: ${rel}`);
  }
  pruneEmptyDirs(webroot);
  log(`pruned ${count} unused images (${(bytes / 1024).toFixed(1)} KB)`);
  return { count, bytes };
}
