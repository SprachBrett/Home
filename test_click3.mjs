import { JSDOM } from 'jsdom';

const dom = await JSDOM.fromURL('http://localhost:8899/index.html', {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true
});
const { window } = dom;
window.onerror = (msg, src, line, col, err) => {
  console.log('WINDOW ERROR:', msg, '|', src, line, col);
  if (err && err.stack) console.log(err.stack);
};
window.addEventListener('unhandledrejection', (e) => {
  console.log('UNHANDLED REJECTION:', e.reason && e.reason.stack ? e.reason.stack : e.reason);
});

await new Promise(r => setTimeout(r, 2000));
const doc = window.document;
const btn = doc.getElementById('auth-tab-register');
console.log('button found:', !!btn);
btn.click();  // native click() instead of dispatchEvent
await new Promise(r => setTimeout(r, 200));
console.log('register form hidden after .click():', doc.getElementById('auth-form-register').hidden);
console.log('register tab has active class:', doc.getElementById('auth-tab-register').classList.contains('active'));
