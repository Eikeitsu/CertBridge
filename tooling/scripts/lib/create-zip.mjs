import { createWriteStream, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ZipFile } from "yazl";

function walk(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(join(dir, entry.name), rel));
    else files.push(rel);
  }
  return files;
}

function unixMode(rel) {
  const name = rel.split("/").pop() || "";
  if (name === "update-binary") return 0o100755;
  if (rel.endsWith(".sh")) return 0o100755;
  if (rel.startsWith("bin/openssl/") && name.startsWith("openssl-")) return 0o100755;
  return 0o100644;
}

/** 用 Node 打 zip，Windows / Linux 压缩级别与 Unix 权限一致。 */
export function createZipFromDir(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const zipfile = new ZipFile();
    zipfile.on("error", reject);
    for (const rel of walk(sourceDir)) {
      zipfile.addFile(join(sourceDir, rel), rel, {
        mode: unixMode(rel),
        compressionLevel: 9,
      });
    }
    zipfile.outputStream
      .pipe(createWriteStream(zipPath))
      .on("close", resolve)
      .on("error", reject);
    zipfile.end();
  });
}

/** 校验 zip 中央目录是否含必需条目（不依赖 unzip 命令）。 */
export function verifyZipHasEntries(zipPath, requiredNames) {
  const buf = readFileSync(zipPath);
  if (buf.length < 22) throw new Error("zip too small");
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip EOCD not found");
  const count = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOff = buf.readUInt32LE(eocd + 16);
  const names = new Set();
  let p = cdOff;
  const cdEnd = cdOff + cdSize;
  for (let i = 0; i < count; i++) {
    if (p + 46 > cdEnd || buf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error("zip central directory corrupt");
    }
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    names.add(name);
    p += 46 + nameLen + extraLen + commentLen;
  }
  const missing = requiredNames.filter((n) => !names.has(n));
  if (missing.length) {
    throw new Error(`zip missing required entries: ${missing.join(", ")}`);
  }
  return [...names];
}
