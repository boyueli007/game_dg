// 欧陆战争 手机版 - 渲染与交互层
var GameUI = {};

GameUI.state = null;
GameUI.sel = null;
GameUI.reach = {};
GameUI.attacks = {};
GameUI.mode = 'idle';
GameUI.placeType = null;
GameUI.cellSize = 40;
GameUI.originX = 0;
GameUI.originY = 0;
GameUI.dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

GameUI.layout = function () {
  var wrap = document.getElementById('boardWrap');
  var w = wrap.clientWidth;
  var h = wrap.clientHeight;
  var s = GameUI.state;
  var cs = Math.floor(Math.min(w / s.width, h / s.height));
  if (cs < 18) cs = 18;
  GameUI.cellSize = cs;
  GameUI.originX = Math.floor((w - cs * s.width) / 2);
  GameUI.originY = Math.floor((h - cs * s.height) / 2);
  var canvas = GameUI.canvas;
  canvas.width = Math.floor(w * GameUI.dpr);
  canvas.height = Math.floor(h * GameUI.dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  var ctx = canvas.getContext('2d');
  ctx.setTransform(GameUI.dpr, 0, 0, GameUI.dpr, 0, 0);
};

GameUI.cellXY = function (x, y) {
  return {
    px: GameUI.originX + x * GameUI.cellSize,
    py: GameUI.originY + y * GameUI.cellSize
  };
};
GameUI.drawTiles = function (ctx) {
  var s = GameUI.state;
  var cs = GameUI.cellSize;
  for (var y = 0; y < s.height; y++) {
    for (var x = 0; x < s.width; x++) {
      var terr = GameData.TERRAIN[s.grid[y][x]];
      var c = GameUI.cellXY(x, y);
      ctx.fillStyle = (terr.impassable || (x + y) % 2 === 0) ? terr.color : terr.dark;
      ctx.fillRect(c.px, c.py, cs, cs);
      var ownerId = s.owner[y][x];
      if (terr.capturable && ownerId) {
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = GameData.FACTIONS[ownerId].color;
        ctx.fillRect(c.px, c.py, cs, cs);
        ctx.globalAlpha = 1;
      }
      if (terr.capturable) {
        ctx.strokeStyle = 'rgba(0,0,0,0.38)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c.px + 0.5, c.py + 0.5, cs - 1, cs - 1);
        if (terr.capital) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.font = 'bold ' + Math.round(cs * 0.3) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText('都', c.px + cs / 2, c.py + 2);
        }
      }
    }
  }
};

GameUI.drawOverlay = function (ctx) {
  var cs = GameUI.cellSize;
  var pad = Math.max(2, Math.round(cs * 0.06));
  Object.keys(GameUI.reach).forEach(function (k) {
    var p = k.split(',');
    var c = GameUI.cellXY(+p[0], +p[1]);
    ctx.fillStyle = 'rgba(47,111,208,0.30)';
    ctx.fillRect(c.px + pad, c.py + pad, cs - pad * 2, cs - pad * 2);
  });
  Object.keys(GameUI.attacks).forEach(function (k) {
    var p = k.split(',');
    var c = GameUI.cellXY(+p[0], +p[1]);
    ctx.fillStyle = 'rgba(214,58,58,0.42)';
    ctx.fillRect(c.px + pad, c.py + pad, cs - pad * 2, cs - pad * 2);
  });
  if (GameUI.mode === 'placing') {
    var s = GameUI.state;
    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) {
        if (!GameCore.canBuy(s, 1, GameUI.placeType, x, y)) continue;
        var c2 = GameUI.cellXY(x, y);
        ctx.strokeStyle = '#ffd24a';
        ctx.lineWidth = 2;
        ctx.strokeRect(c2.px + 2, c2.py + 2, cs - 4, cs - 4);
      }
    }
  }
};
GameUI.drawUnits = function (ctx) {
  var s = GameUI.state;
  var cs = GameUI.cellSize;
  s.units.forEach(function (u) {
    var c = GameUI.cellXY(u.x, u.y);
    var f = GameData.FACTIONS[u.owner];
    var def = GameData.UNITS[u.type];
    var cx = c.px + cs / 2;
    var cy = c.py + cs / 2;
    var r = cs * 0.33;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    if (GameUI.sel && GameUI.sel.id === u.id) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffd24a';
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.round(cs * 0.34) + 'px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.short, cx, cy);
    var bw = cs * 0.66;
    var bh = Math.max(3, Math.round(cs * 0.08));
    var bx = c.px + (cs - bw) / 2;
    var by = c.py + cs - bh - 3;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx, by, bw, bh);
    var ratio = Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = ratio > 0.5 ? '#5bd35b' : ratio > 0.25 ? '#e6c14a' : '#e05a5a';
    ctx.fillRect(bx, by, bw * ratio, bh);
  });
};

GameUI.render = function () {
  var ctx = GameUI.canvas.getContext('2d');
  ctx.clearRect(0, 0, GameUI.canvas.width, GameUI.canvas.height);
  GameUI.drawTiles(ctx);
  GameUI.drawOverlay(ctx);
  GameUI.drawUnits(ctx);
  GameUI.updateHud();
};

GameUI.updateHud = function () {
  var s = GameUI.state;
  document.getElementById('gold1').textContent = s.gold[1];
  document.getElementById('gold2').textContent = s.gold[2];
  var who = s.active === 1 ? '蓝方行动' : '红方行动';
  document.getElementById('turnInfo').textContent = '第 ' + s.turn + ' 回合 · ' + who;
  var mine = s.units.filter(function (u) { return u.owner === 1; }).length;
  var theirs = s.units.filter(function (u) { return u.owner === 2; }).length;
  document.getElementById('armyInfo').textContent = '兵力 我 ' + mine + ' : ' + theirs + ' 敌';
  document.getElementById('btnEnd').disabled = s.active !== 1 || s.winner !== 0;
  document.getElementById('btnBuy').disabled = s.active !== 1 || s.winner !== 0;
};
GameUI.pickCell = function (clientX, clientY) {
  var rect = GameUI.canvas.getBoundingClientRect();
  var x = clientX - rect.left;
  var y = clientY - rect.top;
  var cx = Math.floor((x - GameUI.originX) / GameUI.cellSize);
  var cy = Math.floor((y - GameUI.originY) / GameUI.cellSize);
  if (!GameCore.inBounds(GameUI.state, cx, cy)) return null;
  return { x: cx, y: cy };
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
    if (!GameCore.canAttack(s, u, e)) return;
    GameUI.attacks[GameCore.key(e.x, e.y)] = e;
  });
  GameUI.tip(GameData.UNITS[u.type].name + ' 生命 ' + Math.max(0, u.hp) + ' 移动力 ' + u.mp);
  GameUI.render();
};

GameUI.tip = function (text) {
  document.getElementById('tip').textContent = text || '';
};

GameUI.onCell = function (cell) {
  if (!cell) return;
  var s = GameUI.state;
  if (s.winner) return;
  var key = GameCore.key(cell.x, cell.y);
  var unit = GameCore.unitAt(s, cell.x, cell.y);

  if (GameUI.mode === 'placing') {
    if (!GameCore.canBuy(s, 1, GameUI.placeType, cell.x, cell.y)) {
      GameUI.tip('只能放在己方无部队的城市或首都');
      return;
    }
    GameCore.buyUnit(s, 1, GameUI.placeType, cell.x, cell.y);
    GameUI.mode = 'idle';
    GameUI.closePanel();
    GameUI.tip('招募完成');
    GameUI.render();
    return;
  }

  if (GameUI.sel) {
    if (GameUI.attacks[key]) {
      var res = GameCore.attack(s, GameUI.sel, GameUI.attacks[key]);
      GameUI.tip(res ? res.text : '');
      GameUI.clearSel();
      GameUI.checkOver();
      GameUI.render();
      return;
    }
    if (GameUI.reach[key] !== undefined) {
      GameCore.moveUnit(s, GameUI.sel, cell.x, cell.y);
      var moved = GameUI.sel;
      if (moved && moved.mp > 0) {
        GameUI.selectUnit(moved);
      } else {
        GameUI.clearSel();
      }
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
  var units = document.querySelectorAll('.card');
  for (var i = 0; i < units.length; i++) {
    var el = units[i];
    var id = el.getAttribute('data-type');
    var def = GameData.UNITS[id];
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
  var spot = GameCore.buySpot(s, 1);
  if (!spot) {
    GameUI.tip('没有可放置的空城');
    return;
  }
  GameUI.mode = 'placing';
  GameUI.placeType = typeId;
  GameUI.tip('点击黄色框的空城放置' + def.name);
  GameUI.render();
};

GameUI.checkOver = function () {
  var s = GameUI.state;
  var w = GameCore.isGameOver(s);
  if (!w) return false;
  s.winner = w;
  var over = document.getElementById('over');
  over.classList.remove('hidden');
  over.querySelector('.over-title').textContent = w === 1 ? '胜利' : '战败';
  var reason;
  if (s.turn > 30) {
    reason = '第 ' + s.turn + ' 回合结束：控制区与兵力占优者胜出';
  } else {
    reason = w === 1 ? '你占领了敌方首都' : '你的首都失守了';
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
  GameUI.tip('红方行动中');
  window.setTimeout(function () {
    GameCore.aiTurn(s);
    GameCore.endTurn(s);
    GameUI.checkOver();
    GameUI.render();
    GameUI.tip('轮到你了');
  }, 420);
};
GameUI.start = function (mapId) {
  GameUI.state = GameCore.createState(mapId || 'eastern');
  GameUI.clearSel();
  GameUI.mode = 'idle';
  GameUI.placeType = null;
  document.getElementById('panel').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  GameUI.layout();
  GameUI.render();
  GameUI.tip('点击己方部队，再点蓝格移动、红格攻击');
};

GameUI.bind = function () {
  var canvas = document.getElementById('board');
  GameUI.canvas = canvas;
  var handler = function (ev) {
    ev.preventDefault();
    var t = ev.changedTouches ? ev.changedTouches[0] : ev;
    GameUI.onCell(GameUI.pickCell(t.clientX, t.clientY));
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
    }, 200);
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function () {
    GameUI.bind();
    GameUI.start('eastern');
  });
}