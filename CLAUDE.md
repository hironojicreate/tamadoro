# タマドロ：作業のきまり

- **バージョンは、どんなに小さい変更でも必ず上げる**。`index.html` の `<span id="version">Ver.x.y.z</span>` の末尾の数字（z）を1つ上げる。
  あわせて、バージョンを確かめているテスト（`tests/basic.test.js` の「バージョン表記」、`tests/fixes-v6.test.js` の「フッターの表記」）も同じ番号に直す。
- 説明（README・docs・コメント・テスト）と動きがちがうときは、いまの動きを正しいものとして、説明のほうを直す。
- 変更したら `tests/` のテスト（`cd tests && npm test`）を通してからコミットする。
