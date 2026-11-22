// 器600の写しで、三幕を最後まで自動で進める（単純な操作のボット。地図・報酬・泉・市・出来事・幕の主を通す）
// 使い方：node tools/alchemy2/test/full-run.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'a2-'));
// 器を600にした写しを一時フォルダに作る（流れを最後まで通すため）
const GOD = path.join(OUT, 'godmode.html');
fs.writeFileSync(GOD, fs.readFileSync(INDEX, 'utf8').replace(/const CFG = \{ W: 5, H: 5, HAND: 5, PLAYS: 3, HP: \d+,/, 'const CFG = { W: 5, H: 5, HAND: 5, PLAYS: 3, HP: 600,'));
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS === '1';
const STATE = () => {
  const main = document.getElementById('a2Main');
  const run = JSON.parse(localStorage.getItem('genso.a2.run') || 'null');
  const [hp, maxHp] = document.getElementById('a2HpN').textContent.split('/').map(Number);
  const nm = document.querySelector('.a2-enemy .al-ename');
  return { phase: main.dataset.view, hp, maxHp, act: run && run.act, echo: run ? run.echo : 0, busy: document.getElementById('a2').dataset.busy === '1',
    plays: document.querySelectorAll('#a2Foot .al-plays i.on').length, foe: nm ? nm.firstChild.textContent : '', turn: run && run.battle ? run.battle.turn : 0,
    won: run && run.end ? run.end.won : null, by: run && run.end ? run.end.by : null, stats: run && run.stats, deckN: run ? run.deck.length : 0, relics: run ? run.relics : [] };
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + GOD);
  await p.waitForTimeout(500);
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(500);
  await p.click('#goAlchemy2'); await p.waitForTimeout(200);
  await p.click('#a2NewRun'); await p.waitForTimeout(300);
  const seen = {}; let steps = 0, shot = 0, lastPhase = '';
  const log = [];
  for (let guard = 0; guard < 4000; guard++) {
    const st = await p.evaluate(STATE);
    if (!st) { errs.push('no state hook'); break; }
    if (st.phase === 'battle' && st.turn > 25 && !log.some(l => l.startsWith('LONG'))) log.push(`LONG battle turn ${st.turn} hp ${st.hp}`);
    if (st.phase !== lastPhase) { if (st.phase === 'reward') { const t = await p.evaluate(() => { const r = JSON.parse(localStorage.getItem('genso.a2.run')); return r.reward && r.reward.stat ? r.reward.stat.turns : '?'; }); log.push(`  turns ${t}`); } log.push(`${st.phase}${st.phase === 'battle' ? ' ' + st.foe : ''} hp ${st.hp}/${st.maxHp} act ${st.act}`); lastPhase = st.phase; seen[st.phase] = (seen[st.phase] || 0) + 1; if (SHOTS && shot < 40 && (st.phase !== 'battle' || st.turn === 2)) { await p.screenshot({ path: OUT + `/run_${String(shot++).padStart(2, '0')}_${st.phase}.png` }); } }
    if (st.busy) { await p.waitForTimeout(120); continue; }
    if (st.phase === 'map') { await p.click('.al-node.reach', { force: true }); steps++; }
    else if (st.phase === 'prep') await p.click('#a2Fight', { force: true }); // 戦いの前の画面（音叉の台座）：そのまま戦う
    else if (st.phase === 'battle') {
      // 手札を順に試し、いちばん調律力の大きい列（なければ合成・取り込み、なければ混沌の上を避けた列）に落とす
      const did = st.plays <= 0 ? 'end' : 'try';
      if (did === 'end') { await p.click('#a2End', { force: true }); await p.waitForTimeout(150); continue; }
      const res = await p.evaluate(() => {
        const cards = () => [...document.querySelectorAll('#a2Hand .al-card')];
        let best = null;
        for (const c of cards()) {
          if (c.classList.contains('no') || /天秤/.test(c.getAttribute('aria-label'))) continue; // 天秤（2つ選ぶ札）はこの単純なボットでは使わない
          const i = c.dataset.hand;
          document.querySelector(`#a2Hand [data-hand="${i}"]`).click();
          document.querySelectorAll('#a2Cols [data-col]').forEach(n => { const pv = n.querySelector('.pv'); const v = pv ? (pv.classList.contains('dmg') ? 10 + parseInt(pv.textContent) : pv.classList.contains('mg') ? 6 : -5) : Math.random(); if (!best || v > best.v) best = { v, i, sel: `#a2Cols [data-col="${n.dataset.col}"]` }; });
          document.querySelectorAll('#a2Frags .a2-f.can').forEach(n => { const pv = n.querySelector('.pv'); const v = pv ? 10 + (parseInt(pv.textContent) || 3) : -2; if (!best || v > best.v) best = { v, i, sel: `#a2Frags [data-fid="${n.dataset.fid}"]` }; });
          document.querySelector(`#a2Hand [data-hand="${i}"]`).click();
        }
        if (!best) { document.getElementById('a2End').click(); return 'end'; }
        document.querySelector(`#a2Hand [data-hand="${best.i}"]`).click();
        const t = document.querySelector(best.sel); if (t) t.click(); else document.getElementById('a2End').click();
        if (document.querySelector('#a2Cols .a2-col.aim')) { const f = document.querySelector('#a2Frags .a2-f.can'); if (f) f.click(); }
        return best.v;
      });
      await p.waitForTimeout(60);
    }
    else if (st.phase === 'reward') {
      const rc = await p.$('[data-rc]:not([disabled])'); if (rc) { await rc.click({ force: true }); await p.waitForTimeout(60); }
      const tk = await p.$('[data-take]:not(.taken)'); if (tk) { await tk.click({ force: true }); await p.waitForTimeout(60); }
      await p.click('#a2Leave', { force: true });
    }
    else if (st.phase === 'rest') {
      if (await p.$('#a2Leave')) await p.click('#a2Leave', { force: true });
      else if (st.hp < st.maxHp * .7) await p.click('[data-rest="heal"]', { force: true });
      else if (await p.$('[data-rest="forge"]:not([disabled])')) { await p.click('[data-rest="forge"]', { force: true }); await p.waitForTimeout(60); await p.click('[data-forge="0"]', { force: true }); }
      else await p.click('[data-rest="heal"]', { force: true });
    }
    else if (st.phase === 'shop') {
      const buy = await p.$('[data-buy]:not(.taken)');
      if (buy && st.echo >= 60) { await buy.click({ force: true }); await p.waitForTimeout(60); }
      await p.click('#a2Leave', { force: true });
    }
    else if (st.phase === 'event') {
      if (await p.$('#a2Leave')) await p.click('#a2Leave', { force: true });
      else {
        await p.click('[data-ev="0"]', { force: true }); await p.waitForTimeout(80);
        if (!(await p.$('#a2DeckOv[hidden]'))) { const pk = await p.$('#a2DeckBody [data-pick]'); if (pk) await pk.click({ force: true }); }
      }
    }
    else if (st.phase === 'end') { log.push(`END won=${st.won} by=${st.by}`); if (SHOTS) await p.screenshot({ path: OUT + '/run_end.png' }); break; }
    await p.waitForTimeout(40);
  }
  const fin = await p.evaluate(STATE);
  console.log(log.join('\n'));
  console.log('stats', JSON.stringify(fin.stats), 'deck', fin.deckN, 'relics', fin.relics.join(','));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
