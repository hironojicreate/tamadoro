// かけざんページの設定
// 共通の処理は js/ フォルダ（menu.js・drops.js・data-modal.js など）が PAGE を見て動く
// レベルは 1つの段に3つずつ：「n のだん」「n:さかさ」「n:バラバラ」（Lv28 はオニ＝すべての段）
const PAGE = {
    screenId: 'multiplicationScreen',   // 問題画面の要素ID
    storagePrefix: 'multi',             // ドロップの保存キー multi_coins_3 など
    bestTimePrefix: 'multiplication',   // ベストタイムの保存キー multiplication_level_3_best_time など
    levelCount: 28,
    menuCoinSize: '23px',               // メニューに並べるドロップの大きさ
    existingCoinsLevels: [28],          // ノーミスクリアで、メニューのドロップを全部投げるレベル
    deleteMessage: 'データを消去しました',

    isUnlocked(level) {
        // 各段の「n のだん」は最初から遊べる
        if (level % 3 === 1 && level < 28) {
            return true;
        }
        // オニ：すべての段の「バラバラ」でドロップを1個以上
        if (level === 28) {
            return [3, 6, 9, 12, 15, 18, 21, 24, 27].every(req => TamaStore.getCoins(req).length >= 1);
        }
        // さかさ・バラバラ：1つ前のレベルのドロップが5個
        return TamaStore.getCoins(level - 1).length >= 5;
    },

    // rescue：チェックした段の「n のだん」「n:さかさ」にドロップを5個ずつ入れて、全部解放する
    restoreLevels() {
        for (let dan = 1; dan <= 9; dan++) {
            const checkbox = document.getElementById(`rescueDan${dan}`);
            if (checkbox && checkbox.checked) {
                const firstLevel = (dan - 1) * 3 + 1;
                [firstLevel, firstLevel + 1].forEach(level => {
                    rescueSaveCoinInfo(level, { image: problemState.levelToImage[level], count: 5 });
                });
                checkbox.checked = false;
            }
        }
    },
};
