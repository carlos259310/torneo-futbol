#!/usr/bin/env node
import { cp, mkdir } from 'node:fs/promises';

const SRC = 'src/data';
const DEST = 'public/data';

async function main() {
  try {
    await mkdir(DEST, { recursive: true });
    await cp(SRC, DEST, { recursive: true, force: true });

    console.log('Data sync complete: src/data -> public/data');
  } catch (err) {
    console.error('Data sync failed:', err);
    process.exitCode = 1;
  }
}

main();
