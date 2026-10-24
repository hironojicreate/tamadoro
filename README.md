# タマの【けいさん】ドロップス（タマドロ）

小学校低学年向けの計算練習 WEB アプリです。たしざん・ひきざん・かけざん・百マスたしざんを解いて、ドロップを集めます。

## ローカルで動かす

画像などを `/img/...` のように「サイトのいちばん上から」の場所で読み込んでいるので、ファイルを直接開くのではなく、かんたんなサーバーで開きます。

```sh
python3 -m http.server 8765
# ブラウザで http://localhost:8765/ を開く
```

## 画面のしくみ

`index.html` 1枚のアプリです。URL の `#` のうしろで画面が切り替わります（`js/app.js`）。

| URL | 画面 |
|---|---|
| `#/` | さいしょの画面 |
| `#/add` `#/sub` `#/multi` `#/hundredgrid` | そのモードのレベル選択 → 問題 |
| `#/records` | タマのきろく（ドロップびん・カレンダー・タイムのうつりかわり・にがてマップ） |

以前の URL（`tamaadddrops.html` など）は、新しい URL へ自動で移動します。

## ファイルの場所

```
index.html              画面（さいしょ・レベル選択・問題・きろく・モーダル）
css/
  base.css              計算の画面に共通のスタイル
  home.css              さいしょの画面
  addition.css など     モードごとの違い（<html data-mode="add"> のときだけ効く）
  records.css           タマのきろく
js/
  modes/                ★ モードの定義（レベル・問題のつくり方・ドロップの色・解放の条件）
  engines/drill.js      たしざん・ひきざん・かけざんの問題の進め方
  engines/grid.js       百マスの問題の進め方
  state.js              いまのモードと問題の状態
  storage.js            保存（localStorage）の読み書き
  history.js            プレイの記録（きろく画面のため）
  records.js            タマのきろく画面
  drops.js              ドロップを投げる・ごほうび・メニューへの表示
  keypad.js             テンキー
  menu.js               レベル選択 ⇔ 問題 の切り替え、レベルの解放、rescue
  level-select.js       レベルボタンと rescue モーダルを、モードの定義からつくる
  data-modal.js         セーブ／ロード、おとな用コマンド（/rescue /delete /master on）
  tama-talk.js          タマのおしゃべり（tashizan_message.json）
  timer.js              ストップウォッチ、ベストタイム
  home.js               さいしょの画面
  app.js                画面の切り替え
js/glyphs.js            数字・記号・ひらがなの字形（tools/make_glyphs.py でつくる）
img/drops/              ドロップ（球の SVG。tools/make_drops.py でつくる）
tools/make_glyphs.py    数字・記号・ひらがなの字形をつくるスクリプト（形を直したいときに）
tools/make_drops.py     ドロップの SVG をつくるスクリプト（色を変えたいときに）
```

## よくある変更

- **レベルを追加・変更する**：`js/modes/addition.js` などの `levels` に1行足します。ボタンは自動でできます。
  ```js
  { label: 'Lv12もんだい', comment: 'こたえが20まで', drop: 'L',
    patterns: () => P.pairs(1, 9, 1, 9, (a, b) => a + b <= 20) },
  ```
- **ドロップの色を変える**：`tools/make_drops.py` の `COLORS` を変えて `python3 tools/make_drops.py`。
- **数字・記号・ひらがなの形を直す**：`tools/make_glyphs.py` の `BASE`（線の通り道）を変えて `python3 tools/make_glyphs.py`。
  字形は、教科書体の書き方のきまりに合わせて、タマドロのために一から描いたものです（フォントをなぞったものではありません）。
  あとで最終調整する点は、スクリプトの先頭に覚え書きがあります。
- **タマのセリフを変える**：`tashizan_message.json`。

## 保存データ（localStorage）

| キー | 中身 |
|---|---|
| `add_coins_3` など | レベルごとのドロップ（最新10こ）。画像名は以前のまま `/img/Lmaru.png` で記録し、表示のときに `img/drops/L.svg` にする |
| `addition_level_3_best_time` など | ベストタイム（百マスは秒、ほかはミリ秒） |
| `hundredgrid_level_3_records` など | 百マスのタイム（上位5件）・累積正答数 |
| `tamadoro.log.v1` | 1回あそぶごとの記録（いつ・レベル・時間・まちがい・ドロップ） |
| `tamadoro.stats.v1` | 1問ごとのできぐあい（にがてマップ用） |
| `tamadoro.schema` | 以前のドロップを記録に取りこんだしるし |

「データをセーブ」は localStorage をまるごと `keisan_d_月日時分.txt` に書き出します。

## テスト

`tests/` に、ブラウザを自動で動かして確かめるテストがあります（Node.js と Playwright が必要）。

```sh
cd tests
npm install
npx playwright install chromium
npm test
```
