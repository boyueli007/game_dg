// 长跑测试：双方 AI 对战，检查稳定性与可结束性
var assert = require('assert');
var GameData = require('../js/data.js');
var GameCore = require('../js/core.js');

var state = GameCore.createState('eastern');
var turns = 0, attacks = 0, winner = 0;

for (var i = 0; i < 120; i++) {
  var events = GameCore.aiTurn(state);
  attacks += events.filter(function (e) { return e.indexOf('攻击') >= 0; }).length;
  winner = GameCore.isGameOver(state);
  if (winner) break;
  GameCore.endTurn(state);
  turns += 1;
  assert.ok(state.units.length <= 24, '单位数量失控: ' + state.units.length);
  assert.ok(state.gold[1] >= 0 && state.gold[2] >= 0, '金币出现负数');
}

console.log('回合数: ' + turns);
console.log('攻击次数: ' + attacks);
console.log('结果: ' + (winner === 0 ? '未分胜负' : winner === 1 ? '蓝方胜' : '红方胜'));
console.log('单位数: ' + state.units.length + '  金币 ' + state.gold[1] + ' / ' + state.gold[2]);
console.log('据点 蓝 ' + GameCore.territoryCount(state, 1) + ' : ' + GameCore.territoryCount(state, 2) + ' 红');

assert.ok(turns >= 2, '回合没有推进');
assert.ok(attacks > 0, 'AI 从未发起攻击');
state.units.forEach(function (u) {
  assert.ok(u.hp > 0, '存在血量非正的单位');
  assert.ok(u.col >= 0 && u.col < state.width && u.row >= 0 && u.row < state.height, '存在越界单位');
});
console.log('长跑测试通过');