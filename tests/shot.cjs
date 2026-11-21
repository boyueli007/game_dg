// 截图脚本：初始局面、选中部队、招募面板
const fs = require('fs');
const { main, sleep } = require('./cdp.cjs');

(async function () {
  const ctx = await main();
  await sleep(400);

  async function shot(file) {
    const r = await ctx.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    console.log('saved ' + file);
  }

  await shot('/tmp/shot-1-start.png');

  await ctx.evalJs(
    "var u = GameUI.state.units.filter(function (x) { return x.owner === 1; })[1]; " +
    "GameUI.selectUnit(u); true"
  );
  await sleep(300);
  await shot('/tmp/shot-2-select.png');

  await ctx.evalJs("GameUI.state.gold[1] = 500; GameUI.openPanel(); true");
  await sleep(300);
  await shot('/tmp/shot-3-buy.png');

  process.exit(0);
})().catch(function (e) {
  console.error('截图失败: ' + e.message);
  process.exit(1);
});