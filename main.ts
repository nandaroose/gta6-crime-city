import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildDossier } from './vendor/makefun-game.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const NETWORK_URL = /https?:\/\//i;
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error(`makefun: ${message}`);
  process.exit(1);
}

function parseCli(): { repo?: string; out?: string } {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      options: {
        repo: { type: 'string' },
        out: { type: 'string' },
      },
    }).values;
  } catch (err) {
    return fail(`bad arguments: ${(err as Error).message}`);
  }
}

function listFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full));
    else if (entry.isFile()) files.push(full);
    else fail(`not a regular file: ${full}`);
  }
  return files;
}

const values = parseCli();
const cwd = process.cwd();
const repo = resolve(
  values.repo ?? process.env.MAKEFUN_BOT_DIR ?? (existsSync(join(cwd, 'game')) ? cwd : HERE),
);
const out = resolve(
  values.out ?? process.env.MAKEFUN_OUTPUT_DIR ?? (existsSync('/output') ? '/output' : 'out'),
);

const gameDir = join(repo, 'game');
const shotsDir = join(repo, 'screenshots');

if (!existsSync(gameDir)) fail(`no game/ directory under ${repo}`);
if (!existsSync(join(gameDir, 'index.html'))) fail(`missing ${join(gameDir, 'index.html')}`);
if (!existsSync(shotsDir)) fail(`no screenshots/ directory under ${repo}`);

const gameFiles = listFiles(gameDir);
for (const file of gameFiles) {
  if (NETWORK_URL.test(readFileSync(file, 'utf8'))) {
    fail(`network URL in ${relative(repo, file)}: game files must load nothing over the network`);
  }
}

const shotFiles = listFiles(shotsDir);
const copied = [...gameFiles, ...shotFiles];
const bytes = copied.reduce((total, file) => total + statSync(file).size, 0);

try {
  mkdirSync(out, { recursive: true });
  cpSync(gameDir, join(out, 'game'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
} catch (err) {
  fail(`copy failed: ${(err as Error).message}`);
}

let dossier: Uint8Array;
try {
  dossier = buildDossier(out, CAPS);
} catch (err) {
  fail((err as Error).message);
}

try {
  writeFileSync(join(out, 'dossier.json'), dossier);
} catch (err) {
  fail(`cannot write dossier.json: ${(err as Error).message}`);
}

console.log(`makefun: copied ${copied.length} files, ${bytes} bytes to ${out}`);
console.log(`makefun: wrote ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
