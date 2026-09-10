const { chromium } = require('../artifacts/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = process.env.FRAMEIT_TEST_URL || 'http://127.0.0.1:5174';
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 const context = await browser.newContext();
 let authenticated=false, pending=false, failCheck=false, rejectData=false;
 const privateRequests=[]; const errors=[];
 await context.route('**/api/**', async r=>{
  const path=new URL(r.request().url()).pathname;
  let body={},status=200;
  if(path==='/api/auth/me') {if(failCheck)status=503;body={isAuthenticated:authenticated,name:authenticated?'Facilitador':null};}
  else if(path==='/api/auth/status')body={setupRequired:false,isAuthenticated:authenticated,pending:pending?'login':null};
  else if(path==='/api/auth/csrf')body={token:'test-token'};
  else if(path==='/api/auth/login'){pending=true;body={step:'login'};}
  else if(path==='/api/auth/verify') {if(r.request().postDataJSON().code!=='123456'){status=401;body={message:'Código incorrecto'};}else{authenticated=true;pending=false;body={complete:true};}}
  else if(path==='/api/auth/logout'){authenticated=false;status=204;}
  else if(path==='/api/auth/cancel'){pending=false;status=204;}
  else {privateRequests.push(path);if(rejectData){authenticated=false;status=401;}else body=path.endsWith('overview')?{clients:0,projects:0,templates:0,liveSessions:0,recent:[],active:[]}:{items:[{id:'c1',name:'Cliente privado',industry:'',projectCount:0,sessionCount:0}],totalCount:1,page:1,pageSize:25,totalPages:1};}
  await r.fulfill(status===204?{status}:{status,json:body});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const results=[];
 for(const route of ['/espacio','/clientes','/clientes/c1','/clientes/c1/proyectos/p1','/sesiones','/sesion/s1','/plantillas','/disenador','/seguridad']){
  await page.goto(root+route);await page.waitForURL('**/acceso?**');await page.getByRole('heading',{name:'Accede a tu espacio'}).waitFor();
  assert.equal(await page.locator('.workspace-shell').count(),0);
  assert.equal(new URL(page.url()).searchParams.get('returnTo'),route);
 }
 assert.deepEqual(privateRequests,[]);results.push('9 private routes redirect before mounting backoffice or fetching private data');
 for(const route of ['/','/join','/privacidad','/aviso-legal','/cookies','/proyeccion']){await page.goto(root+route);assert.equal(new URL(page.url()).pathname,route);}
 results.push('Public routes remain accessible');
 await page.goto(root+'/clientes?q=test#list');await page.waitForURL('**/acceso?**');
 await page.getByLabel('Usuario',{exact:true}).fill('facilitador');await page.getByLabel('Contraseña',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.getByRole('heading',{name:'Verifica tu identidad'}).waitFor();assert.equal(await page.locator('.workspace-shell').count(),0);
 await page.getByLabel('Código de 6 dígitos').fill('000000');await page.getByRole('button',{name:'Verificar y continuar'}).click();await page.getByRole('alert').filter({hasText:'Código incorrecto'}).waitFor();
 await page.getByLabel('Código de 6 dígitos').fill('123456');await page.getByRole('button',{name:'Verificar y continuar'}).click();await page.waitForURL('**/clientes?q=test#list');await page.getByText('Cliente privado',{exact:true}).waitFor();
 results.push('Password and second factor required; errors recover; return preserves query and hash');
 rejectData=true;
 await page.getByPlaceholder('Buscar cliente o sector').fill('expired');
 await page.waitForURL('**/acceso?**');assert.equal(new URL(page.url()).searchParams.get('reason'),'expired');assert.equal(await page.locator('.workspace-shell').count(),0);
 // The backend session is expired as well for the next status request.
 authenticated=false;rejectData=false;
 results.push('401 unmounts private content and redirects to login');
 await page.goto(root+'/clientes');await page.waitForURL('**/acceso?**');
 for(const width of [1440,320]) {await page.setViewportSize({width,height:950});await page.getByRole('heading',{name:'Accede a tu espacio'}).waitFor();await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);fs.mkdirSync('output/playwright/loginwall',{recursive:true});await page.screenshot({path:`output/playwright/loginwall/access-${width}.png`,fullPage:true});}
 results.push('Desktop and mobile login fit without horizontal overflow');
 authenticated=true;await page.goto(root+'/acceso?returnTo=https%3A%2F%2Fevil.example');await page.waitForURL(root+'/espacio');results.push('External returnTo rejected');
 const second=await context.newPage();await second.goto(root+'/clientes');await second.getByText('Cliente privado',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.waitForURL('**/acceso?**');await second.waitForURL('**/acceso?**');assert.equal(await second.locator('.workspace-shell').count(),0);results.push('Logout removes backoffice in both tabs');
 failCheck=true;await page.goto(root+'/clientes');await page.getByRole('heading',{name:'No podemos comprobar tu acceso'}).waitFor();assert.equal(await page.locator('.workspace-shell').count(),0);failCheck=false;await page.getByRole('button',{name:'Reintentar',exact:true}).click();await page.waitForURL('**/acceso?**');results.push('Network error fails closed and retry recovers');
 assert.deepEqual(errors,[]);fs.writeFileSync('output/playwright/loginwall/results.json',JSON.stringify(results,null,2));console.log(results);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
