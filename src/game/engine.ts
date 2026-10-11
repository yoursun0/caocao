import { growth, TAC_COST, UNITS, weaponById } from "./content";
import type {
  AimKind,
  Battle,
  BattleUnit,
  Campaign,
  Cls,
  Floater,
  PendingAi,
  Side,
  Spawn,
  StageDef,
  TacticId,
  TerrainId,
  WeaponDef,
} from "./types";

const CHAR: Record<string, TerrainId> = {
  ".": "plain",
  "=": "road",
  F: "forest",
  M: "mountain",
  W: "water",
  B: "bridge",
  V: "village",
  "#": "wall",
  G: "gate",
  K: "keep",
  C: "camp",
  H: "hill",
  Y: "field",
  D: "depot",
  S: "stone",
  "|": "fence",
  "*": "flame",
};

const BLOCK = new Set<TerrainId>(["mountain", "water", "wall", "keep", "fence", "flame"]);
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export function parseMap(rows: string[]): TerrainId[][] {
  return rows.map((row) => [...row].map((ch) => CHAR[ch] ?? "plain"));
}

export function inMap(map: TerrainId[][], x: number, y: number) {
  return y >= 0 && y < map.length && x >= 0 && x < (map[0]?.length ?? 0);
}

export function manh(ax: number, ay: number, bx: number, by: number) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function moveCost(cls: Cls, t: TerrainId) {
  if (BLOCK.has(t)) return 99;
  const mounted = cls === "cavalry" || cls === "horsebow";
  if (t === "forest") return mounted ? 3 : cls === "infantry" ? 1 : 2;
  if (t === "hill") return mounted ? 3 : 2;
  if (t === "field") return mounted ? 2 : 1;
  return 1;
}

export function cover(t: TerrainId) {
  switch (t) {
    case "forest":
      return 1.2;
    case "hill":
      return 1.12;
    case "camp":
      return 1.1;
    case "village":
      return 1.06;
    case "gate":
      return 1.22;
    case "bridge":
      return 0.9;
    case "road":
      return 0.96;
    default:
      return 1;
  }
}

function isBow(cls: Cls) {
  return cls === "archer" || cls === "horsebow";
}

export function classMod(att: Cls, def: Cls) {
  if (att === "infantry" && isBow(def)) return 1.5;
  if (isBow(att) && def === "cavalry") return 1.5;
  if (isBow(att) && def === "horsebow") return 1.15;
  if (att === "cavalry" && def === "infantry") return 1.4;
  if (att === "cavalry" && def === "horsebow") return 0.72;
  if (att === "infantry" && def === "cavalry") return 0.65;
  return 1;
}

export function atkRange(cls: Cls) {
  if (cls === "archer" || cls === "horsebow") return { min: 1, max: 2 };
  return { min: 1, max: 1 };
}

export function tacRange(t: TacticId) {
  if (t === "fire" || t === "rock") return { min: 1, max: 3 };
  if (t === "heal") return { min: 0, max: 2 };
  if (t === "confuse") return { min: 1, max: 2 };
  if (t === "snipe") return { min: 2, max: 2 };
  return { min: 0, max: 0 };
}

export function living(b: Battle) {
  return b.units.filter((u) => !u.retreated && u.hp > 0);
}

export function unitAt(b: Battle, x: number, y: number) {
  return living(b).find((u) => u.x === x && u.y === y) ?? null;
}

export function isFoe(a: BattleUnit, o: BattleUnit) {
  return a.side !== o.side;
}

function occupied(b: Battle, x: number, y: number, ignore?: string) {
  return living(b).some((u) => u.iid !== ignore && u.x === x && u.y === y);
}

function nearEnemy(b: Battle, u: BattleUnit, x: number, y: number) {
  return living(b).some((o) => isFoe(u, o) && manh(x, y, o.x, o.y) === 1);
}

export function los(map: TerrainId[][], x0: number, y0: number, x1: number, y1: number) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (x !== x1 || y !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    if (x === x1 && y === y1) break;
    const t = map[y]?.[x];
    if (!t || t === "mountain" || t === "wall" || t === "keep" || t === "fence" || t === "flame") return false;
  }
  return true;
}

export interface Reach {
  x: number;
  y: number;
  cost: number;
}

export function reachable(b: Battle, u: BattleUnit): Reach[] {
  const max = u.mov - u.tilesMoved;
  if (max <= 0) return [];
  const w = b.map[0]?.length ?? 0;
  const h = b.map.length;
  const best = new Map<string, number>();
  const key = (x: number, y: number) => `${x},${y}`;
  const out: Reach[] = [];
  const q: Reach[] = [{ x: u.x, y: u.y, cost: 0 }];
  best.set(key(u.x, u.y), 0);
  while (q.length) {
    q.sort((a, c) => a.cost - c.cost);
    const cur = q.shift();
    if (!cur) break;
    if (cur.cost > (best.get(key(cur.x, cur.y)) ?? 99)) continue;
    const zocLeave = cur.cost > 0 && nearEnemy(b, u, cur.x, cur.y);
    if (zocLeave) continue;
    for (const [dx, dy] of DIRS) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const t = b.map[y]?.[x];
      if (!t) continue;
      const step = moveCost(u.cls, t);
      if (step >= 99) continue;
      if (occupied(b, x, y, u.iid)) continue;
      const nc = cur.cost + step;
      if (nc > max) continue;
      const k = key(x, y);
      if ((best.get(k) ?? 999) <= nc) continue;
      best.set(k, nc);
      out.push({ x, y, cost: nc });
      q.push({ x, y, cost: nc });
    }
  }
  return out;
}

export function attackCells(b: Battle, u: BattleUnit) {
  const r = atkRange(u.cls);
  const w = b.map[0]?.length ?? 0;
  const h = b.map.length;
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = manh(u.x, u.y, x, y);
      if (d < r.min || d > r.max) continue;
      const tile = b.map[y]?.[x];
      if (tile === "flame" || tile === "mountain" || tile === "wall" || tile === "water" || tile === "keep") continue;
      if (d > 1 && !los(b.map, u.x, u.y, x, y)) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}

function buffMul(u: BattleUnit, kind: "atk" | "def") {
  return u.buffs.some((b) => b.kind === kind) ? (kind === "atk" ? 1.18 : 1.32) : 1;
}

export interface Forecast {
  hit: number;
  dmg: number;
  crit: number;
  note: string;
}

export function forecast(b: Battle, att: BattleUnit, def: BattleUnit, kind: "attack" | "snipe" | "fire" | "rock" | "confuse"): Forecast {
  const dist = manh(att.x, att.y, def.x, def.y);
  const tileA = b.map[att.y]?.[att.x] ?? "plain";
  const tileD = b.map[def.y]?.[def.x] ?? "plain";
  if (kind === "confuse") {
    const hit = clamp(42 + (att.intel - def.intel) * 2 + (att.morale - def.morale) * 0.2, 20, 90);
    return { hit: Math.round(hit), dmg: 0, crit: 0, note: "成功則下回合大機率無法行動" };
  }
  if (kind === "fire" || kind === "rock") {
    let raw = att.intel * 0.9 + att.level * 1.5 + 8 - def.intel * 0.35;
    if (kind === "fire" && tileD === "forest") raw *= 1.28;
    if (kind === "fire" && b.weather === "乾風") raw *= 1.35;
    if (kind === "rock") raw *= 1.05;
    raw = Math.max(1, raw);
    const hit = clamp(72 + (att.intel - def.intel) + (tileD === "forest" ? -6 : 0), 40, 96);
    return { hit: Math.round(hit), dmg: Math.round(raw), crit: 4, note: kind === "fire" ? "不受兵種相剋，吃地形與風" : "目標須鄰接山地" };
  }
  let hit = 76 + (att.agi - def.agi) * 1.4 + (att.morale - 60) * 0.12;
  if (tileD === "forest") hit -= 10;
  if (att.buffs.some((x) => x.kind === "confuse")) hit -= 18;
  hit = clamp(hit, 32, 98);
  let raw = att.atk * buffMul(att, "atk") + att.level * 1.1 - def.def * buffMul(def, "def") * 0.62;
  raw *= classMod(att.cls, def.cls);
  if (att.cls === "strategist") raw *= 0.72;
  raw *= (tileA === "hill" ? 1.08 : 1) / cover(tileD);
  if (att.morale >= 85) raw *= 1.08;
  if (att.morale < 30) raw *= 0.84;
  if ((att.cls === "archer" || att.cls === "horsebow") && dist >= 2) raw *= 1.12;
  if (kind === "snipe") raw *= 1.22;
  if ((att.cls === "cavalry" || att.cls === "hero" || att.cls === "infantry" || att.cls === "horsebow") && att.tilesMoved >= 2 && dist === 1) raw *= 1.22;
  raw = Math.max(1, raw);
  const crit = clamp(att.morale / 6 + att.agi / 30, 3, 40);
  const mod = classMod(att.cls, def.cls);
  const note = mod > 1 ? "兵種克制" : mod < 1 ? "被兵種減免" : dist === 1 ? "近戰會遭反擊" : "遠射無反擊";
  return { hit: Math.round(hit), dmg: Math.round(raw), crit: Math.round(crit), note };
}

function clamp(n: number, a: number, c: number) {
  return Math.max(a, Math.min(c, n));
}

let floatN = 1;
function floatAt(b: Battle, x: number, y: number, text: string, kind: Floater["kind"]) {
  b.floats = [...b.floats, { id: `f${floatN++}`, x, y, text, kind }].slice(-16);
}

function pushLog(b: Battle, line: string) {
  b.log = [...b.log.slice(-36), line];
}

function scaled(defId: string, level: number, weapon: WeaponDef | null, wlv: number) {
  const def = UNITS[defId];
  if (!def) throw new Error(defId);
  const g = Math.max(0, level - def.baseLevel);
  const gr = growth(def.cls);
  const wl = Math.max(0, wlv - 1);
  return {
    hp: def.hp + g * gr.hp,
    mp: def.mp + g * gr.mp,
    atk: def.atk + g * gr.atk + (weapon?.atk ?? 0) + (weapon ? wl : 0),
    def: def.def + g * gr.def + (weapon?.def ?? 0),
    intel: def.intel + g * gr.intel + (weapon?.intel ?? 0),
    agi: def.agi + g * gr.agi + (weapon?.agi ?? 0),
  };
}

function spawnUnit(sp: Spawn, side: Side, camp: Campaign, n: number): BattleUnit {
  const def = UNITS[sp.unitId];
  if (!def) throw new Error(sp.unitId);
  const roster = !sp.guest && side === "player" ? camp.roster[sp.unitId] : undefined;
  const level = roster?.level ?? sp.level ?? def.baseLevel;
  const weaponId = !sp.guest && side === "player" ? (camp.equipped[sp.unitId] ?? sp.weapon ?? null) : (sp.weapon ?? null);
  const w = weaponById(weaponId);
  const wlv = weaponId ? (camp.weaponLv[weaponId] ?? 1) : 1;
  const s = scaled(sp.unitId, level, w && (!w.classes.length || w.classes.includes(def.cls)) ? w : null, wlv);
  const morale = clamp(58 + def.luk, 40, 96);
  return {
    iid: `${sp.unitId}-${n}`,
    defId: def.id,
    name: sp.name ?? def.name,
    courtesy: def.courtesy,
    cls: def.cls,
    side,
    guest: Boolean(sp.guest),
    art: def.art,
    portrait: def.portrait,
    x: sp.x,
    y: sp.y,
    originX: sp.x,
    originY: sp.y,
    hp: s.hp,
    maxHp: s.hp,
    mp: s.mp,
    maxMp: s.mp,
    atk: s.atk,
    def: s.def,
    intel: s.intel,
    agi: s.agi,
    luk: def.luk,
    war: def.war,
    mov: def.mov,
    morale,
    tactics: def.tactics,
    ai: sp.ai ?? def.ai ?? "normal",
    done: side !== "player" || Boolean(sp.guest),
    retreated: false,
    tilesMoved: 0,
    kills: 0,
    expGain: 0,
    swings: 0,
    buffs: [],
    level,
    weaponId,
  };
}

export function makeBattle(stage: StageDef, camp: Campaign): Battle {
  const map = parseMap(stage.map);
  let n = 1;
  const units = [
    ...stage.player.map((sp) => spawnUnit(sp, "player", camp, n++)),
    ...stage.guests.map((sp) => spawnUnit({ ...sp, guest: true }, "player", camp, n++)),
    ...stage.enemies.map((sp) => spawnUnit(sp, "enemy", camp, n++)),
  ];
  return {
    stageId: stage.id,
    map,
    units,
    turn: 1,
    maxTurn: stage.maxTurn,
    weather: stage.weather,
    phase: "player",
    outcome: null,
    winReason: null,
    boss: stage.boss,
    duelKind: stage.duel ?? null,
    holdReleaseTurn: stage.holdReleaseTurn ?? 99,
    bag: { ...camp.bag },
    ui: { selected: null, mode: "idle", aim: null },
    log: [`${stage.name}開始。天氣${stage.weather}。目標：擊破${UNITS[stage.boss]?.name ?? "敵將"}。`],
    floats: [],
    aiSerial: 0,
    pending: null,
    lastHit: null,
    announce: null,
  };
}

export function expireBuffs(b: Battle) {
  for (const u of b.units) u.buffs = u.buffs.filter((bf) => bf.until > b.turn);
}

function confuseRoll(b: Battle, u: BattleUnit) {
  if (!u.buffs.some((bf) => bf.kind === "confuse")) return;
  if (Math.random() < 0.55) {
    u.done = true;
    pushLog(b, `${u.name}混亂，無法行動。`);
    floatAt(b, u.x, u.y, "混亂", "info");
  }
}

export function beginPlayerPhase(b: Battle) {
  expireBuffs(b);
  for (const u of b.units) {
    if (u.side === "player" && !u.guest && !u.retreated) {
      u.done = false;
      u.tilesMoved = 0;
      u.originX = u.x;
      u.originY = u.y;
      if (living(b).some((o) => o.side === "player" && o.iid !== u.iid && manh(o.x, o.y, u.x, u.y) === 1)) {
        u.morale = clamp(u.morale + 2, 0, 100);
      }
      confuseRoll(b, u);
    }
  }
  b.phase = "player";
  b.announce = null;
  b.ui = { selected: null, mode: "idle", aim: null };
  b.pending = null;
  pushLog(b, `—— 第${b.turn}回合・玩家 ——`);
  judge(b);
}

function bossUnit(b: Battle) {
  return b.units.find((u) => u.defId === b.boss && u.side === "enemy");
}

export function judge(b: Battle) {
  if (b.outcome) return;
  const cao = b.units.find((u) => u.defId === "caocao" && !u.guest);
  if (!cao || cao.retreated || cao.hp <= 0) {
    b.outcome = "lose";
    b.phase = "over";
    pushLog(b, "曹操敗退。戰局不可收拾。");
    return;
  }
  const boss = bossUnit(b);
  if (!boss || boss.retreated || boss.hp <= 0) {
    b.outcome = "win";
    b.winReason = "boss";
    b.phase = "over";
    pushLog(b, `${boss?.name ?? "敵將"}敗退。勝利。`);
  }
}

function hurt(b: Battle, target: BattleUnit, amount: number, attacker?: BattleUnit) {
  const dmg = Math.max(1, Math.round(amount));
  target.hp = Math.max(0, target.hp - dmg);
  target.morale = clamp(target.morale - 7, 0, 100);
  if (attacker && !attacker.guest && attacker.side === "player") {
    attacker.expGain += Math.ceil(dmg / 4);
    attacker.morale = clamp(attacker.morale + 3, 0, 100);
  }
  if (target.hp <= 0) {
    target.hp = 0;
    target.retreated = true;
    target.done = true;
    if (attacker) {
      attacker.kills += 1;
      attacker.morale = clamp(attacker.morale + 12, 0, 100);
      if (!attacker.guest && attacker.side === "player") attacker.expGain += 26;
      b.lastHit = attacker.defId;
    }
    pushLog(b, `${target.name}兵力盡，敗退。`);
    floatAt(b, target.x, target.y, "敗退", "info");
  }
  return dmg;
}

export function strike(b: Battle, att: BattleUnit, def: BattleUnit, kind: "attack" | "snipe") {
  if (kind === "snipe") {
    att.mp -= TAC_COST.snipe;
    att.swings += 1;
  } else att.swings += 1;
  const fc = forecast(b, att, def, kind);
  const roll = Math.random() * 100;
  if (roll > fc.hit) {
    floatAt(b, def.x, def.y, "失誤", "miss");
    pushLog(b, `${att.name}攻擊${def.name}，失誤。`);
  } else {
    const crit = Math.random() * 100 < fc.crit;
    const wobble = 0.9 + Math.random() * 0.22;
    const dmg = hurt(b, def, fc.dmg * wobble * (crit ? 1.5 : 1), att);
    floatAt(b, def.x, def.y, crit ? `會心 ${dmg}` : `${dmg}`, crit ? "crit" : "dmg");
    pushLog(b, `${att.name}${crit ? "會心一擊" : "攻擊"}${def.name}，損害${dmg}。`);
  }
  const dist = manh(att.x, att.y, def.x, def.y);
  if (def.hp > 0 && dist === 1 && !def.buffs.some((x) => x.kind === "confuse") && def.cls !== "archer" && def.cls !== "horsebow" && def.cls !== "strategist") {
    const back = forecast(b, def, att, "attack");
    if (Math.random() * 100 <= back.hit) {
      const dmg = hurt(b, att, back.dmg * 0.72, def);
      floatAt(b, att.x, att.y, `反 ${dmg}`, "dmg");
      pushLog(b, `${def.name}反擊，損害${dmg}。`);
    } else {
      floatAt(b, att.x, att.y, "反擊失誤", "miss");
    }
  }
  att.done = true;
  judge(b);
}

export function cast(b: Battle, att: BattleUnit, def: BattleUnit, tac: TacticId) {
  att.mp -= TAC_COST[tac];
  att.done = true;
  if (tac === "heal") {
    const amount = Math.round(att.intel * 0.75 + 18);
    def.hp = Math.min(def.maxHp, def.hp + amount);
    floatAt(b, def.x, def.y, `+${amount}`, "heal");
    pushLog(b, `${att.name}為${def.name}治療，恢復${amount}。`);
    return;
  }
  if (tac === "confuse") {
    const fc = forecast(b, att, def, "confuse");
    if (Math.random() * 100 <= fc.hit) {
      def.buffs = def.buffs.filter((x) => x.kind !== "confuse").concat({ kind: "confuse", until: b.turn + 2 });
      floatAt(b, def.x, def.y, "混亂", "info");
      pushLog(b, `${def.name}陷入混亂。`);
    } else {
      floatAt(b, def.x, def.y, "抵抗", "miss");
      pushLog(b, `${def.name}抵住了混亂。`);
    }
    return;
  }
  if (tac === "fire" || tac === "rock") {
    const fc = forecast(b, att, def, tac);
    if (Math.random() * 100 > fc.hit) {
      floatAt(b, def.x, def.y, "失誤", "miss");
      pushLog(b, `${att.name}的${tac === "fire" ? "火計" : "落石"}落空。`);
      return;
    }
    const dmg = hurt(b, def, fc.dmg * (0.92 + Math.random() * 0.16), att);
    floatAt(b, def.x, def.y, `${dmg}`, "dmg");
    pushLog(b, `${att.name}以${tac === "fire" ? "火計" : "落石"}擊${def.name}，損害${dmg}。`);
    judge(b);
  }
}

export function applySelf(b: Battle, u: BattleUnit, tac: "rally" | "guard") {
  u.mp -= TAC_COST[tac];
  if (tac === "rally") {
    u.morale = clamp(u.morale + 22, 0, 100);
    u.buffs = u.buffs.filter((x) => x.kind !== "atk").concat({ kind: "atk", until: b.turn + 2 });
    floatAt(b, u.x, u.y, "士氣上升", "info");
    pushLog(b, `${u.name}鼓舞全軍，攻擊提升。`);
  } else {
    u.buffs = u.buffs.filter((x) => x.kind !== "def").concat({ kind: "def", until: b.turn + 1 });
    floatAt(b, u.x, u.y, "防禦", "info");
    pushLog(b, `${u.name}據地防禦。`);
  }
  u.done = true;
}

export function applyItem(b: Battle, u: BattleUnit, item: "jinchuang" | "xingjun") {
  if (item === "jinchuang") {
    if (b.bag.jinchuang <= 0) return false;
    b.bag.jinchuang -= 1;
    const amount = Math.round(u.maxHp * 0.45);
    u.hp = Math.min(u.maxHp, u.hp + amount);
    floatAt(b, u.x, u.y, `+${amount}`, "heal");
    pushLog(b, `${u.name}服用金創藥，恢復${amount}。`);
  } else {
    if (b.bag.xingjun <= 0) return false;
    b.bag.xingjun -= 1;
    const amount = 12;
    u.mp = Math.min(u.maxMp, u.mp + amount);
    floatAt(b, u.x, u.y, `策+${amount}`, "info");
    pushLog(b, `${u.name}服用行軍丹。`);
  }
  u.done = true;
  return true;
}

export function waitUnit(b: Battle, u: BattleUnit) {
  const t = b.map[u.y]?.[u.x];
  if (t === "village") {
    const amount = Math.round(u.maxHp * 0.1);
    u.hp = Math.min(u.maxHp, u.hp + amount);
    floatAt(b, u.x, u.y, `+${amount}`, "heal");
    pushLog(b, `${u.name}於村莊修整。`);
  } else if (t === "camp") {
    const amount = Math.round(u.maxHp * 0.16);
    u.hp = Math.min(u.maxHp, u.hp + amount);
    u.mp = Math.min(u.maxMp, u.mp + 4);
    floatAt(b, u.x, u.y, `+${amount}`, "heal");
    pushLog(b, `${u.name}於兵營補給。`);
  } else pushLog(b, `${u.name}待命。`);
  u.done = true;
}

export function moveUnit(b: Battle, u: BattleUnit, x: number, y: number, cost: number) {
  u.tilesMoved += cost;
  u.x = x;
  u.y = y;
}

export function canAim(att: BattleUnit, def: BattleUnit, aim: AimKind, b: Battle) {
  if (def.retreated || def.iid === att.iid) return false;
  const d = manh(att.x, att.y, def.x, def.y);
  if (aim === "attack") {
    const r = atkRange(att.cls);
    return isFoe(att, def) && d >= r.min && d <= r.max && (d === 1 || los(b.map, att.x, att.y, def.x, def.y));
  }
  if (aim === "snipe") {
    return att.mp >= TAC_COST.snipe && isFoe(att, def) && d === 2 && los(b.map, att.x, att.y, def.x, def.y);
  }
  if (aim === "heal") {
    const r = tacRange("heal");
    return att.mp >= TAC_COST.heal && !isFoe(att, def) && d >= r.min && d <= r.max;
  }
  if (aim === "fire" || aim === "confuse" || aim === "rock") {
    const tac = aim;
    const r = tacRange(tac);
    if (att.mp < TAC_COST[tac] || !isFoe(att, def) || d < r.min || d > r.max) return false;
    if (!los(b.map, att.x, att.y, def.x, def.y)) return false;
    if (tac === "rock") {
      const near = DIRS.some(([dx, dy]) => b.map[def.y + dy]?.[def.x + dx] === "mountain");
      if (!near) return false;
    }
    return true;
  }
  return false;
}

export function duelEligible(att: BattleUnit, def: BattleUnit, b: Battle) {
  if (!b.duelKind) return false;
  if (att.guest || att.side !== "player") return false;
  if (att.cls === "archer" || att.cls === "horsebow" || att.cls === "strategist") return false;
  if (def.retreated || manh(att.x, att.y, def.x, def.y) !== 1) return false;
  if (b.duelKind === "huaxiong") return def.defId === "huaxiong";
  return def.defId === "lvbu";
}

function nearestFoe(u: BattleUnit, b: Battle) {
  let best: BattleUnit | null = null;
  let d = 999;
  for (const o of living(b)) {
    if (!isFoe(u, o)) continue;
    const m = manh(u.x, u.y, o.x, o.y);
    if (m < d) {
      d = m;
      best = o;
    }
  }
  return best;
}

function provoked(u: BattleUnit, b: Battle) {
  if (b.turn >= b.holdReleaseTurn) return true;
  return living(b).some((o) => isFoe(u, o) && manh(u.x, u.y, o.x, o.y) <= 5);
}

export type AiPlan =
  | { type: "wait" }
  | { type: "move"; x: number; y: number; cost: number }
  | { type: "attack"; target: string; kind: "attack" | "snipe" }
  | { type: "move-attack"; x: number; y: number; cost: number; target: string; kind: "attack" | "snipe" }
  | { type: "tactic"; target: string; tactic: TacticId }
  | { type: "move-tactic"; x: number; y: number; cost: number; target: string; tactic: TacticId }
  | { type: "duel"; target: string };

export function planAi(u: BattleUnit, b: Battle): AiPlan {
  if (u.morale < 22 && Math.random() < 0.4) return { type: "wait" };
  if (u.defId === "guanyu" && b.duelKind === "huaxiong") {
    const hx = living(b).find((o) => o.defId === "huaxiong");
    if (hx && manh(u.x, u.y, hx.x, hx.y) === 1) return { type: "duel", target: hx.iid };
  }
  const hold = u.ai === "hold" && !provoked(u, b);
  const tiles = hold ? [] : reachable(b, u);
  const spots = [{ x: u.x, y: u.y, cost: 0 }, ...tiles];
  let bestScore = -1e9;
  let best: AiPlan = { type: "wait" };
  const foes = living(b).filter((o) => isFoe(u, o));
  const friends = living(b).filter((o) => !isFoe(u, o));

  for (const spot of spots) {
    const ghost = { ...u, x: spot.x, y: spot.y, tilesMoved: u.tilesMoved + spot.cost };
    if (u.tactics.includes("heal") && u.mp >= TAC_COST.heal) {
      for (const ally of friends) {
        if (ally.hp > ally.maxHp * 0.62) continue;
        if (!canAim(ghost, ally, "heal", b)) continue;
        const score = (1 - ally.hp / ally.maxHp) * 80;
        if (score > bestScore) {
          bestScore = score;
          best = spot.cost === 0 ? { type: "tactic", target: ally.iid, tactic: "heal" } : { type: "move-tactic", x: spot.x, y: spot.y, cost: spot.cost, target: ally.iid, tactic: "heal" };
        }
      }
    }
    for (const foe of foes) {
      if (canAim(ghost, foe, "attack", b)) {
        const fc = forecast(b, ghost, foe, "attack");
        let score = fc.dmg + (foe.hp <= fc.dmg ? 70 : 0);
        if (foe.defId === "caocao") score += 24;
        if (foe.defId === b.boss) score += 18;
        if (u.ai === "backline" && manh(spot.x, spot.y, foe.x, foe.y) === 1) score -= 28;
        if (u.ai === "guard") {
          const home = manh(spot.x, spot.y, u.originX, u.originY);
          if (home > 2) score -= 40;
        }
        if (score > bestScore) {
          bestScore = score;
          best =
            spot.cost === 0
              ? { type: "attack", target: foe.iid, kind: "attack" }
              : { type: "move-attack", x: spot.x, y: spot.y, cost: spot.cost, target: foe.iid, kind: "attack" };
        }
      }
      if (u.tactics.includes("snipe") && u.mp >= TAC_COST.snipe && canAim(ghost, foe, "snipe", b)) {
        const fc = forecast(b, ghost, foe, "snipe");
        const score = fc.dmg + 6;
        if (score > bestScore) {
          bestScore = score;
          best =
            spot.cost === 0
              ? { type: "attack", target: foe.iid, kind: "snipe" }
              : { type: "move-attack", x: spot.x, y: spot.y, cost: spot.cost, target: foe.iid, kind: "snipe" };
        }
      }
      for (const tac of ["fire", "rock", "confuse"] as const) {
        if (!u.tactics.includes(tac) || u.mp < TAC_COST[tac]) continue;
        if (!canAim(ghost, foe, tac, b)) continue;
        const fc = forecast(b, ghost, foe, tac === "confuse" ? "confuse" : tac);
        let score = tac === "confuse" ? fc.hit * 0.45 : fc.dmg + 4;
        if (tac === "fire" && b.weather === "乾風") score += 6;
        if (score > bestScore) {
          bestScore = score;
          best = spot.cost === 0 ? { type: "tactic", target: foe.iid, tactic: tac } : { type: "move-tactic", x: spot.x, y: spot.y, cost: spot.cost, target: foe.iid, tactic: tac };
        }
      }
    }
  }
  if (best.type !== "wait") return best;
  if (hold || u.ai === "guard") return { type: "wait" };
  const goal = nearestFoe(u, b);
  if (!goal || tiles.length === 0) return { type: "wait" };
  let pick: Reach | null = null;
  let bestD = 999;
  for (const spot of tiles) {
    const ranged = u.cls === "archer" || u.cls === "horsebow";
    const d = ranged ? Math.abs(manh(spot.x, spot.y, goal.x, goal.y) - 2) : manh(spot.x, spot.y, goal.x, goal.y);
    if (d < bestD) {
      bestD = d;
      pick = spot;
    }
  }
  if (!pick) return { type: "wait" };
  if (manh(pick.x, pick.y, goal.x, goal.y) >= manh(u.x, u.y, goal.x, goal.y) && u.cls !== "archer" && u.cls !== "horsebow") return { type: "wait" };
  return { type: "move", x: pick.x, y: pick.y, cost: pick.cost };
}

export function checkSanying(b: Battle) {
  if (b.stageId !== "hulao" || b.outcome) return false;
  const lv = living(b).find((u) => u.defId === "lvbu");
  if (!lv) return false;
  const ids = ["liubei", "guanyu", "zhangfei"];
  const ok = ids.every((id) => living(b).some((u) => u.defId === id && u.guest && manh(u.x, u.y, lv.x, lv.y) === 1));
  if (!ok) return false;
  lv.hp = 0;
  lv.retreated = true;
  b.outcome = "win";
  b.winReason = "sanying";
  b.phase = "over";
  b.lastHit = "sanying";
  pushLog(b, "劉備、關羽、張飛齊上，三英戰呂布！呂布撥馬退走。");
  floatAt(b, lv.x, lv.y, "三英", "crit");
  return true;
}

export function actingSide(b: Battle): "guest" | "enemy" | null {
  if (b.phase === "guest" || b.phase === "enemy") return b.phase;
  return null;
}

export function nextActor(b: Battle) {
  const side = actingSide(b);
  if (!side) return null;
  return (
    living(b).find((u) => !u.done && (side === "enemy" ? u.side === "enemy" : u.guest)) ?? null
  );
}

export function bootPhase(b: Battle, phase: "guest" | "enemy") {
  b.phase = phase;
  b.announce = null;
  b.pending = null;
  b.ui = { selected: null, mode: "idle", aim: null };
  for (const u of b.units) {
    const mine = phase === "enemy" ? u.side === "enemy" : u.guest;
    if (mine && !u.retreated) {
      u.done = false;
      u.tilesMoved = 0;
      u.originX = u.x;
      u.originY = u.y;
      confuseRoll(b, u);
    }
  }
  if (phase === "guest") {
    pushLog(b, "—— 友軍行動 ——");
    checkSanying(b);
  } else pushLog(b, "—— 敵軍行動 ——");
  if (!b.outcome && !nextActor(b)) finishAiPhase(b);
}

export function finishAiPhase(b: Battle) {
  if (b.outcome) return;
  if (b.phase === "guest") {
    const hasEnemy = living(b).some((u) => u.side === "enemy");
    if (!hasEnemy) {
      judge(b);
      return;
    }
    queueAnnounce(b, "enemy");
    return;
  }
  queueAnnounce(b, "player");
}

export function queueAnnounce(b: Battle, next: "enemy" | "player") {
  if (b.outcome) return;
  if (next === "player") {
    b.turn += 1;
    if (b.turn > b.maxTurn) {
      b.outcome = "lose";
      b.phase = "over";
      b.announce = null;
      pushLog(b, "時限已至，未能達成目標。");
      return;
    }
    b.phase = "announce";
    b.announce = { tone: "player", title: `第${b.turn}回合、我軍階段`, next: "player" };
    return;
  }
  b.phase = "announce";
  b.announce = { tone: "enemy", title: "敵軍階段", next: "enemy" };
}

export function releaseAnnounce(b: Battle) {
  if (b.phase !== "announce" || !b.announce || b.outcome) return;
  const next = b.announce.next;
  b.announce = null;
  if (next === "enemy") bootPhase(b, "enemy");
  else beginPlayerPhase(b);
}

export function stepAi(b: Battle) {
  if (b.outcome || (b.phase !== "guest" && b.phase !== "enemy")) return;
  if (b.pending) {
    resolvePending(b);
    b.pending = null;
    b.aiSerial += 1;
    if (!b.outcome && !nextActor(b) && !b.pending) finishAiPhase(b);
    return;
  }
  const actor = nextActor(b);
  if (!actor) {
    finishAiPhase(b);
    b.aiSerial += 1;
    return;
  }
  const plan = planAi(actor, b);
  if (plan.type === "wait") {
    waitUnit(b, actor);
  } else if (plan.type === "move") {
    moveUnit(b, actor, plan.x, plan.y, plan.cost);
    actor.done = true;
  } else if (plan.type === "duel") {
    b.pending = { kind: "duel", iid: actor.iid, target: plan.target };
  } else if (plan.type === "attack") {
    const target = b.units.find((u) => u.iid === plan.target);
    if (target) strike(b, actor, target, plan.kind);
    actor.done = true;
  } else if (plan.type === "tactic") {
    const target = b.units.find((u) => u.iid === plan.target);
    if (target) cast(b, actor, target, plan.tactic);
    actor.done = true;
  } else if (plan.type === "move-attack" || plan.type === "move-tactic") {
    moveUnit(b, actor, plan.x, plan.y, plan.cost);
    b.pending = {
      kind: plan.type === "move-attack" ? "attack" : "tactic",
      iid: actor.iid,
      target: plan.target,
      tactic: plan.type === "move-tactic" ? plan.tactic : plan.type === "move-attack" && plan.kind === "snipe" ? "snipe" : undefined,
    };
  }
  b.aiSerial += 1;
  if (!b.outcome && !b.pending && !nextActor(b)) finishAiPhase(b);
}

function resolvePending(b: Battle) {
  const p: PendingAi | null = b.pending;
  if (!p) return;
  const actor = b.units.find((u) => u.iid === p.iid);
  const target = b.units.find((u) => u.iid === p.target);
  if (!actor || actor.retreated) return;
  if (p.kind === "duel" && target && !target.retreated) {
    resolveAutoDuel(b, actor, target);
  } else if (target && !target.retreated) {
    if (p.kind === "attack") strike(b, actor, target, p.tactic === "snipe" ? "snipe" : "attack");
    else if (p.kind === "tactic" && p.tactic) cast(b, actor, target, p.tactic);
  }
  actor.done = true;
}

function resolveAutoDuel(b: Battle, a: BattleUnit, d: BattleUnit) {
  let ah = 36 + a.war * 0.25;
  let dh = 36 + d.war * 0.25;
  let guard = 0;
  for (let i = 0; i < 8 && ah > 0 && dh > 0; i++) {
    const as = Math.max(4, (a.war / 7) * (0.85 + Math.random() * 0.3));
    const ds = Math.max(4, (d.war / 7) * (0.85 + Math.random() * 0.3));
    dh -= as * (guard === 2 ? 0.45 : 1);
    if (dh <= 0) break;
    ah -= ds * (guard === 1 ? 0.45 : 1);
    guard = 0;
  }
  pushLog(b, `${a.name}向${d.name}單挑！`);
  if (dh <= 0 && ah <= 0) {
    a.hp = Math.max(1, Math.round(a.hp * 0.7));
    d.hp = Math.max(1, Math.round(d.hp * 0.7));
    pushLog(b, "單挑不分勝負。");
  } else if (dh <= 0) {
    const gap = a.war - d.war;
    if (gap >= -2) {
      d.hp = 0;
      d.retreated = true;
      b.lastHit = a.defId;
      pushLog(b, `${a.name}單挑戰勝${d.name}。`);
      floatAt(b, d.x, d.y, "單挑勝", "crit");
    } else {
      d.hp = Math.max(1, Math.round(d.maxHp * 0.45));
      pushLog(b, `${a.name}單挑佔優，${d.name}帶傷退開。`);
    }
  } else {
    a.hp = Math.max(1, Math.round(a.hp * 0.55));
    a.morale = clamp(a.morale - 15, 0, 100);
    pushLog(b, `${a.name}單挑落敗。`);
    floatAt(b, a.x, a.y, "單挑敗", "dmg");
  }
  judge(b);
}

export function applyDuelResult(b: Battle, att: BattleUnit, def: BattleUnit, winner: "player" | "enemy" | "draw") {
  if (winner === "draw") {
    att.hp = Math.max(1, Math.round(att.hp * 0.8));
    def.hp = Math.max(1, Math.round(def.hp * 0.8));
    pushLog(b, "單挑不分勝負。");
  } else if (winner === "player") {
    const gap = att.war - def.war;
    if (gap >= -2) {
      def.hp = 0;
      def.retreated = true;
      b.lastHit = att.defId;
      att.expGain += 30;
      att.kills += 1;
      pushLog(b, `${att.name}單挑斬退${def.name}！`);
      floatAt(b, def.x, def.y, "單挑勝", "crit");
    } else {
      const left = Math.max(1, Math.round(def.hp * (0.5 + gap * 0.01)));
      const dealt = def.hp - left;
      def.hp = left;
      att.expGain += 18;
      pushLog(b, `${att.name}單挑佔了上風，${def.name}仍剩兵力${left}。`);
      floatAt(b, def.x, def.y, `${dealt}`, "dmg");
    }
  } else {
    att.hp = Math.max(1, Math.round(att.hp * (att.war + 20 >= def.war ? 0.62 : 0.48)));
    att.morale = clamp(att.morale - 18, 0, 100);
    pushLog(b, `${att.name}單挑不敵${def.name}。`);
    floatAt(b, att.x, att.y, "單挑敗", "dmg");
  }
  att.done = true;
  judge(b);
}

export function playerAllDone(b: Battle) {
  return living(b)
    .filter((u) => u.side === "player" && !u.guest)
    .every((u) => u.done);
}

export function endPlayerPhase(b: Battle) {
  b.ui = { selected: null, mode: "idle", aim: null };
  const guests = living(b).some((u) => u.guest);
  if (guests) bootPhase(b, "guest");
  else queueAnnounce(b, "enemy");
}
