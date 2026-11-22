// はじめのチュートリアル（27段）を最後まで自動で進める。段ごとの乱れ・器・予報を出し、違う札が止められるかも確かめる。SHOTS=0 で撮らない
// 使い方：node tools/alchemy2/test/tutorial.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'a2-'));
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +(process.env.VW || 400), height: +(process.env.VH || 860) }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + INDEX);
  await p.waitForTimeout(500);
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.waitForTimeout(200);
  const primary = await p.evaluate(() => document.getElementById('a2Tutorial').className);
  console.log('tutorial button class:', primary);
  await p.click('#a2Tutorial'); await p.waitForTimeout(600);
  const busy = () => p.evaluate(() => document.getElementById('a2').dataset.busy === '1');
  const waitIdle = async () => { for (let i = 0; i < 200 && await busy(); i++) await p.waitForTimeout(80); await p.waitForTimeout(120); };
  const shot = process.env.SHOTS !== '0';
  const log = [];
  for (let g = 0; g < 80; g++) {
    await waitIdle();
    const st = await p.evaluate(() => {
      const c = document.getElementById('a2Coach');
      const view = document.getElementById('a2Main').dataset.view;
      if (view !== 'battle') return { view };
      const ey = c && !c.hidden ? c.querySelector('.ey').textContent : '';
      return { view, ey, next: !!document.getElementById('a2CoachNext'), act: !!(c && c.querySelector('.do')), text: c ? c.querySelector('p').textContent.slice(0, 40) : '',
        hp: document.getElementById('a2HpN').textContent, ehp: (document.getElementById('a2EHp') || {}).textContent, fore: document.getElementById('a2Fore').textContent };
    });
    if (st.view !== 'battle') { log.push('VIEW ' + st.view); if (shot) await p.screenshot({ path: OUT + `/tut_done.png` }); break; }
    const n = (st.ey.match(/(\d+) \//) || [])[1] || 'free';
    log.push(`${st.ey} | 器${st.hp} 乱れ${st.ehp} | ${st.fore} | ${st.text}`);
    if (shot) await p.screenshot({ path: OUT + `/tut_${String(n).padStart(2, '0')}.png` });
    if (st.next) { await p.click('#a2CoachNext'); continue; }
    if (st.text.startsWith('最後は自由に')) { // 調律力が出る手があれば打ち、なければ手番を終える
      const did = await p.evaluate(() => {
        const nCards = document.querySelectorAll('#a2Hand .al-card').length;
        for (let ci = 0; ci < nCards; ci++) {
          const c = document.querySelectorAll('#a2Hand .al-card')[ci]; if (!c || c.classList.contains('no')) continue;
          c.click(); const col = document.querySelector('#a2Cols .a2-col .pv.dmg');
          if (col) { col.closest('.a2-col').click(); if (document.querySelector('#a2Cols .a2-col.aim')) { const fs = [...document.querySelectorAll('#a2Frags .a2-f.can')]; const f = fs.find(n => /^\d/.test((n.querySelector('.pv') || {}).textContent || '')) || fs[0]; f.click(); return 'hit (aim ' + ((f.querySelector('.pv') || {}).textContent) + ')'; } return 'hit'; } document.querySelectorAll('#a2Hand .al-card')[ci].click();
        }
        const k = [...document.querySelectorAll('#a2Hand .al-card')].find(c => /火|土/.test(c.getAttribute('aria-label')));
        if (k && !document.querySelector('#a2Keep .al-card')) { k.click(); document.getElementById('a2KeepBtn').click(); }
        document.getElementById('a2End').click(); return 'end (kept ' + (k ? k.getAttribute('aria-label') : '-') + ')';
      });
      log.push('   free -> ' + did);
      continue;
    }
    // 操作の段：まず違う札を押して止められるか確かめる
    const blocked = await p.evaluate(() => { const d = document.querySelector('#a2Hand .al-card.dim'); if (!d) return 'none'; d.click(); return document.querySelector('#a2Hand .al-card.sel') ? 'NOT BLOCKED' : 'blocked'; });
    if (await p.$('#a2Cols .a2-col.aim')) { await p.evaluate(() => document.querySelector('#a2Frags .a2-f.can').click()); log.push('   -> picked partner'); continue; }
    const endBtn = await p.$('#a2End.a2-tut');
    if (endBtn) { await p.evaluate(() => document.getElementById('a2End').click()); continue; }
    await p.evaluate(() => document.querySelector('#a2Hand .al-card.tut-ok, #a2Keep .al-card.tut-ok').click()); await p.waitForTimeout(100);
    if (shot && n === '05') await p.screenshot({ path: OUT + '/tut_05_sel.png' });
    if (shot && n === '14') await p.screenshot({ path: OUT + '/tut_14_sel.png' });
    const did = await p.evaluate(() => { const c = document.querySelector('#a2Cols .a2-col.tut'); if (c) { c.click(); return 'col'; } const f = document.querySelector('#a2Frags .a2-f.can'); if (f) { f.click(); return 'frag'; } const k = document.getElementById('a2KeepBtn'); if (k && document.getElementById('a2Keep').classList.contains('can')) { k.click(); return 'keep'; } return 'nothing'; });
    log.push(`   -> wrong card ${blocked}, used ${did}`);
  }
  console.log(log.join('\n'));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
