const { chromium } = require('../artifacts/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = process.env.FRAMEIT_TEST_URL || 'http://127.0.0.1:5175';
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const clients = [{ id: 'client', name: 'Cliente vacío', industry: 'Servicios', projectCount: 0, sessionCount: 0, isArchived: false }];
  const projects = [{ id: 'project', clientId: 'client', clientName: 'Cliente vacío', name: 'Proyecto vacío', code: 'TEST', sessionCount: 0, isArchived: false }];
  const templates = [{ id: 'template', title: 'Dinámica propia', objective: 'Explorar', questionCount: 1, isBuiltIn: false, isArchived: false }, { id: 'builtin', title: 'Dinámica incorporada', objective: 'Base', questionCount: 1, isBuiltIn: true, isArchived: false }];
  const sessions = [{ id: 'session', title: 'Sesión vacía', accessCode: 'EMPTY', clientId: 'client', clientName: 'Cliente vacío', projectId: 'project', projectName: 'Proyecto vacío', projectCode: 'TEST', templateTitle: 'Dinámica propia', status: 'Draft', phase: 'Lobby', updatedAtUtc: '2026-09-10T10:00:00Z', ratingCount: 0, isArchived: false }];
  const entities = { clients, projects, templates, sessions };
  const writes = []; const errors = []; let conflict = false;
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', async route => {
   const url = new URL(route.request().url()); const path = url.pathname;
   let body = {}, status = 200;
   if (path === '/api/auth/me') body = { isAuthenticated: true, name: 'Facilitador', isAdmin: false, organizationId: 'org' };
   else if (path === '/api/auth/csrf') body = { token: 'test' };
   else if (path.startsWith('/api/lifecycle/')) {
    const [, , , kind, id] = path.split('/'); const item = entities[kind].find(x => x.id === id);
    writes.push({ method: route.request().method(), kind, id });
    if (conflict) { status = 409; body = { message: 'Este elemento tiene datos asociados. Archívalo para conservar su historial.' }; }
    else { if (route.request().method() === 'DELETE') entities[kind].splice(entities[kind].indexOf(item), 1); else item.isArchived = route.request().postDataJSON().archived; status = 204; }
   } else if (path === '/api/templates') body = templates.filter(x => x.isArchived === (url.searchParams.get('archived') === 'true'));
   else if (path.startsWith('/api/workspace/')) {
    const [, , , kind, id] = path.split('/');
    if (id) body = entities[kind].find(x => x.id === id);
    else { const items = entities[kind].filter(x => x.isArchived === (url.searchParams.get('archived') === 'true')); body = { items, totalCount: items.length, page: 1, pageSize: 25, totalPages: 1 }; }
   }
   await route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(body) });
  });
 async function openAction(name, action) {
   const row = page.locator('.collection-list > article, tbody > tr').filter({ hasText: name });
   await row.getByRole('button', { name: 'Gestionar', exact: true }).click(); await page.getByRole('menuitem', { name: action, exact: true }).click();
   await page.getByRole('dialog').waitFor();
 }
  for (const [kind, path, name] of [['templates', '/plantillas', 'Dinámica propia'], ['clients', '/clientes', 'Cliente vacío'], ['projects', '/clientes/client', 'Proyecto vacío'], ['sessions', '/sesiones', 'Sesión vacía']]) {
   await page.goto(root + path);
   await openAction(name, 'Archivar'); const before = writes.length;
   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
   assert.equal(writes.length, before);
   const row = page.locator('.collection-list > article, tbody > tr').filter({ hasText: name });
   await row.getByRole('button', { name: 'Gestionar', exact: true }).click();
   await page.getByRole('menuitem', { name: 'Archivar', exact: true }).click();
   await page.getByRole('dialog').getByRole('button', { name: 'Archivar', exact: true }).click();
   await page.getByRole('dialog').waitFor({ state: 'hidden' });
   await page.getByLabel('Mostrar', { exact: true }).selectOption('archived');
   await openAction(name, 'Restaurar');
   await page.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
   await page.getByRole('dialog').waitFor({ state: 'hidden' });
   await page.getByLabel('Mostrar', { exact: true }).selectOption('active');
   assert.equal(entities[kind][0].isArchived, false);
  }
  await page.goto(root + '/plantillas');
  assert.equal(await page.locator('.collection-list > article').filter({ hasText: 'Dinámica incorporada' }).locator('.lifecycle-actions').count(), 0);
  conflict = true; await openAction('Dinámica propia', 'Eliminar');
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'datos asociados' }).waitFor();
  assert.equal(templates.length, 2);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  conflict = false;
  await page.goto(root + '/sesiones'); await openAction('Sesión vacía', 'Eliminar');
  fs.mkdirSync('output/playwright/lifecycle', { recursive: true });
  for (const width of [1440, 390, 320]) {
   await page.setViewportSize({ width, height: 900 });
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow ${width}`);
   await page.screenshot({ path: `output/playwright/lifecycle/confirm-${width}.png`, fullPage: true });
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(sessions.length, 0);
  assert.deepEqual(errors, []);
  console.log('PASS: archive/restore for four entity types, cancellation without mutation, protected templates, dependency conflict, explicit deletion, keyboard and mobile dialog layout (mock APIs).');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
