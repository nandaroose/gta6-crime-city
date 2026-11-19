import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

interface Options {
  repo: string;
  out: string;
}

interface WalkedFile {
  rel: string;
  bytes: number;
}

const here = fileURLToPath(new URL('.', import.meta.url));

const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'ogg', 'wav', 'flac', 'm4a',
  'wasm', 'glb', 'gltf', 'bin', 'zip',
]);

const REMOTE_URL = /https?:\/\//i;

const USAGE = `Usage: node main.ts [--repo DIR] [--out DIR]

  --repo DIR   repository to package (default: this file's directory)
  --out DIR    output directory (default: $MAKEFUN_OUTPUT_DIR or out)

Copies <repo>/game and <repo>/screenshots into the output directory and writes
dossier.json there with vendor/makefun-game.ts.`;

function parseArgs(argv: readonly string[]): Options {
  let repo = here;
  let out = process.env.MAKEFUN_OUTPUT_DIR ?? 'out';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--help' || arg === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
    if (arg === '--repo' || arg === '-r') {
      const value = argv[++i];
      if (value === undefined) throw new Error('--repo needs a directory');
      repo = value;
      continue;
    }
    if (arg === '--out' || arg === '-o') {
      const value = argv[++i];
      if (value === undefined) throw new Error('--out needs a directory');
      out = value;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  return { repo: resolve(repo), out: resolve(out) };
}

function walkFiles(root: string): WalkedFile[] {
  const files: WalkedFile[] = [];
  const visit = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full, rel);
      else if (entry.isFile()) files.push({ rel, bytes: statSync(full).size });
    }
  };
  visit(root, '');
  return files;
}

function totalBytes(files: readonly WalkedFile[]): number {
  return files.reduce((sum, file) => sum + file.bytes, 0);
}

function assertNoRemoteUrls(gameDir: string, files: readonly WalkedFile[]): void {
  for (const file of files) {
    const ext = file.rel.split('.').pop()?.toLowerCase() ?? '';
    if (BINARY_EXT.has(ext)) continue;
    const text = readFileSync(join(gameDir, file.rel), 'utf8');
    if (REMOTE_URL.test(text)) {
      throw new Error(`game/${file.rel} references an http(s) URL; the game must load nothing over the network`);
    }
  }
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MiB`;
}

function packageEntry(options: Options): void {
  const gameDir = join(options.repo, 'game');
  const shotsDir = join(options.repo, 'screenshots');

  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error(`game/index.html is missing under ${options.repo}; a game is a directory of static files with its index.html at the root`);
  }

  const gameFiles = walkFiles(gameDir);
  assertNoRemoteUrls(gameDir, gameFiles);
  const shotFiles = existsSync(shotsDir) ? walkFiles(shotsDir) : [];

  mkdirSync(options.out, { recursive: true });
  cpSync(gameDir, join(options.out, 'game'), { recursive: true });
  mkdirSync(join(options.out, 'screenshots'), { recursive: true });
  if (existsSync(shotsDir)) cpSync(shotsDir, join(options.out, 'screenshots'), { recursive: true });

  const dossier = buildDossier(options.out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(options.out, 'dossier.json'), dossier);

  console.log(`repo:        ${options.repo}`);
  console.log(`output:      ${options.out}`);
  console.log(`game:        ${gameFiles.length} files, ${humanBytes(totalBytes(gameFiles))}`);
  console.log(`screenshots: ${shotFiles.length} files, ${humanBytes(totalBytes(shotFiles))}`);
  console.log(`dossier:     ${humanBytes(dossier.length)}`);
  console.log('entry packaged.');
}

try {
  packageEntry(parseArgs(process.argv.slice(2)));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`make.fun gta6-01: ${message}`);
  process.exitCode = 1;
}
