// 规则引擎单元测试（Node 直接运行：node tests/core.test.cjs）
var assert = require('assert');
var GameData = require('../js/data.js');
var GameCore = require('../js/core.js');

var pass = 0;
var fail = 0;

function t(name, fn) {
  try {
    fn();
    pass += 1;
    console.log('  ok   ' + name);
  } catch (e) {
    fail += 1;
    console.log('  FAIL ' + name + ' -> ' + e.message);
  }
}

function fresh() {
  return GameCore.createState('eastern');
}

t('地图尺寸与单位初始状态', function () {
  var s = fresh();
  assert.strictEqual(s.width, 10);
  assert.strictEqual(s.height, 12);
  assert.strictEqual(s.units.length, 4);
  assert.strictEqual(s.gold[1], 200);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.active, 1);
});

t('首都归属初始化正确', function () {
  var s = fresh();
  assert.strictEqual(s.owner[11][2], 1);
  assert.strictEqual(s.owner[0][3], 2);
});

t('河流不可通行', function () {
  var s = fresh();
  var terr = GameCore.terrainAt(s, 0, 6);
  assert.strictEqual(terr.id, 'water');
  assert.ok(terr.impassable);
});
t('移动力计算与可达范围', function () {
  var s = fresh();
  var inf = s.units[0];
  assert.strictEqual(inf.type, 'inf');
  var reach = GameCore.reachable(s, inf);
  assert.ok(Object.keys(reach).length > 0, '应有可达格');
  assert.ok(reach[GameCore.key(1, 10)] !== undefined, '正上方一格可达');
  assert.ok(reach[GameCore.key(1, 9)] !== undefined, '两格平原应在移动力内');
  assert.ok(reach[GameCore.key(1, 8)] === undefined, '三格超出移动力');
});

t('移动并占领中立城市', function () {
  var s = fresh();
  var inf = s.units[0];
  inf.x = 2;
  inf.y = 10;
  inf.mp = 2;
  var ok = GameCore.moveUnit(s, inf, 2, 9);
  assert.strictEqual(ok, true);
  assert.strictEqual(s.owner[9][2], 1, '城市应归属蓝方');
  assert.strictEqual(s.gold[1], 220, '占领奖励 20');
});

t('攻击造成伤害并可反击', function () {
  var s = fresh();
  var a = s.units[0];
  var d = s.units[2];
  a.x = 4;
  a.y = 2;
  d.x = 4;
  d.y = 3;
  var hpBefore = d.hp;
  var res = GameCore.attack(s, a, d);
  assert.ok(res && res.damage > 0, '应产生伤害');
  assert.ok(d.hp < hpBefore, '防守方掉血');
  assert.ok(res.counter > 0, '相邻步兵应反击');
  assert.strictEqual(a.mp, 0, '攻击消耗全部移动力');
});

t('火炮两格外攻击不挨反击', function () {
  var s = fresh();
  var arty = { id: 'a1', type: 'arty', owner: 1, x: 4, y: 5, hp: 80, maxHp: 80, mp: 1 };
  var target = { id: 't1', type: 'inf', owner: 2, x: 4, y: 7, hp: 100, maxHp: 100, mp: 2 };
  s.units.push(arty, target);
  var res = GameCore.attack(s, arty, target);
  assert.ok(res.damage > 0);
  assert.strictEqual(res.counter, 0, '步兵射程 1，打不到两格外的火炮');
});
t('招募单位扣钱并受上限约束', function () {
  var s = fresh();
  var cap = GameCore.buySpot(s, 1);
  assert.ok(cap, '应能找到可招募的城市');
  var before = s.gold[1];
  var u = GameCore.buyUnit(s, 1, 'inf', cap.x, cap.y);
  assert.ok(u, '应招募成功');
  assert.strictEqual(s.gold[1], before - 60);
  assert.strictEqual(s.units.length, 5);
  var again = GameCore.buyUnit(s, 1, 'inf', cap.x, cap.y);
  assert.strictEqual(again, null, '同一格不可重复招募');
});

t('金钱不足时无法招募', function () {
  var s = fresh();
  s.gold[1] = 10;
  var cap = GameCore.buySpot(s, 1);
  assert.strictEqual(GameCore.buyUnit(s, 1, 'inf', cap.x, cap.y), null);
});

t('回合切换与收入结算', function () {
  var s = fresh();
  var income2 = GameCore.incomeOf(s, 2);
  assert.strictEqual(income2, 40, '红方只有首都');
  GameCore.endTurn(s);
  assert.strictEqual(s.active, 2);
  assert.strictEqual(s.gold[2], 240);
  GameCore.endTurn(s);
  assert.strictEqual(s.active, 1);
  assert.strictEqual(s.turn, 2, '回到蓝方时回合数加一');
  assert.strictEqual(s.gold[1], 240);
});

t('AI 行动不报错且会消耗移动力', function () {
  var s = fresh();
  GameCore.endTurn(s);
  var before = s.units.filter(function (u) { return u.owner === 2; })
    .map(function (u) { return u.x + ',' + u.y; }).join(';');
  var events = GameCore.aiTurn(s);
  var after = s.units.filter(function (u) { return u.owner === 2; })
    .map(function (u) { return u.x + ',' + u.y; }).join(';');
  assert.ok(Array.isArray(events));
  assert.notStrictEqual(before, after, 'AI 单位应发生移动');
});

t('占领敌方首都即获胜', function () {
  var s = fresh();
  s.owner[0][3] = 1;
  assert.strictEqual(GameCore.isGameOver(s), 1);
});

console.log('');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail === 0 ? 0 : 1);