// 欧陆战争 手机版 v2 - 六边形规则引擎
if (typeof module === 'object' && module.exports) {
  global.GameData = require('./data.js');
}

var GameCore = {};

GameCore.NEIGHBORS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

GameCore.toAxial = function (col, row) {
  return { q: col - ((row - (row & 1)) >> 1), r: row };
};

GameCore.toOffset = function (q, r) {
  return { col: q + ((r - (r & 1)) >> 1), row: r };
};

GameCore.neighbors = function (col, row) {
  var a = GameCore.toAxial(col, row);
  var out = [];
  for (var i = 0; i < 6; i++) {
    var o = GameCore.toOffset(a.q + GameCore.NEIGHBORS[i][0], a.r + GameCore.NEIGHBORS[i][1]);
    out.push([o.col, o.row]);
  }
  return out;
};

GameCore.distance = function (c1, r1, c2, r2) {
  var a = GameCore.toAxial(c1, r1);
  var b = GameCore.toAxial(c2, r2);
  var dq = a.q - b.q;
  var dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
};

GameCore.key = function (col, row) { return col + ',' + row; };

GameCore.log = function (state, text) {
  state.log.push({ turn: state.turn, faction: state.active, text: text });
  if (state.log.length > 60) state.log.shift();
};
GameCore.inBounds = function (state, col, row) {
  return col >= 0 && row >= 0 && col < state.width && row < state.height;
};

GameCore.terrainAt = function (state, col, row) {
  if (!GameCore.inBounds(state, col, row)) return null;
  return GameData.TERRAIN[state.grid[row][col]];
};

GameCore.unitAt = function (state, col, row) {
  for (var i = 0; i < state.units.length; i++) {
    if (state.units[i].col === col && state.units[i].row === row) return state.units[i];
  }
  return null;
};

GameCore.createState = function (mapId) {
  var map = GameData.MAPS[mapId || 'eastern'];
  var grid = map.rows.map(function (rowText) {
    return rowText.split('').map(function (ch) {
      if (ch === 'f') return 'forest';
      if (ch === 'h') return 'hill';
      if (ch === '~') return 'water';
      if (ch === 'c') return 'city';
      if (ch === 'C') return 'capital';
      return 'plain';
    });
  });
  var owner = grid.map(function (row) {
    return row.map(function () { return 0; });
  });
  map.capitals.forEach(function (c) { owner[c.row][c.col] = c.owner; });
  var units = map.startUnits.map(function (s, i) {
    var def = GameData.UNITS[s.type];
    return {
      id: 'u' + i, type: s.type, owner: s.owner,
      col: s.col, row: s.row,
      hp: def.hp, maxHp: def.hp, mp: def.move, face: 1
    };
  });
  var gold = {};
  gold[1] = GameData.RULES.startGold;
  gold[2] = GameData.RULES.startGold;
  return {
    mapId: map.id, mapName: map.name, briefing: map.briefing,
    width: map.rows[0].length, height: map.rows.length,
    grid: grid, owner: owner, units: units, gold: gold,
    turn: 1, active: 1, winner: 0, log: []
  };
};
GameCore.reachable = function (state, unit) {
  var start = GameCore.key(unit.col, unit.row);
  var costs = {};
  costs[start] = 0;
  var queue = [{ col: unit.col, row: unit.row, cost: 0 }];
  while (queue.length) {
    queue.sort(function (a, b) { return a.cost - b.cost; });
    var cur = queue.shift();
    if (cur.cost !== costs[GameCore.key(cur.col, cur.row)]) continue;
    var nb = GameCore.neighbors(cur.col, cur.row);
    for (var i = 0; i < nb.length; i++) {
      var nc = nb[i][0], nr = nb[i][1];
      if (!GameCore.inBounds(state, nc, nr)) continue;
      var terr = GameCore.terrainAt(state, nc, nr);
      if (terr.impassable) continue;
      var occ = GameCore.unitAt(state, nc, nr);
      if (occ && occ.owner !== unit.owner) continue;
      var next = cur.cost + terr.move;
      if (next > unit.mp) continue;
      var k = GameCore.key(nc, nr);
      if (costs[k] === undefined || next < costs[k]) {
        costs[k] = next;
        queue.push({ col: nc, row: nr, cost: next });
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
  var terr = GameCore.terrainAt(state, defender.col, defender.row);
  var atkPower = at.atk * (attacker.hp / at.hp) * (factor || 1);
  var defPower = dt.def * (defender.hp / dt.hp) * (terr ? terr.defense : 1);
  var dmg = Math.round(atkPower * 100 / (100 + defPower) * 1.55);
  return Math.max(6, dmg);
};

GameCore.canAttack = function (state, unit, target) {
  if (!target || target.owner === unit.owner) return false;
  var at = GameData.UNITS[unit.type];
  return GameCore.distance(unit.col, unit.row, target.col, target.row) <= at.range;
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
    var d = GameCore.distance(attacker.col, attacker.row, defender.col, defender.row);
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

GameCore.moveUnit = function (state, unit, col, row) {
  var reach = GameCore.reachable(state, unit);
  var k = GameCore.key(col, row);
  if (reach[k] === undefined) return false;
  unit.mp -= reach[k];
  unit.col = col;
  unit.row = row;
  GameCore.capture(state, unit);
  return true;
};

GameCore.capture = function (state, unit) {
  var terr = GameCore.terrainAt(state, unit.col, unit.row);
  if (!terr || !terr.capturable) return null;
  if (!GameData.UNITS[unit.type].capture) return null;
  if (state.owner[unit.row][unit.col] === unit.owner) return null;
  state.owner[unit.row][unit.col] = unit.owner;
  state.gold[unit.owner] += GameData.RULES.captureBonus;
  GameCore.log(state, GameData.FACTIONS[unit.owner].name + ' 占领了' + terr.name);
  return true;
};
GameCore.incomeOf = function (state, faction) {
  var sum = 0;
  for (var row = 0; row < state.height; row++) {
    for (var col = 0; col < state.width; col++) {
      if (state.owner[row][col] !== faction) continue;
      var terr = GameData.TERRAIN[state.grid[row][col]];
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

GameCore.canBuy = function (state, faction, typeId, col, row) {
  var def = GameData.UNITS[typeId];
  if (!def) return false;
  if (!GameCore.inBounds(state, col, row)) return false;
  if (state.owner[row][col] !== faction) return false;
  if (GameCore.unitAt(state, col, row)) return false;
  if (state.gold[faction] < def.cost) return false;
  var count = 0;
  state.units.forEach(function (u) { if (u.owner === faction) count += 1; });
  return count < GameData.RULES.unitCap;
};

GameCore.buyUnit = function (state, faction, typeId, col, row) {
  if (!GameCore.canBuy(state, faction, typeId, col, row)) return null;
  var def = GameData.UNITS[typeId];
  state.gold[faction] -= def.cost;
  var u = {
    id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    type: typeId, owner: faction, col: col, row: row,
    hp: def.hp, maxHp: def.hp, mp: 0, face: 1
  };
  state.units.push(u);
  GameCore.log(state, GameData.FACTIONS[faction].name + ' 招募了' + def.name);
  return u;
};
GameCore.territoryCount = function (state, faction) {
  var n = 0;
  for (var row = 0; row < state.height; row++) {
    for (var col = 0; col < state.width; col++) {
      var terr = GameData.TERRAIN[state.grid[row][col]];
      if (terr.capturable && state.owner[row][col] === faction) n += 1;
    }
  }
  return n;
};

GameCore.strengthOf = function (state, faction) {
  var sum = 0;
  state.units.forEach(function (u) {
    if (u.owner === faction) sum += Math.max(0, u.hp);
  });
  return sum;
};

GameCore.isGameOver = function (state) {
  var cap1 = false, cap2 = false, n1 = 0, n2 = 0;
  for (var row = 0; row < state.height; row++) {
    for (var col = 0; col < state.width; col++) {
      var terr = GameData.TERRAIN[state.grid[row][col]];
      if (!terr.capital) continue;
      if (state.owner[row][col] === 1) cap1 = true;
      if (state.owner[row][col] === 2) cap2 = true;
    }
  }
  state.units.forEach(function (u) {
    if (u.owner === 1) n1 += 1; else n2 += 1;
  });
  if (!cap2 || n2 === 0) return 1;
  if (!cap1 || n1 === 0) return 2;
  if (state.turn > GameData.RULES.turnLimit) {
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
GameCore.findPath = function (state, unit, tc, tr) {
  var from = {};
  var start = GameCore.key(unit.col, unit.row);
  from[start] = null;
  var queue = [{ col: unit.col, row: unit.row }];
  var target = GameCore.key(tc, tr);
  while (queue.length) {
    var cur = queue.shift();
    if (GameCore.key(cur.col, cur.row) === target) break;
    var nb = GameCore.neighbors(cur.col, cur.row);
    for (var i = 0; i < nb.length; i++) {
      var nc = nb[i][0], nr = nb[i][1];
      if (!GameCore.inBounds(state, nc, nr)) continue;
      var k = GameCore.key(nc, nr);
      if (from[k] !== undefined) continue;
      var terr = GameCore.terrainAt(state, nc, nr);
      if (terr.impassable) continue;
      var occ = GameCore.unitAt(state, nc, nr);
      if (occ && occ.owner !== unit.owner) continue;
      from[k] = GameCore.key(cur.col, cur.row);
      queue.push({ col: nc, row: nr });
    }
  }
  if (from[target] === undefined) return null;
  var path = [];
  var node = target;
  while (node && node !== start) {
    var parts = node.split(',');
    path.unshift({ col: +parts[0], row: +parts[1] });
    node = from[node];
  }
  return path;
};

GameCore.pickTarget = function (state, unit) {
  var best = null, bestD = 1e9;
  state.units.forEach(function (u) {
    if (u.owner === unit.owner) return;
    var d = GameCore.distance(unit.col, unit.row, u.col, u.row);
    if (d < bestD) { bestD = d; best = { col: u.col, row: u.row }; }
  });
  for (var row = 0; row < state.height; row++) {
    for (var col = 0; col < state.width; col++) {
      var terr = GameData.TERRAIN[state.grid[row][col]];
      if (!terr.capturable) continue;
      if (state.owner[row][col] === unit.owner) continue;
      var d2 = GameCore.distance(unit.col, unit.row, col, row) + 2;
      if (d2 < bestD) { bestD = d2; best = { col: col, row: row }; }
    }
  }
  return best;
};

GameCore.findPathNear = function (state, unit, target) {
  var nb = GameCore.neighbors(target.col, target.row);
  var best = null;
  for (var i = 0; i < nb.length; i++) {
    var col = nb[i][0], row = nb[i][1];
    if (!GameCore.inBounds(state, col, row)) continue;
    if (GameCore.unitAt(state, col, row)) continue;
    var terr = GameCore.terrainAt(state, col, row);
    if (terr.impassable) continue;
    var p = GameCore.findPath(state, unit, col, row);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best;
};
GameCore.walk = function (state, unit, path) {
  for (var i = 0; i < path.length; i++) {
    var step = path[i];
    var reach = GameCore.reachable(state, unit);
    var k = GameCore.key(step.col, step.row);
    if (reach[k] === undefined) break;
    if (GameCore.unitAt(state, step.col, step.row)) break;
    unit.mp -= reach[k];
    unit.col = step.col;
    unit.row = step.row;
    GameCore.capture(state, unit);
    if (unit.mp <= 0) break;
  }
};

GameCore.buySpot = function (state, faction) {
  var spots = [];
  for (var row = 0; row < state.height; row++) {
    for (var col = 0; col < state.width; col++) {
      if (state.owner[row][col] !== faction) continue;
      var terr = GameData.TERRAIN[state.grid[row][col]];
      if (!terr.capturable) continue;
      if (GameCore.unitAt(state, col, row)) continue;
      spots.push({ col: col, row: row, cap: terr.capital ? 1 : 0 });
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
    enemies.sort(function (a, b) { return a.hp - b.hp; });
    for (var i = 0; i < enemies.length; i++) {
      if (!GameCore.canAttack(state, unit, enemies[i])) continue;
      var r = GameCore.attack(state, unit, enemies[i]);
      if (r) events.push(r.text);
      return;
    }
    var target = GameCore.pickTarget(state, unit);
    if (!target) return;
    var path = GameCore.findPathNear(state, unit, target) || GameCore.findPath(state, unit, target.col, target.row);
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
    if (!GameCore.buyUnit(state, faction, pick, spot.col, spot.row)) break;
    events.push(GameData.FACTIONS[faction].name + ' 招募了' + GameData.UNITS[pick].name);
    spot = GameCore.buySpot(state, faction);
    guard += 1;
  }
  return events;
};

if (typeof module === 'object' && module.exports) module.exports = GameCore;