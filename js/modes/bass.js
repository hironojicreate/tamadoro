// ヘおんよみ（おんがくのへや）：ヘ音記号の 五線を 読む。トロンボーン・ユーフォ と チューバ の 2つの コース
//   問題の進め方は js/engines/keys.js（おんぷよみ と 同じ。display: 'staff'、clef: 'bass' で 五線が ヘ音記号）
//   音は 実音の 固定ド。名前は ド3（ヘ音記号の 五線の まんなかの ド）の 段が「ただの ド」（home: 3）：
//     ド4〜（上の 加線の あたり）は たかい○、ド2〜シ2 は ひくい○、ファ1〜シ1 は ひくいひくい○
//   はんい：トロンボーン・ユーフォ は ひくいファ（ファ2）〜 たかいファ（ファ4）、チューバ は ひくいひくいファ（ファ1）〜 レ（レ3）
//   こたえかたは 段階で わける：
//     まえはん（おだんご・加線の 音）は 名前の ボタン（ド〜シ。オクターブは とわない。answer: 'name'）。
//       正解すると その 高さの 音が 鳴って、けんばんの その 場所が 光る（高さは 目と 耳で しぜんに）
//     うしろはん（けんばんで）は けんばんで 高さまで（おんぷよみ と 同じ）
//   けんばんの まんなかの ド（ト音記号の ド）に ★（middleC）
(function () {
    const F1 = 29, G1 = 31, A1 = 33, B1 = 35;
    const C2 = 36, D2 = 38, E2 = 40, F2 = 41, G2 = 43, A2 = 45, B2 = 47;
    const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57, B3 = 59;
    const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67;
    const E1 = 28;

    // 五線の 中（ひくいソ〜ラ）。おだんごは ト音記号と 同じ 形で：せんに ささった おだんご・あいだの おだんご
    const LINE_DANGO = { notes: [G2, B2, D3], chord: 'G', name: 'せんに ささった おだんご', intro: true };
    const SPACE_DANGO = { notes: [A2, C3, E3], chord: 'Am', name: 'せんの あいだの おだんご', intro: true };
    const STAFF_VIEW = [F2, B3];  // 五線の 中の レベルの けんばん（白 11こ）
    const STAFF_ACTIVE = [G2, A3];

    // どちらの コースも 同じ まえはん（しくみ・Lv1〜Lv4）
    const commonLevels = () => [
        { label: 'しくみ', comment: 'ヘ音記号の「ヘ」は ファ', drop: 'L',
          style: 'tour', tour: 'bass', view: STAFF_VIEW, narrowView: STAFF_ACTIVE, active: STAFF_ACTIVE, guide: 'all' },
        { label: 'Lv1 せんの おだんご', comment: 'ひくいソ・ひくいシ・レ', drop: 'M', answer: 'name',
          style: 'dango', dangos: [LINE_DANGO], singles: [G2, B2, D3], repeat: 3, dangoRepeat: 3,
          view: STAFF_VIEW, narrowView: STAFF_ACTIVE, active: STAFF_ACTIVE, guide: 'all',
          hint: 'せんに ささった おだんご：ひくいソ（1ぽんめ）・ひくいシ（2ほんめ）・レ（3ぼんめ）' },
        { label: 'Lv2 あいだの おだんご', comment: 'ひくいラ・ド・ミ', drop: 'B', answer: 'name',
          style: 'dango', dangos: [SPACE_DANGO], singles: [A2, C3, E3], repeat: 3, dangoRepeat: 3,
          view: STAFF_VIEW, narrowView: STAFF_ACTIVE, active: STAFF_ACTIVE, guide: 'all',
          hint: 'せんの あいだの おだんご：ひくいラ（1ぽんめと 2ほんめの あいだ）・ド・ミ' },
        { label: 'Lv3 おだんご まぜ', comment: 'せんと あいだ', drop: 'A', answer: 'name',
          style: 'dango', dangos: [{ ...LINE_DANGO, intro: false }, { ...SPACE_DANGO, intro: false }],
          singles: [G2, A2, B2, C3, D3, E3], repeat: 2, dangoRepeat: 2,
          view: STAFF_VIEW, narrowView: STAFF_ACTIVE, active: STAFF_ACTIVE, guide: 'all',
          hint: 'せんに ささった ひくいソ・ひくいシ・レ と、あいだの ひくいラ・ド・ミ。どっちの おだんご かな？' },
        { label: 'Lv4 おだんごの つづき', comment: 'ファ・ソ・ラ を たして 五線 ぜんぶ', drop: 'R', answer: 'name',
          style: 'dango',
          dangos: [
              { notes: [G2, B2, D3, F3], chord: 'G7', name: 'せんの おだんごの つづきは ファ（4ほんめ。ヘ音記号の 点の あいだ）', intro: true },
              { notes: [A2, C3, E3, G3], chord: 'Am7', name: 'あいだの おだんごの つづきは ソ（いちばん 上の あいだ）', intro: true },
          ],
          singles: [G2, A2, B2, C3, D3, E3, F3, G3, A3], repeat: 1, extra: [F3, G3, A3, F3, G3, A3], dangoRepeat: 2,
          singleChords: { [A3]: 'F' },
          view: STAFF_VIEW, narrowView: STAFF_ACTIVE, active: STAFF_ACTIVE, guide: 'all',
          hint: 'せんの おだんごの つぎは ファ（4ほんめ）、あいだの つぎは ソ。いちばん 上の せん（5ほんめ）は ラ' },
    ];

    // 五線の 中を けんばんで（高さまで）
    const staffKeys = (label, drop) => ({
        label, comment: '五線の ひくいソ〜ラ を けんばんで', drop,
        style: 'single', notes: [G2, A2, B2, C3, D3, E3, F3, G3, A3], repeat: 2,
        view: STAFF_VIEW, narrowView: STAFF_ACTIVE, active: STAFF_ACTIVE, guide: 'none', labelSwitch: true,
        hint: 'おなじ ドでも 高さは いろいろ。五線の 場所から、けんばんの 高さまで さがそう',
    });

    // 2つの コースで 同じ ところ
    const baseMode = ({ id, course, deleteMessage, levels }) => ({
        id,
        name: `ヘおんよみ（${course}）`,
        pageTitle: `タマの【ヘおんよみ ${course}】ドロップス`,
        engine: 'keys',
        display: 'staff',
        clef: 'bass',                     // 五線は ヘ音記号（js/staff.js）
        home: 3,                          // 名前は ド3 の 段が「ただの ド」（js/notes.js）
        middleC: true,                    // けんばんの まんなかの ド に ★
        music: true,
        backTo: '#/music',
        inRecords: false,
        storagePrefix: id,                // ドロップの保存キー bassTb_coins_3 など
        bestTimePrefix: id,
        menuCoinSize: '25px',
        deleteMessage,
        rescue: { type: 'slider', max: levels.length },
        maxMistakes: 5,
        perfectClear: {},
        existingCoinsLevels: [],
        texts: {
            unit: 'もん',
            clearTitle: level => `${MODES[id].levels[level - 1].label}、クリア！`,
            best: 'これまでのさいこうは',
        },
        // しくみ → Lv1 は ドロップ1こ、ほかは 3こで つぎが ひらく
        coinsToUnlock: level => (level === 2 ? 1 : 3),
        // answer: 'name'：名前の ボタンで こたえる（けんばんは 鳴るだけ）。ないときは けんばんで
        // style: 'bassline'：ベースの うごき（lines：[[音, 和音], …] から count こ）
        // shift：メロディ（style: 'phrase'）を ずらす（-12 で 1オクターブ 下）
        levels,
    });

    // トロンボーン・ユーフォ：五線の 上の 加線（たかいド〜たかいファ）と、五線の すぐ下の ひくいファ。メロディを ふく ことが おおい
    MODES.bassTb = baseMode({
        id: 'bassTb',
        course: 'トロンボーン・ユーフォ',
        deleteMessage: 'ヘおんよみ（トロンボーン・ユーフォ）のデータを消去しました',
        levels: [
            ...commonLevels(),
            { label: 'Lv5 そとの おと', comment: 'うえの おだんご と ひくいファ', drop: 'P', answer: 'name',
              style: 'dango',
              dangos: [
                  { notes: [A3, C4, E4], chord: 'Am', name: 'うえの せんの おだんご（5ほんめ・かせん 1本・かせん 2本）', intro: true },
                  { notes: [B3, D4, F4], chord: 'G7', name: 'うえの あいだの おだんご', intro: true },
              ],
              singles: [F2, B3, C4, D4, E4, F4], repeat: 2, extra: [C4, E4, F2], dangoRepeat: 2,
              singleChords: { [F2]: 'F' },
              view: [E2, G4], narrowView: [F2, F4], active: [F2, F4], guide: 'all',
              hint: 'たかいド は 上の かせん 1本（★の まんなかの ド）、たかいミ は かせん 2本。いちばん 下の せんの すぐ下は ひくいファ' },
            staffKeys('Lv6 けんばんで', 'K'),
            { label: 'Lv7 ファ〜ファ', comment: 'ひくいファ〜たかいファ を けんばんで', drop: 'G',
              style: 'single', notes: [F2, G2, A2, B2, C3, D3, E3, F3, G3, A3, B3, C4, D4, E4, F4], repeat: 1,
              view: [E2, G4], narrowView: [F2, F4], active: [F2, F4], guide: 'none', labelSwitch: true,
              hint: '五線の 上の かせんは たかい○、五線の 下の ほうは ひくい○' },
            { label: 'Lv8 メロディ', comment: '3〜4おんの がくふ を けんばんで', drop: 'Y',
              style: 'phrase', count: 8, melody: 'leap', shift: -12,
              view: [F2, E4], active: [A2, C4], guide: 'none', labelSwitch: true },
        ],
    });

    // チューバ：五線の 下の 加線（ひくいド・ひくいひくいファ まで）。ベースの うごき（5度・オクターブ の とび）
    MODES.bassTuba = baseMode({
        id: 'bassTuba',
        course: 'チューバ',
        deleteMessage: 'ヘおんよみ（チューバ）のデータを消去しました',
        levels: [
            ...commonLevels(),
            { label: 'Lv5 したの おと', comment: 'かせん 1本・2本', drop: 'P', answer: 'name',
              style: 'dango',
              dangos: [
                  { notes: [C2, E2, G2], chord: 'C', name: 'したの せんの おだんご（かせん 2本・かせん 1本・1ぽんめ）', intro: true },
                  { notes: [D2, F2, A2], chord: 'Dm', name: 'したの あいだの おだんご', intro: true },
              ],
              singles: [C2, D2, E2, F2, G2, A2], repeat: 2, extra: [C2, E2], dangoRepeat: 2,
              view: [C2, B3], narrowView: [C2, A3], active: [C2, A3], guide: 'all',
              hint: '下の かせん 1本は ひくいミ、2本は ひくいド。ひくいファ は 1ぽんめの すぐ下' },
            { label: 'Lv6 もっと したの おと', comment: 'かせん 3本・4本', drop: 'G', answer: 'name',
              style: 'dango',
              dangos: [
                  { notes: [F1, A1, C2], chord: 'F', name: 'もっと したの せんの おだんご（かせん 4本・3本・2本）', intro: true },
                  { notes: [G1, B1, D2], chord: 'G', name: 'もっと したの あいだの おだんご', intro: true },
              ],
              singles: [F1, G1, A1, B1, C2, D2], repeat: 2, extra: [F1, A1, F1, A1], dangoRepeat: 2,
              view: [E1, G3], narrowView: [F1, D3], active: [F1, D3], guide: 'all',
              hint: '下の かせんを かぞえよう：1本 ひくいミ、2本 ひくいド、3本 ひくいひくいラ、4本 ひくいひくいファ' },
            staffKeys('Lv7 けんばんで', 'K'),
            { label: 'Lv8 ファ〜レ', comment: 'ひくいひくいファ〜レ を けんばんで', drop: 'Y',
              style: 'single', notes: [F1, G1, A1, B1, C2, D2, E2, F2, G2, A2, B2, C3, D3, F1, A1, C2, E2], repeat: 1,
              view: [E1, E3], narrowView: [F1, D3], active: [F1, D3], guide: 'none', labelSwitch: true,
              hint: '下の かせんが ふえるほど ひくい。かせん 2本の ひくいド から、さらに 2本 で ひくいひくいラ' },
            { label: 'Lv9 ベースの うごき', comment: '5ど・オクターブ の とび を けんばんで', drop: 'S',
              style: 'bassline', count: 10,
              lines: [
                  [[C2, G2], 'C'], [[F1, C2], 'F'], [[G1, D2], 'G'], [[C3, G2], 'C'], [[F2, C2], 'F'],
                  [[G2, G1], 'G'], [[C2, C3], 'C'], [[F1, F2], 'F'], [[A1, E2], 'Am'], [[D2, A2], 'Dm'],
                  [[C2, E2, G2], 'C'], [[G1, B1, D2], 'G'], [[F1, A1, C2], 'F'],
              ],
              view: [E1, E3], narrowView: [F1, D3], active: [F1, D3], guide: 'none', labelSwitch: true,
              hint: 'チューバは ねもと と 5ど・オクターブ を いったり きたり。ひだりから じゅんばんに' },
        ],
    });
})();
