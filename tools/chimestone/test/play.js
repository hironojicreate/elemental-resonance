// 鳴り石の一局：新しい峰で始め、途中で保存して「続きから」、同じ配りの再現、押せない石・覆われた石、光らせない設定、
// 最後まで遊んで結果の画面と記録（勝ち・局数・最高）、タイトルの記録の表示まで。
// 使い方：node tools/chimestone/test/play.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + INDEX); await p.waitForTimeout(500);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('genso.nr.tutDone', 'true'); }); await p.reload(); await p.waitForTimeout(500);
  const idle = async () => { for (let i = 0; i < 80; i++) { if (!(await p.evaluate(() => document.getElementById('nr').dataset.busy === '1'))) break; await p.waitForTimeout(50); } await p.waitForTimeout(80); };
  const run = () => p.evaluate(() => JSON.parse(localStorage.getItem('genso.nr.run')));
  const step = async () => { // 対消滅を優先、なければ合成・手に取る、なければめくる
    const c = await p.$('.nr-card.can.a') || await p.$('.nr-card.can');
    if (c) await c.click(); else if (await p.evaluate(() => !document.getElementById('nrStock').disabled)) await p.click('#nrStock'); else return false;
    await idle(); return true;
  };
  await p.click('#goNari'); await p.waitForTimeout(150);
  const newPrimary = await p.evaluate(() => document.getElementById('nrNew').classList.contains('primary'));
  await p.click('#nrNew'); await idle();
  const r0 = await run();
  // 覆われた石を押す → 案内が出るだけ
  await p.evaluate(() => document.querySelector('.nr-card.down').click()); await idle();
  const coveredMsg = await p.textContent('#nrInfo');
  // 押せない表の石を押す → 理由が出る（あれば）
  const badI = await p.evaluate(() => { const n = document.querySelector('.nr-card.up:not(.can)'); return n ? n.dataset.i : null; });
  let badMsg = null;
  if (badI) { await p.evaluate(i => document.querySelector(`.nr-card[data-i="${i}"]`).click(), badI); await idle(); badMsg = await p.textContent('#nrInfo'); }
  // 何手か進めて、保存 → タイトル → 続きから
  for (let k = 0; k < 6; k++) await step();
  const mid = await run();
  await p.evaluate(() => document.getElementById('nrMenuBtn').click()); await p.waitForTimeout(100);
  await p.evaluate(() => document.getElementById('nrToTitle').click()); await p.waitForTimeout(200);
  const titleBest = await p.textContent('#bestNari');
  await p.click('#goNari'); await p.waitForTimeout(150);
  const contShown = await p.evaluate(() => !document.getElementById('nrContinue').hidden);
  await p.click('#nrContinue'); await idle();
  const back = await run();
  const same = JSON.stringify(back.cards) === JSON.stringify(mid.cards) && back.stock.length === mid.stock.length && back.score === mid.score;
  // 光らせない設定
  await p.evaluate(() => { document.getElementById('nrMenuBtn').click(); document.getElementById('nrHint').click(); });
  const hintOff = await p.evaluate(() => ({ label: document.getElementById('nrHint').textContent, glow: document.querySelectorAll('.nr-card.can').length, open: document.querySelectorAll('.nr-card.open').length }));
  await p.evaluate(() => { document.getElementById('nrHint').click(); document.getElementById('nrResume').click(); });
  // 最後まで
  let n = 0;
  while (n++ < 200 && await p.evaluate(() => document.getElementById('nrResOv').hidden)) { if (!(await step())) await p.waitForTimeout(400); }
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/play-result.png' });
  const res = await p.evaluate(() => ({ h: document.getElementById('nrResH').textContent, pts: document.getElementById('nrResPts').textContent, why: document.getElementById('nrResWhy').textContent }));
  const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('genso.nr.rec')));
  const runAfter = await run();
  // 同じ配りでもう一度 → はじめの峰と同じ
  await p.click('#nrResSame'); await idle();
  const again = await run();
  const reproduced = JSON.stringify(again.cards) === JSON.stringify(r0.cards) && JSON.stringify(again.hand) === JSON.stringify(r0.hand);
  // タイトルの記録
  await p.evaluate(() => { document.getElementById('nrMenuBtn').click(); document.getElementById('nrToTitle').click(); }); await p.waitForTimeout(200);
  await p.evaluate(() => localStorage.removeItem('genso.nr.run')); await p.reload(); await p.waitForTimeout(400);
  const titleRec = await p.textContent('#bestNari');
  console.log({ newPrimary, coveredMsg, badMsg, saved: !!mid, titleBest, contShown, same, hintOff, result: res, rec, runCleared: runAfter === null, reproduced, titleRec });
  console.log('screenshots:', OUT);
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
