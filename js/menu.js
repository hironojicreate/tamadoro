// 画面の切り替え（レベル選択 ⇔ 問題）とレベルの解放
// （PAGE は各モードの *-menu-coin.js で定義）

function switchLevel(level, title) {
    if (PAGE.onSwitchLevel) {
        PAGE.onSwitchLevel(level);
    }
    // 指定されたレベルで問題を開始
    startLevel(level);
    document.getElementById('keypadScreen').style.display = 'block';
    document.getElementById(PAGE.screenId).style.display = 'block';
    document.getElementById('openingScreen').style.display = 'none';
    document.getElementById('pageTitle').textContent = title;
}

function returnMenu() {
    if (PAGE.onReturnMenu) {
        PAGE.onReturnMenu();
    }
    scatterCoins(); // 問題画面のコインを散らばせる
    clearCoinsOnDOM();
    displayAllLevelsCoins();
    unlockLevels();
    document.getElementById('keypadScreen').style.display = 'none';
    document.getElementById(PAGE.screenId).style.display = 'none';
    document.getElementById('openingScreen').style.display = 'block';
}

// 解放条件（PAGE.isUnlocked）を満たしたレベルだけボタンを表示する
function unlockLevels() {
    for (let level = 2; level <= PAGE.levelCount; level++) {
        const lockDiv = document.getElementById(`lock${level}`);
        if (lockDiv) {
            lockDiv.style.display = PAGE.isUnlocked(level) ? 'block' : 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', unlockLevels);


// rescue：選んだレベルまで遊べるように、ドロップを復元する
function restoreLevels() {
    if (PAGE.restoreLevels) {
        PAGE.restoreLevels(); // かけざんは「段」を選ぶ方式
    } else {
        // スライダーで選んだレベルの手前までは、解放に必要な数だけ。そこから先は0個
        const selectedLevel = parseInt(document.getElementById('levelSlider').value);
        for (let level = 1; level <= PAGE.levelCount; level++) {
            const count = level < selectedLevel ? PAGE.coinsToUnlock(level + 1) : 0;
            const image = count > 0 ? problemState.levelToImage[level] : null;
            rescueSaveCoinInfo(level, { image, count });
        }
    }

    returnMenu();
    rescueCloseModal();
}


// クリア／ミスのモーダルから、レベル選択へ戻る
function returnToLevelSelection() {
    document.getElementById('completionModal').style.display = 'none';
    document.getElementById('mistakeModal').style.display = 'none';
    returnMenu();
}
