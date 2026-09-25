const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../../frontend/node_modules/typescript');
const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/journeyPlayback.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exported = {};
new Function('exports', compiled)(exported);
const { JourneyClock } = exported;
const state = (positionMs, revision, playing = false, started = 0) => ({ state: playing ? 'Playing' : 'Paused', positionMs, revision, durationMs: 80000, startedAtUtc: new Date(started).toISOString() });

test('next blends into moving server position without a jump', () => {
  const clock = new JourneyClock(state(0, 1, true));
  clock.update(state(20000, 2, true, 5000), true, 5000);
  assert.equal(clock.read(5000), 5000);
  assert(clock.read(5600) > 5000 && clock.read(5600) < 20600);
  assert.equal(clock.read(6200), 21200);
  assert.equal(clock.read(7000), 22000);
});
test('paused navigation animates to a stop and stays there', () => {
  const clock = new JourneyClock(state(20000, 1));
  clock.update(state(0, 2), true, 1000);
  assert.equal(clock.read(1000), 20000);
  assert(clock.read(1600) > 0 && clock.read(1600) < 20000);
  assert.equal(clock.read(2200), 0);
  assert.equal(clock.read(9000), 0);
});
test('successive commands continue from the displayed position; stale revisions are ignored', () => {
  const clock = new JourneyClock(state(0, 1));
  clock.update(state(20000, 2), true, 1000);
  const visible = clock.read(1400);
  clock.update(state(40000, 3), true, 1400);
  assert.equal(clock.read(1400), visible);
  clock.update(state(10000, 2), true, 1500);
  assert.equal(clock.read(2600), 40000);
});
test('reduced motion applies navigation directly and pause freezes playback', () => {
  const clock = new JourneyClock(state(0, 1, true));
  clock.update(state(20000, 2), false, 5000);
  assert.equal(clock.read(5000), 20000);
  assert.equal(clock.read(9000), 20000);
});
