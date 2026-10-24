// ひきざんページの設定
// 共通の処理は js/ フォルダ（menu.js・drops.js・data-modal.js など）が PAGE を見て動く
const PAGE = {
    screenId: 'subtractionScreen',    // 問題画面の要素ID
    storagePrefix: 'sub',             // ドロップの保存キー sub_coins_3 など
    bestTimePrefix: 'subtraction',    // ベストタイムの保存キー subtraction_level_3_best_time など
    levelCount: 11,
    menuCoinSize: '25px',             // メニューに並べるドロップの大きさ
    existingCoinsLevels: [10, 11],    // ノーミスクリアで、メニューのドロップを全部投げるレベル
    deleteMessage: '引き算のデータを消去しました',

    // そのレベルを解放するのに、1つ前のレベルのドロップがいくつ必要か（オニは5個）
    coinsToUnlock: level => (level === 11 ? 5 : 3),
    isUnlocked: level => TamaStore.getCoins(level - 1).length >= PAGE.coinsToUnlock(level),
};
