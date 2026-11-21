// 长跑测试：双方都交给 AI，跑满若干回合，检查不崩溃且能正常结束
const fs = require('fs');
const GameData = require('../js/data.js');
const GameCore = require('../js/core.js');

const state = GameCore.createState('eastern');
let turns = 0;
let attacks = 0;
let captured = 0;

function countOwned(f) {
  let n = 0;
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.owner[y][x] === f) n += 1;
    }
  }
  return n;
}

const before1 = countOwned(1);
let winner = 0;
for (let i = 0; i < 80; i++) {
  const active = state.active;
  const events = GameCore.aiTurn(state);
  attacks += events.filter(function (e) { return e.indexOf('攻击') >= 0; }).length;
  winner = GameCore.isGameOver(state);
  if (winner) break;
  GameCore.endTurn(state);
  turns += 1;
  if (state.units.length > 24) throw new Error('单位数量失控: ' + state.units.length);
  if (state.gold[1] < 0 || state.gold[2] < 0) throw new Error('金币出现负数');
}

const after1 = countOwned(1);
console.log('回合数: ' + turns);
console.log('发生攻击次数: ' + attacks);
console.log('蓝方控制格数: ' + before1 + ' -> ' + after1);
console.log('结束状态: ' + (winner === 0 ? '未分胜负（80 回合上限）' : winner === 1 ? '蓝方胜' : '红方胜'));
console.log('单位数: ' + state.units.length + '，金币 蓝 ' + state.gold[1] + ' 红 ' + state.gold[2]);

if (turns < 2) throw new Error('回合循环没有推进');
if (attacks === 0) throw new Error('AI 从未发起攻击，行为可能失效');
if (state.units.some(function (u) { return u.hp <= 0; })) throw new Error('存在血量非正的残留单位');
if (state.units.some(function (u) { return u.x < 0 || u.y < 0 || u.x > 9 || u.y > 11; })) {
  throw new Error('存在越界单位');
}
console.log('长跑测试通过');