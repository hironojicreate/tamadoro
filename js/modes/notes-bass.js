// おんぷよみ／ヘおん（おんがくのへや）：ト音記号の おんぷよみ（js/modes/notes.js）を ヘ音記号に した コース
//   ふつうの ピアノの けんばんで こたえる（ハ長調が きほん）。問題の進め方は js/engines/keys.js（display: 'staff'、clef: 'bass'）
//   名前は ド3（ヘ音記号の 下から 2つめの あいだ＝だい2かん）の 段が「ド」（home: 3）。上は たかい○、下は ひくい○
//   音の はんい：ひくいファ（下第1間）〜 たかいミ（上第2線。ト音記号の 下第1線の ド の 3度 上）
//   しくみ：だい2かんの ド 〜 たかいド（上第1線）
//   おだんご：ト音記号と 線・あいだ が 入れかわる。あいだの ド・ミ・ソ（だい2・3・4かん）→ せんの レ・ファ・ラ（3・4・5ほんめ）
//   けんばんの まんなかの ド（ト音記号の ド ＝ ここでは たかいド）に ★
//   ※ トロンボーン・ユーフォ／チューバ（js/modes/bass.js）は ハ長調の 楽譜が 不自然なので お休み中（へやの ボタンは かくしている）
(function () {
    const F2 = 41, G2 = 43, A2 = 45, B2 = 47;
    const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57, B3 = 59;
    const C4 = 60, D4 = 62, E4 = 64, G4 = 67;
    const C2 = 36;

    const SPACE_DANGO = { notes: [C3, E3, G3], chord: 'C', name: 'せんの あいだの おだんご', intro: true };
    const LINE_DANGO = { notes: [D3, F3, A3], chord: 'Dm', name: 'せんに ささった おだんご', intro: true };

    MODES.notesBass = {
        id: 'notesBass',
        name: 'おんぷよみ ヘおん',
        pageTitle: 'タマの【おんぷよみ ヘおん】ドロップス',
        engine: 'keys',
        display: 'staff',
        clef: 'bass',                     // 五線は ヘ音記号（js/staff.js）
        home: 3,                          // 名前は ド3 の 段が「ド」（js/notes.js）
        middleC: true,                    // けんばんの まんなかの ド に ★
        music: true,
        backTo: '#/music',
        inRecords: false,
        storagePrefix: 'notesBass',       // ドロップの保存キー notesBass_coins_3 など
        bestTimePrefix: 'notesBass',
        menuCoinSize: '25px',
        deleteMessage: 'おんぷよみ（ヘおん）のデータを消去しました',
        rescue: { type: 'slider', max: 9 },
        maxMistakes: 5,
        perfectClear: {},
        existingCoinsLevels: [],
        texts: {
            unit: 'もん',
            clearTitle: level => `${MODES.notesBass.levels[level - 1].label}、クリア！`,
            best: 'これまでのさいこうは',
        },

        // しくみ → Lv1 は ドロップ1こ、ほかは 3こで つぎが ひらく（マスタークラスは まだ。ユーザーと 相談）
        coinsToUnlock: level => (level === 2 ? 1 : 3),

        // ならびは ト音記号の おんぷよみ と 同じ（js/modes/notes.js の せつめい）
        //   tourShift：しくみの 音を 1オクターブ 下（だい2かんの ド 〜 たかいド）、tourStart：さいしょの ドの せつめい
        //   shift：メロディ（Lv8）を 1オクターブ 下
        levels: [
            { label: 'しくみ', comment: 'せんは 5ほん・ドから のぼって くだる', drop: 'L',
              style: 'tour', tourShift: -12,
              tourStart: 'ドは、五線の 下から 2つめの あいだ（だい2かん）。ここから スタート！ ひかっている けんばんを おしてね',
              view: [F2, E4], active: [C3, C4], guide: 'all', sing: true },
            { label: 'Lv1 あいだの おだんご', comment: 'ド・ミ・ソ', drop: 'M',
              style: 'dango', dangos: [SPACE_DANGO], singles: [C3, E3, G3], repeat: 3, dangoRepeat: 3,
              view: [F2, B3], active: [C3, G3], guide: 'all', sing: true,
              hint: 'せんの あいだの おだんご：ド（下から 2つめの あいだ）・ミ（3つめ）・ソ（4つめ）' },
            { label: 'Lv2 せんの おだんご', comment: 'レ・ファ・ラ', drop: 'B',
              style: 'dango', dangos: [LINE_DANGO], singles: [D3, F3, A3], repeat: 3, dangoRepeat: 3,
              view: [F2, B3], active: [C3, A3], guide: 'all', sing: true,
              hint: 'せんに ささった おだんご：レ（3ぼんめ）・ファ（4ほんめ。ヘ音記号の 点の あいだ）・ラ（5ほんめ）' },
            { label: 'Lv3 おだんご まぜ', comment: 'ド・ミ・ソ と レ・ファ・ラ', drop: 'A',
              style: 'dango', dangos: [{ ...SPACE_DANGO, intro: false }, { ...LINE_DANGO, intro: false }],
              singles: [C3, D3, E3, F3, G3, A3], repeat: 2, dangoRepeat: 2,
              view: [F2, B3], active: [C3, A3], guide: 'all', sing: true,
              hint: 'あいだの ド・ミ・ソ と、せんに ささった レ・ファ・ラ。ト音記号とは 反対だよ' },
            { label: 'Lv4 おだんごの つづき', comment: 'シ と たかいド を たして ド〜ド', drop: 'R',
              style: 'dango',
              dangos: [
                  { notes: [C3, E3, G3, B3], chord: 'Cmaj7', name: 'あいだの おだんごの つづきは シ（五線の すぐ上の あいだ）', intro: true },
                  { notes: [D3, F3, A3, C4], chord: 'Dm7', name: 'せんの おだんごの つづきは たかいド（上の みじかい せん）', intro: true },
              ],
              singles: [C3, D3, E3, F3, G3, A3, B3, C4], repeat: 1, extra: [B3, C4, B3, C4], dangoRepeat: 2,
              singleChords: { [C3]: 'C', [E3]: 'C', [G3]: 'C', [D3]: 'Dm', [F3]: 'Dm', [A3]: 'Dm', [B3]: 'Em', [C4]: 'C' },
              view: [F2, E4], active: [C3, C4], guide: 'all', sing: true,
              hint: 'あいだの おだんごの つぎは シ（五線の すぐ上）、せんの おだんごの つぎは たかいド（上の みじかい せん。★の ド）' },
            { label: 'Lv5 ド〜ド', comment: 'けんばんの もじなし', drop: 'K',
              style: 'single', notes: [C3, D3, E3, F3, G3, A3, B3, C4], repeat: 2, view: [F2, E4], active: [C3, C4], guide: 'none',
              labelSwitch: true },
            { label: 'Lv6 うえの おと', comment: 'うえの おだんご（たかいド〜たかいミ）', drop: 'P',
              style: 'dango',
              dangos: [
                  { notes: [A3, C4, E4], chord: 'Am', name: 'うえの せんの おだんご（5ほんめ・みじかい せん 1本・2本）', intro: true },
                  { notes: [G3, B3, D4], chord: 'G', name: 'うえの あいだの おだんご', intro: true },
              ],
              singles: [B3, C4, D4, E4], repeat: 2, extra: [C4, D4, E4], dangoRepeat: 2,
              view: [B2, G4], active: [G3, E4], guide: 'all', sing: true, // 左に くらい けんばん
              hint: 'うえの みじかい せん 1本が たかいド（★）、2本が たかいミ。その あいだが たかいレ' },
            { label: 'Lv7 したの おと', comment: 'したの おだんご（ひくいファ〜ひくいシ）', drop: 'G',
              style: 'dango',
              dangos: [
                  { notes: [G2, B2, D3], chord: 'G', name: 'したの せんの おだんご（1ぽんめ・2ほんめ・3ぼんめ）', intro: true },
                  { notes: [F2, A2, C3], chord: 'F', name: 'したの あいだの おだんご（五線の すぐ下・1つめ・2つめの あいだ）', intro: true },
              ],
              singles: [F2, G2, A2, B2, C3, D3], repeat: 2, extra: [F2, G2, A2, B2], dangoRepeat: 2,
              view: [C2, B3], active: [F2, D3], guide: 'all', sing: true,
              hint: 'ドの 下は ひくいシ（2ほんめ）・ひくいラ（1つめの あいだ）・ひくいソ（1ぽんめ）・ひくいファ（五線の すぐ下）' },
            { label: 'Lv8 メロディ', comment: '3〜4おんの がくふ', drop: 'Y',
              style: 'phrase', count: 8, melody: 'leap', shift: -12, view: [F2, E4], active: [A2, C4], guide: 'none' },
        ],
    };
})();
