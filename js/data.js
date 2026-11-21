// 欧陆战争 手机版 - 静态数据：地形、兵种、地图
// 纯数据，无副作用；浏览器下为全局 GameData，Node 下可 require 做测试。

var GameData = {};

GameData.TERRAIN = {
  plain:    { id: 'plain',    name: '平原', move: 1, defense: 1.0, color: '#8fbf6f', dark: '#7aa95c' },
  forest:   { id: 'forest',   name: '森林', move: 2, defense: 1.2, color: '#4f8f4f', dark: '#3f7540' },
  mountain: { id: 'mountain', name: '山地', move: 3, defense: 1.4, color: '#a89678', dark: '#8d7c61' },
  water:    { id: 'water',    name: '河流', move: 99, defense: 1.0, color: '#5aa0d8', dark: '#4a8cbf', impassable: true },
  city:     { id: 'city',     name: '城市', move: 1, defense: 1.3, color: '#c8b07a', dark: '#b09660', capturable: true },
  capital:  { id: 'capital',  name: '首都', move: 1, defense: 1.5, color: '#d8a15a', dark: '#bf8a45', capturable: true, capital: true }
};
GameData.UNITS = {
  inf:  { id: 'inf',  name: '步兵',   short: '步', hp: 100, atk: 42, def: 30, move: 2, range: 1, cost: 60,  capture: true },
  cav:  { id: 'cav',  name: '装甲车', short: '装', hp: 90,  atk: 55, def: 35, move: 4, range: 1, cost: 90,  capture: true },
  tank: { id: 'tank', name: '坦克',   short: '坦', hp: 120, atk: 70, def: 45, move: 3, range: 1, cost: 120, capture: true },
  arty: { id: 'arty', name: '火炮',   short: '炮', hp: 80,  atk: 85, def: 20, move: 1, range: 2, cost: 140, capture: false }
};
// 地图图例：. 平原  f 森林  m 山地  w 河流  c 城市  C 首都
// 每行 10 格，共 12 行；中部有一条河，只有 3 处浅滩可过
GameData.MAPS = {
  eastern: {
    id: 'eastern',
    name: '东部战线',
    rows: [
      'm..C...f..',
      '..c...c...',
      '..f....m..',
      '....mm....',
      'f.....f...',
      '..........',
      'ww.ww.ww.w',
      '..........',
      '...f..f...',
      '..c...c...',
      '.....f....',
      '..C.......'
    ],
    capitals: [
      { x: 2, y: 11, owner: 1 },
      { x: 3, y: 0,  owner: 2 }
    ],
    startUnits: [
      { type: 'inf',  owner: 1, x: 1, y: 11 },
      { type: 'tank', owner: 1, x: 3, y: 10 },
      { type: 'inf',  owner: 2, x: 4, y: 0  },
      { type: 'tank', owner: 2, x: 2, y: 1  }
    ]
  }
};
GameData.FACTIONS = {
  1: { id: 1, name: '蓝方', color: '#2f6fd0', light: '#7fb0f0' },
  2: { id: 2, name: '红方', color: '#c93b3b', light: '#e88a8a' }
};

GameData.RULES = {
  startGold: 200,
  cityIncome: 25,
  capitalIncome: 40,
  captureBonus: 20,
  unitCap: 10,
  counterFactor: 0.55
};

if (typeof module === 'object' && module.exports) module.exports = GameData;