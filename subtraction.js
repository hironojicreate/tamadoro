
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



// 使用して良い数字は、1~5　0をのぞく
function generateSubtractionPatternsA() {
    const patterns = [];
    for (let a = 1; a <= 5; a++) {
        for (let b = 1; b <= a; b++) {
            const c = a - b;
            if (c > 0 && a !== b) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}

//答えが5より大きい。
function generateSubtractionPatternsB() {
    const patterns = [];
    for (let a = 1; a <= 9; a++) {
        for (let b = 0; b <= a; b++) {
            const c = a - b;
            if (c >= 5) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}

//aは10に固定。
function generateSubtractionPatternsC() {
    const patterns = [];
    const a = 10; // aは10に固定
    for (let b = 1; b <= 9; b++) {
        const c = a - b;
        if (c >= 0) {
            patterns.push([a, b]);
        }
    }
    return patterns;
}


//答えが1～maxAns
function generateSubtractionPatternsD(maxAns) {
    const patterns = [];
    for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= a; b++) {
            const c = a - b;
            if (c >= 1 && c <= maxAns) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}


//1□ー「？」
function generateSubtractionPatternsE() {
    const patterns = [];
    for (let a = 11; a <= 19; a++) {
        for (let b = 1; b <= 9; b++) {
            const c = a - b;
            if (c >= 11) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}

// くりさがり全て
function generateSubtractionPatternsF() {
    const patterns = [];
    for (let a = 11; a <= 18; a++) {
        const onesDigitOfA = a % 10; // aの一の位を取得
        for (let b = 1; b <= 9; b++) {
            if (b <= onesDigitOfA) continue; // bがaの一の位よりも大きくなければならない
            const c = a - b;
            if (c >= 0) {
                patterns.push([a, b]);
            }
        }
    }
    return patterns;
}



let globalPatterns = null; // 一度だけ生成して保持する

function generateSubtractionPatternsG() {
    if (!globalPatterns) {
        const patterns = [];
        for (let a = 2; a <= 18; a++) {
            for (let b = 1; b <= 9; b++) {
                const c = a - b;
                if (c >= 1 && c <= 17) {
                    patterns.push([a, b]);
                }
            }
        }

        // 配列の順序をランダムに入れ替える（シャッフル）
        for (let i = patterns.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [patterns[i], patterns[j]] = [patterns[j], patterns[i]];
        }

        // シャッフル後の先頭から80問を格納
        globalPatterns = patterns.slice(0, 80); // ★ここで80問に制限
    }

    return globalPatterns; // 80問のリストを返す
}




function getPatternsForLevel(level) {
    switch (level) {
        case 1: //5ー「?」
            return [
                [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]
            ];
        case 2:　//1~5までの数字で、答え0をのぞく。
            return generateSubtractionPatternsA();
        case 3:
            return generateSubtractionPatternsB();
        case 4:
            return generateSubtractionPatternsC();
        case 5:// 答えが1~5まで
            return generateSubtractionPatternsD(4);
        case 6:
            return generateSubtractionPatternsD(9);
        case 7:
            return generateSubtractionPatternsE();
        case 8:// ひくひく
            return [ 
                [11, 2], [11, 3], [11, 4], [11, 6], 
                [12, 3], [12, 6], [12, 7], 
                [13, 4], [13, 6], [13, 8], 
                [14, 6], [14, 7], [14, 9],
                [15, 6], [15, 7], [15, 8],
                [16, 7], [17, 8], [18, 9]
            ];
        case 9:// ひくたす
            return [ 
                [11, 5], [11, 7], [11, 8], [11, 9], 
                [12, 5], [12, 6], [12, 8], [12, 9], 
                [13, 5], [13, 6], [13, 7], [13, 9], 
                [14, 5], [14, 6], [14, 7], [14, 8], 
                [15, 9], [16, 8], [16, 9],
                [17, 9], [18, 9]
            ];
        case 10:// 1~9までの数字で、足したら11以上
            return generateSubtractionPatternsF();
        case 11:// 1~9までの数字で、足したら20以下
            return generateSubtractionPatternsG();
            // 他のレベルのパターンも同様に定義
        default:
            return [];
    }
}



function generateLvProblem(level) {
    const patterns = getPatternsForLevel(level);
    const unsolvedPatterns = patterns.filter(
        pattern => !problemState.solvedPatterns[`lv${level}`].some(
            solved => Number(solved[0]) === Number(pattern[0]) && Number(solved[1]) === Number(pattern[1])
            //solved => solved[0] === pattern[0] && solved[1] === pattern[1]//こちらであってると思う。
        )
    );
    /*
    console.log("すべてのパターン:", patterns);
    console.log("解いたパターン:", problemState.solvedPatterns[`lv${level}`]);
    console.log("未解決パターン:", unsolvedPatterns);
    */


    if (unsolvedPatterns.length === 0) {
        const remainingProblemsElement = document.getElementById("remaining-problems");
        remainingProblemsElement.textContent = `のこり0もん！おわったよ！！`;
        //showNotification("すべての問題がおわりました！");
        toggleKeypad(false);
        showModal(level);

        // グローバル変数をリセット（必要に応じて追加）
        if (level === 11) {
            globalPatterns = null; // レベル11専用の問題リストをリセット
            console.log("レベル11の問題リストをリセットしました。");
        }
        
        return;
    }

    const randomIndex = Math.floor(Math.random() * unsolvedPatterns.length);
    const [a, b] = unsolvedPatterns[randomIndex];
    problemState.currentProblem.a = a;　//間違え問題追跡用
    problemState.currentProblem.b = b;　//間違え問題追跡用

    /*if (level !== 1 && level !== 6) {*/
        const c = a - b;
        displayProblem(a, b, c, level);
        //console.log("解いた問題を記録中: ", [a, b]);
        //console.log("記録前の solvedPatterns:", problemState.solvedPatterns[`lv${level}`]);
        problemState.solvedPatterns[`lv${level}`].push([a, b]);
        //console.log("記録後の solvedPatterns:", problemState.solvedPatterns[`lv${level}`]);

    
        //problemState.solvedPatterns[`lv${level}`].push([a, b]);
    /*} else {
        const c = a - b;
        displayProblem(a, b, c, level);
        problemState.solvedPatterns[`lv${level}`].push([a, b]);
    } */
    /*
    // 解いた後に再度 unsolvedPatterns を計算して確認★追跡用★//ここから
    const newUnsolvedPatterns = patterns.filter(
        pattern => !problemState.solvedPatterns[`lv${level}`].some(
            solved => solved[0] === pattern[0] && solved[1] === pattern[1]
        )
    );
    console.log("更新後の未解決パターン:", newUnsolvedPatterns);
    //ここまでは消して良い。
    */
}

let a10overFlag = false; //aが10以上かどうか。

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
        

        //おたすけだんご表示。
        if (updateDotsFlag) {
    
            if (a >= 10) {
                a10overFlag = true;
            }
    
            if (a10overFlag) {
                    if (containerIdPrefix === 'a') {
                            updateDots("a1Dots", a, false, true);
                            updateDots("a2Dots", 0, false, true);
                    } else {
                            updateDots("b1Dots", 0, false, true);
                            updateDots("b2Dots", b, false, true);
                    }
            } else {
                updateDots(containerIdPrefix + "1Dots", tens, true, false);
                updateDots(containerIdPrefix + "2Dots", ones, false, false);
            }
        }
    }

    displayNumber('a', a);
    displayNumber('b', b);
    displayNumber('c', c, false);
    if (a10overFlag) {
        //十の位用
        animateDotsReduction('a1Dots', 'b2Dots');
        a10overFlag = false;
    } else {
        //一の位用
        animateDotsReduction('a2Dots', 'b2Dots');
    }

    /*if (level !== 1 && level !== 6) {*/
        document.getElementById("calculationSymbol1").innerHTML = '<img src="/img/-.png" class="symbol-image">';
        document.getElementById("calculationSymbol2").innerHTML = '<img src="/img/=.png" class="symbol-image">';
    /*} else {
        document.getElementById("calculationSymbol1").innerHTML = '<img src="/img/h.png" class="symbol-image">';
        document.getElementById("calculationSymbol2").innerHTML = '<img src="/img/t.png" class="symbol-image">';
        }*/

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

    // グローバル変数をリセット（必要に応じて追加）
    if (level === 11) {
        globalPatterns = null; // レベル11専用の問題リストをリセット
        console.log("レベル11の問題リストをリセットしました。");
    }
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
}
*/


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


//おたすけだんご isTensは、十の位か否かを判定。moreThan10は、10より大きいかどうか。
function updateDots(dotsId, number, isTens, moreThan10) {
    const dotsContainer = document.getElementById(dotsId);
    if (!dotsContainer) {
        console.error("Element with ID " + dotsId + " not found.");
        return;
    }

    dotsContainer.innerHTML = '';

    if (isTens) {
        number *= 10;
    }

    let maxDotsPerRow = moreThan10 ? 10 : 5;  // 折り返しの数を設定
    let dots = '';

    for (let i = 0; i < number; i++) {
        if (i > 0 && i % maxDotsPerRow == 0) {
            dots += '<br>';
        }
        dots += '●';
        if (moreThan10 && i % 5 == 4 && i % maxDotsPerRow != maxDotsPerRow - 1) {
            dots += ' ';  // moreThan10がtrueの時は5つ毎に半角スペースを追加
        }
    }
    dotsContainer.innerHTML = dots;
}


document.getElementById('helpCheckbox').addEventListener('change', function () {
    const dotSets = document.querySelectorAll('.dot-set');
    dotSets.forEach(dotSet => {
        dotSet.style.display = this.checked ? 'block' : 'none';
    });
});


// お助け団子消失用
function getDotsCount(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Element with ID " + elementId + " not found.");
        return 0;
    }
    // ●の数を数える
    return (element.innerHTML.match(/●/g) || []).length;
}

function resetDotsColor(elementId, color) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Element with ID " + elementId + " not found.");
        return;
    }
    // <span>タグを削除して色をリセット
    element.innerHTML = element.innerHTML.replace(/<span[^>]*>|<\/span>/g, '●');
    element.style.color = color;
    console.log(`Element ${elementId} reset to color ${color}`);
}

function animateDotsReduction(aElementId, bElementId) {
    const aElement = document.getElementById(aElementId);
    const bElement = document.getElementById(bElementId);

    if (!aElement || !bElement) {
        console.error("Element with ID " + (aElement ? bElementId : aElementId) + " not found.");
        return;
    }

    // 全ての<span>タグを削除し、初期化
    resetDotsColor(aElementId, 'red');
    resetDotsColor(bElementId, 'blue');

    const aDotsCount = getDotsCount(aElementId);
    const bDotsCount = getDotsCount(bElementId);

    let dotsToFade = Math.min(aDotsCount, bDotsCount);
    const aDotsArray = aElement.innerHTML.split('');
    const bDotsArray = bElement.innerHTML.split('');

    let count = 0;
    let fadeFromStart = true;  // デフォルトは前からライトグレーにする

    // 条件に基づいて分岐
    if (problemState.level === 9) {
        fadeFromStart = true;
    } else if ([4, 7, 8].includes(problemState.level) || problemState.currentProblem.b <= 4) {
        fadeFromStart = false;
    }

    if (fadeFromStart) {
        for (let i = 0; i < aDotsArray.length && count < dotsToFade; i++) {
            if (aDotsArray[i] === '●') {
                aDotsArray[i] = '<span style="color: red; transition: color 1s;">●</span>';
                count++;
            }
        }
    } else {
        for (let i = aDotsArray.length - 1; i >= 0 && count < dotsToFade; i--) {
            if (aDotsArray[i] === '●') {
                aDotsArray[i] = '<span style="color: red; transition: color 1s;">●</span>';
                count++;
            }
        }
    }

    for (let i = 0; i < bDotsArray.length; i++) {
        if (bDotsArray[i] === '●') {
            bDotsArray[i] = '<span style="color: blue; transition: color 1s;">●</span>';
        }
    }

    aElement.innerHTML = aDotsArray.join('');
    bElement.innerHTML = bDotsArray.join('');

    setTimeout(() => {
        const fadedADotsArray = aElement.querySelectorAll('span');
        const fadedBDotsArray = bElement.querySelectorAll('span');

        for (let i = 0; i < dotsToFade; i++) {
            fadedADotsArray[i].style.color = 'lightgray';
        }

        for (let i = 0; i < fadedBDotsArray.length; i++) {
            fadedBDotsArray[i].style.color = 'lightgray';
        }
    }, 100); // アニメーションの開始
}



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

//最速タイム保存
function saveBestTime(level, time) {
    const key = `subtraction_level_${level}_best_time`;
    const currentBestTime = localStorage.getItem(key);
    if (!currentBestTime || time < parseInt(currentBestTime)) {
        localStorage.setItem(key, time);
    }
}

function getBestTime(level) {
    const key = `subtraction_level_${level}_best_time`;
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
