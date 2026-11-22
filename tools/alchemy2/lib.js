// 錬成の書２の検証の道具が使う、ゲーム本体（index.html）の部品。
// きまり（A2E）と顕現の表（FOES）を index.html からその場で読み出すので、ゲームと道具の数字がずれない。
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const INDEX = process.env.A2SRC || path.join(ROOT, 'index.html'); // A2SRC で、ほかの版の index.html を読める（前後の比べ）
const src = fs.readFileSync(INDEX, 'utf8');
// きまり：/*A2ENGINE*/ の直後の const A2E から /*/A2ENGINE*/ まで
const ea = src.indexOf('const A2E = (() => {'), eb = src.indexOf('/*/A2ENGINE*/');
if (ea < 0 || eb < 0) throw new Error('index.html に A2E（坩堝のきまり）が見つからない');
const A2E = new Function(`${src.slice(ea, eb)}\nreturn A2E;`)();
// 顕現の表：A2 モジュールの中の const FOES = {...};（データだけの式）
const ma = src.indexOf('const FOES = {', src.indexOf('const A2 = (() => {'));
const mb = src.indexOf('\n};', ma);
const FOES = new Function(`return ${src.slice(ma + 'const FOES = '.length, mb + 2)}`)();
// 敵の体力を一律に何倍かする（HPS=1.2 など）
const HPS = +(process.env.HPS || 1);
if (HPS !== 1) for (const k in FOES) FOES[k].hp = Math.round(FOES[k].hp * HPS);
module.exports = { A2E, FOES, ROOT, INDEX };
