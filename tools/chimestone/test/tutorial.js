// 鳴り石のチュートリアルを最後まで：段ごとに、決まった石を押し・めくり（めくった石が響き合って連鎖が続く）、手の石・響き・連鎖・覆いがはれた数を確かめる。
// そのあと「このまま続ける」で練習の一局を最後まで遊び、結果の画面（記録に残らない）まで。
// 使い方：node tools/chimestone/test/tutorial.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
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
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
  await p.click('#goNari'); await p.waitForTimeout(150);
  const first = await p.evaluate(() => document.getElementById('nrTutorial').classList.contains('primary'));
  await p.click('#nrTutorial'); await p.waitForTimeout(300);
  const idle = async () => { for (let i = 0; i < 80; i++) { if (!(await p.evaluate(() => document.getElementById('nr').dataset.busy === '1'))) break; await p.waitForTimeout(50); } await p.waitForTimeout(120); };
  const state = () => p.evaluate(() => ({
    step: (document.querySelector('#nrCoach .ey') || {}).textContent,
    hand: document.getElementById('nrHlbl').textContent,
    score: document.querySelector('#nrStats .pts b').textContent,
    chain: document.querySelector('#nrChain b').textContent,
    up: document.querySelectorAll('.nr-card.up').length,
    tut: [...document.querySelectorAll('.nr-card.tut')].map(n => n.dataset.i).join(',') || (document.getElementById('nrStock').classList.contains('tut') ? 'stock' : ''),
  }));
  const log = [];
  // 違う石を押しても進まない（揺れるだけ）
  await p.evaluate(() => document.querySelector('.nr-card[data-i="21"]').click()); await idle();
  const blocked = (await state()).step;
  // 段ごとに：光っている（tut）石かめくるを押す。「次へ」はそのまま
  for (let k = 0; k < 12; k++) {
    const s = await state(); log.push(s);
    if (await p.$('#nrTutNext')) { await p.click('#nrTutNext'); await idle(); continue; }
    if (await p.$('#nrTutFree')) break;
    if (s.tut === 'stock') await p.click('#nrStock');
    else if (s.tut) await p.evaluate(i => document.querySelector(`.nr-card[data-i="${i}"]`).click(), s.tut);
    else break;
    await idle();
    if (s.tut === 'stock') await p.screenshot({ path: OUT + '/tut-flip.png' });
  }
  const last = await state(); log.push(last);
  if (errs.length) console.log('errors so far:', errs.join(' / '));
  for (const s of log) console.log(`${s.step} | 手：${s.hand} | 響き ${s.score} | 連鎖 ${s.chain} | 表 ${s.up} | 目標 ${s.tut}`);
  await p.screenshot({ path: OUT + '/tut-final.png' });
  // このまま続ける：練習の一局を最後まで（光る石があれば押す、なければめくる）
  await p.click('#nrTutFree'); await idle();
  for (let k = 0; k < 200; k++) {
    if (await p.evaluate(() => !document.getElementById('nrResOv').hidden)) break;
    const c = await p.$('.nr-card.can.a') || await p.$('.nr-card.can');
    if (c) await c.click(); else if (await p.evaluate(() => !document.getElementById('nrStock').disabled)) await p.click('#nrStock'); else await p.waitForTimeout(300);
    await idle();
  }
  await p.waitForTimeout(900);
  const res = await p.evaluate(() => ({ shown: !document.getElementById('nrResOv').hidden, ey: document.getElementById('nrResEy').textContent, h: document.getElementById('nrResH').textContent, pts: document.getElementById('nrResPts').textContent, why: document.getElementById('nrResWhy').textContent }));
  const rec = await p.evaluate(() => localStorage.getItem('genso.nr.rec'));
  const done = await p.evaluate(() => localStorage.getItem('genso.nr.tutDone'));
  await p.screenshot({ path: OUT + '/tut-result.png' });
  console.log({ first, blockedStays: blocked, result: res, recordUntouched: rec === null, tutDone: done });
  console.log('screenshots:', OUT);
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
