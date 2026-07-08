import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const VITE_BIN = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const DATA_READY = existsSync(join(ROOT, 'data', 'api_start2.json'));

const log = (msg) => console.log(`\n[boot] ${msg}`);
const fail = (msg) => {
  console.error(`\n[boot] ✗ ${msg}`);
  process.exit(1);
};

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    log(`${label} ...`);
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true });
    p.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${label} exited with code ${code}`)),
    );
    p.on('error', reject);
  });
}

try {
  if (!existsSync(VITE_BIN)) {
    await run('npm', ['install'], 'Installing dependencies (first run only)');
  } else {
    log('node_modules ready, skipping install');
  }

  if (!DATA_READY) {
    await run('npm', ['run', 'sync'], 'Syncing KanColle data (first run only)');
  } else {
    log('data/ ready, skipping sync');
  }

  log('Starting vite dev server (browser will open automatically)');
  await run('node', [VITE_BIN, '--open'], 'vite');
} catch (e) {
  fail(e.message);
}
