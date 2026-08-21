import { JSDOM } from 'jsdom';

const dom = await JSDOM.fromURL('http://localhost:8899/index.html', {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true
});

dom.window.onerror = (msg, src, line, col, err) => {
  console.log('WINDOW ERROR:', msg, '|', src, line, col);
  if (err && err.stack) console.log(err.stack);
};
dom.window.addEventListener('unhandledrejection', (e) => {
  console.log('UNHANDLED REJECTION:', e.reason && e.reason.stack ? e.reason.stack : e.reason);
});

await new Promise(r => setTimeout(r, 2500));
console.log('--- done waiting ---');
console.log('login-submit exists:', !!dom.window.document.getElementById('login-submit'));
console.log('auth-screen display:', dom.window.getComputedStyle(dom.window.document.getElementById('auth-screen')).display);
