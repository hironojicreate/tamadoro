// けんばんレッスンの進め方
//   カードに出た音（ド・レ・ミ …）の けんばんを おす。メロディは 左から じゅんばんに おす
//   まちがえても、おした けんばんの音は鳴る（なんの音を おしたか、ふきだしで見せる）
//   正解すると、その音を ふくむ和音が 小さく ポロロンと鳴る（js/sound.js の chord）
//   ドロップ・まちがいの上限・まちがえた問題をさいごにもういちど は、計算と同じ
//   くろいけんばん（js/modes/black.js）も このエンジン：
//     ♯・♭ の名前で出す（'spell'）、「ド♯ ＝ ？♭」を ボタンで こたえる（'enharmonic'）、白いけんばんに なる 名前（ミ♯ など。'white-spell'）
//   おんぷよみ（js/modes/notes.js）も このエンジン：display: 'staff' で、カードの かわりに 五線の 音符（js/staff.js）
//     さいしょの「しくみ」（style: 'tour'）は、せつめいしながら すすむ（まちがえても しっぱいに ならない）。
//     sing: true の レベルは、けんばんを おすと その音の 名前を うたう（js/sing.js の「どー・れー・みー」）
//     きょくふう メロディ（style: 'song'。js/songs.js）：曲調と リズム（4/4拍子）を えらんで、8フレーズ（8小節）を 1つずつ れんしゅう →
//       （きゅうふは おさなくて いい。その 拍に なると すこし 光って みどりに）→
//       ぜんぶの がくふで さいごまで ひきとおす（ばんそうが ついてくる。じぶんの ペースで。まちがえても とまらない）→
//       ひきおわると すぐ じぶんの えんそうが 4/4拍子の マス目に そろえて 伴奏つきで ながれる →
//       「もういちど きく」で もういちど。「べつの 曲」「えんそうを おわる」で 拍手 → ごほうびの ドロップ（クリアの 画面は 出さない）
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

// def.tourShift：音を ずらす（おんぷよみ ヘおん は -12。ヘ音記号の だい2かんの ド から たかいド まで）
//   def.tourStart：さいしょの ドの せつめい（ないときは ト音記号の「みじかい せん」）
function keysTourDeck(def = {}) {
    const shift = def.tourShift || 0;
    const move = list => list.map(m => m + shift);
    const up = move(KEYS_SCALE_UP);
    const down = [...up].reverse();
    const pick = list => move(list[Math.floor(Math.random() * list.length)]);
    const run = (notes, say, more = {}) => ({
        notes,
        say,
        chord: keysChordFor(notes[notes.length - 1]),
        key: notes.map(m => TamaNotes.lessonName(m)).join(''),
        ...more,
    });
    return [
        { type: 'lines', notes: [], key: 'せんは5ほん', chord: 'C', pause: 1800 },
        def.tourStart
            ? run([60 + shift], def.tourStart, { tags: true, beckon: true, pause: 1300 })
            : run([60], 'ドは、五線の 下に みじかい せんを 1本 たした ところ。ここから スタート！ ひかっている けんばんを おしてね',
                { tags: true, focusLedger: true, beckon: true, pause: 1300 }),
        run(up, 'のぼるよ！ せん → あいだ → せん → あいだ … と じゅんばんに', { tags: true, reveal: true, pause: 1300 }),
        run(down, 'くだるよ！ あいだ → せん → あいだ → せん … と じゅんばんに', { tags: true, reveal: true, pause: 1300 }),
        run(up, 'ド・レ・ミ・ファ・ソ・ラ・シ・ド！ つづけて 読もう'),
        run(down, 'ド・シ・ラ・ソ・ファ・ミ・レ・ド！ くだって 読もう'),
        run(pick(KEYS_TOUR_RUNS.up), 'とちゅうからでも、1つずつ のぼるよ'),
        run(pick(KEYS_TOUR_RUNS.down), 'とちゅうからでも、1つずつ くだるよ'),
    ];
}

// ヘおんよみ の しくみ：せんを かぞえる → ファの せん（ヘ音記号の 2つの 点の あいだ）→ いちばん下の せん（ひくいソ）から のぼる・くだる
//   名前は ド3 の 段が「ただの ド」（js/notes.js の home）
function keysBassTourDeck() {
    const G2 = 43, A2 = 45, B2 = 47, C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55;
    const up = [G2, A2, B2, C3, D3, E3, F3, G3];
    const down = [...up].reverse();
    const run = (notes, say, more = {}) => ({
        notes,
        say,
        chord: keysChordFor(notes[notes.length - 1]),
        key: notes.map(m => TamaNotes.lessonName(m)).join(''),
        ...more,
    });
    return [
        { type: 'lines', notes: [], key: 'せんは5ほん', chord: 'C', pause: 1800 },
        run([F3], 'ヘ音記号の 2つの 点に はさまれた せん（下から 4ほんめ）が ファ。ヘ音記号の「ヘ」は ファの こと！ ひかっている けんばんを おしてね',
            { tags: true, beckon: true, pause: 1300 }),
        run([G2], 'いちばん 下の せん（1ぽんめ）は ひくいソ。ここから スタート！ ひかっている けんばんを おしてね',
            { tags: true, beckon: true, pause: 1300 }),
        run(up, 'のぼるよ！ せん → あいだ → せん → あいだ … と じゅんばんに', { tags: true, reveal: true, pause: 1300 }),
        run(down, 'くだるよ！ あいだ → せん → あいだ → せん … と じゅんばんに', { tags: true, reveal: true, pause: 1300 }),
        run(up, 'ひくいソ・ひくいラ・ひくいシ・ド・レ・ミ・ファ・ソ！ つづけて 読もう'),
        run(down, 'ソ・ファ・ミ・レ・ド・ひくいシ・ひくいラ・ひくいソ！ くだって 読もう'),
    ];
}

// ベースの うごき（チューバ）：lines：[[音（左から）, 和音], …] から count こ（同じ ものが つづかない）
function keysBassLineDeck(def) {
    const deck = [];
    for (let i = 0; i < def.count; i++) {
        const choices = def.lines.filter(([notes]) => !deck.length || deck[deck.length - 1].notes.join() !== notes.join());
        const [notes, chord] = choices[Math.floor(Math.random() * choices.length)];
        deck.push(keysPhrase(notes, chord));
    }
    return deck;
}

// 1つずつ あらわれる 音符：正解の キラリンの あと、つぎが 出るまで（ミリ秒）
const KEYS_REVEAL_DELAY = 550;

// おだんご：
//   dangos：[{ notes（下から）, chord（そろったときの 和音）, name, intro（さいしょに 名前つきの お手本） }]
//   singles を repeat 回 ＋ extra（とくに おぼえたい 音を たす）の 1おんと、おだんごを dangoRepeat 回ずつ まぜる
//   singleChords：1おんの 正解の 和音を 音ごとに きめる（ないときは その音の おだんごの 和音）
function keysDangoDeck(def) {
    const byName = def.answer === 'name'; // 名前の ボタンで こたえる（ヘおんよみ の まえはん）
    const names = d => d.notes.map(m => TamaNotes.lessonName(m)).join('・');
    const dango = (d, more = {}) => ({
        notes: d.notes,
        dango: true,
        chord: d.chord,
        key: `おだんご ${names(d)}`,
        say: byName ? 'おだんごを 下から じゅんばんに、なまえの ボタンで こたえてね' : 'おだんごを 下から じゅんばんに おしてね',
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
        beckon: !byName,
        say: byName
            ? `${d.name}！ 下から ${names(d)}。なまえの ボタンを じゅんばんに おしてね`
            : `${d.name}！ 下から ${names(d)}。ひかっている けんばんを じゅんばんに おしてね`,
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

// ヘおん マスタークラス（左手）：js/left-hand.js で 曲を つくって、3〜8小節の 左手を 1小節ずつ れんしゅう → とおし えんそう。
//   正解すると その 小節を 右手（メロディ）と いっしょに 鳴らす（左手が メロディを ささえる ことを 耳で）
function keysLeftSongDeck(def) {
    const song = TamaLeftHand.make(def.stage);
    const bars = song.lh.length;
    const deck = [];
    let explained = false;
    song.lh.forEach((bar, i) => {
        if (bar.kind === 'REST') return;
        const notes = bar.events.map(e => e.notes[0]);
        const long = bar.events.some(e => e.beats >= 2);
        deck.push({
            notes,
            rhythm: bar.events,
            chord: bar.chord,
            chordName: bar.chord,
            counts: true,
            rests: [],
            leftBar: i,
            key: notes.map(m => TamaNotes.lessonName(m)).join(''),
            say: `${song.style.name}　${i + 1}/${bars}小節めの 左手${i >= bars - 2 ? '（おわりへ）' : ''}`
                + (long && !explained ? '　白い 玉（2ぶ音符・全音符）は ながく のばす 音だよ' : ''),
        });
        if (long) explained = true;
    });
    deck.song = song;
    return deck;
}

// ヘおん マスタークラス：右手（メロディ）の 音 [{ t：曲の はじめからの 拍, m }]
function keysLeftMelody(song) {
    const out = [];
    song.phrases.forEach((ph, b) => {
        let n = 0;
        ph.rhythm.split('').forEach((mark, k) => { if (mark === '●') out.push({ t: b * 4 + k, m: ph.notes[n++] }); });
    });
    return out;
}

// ヘおん マスタークラス：小節 from〜to（to は ふくまない）を 右手と 左手で 鳴らす。かえすのは びょう
function keysLeftPlayBars(song, from, to, { left = true, bus = null } = {}) {
    const beat = keysBeat(song);
    const start = 0.15;
    keysLeftMelody(song).filter(n => n.t >= from * 4 && n.t < to * 4)
        .forEach(n => TamaSound.note(n.m, { when: start + (n.t - from * 4) * beat, gain: 0.42, bus, hold: beat * 0.9 }).release());
    if (left) {
        for (let b = from; b < to; b++) {
            let pos = 0;
            song.lh[b].events.forEach(e => {
                if (!e.rest) TamaSound.note(e.notes[0], { when: start + ((b - from) * 4 + pos) * beat, gain: 0.36, bus, hold: beat * e.beats * 0.92 }).release();
                pos += e.beats;
            });
        }
    }
    return start + (to - from) * 4 * beat;
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
function keysVoice(part, song = keysLesson.run && keysLesson.run.song) {
    if (song && song.left) return 'piano'; // ヘおん マスタークラス：ひとつの ピアノ曲（右手も 左手も ピアノ）
    return song ? TamaSongs.soundOf(song.style)[part] : 'piano';
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
// 白いけんばんに なる 名前（この じゅんばんで おしえる）：ミ♯（＝ファ）・ファ♭（＝ミ）・シ♯（＝ド）・ド♭（＝シ）。オクターブは くべつしない
const KEYS_WHITE_SPELLS = [[2, 1], [3, -1], [6, 1], [0, -1]];

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
        return id;
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

// ♯・♭ の名前の問題（name：「ド♯」、color：もとの音の色、guide：もとの音・どちらどなりか・黒いけんばんか）
function keysSpelled([step, alter]) {
    const midi = TamaNotes.keyOf(step, alter);
    const name = TamaNotes.spellName(step, alter);
    return {
        notes: [midi],
        names: [name],
        colors: [TamaNotes.COLORS[step]],
        key: name,
        chord: keysChordFor(midi),
        guide: { base: TamaNotes.keyOf(step, 0), dir: alter > 0 ? 'right' : 'left', black: TamaNotes.isBlack(midi) },
        onWhite: !TamaNotes.isBlack(midi), // ミ♯ などは 白いけんばん
        anyOctave: true, // オクターブは くべつしない（シ♯ は どの ドを おしても 正解）
    };
}

// 同じ 音の なまえか（オクターブちがいも 同じ）
function keysSamePitch(a, b) {
    return (((a - b) % 12) + 12) % 12 === 0;
}

// ♯・♭ の ガイドの 矢印：黒いけんばんへは ななめ上（↗・↖）、白いけんばんへは よこ（→・←）
function keysGuideArrow(guide) {
    if (guide.black) return guide.dir === 'right' ? '↗' : '↖';
    return guide.dir === 'right' ? '→' : '←';
}

// 「みぎどなり」「ひだりどなり」
function keysSideWord(guide) {
    return guide.dir === 'right' ? 'みぎどなり' : 'ひだりどなり';
}

// 白いけんばんに なる 名前（Lv5）：はじめの guided もんは 1つずつ 矢印つきで、それから まぜて count もん
function keysWhiteSpellDeck(def) {
    const guided = KEYS_WHITE_SPELLS.slice(0, def.guided).map(spell => {
        const problem = keysSpelled(spell);
        const base = TamaNotes.lessonName(problem.guide.base);
        return { ...problem, arrow: true, say: `${base}の すぐ ${keysSideWord(problem.guide)}に、くろい けんばんは ないよ` };
    });
    const mixed = () => keysShuffleNoRepeat(keysSpelledDeck(KEYS_WHITE_SPELLS, { count: def.count }));
    let rest = mixed();
    const last = guided.length ? guided[guided.length - 1].key : null;
    for (let tries = 0; tries < 300 && rest.length && rest[0].key === last; tries++) rest = mixed();
    return [...guided, ...rest];
}

// 「ド♯ ＝ ？♭」（同じ けんばんの もうひとつの名前を、ド〜シ の ボタンで こたえる）
//   白いけんばんに なる 名前（ミ♯ など）は「ド♭ ＝ ？」で、♯・♭ の ない ド〜シ の ボタン（こたえは シ）
function keysEnharmonic([step, alter]) {
    const midi = TamaNotes.keyOf(step, alter);
    const given = TamaNotes.spellName(step, alter);
    const onWhite = !TamaNotes.isBlack(midi);
    const answerStep = onWhite ? TamaNotes.stepOf(midi) : alter > 0 ? (step + 1) % 7 : (step + 6) % 7;
    const answerAlter = onWhite ? 0 : -alter;
    const answer = TamaNotes.spellName(answerStep, answerAlter);
    return {
        type: 'name',
        notes: [midi],
        names: [given],
        colors: [TamaNotes.COLORS[step]],
        given,
        answerAlter,
        accidental: answerAlter < 0 ? '♭' : answerAlter > 0 ? '♯' : '',
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
    if (def.style === 'tour') return def.tour === 'bass' ? keysBassTourDeck() : keysTourDeck(def);
    if (def.style === 'bassline') return keysBassLineDeck(def);
    if (def.style === 'leftsong') return keysLeftSongDeck(def);
    if (def.style === 'song') return keysSongDeck();
    if (def.style === 'dango') return keysDangoDeck(def);
    const pools = { sharp: KEYS_SHARPS, flat: KEYS_FLATS, both: [...KEYS_SHARPS, ...KEYS_FLATS] };
    if (def.style === 'spell') return keysShuffleNoRepeat(keysSpelledDeck(pools[def.pool], def));
    if (def.style === 'enharmonic') return keysShuffleNoRepeat(keysSpelledDeck(pools[def.pool], { ...def, make: keysEnharmonic }));
    if (def.style === 'white-spell') return keysWhiteSpellDeck(def);
    if (def.style === 'black-mix') {
        // pool から ばらばらに n こ（n が pool の かず までなら、同じ ものは 出ない）
        const pick = (pool, n) => {
            const out = [];
            while (out.length < n) out.push(...keysShuffle(pool));
            return out.slice(0, n);
        };
        // 前半は けんばんを おす 問題、後半は ボタン（カード）で こたえる 問題（part で わける）
        //   後半には「ド♭ ＝ ？」（白いけんばんの 名前を ♯・♭ なしの ボタンで。whiteNames もん）も まぜる
        const press = keysShuffleNoRepeat([
            ...pick(pools.both, def.spells).map(keysSpelled),
            ...pick(KEYS_WHITE_SPELLS, def.whites).map(keysSpelled),
        ]).map(p => ({ ...p, part: 1 }));
        const names = keysShuffleNoRepeat([
            ...pick(pools.both, def.names).map(keysEnharmonic),
            ...pick(KEYS_WHITE_SPELLS, def.whiteNames || 0).map(keysEnharmonic),
        ]).map(p => ({ ...p, part: 2 }));
        return [...press, ...names];
    }
    if (def.style === 'phrase') {
        const deck = keysPhraseDeck(def.count, def.melody);
        // shift：音を ずらす（ヘおんよみ の メロディは 1オクターブ 下。-12）
        if (def.shift) {
            deck.forEach(problem => {
                problem.notes = problem.notes.map(m => m + def.shift);
                problem.key = problem.notes.map(m => TamaNotes.lessonName(m)).join('');
            });
        }
        return deck;
    }
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
    // ヘおんよみ：五線は ヘ音記号、名前は ド3 の 段が「ただの ド」（ふだんは ト音記号・ド4）
    TamaStaff.kind = currentMode.clef || 'treble';
    TamaNotes.home = currentMode.home || 4;

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
        // うたう 声を さきに つくっておく（あかるい けんばんの まんなかの ちかくから。ヘ音記号は ひくい 声）
        const whites = TamaNotes.whiteKeys(def.active[0], def.active[1]);
        const middle = (def.active[0] + def.active[1]) / 2;
        TamaSing.prepare(whites.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle)), 'doremi');
    }
    keysRenderKeyboard(keysLevelView(def));

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

// レベルの はじめに 見せる けんばん（せまい 画面では narrowView。つかわない けんばんを へらして 1つずつを 大きく）
function keysLevelView(def) {
    if (def.narrowView && window.innerWidth < KEYS_NARROW) return def.narrowView;
    return def.view || keysOniView();
}

const KEYS_NARROW = 600; // これより せまい 画面は narrowView

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
        // ヘおんよみ：まんなかの ド（ト音記号の ド）に ★
        mark: midi => (currentMode.middleC && midi === TamaNotes.MIDDLE_C ? '★' : ''),
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
    keysStage(false); // ステージの 明かりを もどす
    if (keysLesson.cheer) {
        keysLesson.cheer.disconnect(); // 拍手の とちゅうで やめたら 拍手も けす
        keysLesson.cheer = null;
    }
    keysAccomp.halt();
    keysLeftHead.stop();
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
    // 前半と 後半に わかれている ときは、前半で まちがえた 問題を 後半の まえに もういちど
    const nextPart = run.index < run.deck.length ? run.deck[run.index].part : undefined;
    const partEnds = run.index > 0 && nextPart !== undefined && nextPart !== run.deck[run.index - 1].part;
    if (partEnds && run.reviewQueue.length > 0) {
        run.problem = run.reviewQueue.shift();
        run.isReview = true;
    } else if (run.index < run.deck.length) {
        run.problem = run.deck[run.index];
        run.index++;
        run.isReview = false;
    } else if (run.reviewQueue.length > 0) {
        run.problem = run.reviewQueue.shift();
        run.isReview = true;
    } else if (run.song && !run.performed) {
        run.problem = run.song.left ? keysLeftPerformProblem(run.song) : keysPerformProblem(run.song);
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
    // ♯・♭ の ガイド：もとの音を ふちどりして、おす けんばんの ほうへ 矢印（黒いけんばんへは ↗・↖、白いけんばんへは →・←）
    keysLesson.keyboard.clearGuide();
    if ((run.def.arrow || run.problem.arrow) && run.problem.guide) {
        const guide = run.problem.guide;
        keysLesson.keyboard.guide(guide.base, keysGuideArrow(guide), guide.black ? `up ${guide.dir}` : guide.dir);
    }
    // しくみの さいしょの ド：おす けんばんに ポワンポワン 光る わっか（どこを おせば いいか まよわない）
    if (run.problem.beckon) {
        keysLesson.keyboard.beckon(run.problem.notes[0]);
    }
    run.accepting = true;
    if (run.problem.type === 'perform') keysPerformIntro(); // イントロの あいだは うけつけない
    if (run.problem.type === 'leftperform') keysLeftIntro(); // はじめの 2小節は メロディだけ（うけつけない）
}

function keysUpdateRemaining() {
    const run = keysLesson.run;
    if (run.problem && run.problem.type === 'perform') {
        document.getElementById('keysRemaining').textContent = `とおし えんそう！ ${run.song.style.name}・${TamaSongs.RHYTHMS[run.song.rhythm].name}`;
        return;
    }
    if (run.problem && run.problem.type === 'leftperform') {
        document.getElementById('keysRemaining').textContent = `とおし えんそう！ ${run.song.style.name}・左手`;
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
        // 「ド♯ ＝ ？♭」：？の ところを、ド〜シ の ボタンで こたえる（「ド♭ ＝ ？」は ♯・♭ なしの ド〜シ）
        cards.className = 'keys-cards enharmonic';
        cards.innerHTML = `<div class="keys-card">${keysNameSVG(notes[0], 'big', name(0), color(0))}</div>
            <div class="keys-equal">＝</div>
            <div class="keys-card keys-question" data-i="0">${keysNameSVG(notes[0], 'big', `？${problem.accidental}`, '#ff2929')}</div>`;
        // ♯・♭ つきの ボタンは 黒いけんばんの 名前だけ（ド♭・ファ♭・ミ♯・シ♯ は 白いけんばんに なるので 出さない）。
        // ♯・♭ なしの ときは ド〜シ の 7こ
        const alter = problem.answerAlter;
        answers.innerHTML = TamaNotes.NAMES.map((n, step) => (TamaNotes.isBlack(TamaNotes.keyOf(step, alter)) === (alter !== 0)
            ? `<button type="button" class="keys-answer" data-step="${step}" style="color: ${TamaNotes.COLORS[step]}">${n}${problem.accidental}</button>`
            : '')).join('');
        answers.querySelectorAll('.keys-answer').forEach(button => {
            button.addEventListener('click', () => keysOnName(Number(button.dataset.step), button));
        });
        keysShowMessage('おなじ けんばんの、もうひとつの なまえは？');
        return;
    }

    if (problem.type === 'leftperform') {
        // ぜんぶの がくふ：上の だんは アプリの 右手（ト音記号。うすく）、下の だんは 子どもの 左手（ヘ音記号）
        const perRow = window.innerWidth < 700 ? 2 : 4;
        cards.className = 'keys-cards staff phrase score left-score';
        cards.innerHTML = `<div class="keys-card staff-card score-card">${keysLeftScore(run.song, perRow)}</div>`;
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
        if (run.def.answer === 'name') {
            // 名前の ボタン（ド〜シ。オクターブは とわない）で こたえる。けんばんは 鳴るだけ
            answers.innerHTML = TamaNotes.NAMES.map((n, step) =>
                `<button type="button" class="keys-answer" data-step="${step}" style="color: ${TamaNotes.COLORS[step]}">${n}</button>`).join('');
            answers.querySelectorAll('.keys-answer').forEach(button => {
                button.addEventListener('click', () => keysOnReadName(Number(button.dataset.step), button));
            });
            keysShowMessage(problem.say || (notes.length > 1 ? 'ひだりから じゅんばんに、なまえの ボタンで こたえてね' : 'この おんぷの なまえは？'));
            return;
        }
        keysShowMessage(problem.say || (notes.length > 1 ? 'ひだりから じゅんばんに おしてね' : 'この おんぷは どの けんばん？'));
        return;
    }

    cards.className = `keys-cards ${notes.length > 1 ? 'phrase' : 'single'}`;
    cards.innerHTML = notes.map((midi, i) =>
        `<div class="keys-card${i === 0 ? ' current' : ''}" data-i="${i}">${keysNameSVG(midi, 'big', name(i), color(i))}</div>`).join('');
    keysShowMessage(problem.say || (notes.length > 1 ? 'ひだりから じゅんばんに おしてね' : ''));
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
const KEYS_LINE_NOTES = [64, 67, 71, 74, 77];      // ト音記号の せん（ミ・ソ・シ・たかいレ・たかいファ）
const KEYS_BASS_LINE_NOTES = [43, 47, 50, 53, 57]; // ヘ音記号の せん（ひくいソ・ひくいシ・レ・ファ・ラ）
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
    TamaSound.note((TamaStaff.kind === 'bass' ? KEYS_BASS_LINE_NOTES : KEYS_LINE_NOTES)[number - 1]).release();
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

// fromName：名前の ボタン（keysOnReadName）から、正しい けんばんを おした ことに する
function keysOnPress(midi, inRange, fromName = false) {
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
    if (run.def.answer === 'name' && !fromName) return; // 名前の ボタンで こたえる レベル（けんばんは 鳴るだけ）

    if (!inRange) {
        keyboard.balloon(midi, 'あかるい けんばんで さがしてね', { color: '#555', ms: 1300 });
        return;
    }

    if (run.problem.type === 'perform') {
        keysOnPerform(midi);
        return;
    }
    if (run.problem.type === 'leftperform') {
        keysOnLeftPerform(midi);
        return;
    }

    const expected = run.problem.notes[run.pos];
    const guide = run.problem.guide;
    // くろいけんばんの ♯・♭ は オクターブを くべつしない（シ♯ は どの ドでも 正解）
    const hit = midi === expected || (!!run.problem.anyOctave && keysSamePitch(midi, expected));
    if (guide && !hit && keysSamePitch(midi, guide.base)) {
        // くろいけんばん：もとの音を おしたのは「おしい！」（まちがいに しない。そこから となりへ）
        const base = TamaNotes.namesOf(midi)[0];
        keyboard.balloon(midi, `そこが ${base}！`, { color: TamaNotes.color(midi) });
        keysShowMessage(`おしい！ そこが ${base}。${run.problem.names[0]}は その すぐ ${keysSideWord(guide)}`);
        return;
    }
    if (hit) {
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
    if (phrase >= 0) {
        keysAccomp.play(problem.chords[phrase]); // その 小節の 和音が つぎの 小節まで 鳴りつづける（ねもとの ベースも ドン）
    } else {
        keysAccomp.follow(); // ひいた 音に ベースが そっと ついてくる
    }
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
//   ボタンは「もういちど きく」（じぶんの えんそうを はじめから）・「この 曲を もういちど」（同じ 曲を イントロから ひきなおす）・
//   「ノートに のこす」（名前を つけて きょくノートへ。js/song-note.js）・「べつの 曲」・「えんそうを おわる」。「べつの 曲」「えんそうを おわる」は、拍手の あと ごほうびの ドロップ（クリアの 画面は 出さない）→
//   べつの 曲で マスタークラスを はじめから／レベルを えらぶ 画面へ
const KEYS_AUTO_PLAYBACK = 0.6; // ひきおわって から ながれる までの びょう

function keysPerformDone() {
    const run = keysLesson.run;
    run.accepting = false;
    const style = run.song.style;
    keysAccomp.stop();
    const { traits } = TamaSongs.expressive(run.song.phrases, run.take, keysBeat());
    keysShowMessage(`えんそう おわり！ ${style.name}（${style.sub}）を ひけたよ！`, `${TamaSongs.traitWords(traits).join('・')} ♪`);
    keysAudienceClap(KEYS_CLAP_MS); // タマが 拍手
    const answers = document.getElementById('keysAnswers');
    answers.innerHTML = `
        <button type="button" class="keys-perform-button listen">もういちど きく</button>
        <button type="button" class="keys-perform-button again">この 曲を もういちど</button>
        <button type="button" class="keys-perform-button save">ノートに のこす</button>
        <button type="button" class="keys-perform-button another">べつの 曲</button>
        <button type="button" class="keys-perform-button finish">えんそうを おわる</button>`;
    answers.querySelector('.listen').addEventListener('click', () => {
        keysStopPlayback(); // ながれている ときも はじめから
        keysPlayback();
    });
    answers.querySelector('.again').addEventListener('click', keysPerformAgain);
    answers.querySelector('.save').addEventListener('click', event => {
        // きょくノートに のこす（js/song-note.js）。名前を つけて、あとで きける
        const entry = TamaSongNote.save(run);
        event.currentTarget.disabled = true;
        event.currentTarget.textContent = 'のこしたよ！';
        keysShowMessage(`「${TamaSongNote.nameOf(entry)}」を きょくノートに のこしたよ！`, `${entry.words.join('・')} ♪`);
    });
    answers.querySelector('.another').addEventListener('click', () => keysPerformFinish('another'));
    answers.querySelector('.finish').addEventListener('click', () => keysPerformFinish('menu'));
    const round = run.round;
    keysLesson.later(() => { if (run.round === round && !keysLesson.playback) keysPlayback(); }, KEYS_AUTO_PLAYBACK * 1000);
}

// 「べつの 曲」（next: 'another'）・「えんそうを おわる」（next: 'menu'）：
//   きくのを とめて 拍手 → ごほうびの ドロップが とんでくる → つぎへ
const KEYS_DROP_LANDING = 1400; // ドロップが 右上に おさまる までの ミリびょう（js/drops.js の createRewardCoin）

function keysPerformFinish(next) {
    const run = keysLesson.run;
    keysStopPlayback();
    document.getElementById('keysAnswers').innerHTML = ''; // 2かい おせないように
    run.round = (run.round || 0) + 1;                       // まだ ながれていない「じぶんの えんそう」も ながさない
    // 図鑑に のせる。はじめての 系統なら ごほうびの ドロップは 金
    const family = run.song.style.family;
    const first = run.song.left ? false : TamaSongNote.addFamily(family); // ヘおん マスタークラスは ずかんに のせない（ト音の きょくふう ずかん）
    keysShowMessage('パチパチパチ…！ すてきな えんそうだったね！',
        first ? `はじめての ${TamaSongs.FAMILIES[family].name}風！ ずかんに のったよ。きんの ドロップ！` : '');
    keysAudienceClap(); // タマも 拍手
    const bus = TamaSound.bus();
    keysLesson.cheer = bus;
    const seconds = TamaSound.applause({ bus });
    keysLesson.later(() => {
        keysRecordClear(first); // ドロップを もらう（クリアの 画面は 出さない。はじめての 系統は 金）
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

// ---------- ヘおん マスタークラス：とおし えんそう（子どもが 左手、アプリが 右手） ----------
//   はじめの 2小節は 右手（メロディ）だけ（2小節めで カウント 1・2・3・4。入りは 半拍 まえから うけつける）→ 3小節めの 頭から 左手。
//   右手は まって くれる：左手の 音を ひくと、つぎの 左手の 音までの メロディを 曲の はやさで ひく（はやく ひいたら、のこりは やめて つぎへ）。
//   ひきおわると「左手つきで きく」「メロディだけ」（ききくらべ）・「この 曲を もういちど」・「べつの 曲」・「えんそうを おわる」
const KEYS_LEFT_START = 8; // 左手が はいる 拍（3小節めの 1拍め）

function keysLeftPerformProblem(song) {
    const notes = [];
    const times = [];
    const beats = [];
    song.lh.forEach((bar, b) => {
        let pos = 0;
        bar.events.forEach(e => {
            if (!e.rest) { notes.push(e.notes[0]); times.push(b * 4 + pos); beats.push(e.beats); }
            pos += e.beats;
        });
    });
    return { type: 'leftperform', notes, times, beats, end: song.lh.length * 4, key: 'とおし えんそう', rests: [] };
}

// ぜんぶの がくふ：大譜表（上 ＝ 右手 ト音記号、下 ＝ 左手 ヘ音記号。行頭の 大括弧・つらぬく 小節線・たての せん。js/staff.js の grand）
function keysLeftScore(song, perRow) {
    return TamaStaff.grand(song.phrases, song.lh.map(b => ({ chord: b.chord, rhythm: b.events })), { perRow });
}

// どこを えんそうしているかの たての せん（大譜表）：拍 from から to まで 曲の はやさで よこに うごいて、to で とまる
//   （とおし えんそう：左手を ひくと つぎの 左手の 音まで うごいて まつ。ききくらべ：さいごまで）。だんが かわったら その だんを 見せる
const keysLeftHead = {
    raf: null,
    row: null,

    run(from, to, beat, delay = 0) {
        cancelAnimationFrame(this.raf);
        const start = performance.now() + delay * 1000;
        const step = () => {
            const t = Math.min(to, from + Math.max(0, performance.now() - start) / 1000 / beat);
            this.place(t);
            if (t < to) this.raf = requestAnimationFrame(step);
        };
        step();
    },

    place(t) {
        const svgs = [...document.querySelectorAll('#keysCards .grand-row')];
        const row = TamaStaff.playhead(svgs, t);
        if (row && row !== this.row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        this.row = row;
    },

    stop() {
        cancelAnimationFrame(this.raf);
        this.raf = null;
        this.row = null;
        document.querySelectorAll('#keysCards .lh-playhead.on').forEach(line => line.classList.remove('on'));
    },
};

// まって くれる 右手の、まだ 鳴っていない 音を とめる
function keysLeftCancel() {
    const run = keysLesson.run;
    if (!run) return;
    (run.leftTimers || []).forEach(clearTimeout);
    run.leftTimers = [];
}

function keysLeftIntro() {
    const run = keysLesson.run;
    const song = run.song;
    const beat = keysBeat();
    const at = 0.3;
    run.accepting = false;
    run.round = (run.round || 0) + 1;
    run.take = [];
    keysLeftCancel();
    keysAccomp.halt();
    keysStage(true);
    const bus = keysAccomp.output();
    keysLeftMelody(song).filter(n => n.t < KEYS_LEFT_START)
        .forEach(n => TamaSound.note(n.m, { when: at + n.t * beat, gain: 0.42, bus, hold: beat * 0.9 }).release());
    const ctx = TamaSound.live();
    if (ctx) for (let k = 0; k < 4; k++) TamaSound.click(ctx.currentTime + at + (4 + k) * beat, k === 0, bus);
    keysShowMessage('♪ はじめの 2小節は メロディだけ。よく きいてね');
    keysLeftHead.run(0, KEYS_LEFT_START, beat, at); // たての せん：はじめの 2小節を すすんで、左手の 入りで まつ
    for (let k = 0; k < 4; k++) {
        keysLesson.later(() => keysShowMessage(`${'・'.repeat(k)}${k + 1}`), (at + (4 + k) * beat) * 1000);
    }
    keysLesson.later(() => { run.accepting = true; }, (at + (KEYS_LEFT_START - KEYS_EARLY_BEATS) * beat) * 1000);
    keysLesson.later(() => {
        keysShowMessage('さあ どうぞ！ 左手で メロディを ささえよう。じぶんの ペースで いいよ');
    }, (at + KEYS_LEFT_START * beat) * 1000);
}

function keysOnLeftPerform(midi) {
    const run = keysLesson.run;
    const problem = run.problem;
    const keyboard = keysLesson.keyboard;
    const expected = problem.notes[run.pos];
    if (midi !== expected) {
        keyboard.mark(midi, 'ng');
        keyboard.balloon(midi, `${TamaNotes.lessonName(midi)}だよ`);
        return;
    }
    keyboard.mark(midi, 'ok');
    run.take.push({ t: performance.now() });
    // 右手：この 左手の 音から つぎの 左手の 音までの メロディを、曲の はやさで（まえの のこりは やめる）
    keysLeftCancel();
    const from = problem.times[run.pos];
    const to = run.pos + 1 < problem.notes.length ? problem.times[run.pos + 1] : problem.end;
    const beat = keysBeat();
    const bus = keysAccomp.output();
    keysLeftMelody(run.song).filter(n => n.t >= from && n.t < to).forEach(n => {
        run.leftTimers.push(keysLesson.later(() => TamaSound.note(n.m, { gain: 0.42, bus, hold: beat * 0.9 }).release(), (n.t - from) * beat * 1000));
    });
    keysLeftHead.run(from, to, beat); // たての せんも つぎの 左手の 音まで すすんで まつ
    const note = document.querySelector(`#keysCards .lh-bass [data-i="${run.pos}"]`);
    if (note) {
        note.classList.remove('current', 'next');
        note.classList.add('done', 'sparkle');
    }
    run.pos++;
    if (run.pos < problem.notes.length) {
        const next = document.querySelector(`#keysCards .lh-bass [data-i="${run.pos}"]`);
        if (next) {
            next.classList.remove('next');
            next.classList.add('current');
            const system = next.closest('svg');
            if (system && system.scrollIntoView) system.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        return;
    }
    // さいごの 音：のこりの メロディを ひいてから おわり
    run.accepting = false;
    keysLesson.later(keysLeftDone, ((to - from) * beat + 0.4) * 1000);
}

function keysLeftDone() {
    const run = keysLesson.run;
    run.accepting = false;
    keysShowMessage(`えんそう おわり！ ${run.song.style.name}の 左手を ひけたよ！`, 'メロディだけ と 左手つき を ききくらべて みよう ♪');
    keysAudienceClap(KEYS_CLAP_MS);
    const answers = document.getElementById('keysAnswers');
    answers.innerHTML = `
        <button type="button" class="keys-perform-button listen">左手つきで きく</button>
        <button type="button" class="keys-perform-button melody">メロディだけ</button>
        <button type="button" class="keys-perform-button again">この 曲を もういちど</button>
        <button type="button" class="keys-perform-button another">べつの 曲</button>
        <button type="button" class="keys-perform-button finish">えんそうを おわる</button>`;
    answers.querySelector('.listen').addEventListener('click', () => keysLeftPlayback(true));
    answers.querySelector('.melody').addEventListener('click', () => keysLeftPlayback(false));
    answers.querySelector('.again').addEventListener('click', keysPerformAgain);
    answers.querySelector('.another').addEventListener('click', () => keysPerformFinish('another'));
    answers.querySelector('.finish').addEventListener('click', () => keysPerformFinish('menu'));
    const round = run.round;
    keysLesson.later(() => { if (run.round === round && !keysLesson.playback) keysLeftPlayback(true); }, KEYS_AUTO_PLAYBACK * 1000);
}

// ききくらべ：曲の はやさで ぜんぶ（withLeft：左手つき。左手の 音符は その 拍で 光る）。とめるのは keysStopPlayback
function keysLeftPlayback(withLeft) {
    const run = keysLesson.run;
    if (!run || !run.song) return;
    keysStopPlayback();
    const playback = { bus: TamaSound.bus(), timers: [], left: withLeft };
    keysLesson.playback = playback;
    const song = run.song;
    const beat = keysBeat(song);
    const seconds = keysLeftPlayBars(song, 0, song.lh.length, { left: withLeft, bus: playback.bus });
    keysLeftHead.run(0, song.lh.length * 4, beat, 0.15); // たての せんも いっしょに
    if (withLeft) {
        const problem = keysLeftPerformProblem(song);
        problem.times.forEach((t, i) => playback.timers.push(setTimeout(() => {
            if (keysLesson.playback !== playback) return;
            const el = document.querySelector(`#keysCards .lh-bass [data-i="${i}"]`);
            if (!el) return;
            el.classList.remove('sparkle');
            void el.getBoundingClientRect();
            el.classList.add('sparkle');
        }, (0.15 + t * beat) * 1000)));
    }
    playback.timers.push(setTimeout(() => { if (keysLesson.playback === playback) keysStopPlayback(); }, (seconds + 1) * 1000));
}

// この 曲を もういちど：同じ 曲で イントロ（カウント）から ひきなおす
function keysPerformAgain() {
    const run = keysLesson.run;
    keysStopPlayback();
    document.getElementById('keysAnswers').innerHTML = '';
    run.pos = 0;
    keysShowCards(); // がくふを はじめの ようすに
    const first = document.querySelector('#keysCards .score-row');
    if (first && first.scrollIntoView) first.scrollIntoView({ block: 'nearest' });
    if (run.problem.type === 'leftperform') keysLeftIntro();
    else keysPerformIntro();
}

// ---------- とおし えんそうの 伴奏（つづく 伴奏・イントロ・アウトロ） ----------
//   つづく 伴奏（まって くれる 伴奏）：小節の さいしょの 音を ひくと その 小節の 和音が 鳴りはじめ、つぎの 小節まで 鳴りつづける。
//     テンポで きざまない（子どもの ペースと ぶつからない）。和音は のばす 音色（パッド。keysPadVoice）で、
//     メロディと ちがう 音色・メロディより 下の 高さ（6びょうごとに そっと 鳴らしなおす）。
//     ベース（ひくい ピアノ）：和音が かわる ときに ねもとを ドン、そのあとは 子どもが 1音 ひくたびに 5度 → ねもと … と そっと ついてくる。
//     keysAccomp.idle びょう だれも ひかないと きえる
//   イントロ：伴奏だけで 2小節（1小節め：主和音、2小節め：はじめの 和音へ ひっぱる 和音（keysLeadChord）を のばして カウント 1・2・3・4）。
//     2小節めの さいごの 半拍から うけつける（すこし はやく おしても 1音めに なる）→ 1音めと いっしょに はじめの 和音が 鳴る →「さあ どうぞ！」
//   アウトロ：しめくくりの 1小節（下属和音 → 主和音「アーメン」。主和音で 分散和音を かけあがる）。じぶんの えんそうを きく の さいご
const KEYS_INTRO_BEATS = 8;    // イントロは 2小節
const KEYS_EARLY_BEATS = 0.5;  // はいりの 拍より これだけ まえから うけつける（人は 拍より すこし まえに おしがち）
const KEYS_BASS_VOICE = 'piano'; // ベースの 音色（ひくいので メロディと まざらない）

// まって くれる 伴奏の 和音の 音色：のびる 音色で、メロディと ちがう もの（曲調の 伴奏の 音色が そうなら それ、ちがえば ストリングス）
function keysPadVoice(song = keysLesson.run && keysLesson.run.song) {
    if (!song) return 'strings';
    const { melody, chord } = TamaSongs.soundOf(song.style);
    const spec = TamaSound.VOICES[chord];
    if (chord !== melody && spec && !spec.pluck && spec.fade === null) return chord;
    return melody === 'strings' ? 'organ' : 'strings';
}

// 和音の ベース：[ねもと, 5度]（ひくい ほう。5度が ない 和音は ねもとだけ）
function keysBassNotes(chord) {
    const notes = TamaSongs.chordNotes(chord) || TamaSound.CHORDS[chord];
    if (!notes) return [];
    const root = notes[0] - 12;
    const fifth = notes.find(m => m - notes[0] >= 6 && m - notes[0] <= 8);
    return fifth ? [root, fifth - 12] : [root];
}

const keysAccomp = {
    bus: null,      // 伴奏・イントロ・アウトロの 音の みち（ほかの 画面へ いくと まとめて きる）
    chord: null,    // いま 鳴らしている 和音
    voices: [],     // いま のばしている 音（release で とめる）
    timers: [],
    idleTimer: null,
    idle: 20,       // これだけ ひかないと きえる（びょう）
    steps: 0,       // この 和音で ベースが ついてきた かず（5度・ねもと を かわりばんこに）

    output() {
        if (!this.bus) this.bus = TamaSound.bus();
        return this.bus;
    },

    later(fn, seconds) {
        this.timers.push(setTimeout(fn, seconds * 1000));
    },

    // その 和音を のばしはじめて、ねもとの ベースを ドン（同じ 和音なら そのまま）
    play(chord) {
        if (chord === this.chord) return;
        this.stop();
        this.chord = chord;
        this.steps = 0;
        if (!TamaSound.CHORDS[chord] && TamaSongs.chordNotes(chord)) TamaSound.CHORDS[chord] = TamaSongs.chordNotes(chord);
        const voice = keysPadVoice();
        const notes = TamaSound.CHORDS[chord] || [];
        const bus = this.output();
        // のばす（とぎれないように 6びょうごとに 鳴らしなおす）
        const pad = first => {
            const old = this.voices;
            this.voices = notes.map((midi, i) => TamaSound.note(midi, { voice, gain: 0.16, when: 0.01 + (first ? i * 0.02 : 0), hold: 0.05, bus }));
            old.forEach(v => v.release());
            this.later(() => { if (this.chord === chord) pad(false); }, 6);
        };
        pad(true);
        this.bass(0.26);
        this.poke();
    },

    // 子どもが 1音 ひいた：ベースが そっと ついてくる（5度 → ねもと → 5度 …）
    follow() {
        if (!this.chord) return;
        this.steps++;
        this.bass(0.15);
    },

    bass(gain) {
        const notes = keysBassNotes(this.chord);
        if (!notes.length) return;
        const midi = notes[this.steps % notes.length];
        TamaSound.note(midi, { voice: KEYS_BASS_VOICE, gain, when: 0.01, bus: this.output(), hold: 0.3 }).release();
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
function keysBeat(song = keysLesson.run && keysLesson.run.song) {
    return 60 / TamaSongs.RHYTHMS[song ? song.rhythm : 'utau'].tempo;
}

// アウトロに つかう 和音：下属和音（主和音の 4度 上。曲の 中に あれば その 和音、なければ F か Dm）と 主和音（さいごの 和音）
function keysCadence(style) {
    const tonic = style.chords[style.chords.length - 1];
    const root = TamaSongs.parse(tonic).root;
    const sub = style.chords.find(c => TamaSongs.parse(c).root === (root + 5) % 12) || (style.key === 'Am' ? 'Dm' : 'F');
    return { sub, tonic };
}

// イントロの 主和音（1小節め）：曲調の 調（C か Am）。5音音階の 曲調は 曲の さいごの 和音（音階の 音だけ）
function keysIntroTonic(style) {
    if (style.scale) return style.chords[style.chords.length - 1];
    return style.key === 'Am' ? 'Am' : 'C';
}

// はじめの 和音へ ひっぱる 和音（イントロの 2小節め）：はじめの 和音の 5度 上の 7の和音（F → C7、C → G7、Am → E7）。
//   5音音階の 曲調は 音階の 音だけで できる 和音（5度 上の 7の和音 → 5度 上の 空5度 → 4度 上の 空5度）
function keysLeadChord(style) {
    const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const first = TamaSongs.parse(style.chords[0]);
    const root = first ? first.root : 0;
    const candidates = [`${NAMES[(root + 7) % 12]}7`, `${NAMES[(root + 7) % 12]}5`, `${NAMES[(root + 5) % 12]}5`];
    const fits = name => !style.scale || TamaSongs.tones(name).every(t => style.scale.includes(t));
    const lead = candidates.find(fits) || candidates[0];
    if (!TamaSound.CHORDS[lead]) TamaSound.CHORDS[lead] = TamaSongs.chordNotes(lead);
    return lead;
}

// イントロの 1小節め（主和音）を at びょうから 鳴らす。2小節めの カウントは 小さな カチッ
//   （2小節めの ひっぱる 和音は keysAccomp.play で のばす）
function keysIntroSounds(bus, at) {
    const run = keysLesson.run;
    const tonic = keysIntroTonic(run.song.style);
    const beat = keysBeat();
    if (!TamaSound.CHORDS[tonic]) TamaSound.CHORDS[tonic] = TamaSongs.chordNotes(tonic);
    TamaSound.chord(tonic, { when: at, gain: 0.16, strum: 0.02, bus, voice: keysPadVoice(), hold: 4 * beat * 0.9 });
    TamaSound.note(keysBassNotes(tonic)[0], { when: at, gain: 0.26, bus, voice: KEYS_BASS_VOICE, hold: 2 * beat }).release();
    const ctx = TamaSound.live();
    if (ctx) for (let k = 0; k < 4; k++) TamaSound.click(ctx.currentTime + at + (4 + k) * beat, k === 0, bus);
}

// アウトロ（at びょうから）。おわるまでの びょうを かえす
function keysOutro(bus, at, song = keysLesson.run.song) {
    const { sub, tonic } = keysCadence(song.style);
    const beat = keysBeat(song);
    const voice = keysVoice('chord', song);
    TamaSound.chord(sub, { when: at, gain: 0.18, strum: 0.03, bus, voice, hold: 2 * beat * 0.95 });
    TamaSound.note(TamaSongs.chordNotes(sub)[0] - 12, { when: at, gain: 0.26, bus, voice, hold: 2 * beat * 0.95 }).release();
    const end = at + 2 * beat;
    TamaSound.chord(tonic, { when: end, gain: 0.24, strum: 0.05, bus, voice, hold: 1.8 });
    TamaSound.note(TamaSongs.chordNotes(tonic)[0] - 12, { when: end, gain: 0.3, bus, voice, hold: 1.8 }).release();
    const tones = TamaSongs.chordWhites(tonic).filter(m => m >= 67).slice(0, 4);
    tones.forEach((midi, i) => TamaSound.note(midi, { gain: 0.3, when: end + 0.1 + i * 0.09, bus, voice: keysVoice('melody', song) }).release());
    return end + 1.2;
}

// とおし えんそうの はじまり：イントロ（2小節）→「さあ どうぞ！」。イントロの あいだは けんばんを うけつけない（さいごの 半拍から うけつける）
// ---------- ステージ（とおし えんそうの あいだ） ----------
//   まわりが 暗く なって がくふに スポットライト。タマが 観客として 曲に あわせて ゆれて、おわったら 拍手（css/music.css）。
//   とおし えんそうの イントロから、その 曲を はなれる（べつの 曲・えんそうを おわる・ほかの 画面）まで
const KEYS_CLAP_MS = 1800; // ひきおわった ときの タマの 拍手の ながさ

function keysStage(on) {
    const screen = document.getElementById('keysScreen');
    const audience = screen.querySelector('.keys-audience');
    screen.classList.toggle('on-stage', on);
    if (on) screen.style.setProperty('--beat', `${keysBeat()}s`);
    audience.classList.toggle('sway', on);
    if (!on) audience.classList.remove('clap');
}

// タマの 拍手（ms ミリびょう。0 は おわるまで ずっと）。そのあいだは ゆれない
function keysAudienceClap(ms = 0) {
    const audience = document.querySelector('#keysScreen .keys-audience');
    const turn = keysLesson.claps = (keysLesson.claps || 0) + 1; // あとの 拍手を まえの 拍手の おわりで とめない
    audience.classList.add('clap');
    audience.classList.remove('sway');
    if (ms) {
        keysLesson.later(() => {
            if (keysLesson.claps !== turn) return;
            audience.classList.remove('clap');
            audience.classList.add('sway');
        }, ms);
    }
}

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
    keysStage(true); // まわりが 暗く なって スポットライト。タマが ゆれる
    keysIntroSounds(keysAccomp.output(), at);
    keysShowMessage('♪ イントロ ♪ よく きいてね');
    // 2小節め：はじめの 和音へ ひっぱる 和音を のばして カウント（はじめの 和音は 子どもの 1音めと いっしょに 鳴る）
    keysLesson.later(() => keysAccomp.play(keysLeadChord(style)), (at + 4 * beat) * 1000);
    for (let k = 0; k < 4; k++) {
        keysLesson.later(() => keysShowMessage(`${'・'.repeat(k)}${k + 1}`), (at + (4 + k) * beat) * 1000);
    }
    // はいりの 拍の すこし まえから うけつける（ちょうどで きると、すこし はやく おした 1音めが はじかれる）
    keysLesson.later(() => { run.accepting = true; }, (at + (KEYS_INTRO_BEATS - KEYS_EARLY_BEATS) * beat) * 1000);
    keysLesson.later(() => {
        keysShowMessage(`さあ どうぞ！ ${style.sub}を さいごまで ひこう。じぶんの ペースで いいよ`);
    }, (at + KEYS_INTRO_BEATS * beat) * 1000);
}

// じぶんの えんそうを きく：イントロなしで すぐ 曲 → アウトロ。はやさは リズムの tempo。
//   メロディは 4/4拍子の マス目を もとに、ひいた ときの ずれを ゆれ（ルバート）に、つっかえを ため（フェルマータ）に、
//   まちがえた 音を かざりの 音に（TamaSongs.expressive）。ミスでは なく えんそうの 味として
//   伴奏：曲調ごとの 型（TamaSongs.ACCOMPS：4分で きざむ・ズン・チャッ・はねる・分散和音・のばす。ほかは 1拍めと 3拍めに 和音と ベース）。
//     ためでは 伴奏が そっと 分散和音で まつ。
//   音符・きゅうふは その 拍で 光る。「もういちど きく」で はじめから。ほかの ボタン（この 曲を もういちど・べつの 曲・えんそうを おわる）や ほかの 画面で 止まる
const PLAYBACK_START = 0.3; // 何秒 あとから

function keysPlayback() {
    const run = keysLesson.run;
    if (!run || !run.song) return;
    if (keysLesson.playback) {
        keysStopPlayback(); // ながれている ときは とめる
        return;
    }
    keysPlaySong(run.song, run.take, { flash: true });
}

// 曲を 鳴らす（song：{ style, rhythm, phrases }、take：ひいた きろく）。flash：がくふを 光らせる、onEnd：おわったら。
//   きょくノート（js/song-note.js）からも つかう。かえすのは ながしている もの（keysStopPlayback で とまる）
function keysPlaySong(song, take, { flash: lights = false, onEnd = null } = {}) {
    keysStopPlayback();
    const playback = { bus: TamaSound.bus(), timers: [], onEnd };
    keysLesson.playback = playback;
    const later = (fn, seconds) => playback.timers.push(setTimeout(() => {
        if (keysLesson.playback === playback) fn();
    }, seconds * 1000));
    // その 拍で もういちど 光らせる（音符は キラリン、きゅうふは ぽわっと）
    const flash = (selector, cls, seconds) => lights && later(() => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.classList.remove(cls);
        void el.getBoundingClientRect();
        el.classList.add(cls);
        const row = el.closest('svg');
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, seconds);
    const bus = playback.bus;
    const beat = keysBeat(song);
    const melody = keysVoice('melody', song);
    const chord = keysVoice('chord', song);
    const phrases = song.phrases;
    const expr = TamaSongs.expressive(phrases, take, beat);
    const time = b => PLAYBACK_START + b * beat; // 拍 → びょう
    let restIndex = 0;
    const accomp = TamaSongs.accompOf(song.style);
    phrases.forEach((phrase, b) => {
        // 曲調の 伴奏の 型（TamaSongs.ACCOMPS）。ためが あれば その ぶん うしろへ、のばす 拍も のびる
        TamaSongs.accompBar(accomp, phrase.chord).forEach(e => {
            const at = time(expr.warp(b * 4 + e.at));
            const hold = (time(expr.warp(b * 4 + e.at + e.hold)) - at) * 0.95;
            if (e.chord) {
                TamaSound.chord(phrase.chord, { when: at, gain: e.gain, strum: e.strum, bus, voice: chord, hold });
            } else {
                e.notes.forEach(midi => TamaSound.note(midi, { when: at, gain: e.gain, bus, voice: chord, hold }).release());
            }
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
    const end = keysOutro(bus, time(expr.warp(phrases.length * 4)), song);
    later(keysStopPlayback, end + 1);
    return playback;
}

// きくのを やめる：まだ 鳴っていない 音も、鳴っている 音も ぜんぶ けす
function keysStopPlayback() {
    const playback = keysLesson.playback;
    if (!playback) return;
    keysLesson.playback = null;
    keysLeftHead.stop(); // ヘおん マスタークラスの たての せん
    playback.timers.forEach(clearTimeout);
    if (playback.bus) playback.bus.disconnect();
    if (playback.onEnd) playback.onEnd();
}

// くろいけんばんの問題で 正解したら、その けんばんの 名前を ぜんぶ見せる（ド♯ で こたえても「ド♯／レ♭」）
//   白いけんばんに なる 名前（ミ♯ など）は「ミ♯は ファ！」
function keysShowBothNames(midi) {
    const problem = keysLesson.run.problem;
    if (!problem.names) return;
    const keyboard = keysLesson.keyboard;
    if (problem.onWhite) {
        keyboard.balloon(midi, `${problem.names[0]}は ${TamaNotes.namesOf(midi)[0]}！`, { ms: 1600 }); // 「シ♯は ド！」（オクターブは いわない）
    } else if (TamaNotes.isBlack(midi)) {
        keyboard.balloon(midi, TamaNotes.namesOf(midi).join('／'), { ms: 1600 });
    }
}

// 五線の 音符を 名前の ボタン（ド〜シ）で こたえる（ヘおんよみ の まえはん。オクターブは とわない）
//   正解すると その 高さの 音が 鳴って、けんばんの その 場所が 光り、上に 名前（「ひくいソ」など）。おだんご・メロディは つぎの 音へ
function keysOnReadName(step, button) {
    const run = keysLesson.run;
    if (!run || run.finished || !run.accepting || !run.problem) return;
    const expected = run.problem.notes[run.pos];
    if (expected === undefined) return;
    const flash = cls => {
        button.classList.remove('ok', 'ng');
        void button.offsetWidth;
        button.classList.add(cls);
        setTimeout(() => button.classList.remove(cls), 450);
    };
    if (step === TamaNotes.stepOf(expected)) {
        flash('ok');
        const voice = keysLesson.keyboard.sound(expected);
        setTimeout(() => voice.release(), 450);
        keysLesson.keyboard.balloon(expected, TamaNotes.lessonName(expected));
        keysOnPress(expected, true, true);
    } else {
        flash('ng');
        keysMistake(TamaNotes.NAMES[step], TamaNotes.NAMES[TamaNotes.stepOf(expected)]);
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
        keysMistake(TamaNotes.spellName(step, problem.answerAlter), problem.answer, problem.given);
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

    let pause = run.problem.pause || 900;
    if (run.problem.leftBar !== undefined && run.song) {
        // ヘおん マスタークラス：ひいた 左手を、右手（メロディ）と いっしょに 1小節 鳴らす
        pause = keysLeftPlayBars(run.song, run.problem.leftBar, run.problem.leftBar + 1) * 1000 + 300;
    } else {
        TamaSound.chord(run.problem.chord, { voice: keysVoice('chord'), hold: 0.8 });
    }
    document.getElementById('keysCards').classList.add('solved');

    if (!problemState.mistakeMade) {
        problemState.correctStreak++;
        keysPileCoin(problemState.correctStreak % 5 === 0); // 5問ごとに金のドロップ
    }
    keysLesson.later(keysNextProblem, pause);
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
//   マスタークラスは クリアの 画面を 出さずに これだけ（keysPerformFinish。gold：はじめての 系統で かならず 金）
function keysRecordClear(gold = false) {
    const run = keysLesson.run;
    run.finished = true;
    run.accepting = false;
    const level = problemState.level;
    const clearTime = stopTimer();
    saveBestTime(level, endTime - startTime);
    // おとあそび・しくみは、いつも そのレベルの色のドロップ（金は、まちがえずに こたえたとき）
    const drop = createRewardCoin(level, !['free', 'tour'].includes(run.def.style), gold);

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
