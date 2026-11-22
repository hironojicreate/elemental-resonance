// 〈残す〉1枚：残して手番を終える → 次の手番に持ち越し、合わせて5枚。戻す
// 使い方：node tools/alchemy2/test/keep.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'a2-'));
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +(process.env.VW || 400), height: +(process.env.VH || 860) } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + INDEX); await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.click('#goAlchemy2'); await p.click('#a2NewRun'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.al-node.reach').click());
  const idle = async () => { for (let i = 0; i < 100; i++) { if (!(await p.evaluate(() => document.getElementById('a2').dataset.busy === '1'))) break; await p.waitForTimeout(100); } await p.waitForTimeout(200); };
  await idle();
  const tag = process.env.VW || '400';
  await p.screenshot({ path: OUT + `/k_${tag}_0.png` });
  const hand = () => p.evaluate(() => ({ mid: [...document.querySelectorAll('#a2Hand .al-card')].map(c => c.getAttribute('aria-label')), keep: [...document.querySelectorAll('#a2Keep .al-card')].map(c => c.getAttribute('aria-label')) }));
  // 1枚目を選んで〈残す〉へ
  await p.evaluate(() => document.querySelector('#a2Hand .al-card').click()); await p.waitForTimeout(150);
  await p.screenshot({ path: OUT + `/k_${tag}_1sel.png` });
  await p.evaluate(() => document.getElementById('a2KeepBtn').click()); await p.waitForTimeout(150);
  const h1 = await hand(); console.log('kept', JSON.stringify(h1));
  await p.screenshot({ path: OUT + `/k_${tag}_2kept.png` });
  // 手番を終える → 次の手番：残した札があるか、合わせて5枚か
  await p.evaluate(() => document.getElementById('a2End').click()); await idle(); await p.waitForTimeout(300); await idle();
  const h2 = await hand(); console.log('next turn', JSON.stringify(h2), 'total', h2.mid.length + h2.keep.length);
  // 残した札を戻す
  await p.evaluate(() => document.getElementById('a2KeepBtn').click()); await p.waitForTimeout(150);
  const h3 = await hand(); console.log('returned', JSON.stringify(h3));
  await p.screenshot({ path: OUT + `/k_${tag}_3.png` });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
