// Inhaltliche Prüfregeln für eine Regionsdatei (data/**/*.json), die das JSON-Schema
// allein nicht abdeckt. Liefert eine Liste von Fehlermeldungen; leer = in Ordnung.
// Wird von scripts/build-manifest.mjs aufgerufen.
import { speciesId } from './slug.mjs';

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_DAY_PATTERN = /^(\d{2})-(\d{2})$/;

export function isRecurringDate(monthDay) {
  const match = MONTH_DAY_PATTERN.exec(monthDay ?? '');
  if (!match) return false;
  const [month, day] = [Number(match[1]), Number(match[2])];
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_PER_MONTH[month - 1];
}

export function findDataProblems(region) {
  return [
    ...findMetadataProblems(region),
    ...findDuplicateIds(region.species),
    ...region.species.flatMap(findSpeciesProblems),
  ];
}

function findMetadataProblems(region) {
  const retrieved = region.source?.retrieved;
  if (!region.validFrom || !retrieved || region.validFrom <= retrieved) return [];
  return [`validFrom ${region.validFrom} liegt nach source.retrieved ${retrieved}`];
}

function findDuplicateIds(species) {
  const ids = species.map(s => s.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  return [...new Set(duplicates)].map(id => `doppelte id "${id}"`);
}

function findSpeciesProblems(species) {
  const label = species.id ?? species.name;
  return [
    ...findStatusProblems(species),
    ...findIdProblems(species),
    ...species.openSeason.flatMap(findSeasonProblems),
  ].map(problem => `${label}: ${problem}`);
}

function findStatusProblems({ protectedAllYear, openSeason }) {
  if (protectedAllYear && openSeason.length > 0) return ['protectedAllYear ist true, openSeason aber nicht leer'];
  if (!protectedAllYear && openSeason.length === 0) return ['weder openSeason noch protectedAllYear gesetzt'];
  return [];
}

function findIdProblems(species) {
  const expectedId = speciesId(species);
  return species.id === expectedId ? [] : [`id "${species.id}" passt nicht zu name/category (erwartet "${expectedId}")`];
}

function findSeasonProblems({ from, to }) {
  return [from, to]
    .filter(monthDay => !isRecurringDate(monthDay))
    .map(monthDay => `"${monthDay}" ist kein jährlich wiederkehrendes Datum (MM-TT, ohne 02-29)`);
}
