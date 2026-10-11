import type { Beat, Cls, StageDef, TacticId, UnitDef, WeaponDef } from "./types";

export const CLS_NAME: Record<Cls, string> = {
  hero: "群雄",
  cavalry: "騎兵",
  infantry: "步兵",
  archer: "弓兵",
  horsebow: "馬弓兵",
  strategist: "策士",
};

export const TAC_NAME: Record<TacticId, string> = {
  fire: "火計",
  heal: "治療",
  rally: "鼓舞",
  confuse: "混亂",
  rock: "落石",
  guard: "防禦",
  snipe: "齊射",
};

export const TAC_TIP: Record<TacticId, string> = {
  fire: "火計：以精神灼燒射程內的敵軍。樹林與乾風會加強，不受兵種相剋。",
  heal: "治療：回復射程內我軍或友軍的兵力。",
  rally: "鼓舞：提高自己的士氣與攻擊，維持約兩回合。",
  confuse: "混亂：命中後，敵軍下回合很可能無法行動。",
  rock: "落石：只對挨著山地的敵軍有效。",
  guard: "防禦：本回合大幅提高防禦。",
  snipe: "齊射：對兩格外的敵軍施放較強的遠射。",
};

export const ITEM_TIP = {
  jinchuang: "金創藥：立刻回復約四成五的最大兵力。",
  xingjun: "行軍丹：回復策力，並略微回復兵力。",
  attack: "攻擊：打紅格裡的敵軍。直接點敵軍也一樣。移動兩格以上再打，會變成突擊。",
  wait: "待命：結束這名武將的行動。站在村莊或兵營上會回復。",
  duel: "單挑：與相鄰的華雄或呂布比武力。",
  cancel: "取消：退回這回合的出發格，或放下這名武將。",
};

export const TAC_COST: Record<TacticId, number> = {
  fire: 8,
  heal: 6,
  rally: 5,
  confuse: 8,
  rock: 7,
  guard: 3,
  snipe: 4,
};

const G = {
  hero: { hp: 8, mp: 1, atk: 2, def: 1, intel: 2, agi: 1 },
  cavalry: { hp: 7, mp: 0, atk: 2, def: 1, intel: 0, agi: 1 },
  infantry: { hp: 9, mp: 0, atk: 1, def: 2, intel: 0, agi: 0 },
  archer: { hp: 6, mp: 0, atk: 2, def: 1, intel: 0, agi: 1 },
  horsebow: { hp: 7, mp: 1, atk: 2, def: 1, intel: 0, agi: 2 },
  strategist: { hp: 5, mp: 2, atk: 0, def: 1, intel: 3, agi: 1 },
} as const;

export function growth(cls: Cls) {
  return G[cls];
}

export const WEAPONS: WeaponDef[] = [
  { id: "yitian", name: "倚天劍", classes: ["hero"], atk: 12, def: 0, intel: 2, agi: 2, unique: true, note: "曹操自帶。攻擊成長。" },
  { id: "changqiang", name: "長槍", classes: ["cavalry", "infantry", "hero"], atk: 6, def: 0, intel: 0, agi: 0, unique: false, note: "軍中制式長兵。" },
  { id: "dao", name: "環首刀", classes: ["infantry", "hero", "cavalry"], atk: 5, def: 1, intel: 0, agi: 0, unique: false, note: "步戰常用。" },
  { id: "gong", name: "檀弓", classes: ["archer", "horsebow"], atk: 7, def: 0, intel: 0, agi: 2, unique: false, note: "遠射。馬弓兵亦可使用。" },
  { id: "shan", name: "羽扇", classes: ["strategist", "hero"], atk: 0, def: 0, intel: 8, agi: 1, unique: false, note: "增精神。" },
  { id: "taiping", name: "太平要術", classes: ["strategist", "hero"], atk: 0, def: 2, intel: 12, agi: 0, unique: true, note: "破張寶所得。" },
  { id: "guding", name: "古錠刀", classes: ["hero", "infantry"], atk: 14, def: 1, intel: 0, agi: 1, unique: true, note: "孫堅所贈。" },
  { id: "pishou", name: "皮手套", classes: ["hero", "cavalry", "infantry", "archer", "horsebow", "strategist"], atk: 2, def: 3, intel: 0, agi: 6, unique: true, note: "溫酒斬華雄之遺物。" },
  { id: "pikui", name: "皮盔", classes: ["hero", "cavalry", "infantry", "archer", "horsebow"], atk: 0, def: 8, intel: 0, agi: 0, unique: true, note: "虎牢戰利品。" },
  { id: "huaji", name: "方天畫戟", classes: ["hero", "cavalry"], atk: 16, def: 2, intel: 0, agi: 2, unique: true, note: "親手擊退呂布。" },
];

export const UNIQUE_WEAPONS = new Set(WEAPONS.filter((w) => w.unique).map((w) => w.id));

function u(p: UnitDef): UnitDef {
  return p;
}

export const UNITS: Record<string, UnitDef> = {
  caocao: u({ id: "caocao", name: "曹操", courtesy: "孟德", cls: "hero", art: "caocao", portrait: "caocao", baseLevel: 3, hp: 112, mp: 22, atk: 36, def: 26, intel: 36, agi: 28, luk: 30, war: 80, mov: 5, tactics: ["fire", "rally", "guard"] }),
  xiahoudun: u({ id: "xiahoudun", name: "夏侯惇", courtesy: "元讓", cls: "cavalry", art: "xiahoudun", portrait: "xiahoudun", baseLevel: 3, hp: 116, mp: 12, atk: 40, def: 28, intel: 16, agi: 26, luk: 22, war: 86, mov: 7, tactics: ["guard"] }),
  xiahouyuan: u({ id: "xiahouyuan", name: "夏侯淵", courtesy: "妙才", cls: "horsebow", art: "xiahouyuan", portrait: "xiahouyuan", baseLevel: 2, hp: 94, mp: 12, atk: 36, def: 20, intel: 18, agi: 32, luk: 24, war: 76, mov: 7, tactics: ["snipe"] }),
  caoren: u({ id: "caoren", name: "曹仁", courtesy: "子孝", cls: "cavalry", art: "caoren", portrait: "caoren", baseLevel: 2, hp: 122, mp: 10, atk: 32, def: 34, intel: 18, agi: 18, luk: 20, war: 74, mov: 6, tactics: ["guard"] }),
  caohong: u({ id: "caohong", name: "曹洪", courtesy: "子廉", cls: "cavalry", art: "caohong", portrait: "caohong", baseLevel: 2, hp: 104, mp: 10, atk: 34, def: 24, intel: 14, agi: 26, luk: 18, war: 72, mov: 6, tactics: ["guard"] }),
  guanyu: u({ id: "guanyu", name: "關羽", courtesy: "雲長", cls: "cavalry", art: "guanyu", portrait: "guanyu", baseLevel: 5, hp: 128, mp: 10, atk: 46, def: 30, intel: 24, agi: 30, luk: 28, war: 94, mov: 6, tactics: ["guard"], ai: "aggressive" }),
  zhangfei: u({ id: "zhangfei", name: "張飛", courtesy: "翼德", cls: "infantry", art: "zhangfei", portrait: "zhangfei", baseLevel: 5, hp: 136, mp: 8, atk: 48, def: 28, intel: 12, agi: 22, luk: 20, war: 92, mov: 5, tactics: ["guard"], ai: "aggressive" }),
  liubei: u({ id: "liubei", name: "劉備", courtesy: "玄德", cls: "hero", art: "liubei", portrait: "liubei", baseLevel: 4, hp: 110, mp: 16, atk: 30, def: 26, intel: 30, agi: 24, luk: 26, war: 72, mov: 5, tactics: ["rally", "heal"], ai: "normal" }),
  sunjian: u({ id: "sunjian", name: "孫堅", courtesy: "文臺", cls: "infantry", art: "sunjian", portrait: "sunjian", baseLevel: 6, hp: 150, mp: 12, atk: 44, def: 36, intel: 22, agi: 26, luk: 24, war: 90, mov: 5, tactics: ["guard"], ai: "aggressive" }),
  lvbu: u({ id: "lvbu", name: "呂布", courtesy: "奉先", cls: "cavalry", art: "lvbu", portrait: "lvbu", baseLevel: 8, hp: 198, mp: 14, atk: 54, def: 36, intel: 18, agi: 36, luk: 30, war: 99, mov: 7, tactics: ["guard"], ai: "hold" }),
  huaxiong: u({ id: "huaxiong", name: "華雄", courtesy: "", cls: "cavalry", art: "huaxiong", portrait: "huaxiong", baseLevel: 5, hp: 136, mp: 10, atk: 44, def: 28, intel: 14, agi: 24, luk: 16, war: 84, mov: 6, tactics: ["guard"], ai: "aggressive" }),
  zhangbao: u({ id: "zhangbao", name: "張寶", courtesy: "", cls: "strategist", art: "zhangbao", portrait: "zhangbao", baseLevel: 4, hp: 92, mp: 32, atk: 18, def: 16, intel: 42, agi: 20, luk: 18, war: 42, mov: 4, tactics: ["fire", "confuse", "heal"], ai: "backline" }),
  zhangliang: u({ id: "zhangliang", name: "張梁", courtesy: "", cls: "infantry", art: "huangjin", baseLevel: 4, hp: 128, mp: 8, atk: 38, def: 26, intel: 14, agi: 18, luk: 14, war: 70, mov: 5, tactics: ["guard"], ai: "aggressive" }),
  zhangliao: u({ id: "zhangliao", name: "張遼", courtesy: "文遠", cls: "cavalry", art: "zhangliao", portrait: "zhangliao", baseLevel: 5, hp: 132, mp: 10, atk: 44, def: 30, intel: 22, agi: 30, luk: 22, war: 88, mov: 6, tactics: ["guard"], ai: "aggressive" }),
  gaoshun: u({ id: "gaoshun", name: "高順", courtesy: "", cls: "infantry", art: "dong", baseLevel: 5, hp: 140, mp: 8, atk: 38, def: 36, intel: 16, agi: 18, luk: 16, war: 80, mov: 4, tactics: ["guard"], ai: "guard" }),
  xurong: u({ id: "xurong", name: "徐榮", courtesy: "", cls: "cavalry", art: "yuancav", baseLevel: 4, hp: 116, mp: 8, atk: 38, def: 26, intel: 16, agi: 24, luk: 14, war: 76, mov: 6, tactics: ["guard"], ai: "aggressive" }),
  huzhen: u({ id: "huzhen", name: "胡軫", courtesy: "", cls: "infantry", art: "dong", baseLevel: 4, hp: 118, mp: 8, atk: 36, def: 28, intel: 12, agi: 16, luk: 12, war: 70, mov: 4, tactics: ["guard"], ai: "normal" }),
  hj_inf: u({ id: "hj_inf", name: "黃巾兵", courtesy: "", cls: "infantry", art: "huangjin", baseLevel: 2, hp: 78, mp: 0, atk: 26, def: 16, intel: 8, agi: 14, luk: 8, war: 36, mov: 4, tactics: [], ai: "normal" }),
  hj_arch: u({ id: "hj_arch", name: "黃巾弓", courtesy: "", cls: "archer", art: "archer", baseLevel: 2, hp: 70, mp: 4, atk: 30, def: 12, intel: 8, agi: 18, luk: 8, war: 30, mov: 4, tactics: ["snipe"], ai: "backline" }),
  hj_cav: u({ id: "hj_cav", name: "黃巾騎", courtesy: "", cls: "cavalry", art: "yuancav", baseLevel: 2, hp: 84, mp: 0, atk: 30, def: 16, intel: 8, agi: 16, luk: 8, war: 40, mov: 6, tactics: [], ai: "aggressive" }),
  dz_inf: u({ id: "dz_inf", name: "西涼步", courtesy: "", cls: "infantry", art: "dong", baseLevel: 3, hp: 96, mp: 0, atk: 32, def: 24, intel: 8, agi: 14, luk: 8, war: 44, mov: 4, tactics: [], ai: "normal" }),
  dz_arch: u({ id: "dz_arch", name: "西涼弓", courtesy: "", cls: "archer", art: "archer", baseLevel: 3, hp: 80, mp: 4, atk: 34, def: 16, intel: 10, agi: 18, luk: 8, war: 36, mov: 4, tactics: ["snipe"], ai: "backline" }),
  dz_cav: u({ id: "dz_cav", name: "西涼騎", courtesy: "", cls: "cavalry", art: "yuancav", baseLevel: 3, hp: 98, mp: 0, atk: 34, def: 22, intel: 8, agi: 18, luk: 8, war: 48, mov: 6, tactics: [], ai: "aggressive" }),
};

export const UNIT_BIO: Record<string, string> = {
  caocao: "字孟德，騎都尉。曹軍主將，陣亡則此戰即敗。能火計、鼓舞，也守得住陣。",
  xiahoudun: "字元讓。曹操從弟，獨眼騎將。移動比步兵遠，衝陣克制步兵。",
  xiahouyuan: "字妙才。馬弓兵，騎在馬上放箭。移動同騎兵，遠射克制騎兵，是對付呂布的關鍵。",
  caoren: "字子孝。騎將，盾堅矛重，移動勝於步兵，適合頂在陣前。",
  caohong: "字子廉。曹氏騎將，來去比步卒快，用來包抄側翼。",
  guanyu: "字雲長。劉備的義弟，此戰是友軍。若由他擊破華雄，便是溫酒斬將，功勞歸劉備。",
  zhangfei: "字翼德。友軍猛將。會自己找人打，別讓他和關羽、劉備同時貼上呂布。",
  liubei: "字玄德。友軍。虎牢關若與關張同時貼住呂布，就會演出三英戰呂布。",
  sunjian: "字文臺。江東猛虎，友軍。汜水關要護住他，活下來才會把古錠刀送給你。",
  lvbu: "字奉先。天下無雙的騎將。步兵近戰吃大虧，用馬弓兵遠射。別一窩蜂衝進關。",
  huaxiong: "董卓部將，汜水關大將。擊破他即過關。不要讓關羽搶走最後一擊。",
  zhangbao: "黃巾渠帥，在營中作法。潁川之戰的目標。善火計與混亂。",
  zhangliang: "黃巾渠帥，率眾死戰。武力高，但不是這關的勝利條件。",
  zhangliao: "字文遠。呂布帳下騎將，會主動接戰。",
  gaoshun: "呂布部下陷陣營統領，步戰扎實，不輕易離關。",
  xurong: "董卓部騎將。",
  huzhen: "董卓部將，步戰。",
  hj_inf: "黃巾步卒。被騎兵克制，近戰反擊很常見。",
  hj_arch: "黃巾弓手。怕步兵貼身，自己則克制騎兵。",
  hj_cav: "黃巾騎兵。移動快，怕弓箭與馬弓。",
  dz_inf: "西涼步卒。防禦厚，移動慢。",
  dz_arch: "西涼弓手。遠射克騎，怕步兵貼上來。",
  dz_cav: "西涼鐵騎。移動遠，克制步兵。",
};

export const STORIES: Beat[][] = [
  [
    { t: "say", who: "旁白", place: "潁川郊外", scene: "camp", text: "中平元年。黃巾起事，潁川賊勢滔天。騎都尉曹操率宗族兵，投入朱儁帳下。" },
    { t: "say", who: "曹操", art: "caocao", place: "曹營", scene: "camp", text: "漢室衰微，豪傑並起。這天下，正等一個人把它撥亂反正。" },
    {
      t: "choice",
      who: "曹操",
      art: "caocao",
      place: "曹營",
      scene: "camp",
      text: "此戰若勝，日後當如何自處？",
      options: [
        { label: "正如吾心所願", ambition: 1, flag: "red-open", reply: "曹操目光轉冷。亂世，正是他的舞台。" },
        { label: "似乎言之過早", ambition: -1, flag: "blue-open", reply: "曹操按劍而笑。先定潁川，再談天下。" },
      ],
    },
    { t: "say", who: "朱儁", place: "朱儁大營", scene: "camp", text: "孟德，張寶在營中作法，張梁率眾死戰。擊破張寶，潁川可定。步兵克弓，弓與馬弓克騎，騎克步——勿忘兵法。" },
  ],
  [
    { t: "say", who: "旁白", place: "洛陽道上", scene: "gate", text: "潁川既定。董卓入洛，廢立天子，諸侯會盟酸棗，推袁紹為盟主。" },
    { t: "say", who: "王允", place: "洛陽王允府中", scene: "wangyun", text: "孟德來了。席間有一歌伎，名喚貂蟬……" },
    {
      t: "choice",
      who: "曹操",
      art: "caocao",
      place: "洛陽王允府中",
      scene: "wangyun",
      text: "曹操看向貂蟬。",
      options: [
        { label: "真是教人激賞", ambition: 1, flag: "diaochan-red", reply: "曹操撫掌。美人如刀，亦可為刃。" },
        { label: "沒什麼特別的", ambition: -1, flag: "diaochan-blue", reply: "曹操淡淡道：如今該看的是汜水關，不是席上歌舞。" },
      ],
    },
    { t: "say", who: "孫堅", art: "sunjian", place: "汜水關前", scene: "gate", text: "董卓遣華雄守汜水。誰若後退，便是虧了這面漢幟。曹將軍，助我一臂。" },
    { t: "say", who: "旁白", place: "諸侯宴", scene: "feast", text: "關羽立於劉備之後，溫酒未涼。若讓他先觸華雄，這頓功勞便不是你的。" },
  ],
  [
    { t: "say", who: "袁紹", art: "yuanshao", place: "洛陽相府", scene: "xiangfu", text: "汜水既破，前軍已抵虎牢。呂布在關內，人言三姓家奴，萬夫不當。" },
    {
      t: "choice",
      who: "曹操",
      art: "caocao",
      place: "洛陽相府",
      scene: "xiangfu",
      text: "袁紹問：誰為先鋒？",
      options: [
        { label: "我軍為先鋒，直取呂布", ambition: 1, flag: "vanguard", reply: "曹操抱拳。頭功，他要自己拿。" },
        { label: "且讓諸侯先戰，我軍伺機", ambition: -1, flag: "patient", reply: "曹操按兵。呂布凶猛，馬弓與地形比血氣更可靠。" },
      ],
    },
    { t: "say", who: "旁白", place: "虎牢關", scene: "gate", text: "劉關張已在左翼。若三人同時貼上呂布，便會演出三英戰呂布——呂布退走，頭功歸劉備。" },
    { t: "say", who: "夏侯淵", art: "xiahouyuan", place: "曹營", scene: "camp", text: "孟德，呂布是騎兵。用馬弓射他。步兵上去，只是送。不要一窩蜂衝進關城。" },
  ],
];

const yingchuan: StageDef = {
  id: "yingchuan",
  no: 1,
  name: "潁川之戰",
  chapter: "序章・討黃巾",
  year: "中平元年",
  weather: "晴",
  maxTurn: 16,
  brief: "張寶據營作法，張梁率黃巾死戰。兩翼是沖天大火，不能穿過去，也不能隔火放箭。擊破張寶，即可平定潁川。友軍關張會自行進擊。",
  objective: "擊破張寶",
  hint: "大火封住左右。步兵克弓兵與馬弓兵，弓與馬弓克騎兵，騎兵克步兵。夏侯淵是馬弓，夏侯惇、曹仁、曹洪是騎兵。藍格可走，紅格可打。",
  map: [
    "W***........***W",
    "W***........***W",
    ".***...C....***.",
    ".**..........**.",
    ".**....Y.....**.",
    ".*............*.",
    ".*..||....||..*.",
    "....|......|....",
    "..V..........V..",
    "........==......",
    "................",
    "F..............F",
  ],
  player: [
    { unitId: "caocao", x: 7, y: 10, weapon: "yitian" },
    { unitId: "xiahoudun", x: 5, y: 10, weapon: "changqiang" },
    { unitId: "xiahouyuan", x: 9, y: 10, weapon: "gong" },
    { unitId: "caoren", x: 6, y: 11, weapon: "dao" },
    { unitId: "caohong", x: 8, y: 11, weapon: "changqiang" },
  ],
  guests: [
    { unitId: "guanyu", x: 12, y: 8, guest: true },
    { unitId: "zhangfei", x: 14, y: 10, guest: true },
  ],
  enemies: [
    { unitId: "zhangbao", x: 7, y: 2, ai: "backline" },
    { unitId: "zhangliang", x: 9, y: 3, ai: "aggressive" },
    { unitId: "hj_cav", x: 6, y: 0 },
    { unitId: "hj_inf", x: 5, y: 1 },
    { unitId: "hj_inf", x: 10, y: 1 },
    { unitId: "hj_inf", x: 4, y: 4 },
    { unitId: "hj_arch", x: 3, y: 5 },
    { unitId: "hj_arch", x: 12, y: 5 },
  ],
  boss: "zhangbao",
};

const sishui: StageDef = {
  id: "sishui",
  no: 2,
  name: "汜水關之戰",
  chapter: "第一章・霸王誕生",
  year: "初平元年",
  weather: "乾風",
  maxTurn: 18,
  brief: "華雄據汜水。保住孫堅，戰後可獲古錠刀。勿讓關羽先接觸華雄，否則溫酒斬華雄，功勞歸他。",
  objective: "擊破華雄",
  hint: "乾風會增強火計。孫堅脾氣躁進，清掉他身側能一擊致死的敵兵。騎兵走林地利耗高。相鄰華雄時可單挑。",
  map: [
    "MMMMM.GGG.MMMMM",
    "MM....C....F.MM",
    "M..F........H.M",
    "..H..F....F..H.",
    "...WWBBBWBBWW..",
    ".....F.....F...",
    "....==...==....",
    "...=.......=...",
    "..V.........V..",
    "...............",
    "...............",
    "F.............F",
  ],
  player: [
    { unitId: "caocao", x: 7, y: 10 },
    { unitId: "xiahoudun", x: 5, y: 10 },
    { unitId: "xiahouyuan", x: 9, y: 10 },
    { unitId: "caoren", x: 6, y: 11 },
    { unitId: "caohong", x: 8, y: 11 },
  ],
  guests: [
    { unitId: "sunjian", x: 7, y: 6, guest: true, ai: "aggressive" },
    { unitId: "guanyu", x: 4, y: 9, guest: true, ai: "aggressive" },
  ],
  enemies: [
    { unitId: "huaxiong", x: 7, y: 1, ai: "aggressive" },
    { unitId: "xurong", x: 11, y: 2 },
    { unitId: "huzhen", x: 3, y: 3 },
    { unitId: "dz_cav", x: 10, y: 3 },
    { unitId: "dz_inf", x: 8, y: 3 },
    { unitId: "dz_inf", x: 2, y: 5 },
    { unitId: "dz_arch", x: 13, y: 3 },
    { unitId: "dz_arch", x: 5, y: 5 },
  ],
  boss: "huaxiong",
  duel: "huaxiong",
};

const hulao: StageDef = {
  id: "hulao",
  no: 3,
  name: "虎牢關之戰",
  chapter: "第一章・霸王誕生",
  year: "初平元年",
  weather: "晴",
  maxTurn: 20,
  holdReleaseTurn: 6,
  brief: "擊敗呂布。不要首回合貼上關城，否則呂布率軍湧出。先清關前西涼兵，再用弓兵壓制呂布。若劉關張同時貼上呂布，三英會奪走頭功。",
  objective: "擊破呂布",
  hint: "呂布是騎兵。夏侯淵馬弓遠射有優勢，步兵貼上去會被減傷。城牆不可逾越，由關口進入。不要讓劉關張同時貼住呂布。",
  map: [
    "################",
    "#..K..........C#",
    "#..............#",
    "#.....C........#",
    "####..G..G..####",
    "................",
    "...H........H...",
    "................",
    "..WWWBB..BBWWW..",
    "................",
    "..V..........V..",
    "................",
    "F..............F",
  ],
  player: [
    { unitId: "caocao", x: 10, y: 11 },
    { unitId: "xiahoudun", x: 8, y: 11 },
    { unitId: "xiahouyuan", x: 12, y: 11 },
    { unitId: "caoren", x: 9, y: 12 },
    { unitId: "caohong", x: 11, y: 12 },
  ],
  guests: [
    { unitId: "liubei", x: 1, y: 10, guest: true, ai: "normal" },
    { unitId: "guanyu", x: 2, y: 11, guest: true, ai: "aggressive" },
    { unitId: "zhangfei", x: 3, y: 11, guest: true, ai: "aggressive" },
  ],
  enemies: [
    { unitId: "lvbu", x: 5, y: 1, ai: "hold" },
    { unitId: "zhangliao", x: 8, y: 5, ai: "aggressive" },
    { unitId: "gaoshun", x: 6, y: 5, ai: "guard" },
    { unitId: "dz_cav", x: 11, y: 5 },
    { unitId: "dz_inf", x: 12, y: 6 },
    { unitId: "dz_inf", x: 4, y: 6 },
    { unitId: "dz_arch", x: 10, y: 3 },
    { unitId: "dz_arch", x: 7, y: 2 },
  ],
  boss: "lvbu",
  duel: "lubu",
};

export const STAGES: StageDef[] = [yingchuan, sishui, hulao];

export function weaponById(id: string | null | undefined) {
  return WEAPONS.find((w) => w.id === id) ?? null;
}
