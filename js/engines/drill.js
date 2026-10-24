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
    return currentMode.levels[problemState.level - 1];
}

function drillStartLevel(level) {
    toggleKeypad(false);
    restoreCoins(level); //ご褒美コインの復元
    pressCount = 0;
    problemState.level = level;
    problemState.patterns = currentLevelDef().patterns();
    problemState.solved = [];
    problemState.correctStreak = 0;
    problemState.mistakeCount = 0;
    problemState.mistakes = []; // 前回の間違いリストを持ち越さない
    problemState.remainingQuestions = 0;
    problemState.howManyOriginalProblems = 0;
    problemState.useExistingCoins = 0;
    problemState.mistakeMade = false;
    startTimer();
    generateLvProblem(level);
    updateHelpCheckboxVisibility(level);
    setTimeout(() => {
        toggleKeypad(true);
    }, 750);
}

function drillRetryLevel() {
    document.getElementById('completionModal').style.display = 'none';
    document.getElementById('mistakeModal').style.display = 'none';
    clearCoinsOnDOM();
    drillStartLevel(problemState.level);
}

// まだ出していない問題から1つ出す。全部出したらクリア
function generateLvProblem(level) {
    const unsolvedPatterns = problemState.patterns.filter(
        ([a, b]) => !problemState.solved.some(([sa, sb]) => sa === a && sb === b)
    );

    if (unsolvedPatterns.length === 0) {
        document.getElementById("remaining-problems").textContent = `のこり0${currentMode.texts.unit}！おわったよ！！`;
        toggleKeypad(false);
        drillShowModal(level);
        return;
    }

    // 「n のだん」「さかさ」は順番どおり、ほかはランダム
    const index = currentLevelDef().order === 'ordered' ? 0 : Math.floor(Math.random() * unsolvedPatterns.length);
    const [a, b] = unsolvedPatterns[index];
    problemState.currentProblem = { a, b };

    const c = currentLevelDef().style === 'decompose' ? a - b : currentMode.calc(a, b);
    displayProblem(a, b, c);
    problemState.solved.push([a, b]);
}

//残りの問題数
function updateRemainingProblems() {
    problemState.howManyOriginalProblems = problemState.patterns.length;
    problemState.remainingQuestions = problemState.patterns.length - problemState.solved.length;
    document.getElementById("remaining-problems").textContent = `のこり${problemState.remainingQuestions}${currentMode.texts.unit}`;
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
        document.getElementById("calculationSymbol1").innerHTML = '<span class="symbol kana kana-ha">は</span>';
        document.getElementById("calculationSymbol2").innerHTML = '<span class="symbol kana">と</span>';
    } else {
        document.getElementById("calculationSymbol1").innerHTML = `<span class="symbol">${SYMBOL_TEXT[currentMode.symbol]}</span>`;
        document.getElementById("calculationSymbol2").innerHTML = '<span class="symbol">=</span>';
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
        tensContainer.querySelector('.digit').textContent = tens;
        tensCover.style.display = 'block';
    } else {
        tensContainer.style.width = '0';
        tensContainer.querySelector('.digit').textContent = '';
        tensCover.style.display = 'none';
    }

    onesContainer.querySelector('.digit').textContent = ones;
    onesContainer.style.width = '12vh';
    onesCover.style.display = 'block';
}

// 答えをかくす「？」のカード
function showCover(coverId) {
    const cover = document.getElementById(coverId);
    cover.innerHTML = '<div class="q-card">?</div>';
    cover.style.display = 'block';
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
        // 間違いがなかった場合のみ、正答の連続カウントを進めてドロップを投げる
        if (!problemState.mistakeMade) {
            problemState.correctStreak++;
            const perfect = currentMode.perfectClear[problemState.level];
            if (perfect && problemState.howManyOriginalProblems === problemState.correctStreak) {
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
            generateLvProblem(problemState.level);
            pressCount = 0;
            toggleKeypad(true);
        }, 750);
        problemState.mistakeMade = false;
    } else {
        problemState.mistakeMade = true;
        problemState.mistakeCount += 1;
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
    digit.textContent = value;

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
    const card = document.getElementById(coverId).querySelector('.q-card');
    if (card) {
        card.classList.add('expand-and-fade');
        setTimeout(() => card.remove(), 1000);
    }
}


// ---------- クリア・ミス ----------

function drillShowModal(level) {
    const clearTime = stopTimer();
    document.getElementById('modalTitle').textContent = currentMode.texts.clearTitle(level);
    document.getElementById('clearTime').textContent = `クリアタイム ${clearTime}`;

    saveBestTime(level, new Date() - startTime);
    const bestTime = getBestTime(level);
    document.getElementById('bestTime').textContent =
        `${currentMode.texts.best} ${bestTime !== null ? formatTime(bestTime) : '--:--'}`;

    document.getElementById('completionModal').style.display = 'flex';
    createRewardCoin(level);
}

function showMistakeModal() {
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
