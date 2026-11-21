// 浏览器集成测试：通过 Chrome DevTools Protocol 驱动真实页面
// 用法：node tests/browser.test.mjs
const BASE = process.env.GAME_URL || 'http://127.0.0.1:8123/';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';

let pass = 0;
let fail = 0;

function t(name, ok, extra) {
  if (ok) {
    pass += 1;
    console.log('  ok   ' + name);
  } else {
    fail += 1;
    console.log('  FAIL ' + name + (extra ? ' -> ' + extra : ''));
  }
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function main() {
  const list = await (await fetch(CDP + '/json/list')).json();
  const page = list.find(function (x) { return x.type === 'page'; });
  if (!page) throw new Error('找不到可调试的页面');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  let seq = 0;

  ws.addEventListener('message', function (ev) {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(d.text + ' ' + (d.exception && d.exception.description ? d.exception.description : ''));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push(msg.params.entry.text);
    }
  });

  await new Promise(function (r) { ws.addEventListener('open', r); });

  function send(method, params) {
    return new Promise(function (resolve) {
      seq += 1;
      pending.set(seq, resolve);
      ws.send(JSON.stringify({ id: seq, method: method, params: params || {} }));
    });
  }

  async function evalJs(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) {
      throw new Error(r.result.exceptionDetails.text);
    }
    return r.result.result.value;
  }

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: BASE });
  await sleep(1600);
  return { send: send, evalJs: evalJs, errors: errors };
}

module.exports = { main: main, t: t, sleep: sleep, stats: function () { return { pass: pass, fail: fail }; } };