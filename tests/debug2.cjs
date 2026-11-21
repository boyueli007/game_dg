const { main, sleep } = require('./cdp.cjs');
(async function () {
  const ctx = await main();
  await sleep(700);
  const r = await ctx.evalJs(
    "(function(){" +
    " try {" +
    "  GameUI.state.gold[1] = 999;" +
    "  GameUI.openPanel();" +
    "  var p = document.getElementById('panel');" +
    "  var vis = getComputedStyle(p).display !== 'none';" +
    "  GameUI.chooseType('tank');" +
    "  var spot = GameCore.buySpot(GameUI.state, 1);" +
    "  if (!spot) return 'no spot, vis=' + vis + ', mode=' + GameUI.mode;" +
    "  var before = GameUI.state.units.length;" +
    "  GameUI.onCell({ col: spot.col, row: spot.row });" +
    "  return 'vis=' + vis + ' before=' + before + ' after=' + GameUI.state.units.length + ' mode=' + GameUI.mode;" +
    " } catch (e) { return 'ERR ' + e.message + ' @ ' + (e.stack||'').split(String.fromCharCode(10))[1]; }" +
    "})()"
  );
  console.log(r);
  process.exit(0);
})().catch(function (e) { console.error('fail ' + e.message); process.exit(1); });