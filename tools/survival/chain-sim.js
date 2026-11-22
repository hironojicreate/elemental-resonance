// サバイバル：天秤あり／なし／あり（連鎖の途中は上限を固定）で、チェインの長さを比べる。
// 一時コピーで描画を止め、乱数を種つきにして、ゲームの時間を早送りする（6分のゲームが数十秒）。同じ種なら同じ結果になる。
// ボットは盤のどこからでも欠片を選んで重ねる（人と同じく、ドラッグで届く）。合成を好み、真理は衛星が6つ揃うか混沌が7割で撃つ。
// 天秤ありのときは、針を中央へ戻す対の対消滅を好む。律はなし。
// 使い方：node tools/survival/chain-sim.js（MS=ゲームの長さms、既定360000。SEEDS=1,2,3 で種。VARIANTS='[{"name":"…","tune":{…},"style":"lean"}]' で比べる組）
const path = require('path'), fs = require('fs'), os = require('os');
const { chromium } = require('playwright');
const INDEX = path.resolve(__dirname, '../../index.html');
let src = fs.readFileSync(INDEX, 'utf8')
  .replace('const rand = Math.random;', 'let __s = (window.__seed || 1) >>> 0; const rand = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };')
  .replace('  hudFrame();\n  requestAnimationFrame(frame);\n}', '  hudFrame();\n  if (!window.__manual) requestAnimationFrame(frame);\n}')
  .replace('const partN = n => Math.ceil(n * (RM ? .4 : 1) * (PERF.low ? .45 : 1));', 'const partN = n => n; // 粒の数は描画の重さで変わり、乱数の消費がずれるので固定')
  .replace('const hot = window.claude && window.claude.hot;', 'window.__ev = s => eval(s);\nconst hot = window.claude && window.claude.hot;');
const COPY = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sv-sim-')), 'sim.html'); fs.writeFileSync(COPY, src);
const BOT = `(() => {
  // 計測：チェインの終わりごとに長さと、真理解放の中かを記録
  window.M = { chains: [], cur: 0, rel: false, relM: 0, relA: 0, merges: 0, annis: 0, live: [], releases: [], sealedSeen: 0 };
  M.cc = null; M.long = [];
  const newCC = () => ({ n: 0, m: [0,0,0,0,0], a: [0,0,0,0,0], capCh: 0, unsealed: 0, rel: false, live: S.orbs.filter(o => !o.dying).length, tiers: [1,2,3,4].map(t => S.orbs.filter(o => !o.dying && o.kind === 'el' && o.tier === t).length) });
  if (window.__freeze) { const live = () => busy() || S.release || S.orbs.some(o => o.fly); capTier = () => !balOn() ? 4 : (live() && M.capLock) ? M.capLock : balCapOf(S.bal); }
  M.zone = [0, 0, 0, 0, 0];
  const _nc = noteChain;
  noteChain = function (...a) { const was = S.chain; const r = _nc.apply(this, a); if (S.chain === 1) { M.capLock = balCapOf(S.bal); if (M.cur > 1) M.chains.push([M.cur, M.rel]); if (M.cc && M.cc.n >= 25) M.long.push(M.cc); M.cc = newCC(); M.rel = false; } M.cur = S.chain; if (S.release) M.rel = true; return r; };
  const _dm = doMerge; doMerge = function (a, b) { M.merges++; if (M.cc) { M.cc.n++; M.cc.m[a.tier]++; if (a.sealedOnce || b.sealedOnce) M.cc.unsealed++; if (S.release) M.cc.rel = true; } if (S.release) M.relM++; return _dm.apply(this, arguments); };
  const _da = doAnni; doAnni = function (a, b) { M.annis++; if (M.cc) { M.cc.n++; M.cc.a[a.tier]++; if (S.release) M.cc.rel = true; } const c0 = capTier(); const P = _da.apply(this, arguments); if (M.cc && capTier() !== c0) M.cc.capCh++; return P;  if (S.release) M.relA++; };
  window.botAct = () => {
    if (S.screen !== 'play') return;
    const L = S.orbs.filter(o => !o.dying && o.kind === 'el' && !o.sat && !o.fly && !o.locked && !o.pull && o.scale > .9);
    let best = null, sc = -1e9;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], rk = reactionOf(a, b);
      if (rk === 'sealed') { M.sealedSeen++; continue; }
      let v = -1e9;
      if (rk === 'merge') v = window.__style === 'lean' && a.tier >= 3 ? 3 : 10 + a.tier * 3;
      else if (rk === 'anni') {
        if (a.tier === 4) { const n = satsOf(a).length + satsOf(b).length; v = n >= 6 || gauge() > .7 ? 100 : -1e9; }
        else {
          v = 5 + a.tier * 2;
          // 中央を守るボット：針を中央へ戻す対を好む。傾けて稼ぐボット：傾いている側（はじめは火水）を好み、真理は作らない
          if (balOn() && window.__style === 'lean') v += balAxis(a.el) === (Math.sign(S.bal) || -1) ? 6 : 0;
          else if (balOn() && S.bal && Math.sign(-S.bal) === balAxis(a.el)) v += 6;
        }
      }
      v -= dist(a, b) * .05;
      if (v > sc) { sc = v; best = [a, b, rk]; }
    }
    if (!best || sc < -1e8) return;
    const [o, t, rk] = best, d = o.r + t.r - .02, ang = Math.atan2(o.y - t.y, o.x - t.x);
    for (const s of satsOf(o)) s.sat = s.sat; // 衛星は親についてくる
    o.x = t.x + Math.cos(ang) * d; o.y = t.y + Math.sin(ang) * d;
    playerAct(o, t, rk);
  };
  // 早送り：1フレーム16.7ms。フレームごとに一度、手を返して await を進める
  window.simRun = async (ms, actEvery) => {
    const ch = new MessageChannel(); const yieldNow = () => new Promise(r => { ch.port1.onmessage = r; ch.port2.postMessage(0); });
    let acc = 0;
    for (let t = 0; t < ms && S.screen === 'play'; t += 16.7) {
      S.now += 16.7; updateTweens(); tick(16.7); relax(16.7);
      acc += 16.7; if (acc >= actEvery) { acc = 0; botAct(); }
      if (((t / 16.7) | 0) % 15 === 0) { const E = S.orbs.filter(o => !o.dying && o.kind === 'el'); for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) if (reactionOf(E[i], E[j]) === 'sealed' && dist(E[i], E[j]) < E[i].r + E[j].r + .6) E[i].sealedOnce = E[j].sealedOnce = true; }
      if (((t / 16.7) | 0) % 30 === 0) { M.gmax = Math.max(M.gmax || 0, gauge()); M.lvSum = (M.lvSum || 0) + S.lv; M.lvN = (M.lvN || 0) + 1; }
      if (((t / 16.7) | 0) % 30 === 0) M.zone[balOn() ? balCapOf(S.bal) : 0]++;
      if (((t / 16.7) | 0) % 30 === 0) M.live.push(S.orbs.filter(o => !o.dying).length);
      await yieldNow();
    }
    if (M.cur > 1) M.chains.push([M.cur, M.rel]);
    return { elapsed: Math.round(S.elapsed / 1000), end: S.screen, score: S.score, maxChain: S.maxChain, merges: M.merges, annis: M.annis, relM: M.relM, relA: M.relA, truths: S.stats, releases: M.releases.length,
      top: M.chains.map(c => c[0]).sort((a, b) => b - a).slice(0, 5), relTop: M.chains.filter(c => c[1]).map(c => c[0]).sort((a, b) => b - a).slice(0, 5),
      normTop: M.chains.filter(c => !c[1]).map(c => c[0]).sort((a, b) => b - a).slice(0, 5),
      avgLive: Math.round(M.live.reduce((a, b) => a + b, 0) / Math.max(1, M.live.length)), sealedSeen: M.sealedSeen, gmax: M.gmax, lvAvg: M.lvSum / M.lvN, zone: M.zone, truthsMade: S.truths, chainsAll: M.chains, long: M.long.sort((x, y) => y.n - x.n).slice(0, 3) };
  };
})()`;
async function one(browser, seed, V) {
  const balOnV = V.tune.balOn ?? 1, freeze = V.freeze;
  const p = await browser.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([seed, b]) => { window.__seed = seed; localStorage.setItem('genso.tut', '3'); localStorage.setItem('genso.tune', JSON.stringify(Object.assign({ _v: 8, rhyOn: 0 }, b))); }, [seed, V.tune]);
  await p.goto('file://' + COPY); await p.waitForTimeout(300);
  await p.click('#goSurvival'); await p.waitForTimeout(800);
  await p.evaluate(() => { window.__manual = true; }); await p.waitForTimeout(100);
  await p.evaluate(seed => window.__ev(`__s = ${seed} >>> 0; newGame('survival');`), seed); // 早送りに切り替えてから、乱数を種に戻して始め直す
  await p.evaluate(([f, st]) => { window.__freeze = f; window.__style = st; }, [!!freeze, V.style || 'center']);
  await p.evaluate(s => window.__ev(s), BOT);
  await p.waitForTimeout(100);
  const r = await p.evaluate(ms => window.__ev(`simRun(${ms}, 450)`), +process.env.MS || 360000);
  await p.close();
  return { seed, name: V.name, bal: balOnV, freeze: !!freeze, ...r, errs };
}
(async () => {
  const b = await chromium.launch();
  const seeds = (process.env.SEEDS || '1,2,3').split(',').map(Number);
  // 比べる組（VARIANTS に JSON で渡せる）。tune はバランス調整の値、style はボットの打ち方（center：中央を守る／lean：傾けて稼ぐ）
  const VARIANTS = process.env.VARIANTS ? JSON.parse(process.env.VARIANTS) : [
    { name: '天秤なし', tune: { balOn: 0 } }, { name: '天秤あり', tune: { balOn: 1 } }, { name: 'あり・途中固定', tune: { balOn: 1 }, freeze: true }];
  const specs = []; for (const s of seeds) for (const V of VARIANTS) specs.push([s, V]);
  const res = []; const conc = 6;
  for (let i = 0; i < specs.length; i += conc) res.push(...await Promise.all(specs.slice(i, i + conc).map(x => one(b, ...x))));
  if (process.env.JSON) { for (const r of res) console.log(JSON.stringify(r)); await b.close(); return; }
  const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  for (const name of [...new Set(res.map(r => r.name))]) {
    const G = res.filter(r => r.name === name);
    const top = (r, rel) => Math.max(0, ...r.chainsAll.filter(c => c[1] === rel).map(c => c[0]));
    const L = G.flatMap(r => r.long.filter(c => c.rel)), n = Math.max(1, L.length), sum = (k, i) => L.reduce((x, c) => x + c[k][i], 0) / n;
    console.log(`${name}: 最大チェイン 平均${mean(G.map(r => r.maxChain)).toFixed(0)} [${G.map(r => r.maxChain).sort((a, b) => a - b)}]  解放中の最大 ${mean(G.map(r => top(r, true))).toFixed(0)}  解放外の最大 ${mean(G.map(r => top(r, false))).toFixed(0)}  合成${mean(G.map(r => r.merges)).toFixed(0)} 対消滅${mean(G.map(r => r.annis)).toFixed(0)}  盤${mean(G.map(r => r.avgLive)).toFixed(1)}個  得点${mean(G.map(r => r.score)).toFixed(0)}  段の平均${mean(G.map(r => r.lvAvg)).toFixed(2)}  混沌の最大${Math.round(mean(G.map(r => r.gmax)) * 100)}%  終わった${G.filter(r => r.end !== 'play').length}/${G.length}  誤り${G.reduce((x, r) => x + r.errs.length, 0)}`);
    console.log(`  解放中の長い連鎖（25以上）${L.length}本：1本あたり 合成 雫→${sum('m', 1).toFixed(1)} 輝石→${sum('m', 2).toFixed(1)} 光核→${sum('m', 3).toFixed(1)}／対消滅 雫${sum('a', 1).toFixed(1)} 輝石${sum('a', 2).toFixed(1)} 光核${sum('a', 3).toFixed(1)} 真理${sum('a', 4).toFixed(1)}／上限の変化${mean(L.map(c => c.capCh)).toFixed(1)}回／始まりの盤の輝石${sum('tiers', 1).toFixed(1)} 光核${sum('tiers', 2).toFixed(1)}`);
  }
  await b.close();
})();
