// 器への傷の演出（蝕み・撃の光が器へ飛ぶ）を撮る
// 使い方：node tools/alchemy2/test/hurt.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'a2-'));
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + INDEX); await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2NewRun'); await p.waitForTimeout(300);
  await p.evaluate(() => {
    const R = JSON.parse(localStorage.getItem('genso.a2.run'));
    let id = 500; const f = (e, t, own, sh) => ({ id: id++, k: 'el', e, t, own, ...(sh ? { sh } : {}) });
    R.phase = 'battle';
    R.battle = { kind: 'elite', key: 'hoshi', en: { hp: 90, max: 95, step: 0, ph: 1 },
      S: { cols: [[f(0, 2, 'foe'), f(2, 1, 'foe')], [f(3, 1, 'you', 1)], [f(1, 3, 'foe')], [f(0, 1, 'foe', 2), f(2, 1, 'foe')], []], nid: 900, salt: 1 },
      draw: [{ id: 1, k: 'el', e: 0, t: 1 }, { id: 2, k: 'el', e: 1, t: 1 }, { id: 3, k: 'el', e: 2, t: 1 }, { id: 4, k: 'el', e: 3, t: 1 }, { id: 5, k: 'el', e: 0, t: 1 }], disc: [],
      hand: [{ id: 10, k: 'el', e: 3, t: 1 }], plays: 0, turn: 2, bell: false, shellUsed: 0,
      intents: [[{ k: 'el', e: 3, t: 1, pers: 'heavy' }, { strike: 3 }], [{ k: 'el', e: 0, t: 2, pers: 'heavy' }]],
      st: { maxk: 0, dealt: 0, rel: 0, steals: 0 } };
    localStorage.setItem('genso.a2.run', JSON.stringify(R));
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2Continue'); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '/h0_before.png' });
  await p.evaluate(() => document.getElementById('a2End').click());
  const t0 = Date.now();
  for (const ms of [520, 700, 950, 1250, 1900, 2300]) { await p.waitForTimeout(ms - (Date.now() - t0)); await p.screenshot({ path: OUT + `/h_${ms}.png` }); }
  await p.waitForTimeout(1500);
  const hp = await p.evaluate(() => document.getElementById('a2VN').textContent + ' top-hidden=' + (getComputedStyle(document.getElementById('a2Hp')).display === 'none'));
  console.log('vessel', hp);
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
