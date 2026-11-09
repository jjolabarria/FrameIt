const { chromium } = require('../artifacts/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = process.env.FRAMEIT_TEST_URL || 'http://127.0.0.1:15375';
const kinds = ['ShortText', 'RichText', 'StickyNotes', 'Choice', 'Ranking', 'Voting', 'ColumnSort', 'Matrix', 'Presentation'];
const options = [{ id: 'a', label: 'Acceso' }, { id: 'b', label: 'Búsqueda' }, { id: 'c', label: 'Soporte' }];
const presentation = { timerSeconds: 60, responseVisibility: 'AfterClose', responseIdentityMode: 'Named', showProgress: true, allowLateResponses: false, celebrationStyle: 'Subtle' };
const template = { key: 'types', title: 'Tipos de pregunta', objective: 'Revisar interacciones', audience: 'Equipo', facilitatorGuidance: '', sections: [{ key: 's1', title: 'Explorar', objective: 'Probar', order: 1, questions: [{ key: 'q1', title: 'Pregunta de prueba', prompt: '¿Qué priorizamos?', kind: 'Choice', options, presentation }] }] };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    const errors = [];
    let kind = 'Choice', sent, multiple = false, responses = [];
    const snapshot = () => ({ id: 's1', title: 'Prueba', accessCode: 'TEST', status: 'Live', phase: 'RoundOpen', roundOpen: true, resultsVisible: false, updatedAtUtc: '2026-11-09T12:00:00Z', activeQuestionId: 'q1', sectionTitle: 'Explorar', questionTitle: 'Pregunta de prueba', questionPrompt: '¿Qué priorizamos?', questionKind: kind, questionSettings: { selectionMode: multiple ? 'multiple' : 'single', maxSelections: '2', columns: 'Ahora\nDespués', matrixScale: 'Bajo\nMedio\nAlto' }, options, participants: [{ id: 'p1', displayName: 'Alex' }], responses, questionsToFacilitator: [], attachments: [], outcomes: [], satisfactionSurvey: { responseCount: 0 }, timerSeconds: 60, responseVisibility: 'AfterClose', responseIdentityMode: 'Named', sectionIndex: 1, sectionCount: 1, questionIndex: 1, questionCount: 1 });
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path === '/api/auth/me') body = { isAuthenticated: true, name: 'Facilitador', organizationId: 'org' };
      else if (path === '/api/catalog/question-models') body = kinds.map(kind => ({ kind, description: kind }));
      else if (path === '/api/templates/types') body = template;
      else if (path.endsWith('/agenda')) body = [];
      else if (path.includes('/responses')) { sent = route.request().postDataJSON(); responses = [{ id: 'r1', participantName: 'Alex', value: sent.value }]; body = snapshot(); }
      else if (path.includes('/sessions/')) body = snapshot();
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await context.route('**/hubs/session/negotiate*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ negotiateVersion: 1, connectionId: 'test', connectionToken: 'test', availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }] }) }));
    await context.routeWebSocket('**/hubs/session?*', socket => socket.onMessage(data => {
      for (const part of data.toString().split('\x1e').filter(Boolean)) {
        const message = JSON.parse(part);
        if (message.protocol) socket.send('{}\x1e');
        else if (message.invocationId) socket.send(JSON.stringify({ type: 3, invocationId: message.invocationId }) + '\x1e');
      }
    }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(root + '/disenador?from=types');
    await page.getByRole('button', { name: /1 · Selección.*Pregunta de prueba/ }).click();
    await page.getByRole('tab', { name: 'Vista previa' }).click();
    const preview = page.locator('.designer-preview');
    for (const type of kinds.filter(type => type !== 'Presentation')) {
      await page.locator('select').filter({ has: page.locator('option[value="Ranking"]') }).selectOption(type);
      if (type === 'Ranking') { await preview.getByRole('button', { name: 'Bajar Acceso' }).click(); assert.match(await preview.locator('li').first().innerText(), /Búsqueda/); }
      if (type === 'Voting') { assert.equal(await preview.getByRole('radio').count(), 3); assert.equal(await preview.locator('textarea').count(), 0); await preview.getByRole('radio').first().check(); }
      if (type === 'ShortText') assert.equal(await preview.locator('input[maxlength="300"]').count(), 1);
      if (type === 'RichText') assert.equal(await preview.locator('textarea[rows="6"]').count(), 1);
      if (type === 'StickyNotes') { await preview.getByRole('button', { name: 'Añadir idea' }).click(); assert.equal(await preview.locator('textarea').count(), 2); }
      if (type === 'ColumnSort') assert.equal(await preview.getByRole('combobox').count(), 3);
      if (type === 'Matrix') assert.equal(await preview.getByRole('radio').count(), 15);
    }
    await context.addInitScript(() => sessionStorage.setItem('frameit.participant:TEST', JSON.stringify({ id: 'p1', alias: 'Alex', sessionId: 's1', confirmedAt: '2026-11-09T11:00:00Z' })));
    fs.mkdirSync('output/playwright/question-types', { recursive: true });
    for (const type of [...kinds.filter(type => type !== 'Presentation'), 'ChoiceMultiple']) {
      multiple = type === 'ChoiceMultiple'; kind = multiple ? 'Choice' : type; sent = null; responses = [];
      await page.goto(root + '/join/TEST');
      await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('frameit.answer:')).forEach(key => sessionStorage.removeItem(key)));
      await page.reload();
      await page.getByText('En directo', { exact: true }).waitFor();
      const answer = page.locator('.answer-form');
      const submit = answer.getByRole('button', { name: type === 'Voting' ? 'Enviar voto' : 'Enviar respuesta', exact: true });
      assert(await submit.isDisabled());
      if (type === 'ShortText' || type === 'RichText') await answer.getByRole('textbox').fill('Una respuesta');
      if (type === 'Choice' || type === 'Voting') await answer.getByRole('radio').nth(1).check();
      if (type === 'ChoiceMultiple') {
        const checkboxes = answer.getByRole('checkbox');
        await checkboxes.nth(0).check(); await checkboxes.nth(1).check();
        assert(await checkboxes.nth(2).isDisabled());
        await checkboxes.nth(0).uncheck(); assert(await checkboxes.nth(2).isEnabled());
        await checkboxes.nth(1).uncheck(); assert(await submit.isDisabled());
        await checkboxes.nth(0).check(); await checkboxes.nth(1).check();
      }
      if (type === 'Ranking') await answer.getByRole('button', { name: 'Bajar Acceso' }).click();
      if (type === 'StickyNotes') { await answer.getByLabel('Idea 1', { exact: true }).fill('Primera idea'); await answer.getByRole('button', { name: 'Añadir idea' }).click(); await answer.getByLabel('Idea 2', { exact: true }).fill('Segunda idea'); }
      if (type === 'ColumnSort') { const selects = answer.getByRole('combobox'); for (let i = 0; i < 3; i++) { await selects.nth(i).selectOption(i % 2 ? 'Después' : 'Ahora'); if (i < 2) assert(await submit.isDisabled()); } }
      if (type === 'Matrix') { for (let i = 0; i < 3; i++) { await answer.locator('.matrix-row').nth(i).getByRole('radio', { name: 'Alto', exact: true }).check(); if (i < 2) assert(await submit.isDisabled()); } }
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 950 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${type}: overflow at ${width}`);
      }
      await page.screenshot({ path: `output/playwright/question-types/${type}.png`, fullPage: true });
      // Reload checks the actual persisted participant draft and control restoration.
      await page.reload(); await page.getByText('En directo', { exact: true }).waitFor();
      await submit.click();
      await page.getByText('Tu respuesta está guardada', { exact: true }).waitFor();
      assert(sent && sent.value.trim(), `${type}: missing response`);
      if (type === 'Voting' || type === 'Choice') assert.equal(sent.value, 'Búsqueda');
      if (type === 'ChoiceMultiple') {
        assert.deepEqual(JSON.parse(sent.value), { selectedOptionIds: ['a', 'b'] });
        assert.equal(await page.locator('.answer-receipt .submitted-answer').innerText(), 'Acceso\nBúsqueda');
      }
      if (type === 'Ranking') assert.equal(sent.value, '1. Búsqueda\n2. Acceso\n3. Soporte');
      if (type === 'ColumnSort') assert.equal(sent.value, 'Acceso: Ahora\nBúsqueda: Después\nSoporte: Ahora');
      if (type === 'Matrix') assert.equal(sent.value, 'Acceso: Alto\nBúsqueda: Alto\nSoporte: Alto');
      if (type === 'StickyNotes') assert.equal(sent.value, 'Primera idea\n\nSegunda idea');
      await page.getByRole('button', { name: 'Editar respuesta' }).click();
      assert(await page.locator('.answer-form').isVisible());
      if (type === 'ChoiceMultiple') {
        const boxes = answer.getByRole('checkbox');
        assert(await boxes.nth(0).isChecked()); assert(await boxes.nth(1).isChecked());
        await boxes.nth(0).uncheck(); await boxes.nth(2).check();
        await answer.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
        await page.getByText('Tu respuesta está guardada', { exact: true }).waitFor();
        assert.deepEqual(JSON.parse(sent.value).selectedOptionIds, ['b', 'c']);
        responses = [{ id: 'r1', participantName: 'Alex', value: sent.value }, { id: 'r2', participantName: 'Bea', value: 'Búsqueda' }];
        await page.goto(root + '/proyeccion/TEST');
        await page.locator('.voting-results').waitFor();
        const rows = page.locator('.voting-result-list article');
        assert.equal(await rows.filter({ hasText: 'Búsqueda' }).locator('b').innerText(), '2');
        assert.equal(await rows.filter({ hasText: 'Soporte' }).locator('b').innerText(), '1');
        assert.equal(await rows.filter({ hasText: 'Acceso' }).locator('b').innerText(), '0');
        await page.screenshot({ path: 'output/playwright/question-types/ChoiceMultiple-results.png', fullPage: true });
        await page.goto(root + '/sesion/s1');
        await page.locator('[aria-label="Selecciones por participante"]').waitFor();
        assert.equal(await page.locator('.voting-result-list article').filter({ hasText: 'Búsqueda' }).locator('b').innerText(), '2');
        const individual = page.locator('[aria-label="Selecciones por participante"]');
        assert.equal(await individual.locator('article').first().locator('p').innerText(), 'Búsqueda\nSoporte');
        assert(!(await individual.innerText()).includes('selectedOptionIds'));
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 8 input types plus multiple choice, limits, designer preview, submissions, draft reload, editing, per-option projected results and 1440/390/320 layouts (mock REST/SignalR).');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
