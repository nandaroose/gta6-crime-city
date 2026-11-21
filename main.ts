// Hand in Solano City: copy game/ and screenshots/ to the output directory,
// check that the game loads only local files, and write dossier.json.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

function defaultRepo() {
  const env = process.env.MAKEFUN_BOT_DIR;
  if (env) return env;
  if (existsSync(join(process.cwd(), 'game'))) return process.cwd();
  if (existsSync(join(import.meta.dirname, 'game'))) return import.meta.dirname;
  return process.cwd();
}

function parseArgs(argv) {
  let repo = defaultRepo();
  let out = process.env.MAKEFUN_OUTPUT_DIR || 'out';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf('=');
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    const value = eq >= 0 ? arg.slice(eq + 1) : undefined;
    if (name === '--repo' || name === '--out') {
      const v = value ?? argv[++i];
      if (!v) throw new Error(name + ' needs a directory');
      if (name === '--repo') repo = v;
      else out = v;
    } else if (name === '--help' || name === '-h') {
      console.log('usage: node main.ts [--repo <dir>] [--out <dir>]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return { repo: resolve(repo), out: resolve(out) };
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.isFile()) out.push({ path: full.slice(base.length + 1), bytes: statSync(full).size });
    else throw new Error('game/ holds a non-regular file: ' + full);
  }
  return out;
}

function scanForUrls(gameDir) {
  for (const file of walk(gameDir)) {
    const text = readFileSync(join(gameDir, file.path), 'utf8');
    if (/https?:\/\//i.test(text)) {
      throw new Error('game/' + file.path + ' contains a network URL; the game must load only local files');
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const gameDir = join(args.repo, 'game');
  const shotsDir = join(args.repo, 'screenshots');
  const index = join(gameDir, 'index.html');

  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) throw new Error('missing game/ directory at ' + gameDir);
  if (!existsSync(index) || !statSync(index).isFile()) throw new Error('missing game/index.html at ' + index);
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) throw new Error('missing screenshots/ directory at ' + shotsDir);

  scanForUrls(gameDir);

  const outGame = join(args.out, 'game');
  const outShots = join(args.out, 'screenshots');
  mkdirSync(args.out, { recursive: true });
  rmSync(outGame, { recursive: true, force: true });
  rmSync(outShots, { recursive: true, force: true });
  cpSync(gameDir, outGame, { recursive: true });
  cpSync(shotsDir, outShots, { recursive: true });

  if (!existsSync(join(outGame, 'index.html'))) throw new Error('copy failed: ' + join(outGame, 'index.html') + ' is missing');

  const dossier = buildDossier(args.out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  const dossierPath = join(args.out, 'dossier.json');
  writeFileSync(dossierPath, dossier);

  const gameFiles = walk(outGame);
  const shotFiles = walk(outShots);
  const gameBytes = gameFiles.reduce((n, f) => n + f.bytes, 0);
  const shotBytes = shotFiles.reduce((n, f) => n + f.bytes, 0);
  console.log('Solano City handoff');
  console.log('  repo:        ' + args.repo);
  console.log('  output:      ' + args.out);
  console.log('  game:        ' + gameFiles.length + ' files, ' + gameBytes + ' bytes');
  console.log('  screenshots: ' + shotFiles.length + ' files, ' + shotBytes + ' bytes');
  console.log('  dossier:     ' + dossier.length + ' bytes');
  console.log('  total:       ' + (gameFiles.length + shotFiles.length + 1) + ' files, ' + (gameBytes + shotBytes + dossier.length) + ' bytes');
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('main.ts: ' + message);
  process.exit(1);
}
