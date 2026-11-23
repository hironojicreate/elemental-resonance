// 鳴り石の「めくる」：押せる石があるうちはめくれない。めくった石が手の石と響き合えば、そのまま反応して連鎖が続く
// （合成なら手の石が育ち、対消滅なら手が空く）。響き合わなければ入れ替わり、連鎖は途切れる。
// 使い方：node tools/chimestone/test/flip.js
const path = require('path');
const INDEX = path.resolve(__dirname, '../../../index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + INDEX); await p.waitForTimeout(500);
  const idle = async () => { await p.waitForTimeout(60); for (let i = 0; i < 80; i++) { if (!(await p.evaluate(() => document.getElementById('nr').dataset.busy === '1'))) break; await p.waitForTimeout(50); } await p.waitForTimeout(80); };
  // 峰：いちばん下に 風の雫・土の輝石・火の光核（ほかは取ったあと）。手と山札（末尾からめくる）は場合ごとに
  const setup = async (hand, stock, chain) => {
    await p.evaluate(([hand, stock, chain]) => {
      localStorage.clear(); localStorage.setItem('genso.nr.tutDone', 'true');
      const cards = Array(29).fill(null); cards[20] = { id: 1, e: 2, t: 1 }; cards[24] = { id: 2, e: 3, t: 2 }; cards[28] = { id: 3, e: 0, t: 3 };
      const G = { v: 1, mode: 'run', seed: 1, rs: 1, nid: 50, cards, stock: stock.map((c, k) => ({ id: 10 + k, e: c[0], t: c[1] })), hand: { id: 9, e: hand[0], t: hand[1] }, chain, score: 0, phase: 'play', result: null, st: { merge: 0, anni: 0, picks: 0, flips: 0, flipHit: 0, truths: 0, calm: 0, maxChain: chain } };
      localStorage.setItem('genso.nr.run', JSON.stringify(G));
    }, [hand, stock, chain]);
    await p.reload(); await p.waitForTimeout(300); await p.click('#goNari'); await p.click('#nrContinue'); await idle();
  };
  const look = () => p.evaluate(() => ({ hand: document.getElementById('nrHlbl').textContent, chain: document.querySelector('#nrChain b').textContent, stockOff: document.getElementById('nrStock').disabled, stockN: document.getElementById('nrStockN').textContent, info: document.getElementById('nrInfo').textContent }));
  const out = {};
  // ① 押せる石がある（手は風の雫、表に土の…ではなく風の雫がある）→ めくれない
  await setup([2, 1], [[1, 1], [0, 1]], 2);
  out.canTake = await look();
  // ② 手は水の雫（押せる石なし）、めくると火の雫 → 対消滅、連鎖は 3 へ続き、手が空く
  await setup([1, 1], [[3, 3], [0, 1]], 2);
  out.stuckBefore = await look();
  await p.click('#nrStock'); await idle();
  out.anniHit = await look();
  // ③ 手は水の輝石、めくると水の輝石 → 合成して水の光核、連鎖は 3 へ
  await setup([1, 2], [[3, 3], [1, 2]], 2);
  await p.click('#nrStock'); await idle();
  out.mergeHit = await look();
  // ④ 手は水の雫、めくると風の輝石 → 響き合わない：入れ替わり、連鎖は 0
  await setup([1, 1], [[3, 3], [2, 2]], 2);
  await p.click('#nrStock'); await idle();
  out.miss = await look();
  for (const k in out) console.log(k, JSON.stringify(out[k]));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
