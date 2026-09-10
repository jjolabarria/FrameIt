const { chromium } = require('../artifacts/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = process.env.FRAMEIT_TEST_URL || 'http://127.0.0.1:5175';
const presentation = { timerSeconds: 60, responseVisibility: 'AfterClose', responseIdentityMode: 'Mixed', showProgress: true, allowLateResponses: false, celebrationStyle: 'Subtle' };
const source = { schemaVersion: 'frameit.dynamic-template/v2', key: 'original', title: 'Taller original', objective: 'Priorizar mejoras', audience: 'Equipo', facilitatorGuidance: 'Guía que debe conservarse', outcomeBuckets: ['decidido'], sections: [{ key: 's1', title: 'Explorar', objective: 'Descubrir', order: 1, questions: [{ key: 'q1', title: 'Mejoras', kind: 'Choice', prompt: '¿Qué priorizamos?', options: [{ id: 'a', label: 'Acceso', description: 'Acceso sencillo' }, { id: 'b', label: 'Búsqueda' }], presentation, settings: { custom: 'preserve' } }] }] };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    let mode = 'proposal', available = true, lastRequest, saved, requests = 0;
    const errors = [];
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {}, status = 200;
      if (path === '/api/auth/me') body = { isAuthenticated: true, name: 'Facilitador', isAdmin: false, organizationId: 'org', organizationName: 'Organización de prueba' };
      else if (path === '/api/auth/csrf') body = { token: 'test' };
      else if (path === '/api/catalog/question-models') body = ['ShortText', 'Choice'].map(kind => ({ kind, description: kind }));
      else if (path === '/api/templates/assistant/capabilities') body = { available };
      else if (path === '/api/templates/original') body = source;
      else if (path === '/api/templates/assistant') {
        requests++; lastRequest = route.request().postDataJSON();
        if (mode === 'delay') await new Promise(resolve => setTimeout(resolve, 800));
        if (mode === 'error') { status = 502; body = { message: 'No se pudo generar' }; }
        else if (mode === 'clarify') body = { message: '¿Cuántas personas participan?', draft: null };
        else { const draft = structuredClone(lastRequest.draft); draft.title = 'Propuesta revisada'; draft.facilitatorGuidance = 'Guía propuesta'; body = { message: 'He concretado la dinámica.', draft }; }
      }
      else if (path === '/api/templates' && route.request().method() === 'POST') { saved = route.request().postDataJSON(); body = 'saved-id'; }
      else if (path === '/api/templates') body = [];
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(root + '/disenador?from=original');
    await page.getByText('Estás creando una variante.', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Taller original — variante');
    assert.equal(await page.locator('textarea').nth(1).inputValue(), source.facilitatorGuidance);
    await page.getByRole('button', { name: 'Diseñar con IA', exact: true }).click();
    await page.getByLabel('Contexto del taller').fill('Hazla más concreta');
    mode = 'clarify'; await page.getByRole('button', { name: 'Generar propuesta', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.getByText('¿Cuántas personas participan?').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Aplicar al borrador', exact: true }).count(), 0);
    mode = 'proposal'; await page.getByLabel('¿Qué quieres ajustar?').fill('12 personas');
    await page.getByRole('button', { name: 'Pedir ajuste', exact: true }).click();
    await page.getByRole('button', { name: 'Aplicar al borrador', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Taller original — variante');
    assert.equal(lastRequest.history.length, 2);
    await page.getByRole('button', { name: 'Aplicar al borrador', exact: true }).click();
    assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Propuesta revisada');
    await page.getByLabel('Título', { exact: true }).fill('Cambio manual');
    await page.getByRole('button', { name: 'Deshacer aplicación', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
    assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Taller original — variante');
    await page.getByLabel('Aplicar el ajuste a').selectOption('question');
    await page.getByLabel('¿Qué quieres ajustar?').fill('Mejora esta pregunta');
    mode = 'delay'; await page.getByRole('button', { name: 'Pedir ajuste', exact: true }).click();
    await page.getByLabel('Título', { exact: true }).fill('Edición concurrente');
    await page.getByText('El borrador ha cambiado.', { exact: false }).waitFor();
    assert.equal(lastRequest.scope, 'question'); assert.equal(lastRequest.questionKey, 'q1');
    assert(await page.getByRole('button', { name: 'Aplicar al borrador', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Descartar', exact: true }).click();
    mode = 'error'; await page.getByLabel('¿Qué quieres ajustar?').fill('Provoca un error');
    await page.getByRole('button', { name: 'Pedir ajuste', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'No se pudo completar' }).waitFor();
    assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Edición concurrente');
    mode = 'delay'; await page.getByRole('button', { name: 'Pedir ajuste', exact: true }).click();
    await page.getByRole('button', { name: 'Cancelar generación', exact: true }).click();
    await page.getByText('Generación cancelada.', { exact: false }).waitFor();
    mode = 'proposal'; await page.getByLabel('¿Qué quieres ajustar?').fill('Propuesta final');
    await page.getByRole('button', { name: 'Pedir ajuste', exact: true }).click();
    await page.getByRole('button', { name: 'Aplicar al borrador', exact: true }).waitFor();
    fs.mkdirSync('output/playwright/template-assistant', { recursive: true });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
      await page.screenshot({ path: `output/playwright/template-assistant/assistant-${width}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: 'Aplicar al borrador', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar variante', exact: true }).click();
    await page.waitForURL(root + '/plantillas');
    assert(saved.key !== source.key); assert.equal(saved.sections[0].questions[0].settings.custom, 'preserve');
    assert.equal(saved.sections[0].questions[0].options[0].description, 'Acceso sencillo');
    const before = requests; available = false;
    await page.goto(root + '/disenador'); await page.getByRole('button', { name: 'Diseñar con IA', exact: true }).click();
    await page.getByText('El asistente aún no está configurado.', { exact: false }).waitFor();
    assert(await page.getByRole('button', { name: 'Generar propuesta', exact: true }).isDisabled()); assert.equal(requests, before);
    assert.deepEqual(errors, []);
    console.log('PASS: variant preservation, clarification, generation, explicit apply, undo confirmation, partial selection, stale response, error, cancellation, save, unavailable provider and desktop/mobile layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
