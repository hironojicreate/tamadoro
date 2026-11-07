// おんぷよみ（おんがくのへや）
//   ト音記号の 五線に 出た 音符を 読んで、その けんばんを おす（五線の絵は js/staff.js）
//   問題の進め方は js/engines/keys.js（けんばんと 同じ。display: 'staff' で カードが 五線になる）
//   はじめは けんばんに 名前を書いておく（読む ことに 集中する）。Lv5 からは 名前なしで「五線の場所 → けんばん」
//   さいしょの「しくみ」は、せつめいしながら すすむ（せんは 5ほん・ドは 下の みじかい せん・せん→あいだ→せん…・
//   ドレミファソラシド と ドシラソファミレド を つづけて）。けんばんを おすと 名前を うたう
//   音の はんいは ひくいラ（ドの 下の 2本めの みじかい せん）〜 たかいソ（5ほんめの すぐ上）
(function () {
    const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71;
    const C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79;
    const F3 = 53, A3 = 57, B3 = 59, B5 = 83;

    // データの 版を 上げたときに、うしろへ ずれた レベルの ドロップ・タイム・きろくを うつす（まえの 版 → { まえの レベル: いまの レベル }）
    //   版 3：Lv7 したの おと を 入れた。メロディ 8 → 9、きょくふう 9 → 10、オニ 10 → 11
    //   版 2：（きょくふう も まだ なかった）メロディ 8 → 9、オニ 9 → 11
    const LEVEL_MOVES = { 2: { 8: 9, 9: 11 }, 3: { 8: 9, 9: 10, 10: 11 } };

    // せんに ささった おだんご（ド・ミ・ソ）と、せんの あいだの おだんご（レ・ファ・ラ）
    const LINE_DANGO = { notes: [C4, E4, G4], chord: 'C', name: 'せんに ささった おだんご', intro: true };
    const SPACE_DANGO = { notes: [D4, F4, A4], chord: 'Dm', name: 'せんの あいだの おだんご', intro: true };

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
        dataVersion: 4,                   // レベルの ならびを かえたら 1つ 上げる（まえの ドロップ・きろくを 消す。js/app.js）
        // 版 2・3 → 4：レベルを 入れたので、うしろへ ずれた レベルの ドロップ・タイム・きろくを うつす（消さない。LEVEL_MOVES）
        upgradeData(from) {
            const moves = LEVEL_MOVES[from];
            if (!moves) return false; // それより まえの 版は 消す
            const move = (oldKey, newKey) => {
                const value = localStorage.getItem(oldKey);
                if (value === null) return;
                localStorage.setItem(newKey, value);
                localStorage.removeItem(oldKey);
            };
            // うしろの レベルから じゅんに（うつす さきを うわがき しないように）
            Object.keys(moves).map(Number).sort((a, b) => b - a).forEach(old => {
                move(`notes_coins_${old}`, `notes_coins_${moves[old]}`);
                move(`notes_level_${old}_best_time`, `notes_level_${moves[old]}_best_time`);
            });
            const log = History.getLog().map(entry =>
                (entry.mode === 'notes' && moves[entry.level] ? { ...entry, level: moves[entry.level] } : entry));
            TamaStore.writeJSON(History.LOG_KEY, log);
            return true;
        },
        bestTimePrefix: 'notes',
        menuCoinSize: '25px',
        deleteMessage: 'おんぷよみのデータを消去しました',
        rescue: { type: 'slider', max: 11 },
        maxMistakes: 5,
        perfectClear: {},
        existingCoinsLevels: [],
        texts: {
            unit: 'もん',
            clearTitle: level => `${MODES.notes.levels[level - 1].label}、クリア！`,
            best: 'これまでのさいこうは',
        },

        // しくみ → Lv1 は ドロップ1こ、オニは 5こ、ほかは 3こで つぎが ひらく
        coinsToUnlock: level => (level === 2 ? 1 : level === 11 ? 5 : 3),

        // view・active・guide・repeat は けんばんと 同じ（js/modes/keys.js）
        //   view の はしは、黒いけんばんの かたまりが かけないところ
        //   labelSwitch：名前なしの レベルに「けんばんの よみかた」スイッチ（ON で けんばんに 名前）
        //   style: 'song'：きょくふう メロディ（js/songs.js の 曲調から 8フレーズ → とおし えんそう）
        //   melody: 'leap'：とびはねる メロディと、和音の かわりかた（Am・C7・Fm）。けんばんの Lv7 は もとの まま
        //   style: 'tour'（しくみ）、'dango'（おだんご。js/engines/keys.js の keysDangoDeck）
        //     dangos：[{ notes（下から）, chord（そろったときの 和音）, name, intro（名前つきの お手本） }]
        //     singles を repeat 回 ＋ extra の 1おんと、おだんごを dangoRepeat 回ずつ
        //   sing: けんばんを おすと 名前を うたう
        levels: [
            { label: 'しくみ', comment: 'せんは 5ほん・ドから のぼって くだる', drop: 'L',
              style: 'tour', view: [F3, E5], active: [C4, C5], guide: 'all', sing: true },
            { label: 'Lv1 せんの おだんご', comment: 'ド・ミ・ソ', drop: 'M',
              style: 'dango', dangos: [LINE_DANGO], singles: [C4, E4, G4], repeat: 3, dangoRepeat: 3,
              view: [F3, B4], active: [C4, G4], guide: 'all', sing: true,
              hint: 'せんに ささった おだんご：ド（みじかい せん）・ミ（1ぽんめ）・ソ（2ほんめ）' },
            { label: 'Lv2 あいだの おだんご', comment: 'レ・ファ・ラ', drop: 'B',
              style: 'dango', dangos: [SPACE_DANGO], singles: [D4, F4, A4], repeat: 3, dangoRepeat: 3,
              view: [F3, B4], active: [C4, A4], guide: 'all', sing: true,
              hint: 'せんの あいだの おだんご：レ（ドの せんと 1ぽんめの あいだ）・ファ・ラ' },
            { label: 'Lv3 おだんご まぜ', comment: 'ド・ミ・ソ と レ・ファ・ラ', drop: 'A',
              style: 'dango', dangos: [{ ...LINE_DANGO, intro: false }, { ...SPACE_DANGO, intro: false }],
              singles: [C4, D4, E4, F4, G4, A4], repeat: 2, dangoRepeat: 2,
              view: [F3, B4], active: [C4, A4], guide: 'all', sing: true,
              hint: 'せんに ささった ド・ミ・ソ と、せんの あいだの レ・ファ・ラ。どっちの おだんご かな？' },
            { label: 'Lv4 おだんごの つづき', comment: 'シ と たかいド を たして ド〜ド', drop: 'R',
              style: 'dango',
              dangos: [
                  { notes: [C4, E4, G4, B4], chord: 'Cmaj7', name: 'せんの おだんごの つづきは シ（3ぼんめ）', intro: true },
                  { notes: [D4, F4, A4, C5], chord: 'Dm7', name: 'あいだの おだんごの つづきは たかいド', intro: true },
              ],
              singles: [C4, D4, E4, F4, G4, A4, B4, C5], repeat: 1, extra: [B4, C5, B4, C5], dangoRepeat: 2,
              // 1おんは これまでと 同じ ひびき（ド・ミ・ソ は C、レ・ファ・ラ は Dm）。シは ミ・ソ・シ、たかいドは C
              //   （4つだまの 和音 Cmaj7・Dm7 は、おだんごが そろった ときの ごほうび）
              singleChords: { [C4]: 'C', [E4]: 'C', [G4]: 'C', [D4]: 'Dm', [F4]: 'Dm', [A4]: 'Dm', [B4]: 'Em', [C5]: 'C' },
              view: [F3, E5], active: [C4, C5], guide: 'all', sing: true,
              hint: 'せんの おだんごの つぎは シ（3ぼんめ）、あいだの おだんごの つぎは たかいド' },
            { label: 'Lv5 ド〜ド', comment: 'けんばんの もじなし', drop: 'K',
              style: 'single', notes: [C4, D4, E4, F4, G4, A4, B4, C5], repeat: 2, view: [F3, E5], active: [C4, C5], guide: 'none',
              labelSwitch: true }, // こまったら「けんばんの よみかた」を ON に（けんばんに 名前が 出る）
            { label: 'Lv6 うえの おと', comment: 'うえの おだんご（たかいド〜たかいソ）', drop: 'P',
              style: 'dango',
              dangos: [
                  { notes: [B4, D5, F5], chord: 'G7', name: 'うえの せんの おだんご', intro: true },
                  { notes: [C5, E5, G5], chord: 'C', name: 'うえの あいだの おだんご', intro: true },
              ],
              singles: [B4, C5, D5, E5, F5, G5], repeat: 2, dangoRepeat: 2,
              view: [B3, B5], active: [B4, G5], guide: 'all', sing: true, // 左に くらい けんばん（まんなかの ドの あたり）
              hint: 'せんに シ・たかいレ・たかいファ（3〜5ほんめ）、あいだに たかいド・たかいミ・たかいソ（5ほんめの すぐ上）' },
            { label: 'Lv7 したの おと', comment: 'したの おだんご（ひくいラ・ひくいシ）', drop: 'G',
              style: 'dango',
              dangos: [
                  { notes: [A3, C4, E4], chord: 'Am', name: 'したの せんの おだんご', intro: true },
                  { notes: [B3, D4, F4], chord: 'G7', name: 'したの あいだの おだんご', intro: true },
              ],
              singles: [A3, B3, C4, D4, E4, F4], repeat: 2, extra: [A3, B3, A3, B3], dangoRepeat: 2,
              view: [F3, E5], active: [A3, F4], guide: 'all', sing: true,
              hint: 'ドの 下の 2本めの みじかい せんが ひくいラ、ドの せんに ぶらさがるのが ひくいシ' },
            { label: 'Lv8 メロディ', comment: '3〜4おんの がくふ', drop: 'Y',
              style: 'phrase', count: 8, melody: 'leap', view: [F3, E5], active: [A3, C5], guide: 'none' },
            { label: 'Lv9 きょくふう', comment: 'いろいろな きょくを ひこう', drop: 'C',
              style: 'song', view: [F3, B5], active: [A3, G5], guide: 'none', labelSwitch: true,
              hint: '8つの フレーズを れんしゅうしたら、さいごに ぜんぶ つなげて えんそう！' },
            { label: 'Lvオニ', comment: 'ぜんぶ まぜて・もじなし', drop: 'S',
              style: 'oni', singles: 12, phrases: 4, melody: 'leap', view: [F3, B5], active: [A3, G5], guide: 'none' },
        ],
    };
})();
