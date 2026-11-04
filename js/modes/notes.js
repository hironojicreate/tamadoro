// おんぷよみ（おんがくのへや）
//   ト音記号の 五線に 出た 音符を 読んで、その けんばんを おす（五線の絵は js/staff.js）
//   問題の進め方は js/engines/keys.js（けんばんと 同じ。display: 'staff' で カードが 五線になる）
//   はじめは けんばんに 名前を書いておく（読む ことに 集中する）。Lv5 からは 名前なしで「五線の場所 → けんばん」
(function () {
    const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71;
    const C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79;
    const F3 = 53, B3 = 59, B5 = 83;

    MODES.notes = {
        id: 'notes',
        name: 'おんぷよみ',
        pageTitle: 'タマの【おんぷよみ】ドロップス',
        engine: 'keys',
        display: 'staff',                 // 問題の カードを 五線に
        music: true,
        backTo: '#/music',
        inRecords: false,
        storagePrefix: 'notes',           // ドロップの保存キー notes_coins_3 など
        bestTimePrefix: 'notes',
        menuCoinSize: '25px',
        deleteMessage: 'おんぷよみのデータを消去しました',
        rescue: { type: 'slider', max: 8 },
        maxMistakes: 5,
        perfectClear: {},
        existingCoinsLevels: [],
        texts: {
            unit: 'もん',
            clearTitle: level => `${MODES.notes.levels[level - 1].label}、クリア！`,
            best: 'これまでのさいこうは',
        },

        // オニは 5こ、ほかは 3こで つぎが ひらく
        coinsToUnlock: level => (level === 8 ? 5 : 3),

        // view・active・guide・repeat は けんばんと 同じ（js/modes/keys.js）
        //   view の はしは、黒いけんばんの かたまりが かけないところ
        levels: [
            { label: 'Lv1 ドレミ', comment: 'ド・レ・ミの おんぷ', drop: 'L',
              style: 'single', notes: [C4, D4, E4], repeat: 4, view: [F3, B4], active: [C4, E4], guide: 'all',
              hint: 'ドは、五線の 下に みじかい せんを 1本 たした ところ' },
            { label: 'Lv2 ド〜ソ', comment: 'ドから ソまで', drop: 'M',
              style: 'single', notes: [C4, D4, E4, F4, G4], repeat: 3, view: [F3, B4], active: [C4, G4], guide: 'all',
              hint: 'せんの上・せんの あいだ と、1つ のぼるごとに ド・レ・ミ・ファ・ソ' },
            { label: 'Lv3 ソ〜ド', comment: 'ソから たかいドまで', drop: 'B',
              style: 'single', notes: [G4, A4, B4, C5], repeat: 4, view: [F3, E5], active: [G4, C5], guide: 'all',
              hint: 'ト音記号の うずまきが まいている せんが ソ' },
            { label: 'Lv4 ド〜ド', comment: 'たかいドまで ぜんぶ', drop: 'A',
              style: 'single', notes: [C4, D4, E4, F4, G4, A4, B4, C5], repeat: 2, view: [F3, E5], active: [C4, C5], guide: 'all' },
            { label: 'Lv5 ド〜ド', comment: 'けんばんの もじなし', drop: 'R',
              style: 'single', notes: [C4, D4, E4, F4, G4, A4, B4, C5], repeat: 2, view: [F3, E5], active: [C4, C5], guide: 'none' },
            { label: 'Lv6 うえの おと', comment: 'たかいドから たかいソまで', drop: 'K',
              style: 'single', notes: [C5, D5, E5, F5, G5], repeat: 3, view: [F4, B5], active: [C5, G5], guide: 'all',
              hint: '五線の いちばん上の せんが たかいファ' },
            { label: 'Lv7 メロディ', comment: '3〜4おんの がくふ', drop: 'P',
              style: 'phrase', count: 8, view: [F3, E5], active: [C4, C5], guide: 'none' },
            { label: 'Lvオニ', comment: 'ぜんぶ まぜて・もじなし', drop: 'S',
              style: 'oni', singles: 12, phrases: 4, view: [B3, B5], active: [C4, G5], guide: 'none' },
        ],
    };
})();
