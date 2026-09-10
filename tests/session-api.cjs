// Run against the disposable review API, never a production or personal database.
// Start the API with ConnectionStrings__Postgres pointing at the isolated test DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { HubConnectionBuilder, LogLevel } = require('../frontend/node_modules/@microsoft/signalr');
const base = 'http://127.0.0.1:5139';
const results = [];
let cookie = '';
const connections = [];
async function request(path, { method = 'GET', body, private: privateRequest = false, expected = 200 } = {}) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(privateRequest ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${text.slice(0, 400)}`);
  if (path === '/api/auth/login') cookie = response.headers.getSetCookie().map(s => s.split(';')[0]).join('; ');
  return text ? JSON.parse(text) : null;
}
function pass(name) { results.push({ name, passed: true }); console.log(`PASS ${name}`); }
async function channel(auth, method, code) {
  const connection = new HubConnectionBuilder().withUrl(base + '/hubs/session', { headers: auth ? { Cookie: cookie } : {} }).configureLogging(LogLevel.Error).build();
  connections.push(connection);
  const events = [];
  connection.on('session-updated', s => { events.push(s); });
  await connection.start();
  if (method) await connection.invoke(method, code);
  return { connection, events };
}
async function until(predicate) {
  const deadline = Date.now() + 5000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error('Timed out waiting for SignalR event'); await new Promise(r => setTimeout(r, 20)); }
}
async function main() {
  await request('/api/auth/login', { method: 'POST' });
  const suffix = Date.now();
  const clientId = await request('/api/clients', { method: 'POST', private: true, expected: 201, body: { name: `UI review ${suffix}`, industry: 'Pruebas aisladas' } });
  const projectId = await request('/api/projects', { method: 'POST', private: true, expected: 201, body: { clientId, name: 'Revisión UI/UX', code: `UI-${suffix}` } });
  const question = (key, responseVisibility, responseIdentityMode) => ({ key, title: key, prompt: 'Una pregunta de prueba', kind: 'ShortText', options: [], presentation: { timerSeconds: 60, responseVisibility, responseIdentityMode, showProgress: true, allowLateResponses: false, celebrationStyle: 'Subtle' } });
  const templateId = await request('/api/templates', { method: 'POST', private: true, expected: 201, body: { key: `ui-review-${suffix}`, title: 'Revisión completa', objective: 'Validar sesiones', audience: 'Equipo', facilitatorGuidance: '', sections: [
    { key: 'first', title: 'Primer bloque', objective: '', order: 1, questions: [question('after-close', 'AfterClose', 'Named'), question('anonymous', 'AfterClose', 'Anonymous')] },
    { key: 'second', title: 'Segundo bloque', objective: '', order: 2, questions: [question('private', 'FacilitatorOnly', 'Named'), question('live', 'Live', 'Named')] },
  ] } });
  pass('Designer template without legacy settings saves correctly');
  const summary = await request('/api/sessions', { method: 'POST', private: true, expected: 201, body: { clientId, projectId, templateId, title: 'Sesión de integración UI/UX' } });
  const prefix = `/api/sessions/${summary.id}`;
  await request(prefix + '/agenda', { expected: 401 });
  await request(prefix + '/facilitator', { expected: 401 });
  const agenda = await request(prefix + '/agenda', { private: true });
  assert.equal(agenda.length, 2); assert.equal(agenda[1].questions.length, 2);
  pass('Authenticated ordered session agenda and private snapshot');
  const publicHub = await channel(false, 'JoinSession', summary.accessCode);
  await assert.rejects(() => publicHub.connection.invoke('JoinFacilitatorSession', summary.accessCode));
  const facilitatorHub = await channel(true, 'JoinFacilitatorSession', summary.accessCode);
  const projectionWithCookie = await channel(true, 'JoinSession', summary.accessCode);
  pass('Hub refuses anonymous facilitator subscription');
  const participant = await request(prefix + '/join', { method: 'POST', body: { displayName: 'Participante de prueba' } });
  await until(() => publicHub.events.length && facilitatorHub.events.length);
  assert.equal(new Set(publicHub.events.at(-1).participants.map(p => p.id)).size, publicHub.events.at(-1).participants.length);
  pass('Join broadcasts participant exactly once');
  const setRound = (phase, section, q) => request(prefix + '/round-state', { method: 'POST', private: true, body: { phase, roundOpen: phase === 'RoundOpen', resultsVisible: phase === 'Results', activeSectionId: section.id, activeQuestionId: q.id } });
  const send = (q, value) => request(prefix + '/responses', { method: 'POST', body: { participantId: participant.id, questionId: q.id, value } });
  const publicSnapshot = () => request(`/api/sessions/by-code/${summary.accessCode}`, { private: true });
  const privateSnapshot = () => request(prefix + '/facilitator', { private: true });
  const first = agenda[0].questions[0];
  await setRound('RoundOpen', agenda[0], first);
  const submitted = await send(first, 'Respuesta no publicada');
  assert.equal(submitted.responses.length, 0);
  assert.equal((await publicSnapshot()).responses.length, 0);
  assert.equal((await privateSnapshot()).responseCount, 1);
  assert.equal((await privateSnapshot()).responses[0].value, 'Respuesta no publicada');
  await until(() => facilitatorHub.events.some(s => s.responseCount === 1));
  assert(publicHub.events.every(s => s.responses.length === 0));
  assert(projectionWithCookie.events.every(s => s.responses.length === 0));
  assert.equal((await setRound('Waiting', agenda[0], first)).roundOpenedAtUtc !== null, true);
  assert.equal((await publicSnapshot()).responses.length, 0);
  await setRound('Results', agenda[0], first);
  assert.equal((await publicSnapshot()).responses.length, 1);
  pass('AfterClose waits for explicit reveal across REST, hub, and projection cookie');
  const second = agenda[0].questions[1];
  const waiting = await setRound('Waiting', agenda[0], second);
  assert.equal(waiting.roundOpenedAtUtc, null); assert.equal(waiting.roundOpen, false);
  assert.equal(waiting.resultsVisible, false); assert.equal(waiting.questionIndex, 2);
  await request(prefix + '/responses', { method: 'POST', expected: 409, body: { participantId: participant.id, questionId: first.id, value: 'Borrador anterior' } });
  await request(prefix + '/round-state', { method: 'POST', private: true, expected: 400, body: { phase: 'Waiting', roundOpen: false, resultsVisible: false, activeSectionId: agenda[0].id, activeQuestionId: agenda[1].questions[0].id } });
  assert.equal((await privateSnapshot()).activeQuestionId, second.id);
  pass('Next question resets opening, stale answer rejected, invalid cross-block IDs cannot corrupt session');
  await setRound('RoundOpen', agenda[0], second); await send(second, 'Aportación anónima'); await setRound('Results', agenda[0], second);
  for (const snapshot of [await publicSnapshot(), await privateSnapshot()]) { assert.equal(snapshot.responses[0].participantId, null); assert.equal(snapshot.responses[0].participantName, 'Participante'); }
  pass('Anonymous response hides author name and ID');
  const third = agenda[1].questions[0];
  await setRound('Waiting', agenda[1], third); await setRound('RoundOpen', agenda[1], third);
  await send(third, 'Solo facilitador'); await setRound('Results', agenda[1], third);
  assert.equal((await publicSnapshot()).responses.length, 0); assert.equal((await request(prefix)).responses.length, 0);
  assert.equal((await privateSnapshot()).responses[0].value, 'Solo facilitador');
  await until(() => facilitatorHub.events.some(s => s.activeQuestionId === third.id && s.resultsVisible));
  assert(publicHub.events.filter(s => s.activeQuestionId === third.id).every(s => s.responses.length === 0));
  assert(projectionWithCookie.events.filter(s => s.activeQuestionId === third.id).every(s => s.responses.length === 0));
  pass('FacilitatorOnly never leaks after reveal, including legacy REST and authenticated projection');
  const fourth = agenda[1].questions[1];
  await setRound('Waiting', agenda[1], fourth); await setRound('RoundOpen', agenda[1], fourth);
  assert.equal((await send(fourth, 'En directo')).responses[0].value, 'En directo');
  await send(fourth, 'Versión actualizada'); assert.equal((await privateSnapshot()).responseCount, 1);
  pass('Live answers visible, updating does not duplicate response count');
  await request(prefix + '/survey-state', { method: 'POST', private: true, body: { isOpen: true } });
  await request(prefix + '/feedback', { method: 'POST', body: { participantId: participant.id, rating: 5, comment: 'Todo claro' } });
  assert.equal((await privateSnapshot()).satisfactionSurvey.averageRating, 5);
  await setRound('WrapUp', agenda[1], fourth); assert.equal((await publicSnapshot()).status, 'Closed');
  await request(prefix + `/participants/${participant.id}`, { method: 'DELETE', private: true });
  assert.equal((await publicSnapshot()).participants.length, 0);
  pass('Survey, finish and participant removal persist correctly');
  fs.mkdirSync('output/playwright/api-integration', { recursive: true });
  fs.writeFileSync('output/playwright/api-integration/results.json', JSON.stringify({ base, isolatedDatabase: 'frameit_uiux_review', results, sessionId: summary.id, accessCode: summary.accessCode }, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await Promise.all(connections.map(c => c.stop())); });
