# タマドロ コードレビューとリファクタリング計画

対象：`704dea8 たまどろのスタート` 時点の全ファイル（HTML 5本 / JS 9本 / CSS 5本 / JSON 2本 / 画像・音声）

## 進み具合

- [x] **第1段階（準備）**：背景画像の WebP 化（約12.4MB → 約0.2MB）、2章のバグ 1〜13・17 を修正、テンキー処理3関数を1つに統合
- [x] **第2段階（共通化）**：CSS を `css/base.css`＋モード別の差分に、ドロップ・セーブ/ロード・おしゃべり・画面遷移・タイマーを `js/` の共通ファイルに。各モードの `*-menu-coin.js` は設定（`PAGE`）とモード固有の処理だけに
- [x] **第3段階（データ化）**：レベルを `js/modes/*.js` のデータに。たし・ひき・かけは共通エンジン `js/engines/drill.js`、百マスは `js/engines/grid.js`。レベルボタンと rescue 画面はデータから自動生成
- [x] **第4段階（1ページ化）**：`index.html` 1枚に。`#/add` `#/sub` `#/multi` `#/hundredgrid` で画面を切り替え（`js/app.js`）。以前のURLは自動で移動
- [ ] 第5段階：吹き出し・数字・ドロップの置き換え
- [ ] 第6段階：データ移行と新機能

---

## 0. 現状の構造

| 種類 | ファイル | 中身の実態 |
|---|---|---|
| HTML | `tamaadddrops.html` / `tamasubdrops.html` / `tamamultidrops.html` / `tamahundredgrid.html` | 約9割が同じマークアップ（テンキー、モーダル4種、データ管理、フッター、Firebase 初期化） |
| メニュー系 JS | `add-menu-coin.js` / `sub-menu-coin.js` / `multi-menu-coin.js` / `hundredgrid-menu-coin.js` | 約1000行のコピー。違いは「画面ID」「localStorage のキー接頭辞（`add_`/`sub_`/`multi_`/`hundredgrid_`）」「レベル数」「アンロック条件」だけ |
| 問題系 JS | `addition.js` / `subtraction.js` / `multiplication.js` | 違いは「問題パターン生成」「記号画像」「おたすけだんご（引き算のみアニメ）」「ベストタイムのキー」 |
| 入力 | `numericKeypad.js` | `processButtonPress` / `subProcessButtonPress` / `multiProcessButtonPress` が約120行ずつほぼ同一。違いは記号（+ − ×）とミス上限（5 / 3）だけ |
| CSS | `addstyle.css` / `substyle.css` / `multistyle.css` / `hundredgridstyle.css` | 正規化して比較すると約95%同一。違いは背景画像・ボタン色・一部の位置・百マス用のテーブル装飾 |

つまり「同じものを4回書いて、4か所を少しずつ変えている」状態です。直すときに4か所直す必要があり、実際に直し漏れ（後述のバグ）が出ています。

---

## 1. いただいた質問への回答

### 1-1. HTML を1つにできるか → **できる。おすすめ**

- `index.html` 1枚にして、`#/add` `#/sub` `#/multi` `#/hundred` のようなハッシュで画面を切り替える（SPA）。ビルドツール不要、Firebase Hosting の設定変更も不要。
- 画面ごとの差（タイトル・背景・ボタン色・レベル一覧・コメント）は **データ（設定オブジェクト）** にして、レベル選択ボタンは JS で生成する。
  今は `multi` だけで 28個の `<div class="level-pair">` を手書きしているが、これが1つのループになる。
- 既存URL（`tamaadddrops.html` など）はブックマークやホーム画面ショートカットがあるので、**中身1行のリダイレクトページとして残す**（`<meta http-equiv="refresh" content="0;url=/#/add">`）。
- 段階的に行くなら：①共通部品を共有化（HTMLは4枚のまま）→ ②1枚に統合、の2段階でも可。

### 1-2. 共通部品の共有化

以下の単位に分けて、ES Modules（`<script type="module">`、ビルド不要）で読み込む構成を提案します。

```
index.html
css/
  base.css          … 全画面共通（今の4ファイルの95%）
  modes.css         … モード別の色・背景を CSS 変数で（--mode-bg, --btn-color …）
js/
  app.js            … 画面切り替え（ルーター）
  storage.js        … localStorage の読み書きを全部ここに集約（キー名・データ版数・移行）
  modes/
    addition.js     … { id:'add', title, symbol:'+', maxMistakes:5, levels:[…] }
    subtraction.js
    multiplication.js
    hundredgrid.js
  ui/
    keypad.js       … テンキー（1本に統合）
    drops.js        … ドロップを投げる・飛び散る・ドラッグ（throwCoin/animateCoin を1本に）
    modals.js       … クリア／ミス／データ管理／rescue
    bubble.js       … タマの吹き出し
    levelSelect.js  … レベル選択ボタン生成・アンロック判定
  history.js        … 時間履歴・ドロップ履歴（新機能）
data/
  messages.json     … いまの tashizan_message.json
  illustrations.json
```

各モードは「レベル定義の配列」だけを持つ形にすると、追加・調整がとても楽になります。

```js
// 例：modes/addition.js
export default {
  id: 'add', storagePrefix: 'add', title: 'たしざん', symbol: '+', maxMistakes: 5,
  levels: [
    { label: 'Lv1もんだい★', comment: '5はいくつといくつ？', drop: 'L',
      style: 'decompose', patterns: () => range(0, 5).map(b => [5, b]) },
    { label: 'Lv2もんだい', comment: 'こたえが5まで', drop: 'M',
      unlock: { prevDrops: 3 }, patterns: () => pairs(1, 9, (a, b) => a + b <= 5) },
    // …
  ],
};
```

`numericKeypad.js` の3つの `*ProcessButtonPress` は、記号とミス上限をモード設定から読むだけで **1関数** になります。`pressMasterButton` の `if (mode === …)` の連鎖も消えます。

### 1-3. 冗長・スッキリできる部分

| 場所 | 内容 | 改善 |
|---|---|---|
| `addition.js` | `generatePatternsA` と `generatePatternsC` が完全に同一。B/D/E/F も「範囲と条件」が違うだけ | `pairs(min, max, 条件関数)` 1本に |
| `multiplication.js` | `case 1`〜`case 28` の switch | `dan = Math.ceil(level/3)`、`kind = (level-1)%3` で計算できる |
| `problemState.solvedPatterns` | `lv1:[]…lv30:[]` を手書き | 現在のレベル分の配列1つで足りる（開始時に毎回全部リセットしているため） |
| `formatTime` / `formatMilliseconds` | 同一関数が2つ（4ファイルで計8つ） | 1つに |
| `showNotification` / `closeDataModal` / `openDataModal` / export 処理 | `main.js` と 4つの menu-coin に計5コピー | `ui/modals.js` に1つ |
| `hundredgrid-menu-coin.js` | `throwCoinR` / `animateCoinR` は跳ね返り係数（0.7→0.5）だけ違うコピー | 引数 `bounce` を追加して1本に |
| `hundredgrid.js` | `updateLevel6Config` が2か所にコピー（しかも値が微妙に違う：40px と 41px） | 1関数に |
| `hundredgrid.js` | DOMContentLoaded でスライダーのイベントを **2重に登録** している | 1回に |
| HTML | インライン `style="…"` が大量、モーダルの表示を `style.display` で切り替え | CSS クラス＋ `<dialog>` 要素（背景オーバーレイ・Escで閉じる が標準で付く） |
| コメントアウトされた旧コード | 各ファイルに多数（旧 `throwCoin`、旧 `showModal`、旧 rescue、`deleteModal` のキー操作…） | Git に履歴があるので削除してOK |
| `console.log` | コイン保存のたびに全件出力など多数 | `DEBUG` フラグで切り替え、または削除 |
| `?version=20230329` / `<?php echo time(); ?>` | 静的ホスティングなので PHP は動かず、文字列がそのまま送られている。version も更新されていない | Firebase Hosting の Cache-Control 設定か Service Worker で管理 |
| Firebase 初期化 | 5ファイルに同じコード | `js/analytics.js` 1つに |

### 1-4. 吹き出しを SVG にできるか → **SVG すら不要。CSS だけで作れます**

`fukidasiS/M/L.png` の中身を確認したところ、**クリーム色（#FFFDD0系）の角丸長方形＋薄紫の枠**でした。

```css
.speech-bubble {
  background: #fffbd0;
  border: 3px solid #d8d0f8;
  border-radius: 1.2em;
  padding: .6em 1.2em;
  filter: drop-shadow(6px 6px 8px rgba(0,0,0,.4));
  width: max-content; max-width: 22em;
}
/* しっぽを付けたい場合 */
.speech-bubble::after { content:''; position:absolute; … border: … transparent; }
```

効果：
- 文字量に合わせて自動で大きさが決まる → `areaType`(S/M/L) と `imageSize` の指定、サイズ別の位置計算（`displayComment` の switch）が全部不要になる。
- 画像3枚（読み込み）が不要。拡大してもぼやけない。
- メッセージ JSON は `{ id, text, weight }` だけで済む。

### 1-5. 数字カードをフォントにできるか → **フォント化をおすすめ（条件付き）**

現在：`0.png`〜`9.png`・`+ - = x h t o q` が 250×330 の PNG（合計約67KB＋リクエスト多数）。

| | 数字カード（PNG） | Web フォント |
|---|---|---|
| 見た目の安定 | ◎ 全端末で同じ | ○ **フォントを自前配信すれば**同じ |
| 拡大時 | △ ぼやける | ◎ くっきり |
| 色・アニメ | △ 画像ごと | ◎ 「十の位を赤、一の位を青」など学習用の色分けが CSS 1行 |
| 2桁以上・新記号（÷ など） | △ 画像追加が必要 | ◎ そのまま |
| 読み込み | 画像15枚 | サブセット化して数KB 1ファイル |

**安定させる条件**：
1. 端末のフォントに頼らない（端末ごとに「1」「7」の形が変わってしまう）。
2. Google Fonts の **`text=` パラメータで使う文字だけに絞る**か、`woff2` を自前でサブセット化してリポジトリに置く（オフラインPWAにするなら自前配置）。
3. `font-display: block` と、`document.fonts.ready` を待ってから最初の問題を出す。

フォント候補：
- **Klee One**（教科書体に近い手書き風。学校で習う字形に近いので低学年向けに最適）
- **Zen Maru Gothic** / **M PLUS Rounded 1c**（今の数字カードの丸ゴシックの雰囲気に近い）

「は」「と」「？」の画像も同じフォントで文字にできます。`?` のカバー（`q.gif`、アニメなしの1フレーム GIF）も CSS で作れます。

---

## 2. 見つかったバグ・不具合（優先度順）

### 高
1. **メニュー画面で数字キーを押すと、裏で問題が進む**（`numericKeypad.js` の `keydown`）
   キーボード入力はどの画面でも `handleButtonPress` を呼ぶ。メニュー画面でも `keypadEnabled` が `true` のままなので、
   隠れた問題が解かれてドロップが飛んできたり、5回押すと**メニュー画面にミスモーダルが出る**。
   → 問題画面が表示中のときだけ受け付ける。`returnMenu()` で `toggleKeypad(false)`。
2. **十の位を間違えてもミス回数に数えられず、間違いリストにも残らない**（`numericKeypad.js` 3関数とも）
   一の位の間違いだけ `mistakeCount++` と `mistakes.push` をしている。
3. **百マスのクリア画面の「これまでのさいこう」が今回の記録を反映しない**（`hundredgrid.js` `showModal`）
   `getBestTime()` を `saveBestTime()` より前に呼んでいる。今回が新記録でも1つ前の記録が表示される。
4. **間違いリストがレベルをまたいで溜まる**：`problemState.mistakes` はミスモーダル表示時にしか空にならないので、クリアした回のミスが次のレベルのミスモーダルに混ざる。`startLevel` でリセットが必要。

### 中
5. **かけ算の rescue のチェックボックス `id="level1"〜"level9"` が、レベルボタンの `id="level1"〜` と重複**。
   DOM順でたまたまチェックボックスが先にあるので動いているだけ。ID は文書内で一意である必要がある。
6. **百マスで2桁入力の途中（十の位だけ入力）に「もういちど」や「はじめにもどる」をすると、`partialInput` が残り**、次の最初のマスの入力にくっつく。
7. **百マスの rescue が `hundredgrid_coins_7`〜`_11` という存在しないレベルのデータを書き込む**（`restoreLevels` のループ上限が 11 のまま）。
8. `throwCoin(10, special = false, coinSize = 60, …)`（`displayCachedMessage`）：JS には名前付き引数がないため、これは**グローバル変数 `special` `coinSize` `howManyCoins` を作る代入**になっている。値の順番が合っているので動いているだけ。
9. ドラッグ処理の `event.clientX || event.touches[0].clientX`：マウスの X 座標がちょうど 0 のとき `touches` が無くてエラー。Pointer Events（`pointerdown/move/up`）にするとマウス・タッチを1本で扱えて解決。
10. `toggleKeypad()` が `.numeric-keypad-button` を探しているが、そのクラスのボタンは存在しない（実際は `.num`）。ボタンの無効化は効いていない。
11. 百マスのパターン JSON の読み込みに失敗すると、`waitForPatterns()` が **50msごとに永久にループ**する。
12. `index.html` の「Ver.4.0.1」をタップする隠しボタン切り替え：CSS 側の `display:none` がコメントアウトされているので最初から表示されており、1回目のタップは何も変わらない。

### 低（見た目・HTMLの正しさ）
13. `<head lang="ja">` → `lang` は `<html>` に付ける（読み上げ・フォント選択に影響）。
14. `index.html` の `openDataModal` ボタンに `z-index:1;""` と余分な `"`。
15. ミスモーダルの文言「5かい」がHTMLに直書き（かけ算は「3かい」に書き換えて対応）。設定値から表示すべき。
16. `index.html` のメインボタンは背景画像だけで文字が無く、`aria-label` も無い。
17. 引き算レベル5のコメント「答えが1~5まで」に対して実装は `generateSubtractionPatternsD(4)`（答え1〜4）。HTML側は「こたえが1～4」なのでコードのコメントだけの食い違い。

---

## 3. パフォーマンス（特に効果大）

| ファイル | サイズ | 対策 |
|---|---|---|
| `img/kakedoro.png` | **5.2MB** | WebP/JPEG 化で 200KB 前後に |
| `img/keisan_hyaku_tasu.png` | **3.6MB** | 同上 |
| `img/keisan_hyaku_kake.png` | **3.6MB**（未使用） | 使う予定がなければ削除 |
| ドロップ画像 `*maru.png` 12枚 | 各約100KB（300×300） | 表示は25〜50px。SVG化すれば数KB（後述） |
| `img/nojineko.jpg` `hyakukake.png` `q.png` | 未参照 | 使う予定がなければ削除 |

`img/` 全体 15MB のうち 12MB が背景3枚です。スマホ・タブレットでの初回表示がかなり速くなります。

また `manifest.json` はあるのに **Service Worker が無い**ため、オフラインで動かず、キャッシュ制御も効いていません。SW を入れると「教室で電波が悪くても動く」ようになります。

---

## 4. データ設計（新機能の土台）

### 今の保存データ
- `add_coins_N` などに **最新10個だけ**（`slice(-10)`）。日付は `"M/D"` で**年が無い**。
- ベストタイムはレベルごとに1つだけ（百マスだけ上位5件）。
- つまり「いつ・何分かかって・何問まちがえたか」の**履歴は残っていない**。時間履歴・ドロップ獲得履歴を作るには保存方法を変える必要があります。

### 提案：追記型のプレイ記録
```js
// localStorage 'tamadoro.log.v1'（または IndexedDB）
{ t: 1729651200000,       // 終了時刻（年まで入る）
  mode: 'add', level: 9,
  ms: 83500,               // かかった時間
  total: 20, miss: 2,      // 問題数・ミス数
  drop: 'C',               // もらったドロップ（G=金）
  problems: [              // 1問ごと（にがて分析用）
    { a: 7, b: 6, ok: true, ms: 2100 },
    { a: 8, b: 5, ok: false, ms: 5400, input: 12 },
  ] }
```
- 1プレイ数百バイトなので、毎日10回×1年でも localStorage（約5MB）に収まる。将来的に多くなれば IndexedDB へ。
- 既存の `add_coins_N` などは**読み取り専用で残し**、初回起動時に新形式へ移行（データ版数 `tamadoro.schema` を持たせる）。セーブ／ロードのファイルにも版数を入れる。
- 表示用の「最新ドロップ5個」「アンロック判定」「ベストタイム」は、すべてこのログから計算できる。

---

## 5. 学びやすさのための追加要素の案

### ご要望のもの
- **時間履歴**：レベルごとのクリアタイムの推移グラフ（「きのうより はやくなったね！」）。ベストタイム更新時の演出。
- **ドロップ獲得履歴**：カレンダーにその日のドロップをスタンプ表示。合計数・連続日数。
- **ドロップの球形化**：
  - ドロップを **SVG 1枚＋色の変数**で描く（放射グラデーション＋白いハイライト＋影で「飴玉」らしい立体感）。猫の顔は SVG パスで共通。
    → 画像12枚（約1.2MB）が数KBに。かけ算28レベル分でも色を自由に作れる（今は10色を使い回し）。
  - 集めたドロップを**ドロップ缶（ビン）にコロコロ貯める**画面：簡単な物理演算（自作 or matter.js）で球が転がって積もる。たくさん集めた実感が目に見える。

### 学習効果の高いもの
- **にがて問題の記録と復習モード**：1問ごとの正誤・回答時間を保存し、「まちがえた／時間がかかった」問題を優先して出す（間隔反復）。
  今は問題を**表示した時点で「解いた」扱い**（`solvedPatterns.push`）なので、間違えた問題は二度と出ない → **間違えた問題をレベルの最後にもう一度出す**だけでも効果大。
- **回答時間の可視化**：たし算・ひき算は「正確さ」の次に「すぐ答えられる（自動化）」が大事。1問ごとの秒数を記録し、ゆっくりだった問題を表示。
- **おとなのひと向けページ**：九九の 9×9 表、たし算 9×9 表を「正答率×速さ」で色分けしたヒートマップ。どこがにがてか一目でわかる。
- **おたすけだんごの強化**：10のまとまり（さくらんぼ計算・10の合成分解）を視覚化。ひき算の「ひくひく／ひくたす」をアニメで見せる。
- **きょうのめあて**：「きょうは3レベルやろう」などの小さな目標と達成スタンプ。
- **読み上げ**（`speechSynthesis`）：問題を音声で読む／正解時に「せいかい！」。文字がまだ読めない子にも。

---

## 6. 進め方の提案（機能を壊さないために）

1. **準備**：画像の軽量化、未使用ファイル削除、明らかなバグ修正（2章の高）。ここまでは今の構造のままでできる。
2. **共通化**：`storage.js`・`keypad.js`・`drops.js`・`modals.js`・`base.css` を切り出し、4ページから読み込む。各ページの動作を1つずつ確認。
3. **データ化**：レベル定義を設定オブジェクトに移し、レベル選択画面を JS 生成に。
4. **1ページ化**：`index.html` に統合、旧URLはリダイレクト。
5. **見た目の置き換え**：吹き出しを CSS、数字をフォント、ドロップを SVG に（1つずつ、見比べながら）。
6. **データ移行と新機能**：プレイ記録 → 時間履歴 → ドロップ履歴・ドロップ缶 → にがて復習。

各段階で、既存の localStorage データ（`add_coins_N` など）を持った状態で開いて、ドロップ・アンロック・ベストタイムが変わらないことを確認しながら進めます。
