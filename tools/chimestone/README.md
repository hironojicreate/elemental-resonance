# 鳴り石の検証の道具（内部の名前は nr）

`index.html` の中のきまり（`NRE`、`/*/NRENGINE*/` まで）を、その場で読み出して使う。ゲームを直せば、道具もそのまま新しいきまりで動く。Node と、Playwright（`require('playwright')` が動く環境）が要る。

## 早送り（手応えの調整）

```bash
node tools/chimestone/sim.js
```

腕前の違う3つのボットで、勝率・残り1〜3で詰みの割合・最長の連鎖・真理の回数・めくった数・響きを出す。

- でたらめ：押せる石から無作為に。
- 直感：対消滅があれば対消滅、なければ合成。手が空いたら、表に相手の多い石を取る。
- 読む：見えない石（覆いの下と山札）を混ぜ直して、手ごとに K 回、直感で最後まで早送りし、いちばん良い手を選ぶ（裏は覗かない）。

| 環境変数 | 意味 |
|---|---|
| `N` | でたらめ・直感の局数（既定 1000） |
| `NM` | 読むボットの局数（既定 200。遅いので少なめ） |
| `K` | 読むボットが1手ごとに試す回数（既定 8） |
| `PER` | 各元素の雫,輝石,光核の枚数（例 `PER=6,4,2`。既定はゲームと同じ 5,4,2） |
| `NRSRC` | ほかの版の index.html を読む（前後の比べ） |

## 画面の試験

```bash
node tools/chimestone/test/tutorial.js
```

```bash
node tools/chimestone/test/play.js
```

```bash
node tools/chimestone/test/flip.js
```

```bash
node tools/chimestone/test/stuck.js
```

どれも最後に `no errors`。スクリーンショットは `OUT` のフォルダへ（既定は一時フォルダ）。中身は `docs/chimestone-design.md` の7章。
