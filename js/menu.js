// 画面の切り替え（レベル選択 ⇔ 問題）とレベルの解放
// （currentMode は js/state.js）

function switchLevel(level, title) {
    if (currentMode.onSwitchLevel) {
        currentMode.onSwitchLevel(level);
    }
    // 指定されたレベルで問題を開始
    currentEngine().start(level);
    document.getElementById('keypadScreen').style.display = 'block';
    document.getElementById(currentEngine().screenId).style.display = 'block';
    document.getElementById('openingScreen').style.display = 'none';
    document.querySelector(`#${currentEngine().screenId} .page-title`).textContent = title;
}

function returnMenu() {
    if (currentMode.onReturnMenu) {
        currentMode.onReturnMenu();
    }
    scatterCoins(); // 問題画面のコインを散らばせる
    clearCoinsOnDOM();
    displayAllLevelsCoins();
    unlockLevels();
    document.getElementById('keypadScreen').style.display = 'none';
    document.getElementById(currentEngine().screenId).style.display = 'none';
    document.getElementById('openingScreen').style.display = 'block';
}

// 解放条件（currentMode.isUnlocked）を満たしたレベルだけボタンを表示する
function unlockLevels() {
    for (let level = 2; level <= currentMode.levelCount; level++) {
        const lockDiv = document.getElementById(`lock${level}`);
        if (lockDiv) {
            lockDiv.style.display = currentMode.isUnlocked(level) ? 'block' : 'none';
        }
    }
}



// rescue：選んだレベルまで遊べるように、ドロップを復元する
function restoreLevels() {
    if (currentMode.restoreLevels) {
        currentMode.restoreLevels(); // かけざんは「段」を選ぶ方式
    } else {
        // スライダーで選んだレベルの手前までは、解放に必要な数だけ。そこから先は0個
        const selectedLevel = parseInt(document.getElementById('levelSlider').value);
        for (let level = 1; level <= currentMode.levelCount; level++) {
            const count = level < selectedLevel ? currentMode.coinsToUnlock(level + 1) : 0;
            const image = count > 0 ? problemState.levelToImage[level] : null;
            rescueSaveCoinInfo(level, { image, count });
        }
    }

    returnMenu();
    rescueCloseModal();
}


// クリア／ミスのモーダルの「もういちどちょうせん」
function retryLevel() {
    currentEngine().retry();
}

// クリア／ミスのモーダルから、レベル選択へ戻る
function returnToLevelSelection() {
    document.getElementById('completionModal').style.display = 'none';
    document.getElementById('mistakeModal').style.display = 'none';
    returnMenu();
}
