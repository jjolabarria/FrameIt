const { chromium } = require('../artifacts/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = process.env.FRAMEIT_TEST_URL || 'http://127.0.0.1:15375';
const kinds = ['ShortText', 'RichText', 'StickyNotes', 'Choice', 'Ranking', 'Voting', 'ColumnSort', 'Matrix'];
const optionKinds = ['Choice', 'Ranking', 'Voting', 'ColumnSort', 'Matrix'];
const options = [{ id: 'a', label: 'Acceso' }, { id: 'b', label: 'Búsqueda' }];
const presentation = { timerSeconds: 60, responseVisibility: 'AfterClose', responseIdentityMode: 'Named', showProgress: true, allowLateResponses: false, celebrationStyle: 'Subtle' };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    let template, saved, saves = 0, responseRequests = 0;
    const errors = [];
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path === '/api/auth/me') body = { isAuthenticated: true, name: 'Facilitador', organizationId: 'org' };
      else if (path === '/api/auth/csrf') body = { token: 'test' };
      else if (path === '/api/catalog/question-models') body = kinds.map(kind => ({ kind, description: kind }));
      else if (path === '/api/templates/types' && route.request().method() === 'PUT') { saves++; saved = route.request().postDataJSON(); template = structuredClone(saved); }
      else if (path === '/api/templates/types') body = template;
      else if (path.includes('/responses')) responseRequests++;
      else if (path === '/api/templates') body = [];
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    fs.mkdirSync('output/playwright/designer-question-config', { recursive: true });
    for (const kind of kinds) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      template = { key: 'types', title: 'Taller de prueba', objective: 'Probar configuraciones', audience: 'Equipo', facilitatorGuidance: 'Guía', sections: [{ key: 's1', title: 'Explorar', objective: 'Probar', order: 1, questions: [{ key: 'q1', title: 'Pregunta de prueba', prompt: '¿Qué priorizamos?', kind, options: optionKinds.includes(kind) ? options : [], presentation, settings: { custom: 'conservar' } }] }] };
      await page.goto(root + '/disenador?edit=types');
      await page.locator('.outline-node--question .outline-select').click();
      const config = page.locator('.question-type-settings');
      await config.waitFor();
      const before = saves;
      if (['ShortText', 'RichText', 'StickyNotes'].includes(kind)) {
        await config.getByRole('spinbutton').first().fill('0');
        await config.getByRole('alert').waitFor();
        await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
        await page.locator('.designer-issues').waitFor(); assert.equal(saves, before);
        await config.getByRole('spinbutton').first().fill('40');
        await config.getByLabel('Texto de ayuda del campo').fill('Escribe aquí tu propuesta');
      }
      if (kind === 'StickyNotes') await config.getByLabel('Máximo de notas por participante').fill('2');
      if (kind === 'Choice') {
        await config.getByLabel('Modo de selección').selectOption('multiple');
        await config.getByLabel('Máximo de opciones seleccionables').fill('0');
        await config.getByRole('alert').waitFor();
        await config.getByLabel('Máximo de opciones seleccionables').fill('2');
      }
      if (kind === 'Ranking') {
        await config.getByRole('combobox').selectOption('ascending');
        await page.locator('.designer-editor').getByRole('button', { name: 'Bajar elemento 1', exact: true }).click();
      }
      if (kind === 'Choice' || kind === 'Voting') await page.locator('.designer-editor').getByLabel('Descripción opcional').first().fill('Mejorar la entrada');
      if (kind === 'ColumnSort' || kind === 'Matrix') {
        const values = kind === 'ColumnSort' ? 'Ahora\nDespués' : 'Bajo\nAlto';
        await config.locator('textarea').fill('Repetido\nRepetido');
        await config.getByRole('alert').waitFor();
        await config.locator('textarea').fill(values);
      }
      await page.getByLabel('Tiempo (segundos)').fill('0');
      await page.screenshot({ path: `output/playwright/designer-question-config/${kind}-config.png`, fullPage: true });
      await page.getByRole('tab', { name: 'Vista previa' }).click();
      const preview = page.locator('.designer-preview');
      await preview.getByText('Sin límite', { exact: true }).waitFor();
      const send = preview.getByRole('button', { name: kind === 'Voting' ? 'Enviar voto' : 'Enviar respuesta', exact: true });
      assert(await send.isDisabled());
      if (kind === 'ShortText' || kind === 'RichText') {
        assert.equal(await preview.getByRole('textbox').getAttribute('maxlength'), '40');
        assert.equal(await preview.getByRole('textbox').getAttribute('placeholder'), 'Escribe aquí tu propuesta');
        await preview.getByRole('textbox').fill('Propuesta de prueba');
      }
      if (kind === 'StickyNotes') {
        await preview.getByLabel('Idea 1', { exact: true }).fill('Una idea');
        await preview.getByRole('button', { name: 'Añadir idea' }).click();
        assert(await preview.getByRole('button', { name: 'Añadir idea' }).isDisabled());
        await preview.getByLabel('Idea 2', { exact: true }).fill('Otra idea');
      }
      if (kind === 'Choice' || kind === 'Voting') {
        await preview.getByText('Mejorar la entrada', { exact: true }).waitFor();
        if (kind === 'Choice') { for (const checkbox of await preview.getByRole('checkbox').all()) await checkbox.check(); }
        else await preview.getByRole('radio').first().check();
      }
      if (kind === 'Ranking') {
        await preview.getByText('Ordena de menor a mayor prioridad', { exact: true }).waitFor();
        assert.match(await preview.locator('li').first().innerText(), /Búsqueda/);
        await preview.getByRole('button', { name: 'Usar este orden' }).click();
      }
      if (kind === 'ColumnSort') for (const select of await preview.getByRole('combobox').all()) await select.selectOption('Ahora');
      if (kind === 'Matrix') for (const row of await preview.locator('.matrix-row').all()) await row.getByRole('radio', { name: 'Alto', exact: true }).check();
      await send.click();
      await preview.getByRole('status').waitFor();
      if (kind === 'Choice') assert.equal(await preview.locator('.submitted-answer').innerText(), 'Acceso\nBúsqueda');
      await preview.getByRole('button', { name: 'Editar respuesta' }).click();
      assert(await send.isEnabled());
      await preview.getByRole('button', { name: 'Reiniciar' }).click();
      assert(await send.isDisabled());
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${kind} preview overflow at ${width}`);
      }
      await page.screenshot({ path: `output/playwright/designer-question-config/${kind}-preview-320.png`, fullPage: true });
      await page.getByRole('tab', { name: 'Configuración', exact: true }).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${kind} configuration overflow`);
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
      await page.waitForURL(root + '/plantillas');
      assert.equal(saves, before + 1);
      const question = saved.sections[0].questions[0];
      assert.equal(question.settings.custom, 'conservar'); assert.equal(question.presentation.timerSeconds, 0);
      if (['ShortText', 'RichText', 'StickyNotes'].includes(kind)) assert.equal(question.settings.maxLength, '40');
      if (kind === 'StickyNotes') assert.equal(question.settings.maxIdeas, '2');
      if (kind === 'Choice') { assert.equal(question.settings.selectionMode, 'multiple'); assert.equal(question.settings.maxSelections, '2'); }
      if (kind === 'ColumnSort') assert.equal(question.settings.columns, 'Ahora\nDespués');
      if (kind === 'Matrix') assert.equal(question.settings.matrixScale, 'Bajo\nAlto');
      if (kind === 'Ranking') { assert.equal(question.settings.rankingDirection, 'ascending'); assert.equal(question.options[0].id, 'b'); }
      await page.goto(root + '/disenador?edit=types');
      await page.locator('.outline-node--question .outline-select').click();
      await page.getByRole('tab', { name: 'Vista previa' }).click();
      await preview.getByText('Sin límite', { exact: true }).waitFor();
      if (kind === 'Choice') assert.equal(await preview.getByRole('checkbox').count(), 2);
    }
    assert.equal(responseRequests, 0); assert.deepEqual(errors, []);
    console.log('PASS: type-specific configuration, validation, initial ranking, limits, descriptions, simulated save/edit/reset, no response POSTs, settings persistence/reload and responsive layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
