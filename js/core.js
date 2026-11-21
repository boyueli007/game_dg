// 欧陆战争 手机版 - 规则引擎（纯逻辑，可在 Node 下测试）
// 依赖 GameData；浏览器下为全局 GameCore。
if (typeof module === 'object' && module.exports) {
  global.GameData = require('./data.js');
}

var GameCore = {};

GameCore.key = function (x, y) { return x + ',' + y; };

GameCore.inBounds = function (state, x, y) {
  return x >= 0 && y >= 0 && x < state.width && y < state.height;
};

GameCore.terrainAt = function (state, x, y) {
  if (!GameCore.inBounds(state, x, y)) return null;
  return GameData.TERRAIN[state.grid[y][x]];
};

GameCore.unitAt = function (state, x, y) {
  for (var i = 0; i < state.units.length; i++) {
    if (state.units[i].x === x && state.units[i].y === y) return state.units[i];
  }
  return null;
};

GameCore.neighbors = function (x, y) {
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
};

GameCore.log = function (state, text) {
  state.log.push({ turn: state.turn, faction: state.active, text: text });
  if (state.log.length > 60) state.log.shift();
};
GameCore.createState = function (mapId) {
  var map = GameData.MAPS[mapId || 'eastern'];
  var grid = map.rows.map(function (row) {
    return row.split('').map(function (ch) {
      if (ch === 'f') return 'forest';
      if (ch === 'm') return 'mountain';
      if (ch === 'w') return 'water';
      if (ch === 'c') return 'city';
      if (ch === 'C') return 'capital';
      return 'plain';
    });
  });
  var owner = grid.map(function (row) {
    return row.map(function () { return 0; });
  });
  map.capitals.forEach(function (c) { owner[c.y][c.x] = c.owner; });
  var units = map.startUnits.map(function (s, i) {
    var def = GameData.UNITS[s.type];
    return {
      id: 'u' + i, type: s.type, owner: s.owner, x: s.x, y: s.y,
      hp: def.hp, maxHp: def.hp, mp: def.move
    };
  });
  var gold = {};
  gold[1] = GameData.RULES.startGold;
  gold[2] = GameData.RULES.startGold;
  return {
    mapId: map.id, width: map.rows[0].length, height: map.rows.length,
    grid: grid, owner: owner, units: units, gold: gold,
    turn: 1, active: 1, winner: 0, log: []
  };
};
// 以当前剩余移动力做代价最小的可达范围搜索，返回 key 到消耗的映射
GameCore.reachable = function (state, unit) {
  var start = GameCore.key(unit.x, unit.y);
  var costs = {};
  costs[start] = 0;
  var queue = [{ x: unit.x, y: unit.y, cost: 0 }];
  while (queue.length) {
    queue.sort(function (a, b) { return a.cost - b.cost; });
    var cur = queue.shift();
    if (cur.cost !== costs[GameCore.key(cur.x, cur.y)]) continue;
    var nb = GameCore.neighbors(cur.x, cur.y);
    for (var i = 0; i < nb.length; i++) {
      var nx = nb[i][0], ny = nb[i][1];
      if (!GameCore.inBounds(state, nx, ny)) continue;
      var terr = GameCore.terrainAt(state, nx, ny);
      if (terr.impassable) continue;
      var occ = GameCore.unitAt(state, nx, ny);
      if (occ && occ.owner !== unit.owner) continue;
      var next = cur.cost + terr.move;
      if (next > unit.mp) continue;
      var k = GameCore.key(nx, ny);
      if (costs[k] === undefined || next < costs[k]) {
        costs[k] = next;
        queue.push({ x: nx, y: ny, cost: next });
      }
    }
  }
  delete costs[start];
  var out = {};
  for (var key in costs) {
    var parts = key.split(',');
    if (GameCore.unitAt(state, +parts[0], +parts[1])) continue;
    out[key] = costs[key];
  }
  return out;
};
GameCore.damageOf = function (state, attacker, defender, factor) {
  var at = GameData.UNITS[attacker.type];
  var dt = GameData.UNITS[defender.type];
  var terr = GameCore.terrainAt(state, defender.x, defender.y);
  var atkPower = at.atk * (attacker.hp / at.hp) * (factor || 1);
  var defPower = dt.def * (defender.hp / dt.hp) * (terr ? terr.defense : 1);
  var dmg = Math.round(atkPower * 100 / (100 + defPower) * 1.55);
  return Math.max(6, dmg);
};

GameCore.canAttack = function (state, unit, target) {
  if (!target || target.owner === unit.owner) return false;
  var at = GameData.UNITS[unit.type];
  var d = Math.abs(unit.x - target.x) + Math.abs(unit.y - target.y);
  return d <= at.range;
};

GameCore.attack = function (state, attacker, defender) {
  if (!GameCore.canAttack(state, attacker, defender)) return null;
  var dmg = GameCore.damageOf(state, attacker, defender, 1);
  defender.hp -= dmg;
  var res = { damage: dmg, counter: 0, killed: false, text: '' };
  res.text = GameData.UNITS[attacker.type].name + ' 攻击 ' +
             GameData.UNITS[defender.type].name + '，造成 ' + dmg + ' 伤害';
  if (defender.hp <= 0) {
    res.killed = true;
    res.text += '，将其歼灭';
    state.units = state.units.filter(function (u) { return u.id !== defender.id; });
  } else {
    var d = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
    var dt = GameData.UNITS[defender.type];
    if (d <= dt.range) {
      var cd = GameCore.damageOf(state, defender, attacker, GameData.RULES.counterFactor);
      attacker.hp -= cd;
      res.counter = cd;
      res.text += '，遭到反击 ' + cd;
      if (attacker.hp <= 0) {
        res.attackerKilled = true;
        res.text += '，进攻部队被摧毁';
        state.units = state.units.filter(function (u) { return u.id !== attacker.id; });
      }
    }
  }
  attacker.mp = 0;
  GameCore.log(state, res.text);
  return res;
};
GameCore.moveUnit = function (state, unit, x, y) {
  var reach = GameCore.reachable(state, unit);
  var k = GameCore.key(x, y);
  if (reach[k] === undefined) return false;
  unit.mp -= reach[k];
  unit.x = x;
  unit.y = y;
  GameCore.capture(state, unit);
  return true;
};

GameCore.capture = function (state, unit) {
  var terr = GameCore.terrainAt(state, unit.x, unit.y);
  if (!terr || !terr.capturable) return null;
  var def = GameData.UNITS[unit.type];
  if (!def.capture) return null;
  var cur = state.owner[unit.y][unit.x];
  if (cur === unit.owner) return null;
  state.owner[unit.y][unit.x] = unit.owner;
  state.gold[unit.owner] += GameData.RULES.captureBonus;
  GameCore.log(state, GameData.FACTIONS[unit.owner].name + ' 占领了' + terr.name);
  return true;
};

GameCore.incomeOf = function (state, faction) {
  var sum = 0;
  for (var y = 0; y < state.height; y++) {
    for (var x = 0; x < state.width; x++) {
      if (state.owner[y][x] !== faction) continue;
      var terr = GameData.TERRAIN[state.grid[y][x]];
      if (terr.capital) sum += GameData.RULES.capitalIncome;
      else if (terr.capturable) sum += GameData.RULES.cityIncome;
    }
  }
  return sum;
};
GameCore.endTurn = function (state) {
  var next = state.active === 1 ? 2 : 1;
  state.units.forEach(function (u) {
    if (u.owner === next) u.mp = GameData.UNITS[u.type].move;
  });
  state.gold[next] += GameCore.incomeOf(state, next);
  state.active = next;
  if (next === 1) state.turn += 1;
  return state;
};

GameCore.canBuy = function (state, faction, typeId, x, y) {
  var def = GameData.UNITS[typeId];
  if (!def) return false;
  if (!GameCore.inBounds(state, x, y)) return false;
  if (state.owner[y][x] !== faction) return false;
  if (GameCore.unitAt(state, x, y)) return false;
  if (state.gold[faction] < def.cost) return false;
  var count = 0;
  state.units.forEach(function (u) { if (u.owner === faction) count += 1; });
  return count < GameData.RULES.unitCap;
};

GameCore.buyUnit = function (state, faction, typeId, x, y) {
  if (!GameCore.canBuy(state, faction, typeId, x, y)) return null;
  var def = GameData.UNITS[typeId];
  state.gold[faction] -= def.cost;
  var u = {
    id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    type: typeId, owner: faction, x: x, y: y,
    hp: def.hp, maxHp: def.hp, mp: 0
  };
  state.units.push(u);
  GameCore.log(state, GameData.FACTIONS[faction].name + ' 招募了' + def.name);
  return u;
};
GameCore.isGameOver = function (state) {
  var cap1 = false, cap2 = false, n1 = 0, n2 = 0;
  for (var y = 0; y < state.height; y++) {
    for (var x = 0; x < state.width; x++) {
      var terr = GameData.TERRAIN[state.grid[y][x]];
      if (!terr.capital) continue;
      if (state.owner[y][x] === 1) cap1 = true;
      if (state.owner[y][x] === 2) cap2 = true;
    }
  }
  state.units.forEach(function (u) {
    if (u.owner === 1) n1 += 1; else n2 += 1;
  });
  if (!cap2 || n2 === 0) return 1;
  if (!cap1 || n1 === 0) return 2;
  if (state.turn > 30) {
    var t1 = GameCore.territoryCount(state, 1);
    var t2 = GameCore.territoryCount(state, 2);
    if (t1 !== t2) return t1 > t2 ? 1 : 2;
    var h1 = GameCore.strengthOf(state, 1);
    var h2 = GameCore.strengthOf(state, 2);
    if (h1 !== h2) return h1 > h2 ? 1 : 2;
    if (state.gold[1] !== state.gold[2]) return state.gold[1] > state.gold[2] ? 1 : 2;
  }
  return 0;
};

GameCore.strengthOf = function (state, faction) {
  var sum = 0;
  state.units.forEach(function (u) {
    if (u.owner === faction) sum += Math.max(0, u.hp);
  });
  return sum;
};

GameCore.territoryCount = function (state, faction) {
  var n = 0;
  for (var y = 0; y < state.height; y++) {
    for (var x = 0; x < state.width; x++) {
      var terr = GameData.TERRAIN[state.grid[y][x]];
      if (terr.capturable && state.owner[y][x] === faction) n += 1;
    }
  }
  return n;
};

GameCore.findPath = function (state, unit, tx, ty) {
  var from = {};
  var start = GameCore.key(unit.x, unit.y);
  from[start] = null;
  var queue = [{ x: unit.x, y: unit.y }];
  while (queue.length) {
    var cur = queue.shift();
    if (cur.x === tx && cur.y === ty) break;
    var nb = GameCore.neighbors(cur.x, cur.y);
    for (var i = 0; i < nb.length; i++) {
      var nx = nb[i][0], ny = nb[i][1];
      if (!GameCore.inBounds(state, nx, ny)) continue;
      var k = GameCore.key(nx, ny);
      if (from[k] !== undefined) continue;
      var terr = GameCore.terrainAt(state, nx, ny);
      if (terr.impassable) continue;
      var occ = GameCore.unitAt(state, nx, ny);
      if (occ && occ.owner !== unit.owner) continue;
      from[k] = GameCore.key(cur.x, cur.y);
      queue.push({ x: nx, y: ny });
    }
  }
  var target = GameCore.key(tx, ty);
  if (from[target] === undefined) return null;
  var path = [];
  var node = target;
  while (node && node !== start) {
    var parts = node.split(',');
    path.unshift({ x: +parts[0], y: +parts[1] });
    node = from[node];
  }
  return path;
};
GameCore.pickTarget = function (state, unit) {
  var best = null, bestD = 1e9;
  state.units.forEach(function (u) {
    if (u.owner === unit.owner) return;
    var d = Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y);
    if (d < bestD) { bestD = d; best = { x: u.x, y: u.y }; }
  });
  for (var y = 0; y < state.height; y++) {
    for (var x = 0; x < state.width; x++) {
      var terr = GameData.TERRAIN[state.grid[y][x]];
      if (!terr.capturable) continue;
      if (state.owner[y][x] === unit.owner) continue;
      var d2 = Math.abs(x - unit.x) + Math.abs(y - unit.y) + 2;
      if (d2 < bestD) { bestD = d2; best = { x: x, y: y }; }
    }
  }
  return best;
};

GameCore.findPathNear = function (state, unit, target) {
  var nb = GameCore.neighbors(target.x, target.y);
  var best = null;
  for (var i = 0; i < nb.length; i++) {
    var x = nb[i][0], y = nb[i][1];
    if (!GameCore.inBounds(state, x, y)) continue;
    if (GameCore.unitAt(state, x, y)) continue;
    var terr = GameCore.terrainAt(state, x, y);
    if (terr.impassable) continue;
    var p = GameCore.findPath(state, unit, x, y);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best;
};

GameCore.walk = function (state, unit, path) {
  for (var i = 0; i < path.length; i++) {
    var step = path[i];
    var reach = GameCore.reachable(state, unit);
    var k = GameCore.key(step.x, step.y);
    if (reach[k] === undefined) break;
    if (GameCore.unitAt(state, step.x, step.y)) break;
    unit.mp -= reach[k];
    unit.x = step.x;
    unit.y = step.y;
    GameCore.capture(state, unit);
    if (unit.mp <= 0) break;
  }
};

GameCore.buySpot = function (state, faction) {
  var spots = [];
  for (var y = 0; y < state.height; y++) {
    for (var x = 0; x < state.width; x++) {
      if (state.owner[y][x] !== faction) continue;
      var terr = GameData.TERRAIN[state.grid[y][x]];
      if (!terr.capturable) continue;
      if (GameCore.unitAt(state, x, y)) continue;
      spots.push({ x: x, y: y, cap: terr.capital ? 1 : 0 });
    }
  }
  spots.sort(function (a, b) { return b.cap - a.cap; });
  return spots.length ? spots[0] : null;
};
GameCore.aiTurn = function (state) {
  var faction = state.active;
  var events = [];
  var mine = state.units.filter(function (u) { return u.owner === faction; });
  mine.forEach(function (unit) {
    if (unit.mp <= 0) return;
    var enemies = state.units.filter(function (u) { return u.owner !== faction; });
    var order = enemies.slice().sort(function (a, b) { return a.hp - b.hp; });
    var struck = false;
    for (var i = 0; i < order.length; i++) {
      if (!GameCore.canAttack(state, unit, order[i])) continue;
      var r = GameCore.attack(state, unit, order[i]);
      if (r) events.push(r.text);
      struck = true;
      break;
    }
    if (struck) return;
    var target = GameCore.pickTarget(state, unit);
    if (!target) return;
    var path = GameCore.findPathNear(state, unit, target) || GameCore.findPath(state, unit, target.x, target.y);
    if (!path || !path.length) return;
    GameCore.walk(state, unit, path);
    var list = state.units.filter(function (u) { return u.owner !== faction; });
    list.sort(function (a, b) { return a.hp - b.hp; });
    for (var j = 0; j < list.length; j++) {
      if (!GameCore.canAttack(state, unit, list[j])) continue;
      var r2 = GameCore.attack(state, unit, list[j]);
      if (r2) events.push(r2.text);
      break;
    }
  });
  var spot = GameCore.buySpot(state, faction);
  var guard = 0;
  while (spot && guard < 5) {
    var pick = null;
    if (state.gold[faction] >= GameData.UNITS.arty.cost && GameCore.territoryCount(state, faction) >= 2) pick = 'arty';
    else if (state.gold[faction] >= GameData.UNITS.tank.cost) pick = 'tank';
    else if (state.gold[faction] >= GameData.UNITS.cav.cost) pick = 'cav';
    else if (state.gold[faction] >= GameData.UNITS.inf.cost) pick = 'inf';
    if (!pick) break;
    if (!GameCore.buyUnit(state, faction, pick, spot.x, spot.y)) break;
    events.push(GameData.FACTIONS[faction].name + ' 招募了' + GameData.UNITS[pick].name);
    spot = GameCore.buySpot(state, faction);
    guard += 1;
  }
  return events;
};

if (typeof module === 'object' && module.exports) module.exports = GameCore;