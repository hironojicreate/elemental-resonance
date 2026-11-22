// 腕前の違う3つのボットで、幕・台座（音叉の組み合わせ）ごとの手応えを測る。
//   rule  ＝きまりを知っている（その場でいちばん良い手。手札での錬成は使わない）
//   chain ＝1手番の中で連鎖・溜め・自分の欠片を育てることを重く見る（敵の番は読まない）
//   read  ＝chain に加えて、敵の番（混沌の降る先・蝕み・あふれ・逃げ場なし）まで読む
// 音叉の効果（先見の眼・書の栞・遠見の眼・余韻・天秤の音叉はボットが使えないので除く）と、真理解放の封を入れてある。
// 使い方：SETS='[["名前",幕,["音叉のid",...]],...]' node tools/alchemy2/sim-skill.js
//   BOTS=rule,chain,read  N=1体あたりの戦数  ONLY=fight,elite,boss  HPX=arashi:0.8（体力の倍率）  NOSEAL=1（封なし）
// 山札は幕ごとの典型（DECKS）。1戦ごとに器50（重い器なら62）から。
const { A2E: E, FOES } = require('./lib.js');
if (process.env.FOEX) for (const [k, v] of Object.entries(JSON.parse(process.env.FOEX))) Object.assign(FOES[k], v); // 敵の表を一時的に書き換える（例 FOEX='{"shiki":{"pat2":["火3 風2"]}}'）
if (process.env.HPX) for (const kv of process.env.HPX.split(',')) { const [k, x] = kv.split(':'); FOES[k].hp = Math.round(FOES[k].hp * +x); }
const POOL = { 1: { fight: ['hiyura', 'doro', 'kiri', 'awa'], elite: ['muku', 'kaen'], boss: ['arashi'] }, 2: { fight: ['shaku', 'shinen', 'sajin', 'hyomu'], elite: ['kagami', 'hoshi'], boss: ['shiki'] }, 3: { fight: ['ryusei', 'kongo', 'senpu', 'kuro'], elite: ['hikari', 'futago'], boss: ['konton'] } };
const ELK = { '火': 0, '水': 1, '風': 2, '土': 3 }, OPPE = [1, 0, 3, 2];
let seed = 1; const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const truthPow = S => { const f = [0, 0, 0, 0]; for (const col of S.cols) for (const x of col) if (x.own === 'you' && x.k === 'el' && x.t === 4) f[x.e]++; return f; };
const has = (P, id) => P.rel.includes(id);
const ctx = (P, foeTurn) => ({ H: P.H, frames: null, ward: has(P, 'ward') ? 2 : 0, chargeX: has(P, 'spoon') ? 2 : 1, onMerge: () => 0,
  calc: (t, e, k, S, used) => { const base = E.ANNI[t] + (has(P, 'fw') && e < 2 ? 3 : 0) + (has(P, 'we') && e >= 2 ? 3 : 0) + (used || 0); let m = k + (has(P, 'kyo') && k >= 2 ? 1 : 0); m *= 1 + .5 * truthPow(S)[0]; if (foeTurn && has(P, 'mirror')) m *= 2; return Math.round(base * m); } });
function parseIntent(D, s, P) { let cut = has(P, 'pure') ? 1 : 0; const out = []; for (const tok of s.split(' ')) { if (tok === '無') { if (cut) { cut--; continue; } out.push({ k: 'pure', pers: D.pers }); } else if (tok === '染') out.push({ taint: 1 }); else if (tok[0] === '撃') out.push({ strike: +tok.slice(1) }); else out.push({ k: 'el', e: tok[0] === '乱' ? Math.floor(rand() * 4) : ELK[tok[0]], t: +tok.slice(1), pers: D.pers }); } return out; }
let nid = 5000; const CAPT = 3; let USE = {};
function actions(n, P) {
  const out = [], { S, hand } = n;
  hand.forEach((c, hi) => {
    if (hand.findIndex(d => d.k === c.k && d.e === c.e && d.t === c.t) !== hi) return;
    if (c.k === 'el') { if (n.plays <= 0) return; for (let col = 0; col < 5; col++) { if (!E.canDrop(S, col, c, P.H)) continue; const ps = E.partners(S, col, c, P.H); if (ps.length >= 2) ps.forEach(h => out.push({ hi, kind: 'drop', col, hint: h })); else out.push({ hi, kind: 'drop', col }); } }
    else if (c.k === 'light' || c.k === 'dark') { if (n.plays <= 0) return; for (const col of S.cols) for (const f of col) if (E.canApply(f, c.k)) out.push({ hi, kind: 'apply', id: f.id, k: c.k }); }
    else if (c.k === 'pure') { if (n.sh >= (has(P, 'veil') ? 2 : 1)) return; for (let col = 0; col < 5; col++) if (S.cols[col].length < P.H) out.push({ hi, kind: 'scaf', col }); } // 無垢は〈足場〉だけ
    else if (c.k === 'bal') { if (n.plays <= 0) return; for (const col of S.cols) for (const f of col) for (const g of E.swapPartners(S, f.id, P.balLv)) if (f.id < g) out.push({ hi, kind: 'swap', a: f.id, b: g }); }
  });
  if (P.hcMax - n.hc > 0) for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) {
    const a = hand[i], b = hand[j];
    if (a.k === 'el' && b.k === 'el' && a.e === b.e && a.t === b.t && a.t < CAPT) out.push({ kind: 'hc', op: 'merge', i, j });
    const sp = [a, b].find(c => c.k === 'light'), tg = sp && [a, b].find(c => c !== sp); // 手札では錬成と光の昇華だけ
    if (sp && tg && tg.k === 'el' && tg.t < CAPT) out.push({ kind: 'hc', op: 'light', sp: sp === a ? i : j, tg: tg === a ? i : j });
  }
  return out;
}
function step(n, a, P) {
  if (a.kind === 'hc') {
    const hand = n.hand.slice(), used = n.used.slice();
    if (a.op === 'merge') { const A = hand[a.i]; hand.splice(a.j, 1); hand.splice(a.i, 1, { id: nid++, k: 'el', e: A.e, t: A.t + 1 }); }
    else { const tg = { ...hand[a.tg] }; if (a.op === 'light') tg.t++; else tg.e = OPPE[tg.e]; if (!hand[a.sp].tmp) used.push(hand[a.sp]); hand[a.tg] = tg; hand.splice(a.sp, 1); }
    return { ...n, hand, used, hc: n.hc + 1 };
  }
  const S = E.clone(n.S), c = n.hand[a.hi], X = ctx(P);
  let r;
  if (a.kind === 'drop') r = E.drop(S, a.col, E.frag(S, 'el', c.e, c.t, 'you'), X, a.hint);
  else if (a.kind === 'scaf') { const f = E.frag(S, 'pure', -1, 0, 'you'); f.sh = 1; r = E.drop(S, a.col, f, X); }
  else if (a.kind === 'swap') r = E.swap(S, a.a, a.b, P.balLv, X);
  else r = E.apply(S, a.id, a.k, X);
  if (!r) return null;
  const hand = n.hand.slice(); hand.splice(a.hi, 1);
  const shellHurt = c.k === 'pure' && n.sh >= 1 ? 2 : 0;
  return { S, hand, used: c.tmp ? n.used : n.used.concat([c]), plays: n.plays - (c.k === 'pure' ? 0 : 1), sh: n.sh + (c.k === 'pure' ? 1 : 0), hc: n.hc, dealt: n.dealt + r.dmg, over: n.over + (r.over || 0) + shellHurt,
    use: c.k === 'el' ? n.use : { ...n.use, [c.k]: (n.use[c.k] || 0) + 1, ['d' + c.k]: (n.use['d' + c.k] || 0) + r.dmg },
    steals: n.steals + r.ev.filter(v => v.t === 'merge' && v.steal).length, truths: n.truths + r.ev.filter(v => v.t === 'merge' && v.f.t === 4).length, rel: n.rel || r.ev.some(v => v.t === 'anni' && v.tier === 4) };
}
const ownVal = S => { let v = 0; for (const col of S.cols) for (const f of col) if (f.own === 'you' && f.k === 'el') v += [0, .6, 2, 5, 12][f.t]; return v; };
function evalN(n, intent, P) {
  const sealBonus = n.rel ? 12 : 0;
  if (P.bot === 'rule') return n.dealt - 2 * n.over - E.chaosLoad(n.S) * 1.2 + .3 * (n.S.charge || 0) + sealBonus;
  if (P.bot === 'chain') return n.dealt - 2 * n.over - E.chaosLoad(n.S) * 1.6 + .5 * (n.S.charge || 0) + ownVal(n.S) + sealBonus + n.steals * (has(P, 'steal') ? 2 : 0);
  const fc = E.enemyTurn(E.clone({ ...n.S, salt: n.S.salt + 1 }), n.rel ? [] : intent, ctx(P, true));
  return n.dealt - 1.6 * n.over + fc.dmg - 1.6 * (fc.bite + fc.over + fc.strike) + .5 * (n.S.charge || 0) + ownVal(n.S) + n.steals * (has(P, 'steal') ? 2 : 0) + 5 * n.truths * (has(P, 'lamp') ? 1 : 0);
}
function bestTurn(B, intent, P) {
  const root = { S: E.clone(B.S), hand: B.hand.slice(), used: [], plays: B.plays, sh: 0, hc: 0, dealt: 0, over: 0, steals: 0, truths: 0, rel: false, use: {} };
  if (P.bot === 'rule') { let n = root; for (;;) { let best = null; for (const a of actions(n, { ...P, hcMax: 0 })) { const m = step(n, a, P); if (!m) continue; const v = evalN(m, intent, P); if (!best || v > best.v) best = { m, v }; } if (!best || best.v < evalN(n, intent, P) - 1) return n; n = best.m; } }
  let beam = [root], best = { n: root, v: evalN(root, intent, P) };
  for (let d = 0; d < 8 && beam.length; d++) {
    const next = [];
    for (const n of beam) for (const a of actions(n, P)) { const m = step(n, a, P); if (!m) continue; const v = evalN(m, intent, P); m.v = v; next.push(m); if (v > best.v) best = { n: m, v }; }
    next.sort((x, y) => y.v - x.v); beam = next.slice(0, P.bot === 'read' ? 22 : 16);
  }
  return best.n;
}
function battle(key, deck, P, hp0) {
  const D = FOES[key]; let hp = D.hp, ph = 1, si = 0, vessel = hp0, turn = 0, seal = false, extra = 0, bell = false, rels = 0;
  const pat = () => (ph === 2 && D.pat2 ? D.pat2 : D.pat), nextI = () => parseIntent(ph === 2 && D.pers2 ? { ...D, pers: D.pers2 } : D, pat()[si++ % pat().length], P);
  const B = { S: { cols: [[], [], [], [], []], nid: 1, salt: 0, charge: 0 }, draw: shuffle(deck.map(c => ({ ...c }))), hand: [], disc: [] };
  let intents = [nextI(), nextI()];
  E.enemyTurn(B.S, intents[0].filter(a => a.k), ctx(P, true)); intents.shift(); intents.push(nextI());
  while (turn < 25) {
    turn++; const tp = truthPow(B.S); B.plays = 3 + tp[3] + (has(P, 'swift') ? 1 : 0) + (bell ? 1 : 0); bell = false;
    const lim = 5 + tp[2] + (has(P, 'deep') ? 1 : 0) + extra; extra = 0;
    while (B.hand.length < lim) { if (!B.draw.length) { if (!B.disc.length) break; B.draw = shuffle(B.disc); B.disc = []; } B.hand.push(B.draw.pop()); }
    if (turn === 1) { if (has(P, 'seed')) B.hand.push({ id: nid++, k: 'light', e: -1, t: 0, tmp: 1 }); if (has(P, 'dusk')) B.hand.push({ id: nid++, k: 'dark', e: -1, t: 0, tmp: 1 }); }
    const n = bestTurn(B, seal ? [] : intents[0], P);
    hp -= n.dealt; vessel -= n.over; B.S = n.S; for (const k in n.use) USE[k] = (USE[k] || 0) + n.use[k]; USE.dmg = (USE.dmg || 0) + n.dealt; B.disc.push(...n.used, ...n.hand.filter(c => !c.tmp)); B.hand = [];
    if (has(P, 'steal')) extra = Math.min(n.steals, 4); // 引いた札はこの手番にも使えるが、ボットでは次の手番の手札に足す
    if (has(P, 'lamp')) vessel = Math.min(hp0, vessel + 5 * n.truths);
    if (n.rel && P.seal) { seal = true; rels++; }
    if (hp <= 0) return { win: 1, loss: hp0 - vessel, turn, rels };
    if (ph === 1 && D.pat2 && hp <= D.hp / 2) { ph = 2; si = 0; intents = [nextI(), nextI()]; }
    vessel = Math.min(hp0, vessel + 3 * truthPow(B.S)[1]);
    if (has(P, 'bell') && B.S.cols.every(c => !c.length)) bell = true;
    B.S.salt++;
    const out = E.enemyTurn(B.S, seal ? [] : intents[0], ctx(P, true)); seal = false;
    vessel -= out.bite + out.over + out.strike; hp -= out.dmg;
    if (P.seal && out.ev.some(v => v.t === 'anni' && v.tier === 4)) { seal = true; rels++; }
    if (vessel <= 0) return { win: 0, loss: hp0, turn, rels };
    if (hp <= 0) return { win: 1, loss: hp0 - vessel, turn, rels };
    if (ph === 1 && D.pat2 && hp <= D.hp / 2) { ph = 2; si = 0; intents = [nextI(), nextI()]; }
    intents.shift(); intents.push(nextI());
  }
  return { win: 0, loss: hp0 - vessel, turn, rels };
}
const C = (k, e, t) => ({ id: nid++, k, e, t }), el = (t, n) => { const o = []; for (let e = 0; e < 4; e++) for (let i = 0; i < n; i++) o.push(C('el', e, t)); return o; };
const DECKS = {
  1: () => [...el(1, 3), C('el', 1, 2), C('dark', -1, 0)],
  2: () => [...el(1, 3), C('el', 0, 2), C('el', 3, 2), C('el', 1, 2), C('el', 1, 3), C('light', -1, 0), C('dark', -1, 0), C('pure', -1, 1)],
  3: () => [...el(1, 2), ...el(2, 1), C('el', 0, 3), C('el', 2, 3), C('el', 3, 3), C('light', -1, 0), C('dark', -1, 0), C('pure', -1, 1), C('pure', -1, 2)],
};
const COST = { bal2: 1, bal3: 2, kyo: 3, fw: 1, we: 1, spoon: 2, steal: 3, bell: 2, heavy: 2, ward: 2, seed: 2, dusk: 2, eye: 1, echo: 1, pure: 1, lamp: 1, mirror: 2, linger: 1, linger3: 2, veil: 1, deep: 3, tall: 2, swift: 2, palm: 1, palm2: 2 };
const SETS = JSON.parse(process.env.SETS);
// DECKADD='light,dark,pure,bal'：幕の山札に足す札（光・闇・無垢の雫・天秤を1枚ずつ）
const ADD = (process.env.DECKADD || '').split(',').filter(Boolean).map(k => () => C(k, -1, k === 'pure' || k === 'bal' ? 1 : 0));
const N = +(process.env.N || 6), bots = (process.env.BOTS || 'chain,read').split(','), only = (process.env.ONLY || 'fight,elite,boss').split(',');
for (const [label, act, rel] of SETS) {
  const cost = rel.reduce((n, id) => n + COST[id], 0);
  for (const bot of bots) {
    const P = { bot, rel, H: has({ rel }, 'tall') ? 6 : 5, hcMax: rel.includes('palm2') ? 2 : rel.includes('palm') ? 1 : 0, seal: process.env.NOSEAL ? false : true, balLv: rel.includes('bal3') ? 3 : rel.includes('bal2') ? 2 : 1 };
    USE = {}; let NB = 0;
    const hp0 = 50 + (rel.includes('heavy') ? 12 : 0), row = [];
    let RL = 0;
    for (const kind of only) {
      let W = 0, L = 0, n = 0;
      for (const key of POOL[act][kind]) for (let i = 0; i < N; i++) { seed = 7 + 1000 * act + 31 * i + key.length * 3; const x = battle(key, [...DECKS[act](), ...ADD.map(f => f())], P, hp0); W += x.win; L += x.loss; n++; RL += x.rels; }
      row.push(`${kind} ${(W / n * 100).toFixed(0)}% −${(L / n).toFixed(1)}`); NB += n;
    }
    const u = ['light', 'dark', 'pure', 'bal'].filter(k => USE[k]).map(k => `${{ light: '光', dark: '闇', pure: '足場', bal: '天秤' }[k]} ${(USE[k] / NB).toFixed(1)}回${USE['d' + k] ? `・傷${Math.round(USE['d' + k] / USE.dmg * 100)}%` : ''}`).join(' ');
    console.log(`${label.padEnd(14)} 幕${act} コスト${String(cost).padStart(2)} ${bot.padEnd(5)} | ${row.join(' | ')}${RL ? ` | 封 ${RL}回` : ''}${u ? ` | 1戦に ${u}` : ''}`);
  }
}
