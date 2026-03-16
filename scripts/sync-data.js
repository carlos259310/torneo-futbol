#!/usr/bin/env node
import { mkdir, rm, copyFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

const SRC = 'src/data';
const DEST = 'public/data';

async function ensureDir(path) {
  try { await mkdir(path, { recursive: true }); } catch (e) { }
}

async function copyRecursive(srcDir, destDir) {
  await ensureDir(destDir);
  const entries = await readdir(srcDir);
  for (const name of entries) {
    const srcPath = join(srcDir, name);
    const destPath = join(destDir, name);
    const s = await stat(srcPath);
    if (s.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function main(){
  try {
    await ensureDir(DEST);
    try { await rm(DEST, { recursive: true, force: true }); } catch (e) {}
    await copyRecursive(SRC, DEST);
    console.log('Data sync complete: src/data -> public/data');
  } catch (err) {
    console.error('Data sync failed:', err);
    process.exitCode = 1;
  }
}

main();
