import { create } from "zustand";
import { sfx } from "./audio";
import { STAGES, STORIES, UNIQUE_WEAPONS, UNITS, weaponById } from "./content";
import {
  applyDuelResult,
  applyItem,
  applySelf,
  canAim,
  cast,
  duelEligible,
  endPlayerPhase,
  makeBattle,
  moveUnit,
  playerAllDone,
  reachable,
  releaseAnnounce,
  stepAi,
  strike,
  unitAt,
  waitUnit,
} from "./engine";
import type { AimKind, Battle, BattleUnit, Campaign, DuelState, ResultInfo, Screen, StoryState } from "./types";

const KEY = "caocao-zhuan-v1";

const ROSTER_IDS = ["caocao", "xiahoudun", "xiahouyuan", "caoren", "caohong"] as const;

function freshCampaign(): Campaign {
  const roster: Campaign["roster"] = {};
  for (const id of ROSTER_IDS) {
    const def = UNITS[id];
    if (!def) continue;
    roster[id] = { id, level: def.baseLevel, exp: 0 };
  }
  return {
    ambition: 0,
    stage: 0,
    cleared: [],
    flags: [],
    weapons: ["yitian", "changqiang", "dao", "gong"],
    weaponLv: { yitian: 1, changqiang: 1, dao: 1, gong: 1 },
    weaponUse: {},
    equipped: {
      caocao: "yitian",
      xiahoudun: "changqiang",
      xiahouyuan: "gong",
      caoren: "dao",
      caohong: "changqiang",
    },
    bag: { jinchuang: 3, xingjun: 2 },
    roster,
  };
}

function storyAt(i: number): StoryState {
  return { beats: STORIES[i] ?? [], i: 0, reply: null };
}

export function heartLabel(n: number) {
  if (n >= 2) return "奸雄";
  if (n <= -2) return "英雄";
  if (n > 0) return "偏霸";
  if (n < 0) return "偏王";
  return "未定";
}

function grant(c: Campaign, id: string) {
  if (!c.weapons.includes(id)) c.weapons.push(id);
  c.weaponLv[id] = c.weaponLv[id] ?? 1;
}

function levelUps(c: Campaign, b: Battle) {
  const levels: ResultInfo["levels"] = [];
  for (const u of b.units) {
    if (u.side !== "player" || u.guest) continue;
    const r = c.roster[u.defId];
    if (!r) continue;
    r.exp += u.expGain;
    if (u.weaponId) {
      c.weaponUse[u.weaponId] = (c.weaponUse[u.weaponId] ?? 0) + u.swings;
      const lv = 1 + Math.floor((c.weaponUse[u.weaponId] ?? 0) / 6);
      c.weaponLv[u.weaponId] = Math.max(c.weaponLv[u.weaponId] ?? 1, lv);
    }
    let guard = 0;
    while (r.exp >= 28 + r.level * 14 && guard < 5) {
      r.exp -= 28 + r.level * 14;
      const from = r.level;
      r.level += 1;
      levels.push({ id: u.defId, name: u.name, from, to: r.level });
      guard += 1;
    }
  }
  return levels;
}

function conclude(b: Battle, campaign: Campaign): { campaign: Campaign; result: ResultInfo } {
  const c: Campaign = structuredClone(campaign);
  const stage = STAGES.find((s) => s.id === b.stageId);
  if (b.outcome !== "win" || !stage) {
    return {
      campaign: c,
      result: {
        win: false,
        stageId: b.stageId,
        lines: ["曹操敗退，此戰未竟。可重新挑戰，武將等級維持戰前。"],
        levels: [],
      },
    };
  }
  const levels = levelUps(c, b);
  c.bag = {
    jinchuang: Math.min(5, b.bag.jinchuang + 1),
    xingjun: Math.min(4, b.bag.xingjun + 1),
  };
  const lines: string[] = [];
  if (stage.id === "yingchuan") {
    grant(c, "taiping");
    lines.push("張寶敗走，太平要術入手。無論是否親刃，符冊都歸曹操。");
  }
  if (stage.id === "sishui") {
    const sun = b.units.find((u) => u.defId === "sunjian");
    if (sun && !sun.retreated) {
      grant(c, "guding");
      c.flags.push("sunjian-alive");
      lines.push("孫堅未死。他以古錠刀相贈。");
    } else lines.push("孫堅敗退，古錠刀沒有送來。");
    if (b.lastHit === "guanyu") {
      grant(c, "pishou");
      c.flags.push("wine-guan");
      lines.push("關羽溫酒斬華雄。皮手套留下了，頭功卻記在劉備軍。");
    } else lines.push("華雄倒在曹軍陣前。");
  }
  if (stage.id === "hulao") {
    grant(c, "pikui");
    if (b.winReason === "sanying") {
      c.flags.push("sanying");
      lines.push("三英戰呂布，呂布退入關內。你收下皮盔，天下卻只記得劉關張。");
    } else {
      grant(c, "huaji");
      c.flags.push("lubu-cao");
      lines.push("呂布竟被曹軍擊退。方天畫戟與皮盔都入了庫。");
    }
  }
  if (!c.cleared.includes(stage.id)) c.cleared.push(stage.id);
  c.stage = Math.max(c.stage, stage.no);
  return { campaign: c, result: { win: true, stageId: stage.id, lines, levels } };
}

interface SaveBlob {
  v: 1;
  screen: Screen;
  campaign: Campaign;
  story: StoryState | null;
  result: ResultInfo | null;
}

function writeSave(s: { screen: Screen; campaign: Campaign; story: StoryState | null; result: ResultInfo | null }) {
  if (typeof localStorage === "undefined") return;
  if (s.screen === "battle" || s.screen === "help" || s.screen === "title") return;
  const blob: SaveBlob = { v: 1, screen: s.screen, campaign: s.campaign, story: s.story, result: s.result };
  localStorage.setItem(KEY, JSON.stringify(blob));
}

export interface GameStore {
  screen: Screen;
  helpFrom: Screen;
  campaign: Campaign;
  story: StoryState | null;
  battle: Battle | null;
  duel: DuelState | null;
  result: ResultInfo | null;
  booted: boolean;
  hasSave: boolean;
  confirmEnd: boolean;
  boot: () => void;
  newGame: () => void;
  continueGame: () => void;
  advance: () => void;
  choose: (index: number) => void;
  toBrief: () => void;
  toCamp: () => void;
  startBattle: () => void;
  clickTile: (x: number, y: number) => void;
  doCommand: (cmd: string) => void;
  aimTarget: (iid: string) => void;
  requestEnd: () => void;
  endTurn: () => void;
  ackAnnounce: () => void;
  stepAiTick: () => void;
  settle: () => void;
  duelAct: (act: "attack" | "guard" | "spirit") => void;
  finishDuel: () => void;
  ackResult: () => void;
  equip: (unitId: string, weaponId: string) => void;
  openHelp: () => void;
  closeHelp: () => void;
}

function selectedUnit(b: Battle): BattleUnit | null {
  if (!b.ui.selected) return null;
  return b.units.find((u) => u.iid === b.ui.selected) ?? null;
}

function afterAction(b: Battle) {
  b.ui = { selected: null, look: null, mode: "idle", aim: null };
  if (!b.outcome && playerAllDone(b)) endPlayerPhase(b);
}

function cueFrom(b: Battle, before: number) {
  const f = b.floats[before];
  if (!f || before >= b.floats.length) return;
  if (f.kind === "miss") sfx("clash");
  else if (f.kind === "crit") sfx("crit");
  else if (f.kind === "dmg") sfx("hurt");
  else if (f.kind === "heal") sfx("heal");
}

export const useGame = create<GameStore>((set, get) => ({
  screen: "title",
  helpFrom: "title",
  campaign: freshCampaign(),
  story: null,
  battle: null,
  duel: null,
  result: null,
  booted: false,
  hasSave: false,
  confirmEnd: false,

  boot: () => {
    let hasSave = false;
    try {
      hasSave = Boolean(localStorage.getItem(KEY));
    } catch {
      hasSave = false;
    }
    set({ booted: true, hasSave });
  },

  newGame: () => {
    const campaign = freshCampaign();
    const story = storyAt(0);
    set({ screen: "story", campaign, story, battle: null, result: null, duel: null, confirmEnd: false, hasSave: true });
    writeSave(get());
    sfx("click");
  },

  continueGame: () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const blob = JSON.parse(raw) as SaveBlob;
      if (!blob?.campaign) return;
      const screen = blob.screen === "battle" || blob.screen === "help" ? "camp" : blob.screen;
      set({
        campaign: blob.campaign,
        story: blob.story,
        result: blob.result,
        screen: screen || (blob.campaign.stage >= 3 ? "ending" : "camp"),
        battle: null,
        duel: null,
        confirmEnd: false,
        hasSave: true,
      });
      sfx("click");
    } catch {
      set({ hasSave: false });
    }
  },

  advance: () => {
    const story = get().story;
    if (!story) return;
    const beat = story.beats[story.i];
    if (!beat) {
      set({ screen: "brief" });
      writeSave(get());
      return;
    }
    if (beat.t === "choice" && !story.reply) return;
    if (story.reply) {
      const next = { ...story, reply: null, i: story.i + 1 };
      if (next.i >= next.beats.length) {
        const screen = get().campaign.stage === 0 ? "brief" : "camp";
        set({ story: next, screen });
        writeSave(get());
        return;
      }
      set({ story: next });
      writeSave(get());
      return;
    }
    const next = { ...story, i: story.i + 1 };
    if (next.i >= next.beats.length) {
      const screen = get().campaign.stage === 0 ? "brief" : "camp";
      set({ story: next, screen });
      writeSave(get());
      return;
    }
    set({ story: next });
    sfx("click");
  },

  choose: (index) => {
    const story = get().story;
    const camp = structuredClone(get().campaign);
    if (!story) return;
    const beat = story.beats[story.i];
    if (!beat || beat.t !== "choice") return;
    const opt = beat.options[index];
    if (!opt) return;
    camp.ambition += opt.ambition;
    if (opt.flag) camp.flags.push(opt.flag);
    set({ campaign: camp, story: { ...story, reply: opt.reply } });
    writeSave(get());
    sfx("click");
  },

  toBrief: () => {
    set({ screen: "brief", battle: null, duel: null });
    writeSave(get());
  },

  toCamp: () => {
    set({ screen: "camp", battle: null, duel: null });
    writeSave(get());
    sfx("click");
  },

  startBattle: () => {
    const stage = STAGES[Math.min(get().campaign.stage, STAGES.length - 1)];
    if (!stage || get().campaign.stage >= STAGES.length) {
      set({ screen: "ending" });
      writeSave(get());
      return;
    }
    const battle = makeBattle(stage, get().campaign);
    set({ screen: "battle", battle, duel: null, confirmEnd: false, result: null });
    sfx("click");
  },

  clickTile: (x, y) => {
    const cur = get().battle;
    if (!cur || cur.phase !== "player" || cur.outcome || get().duel) return;
    const b = structuredClone(cur);
    const occ = unitAt(b, x, y);
    const sel = selectedUnit(b);
    if (b.ui.mode === "aim" && sel && b.ui.aim) {
      if (occ && canAim(sel, occ, b.ui.aim, b)) {
        const n = b.floats.length;
        performAim(b, sel, occ, b.ui.aim);
        cueFrom(b, n);
        afterAction(b);
      } else {
        const moved = sel.x !== sel.originX || sel.y !== sel.originY;
        b.ui = { selected: sel.iid, look: occ?.iid ?? sel.iid, mode: moved ? "menu" : "idle", aim: null };
        sfx("click");
      }
      set({ battle: b, confirmEnd: false });
      return;
    }
    if (occ && occ.side === "player" && !occ.guest && !occ.done) {
      const moved = occ.tilesMoved > 0 || occ.x !== occ.originX || occ.y !== occ.originY;
      b.ui = { selected: occ.iid, look: occ.iid, mode: moved ? "menu" : "idle", aim: null };
      set({ battle: b });
      sfx("click");
      return;
    }
    if (sel && !sel.done && occ && canAim(sel, occ, "attack", b)) {
      const n = b.floats.length;
      strike(b, sel, occ, "attack");
      cueFrom(b, n);
      afterAction(b);
      set({ battle: b, confirmEnd: false });
      return;
    }
    if (sel && !sel.done && b.ui.mode === "idle") {
      const tile = reachable(b, sel)
        .filter((t) => t.x === x && t.y === y)
        .sort((a, c) => a.cost - c.cost)[0];
      if (tile) {
        moveUnit(b, sel, tile.x, tile.y, tile.cost);
        b.ui = { selected: sel.iid, look: sel.iid, mode: "menu", aim: null };
        set({ battle: b });
        sfx("move");
        return;
      }
    }
    if (occ) {
      b.ui = { ...b.ui, look: occ.iid };
      set({ battle: b });
      sfx("click");
    }
  },

  doCommand: (cmd) => {
    const cur = get().battle;
    if (!cur || cur.phase !== "player" || cur.outcome || get().duel) return;
    const b = structuredClone(cur);
    const sel = selectedUnit(b);
    if (!sel || sel.done) return;
    if (cmd === "stay") {
      b.ui = { selected: sel.iid, look: sel.iid, mode: "menu", aim: null };
      set({ battle: b });
      return;
    }
    if (cmd === "cancel") {
      if (b.ui.mode === "aim") {
        const moved = sel.x !== sel.originX || sel.y !== sel.originY;
        b.ui = { selected: sel.iid, look: sel.iid, mode: moved ? "menu" : "idle", aim: null };
      } else if (sel.x !== sel.originX || sel.y !== sel.originY) {
        sel.x = sel.originX;
        sel.y = sel.originY;
        sel.tilesMoved = 0;
        b.ui = { selected: sel.iid, look: sel.iid, mode: "idle", aim: null };
      } else b.ui = { selected: null, look: null, mode: "idle", aim: null };
      set({ battle: b });
      sfx("click");
      return;
    }
    if (cmd === "attack" || cmd === "snipe" || cmd === "fire" || cmd === "heal" || cmd === "confuse" || cmd === "rock") {
      b.ui = { selected: sel.iid, look: sel.iid, mode: "aim", aim: cmd };
      set({ battle: b });
      return;
    }
    if (cmd === "rally" || cmd === "guard") {
      applySelf(b, sel, cmd);
      afterAction(b);
      set({ battle: b });
      sfx("heal");
      return;
    }
    if (cmd === "jinchuang" || cmd === "xingjun") {
      if (applyItem(b, sel, cmd)) {
        afterAction(b);
        sfx("heal");
      }
      set({ battle: b });
      return;
    }
    if (cmd === "duel") {
      const foe = b.units.find((o) => duelEligible(sel, o, b));
      if (!foe) return;
      const maxA = Math.round(42 + sel.war * 0.28);
      const maxD = Math.round(42 + foe.war * 0.28);
      const duel: DuelState = {
        attackerIid: sel.iid,
        defenderIid: foe.iid,
        attackerName: sel.name,
        defenderName: foe.name,
        attackerArt: sel.portrait ?? sel.art,
        defenderArt: foe.portrait ?? foe.art,
        aWar: sel.war,
        dWar: foe.war,
        aHp: maxA,
        aMax: maxA,
        dHp: maxD,
        dMax: maxD,
        aSpirit: 0,
        dSpirit: 0,
        aGuard: false,
        dGuard: false,
        log: [`${sel.name}向${foe.name}請戰。`],
        round: 0,
        done: false,
        winner: null,
        auto: false,
      };
      set({ battle: b, duel });
      sfx("hit");
      return;
    }
    if (cmd === "wait") {
      waitUnit(b, sel);
      afterAction(b);
      set({ battle: b, confirmEnd: false });
      sfx("click");
    }
  },

  aimTarget: (iid) => {
    const cur = get().battle;
    if (!cur || cur.ui.mode !== "aim" || !cur.ui.aim) return;
    const b = structuredClone(cur);
    const sel = selectedUnit(b);
    const occ = b.units.find((u) => u.iid === iid);
    if (!sel || !occ || !canAim(sel, occ, cur.ui.aim, b)) return;
    const n = b.floats.length;
    performAim(b, sel, occ, cur.ui.aim);
    cueFrom(b, n);
    afterAction(b);
    set({ battle: b });
  },

  requestEnd: () => {
    const b = get().battle;
    if (!b || b.phase !== "player" || b.outcome) return;
    const fresh = b.units.some((u) => u.side === "player" && !u.guest && !u.retreated && !u.done);
    if (fresh) set({ confirmEnd: true });
    else get().endTurn();
  },

  endTurn: () => {
    const cur = get().battle;
    if (!cur || cur.phase !== "player" || cur.outcome) return;
    const b = structuredClone(cur);
    endPlayerPhase(b);
    set({ battle: b, confirmEnd: false });
    sfx("click");
  },

  ackAnnounce: () => {
    const cur = get().battle;
    if (!cur || cur.phase !== "announce") return;
    const b = structuredClone(cur);
    releaseAnnounce(b);
    set({ battle: b });
  },

  stepAiTick: () => {
    const cur = get().battle;
    if (!cur || cur.outcome || get().duel) return;
    if (cur.phase !== "guest" && cur.phase !== "enemy") return;
    const b = structuredClone(cur);
    const n = b.floats.length;
    stepAi(b);
    cueFrom(b, n);
    set({ battle: b });
  },

  settle: () => {
    const b = get().battle;
    if (!b?.outcome || get().screen !== "battle" || get().duel) return;
    const { campaign, result } = conclude(b, get().campaign);
    set({ screen: "result", campaign, result, confirmEnd: false });
    writeSave(get());
    sfx(b.outcome === "win" ? "win" : "lose");
  },

  duelAct: (act) => {
    const duel = get().duel;
    if (!duel || duel.done) return;
    const d = structuredClone(duel);
    const enemy = aiDuel(d);
    d.aGuard = act === "guard";
    d.dGuard = enemy === "guard";
    if (act === "spirit") d.aSpirit = 1;
    if (enemy === "spirit") d.dSpirit = 1;
    if (act === "attack") {
      const dmg = blow(d.aWar, d.aSpirit, d.dGuard);
      d.dHp = Math.max(0, d.dHp - dmg);
      d.aSpirit = 0;
      d.log = [...d.log, `${d.attackerName}斬擊，${dmg}。`];
    } else if (act === "guard") d.log = [...d.log, `${d.attackerName}守勢。`];
    else d.log = [...d.log, `${d.attackerName}提氣。`];
    if (d.dHp > 0 && enemy === "attack") {
      const dmg = blow(d.dWar, d.dSpirit, d.aGuard);
      d.aHp = Math.max(0, d.aHp - dmg);
      d.dSpirit = 0;
      d.log = [...d.log, `${d.defenderName}反斬，${dmg}。`];
    } else if (enemy === "guard") d.log = [...d.log, `${d.defenderName}守勢。`];
    else if (enemy === "spirit") d.log = [...d.log, `${d.defenderName}提氣。`];
    d.round += 1;
    if (d.aHp <= 0 && d.dHp <= 0) {
      d.done = true;
      d.winner = "draw";
      d.log = [...d.log, "兩敗俱傷。"];
    } else if (d.dHp <= 0) {
      d.done = true;
      d.winner = "player";
      d.log = [...d.log, `${d.attackerName}勝。`];
    } else if (d.aHp <= 0) {
      d.done = true;
      d.winner = "enemy";
      d.log = [...d.log, `${d.defenderName}勝。`];
    } else if (d.round >= 8) {
      d.done = true;
      d.winner = d.aHp === d.dHp ? "draw" : d.aHp > d.dHp ? "player" : "enemy";
      d.log = [...d.log, "力竭，以殘血決勝負。"];
    }
    set({ duel: d });
    sfx(act === "attack" ? "hit" : "click");
  },

  finishDuel: () => {
    const duel = get().duel;
    const cur = get().battle;
    if (!duel?.done || !duel.winner || !cur) return;
    const b = structuredClone(cur);
    const att = b.units.find((u) => u.iid === duel.attackerIid);
    const def = b.units.find((u) => u.iid === duel.defenderIid);
    if (att && def) applyDuelResult(b, att, def, duel.winner);
    if (!b.outcome) {
      b.ui = { selected: null, look: null, mode: "idle", aim: null };
      if (playerAllDone(b)) endPlayerPhase(b);
    }
    set({ battle: b, duel: null });
    sfx(duel.winner === "player" ? "crit" : "lose");
  },

  ackResult: () => {
    const { result, campaign } = get();
    if (!result) return;
    if (!result.win) {
      set({ screen: "brief", result: null, battle: null, duel: null });
      writeSave(get());
      return;
    }
    if (campaign.stage >= STAGES.length) {
      set({ screen: "ending", result: null, battle: null, story: null });
      writeSave(get());
      return;
    }
    set({ screen: "story", story: storyAt(campaign.stage), result: null, battle: null });
    writeSave(get());
  },

  equip: (unitId, weaponId) => {
    const c = structuredClone(get().campaign);
    const w = weaponById(weaponId);
    const def = UNITS[unitId];
    if (!w || !def || !c.weapons.includes(weaponId) || !w.classes.includes(def.cls)) return;
    if (UNIQUE_WEAPONS.has(weaponId)) {
      for (const [uid, wid] of Object.entries(c.equipped)) {
        if (wid === weaponId) delete c.equipped[uid];
      }
    }
    c.equipped[unitId] = weaponId;
    set({ campaign: c });
    writeSave(get());
    sfx("click");
  },

  openHelp: () => set({ helpFrom: get().screen, screen: "help" }),
  closeHelp: () => set({ screen: get().helpFrom }),
}));

function performAim(b: Battle, sel: BattleUnit, occ: BattleUnit, aim: AimKind) {
  if (aim === "attack" || aim === "snipe") strike(b, sel, occ, aim);
  else if (aim === "fire" || aim === "heal" || aim === "confuse" || aim === "rock") cast(b, sel, occ, aim);
}

function blow(war: number, spirit: number, guarded: boolean) {
  const base = war / 6.2;
  return Math.max(4, Math.round(base * (spirit > 0 ? 1.45 : 1) * (guarded ? 0.42 : 1) * (0.88 + Math.random() * 0.24)));
}

function aiDuel(d: DuelState): "attack" | "guard" | "spirit" {
  if (d.dHp < d.dMax * 0.34 && Math.random() < 0.6) return "guard";
  if (d.dSpirit === 0 && Math.random() < 0.28) return "spirit";
  return "attack";
}

export function readHasSave() {
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}
