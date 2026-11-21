// 六边形版规则引擎测试（node tests/core.test.cjs）
var assert = require('assert');
var GameData = require('../js/data.js');
var GameCore = require('../js/core.js');

var pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass += 1; console.log('  ok   ' + name); }
  catch (e) { fail += 1; console.log('  FAIL ' + name + ' -> ' + e.message); }
}
function fresh() { return GameCore.createState('eastern'); }

t('地图尺寸与初始状态', function () {
  var s = fresh();
  assert.strictEqual(s.width, 11);
  assert.strictEqual(s.height, 14);
  assert.strictEqual(s.units.length, 4);
  assert.strictEqual(s.gold[1], 200);
  assert.strictEqual(s.turn, 1);
});

t('首都在正确格子上并归属双方', function () {
  var s = fresh();
  assert.strictEqual(GameCore.terrainAt(s, 3, 13).id, 'capital');
  assert.strictEqual(s.owner[13][3], 1);
  assert.strictEqual(GameCore.terrainAt(s, 3, 0).id, 'capital');
  assert.strictEqual(s.owner[0][3], 2);
  assert.strictEqual(GameCore.territoryCount(s, 1), 1);
  assert.strictEqual(GameCore.territoryCount(s, 2), 1);
});

t('六邻居数量为 6 且坐标合法', function () {
  var s = fresh();
  var nb = GameCore.neighbors(5, 5);
  assert.strictEqual(nb.length, 6);
  var inside = nb.filter(function (p) { return GameCore.inBounds(s, p[0], p[1]); });
  assert.strictEqual(inside.length, 6, '地图中部应有 6 个合法邻居');
  assert.strictEqual(GameCore.distance(5, 5, 5, 5), 0);
  assert.strictEqual(GameCore.distance(5, 5, 6, 5), 1);
});

t('距离与邻居相互一致', function () {
  var s = fresh();
  var nb = GameCore.neighbors(4, 6);
  nb.forEach(function (p) {
    if (!GameCore.inBounds(s, p[0], p[1])) return;
    assert.strictEqual(GameCore.distance(4, 6, p[0], p[1]), 1);
  });
});

t('河流不可通行', function () {
  var s = fresh();
  var terr = GameCore.terrainAt(s, 0, 6);
  assert.strictEqual(terr.id, 'water');
  assert.ok(terr.impassable);
});

t('步兵移动力与可达范围', function () {
  var s = fresh();
  var inf = s.units[0];
  assert.strictEqual(inf.type, 'inf');
  var reach = GameCore.reachable(s, inf);
  assert.ok(Object.keys(reach).length > 0);
  var max = 0;
  for (var k in reach) if (reach[k] > max) max = reach[k];
  assert.ok(max <= inf.mp, '可达消耗不应超过移动力');
});
t('移动并占领中立城市', function () {
  var s = fresh();
  var inf = s.units[0];
  inf.col = 2;
  inf.row = 11;
  inf.mp = 2;
  var ok = GameCore.moveUnit(s, inf, 2, 10);
  assert.strictEqual(ok, true, '应能移动到相邻城市');
  assert.strictEqual(s.owner[10][2], 1);
  assert.strictEqual(s.gold[1], 220, '占领奖励 20');
});

t('攻击造成伤害并可反击', function () {
  var s = fresh();
  var a = s.units[0];
  var d = s.units[2];
  a.col = 4; a.row = 5;
  d.col = 5; d.row = 5;
  var hpBefore = d.hp;
  var res = GameCore.attack(s, a, d);
  assert.ok(res && res.damage > 0);
  assert.ok(d.hp < hpBefore);
  assert.ok(res.counter > 0, '相邻应反击');
  assert.strictEqual(a.mp, 0);
});

t('火炮射程 2 时不挨反击', function () {
  var s = fresh();
  var arty = { id: 'a1', type: 'arty', owner: 1, col: 4, row: 6, hp: 80, maxHp: 80, mp: 1 };
  var target = { id: 't1', type: 'inf', owner: 2, col: 6, row: 6, hp: 100, maxHp: 100, mp: 2 };
  s.units.push(arty, target);
  assert.strictEqual(GameCore.distance(4, 6, 6, 6), 2);
  var res = GameCore.attack(s, arty, target);
  assert.ok(res.damage > 0);
  assert.strictEqual(res.counter, 0);
});

t('射程外无法攻击', function () {
  var s = fresh();
  var a = s.units[0];
  var d = s.units[2];
  a.col = 0; a.row = 0;
  d.col = 8; d.row = 12;
  assert.strictEqual(GameCore.canAttack(s, a, d), false);
});

t('招募扣钱且不可重复占格', function () {
  var s = fresh();
  var spot = GameCore.buySpot(s, 1);
  assert.ok(spot);
  var before = s.gold[1];
  assert.ok(GameCore.buyUnit(s, 1, 'inf', spot.col, spot.row));
  assert.strictEqual(s.gold[1], before - 60);
  assert.strictEqual(GameCore.buyUnit(s, 1, 'inf', spot.col, spot.row), null);
});

t('只能在己方据点招募', function () {
  var s = fresh();
  assert.strictEqual(GameCore.canBuy(s, 1, 'inf', 2, 10), false, '中立城市不可招募');
});

t('回合切换与收入', function () {
  var s = fresh();
  assert.strictEqual(GameCore.incomeOf(s, 2), 40);
  GameCore.endTurn(s);
  assert.strictEqual(s.active, 2);
  assert.strictEqual(s.gold[2], 240);
  GameCore.endTurn(s);
  assert.strictEqual(s.active, 1);
  assert.strictEqual(s.turn, 2);
});

t('AI 行动会改变局面', function () {
  var s = fresh();
  GameCore.endTurn(s);
  var before = s.units.filter(function (u) { return u.owner === 2; })
    .map(function (u) { return u.col + ',' + u.row; }).join(';');
  var events = GameCore.aiTurn(s);
  var after = s.units.filter(function (u) { return u.owner === 2; })
    .map(function (u) { return u.col + ',' + u.row; }).join(';');
  assert.ok(Array.isArray(events));
  assert.notStrictEqual(before, after);
});

t('占领敌都判定胜利', function () {
  var s = fresh();
  s.owner[0][3] = 1;
  assert.strictEqual(GameCore.isGameOver(s), 1);
});

console.log('');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail === 0 ? 0 : 1);