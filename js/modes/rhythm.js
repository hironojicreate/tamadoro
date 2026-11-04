// リズム（おんがくのへや）
//   流れてくる リズムに 合わせて たたく（問題の進め方は js/engines/rhythm.js）
//   ことば：タン（4ぶおんぷ）・タタ（8ぶおんぷ 2こ）・ウン（4ぶきゅうふ＝やすみ）・ターアー（2ぶおんぷ）
//   さいしょの「ちょうせい」で、その端末の 音の おくれ・たたく くせ を はかって おぼえる
(function () {
    const easy = { perfect: 0.08, good: 0.18 };  // ぴったり・いいね の はば（秒）
    const hard = { perfect: 0.06, good: 0.14 };

    MODES.rhythm = {
        id: 'rhythm',
        name: 'リズム',
        pageTitle: 'タマの【リズム】ドロップス',
        engine: 'rhythm',
        music: true,
        backTo: '#/music',
        inRecords: false,
        storagePrefix: 'rhythm',          // ドロップの保存キー rhythm_coins_3 など
        bestTimePrefix: 'rhythm',
        menuCoinSize: '25px',
        deleteMessage: 'リズムのデータを消去しました',
        rescue: { type: 'slider', max: 7 },
        maxMistakes: 4,                   // ミス 4こで ざんねん（3こ までなら クリア）
        perfectClear: {},
        existingCoinsLevels: [],
        texts: {
            unit: 'しょうせつ',
            clearTitle: level => `${MODES.rhythm.levels[level - 1].label}、クリア！`,
            best: '',
        },

        // ちょうせい → Lv1 は ドロップ1こ、オニは 5こ、ほかは 3こで つぎが ひらく
        coinsToUnlock: level => (level === 2 ? 1 : level === 7 ? 5 : 3),

        // tokens：つかう ことば（q タン・e タタ・r ウン・h ターアー）、required：かならず 入れる ことば
        // bars：しょうせつの 数、bpm：テンポ（1ぷんに 何はく）
        levels: [
            { label: 'ちょうせい', comment: 'さいしょに やってね', drop: 'L',
              calibrate: true, fixed: [['q', 'q', 'q', 'q'], ['q', 'q', 'q', 'q']], bpm: 90,
              hint: 'カチッと いっしょに たたくと、この端末の ずれを はかって おぼえるよ' },
            { label: 'Lv1 タン', comment: 'タン（4ぶおんぷ）', drop: 'M',
              tokens: ['q'], bars: 4, bpm: 80, ...easy, hint: 'カチッと いっしょに タン・タン・タン・タン' },
            { label: 'Lv2 ウン', comment: 'ウン（やすみ）', drop: 'B',
              tokens: ['q', 'r'], required: ['r'], bars: 4, bpm: 80, ...easy, hint: 'ウンは おやすみ。たたかないでね' },
            { label: 'Lv3 タタ', comment: 'タタ（8ぶおんぷ）', drop: 'A',
              tokens: ['q', 'e'], required: ['e'], bars: 4, bpm: 76, ...easy, hint: 'タタは 1はくに 2かい' },
            { label: 'Lv4 ターアー', comment: 'ターアー（2ぶおんぷ）', drop: 'R',
              tokens: ['q', 'h', 'r'], required: ['h'], bars: 4, bpm: 84, ...easy, hint: 'ターアーは 1かい たたいて、2はく まつ' },
            { label: 'Lv5 ぜんぶ', comment: 'タン・タタ・ウン・ターアー', drop: 'K',
              tokens: ['q', 'e', 'r', 'h'], required: ['e', 'r', 'h'], bars: 6, bpm: 84, ...easy },
            { label: 'Lvオニ', comment: 'はやい・ながい・きびしい', drop: 'S',
              tokens: ['q', 'e', 'r', 'h'], required: ['e', 'r', 'h'], bars: 8, bpm: 100, ...hard },
        ],
    };
})();
