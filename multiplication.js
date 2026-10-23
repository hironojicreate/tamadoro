
////問題生成////
function preloadImages() {
    const images = ['/img/q.gif', '/img/Smaru.png']; // 事前にロードしたい画像のパス
    images.forEach(imagePath => {
        const img = new Image();
        img.src = imagePath;
    });
}

// DOMが読み込まれたら画像をプリロード
document.addEventListener('DOMContentLoaded', preloadImages);


//十の位の有無をテンキーに投げる。
let problemState = {
    tens: 0,
    answer: 0,
    level: 1,
    keypadEnabled: true,
    coverIds: {
        c1cover: "",
        c2cover: ""
    },
    solvedPatterns: {
        lv1: [],
        lv2: [],
        lv3: [],
        lv4: [],
        lv5: [],
        lv6: [],
        lv7: [],
        lv8: [],
        lv9: [],
        lv10: [],
        lv11: [],
        lv12: [],
        lv13: [],
        lv14: [],
        lv15: [],
        lv16: [],
        lv17: [],
        lv18: [],
        lv19: [],
        lv20: [],
        lv21: [],
        lv22: [],
        lv23: [],
        lv24: [],
        lv25: [],
        lv26: [],
        lv27: [],
        lv28: [],
        lv29: [],
        lv30: []
    },
    correctStreak: 0,
    mistakeMade: false,
    lvTenClear: false,
    lvElevenClear: false,
    useExistingCoins: 0,
    mistakeCount: 0,
    mistakes: [],
    remainingQuestions: 0,
    howManyOriginalProblems: 0,
    currentProblem: { a: null, b: null },
    levelToImage: {
        1: '/img/Lmaru.png',
        2: '/img/Mmaru.png',
        3: '/img/Bmaru.png',
        4: '/img/Amaru.png',
        5: '/img/Rmaru.png',
        6: '/img/Kmaru.png',
        7: '/img/Pmaru.png',
        8: '/img/Ymaru.png',
        9: '/img/Cmaru.png',
        10: '/img/Omaru.png',
        11: '/img/Lmaru.png',
        12: '/img/Mmaru.png',
        13: '/img/Bmaru.png',
        14: '/img/Amaru.png',
        15: '/img/Rmaru.png',
        16: '/img/Kmaru.png',
        17: '/img/Pmaru.png',
        18: '/img/Ymaru.png',
        19: '/img/Cmaru.png',
        20: '/img/Omaru.png',
        21: '/img/Lmaru.png',
        22: '/img/Mmaru.png',
        23: '/img/Bmaru.png',
        24: '/img/Amaru.png',
        25: '/img/Rmaru.png',
        26: '/img/Kmaru.png',
        27: '/img/Pmaru.png',
        28: '/img/Ymaru.png'
    }
};


// かけ算　順
function generateMultiplication(a) {
    const patterns = [];
    for (let b = 1; b <= 9; b++) {
        patterns.push([a, b]); // 配列に [a, b] の形で追加
    }
    return patterns;
}


// かけ算　逆順
function generateMultiplicationReverse(a) {
    const patterns = [];
    for (let b = 9; b >= 1; b--) {
        patterns.push([a, b]); // 配列に [a, b] の形で追加
    }
    return patterns;
}

// かけ算　ランダム
function generateMultiplicationRandom(a) {
    const patterns = [];
    const availableNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // 1～9の数字を保持する配列

    while (availableNumbers.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const b = availableNumbers.splice(randomIndex, 1)[0]; // 選んだ数字を配列から取り出し
        patterns.push([a, b]); // 配列に [a, b] の形で追加
    }
    return patterns;
}

// かけ算　全ての数字でランダム
function generateMultiplicationAllRandom() {
    const patterns = [];
    const allCombinations = [];

    // すべての組み合わせを生成し、allCombinationsに追加
    for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= 9; b++) {
            allCombinations.push([a, b]);
        }
    }

    // allCombinationsからランダムに取り出してpatternsに格納
    while (allCombinations.length > 0) {
        const randomIndex = Math.floor(Math.random() * allCombinations.length);
        const combination = allCombinations.splice(randomIndex, 1)[0]; // ランダムに選択し、allCombinationsから削除
        patterns.push(combination);
    }

    return patterns;
}



function getPatternsForLevel(level) {
    switch (level) {
        case 1:
            return generateMultiplication(1);
        case 2:　//1~9までの数字で、足したら5以下
            return generateMultiplicationReverse(1);
        case 3:
            return generateMultiplicationRandom(1);
        case 4:
            return generateMultiplication(2);
        case 5:// 1~5までの数字で、足したら10以下
            return generateMultiplicationReverse(2);
        case 6:
            return generateMultiplicationRandom(2);
        case 7:
            return generateMultiplication(3);
        case 8:
            return generateMultiplicationReverse(3);
        case 9:
            return generateMultiplicationRandom(3);
        case 10:
            return generateMultiplication(4);
        case 11:
            return generateMultiplicationReverse(4);
        case 12:
            return generateMultiplicationRandom(4);
        case 13:
            return generateMultiplication(5);
        case 14:
            return generateMultiplicationReverse(5);
        case 15:
            return generateMultiplicationRandom(5);
        case 16:
            return generateMultiplication(6);
        case 17:
            return generateMultiplicationReverse(6);
        case 18:
            return generateMultiplicationRandom(6);
        case 19:
            return generateMultiplication(7);
        case 20:
            return generateMultiplicationReverse(7);
        case 21:
            return generateMultiplicationRandom(7);
        case 22:
            return generateMultiplication(8);
        case 23:
            return generateMultiplicationReverse(8);
        case 24:
            return generateMultiplicationRandom(8);
        case 25:
            return generateMultiplication(9);
        case 26:
            return generateMultiplicationReverse(9);
        case 27:
            return generateMultiplicationRandom(9);
        case 28:
            return generateMultiplicationAllRandom();
            // 他のレベルのパターンも同様に定義
        default:
            return [];
    }
}

function generateLvProblem(level) {
    const patterns = getPatternsForLevel(level);
    const unsolvedPatterns = patterns.filter(
        pattern => !problemState.solvedPatterns[`lv${level}`].some(
            solved => solved[0] === pattern[0] && solved[1] === pattern[1]
        )
    );

    if (unsolvedPatterns.length === 0) {
        const remainingProblemsElement = document.getElementById("remaining-problems");
        remainingProblemsElement.textContent = `のこり0問！おわったよ！！`;
        //showNotification("すべての問題がおわりました！");
        toggleKeypad(false);
        showModal(level);
        return;
    }

    // unsolvedPatternsの最初の問題を選択
    const [a, b] = unsolvedPatterns[0];

    problemState.currentProblem.a = a; //間違え問題追跡用
    problemState.currentProblem.b = b; //間違え問題追跡用
    const c = a * b;
    displayProblem(a, b, c, level);
    problemState.solvedPatterns[`lv${level}`].push([a, b]);
}





function displayProblem(a, b, c, level) {
    updateRemainingProblems(); //残りの問題数
    problemState.answer = c;
    problemState.tens = Math.floor(c / 10);

    function displayNumber(containerIdPrefix, number, updateDotsFlag = true) {
        const tens = Math.floor(number / 10);
        const ones = number % 10;
        problemState.tens = tens; // tensの値を保存

        const tensContainer = document.getElementById(containerIdPrefix + "1");
        const onesContainer = document.getElementById(containerIdPrefix + "2");
        const tensCover = document.getElementById(containerIdPrefix + "1cover");
        const onesCover = document.getElementById(containerIdPrefix + "2cover");

        // カバーIDを記録するために新しいカバーオブジェクトを作成
        const tensRect = {
            ...tensContainer.getBoundingClientRect(),
            coverId: containerIdPrefix + "1cover"
        };
        const onesRect = {
            ...onesContainer.getBoundingClientRect(),
            coverId: containerIdPrefix + "2cover"
        };

        // このデータを問題状態に保存
        problemState[containerIdPrefix + "1Rect"] = tensRect;
        problemState[containerIdPrefix + "2Rect"] = onesRect;
        problemState.coverIds = {
            [containerIdPrefix + "1cover"]: tensRect.coverId,
            [containerIdPrefix + "2cover"]: onesRect.coverId
        };

        function setBackgroundImage(container, digit) {
            container.style.backgroundImage = `url(/img/${digit}.png)`;
        }

        // カバーの設定は containerIdPrefix が 'c' のときだけ行う
        if (containerIdPrefix === 'c') {
            setCoverImage(containerIdPrefix + "1cover");
            setCoverImage(containerIdPrefix + "2cover");
        }

        // 数字の設定
        if (tens > 0) {
            tensContainer.style.width = '12vh';
            setBackgroundImage(tensContainer, tens);
            tensCover.style.display = 'block';
        } else {
            tensContainer.style.width = '0';
            tensCover.style.display = 'none';
        }

        setBackgroundImage(onesContainer, ones);
        onesContainer.style.width = '12vh';
        onesCover.style.display = 'block';

        if (updateDotsFlag) {
            updateDots(containerIdPrefix + "1Dots", tens, true);
            updateDots(containerIdPrefix + "2Dots", ones, false);
        }
    }

    displayNumber('a', a);
    displayNumber('b', b);
    displayNumber('c', c, false);

    //if (level !== 1 && level !== 6) {
        document.getElementById("calculationSymbol1").innerHTML = '<img src="/img/x.png" class="symbol-image">';
        document.getElementById("calculationSymbol2").innerHTML = '<img src="/img/=.png" class="symbol-image">';
    //} else {
        //document.getElementById("calculationSymbol1").innerHTML = '<img src="/img/h.png" class="symbol-image">';
        //document.getElementById("calculationSymbol2").innerHTML = '<img src="/img/t.png" class="symbol-image">';
        //}


}


function setCoverImage(coverId) {
    const coverContainer = document.getElementById(coverId);
    const img = new Image();
    img.onload = function() {
        coverContainer.innerHTML = '';  // 既存のコンテンツをクリア
        img.style.width = '100%';
        img.style.height = '100%';
        coverContainer.appendChild(img);
        coverContainer.style.display = 'block';  // 画像のロード完了後に表示
    };
    img.src = "/img/q.gif";  // ここで設定してロード開始
}

// この改善された関数を呼び出すタイミングでカバー画像を設定



function resetLevelPatterns(level) {
    problemState.solvedPatterns[`lv${level}`] = [];
    //showNotification("今のレベルの問題をリセットしました。");
    generateLvProblem(level);
}


function clearOldLevels() {
    for (const level in problemState.solvedPatterns) {
        problemState.solvedPatterns[level] = [];
    }
    //showNotification("全てのレベルの問題をリセットしました。");
    //updateRemainingProblems();
}


function startLevel(level) {
    toggleKeypad(false);
    clearOldLevels();
    restoreCoins(level);　//ご褒美コインの復元
    pressCount = 0;
    problemState.level = level;  // レベルを設定
    problemState.correctStreak = 0;
    problemState.mistakeCount = 0;
    problemState.mistakes = []; // 前回の間違いリストを持ち越さない
    problemState.remainingQuestions = 0;
    problemState.howManyOriginalProblems = 0;
    problemState.useExistingCoins = 0;
    problemState.mistakeMade = false; // 間違いのフラグもリセットする
    startTimer(); // タイマーをスタート
    //setTimeout(() => {
        generateLvProblem(level);
        updateHelpCheckboxVisibility(level);
        setTimeout(() => {
            toggleKeypad(true);
        }, 750);
        // チェックボックスの表示/非表示を制御
    //}, 750);
}

function updateHelpCheckboxVisibility(level) {
    const helpCheckboxDiv = document.querySelector('.help-checkbox');
    if (!helpCheckboxDiv) return;  // チェックボックスのdivが存在しない場合は何もしない

    // レベル10と11の場合は非表示、それ以外は表示
    //　★★かけ算は、常にチェックボックスを非表示！
    //if (level === 10 || level === 11) {
        helpCheckboxDiv.style.display = 'none';
        document.getElementById('helpCheckbox').checked = false;
        // dot-setクラスを持つすべてのdivを非表示に設定
        const dotSets = document.querySelectorAll('.dot-set');
        dotSets.forEach(function(dotSet) {
            dotSet.style.display = 'none';
        });
    //} else {
        //helpCheckboxDiv.style.display = 'block';
    //}
}



//残りの問題数
function updateRemainingProblems() {
    const remainingProblemsElement = document.getElementById("remaining-problems");
    const level = problemState.level;
    const totalPatterns = getPatternsForLevel(level);
    const solvedPatterns = problemState.solvedPatterns[`lv${level}`];
    problemState.howManyOriginalProblems = totalPatterns.length;
    problemState.remainingQuestions = problemState.howManyOriginalProblems - solvedPatterns.length;
    remainingProblemsElement.textContent = `のこり${problemState.remainingQuestions}問`;
}


//コンプリートモーダル
function showModal(level) {
    const modal = document.getElementById('completionModal');
    const modalTitle = document.getElementById('modalTitle');
    const clearTime = stopTimer(); // タイマーをストップし、経過時間を取得
    modalTitle.textContent = `クリア！`;

    const clearTimeElement = document.getElementById('clearTime');
    clearTimeElement.textContent = `クリアタイム ${clearTime}`;

    const elapsedMilliseconds = new Date() - startTime; // 経過時間をミリ秒で取得
    saveBestTime(level, elapsedMilliseconds); // 最高タイムを保存

    const bestTimeElement = document.getElementById('bestTime');
    const bestTime = getBestTime(level);
    if (bestTime !== null) {
        bestTimeElement.textContent = `これまでの最高は ${formatMilliseconds(bestTime)}`;
    } else {
        bestTimeElement.textContent = `これまでの最高は --:--`;
    }

    modal.style.display = 'flex'; // モーダルを表示

    // ご褒美コインを生成する関数を呼び出す
    createRewardCoin(level);

    // コンソールに記録を表示
    console.log(`Level: ${level}, Best Time: ${formatMilliseconds(bestTime)}, Current Time: ${clearTime}`);
}

/*
function showModal(level) {
    const modal = document.getElementById('completionModal');
    const modalTitle = document.getElementById('modalTitle');
    const clearTime = stopTimer(); // タイマーをストップし、経過時間を取得
    modalTitle.textContent = `Lv${level}もんだい、クリア！`;

    const clearTimeElement = document.getElementById('clearTime');
    clearTimeElement.textContent = `クリアタイム：${clearTime}`;
    
    modal.style.display = 'flex'; // モーダルを表示

    // ご褒美コインを生成する関数を呼び出す
    createRewardCoin(level);
}*/



function retryLevel(level) {
    // エンドオブレベルのモーダルを非表示にする
    const completionModal = document.getElementById('completionModal');
    if (completionModal) {
        completionModal.style.display = 'none'; // モーダルを隠す
    }

    // 間違いのフィードバックモーダルを非表示にする
    const mistakeModal = document.getElementById('mistakeModal');
    if (mistakeModal) {
        mistakeModal.style.display = 'none'; // モーダルを隠す
    }
    //generateLvProblem(problemState.level); // 同じレベルの問題を再生成
    clearCoinsOnDOM();
    startLevel(problemState.level);
}

function returnToLevelSelection() {
    // エンドオブレベルのモーダルを非表示にする
    const completionModal = document.getElementById('completionModal');
    if (completionModal) {
        completionModal.style.display = 'none'; // モーダルを隠す
    }

    // 間違いのフィードバックモーダルを非表示にする
    const mistakeModal = document.getElementById('mistakeModal');
    if (mistakeModal) {
        mistakeModal.style.display = 'none'; // モーダルを隠す
    }
    returnMenu(); // メニュー画面に戻る
}



//おたすけだんご
function updateDots(dotsId, number, isTens) {
    const dotsContainer = document.getElementById(dotsId);
    if (!dotsContainer) {
        console.error("Element with ID " + dotsId + " not found.");
        return;
    }

    dotsContainer.innerHTML = '';

    if (isTens) {
        number *= 10;
    }
    //console.log("Updating dots for " + dotsId + " with " + number + " dots.");

    const maxDotsPerRow = 5;
    let dots = '';
    for (let i = 0; i < number; i++) {
        if (i > 0 && i % maxDotsPerRow == 0) {
            dots += '<br>';
        }
        dots += '●';
    }
    dotsContainer.innerHTML = dots;
}

document.getElementById('helpCheckbox').addEventListener('change', function () {
    const dotSets = document.querySelectorAll('.dot-set');
    dotSets.forEach(dotSet => {
        dotSet.style.display = this.checked ? 'block' : 'none';
    });
});


//ストップウォッチ実装
let startTime;
let endTime;

function startTimer() {
    startTime = new Date();
}

function stopTimer() {
    endTime = new Date();
    const elapsedTime = endTime - startTime; // ミリ秒単位の経過時間
    return formatTime(elapsedTime);
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


//最高記録保存。
function saveBestTime(level, time) {
    const key = `multiplication_level_${level}_best_time`;
    const currentBestTime = localStorage.getItem(key);
    if (!currentBestTime || time < parseInt(currentBestTime)) {
        localStorage.setItem(key, time);
    }
}

function getBestTime(level) {
    const key = `multiplication_level_${level}_best_time`;
    const bestTime = localStorage.getItem(key);
    return bestTime ? parseInt(bestTime) : null;
}

function formatMilliseconds(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}





//cd C:\Users\redsh\addsubmaster
 //firebase login
 //firebase deploy
