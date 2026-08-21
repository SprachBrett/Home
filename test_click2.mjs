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

await new Promise(r => setTimeout(r, 2500));
const doc = window.document;

// Check isConfigured via checking if the "not configured" error message appeared
console.log('auth-screen innerHTML (first 400 chars):', doc.getElementById('auth-screen').innerHTML.slice(0, 400));
