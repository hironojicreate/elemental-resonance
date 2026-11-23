// 鳴り石の〈詰み〉：山札が尽きて、手の石と響き合う石がないと終わる。記録の局数が増え、連勝が途切れる。
// 使い方：node tools/chimestone/test/stuck.js
const path = require('path');
const INDEX = path.resolve(__dirname, '../../../index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + INDEX); await p.waitForTimeout(500);
  // 峰に 風の輝石・土の雫・火の輝石 だけ、手は風の雫、山札なし。連勝2の記録
  await p.evaluate(() => {
    localStorage.clear();
    const cards = Array(29).fill(null); cards[26] = { id: 1, e: 2, t: 2 }; cards[27] = { id: 2, e: 3, t: 1 }; cards[28] = { id: 3, e: 0, t: 2 };
    const G = { v: 1, mode: 'run', seed: 1, rs: 1, nid: 10, cards, stock: [], hand: { id: 4, e: 2, t: 1 }, chain: 0, score: 40, phase: 'play', result: null, st: { merge: 0, anni: 0, picks: 0, flips: 0, truths: 0, calm: 0, maxChain: 0 } };
    localStorage.setItem('genso.nr.run', JSON.stringify(G));
    localStorage.setItem('genso.nr.rec', JSON.stringify({ games: 5, wins: 3, streak: 2, bestStreak: 2, best: 500 }));
    localStorage.setItem('genso.nr.tutDone', 'true');
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goNari'); await p.click('#nrContinue'); await p.waitForTimeout(300);
  const idle = async () => { for (let i = 0; i < 80; i++) { if (!(await p.evaluate(() => document.getElementById('nr').dataset.busy === '1'))) break; await p.waitForTimeout(50); } await p.waitForTimeout(80); };
  await p.evaluate(() => document.querySelector('.nr-card[data-i="27"]').click()); await idle(); // 風の雫 × 土の雫 → 対消滅、手が空く
  const empty = await p.textContent('#nrHlbl');
  await p.evaluate(() => document.querySelector('.nr-card[data-i="26"]').click()); await idle(); // 風の輝石を手に取る → 相手がなく、山札もない
  await p.waitForTimeout(1200);
  const res = await p.evaluate(() => ({ shown: !document.getElementById('nrResOv').hidden, h: document.getElementById('nrResH').textContent, why: document.getElementById('nrResWhy').textContent, pts: document.getElementById('nrResPts').textContent }));
  const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('genso.nr.rec')));
  const run = await p.evaluate(() => localStorage.getItem('genso.nr.run'));
  console.log({ empty, res, rec, runCleared: run === 'null' || run === null });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
