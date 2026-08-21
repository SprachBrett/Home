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

await new Promise(r => setTimeout(r, 1500));
console.log('session key:', window.localStorage.getItem('sprachbrett_session'));

// Monkey patch addEventListener on the register tab BEFORE checking, to see call count retroactively is not possible,
// so instead let's check via getEventListeners is not available in jsdom.
// Let's instead patch console.log capturing by adding a temporary debug listener ourselves and see if OUR listener fires (proves click dispatch works)
const btn = window.document.getElementById('auth-tab-register');
btn.addEventListener('click', () => console.log('OUR TEST LISTENER FIRED'));
btn.click();
await new Promise(r => setTimeout(r, 200));
