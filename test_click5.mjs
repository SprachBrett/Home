import { JSDOM } from 'jsdom';

const dom = await JSDOM.fromURL('http://localhost:8899/index.html', {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.onerror = (msg, src, line, col, err) => {
      console.log('EARLY WINDOW ERROR:', msg, '|', src, line, col);
      if (err && err.stack) console.log(err.stack);
    };
    window.addEventListener('unhandledrejection', (e) => {
      console.log('EARLY UNHANDLED REJECTION:', e.reason && e.reason.stack ? e.reason.stack : e.reason);
    });
    window.addEventListener('error', (e) => {
      console.log('EARLY ERROR EVENT:', e.message, e.filename, e.lineno);
    }, true);
  }
});
const { window } = dom;

await new Promise(r => setTimeout(r, 2000));
const doc = window.document;
console.log('---clicking register tab---');
doc.getElementById('auth-tab-register').click();
await new Promise(r => setTimeout(r, 200));
console.log('register form hidden:', doc.getElementById('auth-form-register').hidden);
