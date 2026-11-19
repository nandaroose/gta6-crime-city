import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1_000
};

function parseArgs(argv: string[]): { repo: string; out: string } {
  let repo = process.cwd();
  let out = process.env.MAKEFUN_OUTPUT_DIR ?? 'out';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--repo' || arg === '--out') {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      if (arg === '--repo') repo = value;
      else out = value;
      i++;
    } else if (arg.startsWith('--repo=')) {
      repo = arg.slice('--repo='.length);
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { repo: resolve(repo), out: resolve(out) };
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function copyTree(src: string, dest: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const path of walk(src)) {
    const target = join(dest, path.slice(src.length + 1));
    mkdirSync(dirname(target), { recursive: true });
    cpSync(path, target);
    files++;
    bytes += statSync(path).size;
  }
  return { files, bytes };
}

function run(): void {
  const { repo, out } = parseArgs(process.argv.slice(2));
  const gameDir = join(repo, 'game');
  const shotsDir = join(repo, 'screenshots');

  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
    throw new Error(`no game/ directory in ${repo}`);
  }
  const indexHtml = join(gameDir, 'index.html');
  if (!existsSync(indexHtml) || !statSync(indexHtml).isFile()) {
    throw new Error(`game/index.html is missing from ${repo}`);
  }
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
    throw new Error(`no screenshots/ directory in ${repo}`);
  }

  for (const path of walk(gameDir)) {
    if (/https?:\/\//i.test(readFileSync(path, 'utf8'))) {
      throw new Error(`game file loads a network URL: ${path.slice(repo.length + 1)}`);
    }
  }

  const dossier = buildDossier(repo, CAPS);

  mkdirSync(out, { recursive: true });
  const game = copyTree(gameDir, join(out, 'game'));
  const shots = copyTree(shotsDir, join(out, 'screenshots'));
  writeFileSync(join(out, 'dossier.json'), dossier);

  const files = game.files + shots.files + 1;
  const bytes = game.bytes + shots.bytes + dossier.length;
  console.log(`copied ${files} files, ${bytes} bytes to ${out}`);
  console.log(`  game/: ${game.files} files, ${game.bytes} bytes`);
  console.log(`  screenshots/: ${shots.files} files, ${shots.bytes} bytes`);
  console.log(`  dossier.json: ${dossier.length} bytes`);
}

try {
  run();
} catch (error) {
  console.error(`main.ts: ${(error as Error).message}`);
  process.exit(1);
}
