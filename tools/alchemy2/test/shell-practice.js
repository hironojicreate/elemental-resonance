// 報酬にはじめて無垢が並んだとき：案内 → 無垢の練習（4段）→ 報酬の画面に戻る・案内が二度と出ない
// 使い方：node tools/alchemy2/test/shell-practice.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
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
    R.phase = 'reward'; R.echo = 12;
    R.reward = { name: '火の揺らぎ', kind: 'fight', echo: 12, silent: false, cards: [{ k: 'el', e: 0, t: 2 }, { k: 'pure', e: -1, t: 1 }, { k: 'light', e: -1, t: 0 }], took: null, relics: null, relicTaken: null, stat: { turns: 3, maxk: 2, dealt: 26, steals: 1, rel: 0 } };
    localStorage.setItem('genso.a2.run', JSON.stringify(R));
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2Continue'); await p.waitForTimeout(400);
  console.log('prompt shown:', !!(await p.$('#a2ShellTut')));
  await p.screenshot({ path: OUT + '/st_reward.png' });
  await p.evaluate(() => document.getElementById('a2ShellTut').click()); await p.waitForTimeout(500);
  const idle = async () => { for (let i = 0; i < 200; i++) { if (!(await p.evaluate(() => document.getElementById('a2').dataset.busy === '1'))) break; await p.waitForTimeout(80); } await p.waitForTimeout(150); };
  for (let g = 0; g < 20; g++) {
    await idle();
    const st = await p.evaluate(() => { const v = document.getElementById('a2Main').dataset.view; const c = document.getElementById('a2Coach'); return { v, ey: c && !c.hidden ? c.querySelector('.ey').textContent : '', next: !!document.getElementById('a2CoachNext'), ehp: (document.getElementById('a2EHp') || {}).textContent }; });
    if (st.v !== 'battle') { console.log('view', st.v); break; }
    console.log(st.ey, '乱れ', st.ehp);
    if (g === 2) await p.screenshot({ path: OUT + '/st_step.png' });
    if (st.next) { await p.click('#a2CoachNext'); continue; }
    await p.evaluate(() => document.querySelector('#a2Hand .al-card.tut-ok').click()); await p.waitForTimeout(100);
    await p.evaluate(() => { const c = document.querySelector('#a2Cols .a2-col.tut'); if (c) return c.click(); const f = document.querySelector('#a2Frags .a2-f.can'); if (f) f.click(); });
  }
  await p.screenshot({ path: OUT + '/st_done.png' });
  await p.evaluate(() => document.getElementById('a2TutGo').click()); await p.waitForTimeout(400);
  const back = await p.evaluate(() => ({ view: document.getElementById('a2Main').dataset.view, prompt: !!document.getElementById('a2ShellTut'), cards: document.querySelectorAll('.al-offer .al-card').length, flag: localStorage.getItem('genso.a2.shellTut') }));
  console.log('back', JSON.stringify(back));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
