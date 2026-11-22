// 〈先見の眼〉〈書の栞〉：見えている次の札が次の手札になる・栞で1枚を山札の底へ
// 使い方：node tools/alchemy2/test/eye.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
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
    R.phase = 'battle'; R.relics = ['bookmark']; R.equip = ['bookmark']; // 台座に付けた音叉だけが鳴る
    const c = (id, k, e, t) => ({ id, k, e, t });
    // 山札は末尾から引く：次に引くのは 光 → 火 → 水 → 風 → 土、その下に 火の輝石
    R.battle = { kind: 'fight', key: 'awa', en: { hp: 30, max: 30, step: 1, ph: 1 }, S: { cols: [[], [], [], [], []], nid: 910, salt: 1 },
      draw: [c(6, 'el', 0, 2), c(5, 'el', 3, 1), c(4, 'el', 2, 1), c(3, 'el', 1, 1), c(2, 'el', 0, 1), c(1, 'light', -1, 0)], disc: [],
      hand: [c(10, 'el', 1, 1), c(11, 'el', 0, 1), c(12, 'el', 2, 1), c(13, 'el', 3, 1), c(14, 'dark', -1, 0)], plays: 3, turn: 2, bell: false, shellUsed: 0, keep: [],
      intents: [[{ k: 'el', e: 1, t: 1, pers: 'even' }], [{ k: 'el', e: 3, t: 1, pers: 'even' }]], st: { maxk: 0, dealt: 0, rel: 0, steals: 0 } };
    localStorage.setItem('genso.a2.run', JSON.stringify(R));
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2Continue'); await p.waitForTimeout(500);
  const nx = () => p.evaluate(() => [...document.querySelectorAll('.a2-next .a2-nx')].map(n => n.getAttribute('aria-label').replace(/（.*/, '')).join(',') + ' ' + ((document.querySelector('.a2-next small') || {}).textContent || ''));
  console.log('next draws:', await nx());
  await p.screenshot({ path: OUT + '/eye1.png' });
  await p.evaluate(() => document.querySelector('.a2-next .a2-nx[data-bury="0"]').click()); await p.waitForTimeout(150); // 光を底へ
  console.log('after bury:', await nx());
  await p.evaluate(() => document.getElementById('a2End').click());
  for (let i = 0; i < 60; i++) { if (!(await p.evaluate(() => document.getElementById('a2').dataset.busy === '1'))) break; await p.waitForTimeout(100); }
  await p.waitForTimeout(300);
  const hand = await p.evaluate(() => [...document.querySelectorAll('#a2Hand .al-card')].map(n => n.getAttribute('aria-label')).join(','));
  console.log('next hand:', hand);
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
