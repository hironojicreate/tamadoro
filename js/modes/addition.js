// たしざん
(function () {
    const P = ProblemPatterns;

    MODES.add = {
        id: 'add',
        name: 'たしざん',
        engine: 'drill',
        storagePrefix: 'add',             // ドロップの保存キー add_coins_3 など
        bestTimePrefix: 'addition',       // ベストタイムの保存キー addition_level_3_best_time など
        menuCoinSize: '25px',             // メニューに並べるドロップの大きさ
        deleteMessage: '足し算のデータを消去しました',
        rescue: { type: 'slider', max: 11 },

        symbol: '+',
        calc: (a, b) => a + b,
        maxMistakes: 5,
        dots: 'count',                    // おたすけだんご：数だけ並べる
        texts: {
            unit: 'もん',
            clearTitle: level => `Lv${level}もんだい、クリア！`,
            best: 'これまでのさいこうは',
        },
        // ノーミスでクリアしたときの特別演出（投げるドロップ数・おしゃべりのフラグ）
        perfectClear: {
            10: { coins: 1, flag: 'lvTenClear' },
            11: { coins: 10, flag: 'lvElevenClear' },
        },
        existingCoinsLevels: [10, 11],    // お祝いのとき、メニューのドロップを全部投げるレベル

        // そのレベルを解放するのに、1つ前のレベルのドロップがいくつ必要か（オニは5個）
        coinsToUnlock: level => (level === 11 ? 5 : 3),

        // style: 'decompose' は「5 は 2 と ？」（答えは a - b）
        // noHelp: おたすけだんごを使えない
        levels: [
            { label: 'Lv1もんだい★', comment: '5はいくつといくつ？', drop: 'L', style: 'decompose',
              patterns: () => P.withFirst(5, 0, 5) },
            { label: 'Lv2もんだい', comment: 'こたえが5まで', drop: 'M',
              patterns: () => P.pairs(1, 9, 1, 9, (a, b) => a + b <= 5) },
            { label: 'Lv3もんだい', comment: '5＋「？」', drop: 'B',
              patterns: () => P.withFirst(5, 0, 5) },
            { label: 'Lv4もんだい', comment: '5＋「？」いろいろ', drop: 'A',
              patterns: () => [...P.withFirst(5, 0, 5), ...P.withSecond(5, 0, 4)] },
            { label: 'Lv5もんだい', comment: '1から5までのかずで', drop: 'R',
              patterns: () => P.pairs(1, 5, 1, 5, (a, b) => a + b <= 10) },
            { label: 'Lv6もんだい★', comment: '10はいくつといくつ？', drop: 'K', style: 'decompose',
              patterns: () => P.withFirst(10, 0, 10) },
            { label: 'Lv7もんだい', comment: '10＋「？」', drop: 'P',
              patterns: () => [...P.withFirst(10, 0, 10), ...P.withSecond(10, 0, 9)] },
            { label: 'Lv8もんだい★', comment: '10までのたしざん ぜんぶ', drop: 'Y',
              patterns: () => P.pairs(1, 9, 1, 9, (a, b) => a + b <= 10 && !(a <= 4 && b <= 4)) },
            { label: 'Lv9もんだい', comment: 'くりあがるたしざん しょきゅう', drop: 'C',
              patterns: () => P.pairs(1, 9, 1, 9, (a, b) => a + b >= 11 && a + b <= 14) },
            { label: 'Lv10もんだい★', comment: '★かんせい★くりあがりぜんぶ', drop: 'O', noHelp: true,
              patterns: () => P.pairs(1, 9, 1, 9, (a, b) => a + b >= 11) },
            { label: 'Lvオニもんだい', comment: 'オニ', drop: 'S', noHelp: true,
              patterns: () => P.pairs(1, 9, 1, 9) },
        ],
    };
})();
