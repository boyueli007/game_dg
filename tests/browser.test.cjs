// 页面级集成测试：真实浏览器里跑一遍选兵、移动、结束回合、招募、结算
const { main, t, sleep, stats } = require('./cdp.cjs');

(async function () {
  const ctx = await main();
  const run = ctx.evalJs;

  t('三个全局对象已加载', await run(
    "typeof GameData === 'object' && typeof GameCore === 'object' && typeof GameUI === 'object'"
  ));

  t('初始状态正确', await run(
    "GameUI.state.width === 10 && GameUI.state.height === 12 && GameUI.state.units.length === 4 && GameUI.state.turn === 1"
  ));

  t('画布已按屏幕尺寸初始化', await run(
    "document.getElementById('board').width > 100 && document.getElementById('board').height > 100"
  ));

  t('HUD 显示回合信息', await run(
    "document.getElementById('turnInfo').textContent.indexOf('回合') >= 0"
  ));

  t('选中部队后出现可达格', await run(
    "var u = GameUI.state.units.filter(function (x) { return x.owner === 1; })[0];" +
    "GameUI.selectUnit(u);" +
    "Object.keys(GameUI.reach).length > 0"
  ));

  t('点击蓝格可以移动', await run(
    "var u = GameUI.sel;" +
    "var before = u.x + ',' + u.y;" +
    "GameUI.onCell({ x: 1, y: 10 });" +
    "var moved = GameUI.state.units.filter(function (x) { return x.id === u.id; })[0];" +
    "moved ? before !== (moved.x + ',' + moved.y) : false"
  ));

  await run("GameUI.clearSel(); GameUI.endTurn(); true");
  await sleep(1100);

  t('结束回合后电脑行动并交还控制权', await run(
    "GameUI.state.turn === 2 && GameUI.state.active === 1"
  ));

  t('电脑行动后有日志记录', await run(
    "GameUI.state.log.length > 0"
  ));

  t('招募面板可见且能放置部队', await run(
    "GameUI.state.gold[1] = 999;" +
    "GameUI.openPanel();" +
    "var panel = document.getElementById('panel');" +
    "var visible = panel.getBoundingClientRect().height > 40 && getComputedStyle(panel).display !== 'none';" +
    "GameUI.chooseType('inf');" +
    "var spot = GameCore.buySpot(GameUI.state, 1);" +
    "var before = GameUI.state.units.length;" +
    "GameUI.onCell({ x: spot.x, y: spot.y });" +
    "var placed = GameUI.state.units.length === before + 1 && GameUI.state.gold[1] < 999;" +
    "visible && placed"
  ));

  t('占领敌都触发可见的结算面板', await run(
    "GameUI.state.owner[0][3] = 1;" +
    "GameUI.checkOver();" +
    "var over = document.getElementById('over');" +
    "var shown = !over.classList.contains('hidden') && getComputedStyle(over).display !== 'none' && over.getBoundingClientRect().height > 100;" +
    "shown && over.querySelector('.over-title').textContent.length > 0"
  ));

  const errs = ctx.errors;
  t('页面无脚本报错', errs.length === 0, errs.join(' ; ').slice(0, 300));

  const s = stats();
  console.log('');
  console.log('通过 ' + s.pass + ' 项，失败 ' + s.fail + ' 项');
  process.exit(s.fail === 0 ? 0 : 1);
})().catch(function (e) {
  console.error('测试异常: ' + e.message);
  process.exit(1);
});