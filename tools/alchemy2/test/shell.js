// 無垢〈包む〉：包む（手数を使わない）→ 殻の上に水（反応しない）→ 横の対消滅で殻が割れて〈共鳴〉
// 使い方：node tools/alchemy2/test/shell.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
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
    let id = 500; const f = (e, own) => ({ id: id++, k: 'el', e, t: 1, own });
    R.phase = 'battle';
    R.battle = { kind: 'fight', key: 'hiyura', en: { hp: 26, max: 26, step: 1, ph: 1 },
      S: { cols: [[f(0, 'foe')], [f(2, 'foe')], [], [], []], nid: 900, salt: 1 },
      draw: [{ id: 1, k: 'el', e: 0, t: 1 }], disc: [],
      hand: [{ id: 10, k: 'pure', e: -1, t: 1 }, { id: 11, k: 'el', e: 1, t: 1 }, { id: 12, k: 'el', e: 3, t: 1 }, { id: 13, k: 'dark', e: -1, t: 0 }, { id: 14, k: 'el', e: 2, t: 1 }],
      plays: 3, turn: 2, bell: false, shellUsed: 0,
      intents: [[{ k: 'el', e: 0, t: 1, pers: 'even' }, { k: 'el', e: 2, t: 1, pers: 'even' }], [{ k: 'el', e: 0, t: 2, pers: 'even' }]],
      st: { maxk: 0, dealt: 0, rel: 0, steals: 0 } };
    localStorage.setItem('genso.a2.run', JSON.stringify(R));
  });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2Continue'); await p.waitForTimeout(500);
  const idle = async () => { for (let i = 0; i < 100; i++) { if (!(await p.evaluate(() => document.getElementById('a2').dataset.busy === '1'))) break; await p.waitForTimeout(80); } await p.waitForTimeout(150); };
  const hp = () => p.evaluate(() => document.getElementById('a2EHp').textContent + ' 手数' + document.querySelectorAll('#a2Foot .al-plays i.on').length);
  const card = nm => p.evaluate(nm => [...document.querySelectorAll('#a2Hand .al-card')].find(x => x.getAttribute('aria-label') === nm).click(), nm);
  // 1) 無垢で列1の混沌の火を包む
  await card('無垢の雫'); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/ui1_select.png' });
  await p.evaluate(() => document.querySelector('#a2Frags .a2-f.can').click()); await idle();
  console.log('after wrap', await hp());
  // 2) 水を列1へ（殻の火の上）：反応しない
  await card('水の雫'); await p.waitForTimeout(100);
  const pv = await p.evaluate(() => [...document.querySelectorAll('#a2Cols [data-col]')].map(n => n.dataset.col + ':' + (n.querySelector('.pv') ? n.querySelector('.pv').textContent : '-')).join(' '));
  console.log('water preview', pv);
  await p.evaluate(() => document.querySelector('#a2Cols [data-col="0"]').click()); await idle();
  console.log('after water on shell', await hp());
  await p.screenshot({ path: OUT + '/ui2_stacked.png' });
  // 3) 土を列2へ（混沌の風の上）：風と対消滅 → 衝撃で殻が割れる → 火が上の水と共鳴
  await card('土の雫'); await p.waitForTimeout(100);
  const pv2 = await p.evaluate(() => document.querySelector('#a2Cols [data-col="1"] .pv') ? document.querySelector('#a2Cols [data-col="1"] .pv').textContent : '-');
  console.log('earth preview col2', pv2);
  await p.evaluate(() => document.querySelector('#a2Cols [data-col="1"]').click()); await idle();
  console.log('after break', await hp());
  await p.screenshot({ path: OUT + '/ui3_after.png' });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
