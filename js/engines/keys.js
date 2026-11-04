// けんばんレッスンの進め方
//   カードに出た音（ド・レ・ミ …）の けんばんを おす。メロディは 左から じゅんばんに おす
//   まちがえても、おした けんばんの音は鳴る（なんの音を おしたか、ふきだしで見せる）
//   正解すると、その音を ふくむ和音が 小さく ポロロンと鳴る（js/sound.js の chord）
//   ドロップ・まちがいの上限・まちがえた問題をさいごにもういちど は、計算と同じ

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

// 1つの音に合う和音（ド・ミ・ソ → C、ファ・ラ → F、レ・シ → G）
function keysChordFor(midi) {
    const pc = ((midi % 12) + 12) % 12;
    if ([5, 9].includes(pc)) return 'F';
    if ([2, 11].includes(pc)) return 'G';
    return 'C';
}

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

// オニ：見せる けんばんの はしを 毎回ずらす（ドが 左はしに こないように）
function keysOniView(def) {
    const starts = [52, 53, 55, 57, 59]; // ミ・ファ・ソ・ラ・シ（まんなかのドの 下）
    const from = starts[Math.floor(Math.random() * starts.length)];
    const whites = TamaNotes.whiteKeys(from, 96);
    return [from, whites[12]]; // 白いけんばん 13こ
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
    keysRenderKeyboard(def.view || keysOniView(def));

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
    if (keysLesson.keyboard) keysLesson.keyboard.releaseAll();
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
    if (run.def.style === 'oni') {
        keysRenderKeyboard(keysOniView(run.def));
    }
    keysUpdateRemaining();
    keysShowCards();
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
function keysNameSVG(midi, size = 'big') {
    const name = TamaNotes.lessonName(midi);
    const high = name.startsWith('たかい');
    const main = high ? name.slice(3) : name;
    const color = TamaNotes.color(midi);
    const fontSize = main.length > 1 ? 74 : 92;
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
    const cards = document.getElementById('keysCards');
    const notes = run.problem.notes;
    cards.className = `keys-cards ${notes.length > 1 ? 'phrase' : 'single'}`;
    cards.innerHTML = notes.map((midi, i) =>
        `<div class="keys-card${i === 0 ? ' current' : ''}" data-i="${i}">${keysNameSVG(midi)}</div>`).join('');
    keysShowMessage(notes.length > 1 ? 'ひだりから じゅんばんに おしてね' : '');
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

    if (!inRange) {
        keyboard.balloon(midi, 'あかるい けんばんで さがしてね', { color: '#555', ms: 1300 });
        return;
    }

    const expected = run.problem.notes[run.pos];
    if (midi === expected) {
        keyboard.mark(midi, 'ok');
        const card = document.querySelector(`#keysCards .keys-card[data-i="${run.pos}"]`);
        if (card) {
            card.classList.remove('current');
            card.classList.add('done');
        }
        run.pos++;
        if (run.pos < run.problem.notes.length) {
            const next = document.querySelector(`#keysCards .keys-card[data-i="${run.pos}"]`);
            if (next) next.classList.add('current');
            return;
        }
        keysSolved();
    } else {
        keyboard.mark(midi, 'ng');
        keyboard.balloon(midi, `${TamaNotes.lessonName(midi)}だよ`);
        keysMistake(midi, expected);
    }
}

function keysSolved() {
    const run = keysLesson.run;
    run.accepting = false;
    const problemMs = Date.now() - problemState.problemStartedAt;
    if (problemMs > History.INVALID_MS) {
        run.paused = true;
    }
    History.recordProblem(currentMode.id, run.problem.key, !problemState.mistakeMade, problemMs);
    if (problemState.mistakeMade && !run.isReview) {
        run.reviewQueue.push(run.problem); // まちがえた問題は、さいごにもういちど
    }

    TamaSound.chord(run.problem.chord);
    document.getElementById('keysCards').classList.add('solved');

    if (!problemState.mistakeMade) {
        problemState.correctStreak++;
        throwCoin(problemState.level, problemState.correctStreak % 5 === 0, 50, 1); // 5問ごとに金のドロップ
    }
    keysLesson.later(keysNextProblem, 900);
}

function keysMistake(pressed, expected) {
    const run = keysLesson.run;
    problemState.mistakeMade = true;
    problemState.mistakeCount++;
    problemState.levelMistakes++;
    problemState.correctStreak = 0;
    problemState.mistakes.push({
        problem: run.problem.notes.map(m => TamaNotes.lessonName(m)).join('・'),
        pressed: TamaNotes.lessonName(pressed),
        correct: TamaNotes.lessonName(expected),
    });
    if (problemState.mistakeCount >= currentMode.maxMistakes) {
        run.accepting = false;
        run.finished = true;
        keysShowMistakeModal();
    }
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
    // おとあそびは、いつも そのレベルの色のドロップ（金は、まちがえずに こたえたとき）
    const drop = createRewardCoin(level, run.def.style !== 'free');

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
        li.textContent = `「${m.problem}」で ${m.pressed} を おした 【せいかいは ${m.correct}】`;
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
