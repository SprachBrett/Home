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
window.fetch = async (url, opts) => {
  console.log('FETCH CALLED:', url);
  throw new Error('network disabled in test');
};

await new Promise(r => setTimeout(r, 2000));

const doc = window.document;
console.log('Klicke auf Registrieren-Tab...');
doc.getElementById('auth-tab-register').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 200));
console.log('register form hidden attr:', doc.getElementById('auth-form-register').hidden);

console.log('Tippe Benutzername und klicke Registrieren...');
doc.getElementById('register-username').value = 'testuser123';
doc.getElementById('register-username').dispatchEvent(new window.Event('input', { bubbles: true }));
await new Promise(r => setTimeout(r, 700));

doc.getElementById('register-password').value = 'abcdef';
doc.getElementById('register-password2').value = 'abcdef';
doc.getElementById('register-submit').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 1000));
console.log('--- fertig ---');
