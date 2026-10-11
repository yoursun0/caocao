import { useEffect, useRef, useState } from "react";
import { FLAME_SRC, PORTRAIT_SRC, TERRAIN_SRC, UNIT_SRC } from "@/game/art";
import { CLS_NAME, ITEM_TIP, TAC_COST, TAC_NAME, TAC_TIP, UNIT_BIO } from "@/game/content";
import { atkRange, attackCells, canAim, duelEligible, forecast, reachable } from "@/game/engine";
import { useGame } from "@/game/store";
import type { AimKind, BattleUnit, TerrainId } from "@/game/types";

const OVERLAY = new Set<TerrainId>(["forest", "mountain", "village", "wall", "gate", "keep", "camp", "hill", "field", "depot", "fence", "flame"]);

function face(id?: string) {
  if (!id) return undefined;
  return PORTRAIT_SRC[id] ?? UNIT_SRC[id];
}

export function BattleScreen() {
  const battle = useGame((s) => s.battle);
  const duel = useGame((s) => s.duel);
  const confirmEnd = useGame((s) => s.confirmEnd);
  const clickTile = useGame((s) => s.clickTile);
  const doCommand = useGame((s) => s.doCommand);
  const aimTarget = useGame((s) => s.aimTarget);
  const requestEnd = useGame((s) => s.requestEnd);
  const endTurn = useGame((s) => s.endTurn);
  const duelAct = useGame((s) => s.duelAct);
  const finishDuel = useGame((s) => s.finishDuel);
  const openHelp = useGame((s) => s.openHelp);
  const setConfirm = (v: boolean) => useGame.setState({ confirmEnd: v });
  const scroller = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !battle) return;
    const cao = battle.units.find((u) => u.defId === "caocao" && !u.guest);
    if (!cao) return;
    const run = () => {
      const px = el.querySelector(".tile")?.getBoundingClientRect().width || 52;
      el.scrollTop = Math.max(0, cao.y * px - el.clientHeight * 0.45);
      el.scrollLeft = Math.max(0, cao.x * px - el.clientWidth * 0.3);
    };
    const id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [battle?.stageId]);

  useEffect(() => {
    if (!battle?.floats.length) return;
    const t = window.setTimeout(() => {
      useGame.setState((s) => (s.battle ? { battle: { ...s.battle, floats: [] } } : s));
    }, 900);
    return () => window.clearTimeout(t);
  }, [battle?.floats]);

  if (!battle) return null;
  const w = battle.map[0]?.length ?? 0;
  const h = battle.map.length;
  const sel = battle.units.find((u) => u.iid === battle.ui.selected) ?? null;
  const look = battle.units.find((u) => u.iid === (battle.ui.look ?? battle.ui.selected) && !u.retreated) ?? null;
  const controlling = Boolean(sel && battle.phase === "player" && !sel.done && !sel.guest);
  const reach = controlling && battle.ui.mode === "idle" && sel ? reachable(battle, sel) : [];
  const reachKey = new Set(reach.map((t) => `${t.x},${t.y}`));
  const atkKey = new Set(controlling && battle.ui.mode !== "aim" && sel ? attackCells(battle, sel).map((t) => `${t.x},${t.y}`) : []);
  const aim = battle.ui.mode === "aim" ? battle.ui.aim : null;
  const targets =
    sel && aim
      ? battle.units.filter((u) => !u.retreated && canAim(sel, u, aim, battle))
      : [];
  const mine = battle.units.filter((u) => u.side === "player" && !u.guest);
  const foesLeft = battle.units.filter((u) => u.side === "enemy" && !u.retreated).length;

  return (
    <section className="battle">
      <header className="hud">
        <div>
          <p className="kicker">第 {battle.turn} 回合</p>
          <h1 className="display hud-title">{phaseName(battle.phase, battle.announce?.title)}</h1>
        </div>
        <p className="hud-meta">
          {battle.weather} · 敵軍 {foesLeft}
        </p>
        <button type="button" className="btn btn-ghost" onClick={openHelp}>
          戰法
        </button>
      </header>

      <div className="map-scroll" ref={scroller}>
        <div className="map-board" style={{ width: `calc(${w} * var(--tile))`, height: `calc(${h} * var(--tile))` }}>
          {battle.map.map((row, y) =>
            row.map((t, x) => {
              const occ = battle.units.find((u) => !u.retreated && u.x === x && u.y === y);
              const move = reachKey.has(`${x},${y}`) && !occ;
              const strikeHere = atkKey.has(`${x},${y}`);
              const aimed = Boolean(sel && aim && occ && canAim(sel, occ, aim, battle));
              const base = OVERLAY.has(t) ? TERRAIN_SRC.plain : TERRAIN_SRC[t];
              const prop = t === "flame" ? FLAME_SRC[(x * 2 + y) % FLAME_SRC.length] : OVERLAY.has(t) ? TERRAIN_SRC[t] : undefined;
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  className={`tile${move ? " is-move" : ""}${strikeHere || aimed ? " is-atk" : ""}${sel && sel.x === x && sel.y === y ? " is-sel" : ""}${t === "flame" ? " is-flame" : ""}`}
                  style={{ left: `calc(${x} * var(--tile))`, top: `calc(${y} * var(--tile))` }}
                  onClick={() => clickTile(x, y)}
                  aria-label={`${occ ? occ.name : t} ${x + 1},${y + 1}`}
                >
                  {base ? <img src={base} alt="" className="tile-img" /> : null}
                  {prop ? (
                    <img
                      src={prop}
                      alt=""
                      className={t === "flame" ? "tile-prop tile-flame" : "tile-prop"}
                      style={t === "flame" ? { animationDelay: `${((x + y * 3) % 6) * 0.12}s` } : undefined}
                    />
                  ) : null}
                </button>
              );
            }),
          )}
          {battle.units
            .filter((u) => !u.retreated)
            .map((u) => (
              <span
                key={u.iid}
                className={`token token-${u.guest ? "guest" : u.side}${u.done && u.side === "player" && !u.guest ? " is-done" : ""}${u.iid === sel?.iid ? " is-on" : ""}`}
                style={{ left: `calc(${u.x} * var(--tile))`, top: `calc(${u.y} * var(--tile))` }}
              >
                <img src={UNIT_SRC[u.art]} alt="" />
                <span className="hp">
                  <i style={{ width: `${Math.max(0, Math.round((u.hp / u.maxHp) * 100))}%` }} />
                  <b>
                    {u.hp}/{u.maxHp}
                  </b>
                </span>
                {u.buffs.length > 0 ? <em>{u.buffs.some((b) => b.kind === "confuse") ? "亂" : u.buffs.some((b) => b.kind === "def") ? "防" : "攻"}</em> : null}
              </span>
            ))}
          {battle.floats.map((f) => (
            <span key={f.id} className={`floater floater-${f.kind}`} style={{ left: `calc(${f.x} * var(--tile))`, top: `calc(${f.y} * var(--tile))` }}>
              {f.text}
            </span>
          ))}
        </div>
      </div>

      <div className="dock">
        <div className="roster">
          {mine.map((u) => (
            <button key={u.iid} type="button" className={`chip${u.iid === sel?.iid ? " is-on" : ""}${u.retreated ? " is-dead" : ""}`} onClick={() => clickTile(u.x, u.y)} disabled={u.retreated || battle.phase !== "player"}>
              <img src={UNIT_SRC[u.art]} alt="" />
              <span>
                {u.name}
                <small>
                  {u.hp}/{u.maxHp}
                </small>
              </span>
            </button>
          ))}
        </div>

        {look ? <UnitCard u={look} /> : null}

        {controlling && sel ? (
          <div className="cmd">
            {battle.ui.mode === "aim" && aim ? (
              <div className="cmd-row">
                <p className="hint">選擇{aimLabel(aim)}目標。滑鼠停在按鈕上可看效果。</p>
                {targets.length === 0 ? <p className="hint">沒有合法目標。</p> : null}
                {targets.map((t) => {
                  const fc = aim === "heal" ? null : forecast(battle, sel, t, aim === "snipe" || aim === "attack" || aim === "fire" || aim === "rock" || aim === "confuse" ? aim : "attack");
                  return (
                    <button key={t.iid} type="button" className="btn" onClick={() => aimTarget(t.iid)}>
                      {t.name}
                      {fc ? ` 命中${fc.hit}% 約${fc.dmg}` : " 治療"}
                    </button>
                  );
                })}
                <button type="button" className="btn btn-ghost" onClick={() => doCommand("cancel")}>
                  返回
                </button>
              </div>
            ) : (
              <Menu
                sel={sel}
                battleBag={battle.bag}
                on={doCommand}
                canDuel={battle.units.some((o) => duelEligible(sel, o, battle))}
                tip={tip}
                setTip={setTip}
              />
            )}
          </div>
        ) : (
          <div className="cmd-row">
            <p className="hint">{battle.log[battle.log.length - 1]}</p>
            {battle.phase === "player" && !battle.outcome ? (
              <button type="button" className="btn btn-primary" onClick={requestEnd}>
                結束回合
              </button>
            ) : (
              <p className="hint">{battle.phase === "announce" ? battle.announce?.title : battle.phase === "over" ? "結算中…" : battle.phase === "guest" ? "友軍移動中" : "敵軍行動中"}</p>
            )}
          </div>
        )}
        <ol className="log">
          {battle.log.slice(-4).map((line, i) => (
            <li key={`${line}-${i}`}>{line}</li>
          ))}
        </ol>
      </div>

      {confirmEnd ? (
        <div className="modal">
          <div className="sheet">
            <h2 className="display">還有武將未行動</h2>
            <p>結束回合後將進入友軍與敵軍階段。</p>
            <div className="cmd-row">
              <button type="button" className="btn btn-primary" onClick={endTurn}>
                仍要結束
              </button>
              <button type="button" className="btn" onClick={() => setConfirm(false)}>
                返回
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {duel ? (
        <div className="modal">
          <div className="sheet duel">
            <h2 className="display">單挑</h2>
            <div className="duel-row">
              <figure>
                {face(duel.attackerArt) ? <img src={face(duel.attackerArt)} alt="" /> : null}
                <figcaption>
                  {duel.attackerName}
                  <small>武力 {duel.aWar}</small>
                </figcaption>
                <div className="bar">
                  <i style={{ width: `${(duel.aHp / duel.aMax) * 100}%` }} />
                </div>
              </figure>
              <figure>
                {face(duel.defenderArt) ? <img src={face(duel.defenderArt)} alt="" /> : null}
                <figcaption>
                  {duel.defenderName}
                  <small>武力 {duel.dWar}</small>
                </figcaption>
                <div className="bar bar-foe">
                  <i style={{ width: `${(duel.dHp / duel.dMax) * 100}%` }} />
                </div>
              </figure>
            </div>
            <ol className="log">
              {duel.log.slice(-4).map((line, i) => (
                <li key={`${line}-${i}`}>{line}</li>
              ))}
            </ol>
            {duel.done ? (
              <button type="button" className="btn btn-primary" onClick={finishDuel}>
                回到戰場
              </button>
            ) : (
              <div className="cmd-row">
                <button type="button" className="btn btn-primary" onClick={() => duelAct("attack")}>
                  斬擊
                </button>
                <button type="button" className="btn" onClick={() => duelAct("guard")}>
                  防守
                </button>
                <button type="button" className="btn" onClick={() => duelAct("spirit")}>
                  氣合
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {battle.phase === "announce" && battle.announce ? (
        <div className={`phase-banner phase-banner-${battle.announce.tone}`}>
          <p className="display">{battle.announce.title}</p>
        </div>
      ) : null}
    </section>
  );
}

function sideName(u: BattleUnit) {
  if (u.guest) return "友軍";
  if (u.side === "player") return "我軍";
  return "敵軍";
}

function UnitCard({ u }: { u: BattleUnit }) {
  const tactics = u.tactics.map((t) => TAC_NAME[t]).join("、");
  return (
    <div className={`statcard side-${u.guest ? "guest" : u.side}`}>
      {face(u.portrait ?? u.art) ? <img src={face(u.portrait ?? u.art)} alt="" /> : null}
      <div>
        <strong className="display">
          {u.name}
          <small>
            {u.courtesy ? ` ${u.courtesy}` : ""} · {sideName(u)}
          </small>
        </strong>
        <p className="hp-line">
          <i style={{ width: `${Math.max(0, Math.round((u.hp / u.maxHp) * 100))}%` }} />
          <b>
            {u.hp}/{u.maxHp}
          </b>
        </p>
        <p>
          {CLS_NAME[u.cls]} Lv{u.level} · 攻{u.atk} 防{u.def} 智{u.intel} 敏{u.agi} · 武力{u.war}
        </p>
        <p>
          士氣{u.morale} · 移動{u.mov} · 策力{u.mp}/{u.maxMp}
          {atkRange(u.cls).max > 1 ? ` · 射程${atkRange(u.cls).max}` : " · 近戰"}
          {tactics ? ` · ${tactics}` : ""}
        </p>
        <p className="bio">{UNIT_BIO[u.defId] ?? `${CLS_NAME[u.cls]}。`}</p>
      </div>
    </div>
  );
}

function Menu({
  sel,
  battleBag,
  canDuel,
  on,
  tip,
  setTip,
}: {
  sel: BattleUnit;
  battleBag: { jinchuang: number; xingjun: number };
  canDuel: boolean;
  on: (cmd: string) => void;
  tip: string | null;
  setTip: (v: string | null) => void;
}) {
  const tactics = sel.tactics.filter((t) => t !== "snipe" || sel.mp >= TAC_COST.snipe);
  const hover = (text: string) => ({
    onMouseEnter: () => setTip(text),
    onFocus: () => setTip(text),
    onMouseLeave: () => setTip(null),
    title: text,
  });
  return (
    <div className="cmd-row">
      <p className="hint">藍格移動。紅格是攻擊範圍，直接點敵軍就能打，不必原地行動。</p>
      <button type="button" className="btn btn-primary" {...hover(ITEM_TIP.attack)} onClick={() => on("attack")}>
        {sel.tilesMoved >= 2 ? "突擊" : "攻擊"}
      </button>
      {sel.tactics.includes("snipe") ? (
        <button type="button" className="btn" disabled={sel.mp < TAC_COST.snipe} {...hover(TAC_TIP.snipe)} onClick={() => on("snipe")}>
          齊射 {TAC_COST.snipe}
        </button>
      ) : null}
      {tactics
        .filter((t) => t !== "snipe")
        .map((t) => (
          <button key={t} type="button" className="btn" disabled={sel.mp < TAC_COST[t]} {...hover(TAC_TIP[t])} onClick={() => on(t)}>
            {TAC_NAME[t]} {TAC_COST[t]}
          </button>
        ))}
      <button type="button" className="btn" disabled={battleBag.jinchuang <= 0} {...hover(ITEM_TIP.jinchuang)} onClick={() => on("jinchuang")}>
        金創藥 {battleBag.jinchuang}
      </button>
      <button type="button" className="btn" disabled={battleBag.xingjun <= 0} {...hover(ITEM_TIP.xingjun)} onClick={() => on("xingjun")}>
        行軍丹 {battleBag.xingjun}
      </button>
      {canDuel ? (
        <button type="button" className="btn btn-gold" {...hover(ITEM_TIP.duel)} onClick={() => on("duel")}>
          單挑
        </button>
      ) : null}
      <button type="button" className="btn" {...hover(ITEM_TIP.wait)} onClick={() => on("wait")}>
        待命
      </button>
      <button type="button" className="btn btn-ghost" {...hover(ITEM_TIP.cancel)} onClick={() => on("cancel")}>
        取消
      </button>
      {tip ? <p className="tip-line">{tip}</p> : null}
    </div>
  );
}

function aimLabel(aim: AimKind) {
  if (aim === "attack") return "攻擊";
  if (aim === "snipe") return "齊射";
  if (aim === "heal") return "治療";
  return TAC_NAME[aim];
}

function phaseName(phase: string, announce?: string) {
  if (phase === "announce") return announce?.startsWith("敵") ? "敵軍" : "我軍";
  if (phase === "player") return "我軍";
  if (phase === "guest") return "友軍";
  if (phase === "enemy") return "敵軍";
  return "戰畢";
}
