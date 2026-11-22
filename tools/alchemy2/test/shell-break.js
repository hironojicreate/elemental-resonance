// 無垢の練習の最後の一手を、ふつうの速さで撮る（対消滅 → 衝撃波 → 殻が割れる → 落ちる → 目覚め → 共鳴の順）
// 使い方：node tools/alchemy2/test/shell-break.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
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
    R.phase = 'reward';
    R.reward = { name: '火の揺らぎ', kind: 'fight', echo: 12, silent: false, cards: [{ k: 'pure', e: -1, t: 1 }], took: null, relics: null, relicTaken: null, stat: { turns: 3, maxk: 2, dealt: 26, steals: 1, rel: 0 } };
    localStorage.setItem('genso.a2.run', JSON.stringify(R));
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2Continue'); await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('a2ShellTut').click()); await p.waitForTimeout(600);
  const idle = async () => { for (let i = 0; i < 200; i++) { if (!(await p.evaluate(() => document.getElementById('a2').dataset.busy === '1'))) break; await p.waitForTimeout(80); } await p.waitForTimeout(250); };
  const t0s = [];
  for (let g = 0; g < 4; g++) {
    await idle();
    if (await p.$('#a2CoachNext')) { await p.click('#a2CoachNext'); continue; }
    await p.evaluate(() => document.querySelector('#a2Hand .al-card.tut-ok').click()); await p.waitForTimeout(120);
    const last = await p.evaluate(() => !!document.querySelector('#a2Cols .a2-col.tut[data-col="1"]'));
    await p.evaluate(() => { const c = document.querySelector('#a2Cols .a2-col.tut'); if (c) return c.click(); const f = document.querySelector('#a2Frags .a2-f.can'); if (f) f.click(); });
    if (last) {
      const t0 = Date.now(), log = [];
      for (let k = 0; k < 24; k++) {
        await p.waitForTimeout(170);
        const st = await p.evaluate(() => [...document.querySelectorAll('#a2Frags .a2-f')].map(n => n.className.replace(/a2-f |own|foe|t1/g, '').trim()).join(' | ') + ' || ' + [...document.querySelectorAll('.a2-float')].map(n => n.textContent).join(','));
        log.push(`${Date.now() - t0}ms ${st}`);
        if ([2, 4, 6, 8, 10, 12].includes(k)) await p.screenshot({ path: OUT + `/sh_${String(k).padStart(2, '0')}.png`, clip: { x: 0, y: 150, width: 400, height: 380 } });
      }
      console.log(log.join('\n'));
    }
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
