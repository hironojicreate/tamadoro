// たしざん・ひきざん・かけざん共通の問題エンジン
//   式「a ＋ b ＝ ？」を出して、テンキーで答えを入れる
//   モードごとの違い（問題・記号・ミスの上限・おたすけだんご）は currentMode（js/modes/）を見る

let pressCount = 0; // 2けたの答えで、いま何けためを入れているか（0: 十の位, 1: 一の位）

// 問題画面で使うドロップの画像を先読み
document.addEventListener('DOMContentLoaded', () => {
    ['/img/drops/G.svg', '/img/drops/S.svg'].forEach(src => {
        new Image().src = src;
    });
});


// ---------- レベルの開始・問題の出題 ----------

function currentLevelDef() {
    return currentMode.levels[problemState.level - 1] || currentMode.levels[0];
}

// 苦手モードの出題方式の切り替えフラグ
//   'intensive' : 苦手3問×4セット＝計12問（徹底暗記モード）
//   'blend'     : 苦手3問×3回＋カモフラージュ6問＝計15問（従来の忘却ブレンド方式）
const WEAK_DECK_STYLE = 'intensive';

function buildWeakDrillDeck(level) {
    if (WEAK_DECK_STYLE === 'blend') {
        return buildWeakDrillDeckBlend(level);
    }
    return buildWeakDrillDeckIntensive(level);
}

// 【新】徹底暗記方式：苦手上位3問 × 4セット ＝ 計12問（カモフラージュなし）
function buildWeakDrillDeckIntensive(level) {
    const isSpecial = (level === 0); // 0 は「特訓コース」
    const weakCandidates = isSpecial ? getAllUnlockedWeakPatterns() : getWeakPatternsForLevel(level);

    // ベースとなる全問題プールを用意（苦手が3問に満たないときの補充用）
    let basePool = [];
    if (isSpecial) {
        for (let lv = 1; lv <= currentMode.levels.length; lv++) {
            const def = currentMode.levels[lv - 1];
            if ((lv === 1 || currentMode.isUnlocked(lv)) && def.style !== 'decompose') {
                basePool.push(...def.patterns());
            }
        }
    } else {
        basePool = currentLevelDef().patterns();
    }

    // 1. 本命の苦手トップ3を選ぶ（足りなければ通常問題からランダムに補充）
    const pickedWeak = weakCandidates.slice(0, 3);
    const targets = pickedWeak.map(w => [w.a, w.b]);
    const shuffledPool = [...basePool].sort(() => Math.random() - 0.5);
    for (const [a, b] of shuffledPool) {
        if (targets.length >= 3) break;
        if (!targets.some(([ta, tb]) => ta === a && tb === b)) {
            targets.push([a, b]);
        }
    }

    // 本当に苦手（HP > 0）だった問題のキーだけを記録（補充された通常問題は卒業メッセージに出さないため）
    problemState.weakTargetKeys = pickedWeak.map(w => w.key);
    problemState.weakAttemptLog = {}; // { '7+8': [{ ok, ms }, ...] }
    problemState.weakRequiredCount = 4; // 4セットすべて正解で卒業判定

    // 2. 苦手3問を4セット（3問×4周＝12問）並べる
    //   セットの境目で同じ問題が2問連続しないようにシャッフルを調整
    const deck = [];
    for (let round = 0; round < 4; round++) {
        const block = [...targets].sort(() => Math.random() - 0.5);
        if (deck.length > 0 && block.length > 1) {
            const [prevA, prevB] = deck[deck.length - 1];
            if (block[0][0] === prevA && block[0][1] === prevB) {
                const swapIdx = 1 + Math.floor(Math.random() * (block.length - 1));
                [block[0], block[swapIdx]] = [block[swapIdx], block[0]];
            }
        }
        deck.push(...block);
    }

    return deck;
}

// 【旧・保存用】忘却ブレンド方式：苦手上位3問×3回（9問）＋ カモフラージュ6問 ＝ 計15問をつくる
function buildWeakDrillDeckBlend(level) {
    const isSpecial = (level === 0); // 0 は「特訓コース」
    const weakCandidates = isSpecial ? getAllUnlockedWeakPatterns() : getWeakPatternsForLevel(level);

    // ベースとなる全問題プールを用意
    let basePool = [];
    if (isSpecial) {
        for (let lv = 1; lv <= currentMode.levels.length; lv++) {
            const def = currentMode.levels[lv - 1];
            if ((lv === 1 || currentMode.isUnlocked(lv)) && def.style !== 'decompose') {
                basePool.push(...def.patterns());
            }
        }
    } else {
        basePool = currentLevelDef().patterns();
    }

    // 1. 本命の苦手トップ3を選ぶ（足りなければ通常問題からランダムに補充）
    const pickedWeak = weakCandidates.slice(0, 3);
    const targets = pickedWeak.map(w => [w.a, w.b]);
    const shuffledPool = [...basePool].sort(() => Math.random() - 0.5);
    for (const [a, b] of shuffledPool) {
        if (targets.length >= 3) break;
        if (!targets.some(([ta, tb]) => ta === a && tb === b)) {
            targets.push([a, b]);
        }
    }

    // 本当に苦手（HP > 0）だった問題のキーだけを記録
    problemState.weakTargetKeys = pickedWeak.map(w => w.key);
    problemState.weakAttemptLog = {}; // { '7+8': [{ ok, ms }, ...] }
    problemState.weakRequiredCount = 3;

    // 2. カモフラージュ問題（6問）を選ぶ
    //   ペア・ブリッジ方式：本命の「逆の式（b, a）」や「隣の数（a, b±1）」があれば優先して混ぜる！
    const relatedPool = [];
    const otherPool = [];
    shuffledPool.forEach(([a, b]) => {
        if (targets.some(([ta, tb]) => ta === a && tb === b)) return;
        const isRelated = targets.some(([ta, tb]) =>
            (a === tb && b === ta) || (a === ta && Math.abs(b - tb) === 1) || (b === tb && Math.abs(a - ta) === 1)
        );
        if (isRelated) {
            relatedPool.push([a, b]);
        } else {
            otherPool.push([a, b]);
        }
    });

    const camouflage = [...relatedPool, ...otherPool].slice(0, 6);
    while (camouflage.length < 6 && shuffledPool.length > 0) {
        camouflage.push(shuffledPool[camouflage.length % shuffledPool.length]);
    }

    // 3. 15問を3ブロック（5問×3周）に分け、同じ問題が連続しないように配置する
    //   各ブロックに「苦手3問 ＋ カモフラージュ2問」を入れることで、適度な間隔（忘却ブレンド）をつくる
    const deck = [];
    for (let round = 0; round < 3; round++) {
        const cam1 = camouflage[round * 2];
        const cam2 = camouflage[round * 2 + 1];
        const block = [...targets];
        if (cam1) block.push(cam1);
        if (cam2) block.push(cam2);

        // ブロック内をシャッフル（前のブロックの最後の問題と先頭が被らないように調整）
        block.sort(() => Math.random() - 0.5);
        if (deck.length > 0) {
            const [prevA, prevB] = deck[deck.length - 1];
            if (block[0][0] === prevA && block[0][1] === prevB && block.length > 1) {
                const swapIdx = 1 + Math.floor(Math.random() * (block.length - 1));
                [block[0], block[swapIdx]] = [block[swapIdx], block[0]];
            }
        }
        deck.push(...block);
    }

    return deck;
}

function drillStartLevel(level) {
    toggleKeypad(false);
    pressCount = 0;
    problemState.isSpecialCourse = (level === 0);
    problemState.isWeakChallenge = isWeakMode;

    // 特訓コース（level === 0）のときは、最も苦手な問題があるレベル（なければLv1）をご褒美ドロップの対象にする
    if (level === 0) {
        const allWeak = getAllUnlockedWeakPatterns();
        problemState.level = allWeak.length > 0 ? allWeak[0].level : 1;
    } else {
        problemState.level = level;
    }

    restoreCoins(problemState.level); // ご褒美コインの復元

    if (problemState.isWeakChallenge) {
        problemState.patterns = buildWeakDrillDeck(level);
    } else {
        problemState.patterns = currentLevelDef().patterns();
        problemState.weakTargetKeys = [];
        problemState.weakAttemptLog = {};
    }

    problemState.solvedCount = 0;    // 何問目まで出したか（にがてモードでは同じ問題が複数回出るためインデックスで管理）
    problemState.solved = [];
    problemState.reviewQueue = [];   // まちがえた問題（最後にもういちど出す）
    problemState.isReview = false;
    problemState.levelMistakes = 0;  // このレベルでまちがえた回数（記録用）
    problemState.paused = false;     // とちゅうで手をとめた（1問に長くかかった）か（記録用）
    problemState.correctStreak = 0;
    problemState.mistakeCount = 0;
    problemState.mistakes = []; // 前回の間違いリストを持ち越さない
    problemState.remainingQuestions = 0;
    problemState.howManyOriginalProblems = 0;
    problemState.useExistingCoins = 0;
    problemState.mistakeMade = false;
    startTimer();
    generateLvProblem(problemState.level);
    updateHelpCheckboxVisibility(problemState.level);
    setTimeout(() => {
        toggleKeypad(true);
    }, 750);
}

function drillRetryLevel() {
    document.getElementById('completionModal').style.display = 'none';
    document.getElementById('mistakeModal').style.display = 'none';
    clearCoinsOnDOM();
    drillStartLevel(problemState.isSpecialCourse ? 0 : problemState.level);
}

// まだ出していない問題から1つ出す。全部出したらクリア（問題を出したら true、クリアなら false）
function generateLvProblem(level) {
    // にがてモードのときは、組み立てた15問のデッキを順番どおりに出す
    if (problemState.isWeakChallenge) {
        if (problemState.solvedCount >= problemState.patterns.length) {
            if (problemState.reviewQueue.length > 0) {
                problemState.isReview = true;
                showProblem(...problemState.reviewQueue.shift());
                return true;
            }
            document.getElementById("remaining-problems").textContent = `のこり0${currentMode.texts.unit}！おわったよ！！`;
            toggleKeypad(false);
            drillShowModal(level);
            return false;
        }
        const [a, b] = problemState.patterns[problemState.solvedCount];
        problemState.solvedCount++;
        problemState.solved.push([a, b]);
        showProblem(a, b);
        return true;
    }

    const unsolvedPatterns = problemState.patterns.filter(
        ([a, b]) => !problemState.solved.some(([sa, sb]) => sa === a && sb === b)
    );

    if (unsolvedPatterns.length === 0) {
        // ぜんぶ出したら、まちがえた問題をもういちど
        if (problemState.reviewQueue.length > 0) {
            problemState.isReview = true;
            showProblem(...problemState.reviewQueue.shift());
            return true;
        }
        document.getElementById("remaining-problems").textContent = `のこり0${currentMode.texts.unit}！おわったよ！！`;
        toggleKeypad(false);
        drillShowModal(level);
        return false;
    }

    // 「n のだん」「さかさ」は順番どおり、ほかはランダム
    const index = currentLevelDef().order === 'ordered' ? 0 : Math.floor(Math.random() * unsolvedPatterns.length);
    const [a, b] = unsolvedPatterns[index];
    showProblem(a, b);
    problemState.solved.push([a, b]);
    return true;
}

function showProblem(a, b) {
    problemState.currentProblem = { a, b };
    problemState.problemStartedAt = Date.now();
    const c = currentLevelDef().style === 'decompose' ? a - b : currentMode.calc(a, b);
    displayProblem(a, b, c);
}

// 記録用の問題の名前（「7+6」「5は2と」など）
function problemKey() {
    const { a, b } = problemState.currentProblem;
    return currentLevelDef().style === 'decompose' ? `${a}は${b}と` : `${a}${currentMode.symbol}${b}`;
}

//残りの問題数
function updateRemainingProblems() {
    problemState.howManyOriginalProblems = problemState.patterns.length;
    const solvedLen = problemState.isWeakChallenge ? (problemState.solvedCount - 1) : problemState.solved.length;
    problemState.remainingQuestions = problemState.patterns.length - solvedLen
        + problemState.reviewQueue.length + (problemState.isReview ? 1 : 0);
    document.getElementById("remaining-problems").textContent = `のこり${problemState.remainingQuestions}${currentMode.texts.unit}`
        + (problemState.isReview ? '（もういちど！）' : '');
}

// ---------- 式の表示 ----------

// 画面に出す記号（ひきざんは、横棒の長い「−」）
const SYMBOL_TEXT = { '+': '+', '-': '−', '×': '×' };

function displayProblem(a, b, c) {
    updateRemainingProblems();
    problemState.answer = c;
    problemState.tens = Math.floor(c / 10);

    showNumber('a', a);
    showNumber('b', b);
    showNumber('c', c);
    showCover('c1cover');
    showCover('c2cover');

    if (currentMode.dots === 'count') {
        showCountDots(a, b);
    } else if (currentMode.dots === 'subtract') {
        showSubtractDots(a, b);
    }

    // 「5 は 2 と ？」のときは「は」「と」
    if (currentLevelDef().style === 'decompose') {
        document.getElementById("calculationSymbol1").innerHTML = `<span class="symbol kana-ha">${glyphSVG('は')}</span>`;
        document.getElementById("calculationSymbol2").innerHTML = `<span class="symbol">${glyphSVG('と')}</span>`;
    } else {
        document.getElementById("calculationSymbol1").innerHTML = `<span class="symbol">${glyphSVG(SYMBOL_TEXT[currentMode.symbol])}</span>`;
        document.getElementById("calculationSymbol2").innerHTML = `<span class="symbol">${glyphSVG('=')}</span>`;
    }
}

// 数字カードを並べる（十の位が0なら十の位の枠をなくす）
function showNumber(prefix, number) {
    const tens = Math.floor(number / 10);
    const ones = number % 10;

    const tensContainer = document.getElementById(prefix + "1");
    const onesContainer = document.getElementById(prefix + "2");
    const tensCover = document.getElementById(prefix + "1cover");
    const onesCover = document.getElementById(prefix + "2cover");

    if (tens > 0) {
        tensContainer.style.width = '12vh';
        tensContainer.querySelector('.digit').innerHTML = glyphSVG(String(tens));
        tensCover.style.display = 'block';
    } else {
        tensContainer.style.width = '0';
        tensContainer.querySelector('.digit').innerHTML = '';
        tensCover.style.display = 'none';
    }

    onesContainer.querySelector('.digit').innerHTML = glyphSVG(String(ones));
    onesContainer.style.width = '12vh';
    onesCover.style.display = 'block';
}

// 答えをかくす「？」のカード（答えの数字そのものも、正解するまでかくしておく）
function showCover(coverId) {
    const cover = document.getElementById(coverId);
    cover.innerHTML = `<div class="q-card">${glyphSVG('?')}</div>`;
    cover.style.display = 'block';
    cover.parentElement.querySelector('.digit').classList.add('hidden-answer');
}


// ---------- おたすけだんご ----------

// レベルに合わせて「おたすけだんご」のチェックボックスを出す・隠す
function updateHelpCheckboxVisibility(level) {
    const helpCheckboxDiv = document.querySelector('.help-checkbox');
    if (!helpCheckboxDiv) return;

    if (!currentMode.dots || currentLevelDef().noHelp) {
        helpCheckboxDiv.style.display = 'none';
        document.getElementById('helpCheckbox').checked = false;
        document.querySelectorAll('.dot-set').forEach(dotSet => {
            dotSet.style.display = 'none';
        });
    } else {
        helpCheckboxDiv.style.display = 'block';
    }
}

document.getElementById('helpCheckbox').addEventListener('change', function () {
    document.querySelectorAll('.dot-set').forEach(dotSet => {
        dotSet.style.display = this.checked ? 'block' : 'none';
    });
});

// たしざん：十の位は10個ずつ、一の位はその数だけ
function showCountDots(a, b) {
    updateDots("a1Dots", Math.floor(a / 10) * 10);
    updateDots("a2Dots", a % 10);
    updateDots("b1Dots", Math.floor(b / 10) * 10);
    updateDots("b2Dots", b % 10);
}

// ひきざん：ひかれる数のだんごから、ひく数だけ色がうすくなる
function showSubtractDots(a, b) {
    if (a >= 10) {
        // ひかれる数が10以上のときは、10個ずつで折り返して1列に
        updateDots("a1Dots", a, true);
        updateDots("a2Dots", 0, true);
        updateDots("b1Dots", 0, true);
        updateDots("b2Dots", b, true);
        animateDotsReduction('a1Dots', 'b2Dots');
    } else {
        updateDots("a1Dots", Math.floor(a / 10) * 10);
        updateDots("a2Dots", a % 10);
        updateDots("b1Dots", Math.floor(b / 10) * 10);
        updateDots("b2Dots", b % 10);
        animateDotsReduction('a2Dots', 'b2Dots');
    }
}

// ● を number 個（wide のときは10個で折り返し、5個ごとにすき間）
function updateDots(dotsId, number, wide = false) {
    const dotsContainer = document.getElementById(dotsId);
    const maxDotsPerRow = wide ? 10 : 5;
    let dots = '';
    for (let i = 0; i < number; i++) {
        if (i > 0 && i % maxDotsPerRow === 0) {
            dots += '<br>';
        }
        dots += '●';
        if (wide && i % 5 === 4 && i % maxDotsPerRow !== maxDotsPerRow - 1) {
            dots += ' ';
        }
    }
    dotsContainer.innerHTML = dots;
}

// ひく数ぶんのだんご（と、ひく数のだんご）を薄い灰色にする
function animateDotsReduction(aElementId, bElementId) {
    const aElement = document.getElementById(aElementId);
    const bElement = document.getElementById(bElementId);
    aElement.style.color = 'red';
    bElement.style.color = 'blue';

    const aDots = aElement.innerHTML.split('');
    const bDots = bElement.innerHTML.split('');
    const dotsToFade = Math.min(aDots.filter(d => d === '●').length, bDots.filter(d => d === '●').length);

    // ひくひく（ひかれる数の一の位からひく）は後ろから、ひくたす（10からひく）は前から
    const dotsFrom = currentLevelDef().dotsFrom || (problemState.currentProblem.b <= 4 ? 'end' : 'start');
    const order = aDots.map((_, i) => i);
    if (dotsFrom === 'end') {
        order.reverse();
    }

    let count = 0;
    for (const i of order) {
        if (count >= dotsToFade) break;
        if (aDots[i] === '●') {
            aDots[i] = '<span style="color: red; transition: color 1s;">●</span>';
            count++;
        }
    }
    for (let i = 0; i < bDots.length; i++) {
        if (bDots[i] === '●') {
            bDots[i] = '<span style="color: blue; transition: color 1s;">●</span>';
        }
    }

    aElement.innerHTML = aDots.join('');
    bElement.innerHTML = bDots.join('');

    setTimeout(() => {
        aElement.querySelectorAll('span').forEach(span => { span.style.color = 'lightgray'; });
        bElement.querySelectorAll('span').forEach(span => { span.style.color = 'lightgray'; });
    }, 100);
}


// ---------- テンキーの入力 ----------

function drillProcessButtonPress(value) {
    if (!problemState.keypadEnabled) {
        return;
    }

    const c1Rect = document.getElementById("c1").getBoundingClientRect();
    const c2Rect = document.getElementById("c2").getBoundingClientRect();
    const correctAnswer = problemState.answer;
    const isRight = expected => parseInt(value) === expected;

    if (problemState.tens > 0 && pressCount === 0) {
        // 十の位
        const isCorrect = isRight(Math.floor(correctAnswer / 10));
        shootAtTarget(c1Rect, value, isCorrect);
        if (isCorrect) {
            enlargeAndFadeImage('c1cover');
            pressCount = 1;
        } else {
            recordMistake(`${value}□`);
            handleAnswer(false);
        }
    } else {
        // 一の位（1けたの答えならそのまま）
        const expected = problemState.tens > 0 ? correctAnswer % 10 : correctAnswer;
        const isCorrect = isRight(expected);
        shootAtTarget(c2Rect, value, isCorrect);
        if (isCorrect) {
            enlargeAndFadeImage('c2cover');
            pressCount = 0;
            handleAnswer(true);
        } else {
            recordMistake(problemState.tens > 0 ? `${problemState.tens}${value}` : value);
            handleAnswer(false);
        }
    }
}

// 間違えた問題を記録（answerText は子どもが入力した答え）
function recordMistake(answerText) {
    const { a, b } = problemState.currentProblem;
    const problem = currentLevelDef().style === 'decompose'
        ? `${a} は ${b} と ${answerText} `
        : `${a} ${currentMode.symbol} ${b} = ${answerText}`;
    problemState.mistakes.push({ problem, correctAnswer: problemState.answer });
}

function handleAnswer(isCorrect) {
    if (isCorrect) {
        const problemMs = Date.now() - problemState.problemStartedAt;
        if (problemMs > History.INVALID_MS) {
            problemState.paused = true;
        }
        History.recordProblem(currentMode.id, problemKey(), !problemState.mistakeMade, problemMs);
        // にがてモードのとき、各問題の正誤とタイムを記録しておく（クリア時に3回とも即答できたか判定）
        if (problemState.isWeakChallenge && !problemState.isReview) {
            const key = problemKey();
            const list = problemState.weakAttemptLog[key] || (problemState.weakAttemptLog[key] = []);
            list.push({ ok: !problemState.mistakeMade, ms: problemMs });
        }
        // まちがえた問題は、レベルの最後にもういちど（もういちどの問題は1回だけ）
        if (problemState.mistakeMade && !problemState.isReview) {
            const { a, b } = problemState.currentProblem;
            problemState.reviewQueue.push([a, b]);
        }
        // 間違いがなかった場合のみ、正答の連続カウントを進めてドロップを投げる
        if (!problemState.mistakeMade) {
            problemState.correctStreak++;
            const perfect = currentMode.perfectClear[problemState.level];
            if (perfect && problemState.levelMistakes === 0 && problemState.howManyOriginalProblems === problemState.correctStreak) {
                // ノーミスでクリア！
                throwCoin(problemState.level, true, 300, perfect.coins);
                problemState[perfect.flag] = true;
                problemState.useExistingCoins = problemState.level;
            } else if (problemState.correctStreak % 5 === 0) {
                throwCoin(problemState.level, true, 50, 1);  // 5問ごとに金のドロップ
            } else {
                throwCoin(problemState.level, false, 50, 1);
            }
        }
        toggleKeypad(false);
        const state = problemState;
        setTimeout(() => {
            if (state !== problemState) return; // そのあいだに別のモードへ移った
            pressCount = 0;
            // つぎの問題があるときだけ、入力を受けつける（クリアしたら、もういちどちょうせんするまで止めたまま）
            if (generateLvProblem(problemState.level)) {
                toggleKeypad(true);
            }
        }, 750);
        problemState.mistakeMade = false;
    } else {
        problemState.mistakeMade = true;
        problemState.mistakeCount += 1;
        problemState.levelMistakes += 1;
        problemState.correctStreak = 0;
        if (problemState.mistakeCount >= currentMode.maxMistakes) {
            showMistakeModal();
            toggleKeypad(false);
            problemState.mistakeCount = 0;
            pressCount = 0;
        }
    }
}

// 入力した数字が、答えの枠に飛んでいく（まちがいならはじかれる）
function shootAtTarget(rect, value, isCorrect) {
    const digit = document.createElement('div');
    digit.className = 'falling-and-shrinking-image digit-card';
    digit.innerHTML = glyphSVG(String(value));

    const newDiv = document.createElement('div');
    newDiv.appendChild(digit);
    newDiv.style.position = 'absolute';
    newDiv.style.left = `${rect.left}px`;
    newDiv.style.top = `${rect.top}px`;
    newDiv.style.width = `${rect.width}px`;
    newDiv.style.height = `${rect.height}px`;
    document.body.appendChild(newDiv);

    if (isCorrect) {
        setTimeout(() => newDiv.remove(), 600);
    } else {
        bounceOffTarget(newDiv);
    }
}

function bounceOffTarget(target) {
    setTimeout(() => {
        const direction = Math.random() * 360;
        const distance = Math.random() * 200 + 100;
        target.style.setProperty('--random-x', `${Math.cos(direction) * distance}px`);
        target.style.setProperty('--random-y', `${Math.sin(direction) * distance}px`);
        target.classList.add('bouncing-and-spinning-image');
        setTimeout(() => target.remove(), 1000);
    }, 150);
}

// 正解した「？」カードが広がって消える
function enlargeAndFadeImage(coverId) {
    const cover = document.getElementById(coverId);
    cover.parentElement.querySelector('.digit').classList.remove('hidden-answer');
    const card = cover.querySelector('.q-card');
    if (card) {
        card.classList.add('expand-and-fade');
        setTimeout(() => card.remove(), 1000);
    }
}

// ---------- クリア・ミス ----------

function drillShowModal(level) {
    const clearTime = stopTimer();

    // にがてモードの2段階卒業チェック：全セット（4回）ノーミス＆平均3.5秒以内ならHPを1段階大きく削る！
    const graduatedList = []; // 完全卒業（HP → 0）
    const step1List = [];     // パワーダウン（あと1かい！）
    const requiredCount = problemState.weakRequiredCount || 4;

    if (problemState.isWeakChallenge && problemState.weakAttemptLog) {
        Object.entries(problemState.weakAttemptLog).forEach(([key, logs]) => {
            // 補充された通常問題は除外し、本当に苦手だった問題のみ判定する
            if (problemState.weakTargetKeys && !problemState.weakTargetKeys.includes(key)) {
                return;
            }
            if (logs.length >= requiredCount && logs.every(l => l.ok)) {
                const avgMs = logs.reduce((sum, l) => sum + l.ms, 0) / logs.length;
                if (avgMs <= History.FAST_MS) {
                    const status = History.graduateWeakProblem(currentMode.id, key);
                    const label = key.replace('-', '−');
                    if (status === 'graduated') {
                        graduatedList.push(label);
                    } else if (status === 'step1') {
                        step1List.push(label);
                    }
                }
            }
        });
    }

    const baseTitle = problemState.isSpecialCourse
        ? '特訓コース、クリア！'
        : currentMode.texts.clearTitle(level);
    document.getElementById('modalTitle').textContent = problemState.isWeakChallenge
        ? `🔥 ${baseTitle}`
        : baseTitle;

    const clearTimeEl = document.getElementById('clearTime');
    clearTimeEl.textContent = `クリアタイム ${clearTime}`;

    // にがて克服の結果表示エリアをつくる（すでにあれば再利用）
    let weakResultEl = document.getElementById('weakClearResult');
    if (!weakResultEl) {
        weakResultEl = document.createElement('div');
        weakResultEl.id = 'weakClearResult';
        weakResultEl.style.cssText = 'margin: 10px 0; padding: 10px 14px; border-radius: 10px; background: #fff8e7; border: 2px solid #ffb347; text-align: left; font-size: 0.95em; line-height: 1.6;';
        clearTimeEl.insertAdjacentElement('afterend', weakResultEl);
    }

    if (problemState.isWeakChallenge && (graduatedList.length > 0 || step1List.length > 0)) {
        const lines = [];
        graduatedList.forEach(label => {
            lines.push(`<div>✨ <b>${label}</b> にがてクリア！（卒業！）</div>`);
        });
        step1List.forEach(label => {
            lines.push(`<div>🔥 <b>${label}</b> パワーダウン！（あと1かい！）</div>`);
        });
        weakResultEl.innerHTML = lines.join('');
        weakResultEl.style.display = 'block';
    } else {
        weakResultEl.style.display = 'none';
    }

    // 通常モードのときだけベストタイムを更新（にがてモードは問題数が違うため）
    if (!problemState.isWeakChallenge) {
        saveBestTime(level, new Date() - startTime);
    }
    const bestTime = getBestTime(level);
    document.getElementById('bestTime').textContent =
        `${currentMode.texts.best} ${bestTime !== null ? formatTime(bestTime) : '--:--'}`;

    document.getElementById('completionModal').style.display = 'flex';
    const drop = createRewardCoin(level);

    History.addEntry({
        mode: currentMode.id,
        level,
        ms: problemState.isWeakChallenge ? null : (endTime - startTime),
        total: problemState.patterns.length,
        miss: problemState.levelMistakes,
        cleared: !problemState.isWeakChallenge,
        drop,
        paused: problemState.paused || problemState.isWeakChallenge,
        weakChallenge: problemState.isWeakChallenge,
    });
}

function showMistakeModal() {
    History.addEntry({
        mode: currentMode.id,
        level: problemState.level,
        ms: problemState.isWeakChallenge ? null : (Date.now() - startTime),
        total: problemState.patterns.length,
        miss: problemState.levelMistakes,
        cleared: false,
        drop: null,
        paused: problemState.paused || problemState.isWeakChallenge,
        weakChallenge: problemState.isWeakChallenge,
    });
    document.getElementById('maxMistakes').textContent = currentMode.maxMistakes;
    const mistakeList = document.getElementById('mistakeList');
    mistakeList.innerHTML = '';
    problemState.mistakes.forEach(mistake => {
        const li = document.createElement('li');
        li.textContent = `${mistake.problem} 【せいかいは ${mistake.correctAnswer}】`;
        mistakeList.appendChild(li);
    });
    document.getElementById('mistakeModal').style.display = 'flex';
    problemState.mistakeCount = 0;
    problemState.mistakes = [];
}


ENGINES.drill = {
    screenId: 'drillScreen',
    start: drillStartLevel,
    retry: drillRetryLevel,
    onKey: drillProcessButtonPress,
};