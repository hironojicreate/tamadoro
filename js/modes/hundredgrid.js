// 百マスたしざん
MODES.hundredgrid = {
    id: 'hundredgrid',
    name: '百マスたしざん',
    engine: 'grid',
    storagePrefix: 'hundredgrid',     // ドロップの保存キー hundredgrid_coins_3 など
    bestTimePrefix: 'hundredgrid',    // ベストタイムの保存キー（秒で保存）
    menuCoinSize: '25px',
    deleteMessage: 'マス計算・足し算のデータを消去しました',
    reloadAfterDelete: true,
    rescue: { type: 'slider', max: 4 },
    existingCoinsLevels: [],

    levels: [
        { label: 'Lv1もんだい', comment: '9マス/0~5まで', drop: 'L' },
        { label: 'Lv2もんだい', comment: '15マス/0~5まで', drop: 'M' },
        { label: 'Lv3もんだい', comment: '25マス/0~5まで', drop: 'B' },
        { label: 'Lv4もんだい', comment: '49マス/0~9まで', drop: 'A' },
        { label: 'なにがでる？', title: 'どんな「え」がでるかな？', comment: '100マス/どんな「え」かな？', drop: 'R' },
        { label: 'わたしの問題', comment: 'じゆう', drop: 'K' },
    ],

    coinsToUnlock: () => 3,

    isUnlocked(level) {
        // Lv6（わたしの問題）：Lv3 のドロップ3個
        if (level === 6) {
            return TamaStore.getCoins(3).length >= 3;
        }
        // Lv5（なにがでる？）：これまでの正答数の合計が300以上、または Lv4 のドロップ3個
        if (level === 5) {
            let totalCorrectCount = 0;
            for (let l = 1; l <= this.levels.length; l++) {
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
        partialInput = ""; // 2けた入力の途中状態をリセット
    },

    // 百マスだけにあるデータも消す
    onDeleteData() {
        for (let level = 1; level <= this.levels.length; level++) {
            localStorage.removeItem(TamaStore.bestTimeKey(level)); // 最高記録
            localStorage.removeItem(`hundredgrid_level_${level}_correct_count`); // 累積正答数
            localStorage.removeItem(`hundredgrid_level_${level}_records`); // タイム・正答数・日付の記録
        }
        localStorage.removeItem('customize_level6_sliders'); // レベル6スライダー設定
        localStorage.removeItem('hundredgrid_level_undefined_correct_count'); // 以前の不具合で作られていたキー
    },
};
