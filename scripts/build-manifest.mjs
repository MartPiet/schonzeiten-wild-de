// Generiert aus data/**/*.json drei Konsum-Artefakte:
//   - manifest.json : Version, Stand, SHA-256 + Stand je Datei  (Apps pollen DAS)
//   - all.json      : alle Regionen aggregiert in einer Datei
//   - species.json  : Stammliste aller vorkommenden Wildarten
// Validiert dabei minimal die Struktur. Reines Node, keine Abhängigkeiten.
// Aufruf:  node scripts/build-manifest.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');

const slug = s => s.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.json')) out.push(p);
  }
  return out;
}

const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const files = walk(DATA_DIR).sort();

const dateien = [];
const regionen = [];
const speciesMap = new Map();
let problems = 0;

for (const file of files) {
  const raw = readFileSync(file);
  let json;
  try { json = JSON.parse(raw); }
  catch (e) { console.error(`✗ Ungültiges JSON: ${file}: ${e.message}`); problems++; continue; }
  if (!json.region?.code || !Array.isArray(json.arten)) {
    console.error(`✗ Pflichtfelder fehlen (region.code / arten): ${file}`); problems++; continue;
  }
  const pfad = relative(ROOT, file).split(/[\\/]/).join('/');
  dateien.push({ pfad, region: json.region.code, stand: json.stand ?? null, confidence: json.confidence ?? null, sha256: sha256(raw) });
  regionen.push(json);
  for (const a of json.arten) {
    if (a.wissenschaftlich && !speciesMap.has(a.art)) speciesMap.set(a.art, a.wissenschaftlich);
  }
}

const arten = [...speciesMap.entries()]
  .sort((a, b) => a[0].localeCompare(b[0], 'de'))
  .map(([art, wiss]) => ({ id: slug(art), art, wissenschaftlich: wiss }));
writeFileSync(join(ROOT, 'species.json'), JSON.stringify({ anzahl: arten.length, arten }, null, 2) + '\n');

const version = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
const generiert = new Date().toISOString();

const manifest = { version, generiert, schemaVersion: '1.0.0', anzahlRegionen: dateien.length, dateien };
writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(ROOT, 'all.json'), JSON.stringify({ version, generiert, anzahlRegionen: regionen.length, regionen }, null, 2) + '\n');

console.log(`✓ manifest.json + all.json + species.json: ${dateien.length} Regionen, ${arten.length} Arten, Version ${version}`);
if (problems) { console.error(`\n${problems} Datei(en) mit Problemen.`); process.exit(1); }
