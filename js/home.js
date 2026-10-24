// さいしょの画面（#/）だけで使う処理
// セーブ／ロードは js/data-modal.js

// ホーム画面のアイコンから開いたとき（manifest.json の start_url に ?shortcut=true）
if (new URLSearchParams(window.location.search).get('shortcut') === 'true') {
    document.body.classList.add('standalone');
}
