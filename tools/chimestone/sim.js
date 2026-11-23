// 鳴り石の早送り：腕前の違う3つのボットで、勝率・連鎖・真理の回数などを測る。
// きまり（NRE）は index.html からその場で読み出すので、ゲームを直せば道具もそのまま新しいきまりで動く。
// 使い方：node tools/chimestone/sim.js（環境変数 N＝でたらめ・直感の局数、NM＝読むボットの局数、K＝読むボットの試し打ちの数、PER＝各元素の雫,輝石,光核の枚数 例 PER=6,4,2）
const fs = require('fs'), path = require('path');
const INDEX = process.env.NRSRC || path.resolve(__dirname, '../../index.html');
const src = fs.readFileSync(INDEX, 'utf8');
const a = src.indexOf('const NRE = (() => {'), b = src.indexOf('/*/NRENGINE*/');
if (a < 0 || b < 0) throw new Error('index.html に NRE（鳴り石のきまり）が見つからない');
let code = src.slice(a, b);
if (process.env.PER) code = code.replace(/PER = \[[^\]]*\]/, `PER = [${process.env.PER}]`);
const NRE = new Function(`${code}\nreturn NRE;`)();
const N = +(process.env.N || 1000), NM = +(process.env.NM || 200), K = +(process.env.K || 8);

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function game(seed) { const d = NRE.deal(rng(seed * 2654435761 + 7)); return { cards: d.cards, stock: d.stock, hand: d.hand, chain: 0, score: 0, st: {} }; }
const clone = G => ({ cards: G.cards.slice(), stock: G.stock.slice(), hand: G.hand ? { ...G.hand } : null, chain: G.chain, score: G.score, st: { ...G.st } });
// 一局を最後まで：押せる石があれば方針で選び、なければめくる
function playout(G, pol) { for (let g = 0; g < 400; g++) { if (NRE.over(G)) return; const mv = NRE.moves(G); if (mv.length) NRE.take(G, pol(G, mv).i); else NRE.flip(G); } }
// でたらめ：押せる石から無作為に
const randPol = (G, mv) => mv[Math.floor(Math.random() * mv.length)];
// 直感：対消滅があれば対消滅、なければ合成。手が空いたら、表に相手の多い石を取る
function greedyPol(G, mv) {
  if (mv[0].kind === 'pick') { const ex = NRE.open(G); let best = mv[0], bs = -1; for (const m of mv) { let s = 0; for (const j of ex) if (j !== m.i && NRE.react(G.cards[m.i], G.cards[j])) s++; if (s > bs) { bs = s; best = m; } } return best; }
  return mv.find(m => m.kind === 'anni') || mv[0];
}
// 読む：見えない石（覆いの下と山札）を混ぜ直して、手ごとに K 回、直感で最後まで早送りし、いちばん良い手を選ぶ（裏は覗かない）
function mcPol(G, mv) {
  if (mv.length === 1) return mv[0];
  const hid = []; for (let i = 0; i < NRE.N; i++) if (G.cards[i] && !NRE.isOpen(G, i)) hid.push(i);
  let best = mv[0], bs = -1e9;
  for (const m of mv) {
    let tot = 0;
    for (let k = 0; k < K; k++) {
      const s = clone(G), pool = hid.map(i => s.cards[i]).concat(s.stock);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      hid.forEach((i, n) => { s.cards[i] = pool[n]; }); s.stock = pool.slice(hid.length);
      NRE.take(s, m.i); playout(s, greedyPol);
      tot += NRE.left(s) ? -NRE.left(s) * 4 : 100 + s.stock.length * 3;
    }
    if (tot > bs) { bs = tot; best = m; }
  }
  return best;
}
function run(pol, n) {
  const A = { win: 0, left: 0, stock: 0, chain: 0, truths: 0, score: 0, flips: 0, near: 0 };
  for (let s = 1; s <= n; s++) {
    const G = game(s); playout(G, pol); const L = NRE.left(G), win = !L;
    if (win) G.score += NRE.bonus(G);
    A.win += win; A.left += L; A.stock += G.stock.length; A.chain += G.st.maxChain || 0; A.truths += G.st.truths || 0; A.score += G.score; A.flips += G.st.flips || 0; A.near += (L >= 1 && L <= 3);
  }
  for (const k in A) A[k] /= n; return A;
}
const f = (x, d = 0) => (+x).toFixed(d);
console.log(`石 ${NRE.PER.join('/')}（各元素の雫/輝石/光核）・峰 ${NRE.N}枚・山札 ${NRE.deck().length - NRE.N - 1}枚`);
console.log('腕前 | 勝率 | 残り1〜3で詰み | 最長の連鎖 | 真理 | めくった | 響き（静寂の上乗せ込み）');
for (const [name, pol, n] of [['でたらめ', randPol, N], ['直感', greedyPol, N], ['読む', mcPol, NM]]) {
  const r = run(pol, n);
  console.log(`${name} | ${f(r.win * 100)}% | ${f(r.near * 100)}% | ${f(r.chain, 1)} | ${f(r.truths, 2)} | ${f(r.flips, 1)} | ${f(r.score)}`);
}
