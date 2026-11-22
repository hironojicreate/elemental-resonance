// 〈長き余韻〉で3枚まで残す・いっぱいなら入れ替え・1枚戻す・全戻し・古い保存（1枚の形）を読む
// 使い方：node tools/alchemy2/test/keep3.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'a2-'));
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const tag = process.env.VW || '400';
  const p = await b.newPage({ viewport: { width: +(process.env.VW || 400), height: +(process.env.VH || 860) } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + INDEX); await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2NewRun'); await p.waitForTimeout(300);
  await p.evaluate(() => {
    const R = JSON.parse(localStorage.getItem('genso.a2.run'));
    R.relics = ['linger3'];
    R.phase = 'battle';
    const c = (id, k, e, t) => ({ id, k, e, t });
    R.battle = { kind: 'fight', key: 'hiyura', en: { hp: 26, max: 26, step: 1, ph: 1 }, S: { cols: [[{ id: 900, k: 'el', e: 0, t: 1, own: 'foe' }], [], [], [], []], nid: 901, salt: 1 },
      draw: [c(1, 'el', 0, 1), c(2, 'el', 1, 1), c(3, 'el', 2, 1), c(4, 'el', 3, 1), c(5, 'el', 0, 2), c(6, 'el', 1, 2)], disc: [],
      hand: [c(10, 'light', -1, 0), c(11, 'el', 1, 2), c(12, 'pure', -1, 1), c(13, 'el', 3, 1), c(14, 'dark', -1, 0)], plays: 3, turn: 2, bell: false, shellUsed: 0, keep: 99,
      intents: [[{ k: 'el', e: 2, t: 1, pers: 'even' }], [{ k: 'el', e: 0, t: 1, pers: 'even' }]], st: { maxk: 0, dealt: 0, rel: 0, steals: 0 } };
    localStorage.setItem('genso.a2.run', JSON.stringify(R));
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2Continue'); await p.waitForTimeout(600);
  const idle = async () => { for (let i = 0; i < 100; i++) { if (!(await p.evaluate(() => document.getElementById('a2').dataset.busy === '1'))) break; await p.waitForTimeout(100); } await p.waitForTimeout(200); };
  const state = () => p.evaluate(() => ({ mid: [...document.querySelectorAll('#a2Hand .al-card')].map(c => c.getAttribute('aria-label')), keep: [...document.querySelectorAll('#a2Keep [data-hand]')].map(c => c.getAttribute('aria-label')), cap: document.getElementById('a2KeepBtn').textContent }));
  const keepCard = nm => p.evaluate(nm => { [...document.querySelectorAll('#a2Hand .al-card')].find(x => x.getAttribute('aria-label') === nm).click(); document.getElementById('a2KeepBtn').click(); }, nm);
  console.log('start', JSON.stringify(await state()));
  await keepCard('光'); await keepCard('水の輝石');
  await p.evaluate(() => document.querySelector('#a2Hand .al-card[aria-label="無垢の雫"]').click()); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + `/k3_${tag}_sel.png` });
  await p.evaluate(() => document.getElementById('a2KeepBtn').click());
  console.log('kept 3', JSON.stringify(await state()));
  await keepCard('土の雫'); // いっぱい → いちばん先の光と入れ替え
  console.log('swap', JSON.stringify(await state()));
  await p.screenshot({ path: OUT + `/k3_${tag}_full.png` });
  await p.evaluate(() => document.getElementById('a2End').click()); await idle(); await p.waitForTimeout(300); await idle();
  const n = await state(); console.log('next turn', JSON.stringify(n), 'total', n.mid.length + n.keep.length);
  await p.screenshot({ path: OUT + `/k3_${tag}_next.png` });
  await p.evaluate(() => { document.querySelector('#a2Keep [data-hand]').click(); }); await p.waitForTimeout(100);
  await p.evaluate(() => document.getElementById('a2KeepBtn').click());
  console.log('return one', JSON.stringify(await state()));
  await p.evaluate(() => document.getElementById('a2KeepBtn').click());
  console.log('return all', JSON.stringify(await state()));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
