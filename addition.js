
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
        lv11: []
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
        11: '/img/Smaru.png'
    }
};



// 使用して良い数字は、1~9
function generatePatternsA(maxSum) {
    const patterns = [];
    for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= 9; b++) {
            if (a + b <= maxSum) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}

//使用してよい数字は1～5
function generatePatternsB(maxSum) {
    const patterns = [];
    for (let a = 1; a <= 5; a++) {
        for (let b = 1; b <= 5; b++) {
            if (a + b <= maxSum) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}

// 使用して良い数字は、1~9
function generatePatternsC(maxSum) {
    const patterns = [];
    for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= 9; b++) {
            if (a + b <= maxSum) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}

// 使用して良い数字は、1~9 しかし、aも、bも、共に4以下は除外。
function generatePatternsD(maxSum) {
    const patterns = [];
    for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= 9; b++) {
            if (a + b <= maxSum && !(a <= 4 && b <= 4)) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}

// 使用して良い数字は、1~9 答えは、11以上14以下
function generatePatternsE(minSum) {
    const patterns = [];
    for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= 9; b++) {
            const sum = a + b;
            if (sum >= minSum && sum <= 14) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}


// 使用して良い数字は、1~9 答えは、11以上
function generatePatternsF(minSum) {
    const patterns = [];
    for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= 9; b++) {
            if (a + b >= minSum) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}


function getPatternsForLevel(level) {
    switch (level) {
        case 1:
            return [
                [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]
            ];
        case 2:　//1~9までの数字で、足したら5以下
            return generatePatternsA(5);
        case 3:
            return [
                [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]
            ];
        case 4:
            return [
                [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5],
                [0, 5], [1, 5], [2, 5], [3, 5], [4, 5]
            ];
        case 5:// 1~5までの数字で、足したら10以下
            return generatePatternsB(10);
        case 6:
            return [
                [10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 5],
                [10, 6], [10, 7], [10, 8], [10, 9], [10, 10]
            ];
        case 7:
            return [
                [10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 5],
                [10, 6], [10, 7], [10, 8], [10, 9], [10, 10],
                [0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10],
                [6, 10], [7, 10], [8, 10], [9, 10] 
            ];
        case 8:// 1~9までの数字で、足したら10以下
            return generatePatternsD(10);
        case 9:// 1~9までの数字で、足したら11以上14以下
            return generatePatternsE(11);
        case 10:// 1~9までの数字で、足したら11以上
            return generatePatternsF(11);
        case 11:// 1~9までの数字で、足したら20以下
            return generatePatternsC(20);
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
        remainingProblemsElement.textContent = `のこり0もん！おわったよ！！`;
        //showNotification("すべての問題がおわりました！");
        toggleKeypad(false);
        showModal(level);
        return;
    }

    const randomIndex = Math.floor(Math.random() * unsolvedPatterns.length);
    const [a, b] = unsolvedPatterns[randomIndex];
    problemState.currentProblem.a = a;　//間違え問題追跡用
    problemState.currentProblem.b = b;　//間違え問題追跡用

    if (level !== 1 && level !== 6) {
        const c = a + b;
        displayProblem(a, b, c, level);
        problemState.solvedPatterns[`lv${level}`].push([a, b]);
    } else {
        const c = a - b;
        displayProblem(a, b, c, level);
        problemState.solvedPatterns[`lv${level}`].push([a, b]);
    } 
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

    if (level !== 1 && level !== 6) {
        document.getElementById("calculationSymbol1").innerHTML = '<img src="/img/+.png" class="symbol-image">';
        document.getElementById("calculationSymbol2").innerHTML = '<img src="/img/=.png" class="symbol-image">';
    } else {
        document.getElementById("calculationSymbol1").innerHTML = '<img src="/img/h.png" class="symbol-image">';
        document.getElementById("calculationSymbol2").innerHTML = '<img src="/img/t.png" class="symbol-image">';
        }


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
    if (level === 10 || level === 11) {
        helpCheckboxDiv.style.display = 'none';
        document.getElementById('helpCheckbox').checked = false;
        // dot-setクラスを持つすべてのdivを非表示に設定
        const dotSets = document.querySelectorAll('.dot-set');
        dotSets.forEach(function(dotSet) {
            dotSet.style.display = 'none';
        });
    } else {
        helpCheckboxDiv.style.display = 'block';
    }
}



//残りの問題数
function updateRemainingProblems() {
    const remainingProblemsElement = document.getElementById("remaining-problems");
    const level = problemState.level;
    const totalPatterns = getPatternsForLevel(level);
    const solvedPatterns = problemState.solvedPatterns[`lv${level}`];
    problemState.howManyOriginalProblems = totalPatterns.length;
    problemState.remainingQuestions = problemState.howManyOriginalProblems - solvedPatterns.length;
    remainingProblemsElement.textContent = `のこり${problemState.remainingQuestions}もん`;
}


//コンプリートモーダル
function showModal(level) {
    const modal = document.getElementById('completionModal');
    const modalTitle = document.getElementById('modalTitle');
    const clearTime = stopTimer(); // タイマーをストップし、経過時間を取得
    modalTitle.textContent = `Lv${level}もんだい、クリア！`;

    const clearTimeElement = document.getElementById('clearTime');
    clearTimeElement.textContent = `クリアタイム ${clearTime}`;

    const elapsedMilliseconds = new Date() - startTime; // 経過時間をミリ秒で取得
    saveBestTime(level, elapsedMilliseconds); // 最高タイムを保存

    const bestTimeElement = document.getElementById('bestTime');
    const bestTime = getBestTime(level);
    if (bestTime !== null) {
        bestTimeElement.textContent = `これまでのさいこうは ${formatMilliseconds(bestTime)}`;
    } else {
        bestTimeElement.textContent = `これまでのさいこうは --:--`;
    }

    modal.style.display = 'flex'; // モーダルを表示

    // ご褒美コインを生成する関数を呼び出す
    createRewardCoin(level);

    // コンソールに記録を表示
    console.log(`Level: ${level}, Best Time: ${formatMilliseconds(bestTime)}, Current Time: ${clearTime}`);
}




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







//cd C:\Users\redsh\addsubmaster
 //firebase login
 //firebase deploy
