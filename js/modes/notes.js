// おんぷよみ（おんがくのへや）
//   ト音記号の 五線に 出た 音符を 読んで、その けんばんを おす（五線の絵は js/staff.js）
//   問題の進め方は js/engines/keys.js（けんばんと 同じ。display: 'staff' で カードが 五線になる）
//   はじめは けんばんに 名前を書いておく（読む ことに 集中する）。Lv5 からは 名前なしで「五線の場所 → けんばん」
//   さいしょの「しくみ」は、せつめいしながら すすむ（せんは 5ほん・ドは 下の みじかい せん・せん→あいだ→せん…・
//   ドレミファソラシド と ドシラソファミレド を つづけて）。けんばんを おすと 名前を うたう
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
        dataVersion: 2,                   // レベルの ならびを かえたら 1つ 上げる（まえの ドロップ・きろくを 消す。js/app.js）
        bestTimePrefix: 'notes',
        menuCoinSize: '25px',
        deleteMessage: 'おんぷよみのデータを消去しました',
        rescue: { type: 'slider', max: 9 },
        maxMistakes: 5,
        perfectClear: {},
        existingCoinsLevels: [],
        texts: {
            unit: 'もん',
            clearTitle: level => `${MODES.notes.levels[level - 1].label}、クリア！`,
            best: 'これまでのさいこうは',
        },

        // しくみ → Lv1 は ドロップ1こ、オニは 5こ、ほかは 3こで つぎが ひらく
        coinsToUnlock: level => (level === 2 ? 1 : level === 9 ? 5 : 3),

        // view・active・guide・repeat は けんばんと 同じ（js/modes/keys.js）
        //   view の はしは、黒いけんばんの かたまりが かけないところ
        //   style: 'tour'（しくみ）、'dango'（おだんご：notes を repeat 回 ＋ おだんごを dangos 回。chord は おだんごの 和音）
        //   sing: けんばんを おすと 名前を うたう
        levels: [
            { label: 'しくみ', comment: 'せんは 5ほん・ドから のぼって くだる', drop: 'L',
              style: 'tour', view: [F3, E5], active: [C4, C5], guide: 'all', sing: true },
            { label: 'Lv1 せんの おだんご', comment: 'ド・ミ・ソ', drop: 'M',
              style: 'dango', notes: [C4, E4, G4], chord: 'C', repeat: 3, dangos: 3, dangoName: 'せんに ささった おだんご',
              view: [F3, B4], active: [C4, G4], guide: 'all', sing: true,
              hint: 'せんに ささった おだんご：ド（みじかい せん）・ミ（1ぽんめ）・ソ（2ほんめ）' },
            { label: 'Lv2 あいだの おだんご', comment: 'レ・ファ・ラ', drop: 'B',
              style: 'dango', notes: [D4, F4, A4], chord: 'Dm', repeat: 3, dangos: 3, dangoName: 'せんの あいだの おだんご',
              view: [F3, B4], active: [C4, A4], guide: 'all', sing: true,
              hint: 'せんの あいだの おだんご：レ（ドの せんと 1ぽんめの あいだ）・ファ・ラ' },
            { label: 'Lv3 ソ〜ド', comment: 'ソから たかいドまで', drop: 'A',
              style: 'single', notes: [G4, A4, B4, C5], repeat: 4, view: [F3, E5], active: [G4, C5], guide: 'all',
              hint: 'ト音記号の うずまきが まいている せんが ソ' },
            { label: 'Lv4 ド〜ド', comment: 'たかいドまで ぜんぶ', drop: 'R',
              style: 'single', notes: [C4, D4, E4, F4, G4, A4, B4, C5], repeat: 2, view: [F3, E5], active: [C4, C5], guide: 'all' },
            { label: 'Lv5 ド〜ド', comment: 'けんばんの もじなし', drop: 'K',
              style: 'single', notes: [C4, D4, E4, F4, G4, A4, B4, C5], repeat: 2, view: [F3, E5], active: [C4, C5], guide: 'none' },
            { label: 'Lv6 うえの おと', comment: 'たかいドから たかいソまで', drop: 'P',
              style: 'single', notes: [C5, D5, E5, F5, G5], repeat: 3, view: [F4, B5], active: [C5, G5], guide: 'all',
              hint: '五線の いちばん上の せんが たかいファ' },
            { label: 'Lv7 メロディ', comment: '3〜4おんの がくふ', drop: 'Y',
              style: 'phrase', count: 8, view: [F3, E5], active: [C4, C5], guide: 'none' },
            { label: 'Lvオニ', comment: 'ぜんぶ まぜて・もじなし', drop: 'S',
              style: 'oni', singles: 12, phrases: 4, view: [B3, B5], active: [C4, G5], guide: 'none' },
        ],
    };
})();
