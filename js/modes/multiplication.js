// かけざん
// レベルは 1つの段に3つずつ：「n のだん」「n:さかさ」「n:バラバラ」、Lv28 はオニ（すべての段）
(function () {
    const P = ProblemPatterns;
    const DROP_ORDER = 'LMBARKPYCO';

    const levels = [];
    for (let dan = 1; dan <= 9; dan++) {
        levels.push(
            { label: `${dan}のだん`, order: 'ordered',
              patterns: () => P.withFirst(dan, 1, 9) },
            { label: `${dan}:さかさ`, title: dan === 1 ? '1のだん：さかさ' : `${dan}のだん:さかさ`, order: 'ordered',
              patterns: () => P.withFirst(dan, 9, 1) },
            { label: `${dan}:バラバラ`, title: `${dan}のだん:バラバラ`,
              patterns: () => P.withFirst(dan, 1, 9) },
        );
    }
    levels.push({ label: 'オニ', patterns: () => P.pairs(1, 9, 1, 9) });
    levels.forEach((level, i) => { level.drop = DROP_ORDER[i % DROP_ORDER.length]; });

    MODES.multi = {
        id: 'multi',
        name: 'かけざん',
        pageTitle: 'タマの【かけ算】ドロップス',
        engine: 'drill',
        storagePrefix: 'multi',
        bestTimePrefix: 'multiplication',
        menuCoinSize: '23px',
        deleteMessage: 'データを消去しました',
        rescue: { type: 'dan' },

        symbol: '×',
        calc: (a, b) => a * b,
        maxMistakes: 3,
        dots: null,                       // かけざんは、おたすけだんごなし
        texts: {
            unit: '問',
            clearTitle: () => 'クリア！',
            best: 'これまでの最高は',
        },
        perfectClear: {
            28: { coins: 20, flag: 'lvTenClear' },
        },
        existingCoinsLevels: [28],

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

        levels,
    };
})();
