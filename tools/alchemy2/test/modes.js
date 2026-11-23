// もとの錬成の書・試しの対局が消えていること、ほかのモード（重ね札・侵食・四方の盤・共鳴の列・クラシック）が開けること、錬成の書（内部の名前は a2）の保存・続きから・全体のあそびかた
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
  // もとの錬成の書・試しの対局は v1.102.0 で削除した：タイトルにも画面にも残っていないこと
  const gone = await p.evaluate(() => !document.getElementById('goAlchemy') && !document.getElementById('alch') && !document.getElementById('du') && !document.getElementById('alStartOv'));
  const titleName = await p.evaluate(() => document.querySelector('#goAlchemy2 .mode-name').textContent);
  // ほかのモードが開いて、タイトルへ戻れるか（重ね札・侵食・四方の盤・共鳴の列）
  const others = {};
  for (const [btn, sec] of [['goKasane', 'ks'], ['goErosion', 'er'], ['goShiho', 'sh'], ['goRetsu', 'rt']]) {
    await p.click('#' + btn); await p.waitForTimeout(300);
    const start = await p.evaluate(() => [...document.querySelectorAll('section.overlay')].find(o => !o.hidden && o.id !== 'titleOv'));
    others[btn] = await p.evaluate(() => { const o = [...document.querySelectorAll('section.overlay')].find(x => !x.hidden && x.id !== 'titleOv'); return o ? o.id : (document.querySelector('section[aria-label]:not([hidden])') || {}).id || 'none'; });
    await esc(); await p.waitForTimeout(150);
    if (await p.evaluate(() => document.getElementById('titleOv').hidden)) { await esc(); await p.waitForTimeout(150); }
  }
  // クラシック
  await p.click('#goClassic'); await p.waitForTimeout(800);
  await esc(); await p.evaluate(() => document.getElementById('pTitle').click()); await p.waitForTimeout(300);
  // 錬成の書（a2）：始めて、地図で Esc（メニュー）→ タイトルへ → 続きから
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
  // あそびかた（全体）：錬成の書の説明が新しいもの（5列×5段）だけか
  await p.evaluate(() => document.getElementById('a2ToTitle').click()); await p.waitForTimeout(300);
  await p.click('#goRules'); await p.waitForTimeout(200);
  const rulesHas = await p.evaluate(() => { const t = document.getElementById('rulesOv').textContent; return t.includes('錬成の書') && t.includes('5列×5段') && !t.includes('7マスの坩堝') && !t.includes('錬成の書２'); });
  console.log({ gone, titleName, others, menu, best, cont, back, rulesHas });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
