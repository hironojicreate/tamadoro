// 百マスページの設定
// 共通の処理は js/ フォルダ（menu.js・drops.js・data-modal.js など）が PAGE を見て動く
const PAGE = {
    screenId: 'hundredgridScreen',    // 問題画面の要素ID
    storagePrefix: 'hundredgrid',     // ドロップの保存キー hundredgrid_coins_3 など
    bestTimePrefix: 'hundredgrid',    // ベストタイムの保存キー hundredgrid_level_3_best_time など（秒で保存）
    levelCount: 6,
    menuCoinSize: '25px',             // メニューに並べるドロップの大きさ
    existingCoinsLevels: [10, 11],    // （百マスでは使わない）
    deleteMessage: 'マス計算・足し算のデータを消去しました',
    reloadAfterDelete: true,

    coinsToUnlock: () => 3,

    isUnlocked(level) {
        // Lv6（わたしの問題）：Lv3 のドロップ3個
        if (level === 6) {
            return TamaStore.getCoins(3).length >= 3;
        }
        // Lv5（なにがでる？）：これまでの正答数の合計が300以上、または Lv4 のドロップ3個
        if (level === 5) {
            let totalCorrectCount = 0;
            for (let l = 1; l <= PAGE.levelCount; l++) {
                totalCorrectCount += getCumulativeCorrectCount(l);
            }
            return totalCorrectCount >= 300 || TamaStore.getCoins(4).length >= 3;
        }
        return TamaStore.getCoins(level - 1).length >= 3;
    },

    // Lv6 だけ、表の大きさを決めるスライダーを出す（タイムの記録は出さない）
    onSwitchLevel(level) {
        const isCustom = level === 6;
        document.getElementById('customize-level6').style.display = isCustom ? 'block' : 'none';
        document.getElementById('recordDisplay').style.display = isCustom ? 'none' : 'block';
    },

    onReturnMenu() {
        saveSliderValues();
        resetCursor(); // カーソル情報をリセット
    },

    // 百マスだけにあるデータも消す
    onDeleteData() {
        for (let level = 1; level <= PAGE.levelCount; level++) {
            localStorage.removeItem(TamaStore.bestTimeKey(level)); // 最高記録
            localStorage.removeItem(`hundredgrid_level_${level}_correct_count`); // 累積正答数
            localStorage.removeItem(`hundredgrid_level_${level}_records`); // タイム・正答数・日付の記録
        }
        localStorage.removeItem('customize_level6_sliders'); // レベル6スライダー設定
        localStorage.removeItem('hundredgrid_level_undefined_correct_count'); // 以前の不具合で作られていたキー
    },
};


//百マスのカーソル情報を初期化。
function resetCursor() {
    // 現在のカーソル位置のスタイルをリセット
    const currentCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:nth-child(${currentCellIndex.col + 1})`
    );
    if (currentCell) {
        currentCell.classList.remove('input-target'); // 現在のセルの強調を削除
    }

    // カーソル情報を初期位置に戻す
    currentCellIndex = { row: 1, col: 1 };

    // 初期位置のセルを強調
    const firstCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:nth-child(${currentCellIndex.col + 1})`
    );
    if (firstCell) {
        firstCell.classList.add('input-target'); // 初期位置を強調
    }

    // ラインハイライトをリセット
    resetLineHighlight();
}


// 累積正答数をローカルストレージから取得して初期化する
function initializeCumulativeCorrectCounts() {
    for (let level = 1; level <= PAGE.levelCount; level++) {
        if (!correctAnswerCounts[level]) {
            correctAnswerCounts[level] = getCumulativeCorrectCount(level);
        }
    }
}
