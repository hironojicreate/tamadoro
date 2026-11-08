// けんばんレッスンの進め方
//   カードに出た音（ド・レ・ミ …）の けんばんを おす。メロディは 左から じゅんばんに おす
//   まちがえても、おした けんばんの音は鳴る（なんの音を おしたか、ふきだしで見せる）
//   正解すると、その音を ふくむ和音が 小さく ポロロンと鳴る（js/sound.js の chord）
//   ドロップ・まちがいの上限・まちがえた問題をさいごにもういちど は、計算と同じ
//   くろいけんばん（js/modes/black.js）も このエンジン：
//     ♯・♭ の名前で出す（'spell'）、「ド♯ ＝ ？♭」を ボタンで こたえる（'enharmonic'）、ひっかけ（ミ♯ など）
//   おんぷよみ（js/modes/notes.js）も このエンジン：display: 'staff' で、カードの かわりに 五線の 音符（js/staff.js）
//     さいしょの「しくみ」（style: 'tour'）は、せつめいしながら すすむ（まちがえても しっぱいに ならない）。
//     sing: true の レベルは、けんばんを おすと その音の 名前を うたう（js/sing.js の「どー・れー・みー」）
//     きょくふう メロディ（style: 'song'。js/songs.js）：曲調と リズム（4/4拍子）を えらんで、8フレーズ（8小節）を 1つずつ れんしゅう →
//       （きゅうふは おさなくて いい。その 拍に なると すこし 光って みどりに）→
//       ぜんぶの がくふで さいごまで ひきとおす（ばんそうが ついてくる。じぶんの ペースで。まちがえても とまらない）→
//       ひきおわると すぐ じぶんの えんそうが 4/4拍子の マス目に そろえて 伴奏つきで ながれる →
//       「べつの きょく」「えんそうを おわる」で 拍手 → ごほうびの ドロップ（クリアの 画面は 出さない）
//     おだんご（style: 'dango'）：和音の 3つの 音を 1本の くしに さした おだんご。下から じゅんばんに おす。
//       さいしょは 名前つきの お手本（おす けんばんに ポワンポワンの わっか）。あとは 1おんの 問題と まぜる。
//       正解の 和音は、1おんの 問題も その音の おだんごの 和音（Lv1 は C、Lv2 は Dm だけ）

// メロディ（Lv7・オニ）：和音ごとに、その和音に合う 3〜4おん
//   出すときは C → F → G → C（さいごは ドで おわる）の じゅんばん
const KEYS_PHRASES = {
    C: [[60, 62, 64], [64, 62, 60], [60, 64, 67], [67, 64, 60], [64, 65, 67], [67, 65, 64], [60, 62, 64, 60], [67, 69, 67, 64]],
    F: [[65, 69, 72], [72, 69, 65], [69, 67, 65], [65, 67, 69], [69, 71, 72], [72, 71, 69], [60, 65, 69]],
    G: [[67, 69, 71], [71, 69, 67], [62, 64, 62], [67, 71, 67], [71, 72, 71]],
    G7: [[62, 65, 67], [67, 65, 62], [65, 64, 62], [71, 62, 65]],
    end: [[64, 62, 60], [67, 64, 60], [62, 64, 60], [65, 64, 62, 60], [72, 71, 72], [67, 65, 64, 60]],
};
const KEYS_PROGRESSION = ['C', 'F', 'G', 'end'];

// おんぷの しくみ（おんぷよみの さいしょ）：せんは 5ほん → ドの ばしょ → のぼる → くだる → つづけて 読む れんしゅう
//   のぼる・くだるは、音符が 1つずつ あらわれて、下に「せん」「あいだ」の ふだ
const KEYS_SCALE_UP = [60, 62, 64, 65, 67, 69, 71, 72];
const KEYS_TOUR_RUNS = {
    up: [[64, 65, 67, 69, 71], [62, 64, 65, 67], [65, 67, 69, 71, 72], [60, 62, 64, 65, 67]],
    down: [[71, 69, 67, 65, 64], [67, 65, 64, 62, 60], [72, 71, 69, 67, 65], [69, 67, 65, 64, 62]],
};

function keysTourDeck() {
    const up = KEYS_SCALE_UP;
    const down = [...up].reverse();
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const run = (notes, say, more = {}) => ({
        notes,
        say,
        chord: keysChordFor(notes[notes.length - 1]),
        key: notes.map(m => TamaNotes.lessonName(m)).join(''),
        ...more,
    });
    return [
        { type: 'lines', notes: [], key: 'せんは5ほん', chord: 'C', pause: 1800 },
        run([60], 'ドは、五線の 下に みじかい せんを 1本 たした ところ。ここから スタート！ ひかっている けんばんを おしてね',
            { tags: true, focusLedger: true, beckon: true, pause: 1300 }),
        run(up, 'のぼるよ！ せん → あいだ → せん → あいだ … と じゅんばんに', { tags: true, reveal: true, pause: 1300 }),
        run(down, 'くだるよ！ あいだ → せん → あいだ → せん … と じゅんばんに', { tags: true, reveal: true, pause: 1300 }),
        run(up, 'ド・レ・ミ・ファ・ソ・ラ・シ・ド！ つづけて 読もう'),
        run(down, 'ド・シ・ラ・ソ・ファ・ミ・レ・ド！ くだって 読もう'),
        run(pick(KEYS_TOUR_RUNS.up), 'とちゅうからでも、1つずつ のぼるよ'),
        run(pick(KEYS_TOUR_RUNS.down), 'とちゅうからでも、1つずつ くだるよ'),
    ];
}

// 1つずつ あらわれる 音符：正解の キラリンの あと、つぎが 出るまで（ミリ秒）
const KEYS_REVEAL_DELAY = 550;

// おだんご：
//   dangos：[{ notes（下から）, chord（そろったときの 和音）, name, intro（さいしょに 名前つきの お手本） }]
//   singles を repeat 回 ＋ extra（とくに おぼえたい 音を たす）の 1おんと、おだんごを dangoRepeat 回ずつ まぜる
//   singleChords：1おんの 正解の 和音を 音ごとに きめる（ないときは その音の おだんごの 和音）
function keysDangoDeck(def) {
    const names = d => d.notes.map(m => TamaNotes.lessonName(m)).join('・');
    const dango = (d, more = {}) => ({
        notes: d.notes,
        dango: true,
        chord: d.chord,
        key: `おだんご ${names(d)}`,
        say: 'おだんごを 下から じゅんばんに おしてね',
        ...more,
    });
    // 1おんの 問題も、正解の 和音は その音の おだんごの 和音（Lv2 は Dm だけ。その レベルの 音だけを おぼえる）
    const chordOf = midi => {
        if (def.singleChords && def.singleChords[midi]) return def.singleChords[midi];
        const home = def.dangos.find(d => d.notes.includes(midi));
        return home ? home.chord : keysChordFor(midi);
    };
    const items = [];
    for (let r = 0; r < def.repeat; r++) def.singles.forEach(midi => items.push({ ...keysSingle(midi), chord: chordOf(midi) }));
    (def.extra || []).forEach(midi => items.push({ ...keysSingle(midi), chord: chordOf(midi) }));
    def.dangos.forEach(d => {
        for (let i = 0; i < def.dangoRepeat; i++) items.push(dango(d));
    });
    const intros = def.dangos.filter(d => d.intro).map(d => dango(d, {
        showNames: true,
        beckon: true,
        say: `${d.name}！ 下から ${names(d)}。ひかっている けんばんを じゅんばんに おしてね`,
        pause: 1300,
    }));
    return [...intros, ...keysShuffleNoRepeat(items)];
}

// きょくふう メロディ：曲調と リズムを えらんで 8フレーズ（1フレーズ ＝ 4/4拍子の 1小節。れんしゅう）。
//   さいごの とおし えんそうは keysNextProblem で
function keysSongDeck() {
    const style = TamaSongs.pick();
    const rhythm = TamaSongs.pickRhythm(style);
    const phrases = TamaSongs.make(style, Math.random, rhythm);
    const firstRest = phrases.findIndex(phrase => phrase.rhythm.includes('○'));
    const deck = phrases.map((phrase, i) => ({
        notes: phrase.notes,
        chord: phrase.chord,
        chordName: phrase.chord,
        rhythm: phrase.rhythm,
        rests: TamaSongs.restsAfter([phrase.rhythm]),
        key: phrase.notes.map(m => TamaNotes.lessonName(m)).join(''),
        say: `${style.name}（${style.sub}）　${i + 1}/${phrases.length}ばんめの フレーズ${phrase.sabi ? '（サビ）' : ''}`
            + (i === firstRest ? '　ギザギザの きゅうふは おやすみ。おさなくて いいよ' : ''),
    }));
    deck.song = { style, rhythm, phrases };
    return deck;
}

// とおし えんそうの 問題：ぜんぶの 音を ひとつながりに（starts：フレーズの はじまりの 音の ばんごう、
//   rests：きゅうふの まえの 音の ばんごう）
function keysPerformProblem(song) {
    const notes = [];
    const starts = [];
    song.phrases.forEach(phrase => {
        starts.push(notes.length);
        notes.push(...phrase.notes);
    });
    return {
        type: 'perform', notes, starts, chords: song.phrases.map(p => p.chord), key: 'とおし えんそう',
        rests: TamaSongs.restsAfter(song.phrases.map(p => p.rhythm)),
    };
}

// きゅうふ（おやすみ）：after ばんめの 音を ひいたら（-1 は はじまったら）、その うしろの きゅうふが
//   すこし あとに 光って みどりに なる。おさなくて いい（その子の テンポでは またない）
const KEYS_REST_LIGHT = 220;

function keysLightRests(after) {
    const rests = keysLesson.run.problem.rests;
    if (!rests) return;
    let k = 0;
    rests.forEach((at, r) => {
        if (at !== after) return;
        k++;
        keysLesson.later(() => {
            const rest = document.querySelector(`#keysCards [data-r="${r}"]`);
            if (rest) rest.classList.add('on');
            const count = document.querySelector(`#keysCards [data-rc="${r}"]`); // 拍の かず（Lv8 メロディ）
            if (count) count.classList.add('on');
        }, KEYS_REST_LIGHT * k);
    });
}

// いまの きょくふう の 音色（part：'melody' けんばん・メロディ、'chord' 伴奏）。きょくふう でなければ ピアノ
function keysVoice(part) {
    const run = keysLesson.run;
    return run && run.song ? TamaSongs.soundOf(run.song.style)[part] : 'piano';
}

// sing: true の レベル：ピアノの音を すこし 小さくして、名前を うたう（白いけんばん）
function keysSingingSound(midi) {
    if (!TamaSing.canSing(midi, 'doremi')) return TamaSound.note(midi);
    const piano = TamaSound.note(midi, { gain: 0.25 });
    const voice = TamaSing.voice(midi, { kind: 'doremi' });
    return {
        release() {
            piano.release();
            voice.release();
        },
    };
}

// おんぷよみの メロディ（Lv8。melody: 'leap'）：とびはねる メロディ（どの メロディにも 3度より 大きい とび）
//   和音の じゅんばんは C → F → G（G7）→ C の くりかえし。ただし
//     ・C で おわって また C から はじまる ところ（同じ 和音が つづく）は、Am（1の和音を 6の和音に）か
//       C7（セブンス。つぎの F へ いきたくなる ひびき）に かえる
//     ・ときどき G の かわりに Fm（借用和音。F → Fm → C で すこし せつない ひびき）
//   メロディは 白いけんばんだけ（C7 の シ♭、Fm の ラ♭ は 和音の 中だけ。Fm の メロディは ファ と ド だけ）。
//   ひくいラ（57）・ひくいシ（59）も つかう（おんぷよみ Lv7 したの おと の あと）
const KEYS_LEAP_PHRASES = {
    C: [[60, 67, 64], [64, 60, 67], [67, 60, 64], [72, 67, 64], [60, 64, 72], [64, 72, 67], [60, 67, 72], [67, 64, 72]],
    F: [[65, 72, 69], [69, 65, 72], [72, 65, 69], [60, 69, 65], [65, 60, 69], [69, 72, 65], [57, 65, 60], [60, 57, 65]],
    G: [[67, 62, 71], [71, 67, 62], [62, 71, 67], [67, 71, 62], [71, 62, 67], [59, 67, 62], [62, 59, 67]],
    G7: [[65, 71, 67], [62, 67, 65], [71, 65, 62], [67, 62, 65, 71], [59, 65, 62], [65, 59, 62]],
    Am: [[69, 64, 72], [72, 64, 69], [64, 69, 72], [69, 60, 64], [60, 69, 64], [57, 64, 60], [60, 57, 64], [64, 57, 60]],
    C7: [[67, 60, 64], [72, 64, 60], [64, 67, 72], [60, 72, 67]],
    Fm: [[65, 72, 65], [72, 65, 72], [60, 65, 72], [72, 60, 65]],
    end: [[67, 64, 60], [64, 67, 60], [72, 64, 60], [60, 67, 72], [67, 64, 72], [64, 72, 60]],
};
const KEYS_LEAP_FM_RATE = 0.25; // G の かわりに Fm に なる わりあい

// melody: 'leap' の 和音の じゅんばん（count こ）
function keysLeapProgression(count) {
    const chords = [];
    for (let i = 0; i < count; i++) {
        let chord = KEYS_PROGRESSION[i % KEYS_PROGRESSION.length];
        if (chord === 'C' && i > 0) chord = Math.random() < 0.5 ? 'Am' : 'C7'; // C で おわった つぎの C
        if (chord === 'G') {
            const r = Math.random();
            chord = r < KEYS_LEAP_FM_RATE ? 'Fm' : r < 0.6 ? 'G' : 'G7';
        }
        chords.push(chord);
    }
    return chords;
}

// 1つの音に合う和音（ド・ミ・ソ → C、ファ・ラ → F、レ・シ → G。黒いけんばんは、その音が 1ばん下の 和音）
function keysChordFor(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const black = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' };
    if (black[pc]) return black[pc];
    if ([5, 9].includes(pc)) return 'F';
    if ([2, 11].includes(pc)) return 'G';
    return 'C';
}

// くろいけんばん：♯・♭ の名前 [step（ド〜シ の 0〜6）, alter（♯ 1・♭ -1）]
const KEYS_SHARPS = [[0, 1], [1, 1], [3, 1], [4, 1], [5, 1]];    // ド♯・レ♯・ファ♯・ソ♯・ラ♯
const KEYS_FLATS = [[1, -1], [2, -1], [4, -1], [5, -1], [6, -1]]; // レ♭・ミ♭・ソ♭・ラ♭・シ♭
const KEYS_TRAPS = [[2, 1], [6, 1], [3, -1], [0, -1]];            // ミ♯（＝ファ）・シ♯（＝たかいド）・ファ♭（＝ミ）・ド♭（＝ひくいシ）

const keysLesson = {
    keyboard: null,
    run: null,      // いま遊んでいるレベルの状態（やめたら null）
    timers: [],
    playback: null, // じぶんの えんそうを きいている あいだ：{ bus, timers }
    cheer: null,    // 拍手の 音の みち（マスタークラスの おわり）

    later(fn, ms) {
        const run = this.run;
        const id = setTimeout(() => {
            if (run === this.run) fn(); // そのあいだに やめた・やりなおした ときは なにもしない
        }, ms);
        this.timers.push(id);
    },

    stopTimers() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    },
};

function keysLevelDef() {
    return currentMode.levels[problemState.level - 1];
}

function keysShuffle(list) {
    return ProblemPatterns.shuffle([...list]);
}

// まぜる（同じ問題が2つ つづかないように、つづいたら まぜなおす）
function keysShuffleNoRepeat(list) {
    const hasRepeat = deck => deck.some((p, i) => i > 0 && p.key === deck[i - 1].key);
    let deck = keysShuffle(list);
    for (let tries = 0; tries < 300 && hasRepeat(deck); tries++) {
        deck = keysShuffle(list);
    }
    return deck;
}

function keysSingle(midi) {
    return { notes: [midi], chord: keysChordFor(midi), key: TamaNotes.lessonName(midi) };
}

// ♯・♭ の名前の問題（name：「ド♯」、color：もとの音の色、guide：もとの音と ←・→）
function keysSpelled([step, alter]) {
    const midi = TamaNotes.keyOf(step, alter);
    const name = TamaNotes.spellName(step, alter);
    return {
        notes: [midi],
        names: [name],
        colors: [TamaNotes.COLORS[step]],
        key: name,
        chord: keysChordFor(midi),
        guide: { base: TamaNotes.keyOf(step, 0), dir: alter > 0 ? 'right' : 'left' },
        trap: !TamaNotes.isBlack(midi), // ミ♯ などは 白いけんばん
    };
}

// 「ド♯ ＝ ？♭」（同じ けんばんの もうひとつの名前を、ド〜シ の ボタンで こたえる）
function keysEnharmonic([step, alter]) {
    const midi = TamaNotes.keyOf(step, alter);
    const given = TamaNotes.spellName(step, alter);
    const answerStep = alter > 0 ? (step + 1) % 7 : (step + 6) % 7;
    const answer = TamaNotes.spellName(answerStep, -alter);
    return {
        type: 'name',
        notes: [midi],
        names: [given],
        colors: [TamaNotes.COLORS[step]],
        given,
        accidental: alter > 0 ? '♭' : '♯',
        answerStep,
        answer,
        key: `${given}＝${answer}`,
        chord: keysChordFor(midi),
    };
}

// pool を repeat 回（count があれば、ぜんぶ1回 ＋ ばらばらに たして count こ）
function keysSpelledDeck(pool, { repeat = 1, count = 0, make = keysSpelled } = {}) {
    const items = [];
    for (let r = 0; r < repeat; r++) items.push(...pool);
    while (items.length < count) items.push(pool[Math.floor(Math.random() * pool.length)]);
    return items.map(make);
}

function keysPhrase(notes, chord) {
    return { notes, chord: chord === 'end' ? 'C' : chord, key: notes.map(m => TamaNotes.lessonName(m)).join('') };
}

// C → F → G → C の じゅんばんで count こ（G は ファの入ったメロディなら G7）
//   melody: 'leap'（おんぷよみ）は、とびはねる メロディと 和音の かわりかた（keysLeapProgression）
function keysPhraseDeck(count, melody = null) {
    const leap = melody === 'leap';
    const phrases = leap ? KEYS_LEAP_PHRASES : KEYS_PHRASES;
    const progression = leap ? keysLeapProgression(count) : null;
    const deck = [];
    for (let i = 0; i < count; i++) {
        let chord = leap ? progression[i] : KEYS_PROGRESSION[i % KEYS_PROGRESSION.length];
        if (!leap && chord === 'G' && Math.random() < 0.5) chord = 'G7';
        const choices = phrases[chord].filter(p => !deck.length || deck[deck.length - 1].key !== keysPhrase(p, chord).key);
        deck.push(keysPhrase(choices[Math.floor(Math.random() * choices.length)], chord));
    }
    if (leap) keysPhraseBars(deck);
    return deck;
}

// おんぷよみの メロディ（Lv8）：4/4拍子の 1小節に する。3おんは ●●●○（4ぶきゅうふ）、4おんは ●●●●。
//   拍の 下に 1・2・3・4。はじめて きゅうふが 出る 問題で、きゅうふの せつめい
function keysPhraseBars(deck) {
    let explained = false;
    deck.forEach(problem => {
        problem.rhythm = problem.notes.length === 3 ? '●●●○' : '●●●●';
        problem.rests = TamaSongs.restsAfter([problem.rhythm]);
        problem.counts = true;
        if (!problem.rests.length) return;
        problem.say = explained
            ? 'ひだりから じゅんばんに。ギザギザは おやすみ'
            : 'ギザギザは 4ぶきゅうふ（おやすみ）。4つめの 拍は おやすみだよ。おさなくて いいよ';
        explained = true;
    });
}

function keysBuildDeck(def) {
    if (def.style === 'free') return [];
    if (def.style === 'tour') return keysTourDeck();
    if (def.style === 'song') return keysSongDeck();
    if (def.style === 'dango') return keysDangoDeck(def);
    const pools = { sharp: KEYS_SHARPS, flat: KEYS_FLATS, both: [...KEYS_SHARPS, ...KEYS_FLATS] };
    if (def.style === 'spell') return keysShuffleNoRepeat(keysSpelledDeck(pools[def.pool], def));
    if (def.style === 'enharmonic') return keysShuffleNoRepeat(keysSpelledDeck(pools[def.pool], { ...def, make: keysEnharmonic }));
    if (def.style === 'black-oni') {
        // pool から ばらばらに n こ
        const pick = (pool, n) => {
            const out = [];
            while (out.length < n) out.push(...keysShuffle(pool));
            return out.slice(0, n);
        };
        return keysShuffleNoRepeat([
            ...pick(pools.both, def.spells).map(keysSpelled),
            ...pick(pools.both, def.names).map(keysEnharmonic),
            ...pick(KEYS_TRAPS, def.traps).map(keysSpelled),
        ]);
    }
    if (def.style === 'phrase') return keysPhraseDeck(def.count, def.melody);
    if (def.style === 'oni') {
        const whites = TamaNotes.whiteKeys(def.active[0], def.active[1]);
        const singles = [];
        while (singles.length < def.singles) {
            keysShuffle(whites).forEach(midi => { if (singles.length < def.singles) singles.push(keysSingle(midi)); });
        }
        return keysShuffleNoRepeat([...singles, ...keysPhraseDeck(def.phrases, def.melody)]);
    }
    const deck = [];
    for (let r = 0; r < def.repeat; r++) {
        def.notes.forEach(midi => deck.push(keysSingle(midi)));
    }
    return keysShuffleNoRepeat(deck);
}

// オニ：見せる けんばんの はしを 毎回ずらす
//   どれも 黒いけんばんは 10こ（かたまりが 3・2・3・2 か 2・3・2・3 で、はしで かけない）。
//   ドが 左はしに こないように、ドからは はじめない
const KEYS_ONI_VIEWS = [
    [53, 76], // ファ〜ミ（白14こ）
    [52, 76], // ミ〜ミ（白15こ）
    [53, 77], // ファ〜ファ（白15こ）
    [59, 83], // シ〜シ（白15こ）
];

function keysOniView() {
    const previous = keysLesson.run && keysLesson.run.view;
    const choices = KEYS_ONI_VIEWS.filter(v => !previous || v[0] !== previous[0] || v[1] !== previous[1]);
    return choices[Math.floor(Math.random() * choices.length)];
}


// ---------- レベルの開始 ----------

function keysStartLevel(level) {
    keysStopLevel();
    problemState.level = level;
    problemState.isWeakChallenge = false;
    problemState.isSpecialCourse = false;
    const def = keysLevelDef();

    restoreCoins(level); // これまでのドロップを右上に

    const run = {
        def,
        deck: keysBuildDeck(def),
        index: 0,             // 何問目まで出したか
        reviewQueue: [],      // まちがえた問題（さいごにもういちど）
        isReview: false,
        problem: null,
        pos: 0,               // メロディの 何おんめか
        accepting: false,     // こたえを うけつけているか
        presses: 0,           // おとあそびで ならした回数
        song: null,           // きょくふう メロディ：{ style, rhythm, phrases }
        performed: false,     // とおし えんそうを はじめたか
        finished: false,
        paused: false,        // とちゅうで手をとめた（1問に長くかかった）か
    };
    run.song = run.deck.song || null;
    keysLesson.run = run;
    problemState.patterns = run.deck;
    problemState.mistakeMade = false;
    problemState.mistakeCount = 0;
    problemState.levelMistakes = 0;
    problemState.correctStreak = 0;
    problemState.mistakes = [];

    if (!keysLesson.keyboard) {
        keysLesson.keyboard = new TamaKeyboard(document.getElementById('keysKeyboard'), { onPress: keysOnPress });
    }
    keysLesson.keyboard.glide = def.style === 'free';
    // きょくふう は 曲調の 音色（けんばん ＝ メロディの 音色）
    const voice = keysVoice('melody');
    keysLesson.keyboard.sound = def.sing ? keysSingingSound : midi => TamaSound.note(midi, { voice });
    if (def.sing) {
        // うたう 声を さきに つくっておく（まんなかの ドの ちかくから）
        const whites = TamaNotes.whiteKeys(def.active[0], def.active[1]);
        TamaSing.prepare(whites.sort((a, b) => Math.abs(a - 66) - Math.abs(b - 66)), 'doremi');
    }
    keysRenderKeyboard(def.view || keysOniView());

    document.getElementById('keysHint').textContent = def.hint || '';
    // けんばんの よみかた：名前なしの レベルでも、スイッチを ON に すると 名前が 出る（はじめは いつも OFF）
    document.getElementById('keysHelp').style.display = def.labelSwitch ? 'block' : 'none';
    document.getElementById('keysHelpCheckbox').checked = false;

    if (def.style === 'free') {
        keysShowFree();
        run.accepting = true;
        startTimer();
        return;
    }

    if (def.vanish) {
        // まほうで 名前が きえる（それから はじめる）
        keysShowMessage('まほうを かけるよ……');
        keysLesson.later(() => {
            keysLesson.keyboard.vanishLabels(def.vanish);
            const names = def.vanish.map(m => TamaNotes.lessonName(m)).join('と ');
            keysShowMessage(`${names}の もじが きえちゃった！`);
        }, 900);
        keysLesson.later(() => {
            run.vanished = true;
            startTimer();
            keysNextProblem();
        }, 2600);
        return;
    }

    startTimer();
    keysNextProblem();
}

function keysRenderKeyboard(view) {
    const def = keysLesson.run.def;
    keysLesson.run.view = view;
    const vanished = keysLesson.run.vanished ? def.vanish || [] : [];
    keysLesson.keyboard.render({
        from: view[0],
        to: view[1],
        activeFrom: def.active[0],
        activeTo: def.active[1],
        label: midi => keysShowLabels(def) && midi >= def.active[0] && midi <= def.active[1] && !vanished.includes(midi),
    });
}

// けんばんに 名前を 書くか（名前ありの レベル、または「けんばんの よみかた」が ON）
function keysShowLabels(def) {
    return def.guide === 'all' || (!!def.labelSwitch && document.getElementById('keysHelpCheckbox').checked);
}

// けんばんの おおきさ（右上の スライダー）：けんばんを はばも たかさも そのまま 大きく・小さく（はしは 見きれて よい）。
//   上の 文字・がくふは けんばんの 上の はしに あわせて 上下する（CSS の --keys-zoom）。つもった ドロップも いっしょに 上下。
//   きめた おおきさは おぼえておく
const keysZoom = {
    KEY: 'tamadoro.keys.zoom',
    MIN: 0.6,
    MAX: 1.8,

    get() {
        const value = Number(TamaStore.readJSON(this.KEY, 1));
        return Number.isFinite(value) ? Math.min(this.MAX, Math.max(this.MIN, value)) : 1;
    },

    apply(value, save = true) {
        const keyboard = document.getElementById('keysKeyboard');
        const before = keyboard.getBoundingClientRect().top;
        document.getElementById('keysScreen').style.setProperty('--keys-zoom', value);
        document.getElementById('keysZoom').value = value;
        if (save) TamaStore.writeJSON(this.KEY, value);
        const shift = keyboard.getBoundingClientRect().top - before;
        if (shift) {
            document.querySelectorAll('.coin.keys-pile').forEach(coin => {
                coin.style.top = `${parseFloat(coin.style.top) + shift}px`;
            });
        }
    },
};

keysZoom.apply(keysZoom.get(), false);
document.getElementById('keysZoom').addEventListener('input', event => keysZoom.apply(Number(event.target.value)));

document.getElementById('keysHelpCheckbox').addEventListener('change', () => {
    const run = keysLesson.run;
    if (run && run.view) keysRenderKeyboard(run.view);
});

function keysRetryLevel() {
    document.getElementById('completionModal').style.display = 'none';
    document.getElementById('mistakeModal').style.display = 'none';
    clearCoinsOnDOM();
    keysStartLevel(problemState.level);
}

// やめるとき（はじめにもどる・ほかの画面へ）
function keysStopLevel() {
    keysStopPlayback();
    if (keysLesson.cheer) {
        keysLesson.cheer.disconnect(); // 拍手の とちゅうで やめたら 拍手も けす
        keysLesson.cheer = null;
    }
    keysAccomp.halt();
    keysLesson.stopTimers();
    keysLesson.run = null;
    if (keysLesson.keyboard) {
        keysLesson.keyboard.releaseAll();
        keysLesson.keyboard.clearGuide();
    }
    document.getElementById('keysAnswers').innerHTML = '';
}


// ---------- 問題 ----------

function keysNextProblem() {
    const run = keysLesson.run;
    if (run.index < run.deck.length) {
        run.problem = run.deck[run.index];
        run.index++;
        run.isReview = false;
    } else if (run.reviewQueue.length > 0) {
        run.problem = run.reviewQueue.shift();
        run.isReview = true;
    } else if (run.song && !run.performed) {
        run.problem = keysPerformProblem(run.song);
        run.performed = true;
        run.isReview = false;
    } else {
        keysFinish();
        return;
    }
    run.pos = 0;
    problemState.mistakeMade = false;
    problemState.problemStartedAt = Date.now();
    if (run.def.style === 'oni' && !run.def.view) {
        keysRenderKeyboard(keysOniView()); // けんばんの オニは 毎回 けんばんの場所が かわる
    }
    keysUpdateRemaining();
    keysShowCards();
    keysLightRests(-1); // 1拍めが きゅうふの 小節（ずらす リズム）
    // ♯・♭ の ガイド：もとの音を 光らせて、みぎどなり（→）・ひだりどなり（←）
    keysLesson.keyboard.clearGuide();
    if (run.def.arrow && run.problem.guide) {
        keysLesson.keyboard.guide(run.problem.guide.base, run.problem.guide.dir === 'right' ? '→' : '←');
    }
    // しくみの さいしょの ド：おす けんばんに ポワンポワン 光る わっか（どこを おせば いいか まよわない）
    if (run.problem.beckon) {
        keysLesson.keyboard.beckon(run.problem.notes[0]);
    }
    run.accepting = true;
    if (run.problem.type === 'perform') keysPerformIntro(); // イントロの あいだは うけつけない
}

function keysUpdateRemaining() {
    const run = keysLesson.run;
    if (run.problem && run.problem.type === 'perform') {
        document.getElementById('keysRemaining').textContent = `とおし えんそう！ ${run.song.style.name}・${TamaSongs.RHYTHMS[run.song.rhythm].name}`;
        return;
    }
    const remaining = run.deck.length - run.index + run.reviewQueue.length + 1;
    document.getElementById('keysRemaining').textContent = `のこり${remaining}${currentMode.texts.unit}`
        + (run.isReview ? '（もういちど！）' : '');
}


// ---------- カード ----------

// 音の名前を、ぷっくり文字の SVG に（「たかいド」は、小さい「たかい」と大きい「ド」）
//   name・color を わたすと その名前で（くろいけんばんの「ド♯」「？♭」など）
function keysNameSVG(midi, size = 'big', name = TamaNotes.lessonName(midi), color = TamaNotes.color(midi)) {
    const high = name.startsWith('たかい');
    const main = high ? name.slice(3) : name;
    const fontSize = main.length > 2 ? 56 : main.length > 1 ? 74 : 92;
    const y = high ? 112 : 98;
    const layers = `
        <text x="80" y="${y}" font-size="${fontSize}" stroke="#2d3436" stroke-width="12" stroke-linejoin="round" fill="none">${main}</text>
        <text x="80" y="${y}" font-size="${fontSize}" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" fill="${color}">${main}</text>
        <text x="80" y="${y - 2}" font-size="${fontSize}" fill="url(#keys-gloss)">${main}</text>`;
    const top = high
        ? `<text x="80" y="34" font-size="26" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" fill="${color}" paint-order="stroke">たかい</text>`
        : '';
    return `<svg class="keys-name ${size}" viewBox="0 0 160 130" aria-label="${name}" role="img">
        <g font-family="'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', sans-serif" font-weight="900" text-anchor="middle">${top}${layers}</g>
    </svg>`;
}

function keysShowCards() {
    const run = keysLesson.run;
    const problem = run.problem;
    const cards = document.getElementById('keysCards');
    const answers = document.getElementById('keysAnswers');
    const notes = problem.notes;
    const name = i => (problem.names ? problem.names[i] : TamaNotes.lessonName(notes[i]));
    const color = i => (problem.colors ? problem.colors[i] : TamaNotes.color(notes[i]));
    answers.innerHTML = '';

    if (problem.type === 'name') {
        // 「ド♯ ＝ ？♭」：？の ところを、ド〜シ の ボタンで こたえる
        cards.className = 'keys-cards enharmonic';
        cards.innerHTML = `<div class="keys-card">${keysNameSVG(notes[0], 'big', name(0), color(0))}</div>
            <div class="keys-equal">＝</div>
            <div class="keys-card keys-question" data-i="0">${keysNameSVG(notes[0], 'big', `？${problem.accidental}`, '#ff2929')}</div>`;
        answers.innerHTML = TamaNotes.NAMES.map((n, step) =>
            `<button type="button" class="keys-answer" data-step="${step}" style="color: ${TamaNotes.COLORS[step]}">${n}${problem.accidental}</button>`).join('');
        answers.querySelectorAll('.keys-answer').forEach(button => {
            button.addEventListener('click', () => keysOnName(Number(button.dataset.step), button));
        });
        keysShowMessage('おなじ けんばんの、もうひとつの なまえは？');
        return;
    }

    if (problem.type === 'perform') {
        // ぜんぶの がくふ（せまい 画面は 1だんに 2フレーズ）
        const perRow = window.innerWidth < 700 ? 2 : 4;
        cards.className = 'keys-cards staff phrase score';
        cards.innerHTML = `<div class="keys-card staff-card score-card">${TamaStaff.score(run.song.phrases, { perRow })}</div>`;
        return; // せつめいは イントロ（keysPerformIntro）
    }

    if (problem.type === 'lines') {
        keysShowLines();
        keysShowMessage('せんは なんぼん？ 1ぽんめ（いちばん下の せん）から じゅんばんに タッチして かぞえよう');
        return;
    }

    if (currentMode.display === 'staff') {
        // おんぷよみ：五線の 音符（メロディは 左から じゅんばんに。いま 読む音符が ピンク）
        cards.className = `keys-cards staff ${notes.length > 1 ? 'phrase' : 'single'}${run.def.style === 'tour' ? ' tour' : ''}`;
        const options = { reveal: problem.reveal, tags: problem.tags, focusLedger: problem.focusLedger, dango: problem.dango, names: problem.showNames, chordName: problem.chordName, rhythm: problem.rhythm, counts: problem.counts };
        cards.innerHTML = `<div class="keys-card staff-card">${TamaStaff.svg(notes, options)}</div>`;
        keysShowMessage(problem.say || (notes.length > 1 ? 'ひだりから じゅんばんに おしてね' : 'この おんぷは どの けんばん？'));
        return;
    }

    cards.className = `keys-cards ${notes.length > 1 ? 'phrase' : 'single'}`;
    cards.innerHTML = notes.map((midi, i) =>
        `<div class="keys-card${i === 0 ? ' current' : ''}" data-i="${i}">${keysNameSVG(midi, 'big', name(i), color(i))}</div>`).join('');
    keysShowMessage(notes.length > 1 ? 'ひだりから じゅんばんに おしてね' : '');
}

// おんぷの しくみ：五線の せんを 下から かぞえる（run.pos 本め まで かぞえた）
function keysShowLines() {
    const run = keysLesson.run;
    const cards = document.getElementById('keysCards');
    cards.className = 'keys-cards staff lines';
    cards.innerHTML = `<div class="keys-card staff-card">${TamaStaff.svg([], { countLines: run.pos })}</div>`;
    cards.querySelectorAll('.staff-line-hit').forEach(hit => {
        hit.addEventListener('pointerdown', event => {
            event.preventDefault();
            keysOnLine(Number(hit.dataset.line));
        });
    });
}

// せんの 音（下から ミ・ソ・シ・たかいレ・たかいファ）
const KEYS_LINE_NOTES = [64, 67, 71, 74, 77];
const KEYS_LINE_COUNTS = TamaStaff.LINE_COUNTS; // 1ぽんめ・2ほんめ・3ぼんめ・4ほんめ・5ほんめ

function keysOnLine(number) {
    const run = keysLesson.run;
    if (!run || !run.accepting || run.problem.type !== 'lines') return;
    if (number !== run.pos + 1) {
        keysShowMessage(number <= run.pos
            ? `そこは もう かぞえたよ。つぎは ${KEYS_LINE_COUNTS[run.pos]}（その上の せん）`
            : `${KEYS_LINE_COUNTS[run.pos]}は ${run.pos === 0 ? 'いちばん下の せん' : 'その上の せん'}だよ`);
        return;
    }
    run.pos++;
    TamaSound.note(KEYS_LINE_NOTES[number - 1]).release();
    keysShowLines();
    if (run.pos < 5) {
        keysShowMessage(`${KEYS_LINE_COUNTS[run.pos - 1]}！ つぎは その上の せん`);
        return;
    }
    keysShowMessage('5ほんめ！ せんは 5ほん。この 5ほんの せんを 五線（ごせん）と いうよ');
    keysSolved();
}

// sub：2だんめに 小さく（えんそうの とくちょう など）
function keysShowMessage(text, sub = '') {
    const message = document.getElementById('keysMessage');
    message.textContent = text;
    if (sub) {
        const line = document.createElement('span');
        line.className = 'keys-message-sub';
        line.textContent = sub;
        message.appendChild(line);
    }
}

function keysShowFree() {
    const run = keysLesson.run;
    const cards = document.getElementById('keysCards');
    cards.className = 'keys-cards free';
    const notes = Array.from({ length: run.def.presses }, (_, i) =>
        `<span class="keys-free-note${i < run.presses ? ' on' : ''}">♪</span>`).join('');
    cards.innerHTML = `<div class="keys-free-notes">${notes}</div>`;
    keysShowMessage(run.presses === 0 ? 'すきな けんばんを おしてみよう！' : `あと ${run.def.presses - run.presses}かい！`);
    document.getElementById('keysRemaining').textContent = '';
}


// ---------- けんばんを おしたとき ----------

function keysOnPress(midi, inRange) {
    const run = keysLesson.run;
    const keyboard = keysLesson.keyboard;
    if (!run || run.finished) return;

    if (run.def.style === 'free') {
        keyboard.balloon(midi, TamaNotes.namesOf(midi).join('／'));
        if (!run.accepting) return;
        run.presses++;
        keysShowFree();
        if (run.presses >= run.def.presses) {
            run.accepting = false;
            keysLesson.later(keysFinish, 700);
        }
        return;
    }

    if (!run.accepting) return; // つぎの問題を じゅんびしているあいだは、鳴るだけ
    if (run.problem.type === 'name') return; // 「ド♯ ＝ ？♭」は ボタンで こたえる（けんばんは 鳴るだけ）
    if (run.problem.type === 'lines') return; // せんを かぞえている あいだは 鳴るだけ

    if (!inRange) {
        keyboard.balloon(midi, 'あかるい けんばんで さがしてね', { color: '#555', ms: 1300 });
        return;
    }

    if (run.problem.type === 'perform') {
        keysOnPerform(midi);
        return;
    }

    const expected = run.problem.notes[run.pos];
    if (midi === expected) {
        keyboard.mark(midi, 'ok');
        if (run.problem.beckon) keyboard.clearGuide(); // 「ここを おしてね」の わっかを けす
        // カード（または 五線の 音符）を「読みおわり」に して、つぎを「いま」に。五線の 音符は キラリンと 光る
        const card = document.querySelector(`#keysCards [data-i="${run.pos}"]`);
        if (card) {
            card.classList.remove('current', 'next');
            card.classList.add('done', 'sparkle');
        }
        keysLightRests(run.pos);
        run.pos++;
        if (run.pos < run.problem.notes.length) {
            const showNext = () => {
                const next = document.querySelector(`#keysCards [data-i="${run.pos}"]`);
                if (next) {
                    next.classList.remove('next', 'hidden'); // かくしていた 音符も あらわれる
                    next.classList.add('current');
                }
                // お手本：わっかも つぎの けんばんへ
                if (run.problem.beckon) keyboard.beckon(run.problem.notes[run.pos]);
            };
            if (run.problem.reveal) {
                // 1つずつ あらわれる ときは、キラリンを 見てから つぎの 音符（おした音が つぎの 音符だと まちがえない）
                run.accepting = false;
                keysLesson.later(() => {
                    showNext();
                    run.accepting = true;
                }, KEYS_REVEAL_DELAY);
            } else {
                showNext();
            }
            return;
        }
        keysShowBothNames(midi);
        keysSolved();
    } else {
        keyboard.mark(midi, 'ng');
        keyboard.balloon(midi, `${TamaNotes.lessonName(midi)}だよ`);
        if (run.def.style === 'tour') {
            // しくみ：まちがえても しっぱいに しない（どこを 見るかを おしえる）
            const where = TamaStaff.onLine(expected) ? 'せんの 上' : 'せんの あいだ';
            keysShowMessage(`ざんねん！ ピンクの おんぷは ${where}。けんばんの もじも 見てね`);
            return;
        }
        const correct = run.problem.names ? run.problem.names[run.pos] : TamaNotes.lessonName(expected);
        keysMistake(TamaNotes.lessonName(midi), correct);
    }
}

// ---------- とおし えんそう（きょくふう メロディ） ----------
//   まちがえても とまらない（すすまないだけ）。フレーズの はじめの 音で、その フレーズの 和音が ついてくる

function keysOnPerform(midi) {
    const run = keysLesson.run;
    const problem = run.problem;
    const keyboard = keysLesson.keyboard;
    const expected = problem.notes[run.pos];
    if (midi !== expected) {
        keyboard.mark(midi, 'ng');
        keyboard.balloon(midi, `${TamaNotes.lessonName(midi)}だよ`);
        run.takeWrongs.push(midi); // きくときに かざりの 音に する
        return;
    }
    keyboard.mark(midi, 'ok');
    // ひいた きろく（きくときに ゆれ・ため・かざりの 音に する。TamaSongs.expressive）
    run.take.push({ t: performance.now(), wrongs: run.takeWrongs.slice(-2) });
    run.takeWrongs = [];
    const phrase = problem.starts.indexOf(run.pos);
    if (phrase >= 0) keysAccomp.play(problem.chords[phrase]); // その 小節の 和音が つぎの 小節まで 鳴りつづける
    keysAccomp.poke();
    const note = document.querySelector(`#keysCards [data-i="${run.pos}"]`);
    if (note) {
        note.classList.remove('current', 'next');
        note.classList.add('done', 'sparkle');
    }
    keysLightRests(run.pos);
    run.pos++;
    if (run.pos < problem.notes.length) {
        const next = document.querySelector(`#keysCards [data-i="${run.pos}"]`);
        if (next) {
            next.classList.remove('next');
            next.classList.add('current');
            // つぎの 音が ある だんを 見えるところへ
            const row = next.closest('svg');
            if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        return;
    }
    keysPerformDone();
}

// ひきおわった：えんそうの とくちょうを ほめて、すぐに じぶんの えんそうが ながれる（イントロなし。さいごは アウトロで しめくくる）。
//   ボタンは「この きょくを もういちど」（同じ 曲を イントロから ひきなおす）・「べつの きょく」・「えんそうを おわる」。
//   「べつの きょく」「えんそうを おわる」は、拍手の あと ごほうびの ドロップ（クリアの 画面は 出さない）→
//   べつの きょくで マスタークラスを はじめから／レベルを えらぶ 画面へ
const KEYS_AUTO_PLAYBACK = 0.6; // ひきおわって から ながれる までの びょう

function keysPerformDone() {
    const run = keysLesson.run;
    run.accepting = false;
    const style = run.song.style;
    keysAccomp.stop();
    const { traits } = TamaSongs.expressive(run.song.phrases, run.take, keysBeat());
    keysShowMessage(`えんそう おわり！ ${style.name}（${style.sub}）を ひけたよ！`, `${TamaSongs.traitWords(traits).join('・')} ♪`);
    const answers = document.getElementById('keysAnswers');
    answers.innerHTML = `
        <button type="button" class="keys-perform-button again">この きょくを もういちど</button>
        <button type="button" class="keys-perform-button another">べつの きょく</button>
        <button type="button" class="keys-perform-button finish">えんそうを おわる</button>`;
    answers.querySelector('.again').addEventListener('click', keysPerformAgain);
    answers.querySelector('.another').addEventListener('click', () => keysPerformFinish('another'));
    answers.querySelector('.finish').addEventListener('click', () => keysPerformFinish('menu'));
    const round = run.round;
    keysLesson.later(() => { if (run.round === round && !keysLesson.playback) keysPlayback(); }, KEYS_AUTO_PLAYBACK * 1000);
}

// 「べつの きょく」（next: 'another'）・「えんそうを おわる」（next: 'menu'）：
//   きくのを とめて 拍手 → ごほうびの ドロップが とんでくる → つぎへ
const KEYS_DROP_LANDING = 1400; // ドロップが 右上に おさまる までの ミリびょう（js/drops.js の createRewardCoin）

function keysPerformFinish(next) {
    const run = keysLesson.run;
    keysStopPlayback();
    document.getElementById('keysAnswers').innerHTML = ''; // 2かい おせないように
    run.round = (run.round || 0) + 1;                       // まだ ながれていない「じぶんの えんそう」も ながさない
    keysShowMessage('パチパチパチ…！ すてきな えんそうだったね！');
    const bus = TamaSound.bus();
    keysLesson.cheer = bus;
    const seconds = TamaSound.applause({ bus });
    keysLesson.later(() => {
        keysRecordClear(); // ドロップを もらう（クリアの 画面は 出さない）
        keysLesson.later(() => {
            if (next === 'another') {
                clearCoinsOnDOM();
                keysStartLevel(problemState.level); // あたらしい 曲で はじめから
            } else {
                returnMenu(); // レベルを えらぶ 画面へ
            }
        }, KEYS_DROP_LANDING);
    }, seconds * 1000);
}

// この きょくを もういちど：同じ 曲で イントロ（カウント）から ひきなおす
function keysPerformAgain() {
    const run = keysLesson.run;
    keysStopPlayback();
    document.getElementById('keysAnswers').innerHTML = '';
    run.pos = 0;
    keysShowCards(); // がくふを はじめの ようすに
    const first = document.querySelector('#keysCards .score-row');
    if (first && first.scrollIntoView) first.scrollIntoView({ block: 'nearest' });
    keysPerformIntro();
}

// ---------- とおし えんそうの 伴奏（つづく 伴奏・イントロ・アウトロ） ----------
//   つづく 伴奏：小節の さいしょの 音を ひくと その 小節の 和音が 鳴りはじめ、つぎの 小節まで 鳴りつづける（まって くれる）。
//     のびる 音色（ストリングス・オルガン・しゃくはち）は のばす（6びょうごとに そっと 鳴らしなおす）。
//     きえる 音色（ピアノ・エレピ・ピコピコ・オルゴール）は 曲の はやさで ゆっくり 分散和音（ド・ミ・ソ・ミ …）。
//     keysAccomp.idle びょう だれも ひかないと きえる
//   イントロ：伴奏だけで 2小節（1小節め：曲の さいごの 2つの 和音、2小節め：はじめの 和音と カウント 1・2・3・4）→「さあ どうぞ！」
//   アウトロ：しめくくりの 1小節（下属和音 → 主和音「アーメン」。主和音で 分散和音を かけあがる）。じぶんの えんそうを きく の さいご
const KEYS_INTRO_BEATS = 8;  // イントロは 2小節

const keysAccomp = {
    bus: null,      // 伴奏・イントロ・アウトロの 音の みち（ほかの 画面へ いくと まとめて きる）
    chord: null,    // いま 鳴らしている 和音
    voices: [],     // いま のばしている 音（release で とめる）
    timers: [],
    idleTimer: null,
    idle: 20,       // これだけ ひかないと きえる（びょう）

    output() {
        if (!this.bus) this.bus = TamaSound.bus();
        return this.bus;
    },

    later(fn, seconds) {
        this.timers.push(setTimeout(fn, seconds * 1000));
    },

    // その 和音を 鳴らしはじめる（同じ 和音なら そのまま）
    play(chord) {
        if (chord === this.chord) return;
        this.stop();
        this.chord = chord;
        const voice = keysVoice('chord');
        const spec = TamaSound.VOICES[voice];
        const notes = TamaSound.CHORDS[chord] || [];
        const bus = this.output();
        if (spec && !spec.pluck && spec.fade === null) {
            // のびる 音色：のばす（とぎれないように 6びょうごとに 鳴らしなおす）
            const pad = first => {
                const old = this.voices;
                this.voices = notes.map((midi, i) => TamaSound.note(midi, { voice, gain: 0.16, when: 0.01 + (first ? i * 0.02 : 0), hold: 0.05, bus }));
                old.forEach(v => v.release());
                this.later(() => { if (this.chord === chord) pad(false); }, 6);
            };
            pad(true);
        } else {
            // きえる 音色：ポロロンと 鳴らして、曲の はやさで ゆっくり 分散和音
            TamaSound.chord(chord, { when: 0.01, gain: 0.18, strum: 0.02, voice, bus });
            const order = notes.length > 3 ? [0, 1, 2, 3, 2, 1] : [0, 1, 2, 1];
            const beat = keysBeat();
            let k = 0;
            const step = () => {
                if (this.chord !== chord) return;
                TamaSound.note(notes[order[k % order.length]] + 12, { voice, gain: 0.09, when: 0.01, bus }).release();
                k++;
                this.later(step, beat);
            };
            this.later(step, beat);
        }
        this.poke();
    },

    // ひいた：しばらく ひかないと きえる タイマーを やりなおす
    poke() {
        clearTimeout(this.idleTimer);
        if (this.chord) this.idleTimer = setTimeout(() => this.stop(), this.idle * 1000);
    },

    // いまの 和音を とめる（音色の きえかたで すっと きえる）
    stop() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
        clearTimeout(this.idleTimer);
        this.voices.forEach(v => v.release());
        this.voices = [];
        this.chord = null;
    },

    // ぜんぶ とめる（ほかの 画面へ・やりなおし。まだ 鳴っていない イントロ・アウトロも）
    halt() {
        this.stop();
        if (this.bus) this.bus.disconnect();
        this.bus = null;
    },
};

// いまの きょくふう の 1拍の 秒
function keysBeat() {
    const run = keysLesson.run;
    return 60 / TamaSongs.RHYTHMS[run && run.song ? run.song.rhythm : 'utau'].tempo;
}

// アウトロに つかう 和音：下属和音（主和音の 4度 上。曲の 中に あれば その 和音、なければ F か Dm）と 主和音（さいごの 和音）
function keysCadence(style) {
    const tonic = style.chords[style.chords.length - 1];
    const root = TamaSongs.parse(tonic).root;
    const sub = style.chords.find(c => TamaSongs.parse(c).root === (root + 5) % 12) || (style.key === 'Am' ? 'Dm' : 'F');
    return { sub, tonic };
}

// イントロの 1小節め（曲の さいごの 2つの 和音）を at びょうから 鳴らす。2小節めの カウントは 小さな カチッ
function keysIntroSounds(bus, at) {
    const run = keysLesson.run;
    const chords = run.song.style.chords;
    const beat = keysBeat();
    const voice = keysVoice('chord');
    [chords[chords.length - 2], chords[chords.length - 1]].forEach((chord, i) => {
        const when = at + i * 2 * beat;
        TamaSound.chord(chord, { when, gain: 0.17, strum: 0.02, bus, voice, hold: 2 * beat * 0.95 });
        TamaSound.note(TamaSongs.chordNotes(chord)[0] - 12, { when, gain: 0.26, bus, voice, hold: 2 * beat * 0.95 }).release();
    });
    const ctx = TamaSound.live();
    if (ctx) for (let k = 0; k < 4; k++) TamaSound.click(ctx.currentTime + at + (4 + k) * beat, k === 0, bus);
}

// アウトロ（at びょうから）。おわるまでの びょうを かえす
function keysOutro(bus, at) {
    const run = keysLesson.run;
    const { sub, tonic } = keysCadence(run.song.style);
    const beat = keysBeat();
    const voice = keysVoice('chord');
    TamaSound.chord(sub, { when: at, gain: 0.18, strum: 0.03, bus, voice, hold: 2 * beat * 0.95 });
    TamaSound.note(TamaSongs.chordNotes(sub)[0] - 12, { when: at, gain: 0.26, bus, voice, hold: 2 * beat * 0.95 }).release();
    const end = at + 2 * beat;
    TamaSound.chord(tonic, { when: end, gain: 0.24, strum: 0.05, bus, voice, hold: 1.8 });
    TamaSound.note(TamaSongs.chordNotes(tonic)[0] - 12, { when: end, gain: 0.3, bus, voice, hold: 1.8 }).release();
    const tones = TamaSongs.chordWhites(tonic).filter(m => m >= 67).slice(0, 4);
    tones.forEach((midi, i) => TamaSound.note(midi, { gain: 0.3, when: end + 0.1 + i * 0.09, bus, voice: keysVoice('melody') }).release());
    return end + 1.2;
}

// とおし えんそうの はじまり：イントロ（2小節）→「さあ どうぞ！」。イントロの あいだは けんばんを うけつけない
function keysPerformIntro() {
    const run = keysLesson.run;
    const style = run.song.style;
    const beat = keysBeat();
    const at = 0.3;
    run.accepting = false;
    run.round = (run.round || 0) + 1; // なんかいめの とおし えんそうか（まえの 回の よやくを うごかさない）
    run.take = [];       // ひいた きろく（音ごとの 時刻と、その まえに まちがえた 音）
    run.takeWrongs = [];
    keysAccomp.halt();
    keysIntroSounds(keysAccomp.output(), at);
    keysShowMessage('♪ イントロ ♪ よく きいてね');
    keysLesson.later(() => keysAccomp.play(style.chords[0]), (at + 4 * beat) * 1000);
    for (let k = 0; k < 4; k++) {
        keysLesson.later(() => keysShowMessage(`${'・'.repeat(k)}${k + 1}`), (at + (4 + k) * beat) * 1000);
    }
    keysLesson.later(() => {
        run.accepting = true;
        keysShowMessage(`さあ どうぞ！ ${style.sub}を さいごまで ひこう。じぶんの ペースで いいよ`);
    }, (at + KEYS_INTRO_BEATS * beat) * 1000);
}

// じぶんの えんそうを きく：イントロなしで すぐ 曲 → アウトロ。はやさは リズムの tempo。
//   メロディは 4/4拍子の マス目を もとに、ひいた ときの ずれを ゆれ（ルバート）に、つっかえを ため（フェルマータ）に、
//   まちがえた 音を かざりの 音に（TamaSongs.expressive）。ミスでは なく えんそうの 味として
//   伴奏：1拍めに 和音と ひくい 音（ベース）、3拍めに 小さく 和音と ベース。ためでは 伴奏が そっと 分散和音で まつ。
//   音符・きゅうふは その 拍で 光る。ボタン（もういちど・べつの きょく・えんそうを おわる）や ほかの 画面で 止まる
const PLAYBACK_START = 0.3; // 何秒 あとから

function keysPlayback() {
    const run = keysLesson.run;
    if (!run || !run.song) return;
    if (keysLesson.playback) {
        keysStopPlayback(); // ながれている ときは とめる
        return;
    }
    const playback = { bus: TamaSound.bus(), timers: [] };
    keysLesson.playback = playback;
    const later = (fn, seconds) => playback.timers.push(setTimeout(() => {
        if (keysLesson.playback === playback) fn();
    }, seconds * 1000));
    // その 拍で もういちど 光らせる（音符は キラリン、きゅうふは ぽわっと）
    const flash = (selector, cls, seconds) => later(() => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.classList.remove(cls);
        void el.getBoundingClientRect();
        el.classList.add(cls);
        const row = el.closest('svg');
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, seconds);
    const bus = playback.bus;
    const beat = keysBeat();
    const melody = keysVoice('melody');
    const chord = keysVoice('chord');
    const phrases = run.song.phrases;
    const expr = TamaSongs.expressive(phrases, run.take, beat);
    const time = b => PLAYBACK_START + b * beat; // 拍 → びょう
    let restIndex = 0;
    phrases.forEach((phrase, b) => {
        const bass = TamaSongs.chordNotes(phrase.chord)[0] - 12;
        // 1拍めと 3拍め（ためが あれば その ぶん うしろへ。のびる 音色は 2拍 のばす）
        [0, 2].forEach(k => {
            const at = time(expr.warp(b * 4 + k));
            const strong = k === 0;
            TamaSound.chord(phrase.chord, { when: at, gain: strong ? 0.17 : 0.09, strum: strong ? 0.02 : 0.015, bus, voice: chord, hold: 2 * beat * 0.95 });
            TamaSound.note(bass, { when: at, gain: strong ? 0.3 : 0.2, bus, voice: chord, hold: 2 * beat * 0.95 }).release();
        });
        phrase.rhythm.split('').forEach((mark, k) => {
            if (mark === '○') flash(`#keysCards [data-r="${restIndex++}"]`, 'on', time(expr.warp(b * 4 + k)));
        });
    });
    // ため：伴奏が そっと 分散和音で まつ
    expr.holds.forEach(hold => {
        const start = time(expr.warp(hold.at) - 1);
        const notes = TamaSound.CHORDS[phrases[Math.floor((hold.at - 0.5) / 4)].chord] || [];
        notes.forEach((midi, i) => TamaSound.note(midi + 12, { when: start + i * beat / notes.length, gain: 0.08, bus, voice: chord }).release());
    });
    // メロディ（かざりの 音は すこし まえに 小さく）
    expr.notes.forEach((note, i) => {
        const at = time(note.beat);
        note.graces.forEach((g, j) => {
            TamaSound.note(g, { when: Math.max(0, at - (note.graces.length - j) * 0.07), gain: 0.22, bus, voice: melody, hold: 0.06 }).release();
        });
        TamaSound.note(note.midi, { when: at, bus, voice: melody, hold: beat * 0.9 }).release();
        flash(`#keysCards [data-i="${i}"]`, 'sparkle', at);
    });
    const end = keysOutro(bus, time(expr.warp(phrases.length * 4)));
    later(keysStopPlayback, end + 1);
}

// きくのを やめる：まだ 鳴っていない 音も、鳴っている 音も ぜんぶ けす
function keysStopPlayback() {
    const playback = keysLesson.playback;
    if (!playback) return;
    keysLesson.playback = null;
    playback.timers.forEach(clearTimeout);
    if (playback.bus) playback.bus.disconnect();
}

// くろいけんばんの問題で 正解したら、その けんばんの 名前を ぜんぶ見せる（ド♯ で こたえても「ド♯／レ♭」）
//   ひっかけ（ミ♯ など）は「ミ♯は ファ！」
function keysShowBothNames(midi) {
    const problem = keysLesson.run.problem;
    if (!problem.names) return;
    const keyboard = keysLesson.keyboard;
    if (problem.trap) {
        keyboard.balloon(midi, `${problem.names[0]}は ${TamaNotes.lessonName(midi)}！`, { ms: 1600 });
    } else if (TamaNotes.isBlack(midi)) {
        keyboard.balloon(midi, TamaNotes.namesOf(midi).join('／'), { ms: 1600 });
    }
}

// 「ド♯ ＝ ？♭」の ボタン
function keysOnName(step, button) {
    const run = keysLesson.run;
    if (!run || !run.accepting || run.problem.type !== 'name') return;
    const problem = run.problem;
    const midi = problem.notes[0];
    if (step === problem.answerStep) {
        button.classList.add('ok');
        // ？が こたえに かわって、その けんばんが 鳴る・光る・2つの名前
        const question = document.querySelector('#keysCards .keys-question');
        if (question) question.innerHTML = keysNameSVG(midi, 'big', problem.answer, TamaNotes.COLORS[step]);
        TamaSound.note(midi).release();
        keysLesson.keyboard.mark(midi, 'ok', 900);
        keysLesson.keyboard.balloon(midi, `${problem.given} ＝ ${problem.answer}`, { ms: 1600 });
        keysSolved();
    } else {
        button.classList.remove('ng');
        void button.offsetWidth;
        button.classList.add('ng');
        keysMistake(TamaNotes.spellName(step, problem.accidental === '♭' ? -1 : 1), problem.answer, problem.given);
    }
}

function keysSolved() {
    const run = keysLesson.run;
    run.accepting = false;
    const problemMs = Date.now() - problemState.problemStartedAt;
    if (problemMs > History.INVALID_MS) {
        run.paused = true;
    }
    if (run.def.style !== 'tour') { // しくみの せつめいは、きろく（にがて）に 入れない
        History.recordProblem(currentMode.id, run.problem.key, !problemState.mistakeMade, problemMs);
    }
    if (problemState.mistakeMade && !run.isReview) {
        run.reviewQueue.push(run.problem); // まちがえた問題は、さいごにもういちど
    }

    TamaSound.chord(run.problem.chord, { voice: keysVoice('chord'), hold: 0.8 });
    document.getElementById('keysCards').classList.add('solved');

    if (!problemState.mistakeMade) {
        problemState.correctStreak++;
        keysPileCoin(problemState.correctStreak % 5 === 0); // 5問ごとに金のドロップ
    }
    keysLesson.later(keysNextProblem, run.problem.pause || 900);
}

// pressed・correct は 名前（「ミ」「ド♯／レ♭」など）
function keysMistake(pressed, correct, problemText) {
    const run = keysLesson.run;
    problemState.mistakeMade = true;
    problemState.mistakeCount++;
    problemState.levelMistakes++;
    problemState.correctStreak = 0;
    const names = run.problem.names || run.problem.notes.map(m => TamaNotes.lessonName(m));
    problemState.mistakes.push({
        problem: problemText ? `${problemText} ＝ ？` : names.join('・'),
        pressed,
        correct,
    });
    if (problemState.mistakeCount >= currentMode.maxMistakes) {
        run.accepting = false;
        run.finished = true;
        keysShowMistakeModal();
    }
}


// ---------- ごほうびのドロップ：けんばんの上に つもる ----------
//   上の ばらばらな場所から おちてきて、けんばんの上に 左から ならぶ。
//   画面の はしまで ならんだら、2だんめは 1だんめの ドロップと ドロップの あいだに はまって つもる（3だんめ からも同じ）。
//   つもった ドロップは、指で うごかせる（js/drops.js の enableDrag）。ほかの画面へ行くと とびちる（scatterCoins）

const KEYS_PILE_SIZE = 32; // ドロップの大きさ（計算の画面の 50px より 小さく。ならんでも めだちすぎないように）

// n こめ（0から）の ドロップを おく場所（画面の左上からの px）
function keysPileSlot(n, width, floor, size = KEYS_PILE_SIZE) {
    const evenCount = Math.max(1, Math.floor(width / size));              // 1・3・5 … だんめ
    const oddCount = Math.max(1, Math.floor((width - size / 2) / size));  // 2・4・6 … だんめ（半分ずれる）
    let row = 0;
    let rest = n;
    while (rest >= (row % 2 === 0 ? evenCount : oddCount)) {
        rest -= row % 2 === 0 ? evenCount : oddCount;
        row++;
    }
    return {
        left: (row % 2 === 0 ? 0 : size / 2) + rest * size,
        top: floor - size - row * size * Math.sqrt(3) / 2, // 下の2つの あいだに はまる 高さ
    };
}

function keysPileCoin(special) {
    const keyboard = document.getElementById('keysKeyboard');
    const floor = keyboard.getBoundingClientRect().top;
    const size = KEYS_PILE_SIZE;
    const n = document.querySelectorAll('.coin.keys-pile').length;
    const slot = keysPileSlot(n, window.innerWidth, floor, size);

    const coin = document.createElement('img');
    coin.src = dropSrc(special ? '/img/Gmaru.png' : problemState.levelToImage[problemState.level]);
    coin.className = 'coin keys-pile';
    coin.style.width = `${size}px`;
    coin.style.height = `${size}px`;
    coin.style.left = `${slot.left}px`;
    coin.style.top = `${slot.top}px`;
    document.body.appendChild(coin);

    // 上の ばらばらな場所から、つもる場所へ おちる（さいごに ちょっと はねる）
    const startX = Math.random() * (window.innerWidth - size) - slot.left;
    const startY = -size - slot.top;
    const turn = Math.round(Math.random() * 360 - 180);
    coin.animate([
        { transform: `translate(${startX}px, ${startY}px) rotate(${turn}deg)`, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
        { transform: 'translate(0, 0) rotate(0deg)', offset: 0.78, easing: 'ease-out' },
        { transform: 'translate(0, -10px) rotate(0deg)', offset: 0.89, easing: 'ease-in' },
        { transform: 'translate(0, 0) rotate(0deg)' },
    ], { duration: 750 });
    enableDrag(coin);
    return coin;
}


// ---------- クリア・ミス ----------

function keysFinish() {
    const level = problemState.level;
    const clearTime = keysRecordClear();

    document.getElementById('keysRemaining').textContent = `のこり0${currentMode.texts.unit}！おわったよ！！`;
    document.getElementById('modalTitle').textContent = currentMode.texts.clearTitle(level);
    document.getElementById('clearTime').textContent = `クリアタイム ${clearTime}`;
    const weakResult = document.getElementById('weakClearResult');
    if (weakResult) weakResult.style.display = 'none';

    const bestTime = getBestTime(level);
    document.getElementById('bestTime').textContent =
        `${currentMode.texts.best} ${bestTime !== null ? formatTime(bestTime) : '--:--'}`;

    document.getElementById('completionModal').style.display = 'flex';
}

// クリアの きろく：タイム・ごほうびの ドロップ・プレイの きろく。かえすのは クリアタイム（「分:秒」）
//   マスタークラスは クリアの 画面を 出さずに これだけ（keysPerformFinish）
function keysRecordClear() {
    const run = keysLesson.run;
    run.finished = true;
    run.accepting = false;
    const level = problemState.level;
    const clearTime = stopTimer();
    saveBestTime(level, endTime - startTime);
    // おとあそび・しくみは、いつも そのレベルの色のドロップ（金は、まちがえずに こたえたとき）
    const drop = createRewardCoin(level, !['free', 'tour'].includes(run.def.style));

    History.addEntry({
        mode: currentMode.id,
        level,
        ms: endTime - startTime,
        total: run.deck.length || run.def.presses,
        miss: problemState.levelMistakes,
        cleared: true,
        drop,
        paused: run.paused,
        weakChallenge: false,
    });
    return clearTime;
}

function keysShowMistakeModal() {
    const run = keysLesson.run;
    History.addEntry({
        mode: currentMode.id,
        level: problemState.level,
        ms: Date.now() - startTime,
        total: run.deck.length,
        miss: problemState.levelMistakes,
        cleared: false,
        drop: null,
        paused: run.paused,
        weakChallenge: false,
    });
    document.getElementById('maxMistakes').textContent = currentMode.maxMistakes;
    const list = document.getElementById('mistakeList');
    list.innerHTML = '';
    problemState.mistakes.forEach(m => {
        const li = document.createElement('li');
        li.textContent = `「${m.problem}」で ${m.pressed} を ${m.problem.endsWith('？') ? 'えらんだ' : 'おした'} 【せいかいは ${m.correct}】`;
        list.appendChild(li);
    });
    document.getElementById('mistakeModal').style.display = 'flex';
    problemState.mistakeCount = 0;
    problemState.mistakes = [];
}


ENGINES.keys = {
    screenId: 'keysScreen',
    keypad: false,          // テンキーは使わない
    start: keysStartLevel,
    retry: keysRetryLevel,
    stop: keysStopLevel,
    onKey: () => {},        // パソコンの数字キーは 使わない
};
