import { JSDOM, VirtualConsole } from 'jsdom';

const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  console.log('JSDOM ERROR:', e.message);
  if (e.detail) console.log('detail:', e.detail);
});
vc.on('error', (...args) => console.log('CONSOLE ERROR:', ...args));

const dom = await JSDOM.fromURL('http://localhost:8899/index.html', {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;

await new Promise(r => setTimeout(r, 2000));
const doc = window.document;
doc.getElementById('auth-tab-register').click();
await new Promise(r => setTimeout(r, 200));
console.log('register form hidden:', doc.getElementById('auth-form-register').hidden);
