// ほかのモード（錬成の書・試しの対局・クラシック）が開けるか、錬成の書２の保存・続きから・全体のあそびかた
// 使い方：node tools/alchemy2/test/modes.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'a2-'));
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + INDEX);
  await p.waitForTimeout(600);
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(500);
  const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(150); };
  // 錬成の書（もとのモード）：チュートリアル
  await p.click('#goAlchemy'); await p.waitForTimeout(200);
  await p.click('#alTutorial'); await p.waitForTimeout(900);
  const alOk = await p.evaluate(() => !document.getElementById('alch').hidden);
  await p.evaluate(() => { document.getElementById('alMenuBtn').click(); }); await p.waitForTimeout(100);
  await p.evaluate(() => { document.getElementById('alToTitle').click(); }); await p.waitForTimeout(300);
  // 試しの対局
  await p.click('#goAlchemy'); await p.waitForTimeout(200);
  await p.click('#duOpen'); await p.waitForTimeout(200);
  await p.click('#duGo'); await p.waitForTimeout(800);
  const duOk = await p.evaluate(() => !document.getElementById('du').hidden);
  await p.evaluate(() => { document.getElementById('duMenuBtn').click(); }); await p.waitForTimeout(100);
  await p.evaluate(() => { document.getElementById('duToTitle').click(); }); await p.waitForTimeout(300);
  // クラシック
  await p.click('#goClassic'); await p.waitForTimeout(800);
  await esc(); await p.evaluate(() => document.getElementById('pTitle').click()); await p.waitForTimeout(300);
  // 錬成の書２：始めて、地図で Esc（メニュー）→ タイトルへ → 続きから
  await p.click('#goAlchemy2'); await p.waitForTimeout(200);
  await p.click('#a2NewRun'); await p.waitForTimeout(300);
  await esc();
  const menu = await p.evaluate(() => !document.getElementById('a2MenuOv').hidden);
  await p.evaluate(() => document.getElementById('a2ToTitle').click()); await p.waitForTimeout(300);
  const best = await p.textContent('#bestAlchemy2');
  await p.click('#goAlchemy2'); await p.waitForTimeout(200);
  const cont = await p.evaluate(() => !document.getElementById('a2Continue').hidden);
  await p.click('#a2Continue'); await p.waitForTimeout(300);
  const back = await p.evaluate(() => document.getElementById('a2Main').dataset.view);
  // あそびかた（全体）に錬成の書２の説明があるか
  await p.evaluate(() => document.getElementById('a2ToTitle').click()); await p.waitForTimeout(300);
  await p.click('#goRules'); await p.waitForTimeout(200);
  const rulesHas = await p.evaluate(() => document.getElementById('rulesOv').textContent.includes('錬成の書２'));
  console.log({ alOk, duOk, menu, best, cont, back, rulesHas });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
