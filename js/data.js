// 欧陆战争 手机版 v2 - 静态数据
// 六边形网格（odd-r 偏移，尖顶），单位与地形均带绘制参数
var GameData = {};

GameData.TERRAIN = {
  plain:    { id: 'plain',    name: '平原', move: 1, defense: 1.0, base: '#7f9f5e', edge: '#5f7f45', kind: 'grass' },
  forest:   { id: 'forest',   name: '森林', move: 2, defense: 1.2, base: '#3f6b3a', edge: '#2c4f2a', kind: 'forest' },
  hill:     { id: 'hill',     name: '丘陵', move: 2, defense: 1.35, base: '#8c7d5a', edge: '#6b5e40', kind: 'hill' },
  water:    { id: 'water',    name: '河流', move: 99, defense: 1.0, base: '#2f6f9e', edge: '#1f4f74', kind: 'water', impassable: true },
  city:     { id: 'city',     name: '城市', move: 1, defense: 1.3, base: '#9a8a6a', edge: '#6f6248', kind: 'city', capturable: true },
  capital:  { id: 'capital',  name: '首都', move: 1, defense: 1.5, base: '#a8794a', edge: '#7a5533', kind: 'capital', capturable: true, capital: true }
};

GameData.UNITS = {
  inf:  { id: 'inf',  name: '步兵',   hp: 100, atk: 42, def: 30, move: 2, range: 1, cost: 60,  capture: true,  sprite: 'inf' },
  cav:  { id: 'cav',  name: '装甲车', hp: 90,  atk: 55, def: 35, move: 4, range: 1, cost: 90,  capture: true,  sprite: 'cav' },
  tank: { id: 'tank', name: '坦克',   hp: 120, atk: 70, def: 45, move: 3, range: 1, cost: 120, capture: true,  sprite: 'tank' },
  arty: { id: 'arty', name: '火炮',   hp: 80,  atk: 85, def: 20, move: 1, range: 2, cost: 140, capture: false, sprite: 'arty' }
};
// 地图：odd-r 偏移，每行 14 格共 10 行
// . 平原  f 森林  h 丘陵  ~ 河流  c 城市  C 首都
GameData.MAPS = {
  eastern: {
    id: 'eastern',
    name: '东部战线',
    briefing: '突破河防，夺取敌方首都',
    rows: [
      'm..C....f..',
      '..c...c....',
      '.f...f...h.',
      '...f..f....',
      '.h...f...f.',
      '...........',
      '~~.~~~.~~~.',
      '...........',
      '.f...h...f.',
      '...f..f....',
      '..c...c....',
      '.f...f...h.',
      '.....f.....',
      'm..C....m..'
    ],
    capitals: [
      { col: 3, row: 13, owner: 1 },
      { col: 3, row: 0, owner: 2 }
    ],
    startUnits: [
      { type: 'inf',  owner: 1, col: 2, row: 13 },
      { type: 'tank', owner: 1, col: 4, row: 12 },
      { type: 'inf',  owner: 2, col: 5, row: 1 },
      { type: 'tank', owner: 2, col: 2, row: 0 }
    ]
  }
};

GameData.FACTIONS = {
  1: { id: 1, name: '蓝军', color: '#2c5f9e', light: '#5b8fd6', dark: '#18365c' },
  2: { id: 2, name: '红军', color: '#a33b3b', light: '#d96a6a', dark: '#5f1c1c' }
};

GameData.RULES = {
  startGold: 200,
  cityIncome: 25,
  capitalIncome: 40,
  captureBonus: 20,
  unitCap: 10,
  counterFactor: 0.55,
  turnLimit: 30
};

if (typeof module === 'object' && module.exports) module.exports = GameData;