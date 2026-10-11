export type Cls = "hero" | "cavalry" | "infantry" | "archer" | "horsebow" | "strategist";
export type Side = "player" | "enemy";
export type AiKind = "normal" | "aggressive" | "backline" | "hold" | "guard";
export type TacticId = "fire" | "heal" | "rally" | "confuse" | "rock" | "guard" | "snipe";
export type TerrainId =
  | "plain"
  | "road"
  | "forest"
  | "mountain"
  | "water"
  | "bridge"
  | "village"
  | "wall"
  | "gate"
  | "keep"
  | "camp"
  | "hill"
  | "field"
  | "depot"
  | "stone"
  | "fence"
  | "flame";
export type Screen = "title" | "story" | "brief" | "battle" | "result" | "camp" | "ending" | "help";

export interface WeaponDef {
  id: string;
  name: string;
  classes: Cls[];
  atk: number;
  def: number;
  intel: number;
  agi: number;
  unique: boolean;
  note: string;
}

export interface UnitDef {
  id: string;
  name: string;
  courtesy: string;
  cls: Cls;
  art: string;
  portrait?: string;
  baseLevel: number;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  intel: number;
  agi: number;
  luk: number;
  war: number;
  mov: number;
  tactics: TacticId[];
  ai?: AiKind;
}

export interface RosterUnit {
  id: string;
  level: number;
  exp: number;
}

export interface Campaign {
  ambition: number;
  stage: number;
  cleared: string[];
  flags: string[];
  weapons: string[];
  weaponLv: Record<string, number>;
  weaponUse: Record<string, number>;
  equipped: Record<string, string>;
  bag: { jinchuang: number; xingjun: number };
  roster: Record<string, RosterUnit>;
}

export interface SayBeat {
  t: "say";
  who: string;
  art?: string;
  place?: string;
  scene?: string;
  text: string;
}
export interface ChoiceBeat {
  t: "choice";
  who: string;
  art?: string;
  place?: string;
  scene?: string;
  text: string;
  options: { label: string; ambition: number; flag?: string; reply: string }[];
}
export type Beat = SayBeat | ChoiceBeat;

export interface StoryState {
  beats: Beat[];
  i: number;
  reply: string | null;
}

export interface Spawn {
  unitId: string;
  name?: string;
  x: number;
  y: number;
  level?: number;
  ai?: AiKind;
  guest?: boolean;
  weapon?: string;
}

export interface StageDef {
  id: string;
  no: number;
  name: string;
  chapter: string;
  year: string;
  weather: "晴" | "乾風";
  maxTurn: number;
  holdReleaseTurn?: number;
  brief: string;
  objective: string;
  hint: string;
  map: string[];
  player: Spawn[];
  guests: Spawn[];
  enemies: Spawn[];
  boss: string;
  duel?: "huaxiong" | "lubu";
}

export interface Buff {
  kind: "atk" | "def" | "confuse";
  until: number;
}

export interface BattleUnit {
  iid: string;
  defId: string;
  name: string;
  courtesy: string;
  cls: Cls;
  side: Side;
  guest: boolean;
  art: string;
  portrait?: string;
  x: number;
  y: number;
  originX: number;
  originY: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  intel: number;
  agi: number;
  luk: number;
  war: number;
  mov: number;
  morale: number;
  tactics: TacticId[];
  ai: AiKind;
  done: boolean;
  retreated: boolean;
  tilesMoved: number;
  kills: number;
  expGain: number;
  swings: number;
  buffs: Buff[];
  level: number;
  weaponId: string | null;
}

export interface Floater {
  id: string;
  x: number;
  y: number;
  text: string;
  kind: "dmg" | "heal" | "miss" | "crit" | "info";
}

export type AimKind = "attack" | "snipe" | "fire" | "heal" | "confuse" | "rock";

export interface BattleUi {
  selected: string | null;
  look?: string | null;
  mode: "idle" | "menu" | "aim";
  aim: AimKind | null;
}

export interface Announce {
  tone: "enemy" | "player";
  title: string;
  next: "enemy" | "player";
}

export interface PendingAi {
  kind: "attack" | "tactic" | "duel";
  iid: string;
  target: string;
  tactic?: TacticId;
}

export interface Battle {
  stageId: string;
  map: TerrainId[][];
  units: BattleUnit[];
  turn: number;
  maxTurn: number;
  weather: "晴" | "乾風";
  phase: "player" | "guest" | "enemy" | "announce" | "over";
  announce: Announce | null;
  outcome: "win" | "lose" | null;
  winReason: "boss" | "sanying" | null;
  boss: string;
  duelKind: StageDef["duel"] | null;
  holdReleaseTurn: number;
  bag: { jinchuang: number; xingjun: number };
  ui: BattleUi;
  log: string[];
  floats: Floater[];
  aiSerial: number;
  pending: PendingAi | null;
  lastHit: string | null;
}

export interface DuelState {
  attackerIid: string;
  defenderIid: string;
  attackerName: string;
  defenderName: string;
  attackerArt: string;
  defenderArt: string;
  aWar: number;
  dWar: number;
  aHp: number;
  aMax: number;
  dHp: number;
  dMax: number;
  aSpirit: number;
  dSpirit: number;
  aGuard: boolean;
  dGuard: boolean;
  log: string[];
  round: number;
  done: boolean;
  winner: "player" | "enemy" | "draw" | null;
  auto: boolean;
}

export interface LevelUp {
  id: string;
  name: string;
  from: number;
  to: number;
}

export interface ResultInfo {
  win: boolean;
  stageId: string;
  lines: string[];
  levels: LevelUp[];
}
