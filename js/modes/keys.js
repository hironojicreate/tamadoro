// けんばん（おんがくのへや）
//   問題の進め方は js/engines/keys.js、画面のけんばんは js/keyboard.js
//   ためしているあいだは、設定の入力欄に「/music on」と入れたときだけ 出てくる（js/music.js）
(function () {
    const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72;
    const F3 = 53, E5 = 76;

    // 黒いけんばんで 場所を見つけるための ヒント
    const HINT_DO = 'くろい けんばんが 2つ ならんでいる ところの、ひだりどなりが ド';
    const HINT_FA = 'くろい けんばんが 3つ ならんでいる ところの、ひだりどなりが ファ';

    MODES.keys = {
        id: 'keys',
        name: 'けんばん',
        pageTitle: 'タマの【けんばん】ドロップス',
        engine: 'keys',
        music: true,                      // おんがくのへやの モード（/music on のときだけ）
        backTo: '#/music',                // レベル選択の「もどる」で もどる画面
        inRecords: false,                 // 「タマのきろく」のタブには まだ出さない
        storagePrefix: 'keys',            // ドロップの保存キー keys_coins_3 など
        bestTimePrefix: 'keys',           // ベストタイムの保存キー keys_level_3_best_time など
        menuCoinSize: '25px',
        deleteMessage: 'けんばんのデータを消去しました',
        rescue: { type: 'slider', max: 9 },
        maxMistakes: 5,
        perfectClear: {},
        existingCoinsLevels: [],
        texts: {
            unit: 'もん',
            clearTitle: level => `${MODES.keys.levels[level - 1].label}、クリア！`,
            best: 'これまでのさいこうは',
        },

        // おとあそび → Lv1 は ドロップ1こ、オニは 5こ、ほかは 3こで つぎが ひらく
        coinsToUnlock: level => (level === 2 ? 1 : level === 9 ? 5 : 3),

        // style:   'free'（おとあそび）／'single'（1おんずつ）／'phrase'（メロディ）／'oni'（ぜんぶ まぜる）
        // view:    見せる けんばん [from, to]（左はしが ドに ならないように、すこし よぶんに見せる）
        //          はしは、黒いけんばんの かたまり（3こ・2こ）が かけないところ（ファ〜シ、ファ〜ミ など）にする
        //          （かたまりが かけると、3この かたまりが 2こに見えて、ドの場所を まちがえる）
        // active:  あかるく見せる けんばん [from, to]（こたえは この中だけ）
        // notes:   出す音、repeat: それぞれ何回 出すか
        // guide:   けんばんに 名前を書く（'all'）／書かない（'none'）
        // vanish:  はじめに まほうで 名前が きえる けんばん
        levels: [
            { label: 'おとあそび', comment: 'すきな けんばんを 10かい ならそう', drop: 'L',
              style: 'free', presses: 10, view: [F3, E5], active: [F3, E5], guide: 'all' },
            { label: 'Lv1 ドレミ', comment: 'ド・レ・ミを さがそう', drop: 'M',
              style: 'single', notes: [C4, D4, E4], repeat: 4, view: [F3, B4], active: [C4, E4], guide: 'all' },
            { label: 'Lv2 ド〜ソ', comment: 'ドから ソまで', drop: 'B',
              style: 'single', notes: [C4, D4, E4, F4, G4], repeat: 3, view: [F3, B4], active: [C4, G4], guide: 'all' },
            { label: 'Lv3 まほう', comment: 'ドと ソの もじが きえる！', drop: 'A',
              style: 'single', notes: [C4, D4, E4, F4, G4], repeat: 3, view: [F3, B4], active: [C4, G4], guide: 'all',
              vanish: [C4, G4], hint: HINT_DO },
            { label: 'Lv4 ド〜ソ', comment: 'もじなしで ドから ソまで', drop: 'R',
              style: 'single', notes: [C4, D4, E4, F4, G4], repeat: 3, view: [F3, B4], active: [C4, G4], guide: 'none',
              hint: HINT_DO },
            { label: 'Lv5 ファ〜ド', comment: 'ファから たかいドまで', drop: 'K',
              style: 'single', notes: [F4, G4, A4, B4, C5], repeat: 3, view: [F3, E5], active: [F4, C5], guide: 'all',
              hint: HINT_FA },
            { label: 'Lv6 ド〜ド', comment: 'もじなしで たかいドまで', drop: 'P',
              style: 'single', notes: [C4, D4, E4, F4, G4, A4, B4, C5], repeat: 2, view: [F3, E5], active: [C4, C5], guide: 'none' },
            { label: 'Lv7 メロディ', comment: '3〜4おんの メロディ', drop: 'Y',
              style: 'phrase', count: 8, view: [F3, E5], active: [C4, C5], guide: 'none' },
            { label: 'Lvオニ', comment: 'ぜんぶ まぜて・ばしょも かわる', drop: 'S',
              style: 'oni', singles: 12, phrases: 4, active: [C4, C5], guide: 'none' },
        ],
    };
})();
