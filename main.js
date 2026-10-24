// さいしょのページ（index.html）だけで使う処理
// セーブ／ロードは js/data-modal.js

//Ver.をタップすると、隠しボタン（百マス）を表示／非表示
document.getElementById("version").addEventListener("click", function () {
    const hiddenButton = document.getElementById("goToHundredgrid");
    if (getComputedStyle(hiddenButton).display === "none") {
        hiddenButton.style.display = "block";
    } else {
        hiddenButton.style.display = "none";
    }
});
