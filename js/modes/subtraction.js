// ひきざん
(function () {
    const P = ProblemPatterns;

    MODES.sub = {
        id: 'sub',
        name: 'ひきざん',
        engine: 'drill',
        storagePrefix: 'sub',
        bestTimePrefix: 'subtraction',
        menuCoinSize: '25px',
        deleteMessage: '引き算のデータを消去しました',
        rescue: { type: 'slider', max: 11 },

        symbol: '-',
        calc: (a, b) => a - b,
        maxMistakes: 5,
        dots: 'subtract',                 // おたすけだんご：ひく数だけ色がうすくなる
        texts: {
            unit: 'もん',
            clearTitle: level => `Lv${level}もんだい、クリア！`,
            best: 'これまでのさいこうは',
        },
        perfectClear: {
            10: { coins: 1, flag: 'lvTenClear' },
            11: { coins: 10, flag: 'lvElevenClear' },
        },
        existingCoinsLevels: [10, 11],
        coinsToUnlock: level => (level === 11 ? 5 : 3),

        // dotsFrom: おたすけだんごを、ひかれる数の「前から」うすくするか「後ろから」か
        levels: [
            { label: 'Lv1もんだい★', comment: '5ー「?」', drop: 'L',
              patterns: () => P.withFirst(5, 0, 5) },
            { label: 'Lv2もんだい', comment: '1～5までひきざん', drop: 'M',
              patterns: () => P.pairs(1, 5, 1, a => a, (a, b) => b < a) },
            { label: 'Lv3もんだい', comment: 'こたえが5よりおおきい', drop: 'B',
              patterns: () => P.pairs(1, 9, 0, a => a, (a, b) => a - b >= 5) },
            { label: 'Lv4もんだい★', title: 'Lv4もんだい', comment: '10ー「？」', drop: 'A', dotsFrom: 'end',
              patterns: () => P.withFirst(10, 1, 9) },
            { label: 'Lv5もんだい', comment: 'こたえが1～4', drop: 'R',
              patterns: () => P.pairs(1, 9, 1, a => a, (a, b) => a - b >= 1 && a - b <= 4) },
            { label: 'Lv6もんだい★', comment: 'くりさがりなし/こたえ9まで', drop: 'K',
              patterns: () => P.pairs(1, 9, 1, a => a, (a, b) => a - b >= 1) },
            { label: 'Lv7もんだい', comment: 'くりさがりなし/1□ー「？」', drop: 'P', dotsFrom: 'end',
              patterns: () => P.pairs(11, 19, 1, 9, (a, b) => a - b >= 11) },
            { label: 'Lv8もんだい★', comment: 'くりさがり:ひくひくｵｽｽﾒ', drop: 'Y', dotsFrom: 'end',
              patterns: () => [
                  [11, 2], [11, 3], [11, 4], [11, 6],
                  [12, 3], [12, 6], [12, 7],
                  [13, 4], [13, 6], [13, 8],
                  [14, 6], [14, 7], [14, 9],
                  [15, 6], [15, 7], [15, 8],
                  [16, 7], [17, 8], [18, 9],
              ] },
            { label: 'Lv9もんだい★', comment: 'くりさがり:ひくたすｵｽｽﾒ', drop: 'C', dotsFrom: 'start',
              patterns: () => [
                  [11, 5], [11, 7], [11, 8], [11, 9],
                  [12, 5], [12, 6], [12, 8], [12, 9],
                  [13, 5], [13, 6], [13, 7], [13, 9],
                  [14, 5], [14, 6], [14, 7], [14, 8],
                  [15, 9], [16, 8], [16, 9],
                  [17, 9], [18, 9],
              ] },
            { label: 'Lv10もんだい★', comment: '★かんせい★くりさがりぜんぶ', drop: 'O', noHelp: true,
              patterns: () => P.pairs(11, 18, 1, 9, (a, b) => b > a % 10) },
            // オニ：こたえが1～17 のひきざんから、毎回ちがう80問
            { label: 'Lvオニもんだい', comment: 'オニ', drop: 'S', noHelp: true,
              patterns: () => P.shuffle(P.pairs(2, 18, 1, 9, (a, b) => a - b >= 1 && a - b <= 17)).slice(0, 80) },
        ],
    };
})();
