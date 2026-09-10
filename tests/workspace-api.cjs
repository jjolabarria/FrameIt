// Integration checks use ONLY the isolated review stack, never the user's database.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const root = 'http://localhost:18080';
const guid = n => `ab000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function main() {
  const seed = `DO $$ BEGIN IF current_database() <> 'frameit_review' THEN RAISE EXCEPTION 'Wrong database'; END IF; END $$;
INSERT INTO "Clients" ("Id", "Name", "Industry") SELECT ('ab000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid, 'Volumen cliente ' || lpad(i::text,2,'0'), 'Pruebas aisladas' FROM generate_series(1,50) i ON CONFLICT DO NOTHING;
INSERT INTO "Projects" ("Id", "ClientId", "Name", "Code") SELECT ('ab000000-0000-4000-8000-' || lpad((1000+i)::text,12,'0'))::uuid, ('ab000000-0000-4000-8000-' || lpad((1+(i-1)/20)::text,12,'0'))::uuid, 'Proyecto compartido ' || (1+(i-1)%20), 'P' || lpad((1+(i-1)%20)::text,2,'0') FROM generate_series(1,1000) i ON CONFLICT DO NOTHING;
INSERT INTO "WorkshopSessions" ("Id", "ClientId", "ProjectId", "TemplateId", "Title", "AccessCode", "Status", "Phase", "RoundOpen", "ResultsVisible", "SatisfactionSurveyOpen", "UpdatedAtUtc") SELECT ('ab000000-0000-4000-8000-' || lpad((10000+i)::text,12,'0'))::uuid, ('ab000000-0000-4000-8000-' || lpad((1+(i-1)/20)::text,12,'0'))::uuid, ('ab000000-0000-4000-8000-' || lpad((1000+i)::text,12,'0'))::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'Volumen taller ' || lpad(i::text,4,'0'), 'TEST' || lpad(i::text,4,'0'), i%3, CASE WHEN i%3=2 THEN 4 ELSE 0 END, false, false, false, TIMESTAMPTZ '2026-09-09 10:00:00+00' - i * INTERVAL '1 minute' FROM generate_series(1,1000) i ON CONFLICT DO NOTHING;`;
  const seeded = spawnSync('docker', ['exec', '-i', 'frameit-workspace-review-db-1', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'frameit_review', '-d', 'frameit_review'], { input: seed, encoding: 'utf8' });
  assert.equal(seeded.status, 0, seeded.stderr);
  const anonymous = await fetch(root + '/api/workspace/sessions'); assert.equal(anonymous.status, 401);
  const login = await fetch(root + '/api/auth/login', { method: 'POST' }); assert.equal(login.status, 200);
  const cookie = login.headers.getSetCookie().map(s => s.split(';')[0]).join('; ');
  const request = (path, method = 'GET', body) => fetch(root + path, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const get = async path => { const response = await request(path); assert.equal(response.status, 200, path); return response.json(); };
  const measurements = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now(); const response = await request('/api/workspace/sessions?q=Volumen%20taller&pageSize=25');
    assert.equal(response.status, 200); const text = await response.text(); const result = JSON.parse(text);
    assert.equal(result.totalCount, 1000); assert.equal(result.items.length, 25); assert.equal(result.totalPages, 40);
    assert(!text.includes('qrSvg')); assert(!text.includes('responses')); assert(result.items.every(s => s.clientName && s.projectCode));
    measurements.push({ milliseconds: Math.round(performance.now() - start), bytes: Buffer.byteLength(text), rows: result.items.length });
  }
  const p1 = await get('/api/workspace/sessions?q=Volumen%20taller&pageSize=25');
  const p2 = await get('/api/workspace/sessions?q=Volumen%20taller&pageSize=25&page=2');
  assert(p1.items.every(s => !p2.items.some(t => t.id === s.id)));
  assert.deepEqual((await get('/api/workspace/sessions?q=Volumen%20taller&pageSize=25&page=2')).items, p2.items);
  assert.equal((await get('/api/workspace/sessions?q=Volumen%20taller&pageSize=10000')).items.length, 100);
  assert.equal((await get('/api/workspace/sessions?q=Volumen%20taller&page=999')).page, 40);
  assert.equal((await get('/api/workspace/sessions?q=TEST0500')).items[0].accessCode, 'TEST0500');
  assert.equal((await get(`/api/workspace/sessions?clientId=${guid(1)}&q=Volumen%20taller`)).totalCount, 20);
  assert.equal((await get(`/api/workspace/sessions?projectId=${guid(1002)}&q=Volumen%20taller`)).totalCount, 1);
  assert.equal((await get(`/api/workspace/sessions?clientId=${guid(2)}&projectId=${guid(1002)}`)).totalCount, 0);
  assert((await get('/api/workspace/sessions?status=Closed')).items.every(s => s.status === 'Closed'));
  assert.equal((await request('/api/workspace/sessions?status=invalid')).status, 400);
  const clients = await get('/api/workspace/clients?q=Volumen&pageSize=10'); assert.equal(clients.totalCount, 50); assert.equal(clients.items.length, 10);
  assert(clients.items[0].sessionCount >= 20); assert.equal(clients.items[0].projectCount, 20);
  const projects = await get(`/api/workspace/projects?clientId=${guid(1)}&q=P02`); assert.equal(projects.totalCount, 1); assert.equal(projects.items[0].id, guid(1002));
  const overview = await get('/api/workspace/overview'); assert(overview.recent.length <= 6 && overview.active.length <= 6); assert(overview.projects >= 1000);
  // Real writes are restricted to synthetic entities in this isolated database.
  const previousProject = await get(`/api/workspace/projects/${guid(1002)}`);
  assert.equal((await request(`/api/clients/${guid(1)}`, 'PUT', { name: 'Volumen cliente 01 editado', industry: 'Pruebas aisladas' })).status, 204);
  assert.equal((await request(`/api/projects/${guid(1002)}`, 'PUT', { name: 'Segundo proyecto editado', code: 'P02' })).status, 204);
  const edited = await get(`/api/workspace/projects/${guid(1002)}`); assert.equal(edited.clientId, guid(1)); assert.equal(edited.sessionCount, previousProject.sessionCount);
  const session = await get(`/api/workspace/sessions/${guid(10002)}`); assert.equal(session.projectName, 'Segundo proyecto editado'); assert.equal(session.clientName, 'Volumen cliente 01 editado');
  assert.equal((await request(`/api/projects/${guid(1002)}`, 'PUT', { name: '', code: 'P02' })).status, 400);
  assert.equal((await request(`/api/projects/${guid(1002)}`, 'PUT', { name: 'Código repetido', code: 'P01' })).status, 409);
  assert.equal((await request('/api/projects', 'POST', { clientId: guid(1), name: 'Código repetido', code: 'P01' })).status, 409);
  assert.equal((await request('/api/sessions', 'POST', { clientId: guid(1), projectId: guid(1002), templateId: '33333333-3333-3333-3333-333333333333', title: ' ' })).status, 400);
  const created = await request('/api/sessions', 'POST', { clientId: guid(1), projectId: guid(1002), templateId: '33333333-3333-3333-3333-333333333333', title: 'Integración contextual' });
  assert.equal(created.status, 201); const newSession = await created.json();
  assert.equal((await get(`/api/workspace/sessions/${newSession.id}`)).projectId, guid(1002));
  assert.equal((await request('/api/sessions', 'POST', { clientId: guid(2), projectId: guid(1002), templateId: '33333333-3333-3333-3333-333333333333', title: 'Padre incorrecto' })).status, 400);
  const report = { passed: true, testedAt: new Date().toISOString(), fixture: { clients: 50, projects: 1000, sessions: 1000 }, measurements, realSessionId: newSession.id, checks: ['authentication', 'SQL paging and totals', 'stable sorting', 'size cap', 'out of range page', 'client/project/code/status filters', 'lightweight DTO without QR', 'overview bounded', 'edits preserve relationships', 'validation', 'session creation in second project', 'mismatched parent rejected'] };
  fs.mkdirSync('output/playwright/management-api-review', { recursive: true }); fs.writeFileSync('output/playwright/management-api-review/results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
