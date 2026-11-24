// 鳴り石の光と闇（KNOB.ld）：光核どうしの対消滅で、火と水なら光・風と土なら闇が宿る。光〈昇華〉は手の石を一段上げ（光核なら真理）、
// 闇〈反転〉は反対の元素に（連鎖は変わらない）。山札が尽きても光があれば詰みにならない。ノブを切った版（NRSRC_OFF。省けば
// 一時フォルダに作る）では、置き場・あそびかたの節が隠れ、光核の対消滅でも何も宿らない。
// 使い方：node tools/chimestone/test/light.js
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../../index.html');
let OFF = process.env.NRSRC_OFF;
if (!OFF) { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-off-')); OFF = path.join(d, 'index.html'); fs.writeFileSync(OFF, fs.readFileSync(INDEX, 'utf8').replace('const KNOB = { ld: true }', 'const KNOB = { ld: false }')); }
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const idle = async () => { await p.waitForTimeout(60); for (let i = 0; i < 100; i++) { if (!(await p.evaluate(() => document.getElementById('nr').dataset.busy === '1'))) break; await p.waitForTimeout(50); } await p.waitForTimeout(80); };
  // 峰（いちばん下の段だけ）と手・山札・光闇の数を決めて「続きから」
  const setup = async (file, cards, hand, stock, L, D) => {
    await p.goto('file://' + file); await p.waitForTimeout(300);
    await p.evaluate(([cards, hand, stock, L, D]) => {
      localStorage.clear(); localStorage.setItem('genso.nr.tutDone', 'true');
      const cs = Array(29).fill(null); let id = 1; for (const k in cards) cs[k] = { id: id++, e: cards[k][0], t: cards[k][1] };
      const G = { v: 1, mode: 'run', seed: 1, rs: 1, nid: 90, cards: cs, stock: stock.map(c => ({ id: id++, e: c[0], t: c[1] })), hand: hand ? { id: 80, e: hand[0], t: hand[1] } : null, chain: 2, score: 0, L, D, phase: 'play', result: null, st: { merge: 0, anni: 0, picks: 0, flips: 0, flipHit: 0, truths: 0, calm: 0, maxChain: 2 } };
      localStorage.setItem('genso.nr.run', JSON.stringify(G));
    }, [cards, hand, stock, L, D]);
    await p.reload(); await p.waitForTimeout(300); await p.click('#goNari'); await p.click('#nrContinue'); await idle();
  };
  const look = () => p.evaluate(() => ({
    hand: document.getElementById('nrHlbl').textContent, chain: document.querySelector('#nrChain b').textContent,
    tools: ['nrToolL', 'nrToolD'].map(id => { const b = document.getElementById(id); return b.hidden ? '-' : b.querySelector('b').textContent + (b.classList.contains('hot') ? '*' : ''); }).join('/'),
    left: document.querySelectorAll('.nr-card').length, info: document.getElementById('nrInfo').textContent, res: document.getElementById('nrResOv').hidden ? '' : document.getElementById('nrResH').textContent,
  }));
  const tap = async i => { await p.evaluate(i => document.querySelector(`.nr-card[data-i="${i}"]`).click(), i); await idle(); };
  const out = {};
  // ① 手は火の光核、表に水の光核 → 対消滅で光が宿る
  await setup(INDEX, { 20: [1, 3], 21: [3, 3], 22: [2, 1] }, [0, 3], [[2, 1]], 0, 0);
  await tap(20); out.gainLight = await look();
  // ② そのまま土の光核を手に取る（相手がないので光が脈打つ）→ 光を使えば真理（風の石が静まる）
  await tap(21); out.pickCore = await look();
  await p.click('#nrToolL'); await idle(); out.lightTruth = await look();
  // ③ 手は風の光核、表に土の光核 → 対消滅で闇が宿る
  await setup(INDEX, { 20: [3, 3], 21: [0, 1] }, [2, 3], [[1, 1]], 0, 0);
  await tap(20); out.gainDark = await look();
  // ④ 闇：手は火の光核、表に水の光核と風の雫 → 闇が脈打つ → 反転して水の光核と合成 → 真理（火の石が静まる…表に火はない）
  await setup(INDEX, { 20: [1, 3], 21: [2, 1], 22: [0, 2] }, [0, 3], [[2, 1]], 0, 1);
  out.darkBefore = await look();
  await p.click('#nrToolD'); await idle(); out.darkFlipped = await look();
  await tap(20); out.darkTruth = await look();
  // ⑤ 光で一段：手は風の雫、表は土の輝石だけ、山札なし。光があるので詰みにならない → 光で風の輝石 → 土の輝石と対消滅
  await setup(INDEX, { 20: [3, 2], 21: [1, 1] }, [2, 1], [], 1, 0);
  out.stuckWithLight = await look();
  await p.click('#nrToolL'); await idle(); out.afterLight = await look();
  // ⑥ 持っていない闇を押す → 宿り方の案内
  await p.click('#nrToolD'); await p.waitForTimeout(150); out.noDark = (await look()).info;
  // ⑦ ノブを切った版：置き場とあそびかたの節が隠れ、光核の対消滅でも何も宿らない
  await setup(OFF, { 20: [1, 3], 21: [3, 3], 22: [2, 1] }, [0, 3], [[2, 1]], 0, 0);
  await tap(20); out.off = await look();
  out.offRulesHidden = await p.evaluate(() => [...document.querySelectorAll('[data-nr-ld]')].every(n => n.hidden));
  for (const k in out) console.log(k, JSON.stringify(out[k]));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
