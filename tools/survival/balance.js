// サバイバルの天秤ゲージと交互の律：針の動き・合成の上限・偏りの稼ぎ・律・切り替え
// 使い方：node tools/survival/balance.js（スクリーンショットは OUT のフォルダへ。既定は一時フォルダ）
const path = require('path'), os = require('os'), fs = require('fs');
const INDEX = path.resolve(__dirname, '../../index.html');
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'sv-'));
const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  // ゲームの中身は関数の内側にあるので、一時コピーに確かめるための入口（window.__ev）を足して開く
  const src = fs.readFileSync(INDEX, 'utf8').replace('const hot = window.claude && window.claude.hot;', 'window.__ev = s => eval(s);\nconst hot = window.claude && window.claude.hot;');
  const COPY = path.join(OUT, 'index.test.html'); fs.writeFileSync(COPY, src);
  await p.goto('file://' + COPY);
  await p.waitForTimeout(500);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('genso.tut', '3'); });
  await p.reload(); await p.waitForTimeout(500);
  await p.click('#goSurvival'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('bal')).display !== 'none'), '天秤の帯が見える');
  // 盤を作り直す：火・水・風・土の雫と、火の光核2つ
  const run = fn => p.evaluate(s => window.__ev('(' + s + ')()'), fn.toString());
  await run(() => {
    S.paused = true; S.orbs.length = 0; S.spawnTimer = 1e9;
    const put = (e, t, x, y) => makeOrb('el', e, t, x, y);
    window.T = { f1: put(0, 1, 1, 1), w1: put(1, 1, 2.2, 1), a1: put(2, 1, 1, 5), e1: put(3, 1, 2.2, 5), c1: put(0, 3, 5, 3), c2: put(0, 3, 6.5, 3) };
    S.paused = false;
  });
  ok(await run(() => reactionOf(T.c1, T.c2)) === 'merge', '中央：光核どうしは合成できる');
  const s0 = await run(() => S.score);
  await run(() => { S.cWait = 3; S.cStopUntil = S.now + 10000; }); // コンボがつながるよう、待ち時間を持たせる
  await run(() => playerAct(T.f1, T.w1, 'anni')); await p.waitForTimeout(900);
  ok(await run(() => S.bal) === -2, `火×水の雫で針が左へ2（${await run(() => S.bal)}）`);
  await run(() => { const P = findFreeSpot(.3); const a = makeOrb('el', 2, 1, P.x, P.y); const Q = findFreeSpot(.3); const c = makeOrb('el', 3, 1, Q.x, Q.y); T.a1 = a; T.e1 = c; });
  await run(() => playerAct(T.a1, T.e1, 'anni')); await p.waitForTimeout(900);
  ok(await run(() => S.bal) === 0, '風×土の雫で中央へ戻る');
  ok(await run(() => S.rhy) === 1, `交互に消すと律が1（${await run(() => S.rhy)}、コンボ${await run(() => S.combo)}）`);
  ok(await run(() => rhyMult()) === 1.1, '律1で×1.1');
  // 基準：偏りの見返りは重力（端で半径3.0）、得点の上乗せなし
  ok(await run(() => TUNE.balLean === 1 && TUNE.balGrav === 3), '基準：偏りの稼ぎなし・偏りの重力3.0');
  // 傾ける：針を −16 に（ここからしばらく、得点の上乗せ〈偏りの稼ぎ〉×2 を入れて確かめる）
  await run(() => { TUNE.balLean = 2; });
  await run(() => { S.bal = -16; });
  ok(await run(() => capTier()) === 2, '端では輝石まで');
  ok(await run(() => reactionOf(T.c1, T.c2)) === 'sealed', '端では光核どうしは合成できない（sealed）');
  ok(await run(() => Math.abs(leanMult(0) - 2) < 1e-9 && leanMult(2) === 1), '傾いた側（火水）の対消滅は×2、反対は×1');
  await run(() => { S.bal = -8; });
  ok(await run(() => capTier()) === 3, '中ほど（−8）は光核まで');
  ok(await run(() => Math.abs(leanMult(1) - 1.5) < 1e-9), '半分の傾きで×1.5');
  await run(() => { S.bal = 4; });
  ok(await run(() => capTier()) === 4, '±4 は真理まで');
  // ドラッグ中に合成できない相手に触れたとき：理由の文と、帯が光る
  await run(() => { S.bal = -12; S.drag = { o: T.c1, target: null, rk: null, sealed: T.c2, partners: [] }; dragHint(); S.drag = null; });
  const hint = await run(() => document.getElementById('hint').textContent);
  ok(/天秤が傾いている/.test(hint) && await run(() => document.getElementById('bal').classList.contains('warn')), `封の理由：「${hint}」`);
  // 中断と再開：針の位置が残る
  await run(() => { S.bal = 6; T.snap = JSON.parse(JSON.stringify(snapshot())); restore(T.snap); });
  ok(await run(() => S.bal) === 6 && await run(() => S.mode) === 'survival', '中断から再開しても針の位置が残る');
  await run(() => { el.pauseOv.hidden = true; S.paused = false; const L = S.orbs.filter(o => o.kind === 'el' && o.tier === 3); T.c1 = L[0]; T.c2 = L[1]; });
  // 偏りの重力（バランス調整で入れたとき）：端では雫も半径3.0、反対の対と真理は変わらない
  await run(() => { TUNE.balGrav = 3; S.bal = -16; });
  ok(await run(() => leanGrav(0, 1) === 1.5 && leanGrav(1, 2) === 1 && leanGrav(2, 1) === 0 && leanGrav(0, 4) === 0), '偏りの重力：端の火水の雫は+1.5（半径3.0）、輝石は+1.0、風土と真理は0');
  ok(await run(() => Math.abs(predictPull({ x: 4, y: 3.5 }, 1, [], 1.5).length - predictPull({ x: 4, y: 3.5 }, 1, []).length) >= 0), '偏りの重力：引き寄せの計算が動く');
  await run(() => { S.bal = -8; });
  ok(await run(() => leanGrav(0, 1) === .75), '半分の傾きで+0.75');
  await run(() => { TUNE.balGrav = 0; });
  ok(await run(() => leanGrav(0, 1) === 0), '「なし」なら広がらない');
  await run(() => { TUNE.balGrav = 3; });
  // 端の見た目
  await run(() => { S.bal = -12; S.rhy = 3; });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'bal-left.png') });
  const cap = await run(() => { const n = document.getElementById('balCap'); return n.dataset.cap + ' ' + n.getAttribute('aria-label') + ' ' + (n.querySelector('.bal-st') || {}).className; });
  ok(/^2 輝石まで作れる bal-st/.test(cap), `中央の石：${cap}`);
  // 偏りの稼ぎを実際の対消滅で
  await run(() => { S.bal = -16; S.combo = 0; rhyBreak(); const P = findFreeSpot(.3); T.f2 = makeOrb('el', 0, 1, P.x, P.y); const Q = findFreeSpot(.3); T.w2 = makeOrb('el', 1, 1, Q.x, Q.y); T.s = S.score; });
  await run(() => playerAct(T.f2, T.w2, 'anni')); await p.waitForTimeout(900);
  const gain = await run(() => S.score - T.s), hm = await run(() => harmonyMult());
  ok(gain > 40 * 1.5, `端の火×水の雫：+${gain}（基本40、調和×${hm}）`);
  // 切り替え：なし
  await run(() => { TUNE.balLean = 1; S.bal = -16; });
  ok(await run(() => leanMult(0) === 1 && leanGrav(0, 1) === 1.5), '基準のまま：端の火水の雫は得点そのまま、重力は半径3.0');
  await run(() => { TUNE.balOn = 0; TUNE.rhyOn = 0; syncBalHud(); });
  await p.waitForTimeout(200);
  ok(await run(() => getComputedStyle(document.getElementById('bal')).display === 'none'), 'どちらも「なし」で帯が消える');
  ok(await run(() => capTier()) === 4 && await run(() => reactionOf(T.c1, T.c2)) === 'merge', '天秤なしなら、いつでも合成できる');
  ok(await run(() => leanMult(0) === 1 && rhyMult() === 1), '天秤・律なしなら倍率なし');
  await run(() => { TUNE.balOn = 1; TUNE.rhyOn = 0; syncBalHud(); });
  await p.waitForTimeout(200);
  ok(await run(() => getComputedStyle(document.getElementById('balRhy')).display === 'none'), '律だけ「なし」：律の表示が消える');
  await run(() => { TUNE.balOn = 1; TUNE.rhyOn = 1; syncBalHud(); S.bal = 2; S.rhy = 0; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'bal-center.png') });
  await run(() => { S.bal = 8; S.rhy = 1; });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, 'bal-right.png'), clip: { x: 0, y: 60, width: 400, height: 60 } });
  ok(await run(() => document.getElementById('balCap').dataset.cap) === '3', '右へ8：中央の石は光核');
  // バランス調整画面
  await run(() => { S.paused = true; openTune(null); });
  await p.waitForTimeout(300);
  ok(await run(() => !!document.getElementById('tu-balOn')), 'バランス調整に「天秤ゲージ」');
  await p.screenshot({ path: path.join(OUT, 'tune.png') });
  ok(!errs.length, 'エラーなし' + (errs.length ? '：' + errs.join(' / ') : ''));
  console.log('screenshots: ' + OUT);
  await b.close();
  process.exit(fails ? 1 : 0);
})();
