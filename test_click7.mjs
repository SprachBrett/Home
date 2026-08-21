import { JSDOM } from 'jsdom';
const dom = await JSDOM.fromURL('http://localhost:8899/index.html', {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true
});
const { window } = dom;
await new Promise(r => setTimeout(r, 2000));
const doc = window.document;
// wirePasswordToggles should have inserted a .pw-toggle button next to login-password
console.log('pw-toggle buttons count:', doc.querySelectorAll('.pw-toggle').length);
console.log('login-password parent class:', doc.getElementById('login-password').parentElement.className);
