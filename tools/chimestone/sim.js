// 鳴り石の早送り：腕前の違う3つのボットで、勝率・連鎖・真理の回数などを測る。
// きまり（NRE）は index.html からその場で読み出すので、ゲームを直せば道具もそのまま新しいきまりで動く。
// 使い方：node tools/chimestone/sim.js
//   環境変数 N＝でたらめ・直感の局数、NM＝読むボットの局数、K＝読むボットの試し打ちの数、
//   PER＝各元素の雫,輝石,光核の枚数（例 PER=6,4,2）、LD=0＝光と闇のノブを切る（v1.104.0 の鳴り石）
const fs = require('fs'), path = require('path');
const INDEX = process.env.NRSRC || path.resolve(__dirname, '../../index.html');
const src = fs.readFileSync(INDEX, 'utf8');
const a = src.indexOf('const NRE = (() => {'), b = src.indexOf('/*/NRENGINE*/');
if (a < 0 || b < 0) throw new Error('index.html に NRE（鳴り石のきまり）が見つからない');
let code = src.slice(a, b);
if (process.env.PER) code = code.replace(/PER = \[[^\]]*\]/, `PER = [${process.env.PER}]`);
if (process.env.LD === '0') code = code.replace('const KNOB = { ld: true }', 'const KNOB = { ld: false }');
const NRE = new Function(`${code}\nreturn NRE;`)();
const N = +(process.env.N || 1000), NM = +(process.env.NM || 200), K = +(process.env.K || 8);

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function game(seed) { const d = NRE.deal(rng(seed * 2654435761 + 7)); return { cards: d.cards, stock: d.stock, hand: d.hand, chain: 0, score: 0, L: 0, D: 0, st: {} }; }
const clone = G => ({ cards: G.cards.slice(), stock: G.stock.slice(), hand: G.hand ? { ...G.hand } : null, chain: G.chain, score: G.score, L: G.L, D: G.D, st: { ...G.st } });
// 手：{ take: i } / { use: 'L'|'D' } / { flip: true }
function act(G, m) { if (m.take != null) NRE.take(G, m.take); else if (m.use) NRE.use(G, m.use); else NRE.flip(G); }
function choices(G) {
  const c = NRE.moves(G).map(m => ({ take: m.i, kind: m.kind }));
  for (const sp of ['L', 'D']) if (NRE.canUse(G, sp)) c.push({ use: sp });
  if (NRE.canFlip(G)) c.push({ flip: true });
  return c;
}
// 一局を最後まで
function playout(G, pol) { for (let g = 0; g < 500; g++) { if (NRE.over(G)) return; const c = choices(G); if (!c.length) return; act(G, pol(G, c)); } }
// でたらめ：できる手から無作為に（めくるのは押せる石がないときだけなので、選べばそのまま）
const randPol = (G, c) => c[Math.floor(Math.random() * c.length)];
const exposedHas = (G, f) => NRE.open(G).some(i => f(G.cards[i]));
// 直感：手が光核なら光で真理／闇で反転して反対の光核と合成。手が輝石で同じ元素の光核が表にあれば光。
// あとは対消滅を優先、なければ合成。手が空いたら、表に相手の多い石を取る。押せる石がなければ、光で押せる石ができるなら光、だめならめくる
function greedyPol(G, c) {
  const h = G.hand, has = sp => c.some(x => x.use === sp);
  if (h && h.t === 3 && has('L')) return { use: 'L' };
  if (h && h.t === 3 && has('D') && exposedHas(G, s => s.t === 3 && s.e === (h.e ^ 1))) return { use: 'D' };
  if (h && h.t === 2 && has('L') && exposedHas(G, s => s.t === 3 && s.e === h.e)) return { use: 'L' };
  const tk = c.filter(x => x.take != null);
  if (tk.length) {
    if (tk[0].kind === 'pick') { const ex = NRE.open(G); let best = tk[0], bs = -1; for (const m of tk) { let s = 0; for (const j of ex) if (j !== m.take && NRE.react(G.cards[m.take], G.cards[j])) s++; if (s > bs) { bs = s; best = m; } } return best; }
    return tk.find(x => x.kind === 'anni') || tk[0];
  }
  if (has('L')) { const s = clone(G); NRE.use(s, 'L'); if (!s.hand || NRE.moves(s).length) return { use: 'L' }; }
  return c.find(x => x.flip) || c[0];
}
// 読む：見えない石（覆いの下と山札）を混ぜ直して、手ごとに K 回、直感で最後まで早送りし、いちばん良い手を選ぶ（裏は覗かない）
function mcPol(G, c) {
  if (c.length === 1) return c[0];
  const hid = []; for (let i = 0; i < NRE.N; i++) if (G.cards[i] && !NRE.isOpen(G, i)) hid.push(i);
  let best = c[0], bs = -1e9;
  for (const m of c) {
    let tot = 0;
    for (let k = 0; k < K; k++) {
      const s = clone(G), pool = hid.map(i => s.cards[i]).concat(s.stock);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      hid.forEach((i, n) => { s.cards[i] = pool[n]; }); s.stock = pool.slice(hid.length);
      act(s, m); playout(s, greedyPol);
      tot += NRE.left(s) ? -NRE.left(s) * 4 : 100 + s.stock.length * 3;
    }
    if (tot > bs) { bs = tot; best = m; }
  }
  return best;
}
function run(pol, n) {
  const A = { win: 0, near: 0, chain: 0, truths: 0, any: 0, flips: 0, score: 0, gotL: 0, gotD: 0, useL: 0, useD: 0 };
  for (let s = 1; s <= n; s++) {
    const G = game(s); playout(G, pol); const L = NRE.left(G), win = !L;
    if (win) G.score += NRE.bonus(G);
    A.win += win; A.near += (L >= 1 && L <= 3); A.chain += G.st.maxChain || 0; A.truths += G.st.truths || 0; A.any += (G.st.truths || 0) > 0; A.flips += G.st.flips || 0; A.score += G.score;
    for (const k of ['gotL', 'gotD', 'useL', 'useD']) A[k] += G.st[k] || 0;
  }
  for (const k in A) A[k] /= n; return A;
}
const f = (x, d = 0) => (+x).toFixed(d);
console.log(`石 ${NRE.PER.join('/')}（各元素の雫/輝石/光核）・峰 ${NRE.N}枚・山札 ${NRE.deck().length - NRE.N - 1}枚・光と闇 ${NRE.KNOB.ld ? 'あり' : 'なし'}`);
console.log('腕前 | 勝率 | 残り1〜3で詰み | 最長の連鎖 | 真理/局 | 真理が出た局 | めくった | 宿った光/闇 | 使った光/闇 | 響き（静寂の上乗せ込み）');
for (const [name, pol, n] of [['でたらめ', randPol, N], ['直感', greedyPol, N], ['読む', mcPol, NM]]) {
  const r = run(pol, n);
  console.log(`${name} | ${f(r.win * 100)}% | ${f(r.near * 100)}% | ${f(r.chain, 1)} | ${f(r.truths, 2)} | ${f(r.any * 100)}% | ${f(r.flips, 1)} | ${f(r.gotL, 1)}/${f(r.gotD, 1)} | ${f(r.useL, 1)}/${f(r.useD, 1)} | ${f(r.score)}`);
}
