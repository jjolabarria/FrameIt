const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../../frontend/node_modules/typescript');
function load(name) {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/components', name + '.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported = {};
  new Function('exports', 'require', code)(exported, dependency => load(dependency.replace('./', '')));
  return exported;
}
const { JourneyCamera, JourneyIntro, approachHeight } = load('journeyCamera');
const point = { x: 0, y: .2, z: 0 };
test('clear terrain does not cause continuous orbit', () => {
  const rig = new JourneyCamera();
  const angle = rig.angle;
  for (let frame = 0; frame < 600; frame++) rig.update(point, point, 10.5, 9, 1 / 60, () => 0);
  assert.equal(rig.angle, angle);
});
test('altitude changes are bounded in both directions and freeze on pause', () => {
  assert(approachHeight(10, 100, 1 / 60) <= 10.1);
  assert(approachHeight(100, 10, 1 / 60) >= 99.95);
  assert.equal(approachHeight(10, 100, 0), 10);
  const rig = new JourneyCamera();
  const first = rig.update(point, point, 10.5, 9, 1 / 60, () => 0);
  const second = rig.update(point, point, 10.5, 30, 1 / 60, () => 0);
  assert(second.y > first.y && second.y - first.y <= .100001);
});
test('obstructed heading selects a better viewpoint without an angular jump', () => {
  const rig = new JourneyCamera();
  rig.update(point, point, 10.5, 9, 1 / 60, () => 0);
  const initial = rig.angle;
  const ridge = (x, z) => x < -.3 && z > .4 && z < 4 ? 8 : 0;
  let changed = false;
  for (let i = 0; i < 120; i++) {
    const previous = rig.angle;
    rig.update(point, point, 10.5, 9, 1 / 60, ridge);
    assert(Math.abs(rig.angle - previous) < .12);
    changed ||= Math.abs(rig.angle - initial) > .1;
  }
  assert(changed);
});
test('opening shot completes once and cannot rewind with route navigation', () => {
  const intro = new JourneyIntro(0);
  assert.equal(intro.advance(0), 1);
  assert.equal(intro.advance(4), 0);
  assert.equal(intro.advance(-4), 0);
  assert.equal(intro.advance(0), 0);
  assert.equal(new JourneyIntro(20).advance(0), 0);
});
