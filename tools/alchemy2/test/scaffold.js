// 無垢〈足場〉：列に置く → 上に水 → 横の対消滅の衝撃で足場が割れ、落ちた水が〈共鳴〉
// 使い方：node tools/alchemy2/test/scaffold.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
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
    R.battle = { kind: 'fight', key: 'awa', en: { hp: 30, max: 30, step: 1, ph: 1 },
      S: { cols: [[f(900, 0, 'foe')], [], [f(901, 2, 'foe')], [], []], nid: 910, salt: 1 },
      draw: [c(1, 'el', 0, 1), c(2, 'el', 1, 1), c(3, 'el', 2, 1)], disc: [],
      hand: [c(10, 'pure', -1, 1), c(11, 'el', 1, 1), c(12, 'el', 3, 1), c(13, 'el', 2, 1), c(14, 'el', 0, 1)], plays: 3, turn: 2, bell: false, shellUsed: 0, keep: [],
      intents: [[{ k: 'el', e: 1, t: 1, pers: 'even' }], [{ k: 'el', e: 3, t: 1, pers: 'even' }]], st: { maxk: 0, dealt: 0, rel: 0, steals: 0 } };
    localStorage.setItem('genso.a2.run', JSON.stringify(R));
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2Continue'); await p.waitForTimeout(500);
  const idle = async () => { for (let i = 0; i < 60; i++) { if (!(await p.evaluate(() => document.getElementById('a2').dataset.busy === '1'))) break; await p.waitForTimeout(100); } await p.waitForTimeout(200); };
  const board = () => p.evaluate(() => [...document.querySelectorAll('#a2Frags .a2-f')].map(n => `${n.getAttribute('aria-label')}@${n.style.getPropertyValue('--c')},${n.style.getPropertyValue('--i')}${n.querySelector('.shl') ? '[' + n.querySelector('.shl').textContent + ']' : ''}`).join(' '));
  const st = () => p.evaluate(() => document.getElementById('a2EHp').textContent + ' 手数' + document.querySelectorAll('#a2Foot .al-plays i.on').length);
  const card = nm => p.evaluate(nm => [...document.querySelectorAll('#a2Hand .al-card')].find(x => x.getAttribute('aria-label') === nm).click(), nm);
  await card('無垢の雫'); await p.waitForTimeout(100);
  console.log('info:', await p.textContent('#a2Info'));
  console.log('cols:', await p.evaluate(() => [...document.querySelectorAll('#a2Cols .a2-col')].map(n => (n.dataset.col || 'x') + ':' + ((n.querySelector('.pv') || {}).textContent || '')).join(' ')));
  await p.evaluate(() => document.querySelector('#a2Cols [data-col="1"]').click()); await idle();
  console.log('after scaffold:', await board(), '|', await st());
  await card('水の雫'); await p.waitForTimeout(100);
  await p.evaluate(() => document.querySelector('#a2Cols [data-col="1"]').click()); await idle();
  console.log('water on scaffold:', await board(), '|', await st());
  await p.screenshot({ path: OUT + '/s1_stack.png' });
  await card('土の雫'); await p.waitForTimeout(100);
  console.log('earth col3 preview:', await p.evaluate(() => (document.querySelector('#a2Cols [data-col="2"] .pv') || {}).textContent));
  await p.evaluate(() => document.querySelector('#a2Cols [data-col="2"]').click()); await idle();
  console.log('after break:', await board(), '|', await st());
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
