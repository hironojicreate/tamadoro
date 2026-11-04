// リズムの進め方
//   右から 流れてくる リズム（タン・タタ・ウン・ターアー）に 合わせて、たたく
//   拍は 音の時計（AudioContext）で きめる。メトロノームも おてほんの たいこも、はじめに まとめて 予約して 鳴らす
//   たたいた 時刻は「そのとき スピーカーから 出ていた 音」の 時刻に なおして くらべる（TamaSound.heardTime）
//   さらに「ずれの ちょうせい」（Lv1）で はかった その端末の ずれを ひく（ブルートゥースの イヤホンなど）
//
//   どこを たたいても いい（画面の どこでも・パソコンの スペースキーなど）。たたくと すぐ ポンと鳴る
//   ぴったり（±0.08びょう）・いいね（±0.18びょう）・ミス（たたかなかった・おやすみ（ウン）で たたいた）
//   ミスが maxMistakes こ より すくなければ クリア（0こなら 金のドロップ）。1しょうせつ ミスなしで ドロップが とぶ

const RHYTHM_OFFSET_KEY = 'tamadoro.rhythm.offset'; // ずれの ちょうせいの けっか（秒。プラスは おそめに たたく）

// リズムの ことば（1しょうせつ ＝ 4はく）
//   hits：その中で たたく ところ（はく）
const RHYTHM_TOKENS = {
    q: { beats: 1, hits: [0], syllables: ['タン'] },          // 4ぶおんぷ
    e: { beats: 1, hits: [0, 0.5], syllables: ['タ', 'タ'] }, // 8ぶおんぷ 2こ
    r: { beats: 1, hits: [], syllables: ['ウン'] },           // 4ぶきゅうふ
    h: { beats: 2, hits: [0], syllables: ['ター', 'アー'] },  // 2ぶおんぷ
};

const RHYTHM_PX = 110;      // 1はくの はば（px）
const RHYTHM_COUNT_IN = 4;  // はじめの「1・2・3・4」

const rhythm = {
    run: null,
    raf: 0,
    tapsBound: false,
};

function rhythmLevelDef() {
    return currentMode.levels[problemState.level - 1];
}

function rhythmOffset() {
    const value = TamaStore.readJSON(RHYTHM_OFFSET_KEY, 0);
    return typeof value === 'number' ? value : 0;
}


// ---------- しょうせつを つくる ----------

// tokens から 1しょうせつ（4はく）を ばらばらに。ぜんぶ やすみ・やすみ 3こ以上 には しない
function rhythmMakeBar(tokens) {
    for (let tries = 0; tries < 200; tries++) {
        const bar = [];
        let beats = 0;
        while (beats < 4) {
            const fits = tokens.filter(t => RHYTHM_TOKENS[t].beats <= 4 - beats);
            const token = fits[Math.floor(Math.random() * fits.length)];
            bar.push(token);
            beats += RHYTHM_TOKENS[token].beats;
        }
        const rests = bar.filter(t => t === 'r').length;
        if (rests < 3 && rests < bar.length) return bar;
    }
    return ['q', 'q', 'q', 'q'];
}

// レベル → しょうせつの ならび（required の ことばは どこかに かならず 入れる）
function rhythmMakeBars(def) {
    if (def.fixed) return def.fixed.map(bar => [...bar]);
    for (let tries = 0; tries < 200; tries++) {
        const bars = [];
        for (let i = 0; i < def.bars; i++) {
            let bar = rhythmMakeBar(def.tokens);
            // となりと 同じ しょうせつは なるべく さける
            for (let k = 0; k < 10 && bars.length && bar.join() === bars[bars.length - 1].join(); k++) bar = rhythmMakeBar(def.tokens);
            bars.push(bar);
        }
        const all = bars.flat();
        if ((def.required || []).every(t => all.includes(t))) return bars;
    }
    return Array.from({ length: def.bars }, () => ['q', 'q', 'q', 'q']);
}

// しょうせつ → たたく 音符（はくの 位置）と、やすみ（ウン）の はんい
function rhythmTimeline(bars) {
    const notes = [];
    const rests = [];
    const tokens = [];
    bars.forEach((bar, b) => {
        let beat = RHYTHM_COUNT_IN + b * 4;
        bar.forEach(token => {
            const info = RHYTHM_TOKENS[token];
            tokens.push({ token, beat, bar: b });
            info.hits.forEach((h, i) => notes.push({ beat: beat + h, bar: b, token, i, result: null }));
            if (token === 'r') rests.push({ from: beat, to: beat + 1, bar: b });
            beat += info.beats;
        });
    });
    return { notes, rests, tokens, beats: RHYTHM_COUNT_IN + bars.length * 4 };
}


// ---------- がくふ（流れる 帯） ----------

function rhythmX(beat) {
    return 40 + beat * RHYTHM_PX;
}

// 4ぶきゅうふ（ギザギザ）の かたち
function rhythmRestPath(x) {
    return `M ${x - 3},48 L ${x + 7},62 L ${x - 3},74 L ${x + 7},88 C ${x - 6},84 ${x - 8},94 ${x},100`;
}

function rhythmScoreSVG(timeline, bars) {
    const width = rhythmX(timeline.beats + 2);
    const parts = [];
    // せん・はくの しるし
    parts.push(`<line class="rh-line" x1="0" y1="80" x2="${width}" y2="80"/>`);
    for (let beat = 0; beat < timeline.beats; beat++) {
        parts.push(`<circle class="rh-tick" cx="${rhythmX(beat)}" cy="112" r="3"/>`);
    }
    // はじめの 1・2・3・4
    for (let beat = 0; beat < RHYTHM_COUNT_IN; beat++) {
        parts.push(`<text class="rh-count" x="${rhythmX(beat)}" y="92" text-anchor="middle">${beat + 1}</text>`);
    }
    // しょうせつの せん
    bars.forEach((bar, b) => {
        const x = rhythmX(RHYTHM_COUNT_IN + b * 4) - RHYTHM_PX * 0.4;
        parts.push(`<line class="rh-barline" x1="${x}" y1="40" x2="${x}" y2="120"/>`);
    });
    const endX = rhythmX(timeline.beats) - RHYTHM_PX * 0.4;
    parts.push(`<line class="rh-barline end" x1="${endX}" y1="40" x2="${endX}" y2="120"/>`);

    // 音符・やすみ・ことば
    let noteIndex = 0;
    timeline.tokens.forEach(({ token, beat }) => {
        const x = rhythmX(beat);
        const info = RHYTHM_TOKENS[token];
        if (token === 'r') {
            parts.push(`<path class="rh-rest" d="${rhythmRestPath(x)}"/>`);
        } else if (token === 'e') {
            const x2 = rhythmX(beat + 0.5);
            parts.push(`<g class="rh-note" data-n="${noteIndex}"><ellipse class="rh-head" cx="${x}" cy="80" rx="11" ry="8" transform="rotate(-22 ${x} 80)"/><line class="rh-stem" x1="${x + 10}" y1="77" x2="${x + 10}" y2="26"/></g>`);
            parts.push(`<g class="rh-note" data-n="${noteIndex + 1}"><ellipse class="rh-head" cx="${x2}" cy="80" rx="11" ry="8" transform="rotate(-22 ${x2} 80)"/><line class="rh-stem" x1="${x2 + 10}" y1="77" x2="${x2 + 10}" y2="26"/></g>`);
            parts.push(`<rect class="rh-beam" x="${x + 8}" y="24" width="${x2 - x + 4}" height="8" rx="2"/>`);
        } else {
            const hollow = token === 'h' ? ' hollow' : '';
            parts.push(`<g class="rh-note${hollow}" data-n="${noteIndex}"><ellipse class="rh-head" cx="${x}" cy="80" rx="11" ry="8" transform="rotate(-22 ${x} 80)"/><line class="rh-stem" x1="${x + 10}" y1="77" x2="${x + 10}" y2="26"/></g>`);
        }
        noteIndex += info.hits.length;
        // ことば（タン・タ タ・ウン・ター アー）
        info.syllables.forEach((syllable, i) => {
            const sx = rhythmX(beat + (token === 'e' ? i * 0.5 : i));
            parts.push(`<text class="rh-syllable${token === 'r' ? ' rest' : ''}" x="${sx}" y="146" text-anchor="middle">${syllable}</text>`);
        });
    });
    return `<svg class="rh-score" width="${width}" height="160" viewBox="0 0 ${width} 160">${parts.join('')}</svg>`;
}


// ---------- レベルの開始 ----------

function rhythmStartLevel(level) {
    rhythmStopLevel();
    problemState.level = level;
    problemState.isWeakChallenge = false;
    problemState.isSpecialCourse = false;
    problemState.mistakeCount = 0;
    problemState.levelMistakes = 0;
    problemState.mistakes = [];
    const def = rhythmLevelDef();
    restoreCoins(level);

    const bars = rhythmMakeBars(def);
    const timeline = rhythmTimeline(bars);
    rhythm.run = {
        def,
        bars,
        timeline,
        phase: 'ready',   // ready（えらぶ）・demo（おてほん）・play（たたく）・done
        start: 0,         // 1はくめ（はじめの 1）の 音の時計の 時刻
        spb: 60 / def.bpm, // 1はくの 秒
        bus: null,
        taps: [],         // ちょうせい：たたいた ずれ
        barDone: new Set(),
        streak: 0,
    };
    problemState.patterns = bars;

    document.getElementById('rhythmLane').innerHTML = rhythmScoreSVG(timeline, bars);
    document.getElementById('rhythmHint').textContent = def.hint || '';
    rhythmShowReady();
    rhythmBindTaps();
}

function rhythmShowReady(note = '') {
    const run = rhythm.run;
    run.phase = 'ready';
    requestAnimationFrame(() => { if (rhythm.run === run) rhythmPlaceLane(-1); }); // 画面が 見えてから（はばが きまってから）
    document.getElementById('rhythmStartButtons').style.display = '';
    document.getElementById('rhythmDemo').style.display = run.def.calibrate ? 'none' : '';
    const muted = TamaSound.muted ? '（おと が「なし」に なっているよ。おんがくのへやで「あり」に してね）' : '';
    document.getElementById('rhythmMessage').textContent = note || (run.def.calibrate
        ? 'カチッ に 合わせて、どこでも いいから たたいてね'
        : 'おてほんを きいてから、スタート！') + muted;
    document.getElementById('rhythmInfo').textContent = `${run.def.bpm}テンポ・${run.bars.length}しょうせつ`;
}

function rhythmRetryLevel() {
    document.getElementById('completionModal').style.display = 'none';
    document.getElementById('mistakeModal').style.display = 'none';
    clearCoinsOnDOM();
    rhythmStartLevel(problemState.level);
}

function rhythmStopLevel() {
    cancelAnimationFrame(rhythm.raf);
    const run = rhythm.run;
    if (run && run.bus) run.bus.disconnect();
    rhythm.run = null;
}


// ---------- ならす（おてほん・スタート） ----------

// メトロノーム（と、おてほんなら たいこ）を まとめて 予約して、帯を 流しはじめる
function rhythmBegin(phase) {
    const run = rhythm.run;
    if (!run || (run.phase !== 'ready')) return;
    TamaSound.unlock();
    run.phase = phase;
    run.timeline.notes.forEach(n => { n.result = null; });
    document.querySelectorAll('#rhythmLane .rh-note').forEach(n => n.classList.remove('perfect', 'good', 'miss'));
    run.barDone = new Set();
    run.taps = [];
    document.getElementById('rhythmStartButtons').style.display = 'none';
    document.getElementById('rhythmMessage').textContent = phase === 'demo' ? 'おてほん。きいてね' : '';

    run.start = TamaSound.now() + 0.6;
    run.bus = TamaSound.bus();
    for (let beat = 0; beat < run.timeline.beats; beat++) {
        TamaSound.click(run.start + beat * run.spb, beat % 4 === 0, run.bus);
    }
    if (phase === 'demo') {
        run.timeline.notes.forEach(n => TamaSound.drum(run.start + n.beat * run.spb, run.bus));
    }
    if (phase === 'play') {
        problemState.problemStartedAt = Date.now();
        startTimer();
    }
    rhythm.raf = requestAnimationFrame(rhythmFrame);
}

// いまの はく（聞こえている 音で）
function rhythmBeatNow() {
    const run = rhythm.run;
    return (TamaSound.heardTime() - run.start) / run.spb;
}

function rhythmPlaceLane(beat) {
    const lane = document.getElementById('rhythmLane');
    const hitX = lane.clientWidth * 0.25;
    const svg = lane.querySelector('.rh-score');
    if (svg) svg.style.transform = `translateX(${hitX - rhythmX(beat)}px)`;
}

function rhythmFrame() {
    const run = rhythm.run;
    if (!run || (run.phase !== 'demo' && run.phase !== 'play')) return;
    const beat = rhythmBeatNow();
    rhythmPlaceLane(beat);
    // はじめの 1・2・3・4 を 大きく
    const count = Math.floor(beat);
    document.getElementById('rhythmCount').textContent = count >= 0 && count < RHYTHM_COUNT_IN ? String(count + 1) : '';

    if (run.phase === 'play') rhythmCheckMisses(beat);

    if (beat > run.timeline.beats + 0.5) {
        if (run.phase === 'demo') {
            if (run.bus) run.bus.disconnect();
            rhythmShowReady();
        } else {
            rhythmFinish();
        }
        return;
    }
    rhythm.raf = requestAnimationFrame(rhythmFrame);
}


// ---------- たたく ----------

function rhythmBindTaps() {
    if (rhythm.tapsBound) return;
    rhythm.tapsBound = true;
    // 画面の どこを たたいても いい（ドロップの上でも）。ボタン・モーダルは のぞく
    document.addEventListener('pointerdown', event => {
        if (document.getElementById('rhythmScreen').style.display !== 'block') return;
        if (event.target.closest('button, #completionModal, #mistakeModal, #dataModal, input, label')) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        rhythmTap(event.timeStamp);
    }, true);
    document.addEventListener('keydown', event => {
        if (document.getElementById('rhythmScreen').style.display !== 'block') return;
        if (event.repeat || !(event.code === 'Space' || event.code === 'Enter' || /^Key[A-Z]$/.test(event.code))) return;
        if (event.code === 'Space') event.preventDefault();
        rhythmTap(event.timeStamp);
    });
}

function rhythmTap(eventTimeStamp) {
    const run = rhythm.run;
    if (!run || run.phase === 'done') return;
    TamaSound.drum();
    const pad = document.getElementById('rhythmPad');
    pad.classList.remove('hit');
    void pad.offsetWidth;
    pad.classList.add('hit');
    if (run.phase !== 'play') return;
    rhythmJudge(TamaSound.heardTime(eventTimeStamp));
}

// たたいた 時刻（音の時計）→ いちばん 近い まだの 音符と くらべる
function rhythmJudge(heard) {
    const run = rhythm.run;
    const def = run.def;
    const calibrate = !!def.calibrate;
    const offset = calibrate ? 0 : rhythmOffset();
    const beat = (heard - offset - run.start) / run.spb;
    const window = calibrate ? 0.35 : def.good;

    let best = null;
    run.timeline.notes.forEach(n => {
        if (n.result) return;
        const diff = (beat - n.beat) * run.spb; // 秒
        if (Math.abs(diff) <= window && (!best || Math.abs(diff) < Math.abs(best.diff))) best = { note: n, diff };
    });

    if (best) {
        const { note, diff } = best;
        if (calibrate) {
            run.taps.push(diff);
            note.result = 'perfect';
        } else {
            note.result = Math.abs(diff) <= def.perfect ? 'perfect' : 'good';
        }
        rhythmMarkNote(note);
        const word = note.result === 'perfect' ? 'ぴったり！' : diff < 0 ? 'いいね（はやめ）' : 'いいね（おそめ）';
        rhythmPopup(calibrate ? '♪' : word, note.result);
        return;
    }
    // おやすみ（ウン）の ところで たたいた
    const rest = run.timeline.rests.find(r => beat >= r.from + 0.15 && beat < r.to - 0.15);
    if (rest && !calibrate) {
        rhythmPopup('ウンは おやすみ！', 'miss');
        rhythmAddMistake(rest.bar, 'ウン（おやすみ）で たたいた');
    }
}

// まにあわなかった 音符は ミス
function rhythmCheckMisses(beatNow) {
    const run = rhythm.run;
    const window = run.def.calibrate ? 0.35 : run.def.good;
    run.timeline.notes.forEach(n => {
        if (n.result) return;
        const offset = run.def.calibrate ? 0 : rhythmOffset();
        if ((beatNow - offset / run.spb - n.beat) * run.spb > window) {
            n.result = 'miss';
            rhythmMarkNote(n);
            if (!run.def.calibrate) {
                rhythmPopup('ミス', 'miss');
                rhythmAddMistake(n.bar, `${RHYTHM_TOKENS[n.token].syllables[n.i] || ''}を たたけなかった`);
            }
        }
    });
    // しょうせつが おわったら：ミスなしなら ドロップ
    run.bars.forEach((bar, b) => {
        if (run.barDone.has(b)) return;
        const notes = run.timeline.notes.filter(n => n.bar === b);
        if (notes.some(n => !n.result)) return;
        if (beatNow < RHYTHM_COUNT_IN + b * 4 + 4) return;
        run.barDone.add(b);
        const clean = notes.every(n => n.result !== 'miss') && !run.barMisses?.has(b);
        History.recordProblem(currentMode.id, bar.map(t => RHYTHM_TOKENS[t].syllables.join('')).join('・'), clean, 0);
        if (clean && !run.def.calibrate) {
            run.streak++;
            throwCoin(problemState.level, run.streak % 4 === 0, 50, 1); // 4しょうせつ ごとに 金
        } else {
            run.streak = 0;
        }
    });
}

function rhythmAddMistake(bar, what) {
    const run = rhythm.run;
    run.barMisses = run.barMisses || new Set();
    run.barMisses.add(bar);
    problemState.mistakeCount++;
    problemState.levelMistakes++;
    problemState.mistakes.push({ bar: bar + 1, what });
}

function rhythmMarkNote(note) {
    const run = rhythm.run;
    const index = run.timeline.notes.indexOf(note);
    const el = document.querySelector(`#rhythmLane .rh-note[data-n="${index}"]`);
    if (el) el.classList.add(note.result);
}

function rhythmPopup(text, kind) {
    const popup = document.getElementById('rhythmPopup');
    popup.textContent = text;
    popup.className = `rhythm-popup ${kind}`;
    void popup.offsetWidth;
    popup.classList.add('show');
}


// ---------- おわり ----------

function rhythmFinish() {
    const run = rhythm.run;
    run.phase = 'done';
    if (run.bus) run.bus.disconnect();
    document.getElementById('rhythmCount').textContent = '';
    const level = problemState.level;
    stopTimer();
    const notes = run.timeline.notes;
    const perfect = notes.filter(n => n.result === 'perfect').length;
    const good = notes.filter(n => n.result === 'good').length;
    const misses = problemState.levelMistakes;

    if (run.def.calibrate) {
        // ちょうせい：たたいた ずれの まんなか（中央値）を おぼえる
        if (run.taps.length < 5) {
            if (run.bus) run.bus.disconnect();
            run.timeline.notes.forEach(n => { n.result = null; });
            document.querySelectorAll('#rhythmLane .rh-note').forEach(n => n.classList.remove('perfect', 'good', 'miss'));
            rhythmShowReady('カチッ に 合わせて、5かい いじょう たたいてね。もういちど！');
            return;
        }
        const sorted = [...run.taps].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const offset = Math.max(-0.3, Math.min(0.3, median));
        TamaStore.writeJSON(RHYTHM_OFFSET_KEY, Math.round(offset * 1000) / 1000);
        const ms = Math.round(offset * 1000);
        document.getElementById('modalTitle').textContent = 'ちょうせい できたよ！';
        document.getElementById('clearTime').textContent = `ずれ ${ms >= 0 ? '+' : ''}${ms}ミリびょう（${Math.abs(ms) < 30 ? 'ぴったり' : ms > 0 ? 'すこし おそめ' : 'すこし はやめ'}）`;
        document.getElementById('bestTime').textContent = 'この ずれの ぶんを なおして はんていするよ';
    } else {
        if (misses >= currentMode.maxMistakes) {
            rhythmShowMistakeModal();
            return;
        }
        document.getElementById('modalTitle').textContent = currentMode.texts.clearTitle(level);
        document.getElementById('clearTime').textContent = `ぴったり ${perfect}こ・いいね ${good}こ・ミス ${misses}こ`;
        document.getElementById('bestTime').textContent = misses === 0 ? 'ミス なし！' : `ミスは ${currentMode.maxMistakes - 1}こ まで だいじょうぶ`;
    }
    const weakResult = document.getElementById('weakClearResult');
    if (weakResult) weakResult.style.display = 'none';
    document.getElementById('completionModal').style.display = 'flex';
    problemState.mistakeCount = misses;
    const drop = createRewardCoin(level, !run.def.calibrate); // ちょうせいは いつも そのレベルの色
    History.addEntry({
        mode: currentMode.id, level, ms: endTime - startTime, total: notes.length,
        miss: misses, cleared: true, drop, paused: false, weakChallenge: false,
    });
}

function rhythmShowMistakeModal() {
    const run = rhythm.run;
    run.phase = 'done';
    History.addEntry({
        mode: currentMode.id, level: problemState.level, ms: Date.now() - startTime, total: run.timeline.notes.length,
        miss: problemState.levelMistakes, cleared: false, drop: null, paused: false, weakChallenge: false,
    });
    document.getElementById('maxMistakes').textContent = problemState.levelMistakes;
    const list = document.getElementById('mistakeList');
    list.innerHTML = '';
    problemState.mistakes.map(m => `${m.bar}しょうせつめ：${m.what}`).forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        list.appendChild(li);
    });
    document.getElementById('mistakeModal').style.display = 'flex';
    problemState.mistakeCount = 0;
}


ENGINES.rhythm = {
    screenId: 'rhythmScreen',
    keypad: false,
    start: rhythmStartLevel,
    retry: rhythmRetryLevel,
    stop: rhythmStopLevel,
    onKey: () => {},
};

document.getElementById('rhythmDemo').addEventListener('click', () => rhythmBegin('demo'));
document.getElementById('rhythmStart').addEventListener('click', () => rhythmBegin('play'));
