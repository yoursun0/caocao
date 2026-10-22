import { useEffect } from "react";
import { BattleScreen } from "@/components/battle-screen";
import { PORTRAIT_SRC, SCENE_SRC, UNIT_SRC } from "@/game/art";
import { playBgm, type BgmTrack } from "@/game/audio";
import { CLS_NAME, STAGES, UNITS, WEAPONS, weaponById } from "@/game/content";
import { heartLabel, useGame } from "@/game/store";

const OFFICERS = ["caocao", "xiahoudun", "xiahouyuan", "caoren", "caohong"];

export function CaoGame() {
  const screen = useGame((s) => s.screen);
  const boot = useGame((s) => s.boot);
  const battle = useGame((s) => s.battle);
  const duel = useGame((s) => s.duel);
  const stepAiTick = useGame((s) => s.stepAiTick);
  const ackAnnounce = useGame((s) => s.ackAnnounce);
  const settle = useGame((s) => s.settle);

  const serial = battle?.aiSerial;
  const phase = battle?.phase;
  const outcome = battle?.outcome;
  const announce = battle?.announce?.title;

  useEffect(() => {
    boot();
  }, [boot]);

  const stageIndex = useGame((s) => s.campaign.stage);
  const resultWin = useGame((s) => s.result?.win);

  useEffect(() => {
    let track: BgmTrack = "off";
    if (screen === "title" || screen === "ending") track = "op";
    else if (screen === "camp" || screen === "help") track = "happy";
    else if (screen === "story") track = "event";
    else if (screen === "brief") track = "march";
    else if (screen === "result") track = resultWin ? "happy" : "tragic";
    else if (screen === "battle") {
      if (stageIndex <= 0) track = "battle";
      else if (stageIndex === 1) track = "battle-tense";
      else track = "battle-fierce";
    }
    playBgm(track);
  }, [screen, stageIndex, resultWin]);

  useEffect(() => {
    if (screen !== "battle" || duel || outcome) return;
    if (phase !== "guest" && phase !== "enemy") return;
    const t = window.setTimeout(() => stepAiTick(), 480);
    return () => window.clearTimeout(t);
  }, [screen, phase, serial, outcome, duel, stepAiTick]);

  useEffect(() => {
    if (screen !== "battle" || phase !== "announce" || !announce || duel || outcome) return;
    const t = window.setTimeout(() => ackAnnounce(), 1600);
    return () => window.clearTimeout(t);
  }, [screen, phase, announce, duel, outcome, ackAnnounce]);

  useEffect(() => {
    if (screen !== "battle" || !battle?.outcome || duel) return;
    const t = window.setTimeout(() => settle(), 720);
    return () => window.clearTimeout(t);
  }, [screen, battle?.outcome, duel, settle]);

  return (
    <main className="shell">
      {screen === "title" ? <Title /> : null}
      {screen === "story" ? <Story /> : null}
      {screen === "brief" ? <Brief /> : null}
      {screen === "battle" ? <BattleScreen /> : null}
      {screen === "result" ? <Result /> : null}
      {screen === "camp" ? <Camp /> : null}
      {screen === "ending" ? <Ending /> : null}
      {screen === "help" ? <Help /> : null}
    </main>
  );
}

function Title() {
  const hasSave = useGame((s) => s.hasSave);
  const booted = useGame((s) => s.booted);
  const newGame = useGame((s) => s.newGame);
  const continueGame = useGame((s) => s.continueGame);
  const openHelp = useGame((s) => s.openHelp);
  return (
    <section className="title-screen">
      <img src="/game/title.jpg" alt="曹操傳" className="title-art" />
      <div className="title-panel">
        <p className="kicker">英傑傳式戰棋 · 三關</p>
        <h1 className="display title-name">曹操傳</h1>
        <p className="lede">潁川之戰、汜水關之戰、虎牢關之戰。兵種相剋、士氣、策略、單挑，與內心的紅藍之間。</p>
        <div className="cmd-row">
          <button type="button" className="btn btn-primary" onClick={newGame}>
            新遊戲
          </button>
          {booted && hasSave ? (
            <button type="button" className="btn" onClick={continueGame}>
              繼續
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={openHelp}>
            戰法
          </button>
        </div>
      </div>
    </section>
  );
}

function Story() {
  const story = useGame((s) => s.story);
  const advance = useGame((s) => s.advance);
  const choose = useGame((s) => s.choose);
  const ambition = useGame((s) => s.campaign.ambition);
  if (!story) return null;
  const beat = story.beats[story.i];
  if (!beat) return null;
  const art = beat.art ? PORTRAIT_SRC[beat.art] ?? UNIT_SRC[beat.art] : undefined;
  const scene = SCENE_SRC[beat.scene ?? "camp"] ?? SCENE_SRC.camp;
  const choosing = beat.t === "choice" && !story.reply;
  return (
    <section
      className="story-stage"
      onClick={() => {
        if (!choosing) advance();
      }}
    >
      <img src={scene} alt="" className="scene-bg" />
      <div className="scene-shade" />
      <p className="scene-place">{beat.place ?? "軍議"}</p>
      <div className="scene-heart">
        <Heart n={ambition} />
      </div>
      <div className="dlg" onClick={(e) => e.stopPropagation()}>
        {art ? <img src={art} alt="" className="portrait" /> : <div className="portrait portrait-empty" />}
        <div>
          <p className="kicker">{beat.who}</p>
          <p className="story-text display">{story.reply ?? beat.text}</p>
          {choosing ? (
            <div className="cmd-row">
              {beat.options.map((op, i) => (
                <button key={op.label} type="button" className={op.ambition > 0 ? "btn btn-primary" : "btn"} onClick={() => choose(i)}>
                  {op.label}
                  <small>{op.ambition > 0 ? " 紅" : " 藍"}</small>
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={advance}>
              繼續
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Brief() {
  const campaign = useGame((s) => s.campaign);
  const stage = STAGES[Math.min(campaign.stage, STAGES.length - 1)];
  const startBattle = useGame((s) => s.startBattle);
  const toCamp = useGame((s) => s.toCamp);
  const openHelp = useGame((s) => s.openHelp);
  if (!stage || campaign.stage >= STAGES.length) return null;
  return (
    <section className="panel-page">
      <p className="kicker">
        {stage.chapter} · {stage.year}
      </p>
      <h1 className="display page-title">
        第{stage.no}關 {stage.name}
      </h1>
      <p className="lede">{stage.brief}</p>
      <p className="objective">目標　{stage.objective}</p>
      <p className="hint">{stage.hint}</p>
      <ul className="deploy">
        {stage.player.map((sp) => {
          const def = UNITS[sp.unitId];
          const lv = campaign.roster[sp.unitId]?.level ?? def?.baseLevel;
          if (!def) return null;
          return (
            <li key={sp.unitId}>
              <img src={UNIT_SRC[def.art]} alt="" />
              <span>
                {def.name}
                <small>
                  {CLS_NAME[def.cls]} Lv{lv}
                </small>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="cmd-row">
        <button type="button" className="btn btn-primary" onClick={startBattle}>
          出陣
        </button>
        <button type="button" className="btn" onClick={toCamp}>
          整軍
        </button>
        <button type="button" className="btn btn-ghost" onClick={openHelp}>
          戰法
        </button>
      </div>
    </section>
  );
}

function Camp() {
  const campaign = useGame((s) => s.campaign);
  const equip = useGame((s) => s.equip);
  const toBrief = useGame((s) => s.toBrief);
  const stage = STAGES[campaign.stage];
  return (
    <section className="panel-page">
      <Heart n={campaign.ambition} />
      <p className="kicker">軍營</p>
      <h1 className="display page-title">{stage ? `下一戰　${stage.name}` : "整軍"}</h1>
      <p className="hint">
        金創藥 {campaign.bag.jinchuang}　行軍丹 {campaign.bag.xingjun}　武具隨使用成長，每六擊升一級。
      </p>
      <ul className="camp-list">
        {OFFICERS.map((id) => {
          const def = UNITS[id];
          const r = campaign.roster[id];
          if (!def || !r) return null;
          const owned = WEAPONS.filter((w) => campaign.weapons.includes(w.id) && w.classes.includes(def.cls));
          const on = campaign.equipped[id];
          return (
            <li key={id}>
              <img src={PORTRAIT_SRC[def.portrait ?? def.art] ?? UNIT_SRC[def.art]} alt="" />
              <div>
                <strong className="display">
                  {def.name}
                  <small>
                    {" "}
                    {def.courtesy} · {CLS_NAME[def.cls]} Lv{r.level}
                  </small>
                </strong>
                <div className="cmd-row">
                  {owned.map((w) => (
                    <button key={w.id} type="button" className={on === w.id ? "btn btn-gold" : "btn"} onClick={() => equip(id, w.id)}>
                      {w.name}
                      <small>
                        {" "}
                        {w.atk ? `攻+${w.atk + (campaign.weaponLv[w.id] ?? 1) - 1}` : ""}
                        {w.def ? ` 防+${w.def}` : ""}
                        {w.intel ? ` 智+${w.intel}` : ""}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn btn-primary" onClick={toBrief}>
        {stage ? "查看戰報並出陣" : "返回"}
      </button>
    </section>
  );
}

function Result() {
  const result = useGame((s) => s.result);
  const ackResult = useGame((s) => s.ackResult);
  const campaign = useGame((s) => s.campaign);
  if (!result) return null;
  const stage = STAGES.find((s) => s.id === result.stageId);
  return (
    <section className="panel-page">
      <p className="kicker">{result.win ? "勝利" : "敗北"}</p>
      <h1 className="display page-title">{stage?.name}</h1>
      {result.lines.map((line) => (
        <p key={line} className="lede">
          {line}
        </p>
      ))}
      {result.levels.length > 0 ? (
        <ul className="deploy">
          {result.levels.map((lv) => (
            <li key={`${lv.id}-${lv.to}`}>
              <span>
                {lv.name} 升至 Lv{lv.to}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="hint">
        現裝備：{weaponById(campaign.equipped.caocao)?.name}　傾向 {heartLabel(campaign.ambition)}
      </p>
      <button type="button" className="btn btn-primary" onClick={ackResult}>
        {result.win ? (campaign.stage >= STAGES.length ? "觀看結局" : "繼續") : "重新挑戰"}
      </button>
    </section>
  );
}

function Ending() {
  const n = useGame((s) => s.campaign.ambition);
  const newGame = useGame((s) => s.newGame);
  const line =
    n >= 2
      ? "紅線。寧教我負天下人，休教天下人負我。霸業才剛揭開序幕——官渡、赤壁，都還在後頭。"
      : n <= -2
        ? "藍線。你選擇做一個想匡扶漢室的曹操。關羽日後或會在營中停留更久。這條路更難，也更亮。"
        : "黃線。奸雄與英雄之間，你還沒把心稱完。天下仍是一盤沒下完的棋。";
  return (
    <section className="title-screen">
      <img src="/game/ending.jpg" alt="" className="title-art" />
      <div className="title-panel">
        <p className="kicker">第一章終 · {heartLabel(n)}</p>
        <h1 className="display title-name">虎牢之後</h1>
        <p className="lede">{line}</p>
        <p className="hint">典韋、荀彧、郭嘉、許褚尚未來投。這是向《三國志曹操傳》前三關致敬的可玩復刻，不是原作全譜。</p>
        <div className="future">
          {(["xuchu", "guojia"] as const).map((id) => (
            <img key={id} src={PORTRAIT_SRC[id]} alt={UNITS[id]?.name ?? ""} />
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={newGame}>
          再起一局
        </button>
      </div>
    </section>
  );
}

function Help() {
  const closeHelp = useGame((s) => s.closeHelp);
  return (
    <section className="panel-page">
      <p className="kicker">戰法</p>
      <h1 className="display page-title">如何作戰</h1>
      <ul className="rules">
        <li>點我軍後，藍格是可走的地方，紅格是攻擊範圍。直接點紅格上的敵軍就攻擊，沒有「原地行動」。滑鼠停在策略或道具上，會寫出效果。</li>
        <li>點任何我軍、友軍、敵軍都會打開介紹：兵力、能力、兵種。地圖上的血條，我軍紅色、敵軍藍色、友軍黃色，並標出目前兵力。</li>
        <li>夏侯淵是馬弓兵，騎馬射箭，移動遠，克制騎兵。夏侯惇、曹仁、曹洪是騎兵，移動比步兵大。步兵克弓與馬弓，弓與馬弓克騎，騎克步。</li>
        <li>結束回合後友軍先動。接著全畫面藍底寫「敵軍階段」，敵軍動完，再以紅底寫「第幾回合、我軍階段」。</li>
        <li>士氣影響命中與會心。村莊、兵營上待命可恢復。火計吃林與乾風。</li>
        <li>關羽若先碰到華雄，會溫酒斬將。劉關張同時貼上呂布，則三英戰呂布。孫堅活過汜水關會贈古錠刀。曹操敗退即此戰失敗。</li>
        <li>這是粉絲向的像素復刻，致敬光榮《三國志曹操傳》開篇三關，並非原作本身。</li>
      </ul>
      <button type="button" className="btn btn-primary" onClick={closeHelp}>
        返回
      </button>
    </section>
  );
}

function Heart({ n }: { n: number }) {
  const pos = Math.max(6, Math.min(94, ((n + 4) / 8) * 100));
  return (
    <div className="heart">
      <span>英雄</span>
      <div className="heart-track">
        <i style={{ left: `${pos}%` }} />
      </div>
      <span>奸雄</span>
      <em>{heartLabel(n)}</em>
    </div>
  );
}
