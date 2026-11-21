const { main, sleep } = require('./cdp.cjs');
(async function () {
  const ctx = await main();
  await sleep(600);
  const info = await ctx.evalJs(
    "JSON.stringify({" +
    " size: GameUI.size, ox: GameUI.ox, oy: GameUI.oy," +
    " cw: document.getElementById('board').width," +
    " ch: document.getElementById('board').height," +
    " wrapW: document.getElementById('boardWrap').clientWidth," +
    " wrapH: document.getElementById('boardWrap').clientHeight," +
    " state: GameUI.state ? GameUI.state.width + 'x' + GameUI.state.height : 'none'," +
    " units: GameUI.state ? GameUI.state.units.length : -1" +
    "})"
  );
  console.log(info);
  const err = await ctx.evalJs(
    "try { GameUI.render(); 'render ok' } catch (e) { 'ERR: ' + e.message + ' | ' + (e.stack || '').split(String.fromCharCode(10))[1] }"
  );
  console.log(err);
  console.log('errors:', ctx.errors.slice(0, 3).join(' || '));
  process.exit(0);
})().catch(function (e) { console.error('fail ' + e.message); process.exit(1); });