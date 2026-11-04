// くろいけんばん（おんがくのへや）
//   ♯（シャープ）は すぐ みぎどなり、♭（フラット）は すぐ ひだりどなり。この きまり 1つで さがす
//   正解すると、その けんばんの 名前を ぜんぶ見せる（ド♯ で こたえても「ド♯／レ♭」）→ 2つの名前が しぜんに むすびつく
//   問題の進め方は js/engines/keys.js（けんばんと 同じ）。けんばんの Lv6 で ドロップを もらうと ひらく
(function () {
    const C4 = 60, B3 = 59, B4 = 71, C5 = 72;
    const F3 = 53, E5 = 76;

    const HINT_SHARP = '♯（シャープ）は、すぐ みぎどなりの けんばん';
    const HINT_FLAT = '♭（フラット）は、すぐ ひだりどなりの けんばん';
    const HINT_BOTH = '♯は すぐ みぎどなり、♭は すぐ ひだりどなり';

    MODES.black = {
        id: 'black',
        name: 'くろいけんばん',
        pageTitle: 'タマの【くろいけんばん】ドロップス',
        engine: 'keys',
        music: true,
        backTo: '#/music',
        inRecords: false,
        storagePrefix: 'black',           // ドロップの保存キー black_coins_3 など
        bestTimePrefix: 'black',
        menuCoinSize: '25px',
        deleteMessage: 'くろいけんばんのデータを消去しました',
        rescue: { type: 'slider', max: 5 },
        maxMistakes: 5,
        perfectClear: {},
        existingCoinsLevels: [],
        texts: {
            unit: 'もん',
            clearTitle: level => `${MODES.black.levels[level - 1].label}、クリア！`,
            best: 'これまでのさいこうは',
        },

        // けんばんの Lv6（ド〜ド・もじなし）で ドロップを 1こでも もらうまでは ひらかない
        //   （ためしているあいだは、けんばんの /rescue で Lv7 まで ひらくと、ここも ひらく）
        locked: () => TamaStore.readJSON('keys_coins_7', []).length === 0,
        lockedMessage: 'しろい けんばんの Lv6 を クリアすると ひらくよ',

        // オニは 5こ、ほかは 3こで つぎが ひらく
        coinsToUnlock: level => (level === 5 ? 5 : 3),

        // style:  'spell'（♯・♭ の名前の けんばんを おす）／'enharmonic'（「ド♯ ＝ ？♭」を ボタンで）／'black-oni'
        // pool:   'sharp'（ド♯・レ♯・ファ♯・ソ♯・ラ♯）／'flat'（レ♭・ミ♭・ソ♭・ラ♭・シ♭）／'both'
        // arrow:  もとの音を 光らせて →・← を出す
        // オニの ひっかけ：ミ♯（＝ファ）・シ♯（＝たかいド）・ファ♭（＝ミ）・ド♭（＝ひくいシ）。白いけんばんに なる
        levels: [
            { label: 'Lv1 ♯', comment: '♯は すぐ みぎどなり', drop: 'L',
              style: 'spell', pool: 'sharp', repeat: 3, view: [F3, B4], active: [C4, B4], guide: 'all', arrow: true, hint: HINT_SHARP },
            { label: 'Lv2 ♭', comment: '♭は すぐ ひだりどなり', drop: 'M',
              style: 'spell', pool: 'flat', repeat: 3, view: [F3, B4], active: [C4, B4], guide: 'all', arrow: true, hint: HINT_FLAT },
            { label: 'Lv3 ♯と♭', comment: 'まぜて・ガイドなし', drop: 'B',
              style: 'spell', pool: 'both', count: 16, view: [F3, B4], active: [C4, B4], guide: 'none', hint: HINT_BOTH },
            { label: 'Lv4 2つの名前', comment: 'ド♯ ＝ ？♭', drop: 'A',
              style: 'enharmonic', pool: 'both', count: 10, view: [F3, B4], active: [C4, B4], guide: 'none' },
            { label: 'Lvオニ', comment: 'ぜんぶ まぜて・ひっかけも！', drop: 'S',
              style: 'black-oni', spells: 8, names: 4, traps: 4, view: [F3, E5], active: [B3, C5], guide: 'none',
              hint: '♯は みぎどなり、♭は ひだりどなり。しろい けんばんの ことも あるよ' },
        ],
    };
})();
