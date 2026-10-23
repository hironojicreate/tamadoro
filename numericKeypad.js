//テンキーパッド
// 音声ファイルの読み込み
// AudioContextの作成
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// ユーザーの最初のインタラクションでAudioContextを「起動」
document.body.addEventListener('touchend', function initAudio() {
    audioContext.resume().then(() => {
        //console.log('AudioContext activated');
        // このイベントリスナーはもう必要ないので削除
        document.body.removeEventListener('touchend', initAudio);
    });
}, {once: true});

// オーディオファイルの読み込みとデコード
let soundBuffer = null;
fetch('/se/seSelect.mp3')
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(decodedAudio => {
        soundBuffer = decodedAudio;
    });

// ボタンが押されたときの処理を行う関数
function handleButtonPress(button) {
    // 問題画面（テンキー）が表示されていないときは、物理キーボードの入力も受け付けない
    if (document.getElementById('keypadScreen').style.display === 'none') {
        return;
    }

    const value = button.getAttribute('data-value');

    playSound(); // 音を再生

    dispatchButtonPress(value);
}

// モードに応じて入力処理を振り分ける
function dispatchButtonPress(value) {
    const mode = document.body.getAttribute('data-mode');
    if (mode === 'hundredgrid') {
        hundredgridProcessButtonPress(value);
    } else if (MODE_RULES[mode]) {
        processButtonPress(value, MODE_RULES[mode]);
    }
}



let pressCount = 0;

function toggleKeypad(enabled) {
    problemState.keypadEnabled = enabled;
    const buttons = document.querySelectorAll('#keypadScreen .num');
    buttons.forEach(button => {
        button.disabled = !enabled;
    });
}


// たしざん・ひきざん・かけざんの違い
//   symbol: 間違いリストに表示する記号
//   maxMistakes: この回数まちがえるとミスモーダル
//   decomposeLevels: 「5は 2と ？」形式のレベル
//   perfectClear: ノーミスでクリアしたときの特別演出（レベル: { 投げるコイン数, 立てるフラグ }）
const MODE_RULES = {
    addition: {
        symbol: '+',
        maxMistakes: 5,
        decomposeLevels: [1, 6],
        perfectClear: {
            10: { coins: 1, flag: 'lvTenClear' },
            11: { coins: 10, flag: 'lvElevenClear' }
        }
    },
    subtraction: {
        symbol: '-',
        maxMistakes: 5,
        decomposeLevels: [],
        perfectClear: {
            10: { coins: 1, flag: 'lvTenClear' },
            11: { coins: 10, flag: 'lvElevenClear' }
        }
    },
    multiplication: {
        symbol: '×',
        maxMistakes: 3,
        decomposeLevels: [],
        perfectClear: {
            28: { coins: 20, flag: 'lvTenClear' }
        }
    }
};


// たしざん・ひきざん・かけざん共通の入力処理
function processButtonPress(value, rules) {
    if (!problemState.keypadEnabled) {
        return;
    }

    const coordinates = getCoordinates();
    const c1Rect = coordinates.c1;
    const c2Rect = coordinates.c2;
    const tens = problemState.tens;
    const correctAnswer = problemState.answer;

    function checkAnswer(value, correctAnswer) {
        return parseInt(value) === correctAnswer;
    }

    // 間違えた問題を記録（answerText は子どもが入力した答え）
    function recordMistake(answerText) {
        const { a, b } = problemState.currentProblem;
        const problem = rules.decomposeLevels.includes(problemState.level)
            ? `${a} は ${b} と ${answerText} `
            : `${a} ${rules.symbol} ${b} = ${answerText}`;
        problemState.mistakes.push({ problem, correctAnswer });
    }

    function handleCorrect(isCorrect) {
        if (isCorrect) {
            // 間違いがなかった場合のみ、正答の連続カウントを進める
            if (!problemState.mistakeMade) {
                problemState.correctStreak++;
                const perfect = rules.perfectClear[problemState.level];
                // 特定の条件で特別なコイン投げ
                if (perfect && problemState.howManyOriginalProblems === problemState.correctStreak) {
                    throwCoin(problemState.level, true, 300, perfect.coins);
                    problemState[perfect.flag] = true;
                    problemState.useExistingCoins = problemState.level;
                } else if (problemState.correctStreak % 5 === 0) {
                    throwCoin(problemState.level, true, 50, 1);  // 5の倍数ごとに特別なコインを投げる
                } else {
                    throwCoin(problemState.level, false, 50, 1);  // 通常のコインを投げる
                }
            }
            toggleKeypad(false);
            setTimeout(() => {
                generateLvProblem(problemState.level);  // 新しい問題を生成
                pressCount = 0;
                toggleKeypad(true);
            }, 750);
            // 次の問題に進む前にフラグをリセット
            problemState.mistakeMade = false;
        } else {
            problemState.mistakeMade = true;  // 間違えた場合はフラグをセット
            problemState.mistakeCount += 1;
            problemState.correctStreak = 0;  // ストリークをリセット
            if (problemState.mistakeCount >= rules.maxMistakes) {
                showMistakeModal(problemState.level);  // 間違いが上限に達したらモーダルを表示
                toggleKeypad(false);
                problemState.mistakeCount = 0;  // カウンターをリセット
                pressCount = 0;
            }
        }
    }


    if (tens > 0) {
        if (pressCount === 0 && c1Rect) {
            // 十の位
            const isCorrect = checkAnswer(value, Math.floor(correctAnswer / 10));
            shootAtTarget(c1Rect, value, isCorrect);
            if (isCorrect) {
                enlargeAndFadeImage(problemState.coverIds.c1cover);
                pressCount += 1;
            } else {
                recordMistake(`${value}□`);
                handleCorrect(false);
            }
        } else if (pressCount === 1 && c2Rect) {
            // 一の位
            const isCorrect = checkAnswer(value, correctAnswer % 10);
            shootAtTarget(c2Rect, value, isCorrect);
            if (isCorrect) {
                enlargeAndFadeImage(problemState.coverIds.c2cover);
                pressCount = 0;
                handleCorrect(true);
            } else {
                recordMistake(`${Math.floor(correctAnswer / 10)}${value}`);
                handleCorrect(false);
            }
        }
    } else if (c2Rect) {
        const isCorrect = checkAnswer(value, correctAnswer);
        shootAtTarget(c2Rect, value, isCorrect);
        if (isCorrect) {
            enlargeAndFadeImage(problemState.coverIds.c2cover);
            handleCorrect(true);
        } else {
            recordMistake(value);
            handleCorrect(false);
        }
    }
}



//百マス用。足し算から流用。

// 現在のセルの入力状態を追跡
let partialInput = ""; // ユーザーの一時的な入力（十の位を保持）

function hundredgridProcessButtonPress(value) {
    // スライダーをロック
    lockSliders();
    // 現在のセルを取得
    const currentCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:nth-child(${currentCellIndex.col + 1})`
    );
    if (!currentCell) {
        console.error('現在のセルが見つかりません');
        return;
    }

    // 入力対象セルの最上部と最左部の値を取得
    const topCell = document.querySelector(
        `#calculation-grid tr:first-child td:nth-child(${currentCellIndex.col + 1})`
    );
    const leftCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:first-child`
    );

    // 正解を計算
    const correctAnswer = parseInt(topCell.textContent) + parseInt(leftCell.textContent);

    // 足し算モード専用のセーフティー機能
    // 「答えが10以上の場合、最初に '1' 以外の数字が入力された場合、セルに表示しない」
    if (correctAnswer >= 10 && partialInput === "" && value !== "1") {
        //alert("最初の入力は '1' のみ許可されています");
        return;
    }

    if (correctAnswer < 10) {
        // 答えが10未満の場合
        currentCell.textContent = value; // ユーザーの入力値をそのまま使用
        checkAnswer(currentCellIndex.row, currentCellIndex.col, parseInt(value)); // 判定
        moveCursorToNextCell(); // 次のセルに移動
    } else {
        // 答えが10以上の場合
        if (partialInput === "") {
            // 十の位入力時の処理
            partialInput = value; // 十の位を記録
            currentCell.textContent = partialInput; // セルに一時表示
            currentCell.classList.add('partial-input'); // 十の位入力中のスタイル
        } else {
            // 一の位入力時の処理
            const finalValue = parseInt(partialInput + value); // 十の位と一の位を結合
            currentCell.textContent = finalValue; // 完成した値をセルに表示
            currentCell.classList.remove('partial-input'); // スタイルをリセット

            // 正誤判定を実行
            checkAnswer(currentCellIndex.row, currentCellIndex.col, finalValue);

            // 入力状態をリセット
            partialInput = "";

            // 次のセルにカーソルを移動
            moveCursorToNextCell();
        }
    }
}





function shootAtTarget(rect, value, isCorrect) {
    const img = document.createElement('img');
    img.src = `/img/${value}.png`;
    img.className = 'falling-and-shrinking-image';

    const newDiv = document.createElement('div');
    newDiv.appendChild(img);
    newDiv.style.position = 'absolute';
    newDiv.style.left = `${rect.left}px`;
    newDiv.style.top = `${rect.top}px`;
    newDiv.style.width = `${rect.width}px`;
    newDiv.style.height = `${rect.height}px`;

    document.body.appendChild(newDiv);

    if (isCorrect) {
        setTimeout(() => {
            newDiv.remove();
        }, 600);
    } else {
        //console.log("Bounce off target:", newDiv); // ターゲットの情報をログに出力
        bounceOffTarget(newDiv);
    }
}

function bounceOffTarget(target) {
    setTimeout(() => {
        //console.log("Target before bounce:", target);

        const direction = Math.random() * 360;
        const distance = Math.random() * 200 + 100;
        const offsetX = Math.cos(direction) * distance;
        const offsetY = Math.sin(direction) * distance;

        // カスタムプロパティでランダムな移動距離を設定
        target.style.setProperty('--random-x', `${offsetX}px`);
        target.style.setProperty('--random-y', `${offsetY}px`);

        // アニメーションを適用
        target.classList.add('bouncing-and-spinning-image');

        setTimeout(() => target.remove(), 1000);
    }, 150);
}


//不正解モーダル
function showMistakeModal(level) {
    const modal = document.getElementById('mistakeModal');
    const mistakeList = document.getElementById('mistakeList');
    mistakeList.innerHTML = '';  // リストをクリア
    problemState.mistakes.forEach(mistake => {
        const li = document.createElement('li');
        li.textContent = `${mistake.problem} 【せいかいは ${mistake.correctAnswer}】`;
        mistakeList.appendChild(li);
    });
    modal.style.display = 'flex';
    problemState.mistakeCount = 0;  // カウンターをリセット
    problemState.mistakes = [];  // 間違いリストをクリア
}




function enlargeAndFadeImage(coverId) {
    const coverElement = document.getElementById(coverId);
    if (coverElement) {
        const img = coverElement.querySelector('img');
        if (img) {
            img.classList.add('expand-and-fade');
            setTimeout(() => img.remove(), 1000);
        }
    }
}



// オーディオの再生を行う関数
function playSound() {
    if (!soundBuffer) {
        console.log("Sound is not loaded yet");
        return;
    }
    const source = audioContext.createBufferSource();
    source.buffer = soundBuffer;
    source.connect(audioContext.destination);
    source.start(0);
}


//タッチパッド、物理テンキー操作
document.querySelectorAll('.num').forEach(button => {
    let touchActive = false; // タッチがアクティブかどうかを追跡するフラグ

    button.addEventListener('touchstart', function(event) {
        touchActive = true; // タッチアクティブをtrueに設定
        activateButtonVisual(this);
        handleButtonPress(this);
        event.preventDefault(); // デフォルトのクリックイベントを防止
    }, { passive: false });

    button.addEventListener('touchend', function() {
        deactivateButtonVisual(this);
        setTimeout(() => {
            touchActive = false; // タッチイベント終了後、タッチフラグをリセット
        }, 100); // タッチ終了後少し遅延してフラグをリセット
    }, { passive: true });

    button.addEventListener('click', function() {
        if (!touchActive) { // タッチがアクティブでない場合のみ処理
            activateButtonVisual(this);
            handleButtonPress(this);
            deactivateButtonVisual(this);
        }
        this.blur(); // フォーカスを解除
    });
});

document.addEventListener('keydown', function(event) {
    const key = event.key;
    if (key >= '0' && key <= '9') {
        const button = document.querySelector(`button[data-value="${key}"]`);
        if (button) {
            activateButtonVisual(button);
            handleButtonPress(button);
        }
    }
});

document.addEventListener('keyup', function(event) {
    const key = event.key;
    if (key >= '0' && key <= '9') {
        const button = document.querySelector(`button[data-value="${key}"]`);
        if (button) {
            deactivateButtonVisual(button);
        }
    }
});

function activateButtonVisual(button) {
    button.classList.add('active');
}

function deactivateButtonVisual(button) {
    button.classList.remove('active');
}


let isTouched = false; // タッチが発生したかどうかを追跡するフラグ

let isKeypadEnabled = true; // 最初は入力を許可

//c1,c2の座標を取得。
function getCoordinates() {
    const c1Element = document.getElementById("c1");
    const c2Element = document.getElementById("c2");
    let c1Rect = null;
    let c2Rect = null;

    if (c1Element) {
        c1Rect = c1Element.getBoundingClientRect();
        //console.log(`c1: x = ${c1Rect.left}, y = ${c1Rect.top}, width = ${c1Rect.width}, height = ${c1Rect.height}`);
    }

    if (c2Element) {
        c2Rect = c2Element.getBoundingClientRect();
        //console.log(`c2: x = ${c2Rect.left}, y = ${c2Rect.top}, width = ${c2Rect.width}, height = ${c2Rect.height}`);
    }

    return {
        c1: c1Rect,
        c2: c2Rect
    };
}


// マスターボタンが再度押されるのを防ぐためのフラグ
let isMasterButtonCooldown = false;

// マスターボタンの動作を定義
function pressMasterButton() {
    if (isMasterButtonCooldown) {
        //console.log("マスターボタンは現在クールダウン中です。");
        return;
    }

    isMasterButtonCooldown = true; // ボタンをクールダウン状態に設定
    const answer = problemState.answer;
    const mode = document.body.getAttribute('data-mode');

    // mode が "hundredgrid" の場合、answer をログに出力
    if (mode === 'hundredgrid') {
        console.log(`Mode: hundredgrid, 答えは、: ${answer}`);
    }

    if (answer < 10) {
        dispatchButtonPress(answer.toString());
    } else {
        const tens = Math.floor(answer / 10);
        const ones = answer % 10;
        dispatchButtonPress(tens.toString());
        setTimeout(() => {
            dispatchButtonPress(ones.toString());
        }, 100);
    }

    // 1秒後にクールダウンを解除
    setTimeout(() => {
        isMasterButtonCooldown = false;
    }, 200);
}
