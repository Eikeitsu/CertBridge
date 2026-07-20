#!/usr/bin/env node
import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const moduleRoot = join(repoRoot, 'module');
const staging = join(repoRoot, '.build', 'staging');
const releaseDir = join(repoRoot, 'release');
const builtWebDir = join(repoRoot, '.build', 'webroot');

const ROOT_FILES = [
  'module.prop',
  'post-fs-data.sh',
  'service.sh',
  'customize.sh',
  'action.sh',
  'uninstall.sh'
];

function log(message) {
  console.log(`[package-module] ${message}`);
}

function readVersion() {
  const prop = readFileSync(join(moduleRoot, 'module.prop'), 'utf8');
  return prop.match(/^version=(.+)$/m)?.[1]?.trim() || 'unknown';
}

function copyFromModule(relPath) {
  const source = join(moduleRoot, relPath);
  const target = join(staging, relPath);
  if (!existsSync(source)) {
    log(`skip missing: ${relPath}`);
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function copyDirFromModule(relPath) {
  const source = join(moduleRoot, relPath);
  if (!existsSync(source)) return;
  mkdirSync(join(staging, relPath), { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const child = join(relPath, entry.name);
    if (entry.isDirectory()) copyDirFromModule(child);
    else copyFromModule(child);
  }
}

function createZip(zipPath) {
  if (process.platform === 'win32') {
    const escapedZip = zipPath.replace(/'/g, "''");
    const escapedStaging = staging.replace(/'/g, "''");
    const ps = [
      `$staging = '${escapedStaging}'`,
      `$zip = '${escapedZip}'`,
      'if (Test-Path $zip) { Remove-Item $zip -Force }',
      'Push-Location $staging',
      'Compress-Archive -Path * -DestinationPath $zip -Force',
      'Pop-Location'
    ].join('; ');
    execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'inherit' });
    return;
  }
  execSync(`cd "${staging}" && zip -qr9 "${zipPath}" .`, { stdio: 'inherit' });
}

const version = readVersion();
const zipName = `CACertStore_${version}.zip`;
const zipPath = join(releaseDir, zipName);

rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
mkdirSync(releaseDir, { recursive: true });
mkdirSync(join(staging, 'data'), { recursive: true });
writeFileSync(join(staging, 'data', '.keep'), '');

for (const file of ROOT_FILES) copyFromModule(file);
copyDirFromModule('META-INF');
copyDirFromModule('config');
copyDirFromModule('bin');
copyDirFromModule('certs');
copyDirFromModule('system');

// 打包时同步内置证书到挂载目录，保证刷入后立即可用
const stagingCacerts = join(staging, 'system', 'etc', 'security', 'cacerts');
mkdirSync(stagingCacerts, { recursive: true });
const builtinPairs = [
  ['certs/builtin/reqable/833e2479.0', '833e2479.0'],
  ['certs/builtin/proxypin/243f0bfb.0', '243f0bfb.0']
];
for (const [srcRel, name] of builtinPairs) {
  const src = join(moduleRoot, srcRel);
  if (existsSync(src)) cpSync(src, join(stagingCacerts, name));
}

if (!existsSync(builtWebDir)) {
  throw new Error('missing .build/webroot — run npm run build:web first');
}
cpSync(builtWebDir, join(staging, 'webroot'), { recursive: true });

if (existsSync(zipPath)) rmSync(zipPath);
log(`packaging ${zipName}...`);
createZip(zipPath);
log(`created ${zipPath} (${(statSync(zipPath).size / 1024).toFixed(1)} KB)`);
rmSync(staging, { recursive: true, force: true });
log('done');
