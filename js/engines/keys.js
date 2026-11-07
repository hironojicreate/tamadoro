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
function keysPhraseDeck(count) {
    const deck = [];
    for (let i = 0; i < count; i++) {
        let chord = KEYS_PROGRESSION[i % KEYS_PROGRESSION.length];
        if (chord === 'G' && Math.random() < 0.5) chord = 'G7';
        const choices = KEYS_PHRASES[chord].filter(p => !deck.length || deck[deck.length - 1].key !== keysPhrase(p, chord).key);
        deck.push(keysPhrase(choices[Math.floor(Math.random() * choices.length)], chord));
    }
    return deck;
}

function keysBuildDeck(def) {
    if (def.style === 'free') return [];
    if (def.style === 'tour') return keysTourDeck();
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
    if (def.style === 'phrase') return keysPhraseDeck(def.count);
    if (def.style === 'oni') {
        const whites = TamaNotes.whiteKeys(def.active[0], def.active[1]);
        const singles = [];
        while (singles.length < def.singles) {
            keysShuffle(whites).forEach(midi => { if (singles.length < def.singles) singles.push(keysSingle(midi)); });
        }
        return keysShuffleNoRepeat([...singles, ...keysPhraseDeck(def.phrases)]);
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
        finished: false,
        paused: false,        // とちゅうで手をとめた（1問に長くかかった）か
    };
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
    keysLesson.keyboard.sound = def.sing ? keysSingingSound : midi => TamaSound.note(midi);
    if (def.sing) {
        // うたう 声を さきに つくっておく（まんなかの ドの ちかくから）
        const whites = TamaNotes.whiteKeys(def.active[0], def.active[1]);
        TamaSing.prepare(whites.sort((a, b) => Math.abs(a - 66) - Math.abs(b - 66)), 'doremi');
    }
    keysRenderKeyboard(def.view || keysOniView());

    document.getElementById('keysHint').textContent = def.hint || '';

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
        label: midi => def.guide === 'all' && midi >= def.active[0] && midi <= def.active[1] && !vanished.includes(midi),
    });
}

function keysRetryLevel() {
    document.getElementById('completionModal').style.display = 'none';
    document.getElementById('mistakeModal').style.display = 'none';
    clearCoinsOnDOM();
    keysStartLevel(problemState.level);
}

// やめるとき（はじめにもどる・ほかの画面へ）
function keysStopLevel() {
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
}

function keysUpdateRemaining() {
    const run = keysLesson.run;
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

    if (problem.type === 'lines') {
        keysShowLines();
        keysShowMessage('せんは なんぼん？ 1ぽんめ（いちばん下の せん）から じゅんばんに タッチして かぞえよう');
        return;
    }

    if (currentMode.display === 'staff') {
        // おんぷよみ：五線の 音符（メロディは 左から じゅんばんに。いま 読む音符が ピンク）
        cards.className = `keys-cards staff ${notes.length > 1 ? 'phrase' : 'single'}${run.def.style === 'tour' ? ' tour' : ''}`;
        const options = { reveal: problem.reveal, tags: problem.tags, focusLedger: problem.focusLedger, dango: problem.dango, names: problem.showNames };
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

function keysShowMessage(text) {
    document.getElementById('keysMessage').textContent = text;
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

    TamaSound.chord(run.problem.chord);
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
    const run = keysLesson.run;
    run.finished = true;
    run.accepting = false;
    const level = problemState.level;
    const clearTime = stopTimer();

    document.getElementById('keysRemaining').textContent = `のこり0${currentMode.texts.unit}！おわったよ！！`;
    document.getElementById('modalTitle').textContent = currentMode.texts.clearTitle(level);
    document.getElementById('clearTime').textContent = `クリアタイム ${clearTime}`;
    const weakResult = document.getElementById('weakClearResult');
    if (weakResult) weakResult.style.display = 'none';

    saveBestTime(level, endTime - startTime);
    const bestTime = getBestTime(level);
    document.getElementById('bestTime').textContent =
        `${currentMode.texts.best} ${bestTime !== null ? formatTime(bestTime) : '--:--'}`;

    document.getElementById('completionModal').style.display = 'flex';
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
