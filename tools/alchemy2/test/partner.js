// 反応させる相手を選ぶ：青と青の間に水 → ⇆ → 右の青を選ぶ → 置いた側に輝石が残る
// 使い方：node tools/alchemy2/test/partner.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'a2-'));
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + INDEX); await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2NewRun'); await p.waitForTimeout(300);
  await p.evaluate(() => {
    const R = JSON.parse(localStorage.getItem('genso.a2.run'));
    R.phase = 'battle';
    const f = (id, e, own) => ({ id, k: 'el', e, t: 1, own });
    const c = (id, k, e, t) => ({ id, k, e, t });
    R.battle = { kind: 'fight', key: 'awa', en: { hp: 28, max: 28, step: 1, ph: 1 },
      S: { cols: [[f(900, 1, 'foe')], [], [f(901, 1, 'foe')], [], [f(902, 2, 'foe'), f(903, 1, 'foe')]], nid: 910, salt: 1 },
      draw: [c(1, 'el', 0, 1), c(2, 'el', 1, 1), c(3, 'el', 2, 1)], disc: [],
      hand: [c(10, 'el', 2, 1), c(11, 'el', 0, 1), c(12, 'el', 1, 1), c(13, 'el', 2, 1), c(14, 'el', 1, 1)], plays: 3, turn: 2, bell: false, shellUsed: 0, keep: [],
      intents: [[{ k: 'el', e: 1, t: 1, pers: 'even' }], [{ k: 'el', e: 3, t: 1, pers: 'even' }]], st: { maxk: 0, dealt: 0, rel: 0, steals: 0 } };
    localStorage.setItem('genso.a2.run', JSON.stringify(R));
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2Continue'); await p.waitForTimeout(500);
  const board = () => p.evaluate(() => [...document.querySelectorAll('#a2Frags .a2-f')].map(n => `${n.getAttribute('aria-label')}@${n.style.getPropertyValue('--c')},${n.style.getPropertyValue('--i')}`).join(' '));
  await p.evaluate(() => document.querySelector('#a2Hand .al-card[aria-label="水の雫"]').click()); await p.waitForTimeout(150);
  const badge = await p.evaluate(() => { const n = document.querySelector('#a2Cols [data-col="1"] .pv'); return n ? n.textContent : '-'; });
  console.log('col2 badge:', badge);
  await p.screenshot({ path: OUT + '/c1_select.png' });
  await p.evaluate(() => document.querySelector('#a2Cols [data-col="1"]').click()); await p.waitForTimeout(150);
  const aim = await p.evaluate(() => [...document.querySelectorAll('#a2Frags .a2-f.can')].map(n => n.getAttribute('aria-label') + '@' + n.style.getPropertyValue('--c') + ' ' + (n.querySelector('.pv') || {}).textContent));
  console.log('aim targets:', JSON.stringify(aim), 'info:', await p.textContent('#a2Info'));
  await p.screenshot({ path: OUT + '/c2_aim.png' });
  // 右の青（3列目＝--c 2）を選ぶ
  await p.evaluate(() => [...document.querySelectorAll('#a2Frags .a2-f.can')].find(n => n.style.getPropertyValue('--c') === '2').click());
  for (let i = 0; i < 40; i++) { if (!(await p.evaluate(() => document.getElementById('a2').dataset.busy === '1'))) break; await p.waitForTimeout(100); }
  await p.waitForTimeout(200);
  console.log('after:', await board());
  await p.screenshot({ path: OUT + '/c3_after.png' });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
