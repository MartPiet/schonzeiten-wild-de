// Tests für scripts/lint-data.mjs.   Aufruf:  node --test scripts/lint-data.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDataProblems, isRecurringDate } from './lint-data.mjs';

const huntableRoeBuck = () => ({
  name: 'Rehwild', category: 'Bock', id: 'rehwild-bock',
  openSeason: [{ from: '05-01', to: '10-15' }], protectedAllYear: false, note: '',
});

const regionWith = (species, metadata = {}) => ({
  region: { code: 'DE-XX', country: 'DE', name: 'Test' },
  validFrom: '2026-01-01',
  source: { retrieved: '2026-10-02' },
  species,
  ...metadata,
});

test('valid region has no problems', () => {
  assert.deepEqual(findDataProblems(regionWith([huntableRoeBuck()])), []);
});

test('isRecurringDate accepts real calendar days and rejects 02-29', () => {
  assert.equal(isRecurringDate('02-28'), true);
  assert.equal(isRecurringDate('12-31'), true);
  assert.equal(isRecurringDate('02-29'), false);
  assert.equal(isRecurringDate('04-31'), false);
  assert.equal(isRecurringDate('13-01'), false);
  assert.equal(isRecurringDate('2-1'), false);
});

test('reports season end on 02-29', () => {
  const species = { ...huntableRoeBuck(), openSeason: [{ from: '08-01', to: '02-29' }] };
  const [problem] = findDataProblems(regionWith([species]));
  assert.match(problem, /rehwild-bock: "02-29"/);
});

test('reports protectedAllYear combined with an open season', () => {
  const species = { ...huntableRoeBuck(), protectedAllYear: true };
  const [problem] = findDataProblems(regionWith([species]));
  assert.match(problem, /protectedAllYear ist true, openSeason aber nicht leer/);
});

test('reports entry with neither open season nor protection', () => {
  const species = { ...huntableRoeBuck(), openSeason: [] };
  const [problem] = findDataProblems(regionWith([species]));
  assert.match(problem, /weder openSeason noch protectedAllYear/);
});

test('reports id that does not match name and category', () => {
  const species = { ...huntableRoeBuck(), id: 'rehwild' };
  const [problem] = findDataProblems(regionWith([species]));
  assert.match(problem, /erwartet "rehwild-bock"/);
});

test('reports duplicate ids once', () => {
  const problems = findDataProblems(regionWith([huntableRoeBuck(), huntableRoeBuck(), huntableRoeBuck()]));
  assert.deepEqual(problems, ['doppelte id "rehwild-bock"']);
});

test('reports validFrom after retrieval date', () => {
  const [problem] = findDataProblems(regionWith([huntableRoeBuck()], { validFrom: '2027-04-01' }));
  assert.match(problem, /validFrom 2027-04-01 liegt nach source.retrieved 2026-10-02/);
});
