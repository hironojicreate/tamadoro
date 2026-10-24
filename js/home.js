// さいしょの画面（#/）だけで使う処理
// セーブ／ロードは js/data-modal.js

//Ver.をタップすると、隠しボタン（百マス）を表示／非表示
document.getElementById("version").addEventListener("click", function () {
    const hiddenButton = document.getElementById("homeHundredgrid");
    if (getComputedStyle(hiddenButton).display === "none") {
        hiddenButton.style.display = "block";
    } else {
        hiddenButton.style.display = "none";
    }
});

// ホーム画面のアイコンから開いたとき（manifest.json の start_url に ?shortcut=true）
if (new URLSearchParams(window.location.search).get('shortcut') === 'true') {
    document.body.classList.add('standalone');
}
