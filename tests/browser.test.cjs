// 六边形版浏览器集成测试
const { main, t, sleep, stats } = require('./cdp.cjs');

(async function () {
  const ctx = await main();
  const run = ctx.evalJs;

  t('全局对象已加载', await run(
    "typeof GameData === 'object' && typeof GameCore === 'object' && typeof GameUI === 'object'"
  ));

  t('初始状态与地图尺寸', await run(
    "GameUI.state.width === 11 && GameUI.state.height === 14 && GameUI.state.units.length === 4"
  ));

  t('画布尺寸与六边形粒度正常', await run(
    "var c = document.getElementById('board');" +
    "c.width > 100 && c.height > 100 && GameUI.size >= 10"
  ));

  t('棋盘确实绘制了像素', await run(
    "(function(){var c=document.getElementById('board');var g=c.getContext('2d');" +
    "var d=g.getImageData(0,0,c.width,c.height).data;var n=0;" +
    "for(var i=3;i<d.length;i+=400){if(d[i]>0)n++;}return n>200;})()"
  ));

  t('HUD 显示回合与目标', await run(
    "document.getElementById('turnInfo').textContent.indexOf('回合')>=0 &&" +
    "document.getElementById('objective').textContent.length>4"
  ));

  t('选中部队出现可达格与信息卡', await run(
    "var u=GameUI.state.units.filter(function(x){return x.owner===1;})[0];" +
    "GameUI.selectUnit(u);" +
    "Object.keys(GameUI.reach).length>0 &&" +
    "document.getElementById('cardName').textContent.indexOf('蓝军')>=0"
  ));

  t('兵工厂面板可见并能出兵', await run(
    "(function(){try{" +
    "GameUI.clearSel();" +
    "GameUI.state.gold[1]=999;" +
    "GameUI.openPanel();" +
    "var p=document.getElementById('panel');" +
    "var vis=getComputedStyle(p).display!=='none'&&p.getBoundingClientRect().height>40;" +
    "var spot=GameCore.buySpot(GameUI.state,1);" +
    "if(!spot) return false;" +
    "GameUI.chooseType('inf');" +
    "var before=GameUI.state.units.length;" +
    "GameUI.onCell({col:spot.col,row:spot.row});" +
    "return vis&&GameUI.state.units.length===before+1&&GameUI.state.gold[1]<999;" +
    "}catch(e){return false;}})()"
  ));

  t('点可达格能移动', await run(
    "(function(){try{" +
    "var u=GameUI.state.units.filter(function(x){return x.owner===1&&x.mp>0;})[0];" +
    "if(!u) return false;" +
    "GameUI.selectUnit(u);" +
    "var keys=Object.keys(GameUI.reach).filter(function(k){" +
    "var p=k.split(','); var terr=GameCore.terrainAt(GameUI.state,+p[0],+p[1]);" +
    "return !terr.capturable;});" +
    "if(!keys.length) return false;" +
    "var before=u.col+','+u.row;" +
    "var p2=keys[0].split(',');" +
    "GameUI.onCell({col:+p2[0],row:+p2[1]});" +
    "var now=GameUI.state.units.filter(function(x){return x.id===u.id;})[0];" +
    "return now.col+','+now.row!==before;" +
    "}catch(e){return false;}})()"
  ));

  t('伤害飘字进入队列', await run(
    "GameUI.popDamage(3,3,'-42','#ff6b6b'); GameUI.floaters.length>0"
  ));

  await run("GameUI.clearSel(); GameUI.endTurn(); true");
  await sleep(1100);

  t('结束回合后电脑行动并交还', await run(
    "GameUI.state.turn===2 && GameUI.state.active===1"
  ));

  t('胜利面板可见', await run(
    "(function(){try{" +
    "GameUI.state.owner[0][3]=1;" +
    "GameUI.checkOver();" +
    "var o=document.getElementById('over');" +
    "return !o.classList.contains('hidden')&&o.getBoundingClientRect().height>100;" +
    "}catch(e){return false;}})()"
  ));

  const errs = ctx.errors.filter(function (e) { return e.indexOf('favicon') < 0; });
  t('无脚本报错', errs.length === 0, errs.join(' ; ').slice(0, 300));

  const s = stats();
  console.log('');
  console.log('通过 ' + s.pass + ' 项，失败 ' + s.fail + ' 项');
  process.exit(s.fail === 0 ? 0 : 1);
})().catch(function (e) {
  console.error('测试异常: ' + e.message);
  process.exit(1);
});