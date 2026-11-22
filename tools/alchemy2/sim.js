// 錬成の書２の戦闘シミュレーション（1手番先まで全部読むボット）。
// 使い方：node tools/alchemy2/sim.js（環境変数：K=敵の名前をカンマで / N=1体あたりの戦数 / SH=山札の雫を無垢の雫に替える枚数 / DARK1=1 で第一幕の山札に闇 /
//   HPS=敵の体力の倍率 / CHOICE=0 で相手を選ばない / SEED=乱数の種）。山札は幕ごとの典型（DECKS）。器は60で測る。
// 出力：勝率・器の減り・手番・最長の連鎖・対消滅/取り込み/真理解放の回数・敵の番の対消滅・蝕み・あふれ・撃・連鎖の段ごとの回数（k 1,2,3…）・殻・闇
const { A2E: E, FOES } = require('./lib.js');
const W = 5, H = +process.env.H || 5, HAND = 5, PLAYS = 3;
let seed = +process.env.SEED || 7;
const rnd = () => { let t = seed = (seed + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ELK = { '火': 0, '水': 1, '風': 2, '土': 3 };
function parse(D, s) {
  return s.split(' ').map(tok => {
    if (tok === '無') return { k: 'pure', pers: D.pers };
    if (tok === '染') return { taint: 1 };
    if (tok[0] === '撃') return { strike: +tok.slice(1) };
    const e = tok[0] === '乱' ? Math.floor(rnd() * 4) : ELK[tok[0]];
    return { k: 'el', e, t: +tok.slice(1), pers: D.pers };
  });
}
// ゲームと同じ場の決まりごと（音叉・真理の力は考えない）：〈溜め〉は基本の調律力に足して、連鎖の倍率をかける
const X0 = { H, frames: null, calc: (t, e, k, S, used) => (E.ANNI[t] + (used || 0)) * k, onMerge: () => 0, chargeX: 1 };
const CHOICE = process.env.CHOICE !== '0'; // 反応させる相手を選ぶ（ゲームと同じ）。CHOICE=0 で、いつもの順だけ

function playerTurn(S, hand, intent, st) {
  let best = { v: -1e9, seq: [] };
  const evalState = (s, dealt) => {
    const s2 = E.clone(s); const et = E.enemyTurn(s2, intent, X0);
    const height = s2.cols.reduce((n, c) => n + c.length, 0);
    const pure = s2.cols.reduce((n, c) => n + c.filter(f => f.k === 'pure').length, 0);
    let mineHi = 0; for (const c of s2.cols) for (const f of c) if (f.own === 'you' && f.k === 'el') mineHi += [0, 0, .5, 1.5, 4][f.t];
    let loaded = 0; // 殻の中で、割れれば反応する組（仕込み）を少しだけ評価
    if (process.env.LOADED) for (let c = 0; c < s2.cols.length; c++) s2.cols[c].forEach((f, i) => { if (!f.sh) return; for (const [dc, di] of [[0,-1],[0,1],[-1,0],[1,0]]) { const n = E.at(s2, c+dc, i+di); if (n && n.k === 'el' && !n.sh && n.t === f.t && (n.e === f.e || E.OPPE[n.e] === f.e)) loaded += 1.5 * f.t; } });
    return dealt + et.dmg + .7 * (s2.charge || 0) - 1.3 * (et.bite + et.over + et.strike) - 0.8 * E.chaosLoad(s2) - 0.7 * pure - 0.25 * height + mineHi * .5 + loaded;
  };
  // 相手を選べるとき：落ちる先の下・左・右のうち、反応できる相手（なければ既定のみ）。既定と同じ結果になる相手も並べる
const hintsOf = (s, col, c) => {
  if (!CHOICE) return [null];
  const i = s.cols[col].length, out = [];
  for (const [nc, ni] of [[col, i - 1], [col - 1, i], [col + 1, i]]) { const P = E.at(s, nc, ni); if (P && E.rk(c, P)) out.push([nc, ni]); }
  return out.length ? out : [null];
};
  const rec = (s, h, n, dealt, seq, shUsed = false) => {
    const v = evalState(s, dealt);
    if (v > best.v) best = { v, seq: seq.slice() };
    const seen = new Set();
    for (let i = 0; i < h.length; i++) {
      const c = h[i], key = c.k + c.e + c.t; if (seen.has(key)) continue; seen.add(key);
      const rest = h.slice(0, i).concat(h.slice(i + 1));
      if (c.k === 'pure') { if (shUsed) continue; for (const colA of s.cols) for (const f of colA) { if (!E.canApply(f, 'shell1')) continue; const s2 = E.clone(s); E.apply(s2, f.id, 'shell' + c.t, X0); seq.push([c, f.id]); rec(s2, rest, n, dealt, seq, true); seq.pop(); } continue; }
      if (n === 0) continue;
      if (c.k === 'el') for (let col = 0; col < W; col++) {
        if (!E.canDrop(s, col, c, H)) continue;
        for (const hint of hintsOf(s, col, c)) {
          const s2 = E.clone(s); const r = E.drop(s2, col, E.frag(s2, 'el', c.e, c.t, 'you'), X0, hint);
          seq.push([c, col, hint]); rec(s2, rest, n - 1, dealt + r.dmg - r.over * 1.3, seq, shUsed); seq.pop();
        }
      } else for (const colA of s.cols) for (const f of colA) {
        if (!E.canApply(f, c.k)) continue;
        const s2 = E.clone(s); const r = E.apply(s2, f.id, c.k, X0);
        seq.push([c, f.id]); rec(s2, rest, n - 1, dealt + (r ? r.dmg : 0), seq, shUsed); seq.pop();
      }
    }
  };
  rec(S, hand, PLAYS, 0, []);
  let dealt = 0;
  const hintsOfReal = (s, col, c) => { const i = s.cols[col].length; return [[col, i - 1], [col - 1, i], [col + 1, i]].filter(([nc, ni]) => { const P = E.at(s, nc, ni); return P && E.rk(c, P); }).length; };
  for (const step of best.seq) { const [c, tgt] = step;
    let r;
    if (c.k === 'el') {
      const hint = step[2], i0 = S.cols[tgt].length;
      if (hint) { st.chosen++; const def = [[tgt, i0 - 1], [tgt - 1, i0], [tgt + 1, i0]].find(([nc, ni]) => { const P = E.at(S, nc, ni); return P && E.rk(c, P); }); if (def && (def[0] !== hint[0] || def[1] !== hint[1])) st.nondef++; if (hintsOfReal(S, tgt, c) > 1) st.multi++; }
      r = E.drop(S, tgt, E.frag(S, 'el', c.e, c.t, 'you'), X0, hint); st.over += r.over; }
    else if (c.k === 'pure') { r = E.apply(S, tgt, 'shell' + c.t, X0); st.shell++; }
    else { r = E.apply(S, tgt, c.k, X0); if (c.k === 'dark') st.dark++; if (c.k === 'light') st.light++; }
    dealt += r.dmg; st.maxk = Math.max(st.maxk, r.k);
    for (const v of r.ev) { if (v.t === 'anni' && v.freed) { st.freed++; st.freedDmg += v.dmg; } if (v.t === 'anni') st.annDmg += v.dmg; if (v.t === 'anni') { st.anni++; st.ch[Math.min(v.k, 6)]++; if (v.tier === 4) st.rel++; } if (v.t === 'merge' && v.steal) st.steal++; }
  }
  return dealt;
}
function battle(key, deck, hp) {
  const D = FOES[key];
  const S = { cols: Array.from({ length: W }, () => []), nid: 1, salt: 0 };
  let ehp = D.hp, step = 0, turn = 0, ph = 1; let draw = shuffle(deck.slice()), disc = [];
  const st = { chosen: 0, nondef: 0, multi: 0, shell: 0, dark: 0, light: 0, darkDrawn: 0, freed: 0, freedDmg: 0, annDmg: 0, maxk: 0, anni: 0, steal: 0, ch: [0, 0, 0, 0, 0, 0, 0], counter: 0, bite: 0, over: 0, strike: 0, rel: 0 };
  const pat = () => (ph === 2 && D.pat2 ? D.pat2 : D.pat);
  let intent = parse(D, pat()[step++ % pat().length]);
  E.enemyTurn(S, intent.filter(a => a.k), X0); intent = parse(D, pat()[step++ % pat().length]);
  while (ehp > 0 && hp > 0 && turn < 40) {
    turn++;
    const hand = [];
    for (let i = 0; i < HAND; i++) { if (!draw.length) { draw = shuffle(disc); disc = []; } if (draw.length) hand.push(draw.pop()); }
    st.darkDrawn += hand.filter(c => c.k === 'dark').length;
    ehp -= playerTurn(S, hand, intent, st);
    disc.push(...hand);
    if (ph === 1 && D.pat2 && ehp <= D.hp / 2) { ph = 2; step = 0; }
    if (ehp <= 0) break;
    S.salt++;
    const et = E.enemyTurn(S, intent, X0);
    hp -= et.bite + et.over + et.strike; ehp -= et.dmg; st.counter += et.dmg; st.bite += et.bite; st.over += et.over; st.strike += et.strike;
    intent = parse(D, pat()[step++ % pat().length]);
  }
  st.turns = turn;
  return { win: ehp <= 0, hp, st };
}
const mkDeck = spec => { const d = []; for (const [k, e, t, n] of spec) for (let i = 0; i < n; i++) d.push({ k, e, t }); return d; };
const DECKS = {
  1: mkDeck([0, 1, 2, 3].map(e => ['el', e, 1, 3])),
  2: mkDeck([...[0, 1, 2, 3].map(e => ['el', e, 1, 3]), ['el', 0, 2, 1], ['el', 1, 2, 1], ['el', 3, 2, 1], ['light', -1, 0, 1], ['dark', -1, 0, 1]]),
  3: mkDeck([...[0, 1, 2, 3].map(e => ['el', e, 1, 2]), ...[0, 1, 2, 3].map(e => ['el', e, 2, 1]), ['el', 1, 2, 1], ['el', 2, 2, 1], ['el', 0, 3, 1], ['el', 1, 3, 1], ['el', 2, 3, 1], ['light', -1, 0, 2], ['dark', -1, 0, 1]]),
};
const ACTOF = { hiyura: 1, doro: 1, kiri: 1, awa: 1, muku: 1, kaen: 1, arashi: 1, shaku: 2, shinen: 2, sajin: 2, hyomu: 2, kagami: 2, hoshi: 2, shiki: 2, ryusei: 3, kongo: 3, senpu: 3, kuro: 3, hikari: 3, futago: 3, konton: 3 };
const SH = +process.env.SH || 0;
for (const a of [1, 2, 3]) { for (let i = 0; i < SH; i++) { const j = DECKS[a].findIndex(c => c.k === 'el' && c.t === 1); DECKS[a].splice(j, 1); } for (let i = 0; i < SH; i++) DECKS[a].push({ k: 'pure', e: -1, t: 1 }); if (a > 1 && !DECKS[a].some(c => c.k === 'dark')) DECKS[a].push({ k: 'dark', e: -1, t: 0 }); }
if (process.env.DARK1) DECKS[1].push({ k: 'dark', e: -1, t: 0 });
const keys = (process.env.K || Object.keys(ACTOF).join(',')).split(',');
for (const key of keys) {
  const N = +process.env.N || 12, HP0 = 60;
  let wins = 0, loss = 0, turns = 0, maxk = 0; const agg = { chosen: 0, nondef: 0, multi: 0, shell: 0, dark: 0, darkDrawn: 0, freed: 0, freedDmg: 0, annDmg: 0, anni: 0, steal: 0, counter: 0, bite: 0, over: 0, strike: 0, rel: 0 }; const ch = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    const r = battle(key, DECKS[ACTOF[key]], HP0);
    if (r.win) wins++; loss += HP0 - Math.max(0, r.hp); turns += r.st.turns; maxk = Math.max(maxk, r.st.maxk);
    for (const k in agg) agg[k] += r.st[k]; r.st.ch.forEach((v, j) => ch[j] += v);
  }
  console.log(`${key.padEnd(7)} a${ACTOF[key]} win ${wins}/${N} hpLoss ${(loss / N).toFixed(1).padStart(5)} turns ${(turns / N).toFixed(1).padStart(4)} maxk ${maxk} | anni ${(agg.anni / N).toFixed(1)} steal ${(agg.steal / N).toFixed(1)} rel ${(agg.rel / N).toFixed(1)} counter ${(agg.counter / N).toFixed(1)} bite ${(agg.bite / N).toFixed(1)} over ${(agg.over / N).toFixed(1)} strike ${(agg.strike / N).toFixed(1)} | k ${ch.slice(1).join(',')} | 殻 ${(agg.shell / N).toFixed(1)} 割れて反応 ${(agg.freed / N).toFixed(1)}（傷の${(agg.freedDmg / Math.max(1, agg.annDmg) * 100).toFixed(0)}%） 闇 ${agg.dark}/${agg.darkDrawn} | 相手が2つ以上 ${(agg.multi / N).toFixed(1)} 既定と違う相手 ${(agg.nondef / N).toFixed(1)}`);
}
