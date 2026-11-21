// 欧陆战争 手机版 v2 - 六边形渲染与触摸交互
var GameUI = {};

GameUI.state = null;
GameUI.sel = null;
GameUI.reach = {};
GameUI.attacks = {};
GameUI.mode = 'idle';
GameUI.placeType = null;
GameUI.size = 24;
GameUI.ox = 0;
GameUI.oy = 0;
GameUI.dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
GameUI.floaters = [];
GameUI.lastTs = 0;

GameUI.SQ3 = Math.sqrt(3);

GameUI.layout = function () {
  var wrap = document.getElementById('boardWrap');
  var w = wrap.clientWidth;
  var h = wrap.clientHeight;
  var s = GameUI.state;
  var sizeW = w / (GameUI.SQ3 * (s.width + 0.5));
  var sizeH = h / (1.5 * (s.height - 1) + 2);
  var size = Math.floor(Math.min(sizeW, sizeH));
  if (size < 10) size = 10;
  GameUI.size = size;
  var gridW = GameUI.SQ3 * size * (s.width + 0.5);
  var gridH = 1.5 * size * (s.height - 1) + 2 * size;
  GameUI.ox = (w - gridW) / 2 + GameUI.SQ3 * size / 2;
  GameUI.oy = (h - gridH) / 2 + size;
  var canvas = GameUI.canvas;
  canvas.width = Math.floor(w * GameUI.dpr);
  canvas.height = Math.floor(h * GameUI.dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  var ctx = canvas.getContext('2d');
  ctx.setTransform(GameUI.dpr, 0, 0, GameUI.dpr, 0, 0);
};

GameUI.center = function (col, row) {
  var a = GameCore.toAxial(col, row);
  return {
    x: GameUI.ox + GameUI.SQ3 * GameUI.size * (a.q + a.r / 2),
    y: GameUI.oy + 1.5 * GameUI.size * a.r
  };
};

GameUI.hexPath = function (ctx, x, y, size) {
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var ang = Math.PI / 180 * (60 * i - 30);
    var px = x + size * Math.cos(ang);
    var py = y + size * Math.sin(ang);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
};
GameUI.rand = function (col, row, salt) {
  var n = (col * 73856093) ^ (row * 19349663) ^ (salt * 83492791);
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff;
};

GameUI.drawHex = function (ctx, col, row) {
  var s = GameUI.state;
  var terr = GameData.TERRAIN[s.grid[row][col]];
  var c = GameUI.center(col, row);
  var size = GameUI.size;

  GameUI.hexPath(ctx, c.x, c.y, size - 0.5);
  ctx.fillStyle = terr.base;
  ctx.fill();

  ctx.save();
  GameUI.hexPath(ctx, c.x, c.y, size - 0.5);
  ctx.clip();

  if (terr.kind === 'grass') {
    ctx.strokeStyle = terr.edge;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    for (var i = 0; i < 4; i++) {
      var gx = c.x + (GameUI.rand(col, row, i) - 0.5) * size;
      var gy = c.y + (GameUI.rand(col, row, i + 9) - 0.5) * size;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 2, gy - 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (terr.kind === 'forest') {
    for (var t = 0; t < 3; t++) {
      var tx = c.x + (GameUI.rand(col, row, t + 20) - 0.5) * size * 1.1;
      var ty = c.y + (GameUI.rand(col, row, t + 40) - 0.5) * size;
      var r = size * 0.34;
      ctx.fillStyle = '#2f5a2c';
      ctx.beginPath();
      ctx.moveTo(tx, ty - r);
      ctx.lineTo(tx + r * 0.8, ty + r * 0.6);
      ctx.lineTo(tx - r * 0.8, ty + r * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  } else if (terr.kind === 'hill') {
    ctx.fillStyle = terr.edge;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(c.x - size * 0.2, c.y + size * 0.15, size * 0.55, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x + size * 0.35, c.y + size * 0.3, size * 0.4, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (terr.kind === 'water') {
    ctx.strokeStyle = '#a8d4ef';
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.4;
    for (var wv = 0; wv < 2; wv++) {
      var wy = c.y - size * 0.2 + wv * size * 0.5;
      ctx.beginPath();
      ctx.moveTo(c.x - size * 0.6, wy);
      ctx.quadraticCurveTo(c.x - size * 0.2, wy - 3, c.x + size * 0.1, wy);
      ctx.quadraticCurveTo(c.x + size * 0.4, wy + 3, c.x + size * 0.65, wy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  GameUI.hexPath(ctx, c.x, c.y, size - 0.5);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
};
GameUI.drawCity = function (ctx, col, row) {
  var s = GameUI.state;
  var terr = GameData.TERRAIN[s.grid[row][col]];
  if (!terr.capturable) return;
  var c = GameUI.center(col, row);
  var size = GameUI.size;
  var ownerId = s.owner[row][col];

  if (ownerId) {
    ctx.save();
    GameUI.hexPath(ctx, c.x, c.y, size - 1);
    ctx.clip();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = GameData.FACTIONS[ownerId].color;
    ctx.fillRect(c.x - size, c.y - size, size * 2, size * 2);
    ctx.restore();
  }

  var bw = size * 0.34;
  var bh = size * 0.5;
  var baseY = c.y + size * 0.3;
  var xs = [-size * 0.42, 0, size * 0.42];
  for (var i = 0; i < 3; i++) {
    var h = bh * (0.7 + GameUI.rand(col, row, i + 60) * 0.6);
    ctx.fillStyle = '#d9cbb0';
    ctx.fillRect(c.x + xs[i] - bw / 2, baseY - h, bw, h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(c.x + xs[i] - bw / 2, baseY - h, bw, 2);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(c.x + xs[i] - bw * 0.18, baseY - h * 0.35, bw * 0.36, h * 0.35);
  }

  if (terr.capital) {
    var fx = c.x + size * 0.42;
    var fy = baseY - bh - size * 0.12;
    ctx.strokeStyle = '#e8e2d2';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy - size * 0.42);
    ctx.stroke();
    ctx.fillStyle = ownerId ? GameData.FACTIONS[ownerId].light : '#e8e2d2';
    ctx.beginPath();
    ctx.moveTo(fx, fy - size * 0.42);
    ctx.lineTo(fx + size * 0.3, fy - size * 0.32);
    ctx.lineTo(fx, fy - size * 0.22);
    ctx.closePath();
    ctx.fill();
  }
};
GameUI.spriteTank = function (ctx, s, f) {
  var w = s * 1.02, h = s * 0.58;
  ctx.fillStyle = '#1d1f22';
  ctx.fillRect(-w / 2, -h / 2 - s * 0.06, w, s * 0.14);
  ctx.fillRect(-w / 2, h / 2 - s * 0.08, w, s * 0.14);
  ctx.fillStyle = f.color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = f.dark;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = f.light;
  ctx.beginPath();
  ctx.arc(s * 0.05, 0, s * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = f.dark;
  ctx.stroke();
  ctx.fillStyle = '#2b2f34';
  ctx.fillRect(s * 0.2, -s * 0.07, s * 0.62, s * 0.14);
};

GameUI.spriteCav = function (ctx, s, f) {
  var w = s * 0.95, h = s * 0.42;
  ctx.fillStyle = '#1d1f22';
  var wy = h / 2 + s * 0.06;
  var wx = [-w * 0.3, w * 0.3];
  for (var i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(wx[i], -wy, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx[i], wy, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w * 0.18, -h / 2);
  ctx.lineTo(w / 2, -h * 0.32);
  ctx.lineTo(w / 2, h * 0.32);
  ctx.lineTo(-w * 0.18, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = f.dark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#2b2f34';
  ctx.fillRect(0, -s * 0.05, s * 0.5, s * 0.1);
};

GameUI.spriteArty = function (ctx, s, f) {
  ctx.fillStyle = '#1d1f22';
  ctx.beginPath();
  ctx.arc(-s * 0.12, s * 0.22, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.28, s * 0.22, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.45, s * 0.12);
  ctx.lineTo(s * 0.3, s * 0.12);
  ctx.lineTo(s * 0.3, -s * 0.05);
  ctx.lineTo(-s * 0.45, -s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = f.dark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.save();
  ctx.translate(-s * 0.05, -s * 0.05);
  ctx.rotate(-Math.PI / 4.2);
  ctx.fillStyle = '#2b2f34';
  ctx.fillRect(0, -s * 0.06, s * 0.85, s * 0.12);
  ctx.restore();
};

GameUI.spriteInf = function (ctx, s, f) {
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.14, s * 0.3, s * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = f.dark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#d8c9a8';
  ctx.beginPath();
  ctx.arc(0, -s * 0.26, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = f.dark;
  ctx.beginPath();
  ctx.arc(0, -s * 0.3, s * 0.18, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#2b2f34';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s * 0.1, s * 0.25);
  ctx.lineTo(s * 0.42, -s * 0.28);
  ctx.stroke();
};
GameUI.drawUnit = function (ctx, u, selected) {
  var c = GameUI.center(u.col, u.row);
  var s = GameUI.size;
  var f = GameData.FACTIONS[u.owner];

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + s * 0.42, s * 0.62, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(c.x, c.y - s * 0.1);
  var sprite = GameData.UNITS[u.type].sprite;
  if (sprite === 'tank') GameUI.spriteTank(ctx, s, f);
  else if (sprite === 'cav') GameUI.spriteCav(ctx, s, f);
  else if (sprite === 'arty') GameUI.spriteArty(ctx, s, f);
  else GameUI.spriteInf(ctx, s, f);
  ctx.restore();

  var bw = s * 0.86;
  var bh = Math.max(3, s * 0.11);
  var bx = c.x - bw / 2;
  var by = c.y + s * 0.62;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  var ratio = Math.max(0, u.hp / u.maxHp);
  ctx.fillStyle = ratio > 0.5 ? '#5ed35e' : ratio > 0.25 ? '#e8c84a' : '#e05656';
  ctx.fillRect(bx, by, bw * ratio, bh);

  if (selected) {
    ctx.save();
    GameUI.hexPath(ctx, c.x, c.y, s * 0.92);
    ctx.strokeStyle = '#ffcf4a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }
};

GameUI.drawUnits = function (ctx) {
  var s = GameUI.state;
  s.units.forEach(function (u) {
    GameUI.drawUnit(ctx, u, GameUI.sel && GameUI.sel.id === u.id);
  });
};

GameUI.drawFloaters = function (ctx) {
  var now = performance.now();
  GameUI.floaters = GameUI.floaters.filter(function (f) { return now - f.t < 900; });
  GameUI.floaters.forEach(function (f) {
    var k = (now - f.t) / 900;
    var c = GameUI.center(f.col, f.row);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.font = 'bold ' + Math.round(GameUI.size * 0.5) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, c.x + 1, c.y - GameUI.size * 0.8 - k * 22 + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, c.x, c.y - GameUI.size * 0.8 - k * 22);
    ctx.restore();
  });
};
GameUI.drawOverlay = function (ctx) {
  var size = GameUI.size;
  var k;
  for (k in GameUI.reach) {
    var p = k.split(',');
    var c = GameUI.center(+p[0], +p[1]);
    ctx.save();
    GameUI.hexPath(ctx, c.x, c.y, size * 0.92);
    ctx.fillStyle = 'rgba(70,150,255,0.34)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,190,255,0.75)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
  for (k in GameUI.attacks) {
    var q = k.split(',');
    var c2 = GameUI.center(+q[0], +q[1]);
    ctx.save();
    GameUI.hexPath(ctx, c2.x, c2.y, size * 0.92);
    ctx.fillStyle = 'rgba(226,70,70,0.42)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,140,140,0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }
  if (GameUI.mode === 'placing') {
    var s = GameUI.state;
    for (var row = 0; row < s.height; row++) {
      for (var col = 0; col < s.width; col++) {
        if (!GameCore.canBuy(s, 1, GameUI.placeType, col, row)) continue;
        var c3 = GameUI.center(col, row);
        ctx.save();
        GameUI.hexPath(ctx, c3.x, c3.y, size * 0.92);
        ctx.strokeStyle = '#ffcf4a';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
};

GameUI.render = function (skipHud) {
  var ctx = GameUI.canvas.getContext('2d');
  ctx.clearRect(0, 0, GameUI.canvas.width, GameUI.canvas.height);
  var s = GameUI.state;
  for (var row = 0; row < s.height; row++) {
    for (var col = 0; col < s.width; col++) {
      GameUI.drawHex(ctx, col, row);
    }
  }
  for (var r2 = 0; r2 < s.height; r2++) {
    for (var c2 = 0; c2 < s.width; c2++) {
      GameUI.drawCity(ctx, c2, r2);
    }
  }
  GameUI.drawOverlay(ctx);
  GameUI.drawUnits(ctx);
  GameUI.drawFloaters(ctx);
  if (!skipHud) GameUI.updateHud();
};

GameUI.lastTouch = 0;

GameUI.tap = function (clientX, clientY, kind) {
  var now = Date.now();
  if (kind === 'mouse' && now - GameUI.lastTouch < 600) return false;
  if (kind === 'touch') GameUI.lastTouch = now;
  GameUI.onCell(GameUI.pickHex(clientX, clientY));
  return true;
};

GameUI.floatLoop = function () {
  if (!GameUI.floaters.length) return;
  var ctx = GameUI.canvas.getContext('2d');
  GameUI.render(true);
  window.requestAnimationFrame(GameUI.floatLoop);
};

GameUI.popDamage = function (col, row, text, color) {
  GameUI.floaters.push({ col: col, row: row, text: text, color: color || '#ffd24a', t: performance.now() });
  if (GameUI.floaters.length === 1) window.requestAnimationFrame(GameUI.floatLoop);
};
GameUI.drawCardSprite = function (u) {
  var cv = document.getElementById('cardArt');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!u) return;
  ctx.save();
  ctx.translate(cv.width / 2, cv.height / 2);
  var s = cv.width * 1.15;
  var f = GameData.FACTIONS[u.owner];
  var sprite = GameData.UNITS[u.type].sprite;
  if (sprite === 'tank') GameUI.spriteTank(ctx, s, f);
  else if (sprite === 'cav') GameUI.spriteCav(ctx, s, f);
  else if (sprite === 'arty') GameUI.spriteArty(ctx, s, f);
  else GameUI.spriteInf(ctx, s, f);
  ctx.restore();
};

GameUI.updateHud = function () {
  var s = GameUI.state;
  document.getElementById('gold1').textContent = s.gold[1];
  document.getElementById('gold2').textContent = s.gold[2];
  document.getElementById('turnInfo').textContent = '第 ' + s.turn + ' 回合';
  document.getElementById('phase').textContent = s.active === 1 ? '我方行动' : '敌方行动';
  document.getElementById('phase').className = s.active === 1 ? 'phase mine' : 'phase enemy';

  var myCities = GameCore.territoryCount(s, 1);
  var enemyCities = GameCore.territoryCount(s, 2);
  document.getElementById('objective').textContent = '目标 夺取敌方首都 · 据点 ' + myCities + ' : ' + enemyCities;

  var u = GameUI.sel;
  var nameEl = document.getElementById('cardName');
  var statsEl = document.getElementById('cardStats');
  var hpEl = document.getElementById('cardHp');
  if (u) {
    var def = GameData.UNITS[u.type];
    nameEl.textContent = GameData.FACTIONS[u.owner].name + ' · ' + def.name;
    statsEl.textContent = '攻 ' + def.atk + '  防 ' + def.def + '  移动 ' + u.mp + '/' + def.move + '  射程 ' + def.range;
    hpEl.textContent = '兵力 ' + Math.max(0, Math.round(u.hp)) + ' / ' + u.maxHp;
    hpEl.style.color = u.hp / u.maxHp > 0.5 ? '#8fe08f' : u.hp / u.maxHp > 0.25 ? '#f0d36a' : '#f08a8a';
  } else {
    nameEl.textContent = '未选择部队';
    statsEl.textContent = '点击己方部队查看详情';
    hpEl.textContent = '';
  }
  GameUI.drawCardSprite(u);
  document.getElementById('btnEnd').disabled = s.active !== 1 || s.winner !== 0;
  document.getElementById('btnBuy').disabled = s.active !== 1 || s.winner !== 0;
};

GameUI.tip = function (text) {
  document.getElementById('tip').textContent = text || '';
};

GameUI.clearSel = function () {
  GameUI.sel = null;
  GameUI.reach = {};
  GameUI.attacks = {};
};

GameUI.selectUnit = function (u) {
  GameUI.sel = u;
  GameUI.reach = u.mp > 0 ? GameCore.reachable(GameUI.state, u) : {};
  GameUI.attacks = {};
  var s = GameUI.state;
  s.units.forEach(function (e) {
    if (e.owner === u.owner) return;
    if (GameCore.canAttack(s, u, e)) GameUI.attacks[GameCore.key(e.col, e.row)] = e;
  });
  GameUI.tip(GameData.UNITS[u.type].name + ' 待命，选蓝格移动，选红格攻击');
  GameUI.render();
};
GameUI.pickHex = function (clientX, clientY) {
  var rect = GameUI.canvas.getBoundingClientRect();
  var px = clientX - rect.left - GameUI.ox;
  var py = clientY - rect.top - GameUI.oy;
  var size = GameUI.size;
  var q = (GameUI.SQ3 / 3 * px - py / 3) / size;
  var r = (2 / 3 * py) / size;
  var cx = q, cz = r, cy = -cx - cz;
  var rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
  var dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  var off = GameCore.toOffset(rx, rz);
  if (!GameCore.inBounds(GameUI.state, off.col, off.row)) return null;
  return { col: off.col, row: off.row };
};

GameUI.onCell = function (cell) {
  if (!cell) return;
  var s = GameUI.state;
  if (s.winner) return;
  var key = GameCore.key(cell.col, cell.row);
  var unit = GameCore.unitAt(s, cell.col, cell.row);

  if (GameUI.mode === 'placing') {
    if (!GameCore.canBuy(s, 1, GameUI.placeType, cell.col, cell.row)) {
      GameUI.tip('只能放在己方空置的据点');
      return;
    }
    GameCore.buyUnit(s, 1, GameUI.placeType, cell.col, cell.row);
    GameUI.mode = 'idle';
    GameUI.closePanel();
    GameUI.tip('部队已就位');
    GameUI.render();
    return;
  }

  if (GameUI.sel) {
    if (GameUI.attacks[key]) {
      var target = GameUI.attacks[key];
      var tCol = target.col, tRow = target.row, aCol = GameUI.sel.col, aRow = GameUI.sel.row;
      var res = GameCore.attack(s, GameUI.sel, target);
      if (res) {
        GameUI.popDamage(tCol, tRow, '-' + res.damage, '#ff6b6b');
        if (res.counter) GameUI.popDamage(aCol, aRow, '-' + res.counter, '#ffb347');
        GameUI.tip(res.text);
      }
      GameUI.clearSel();
      GameUI.checkOver();
      GameUI.render();
      return;
    }
    if (GameUI.reach[key] !== undefined) {
      GameCore.moveUnit(s, GameUI.sel, cell.col, cell.row);
      var moved = GameUI.sel;
      if (moved && moved.mp > 0) GameUI.selectUnit(moved);
      else GameUI.clearSel();
      GameUI.render();
      return;
    }
  }

  if (unit && unit.owner === 1 && s.active === 1) {
    GameUI.selectUnit(unit);
    return;
  }
  GameUI.clearSel();
  GameUI.render();
};
GameUI.openPanel = function () {
  if (GameUI.state.active !== 1 || GameUI.state.winner) return;
  document.getElementById('panel').classList.remove('hidden');
  GameUI.refreshCards();
};

GameUI.closePanel = function () {
  document.getElementById('panel').classList.add('hidden');
  if (GameUI.mode === 'placing') {
    GameUI.mode = 'idle';
    GameUI.placeType = null;
    GameUI.render();
  }
};

GameUI.refreshCards = function () {
  var s = GameUI.state;
  var cards = document.querySelectorAll('.card');
  for (var i = 0; i < cards.length; i++) {
    var el = cards[i];
    var def = GameData.UNITS[el.getAttribute('data-type')];
    el.querySelector('.cost').textContent = def.cost + ' 金';
    el.classList.toggle('poor', s.gold[1] < def.cost);
  }
};

GameUI.chooseType = function (typeId) {
  var s = GameUI.state;
  var def = GameData.UNITS[typeId];
  if (s.gold[1] < def.cost) {
    GameUI.tip('金币不足，需要 ' + def.cost);
    return;
  }
  if (!GameCore.buySpot(s, 1)) {
    GameUI.tip('没有空置的据点可以出兵');
    return;
  }
  GameUI.mode = 'placing';
  GameUI.placeType = typeId;
  GameUI.tip('点击闪烁的据点部署' + def.name);
  GameUI.render();
};

GameUI.checkOver = function () {
  var s = GameUI.state;
  var w = GameCore.isGameOver(s);
  if (!w) return false;
  s.winner = w;
  var over = document.getElementById('over');
  over.classList.remove('hidden');
  over.querySelector('.over-title').textContent = w === 1 ? '战役胜利' : '战役失败';
  var reason;
  if (s.turn > GameData.RULES.turnLimit) {
    reason = '第 ' + s.turn + ' 回合结束，按控制区与兵力判定';
  } else {
    reason = w === 1 ? '敌方首都已被攻克' : '我方首都失守';
  }
  over.querySelector('.over-sub').textContent = reason;
  return true;
};

GameUI.endTurn = function () {
  var s = GameUI.state;
  if (s.winner || s.active !== 1) return;
  GameUI.clearSel();
  GameUI.closePanel();
  GameCore.endTurn(s);
  GameUI.render();
  GameUI.tip('敌军行动中');
  window.setTimeout(function () {
    GameCore.aiTurn(s);
    GameCore.endTurn(s);
    GameUI.checkOver();
    GameUI.render();
    GameUI.tip('轮到我方行动');
  }, 450);
};
GameUI.start = function (mapId) {
  GameUI.state = GameCore.createState(mapId || 'eastern');
  GameUI.clearSel();
  GameUI.mode = 'idle';
  GameUI.placeType = null;
  GameUI.floaters = [];
  document.getElementById('panel').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  var mn = document.getElementById('missionName');
  if (mn) mn.textContent = GameUI.state.mapName;
  var bf = document.getElementById('briefing');
  if (bf) bf.textContent = GameUI.state.briefing;
  GameUI.layout();
  GameUI.render();
  GameUI.tip('点击己方部队开始行动');
};

GameUI.bind = function () {
  var canvas = document.getElementById('board');
  GameUI.canvas = canvas;
  var handler = function (ev) {
    ev.preventDefault();
    var t = ev.changedTouches ? ev.changedTouches[0] : ev;
    var kind = ev.type.indexOf('touch') === 0 ? 'touch' : 'mouse';
    GameUI.tap(t.clientX, t.clientY, kind);
  };
  canvas.addEventListener('click', handler);
  canvas.addEventListener('touchstart', handler, { passive: false });
  document.getElementById('btnEnd').addEventListener('click', GameUI.endTurn);
  document.getElementById('btnBuy').addEventListener('click', GameUI.openPanel);
  document.getElementById('btnClose').addEventListener('click', GameUI.closePanel);
  document.getElementById('btnRestart').addEventListener('click', function () {
    GameUI.start('eastern');
  });
  var cards = document.querySelectorAll('.card');
  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener('click', function () {
      GameUI.chooseType(this.getAttribute('data-type'));
    });
  }
  window.addEventListener('resize', function () {
    GameUI.layout();
    GameUI.render();
  });
  window.addEventListener('orientationchange', function () {
    window.setTimeout(function () {
      GameUI.layout();
      GameUI.render();
    }, 220);
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function () {
    GameUI.bind();
    GameUI.start('eastern');
  });
}