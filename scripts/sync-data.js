#!/usr/bin/env node
import { mkdir, copyFile, readdir, stat } from 'fs/promises';
import { dirname, join } from 'path';

const SRC = 'src/data';
const DEST = 'public/data';

async function ensureDir(path) {
  try { await mkdir(path, { recursive: true }); } catch (e) { }
}

async function walkFiles(dir, base = dir, files = []) {
  const entries = await readdir(dir);
  for (const name of entries) {
    const absPath = join(dir, name);
    const s = await stat(absPath);
    if (s.isDirectory()) {
      await walkFiles(absPath, base, files);
    } else {
      const relPath = absPath.slice(base.length + 1);
      files.push(relPath);
    }
  }
  return files;
}

async function safeStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

async function syncFile(relPath) {
  const srcPath = join(SRC, relPath);
  const destPath = join(DEST, relPath);
  const srcStat = await safeStat(srcPath);
  const destStat = await safeStat(destPath);

  if (srcStat && !destStat) {
    await ensureDir(dirname(destPath));
    await copyFile(srcPath, destPath);
    return;
  }

  if (!srcStat && destStat) {
    await ensureDir(dirname(srcPath));
    await copyFile(destPath, srcPath);
    return;
  }

  if (!srcStat || !destStat) return;

  if (srcStat.mtimeMs > destStat.mtimeMs) {
    await copyFile(srcPath, destPath);
  } else if (destStat.mtimeMs > srcStat.mtimeMs) {
    await copyFile(destPath, srcPath);
  }
}

async function main(){
  try {
    await ensureDir(SRC);
    await ensureDir(DEST);

    const srcFiles = await walkFiles(SRC);
    const destFiles = await walkFiles(DEST);
    const allFiles = new Set([...srcFiles, ...destFiles]);

    for (const relPath of allFiles) {
      await syncFile(relPath);
    }

    console.log('Data sync complete: src/data <-> public/data');
  } catch (err) {
    console.error('Data sync failed:', err);
    process.exitCode = 1;
  }
}

main();
