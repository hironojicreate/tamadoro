// くろいけんばん（おんがくのへや）
//   ♯（シャープ）は すぐ みぎどなり、♭（フラット）は すぐ ひだりどなり。この きまり 1つで さがす
//   正解すると、その けんばんの 名前を ぜんぶ見せる（ド♯ で こたえても「ド♯／レ♭」）→ 2つの名前が しぜんに むすびつく
//   さがしかたの たすけは すこしずつ へらす：Lv1・2 は 矢印（もとの音から ななめ上の 黒いけんばんへ）と 白いけんばんの 名前、
//   Lv3〜5 は 名前だけ、Lv6 は なし（「けんばんの よみかた」スイッチで 名前を 出せる）
//   ミ♯（＝ファ）など 白いけんばんに なる 名前は、Lv5 で はじめて おしえる（それまでは ボタンにも 出さない）
//   問題の進め方は js/engines/keys.js（けんばんと 同じ）。けんばんの Lv6 で ドロップを もらうと ひらく
(function () {
    const C4 = 60, B3 = 59, B4 = 71, C5 = 72;
    const F3 = 53, E5 = 76;
    // せまい 画面（はば 600px より 下）では、つかわない けんばんを 見せずに 1つずつを 大きく
    const NARROW_ONE = [C4, B4];   // Lv1〜4：ド〜シ
    const NARROW_WIDE = [B3, C5];  // Lv5・6：ひくいシ〜たかいド

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
        // 版 2（Ver.6.3.82）：レベルを 6つに 作りなおした。まえの ドロップ・ベストタイム・きろくは 消す
        dataVersion: 2,
        storagePrefix: 'black',           // ドロップの保存キー black_coins_3 など
        bestTimePrefix: 'black',
        menuCoinSize: '25px',
        deleteMessage: 'くろいけんばんのデータを消去しました',
        rescue: { type: 'slider', max: 6 },
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

        // どの レベルも、まえの レベルの ドロップ 3こで ひらく
        coinsToUnlock: () => 3,

        // style:  'spell'（♯・♭ の名前の けんばんを おす）／'enharmonic'（「ド♯ ＝ ？♭」を ボタンで）／
        //         'white-spell'（ミ♯ など 白いけんばんに なる 名前。はじめの 4もんは 矢印つき。オクターブは くべつしない）／
        //         'black-mix'（ぜんぶ まぜて。前半は けんばんを おす 問題、後半は ボタンで こたえる 問題）
        // Lv1・2 は 入門（すぐ クリア）なので 10もん。Lv3 が 本番
        // pool:   'sharp'（ド♯・レ♯・ファ♯・ソ♯・ラ♯）／'flat'（レ♭・ミ♭・ソ♭・ラ♭・シ♭）／'both'
        // arrow:  もとの音を ふちどりして、おす けんばんの ほうへ 矢印（黒いけんばんへは ↗・↖、白いけんばんへは →・←）
        // narrowView: せまい 画面で 見せる けんばん
        // 白いけんばんに なる 名前：ミ♯（＝ファ）・ファ♭（＝ミ）・シ♯（＝ド）・ド♭（＝シ）
        levels: [
            { label: 'Lv1 ♯', comment: '♯は すぐ みぎどなり', drop: 'L',
              style: 'spell', pool: 'sharp', repeat: 2, view: [F3, B4], narrowView: NARROW_ONE, active: [C4, B4], guide: 'all', arrow: true, hint: HINT_SHARP },
            { label: 'Lv2 ♭', comment: '♭は すぐ ひだりどなり', drop: 'M',
              style: 'spell', pool: 'flat', repeat: 2, view: [F3, B4], narrowView: NARROW_ONE, active: [C4, B4], guide: 'all', arrow: true, hint: HINT_FLAT },
            { label: 'Lv3 ♯と♭', comment: 'まぜて・やじるしなし', drop: 'B',
              style: 'spell', pool: 'both', count: 16, view: [F3, B4], narrowView: NARROW_ONE, active: [C4, B4], guide: 'all', hint: HINT_BOTH },
            { label: 'Lv4 2つの名前', comment: 'ド♯ ＝ ？♭', drop: 'A',
              style: 'enharmonic', pool: 'both', count: 10, view: [F3, B4], narrowView: NARROW_ONE, active: [C4, B4], guide: 'all' },
            { label: 'Lv5 ミ♯', comment: 'しろい けんばんの ♯・♭', drop: 'A',
              style: 'white-spell', guided: 4, count: 8, view: [F3, E5], narrowView: NARROW_WIDE, active: [B3, C5], guide: 'all',
              hint: 'ミと ファ、シと ドの あいだには くろい けんばんが ない' },
            { label: 'Lv6 まぜて', comment: 'ぜんぶ まぜて・なまえなし', drop: 'S',
              style: 'black-mix', spells: 8, names: 4, whites: 4, view: [F3, E5], narrowView: NARROW_WIDE, active: [B3, C5], guide: 'none', labelSwitch: true,
              hint: '♯は みぎどなり、♭は ひだりどなり。しろい けんばんの ことも あるよ' },
        ],
    };
})();
