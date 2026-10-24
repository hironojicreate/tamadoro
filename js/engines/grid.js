// 百マス計算のエンジン
//   表の上の行と左の列の数をたして、マスをうめていく
// 百マスの表を生成

// 一意のランダムな数値を生成する関数（例外的に重複を許可）
function getUniqueOrRepeatedNumbers(min, max, count) {
    // 数値の範囲を配列として生成
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);

    // 必要な数より範囲が小さい場合
    if (numbers.length < count) {
        const repeatedNumbers = [];
        while (repeatedNumbers.length < count) {
            repeatedNumbers.push(...numbers); // 配列を追加
        }
        repeatedNumbers.length = count; // 必要な長さに切り詰める
        return shuffleArray(repeatedNumbers); // シャッフルして返す
    }

    // 範囲内の一意な数値をシャッフルして返す（重複不要）
    return shuffleArray(numbers).slice(0, count);
}

// 配列をシャッフルする関数（Fisher-Yates法）
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// 各レベルの問題とスタイル設定
const levelConfigs = {
    1: { rows: 3, cols: 3, min: 0, max: 5, cellWidth: 70, cellHeight: 70, fontSize: "25px", position: { top: '20%', left: '30%' } }, //ok
    2: { rows: 3, cols: 5, min: 0, max: 5, cellWidth: 70, cellHeight: 70, fontSize: "25px", position: { top: '20%', left: '30%' } }, //ok
    3: { rows: 5, cols: 5, min: 0, max: 5, cellWidth: 70, cellHeight: 70, fontSize: "25px", position: { top: '20%', left: '25%' } }, //ok
    4: { rows: 7, cols: 7, min: 0, max: 9, cellWidth: 65, cellHeight: 55, fontSize: "23px", position: { top: '15%', left: '20%' } }, //ok
    5: { rows: 10, cols: 10, min: 0, max: 9, cellWidth: 41, cellHeight: 41, fontSize: "18px", position: { top: '12%', left: '23%' } }, //ok
    6: { rows: 1, cols: 1, min: 0, max: 5, cellWidth: 70, cellHeight: 70, fontSize: "25px", position: { top: '20%', left: '30%' } }, //ok
};


// createTable 関数
async function createTable(level) {
    updateRecordDisplay(level); // これまでのタイムを表示
    const config = levelConfigs[level];
    if (!config) {
        console.error(`Level ${level} configuration not found.`);
        return;
    }

    const { rows, cols, min, max, cellWidth, cellHeight, fontSize, position } = config; // レベル設定を取得
    currentTotalRows = rows;
    currentTotalCols = cols;

    const table = document.getElementById('calculation-grid');
    table.innerHTML = ''; // テーブルをクリア

    // 表の位置とスタイルを設定
    table.style.position = 'absolute';
    table.style.top = position.top;
    table.style.left = position.left;

    // ラベルを生成
    const columnLabels = getUniqueOrRepeatedNumbers(min, max, cols);
    const rowLabels = getUniqueOrRepeatedNumbers(min, max, rows);

    // **レベル5が選ばれた場合にJSONファイルを参照**
    // イラストが読み込めなかったときは、イラストなしの百マスとして続ける
    window.patternArray = null;
    if (level === 5) {
        const selectedPattern = await PatternManager.selectPatternForLevel5();
        // 動的にキーを取得してパターン部分を参照（{ pattern3: [...] } の配列部分）
        const patternArray = selectedPattern ? Object.values(selectedPattern)[0] : null;
        if (Array.isArray(patternArray) && patternArray.length > 0) {
            window.patternArray = patternArray;
        } else {
            console.error('イラストのパターンを読み込めませんでした。');
        }
    }

    // 正解を保存する変数（初期値は null）
    let firstCorrectAnswer = null;

    // テーブルを生成
    for (let i = 0; i <= rows; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j <= cols; j++) {
            const cell = document.createElement('td');
            cell.style.width = `${cellWidth}px`;
            cell.style.height = `${cellHeight}px`;
            cell.style.fontSize = fontSize;

            // ラベルを配置
            if (i === 0 && j === 0) {
                cell.textContent = '+'; // 左上のセル
            } else if (i === 0) {
                cell.textContent = columnLabels[j - 1]; // 最上部（列ラベル）
            } else if (j === 0) {
                cell.textContent = rowLabels[i - 1]; // 最左列（行ラベル）
            } else {
                // 答えを計算して最初のセルの答えを保存
                const correctAnswer = rowLabels[i - 1] + columnLabels[j - 1];
                if (firstCorrectAnswer === null) {
                    firstCorrectAnswer = correctAnswer;
                }
            }

            row.appendChild(cell);
        }
        table.appendChild(row);
    }

    // 最初の答えを保存
    if (firstCorrectAnswer !== null) {
        problemState.answer = firstCorrectAnswer;
        console.log(`最初の答えを代入しました: ${problemState.answer}`);
    } else {
        console.error('答えを計算できませんでした。');
    }
    setCursorOnFirstCell(); // 初期カーソル位置設定
}



//色変更
function onCorrectAnswer(row, col) {
    if (problemState.level !== 5) {
        //console.log(`Level ${problemState.level} is not level 5, skipping JSON-based color update.`);
        return;
    }

    const table = document.getElementById('calculation-grid');
    const cell = table.rows[row]?.cells[col];
    if (!cell) {
        console.error(`Cell at row ${row}, col ${col} does not exist.`);
        return;
    }

    if (row === 0 || col === 0) {
        console.log(`Row ${row} or column ${col} is a label cell, skipping.`);
        return;
    }

    const adjustedRow = row - 1;
    const adjustedCol = col - 1;

    if (!window.patternArray) {
        return; // イラストなし
    }

    if (
        adjustedRow < 0 || adjustedRow >= patternArray.length ||
        adjustedCol < 0 || adjustedCol >= patternArray[adjustedRow]?.length
    ) {
        console.error(`Invalid indices: adjustedRow=${adjustedRow}, adjustedCol=${adjustedCol}`);
        return;
    }

    const cellValue = patternArray[adjustedRow][adjustedCol];
    if (cellValue === 1) {
        cell.classList.add('color-red'); // 正答時に赤クラスを追加
    } else if (cellValue === 0) {
        cell.classList.add('color-yellow'); // 正答時に黄クラスを追加
    }
}




const PatternManager = (function () {
    let loading = null; // 読み込み中／読み込み済みの Promise
    let usedPatterns = []; // 使用済みのパターンを追跡

    // JSONデータを読み込む（何度呼んでも読み込みは1回。失敗したら null を返し、次回また試す）
    function loadPatterns() {
        if (!loading) {
            loading = fetch('/illustration_patterns.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load pattern data: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => data.patterns)
                .catch(error => {
                    console.error('Error loading pattern data:', error);
                    loading = null;
                    return null;
                });
        }
        return loading;
    }

    // レベル5用のパターンをランダムに選択する（読み込めなかったときは null）
    async function selectPatternForLevel5() {
        const data = await loadPatterns();
        if (!data || data.length === 0) {
            return null;
        }

        // 使用済みでないパターンを取得。すべて使用済みならリセット
        let unusedPatterns = data.filter(pattern => !usedPatterns.includes(pattern));
        if (unusedPatterns.length === 0) {
            usedPatterns = [];
            unusedPatterns = data;
        }

        // ランダムに未使用のパターンを選択
        const selectedPattern = unusedPatterns[Math.floor(Math.random() * unusedPatterns.length)];
        usedPatterns.push(selectedPattern); // 使用済みに追加
        return selectedPattern;
    }

    return {
        loadPatterns,
        selectPatternForLevel5,
    };
})();

// ページ読み込み時にパターンを先読み
PatternManager.loadPatterns();




async function gridStartLevel(level) {
    toggleKeypad(false);
    resetProblemCorrectCount(); // 問題単位の正答数をリセット
    partialInput = ""; // 2けた入力の途中状態をリセット

    if (level === 6) {
        unlockSliders(); // スライダーをunlock
        restoreSliders(); //この関数内で、createTable(6);を実行。
    } else {
        createTable(level);
    }

    recordList.classList.add("show");
    setTimeout(() => {
        recordList.classList.remove("show");
    }, 1000);

    //setCursorOnFirstCell(); // 初期カーソル位置設定
    restoreCoins(level); // ご褒美コインの復元

    problemState.level = level;
    problemState.correctStreak = 0;
    problemState.mistakeCount = 0;
    problemState.remainingQuestions = 0;
    problemState.howManyOriginalProblems = 0;
    problemState.useExistingCoins = 0;
    problemState.mistakeMade = false;

    updateCorrectAnswerDisplay(problemState.level);
    startTimer(); // タイマーをスタート

    setTimeout(() => {
        toggleKeypad(true);
    }, 750);
}



let currentCellIndex = { row: 1, col: 1 }; // 初期位置
let currentTotalRows = 10; // デフォルトの行数
let currentTotalCols = 10; // デフォルトの列数


// カーソルの移動時に入力対象セルを切り替え
function moveCursorToNextCell() {
    // 現在のセルのスタイルをリセット
    const currentCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:nth-child(${currentCellIndex.col + 1})`
    );
    if (currentCell) {
        currentCell.classList.remove('input-target');
    }

    // ラインハイライトをリセット
    resetLineHighlight();

    // 次のセルにカーソルを移動
    currentCellIndex.col++;
    if (currentCellIndex.col > currentTotalCols) {
        currentCellIndex.col = 1;
        currentCellIndex.row++;
    }
    if (currentCellIndex.row > currentTotalRows) {
        // すべて終了したの合図を出す（もういちどちょうせんするまで、入力は受けつけない）
        toggleKeypad(false);
        if (problemState.level === 5) {
            // レベル5の場合は「がんばったねパネル」を表示
            showCongratsPanel();
        } else {
            // レベル5以外は通常のモーダルを表示
            gridShowModal(problemState.level);
        }
        return;
    }

    // 新しいセルにクラスを追加
    const nextCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:nth-child(${currentCellIndex.col + 1})`
    );
    if (nextCell) {
        nextCell.classList.add('input-target');
        highlightLines(currentCellIndex.row, currentCellIndex.col);
    }

    // 正解を計算して problemState に保存
    const topCell = document.querySelector(
        `#calculation-grid tr:first-child td:nth-child(${currentCellIndex.col + 1})`
    );
    const leftCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:first-child`
    );

    if (topCell && leftCell) {
        const correctAnswer = parseInt(topCell.textContent) + parseInt(leftCell.textContent);
        problemState.answer = correctAnswer; // 正解を新しいプロパティに保存
        console.log(`現在の正解: ${problemState.answer}`);
    } else {
        console.error('正解のセルが見つかりませんでした。');
    }
}



// ラインを強調する
function highlightLines(row, col) {
    // 上部 (1行目) のセルを強調（どのレベルでも適用）
    const topCell = document.querySelector(
        `#calculation-grid tr:first-child td:nth-child(${col + 1})`
    );
    if (topCell) {
        topCell.classList.add('problem-number-top'); // 問題セルを強調
    }

    // 左側 (1列目) のセルを強調（どのレベルでも適用）
    const leftCell = document.querySelector(
        `#calculation-grid tr:nth-child(${row + 1}) td:first-child`
    );
    if (leftCell) {
        leftCell.classList.add('problem-number'); // 問題セルを強調
    }

    // レベル5では垂直ラインと水平ラインの強調をスキップ
    if (problemState.level === 5) {
        console.log('Level 5 selected: Skipping vertical and horizontal line highlights.');
        return; // 垂直・水平ライン強調をスキップ
    }

    // 垂直ラインを強調（問題セル以外）
    for (let r = 2; r <= row; r++) {
        const verticalCell = document.querySelector(
            `#calculation-grid tr:nth-child(${r}) td:nth-child(${col + 1})`
        );
        if (verticalCell && !verticalCell.classList.contains('input-target')) {
            verticalCell.classList.add('line-highlight');
        }
    }

    // 水平ラインを強調（問題セル以外）
    for (let c = 2; c <= col; c++) {
        const horizontalCell = document.querySelector(
            `#calculation-grid tr:nth-child(${row + 1}) td:nth-child(${c})`
        );
        if (horizontalCell && !horizontalCell.classList.contains('input-target')) {
            horizontalCell.classList.add('line-highlight');
        }
    }
}



// ラインハイライトをリセット
function resetLineHighlight() {
    // 灰色のラインをリセット
    document.querySelectorAll('.line-highlight').forEach(cell => {
        cell.classList.remove('line-highlight');
    });

    // 上部（1行目）の強調をリセット
    document.querySelectorAll('.problem-number-top').forEach(cell => {
        cell.classList.remove('problem-number-top');
    });

    // 左側（1列目）の強調をリセット
    document.querySelectorAll('.problem-number').forEach(cell => {
        cell.classList.remove('problem-number');
    });
}



// 初期位置のセルにスタイルを適用
function setCursorOnFirstCell() {
    const table = document.getElementById('calculation-grid');
    if (!table || !table.rows || table.rows.length === 0) {
        console.error("Table not found or empty. Cannot set cursor.");
        return;
    }

    const firstCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:nth-child(${currentCellIndex.col + 1})`
    );

    if (!firstCell) {
        console.error(`First cell not found. Check currentCellIndex: row=${currentCellIndex.row}, col=${currentCellIndex.col}`);
        return;
    }

    firstCell.classList.add('input-target');
    console.log(`Cursor set to cell: row=${currentCellIndex.row}, col=${currentCellIndex.col}`);
}




// 各レベルごとの累積正答数を記録するオブジェクト
let correctAnswerCounts = {}; // { level1: 0, level2: 0, ... }
let problemCorrectCount = 0; // 問題単位の正答数を記録する変数

// 正誤判定
function checkAnswer(row, col, inputValue) {
    const topCell = document.querySelector(
        `#calculation-grid tr:first-child td:nth-child(${col + 1})`
    );
    const leftCell = document.querySelector(
        `#calculation-grid tr:nth-child(${row + 1}) td:first-child`
    );

    const correctAnswer = parseInt(topCell.textContent) + parseInt(leftCell.textContent);
    //problemState.level = correctAnswer;
    const inputCell = document.querySelector(
        `#calculation-grid tr:nth-child(${row + 1}) td:nth-child(${col + 1})`
    );

    // 現在のレベル
    const currentLevel = problemState.level;

    // レベルごとの累積正答数を初期化（初アクセス時のみ）
    if (!correctAnswerCounts[currentLevel]) {
        correctAnswerCounts[currentLevel] = 0;
    }

    if (parseInt(inputValue) === correctAnswer) {
        inputCell.classList.add('correct');
        setTimeout(() => {
            inputCell.classList.remove('correct');
        }, 500);

        correctAnswerCounts[currentLevel]++; // 現在のレベルの累積正答数を更新
        problemCorrectCount++; // 問題単位の正答数を更新
        updateCorrectAnswerDisplay(problemState.level); // 正答数・誤答数を画面に反映
        throwCoin(currentLevel, false, 50, 1, 0, 0.5);  // 百マスはドロップのはね返りを低くする
        onCorrectAnswer(row, col);
    } else {
        inputCell.classList.add('incorrect');

        problemState.mistakeCount += 1; // 累積誤答数を更新
        updateCorrectAnswerDisplay(problemState.level); // 正答数・誤答数を画面に反映
    }
}

// 正答数と誤答数を画面に反映、保存する
function updateCorrectAnswerDisplay(currentLevel) {
    if (!currentLevel) {
        return; // レベルが決まる前（問題のリセット時）は保存しない
    }
    initializeCumulativeCorrectCounts();
    const cumulativeDisplay = document.getElementById('correct-answer-count');
    const problemDisplay = document.getElementById('problem-correct-count');
    const wrongDisplay = document.getElementById('wrong-answer-count'); // 誤答数の表示要素

    // 現在のレベルの累積正答数を取得
    const correctCount = correctAnswerCounts[currentLevel] || 0;

    // 累積正答数を保存
    saveCumulativeCorrectCount(currentLevel, correctCount);

    // 累積正答数を表示
    if (cumulativeDisplay) {
        cumulativeDisplay.textContent = `累積正答数 (Lv${currentLevel}): ${correctCount}`;
    }

    // 問題単位の正答数を表示
    if (problemDisplay) {
        problemDisplay.textContent = `正答数: ${problemCorrectCount}`;
    }

    // 累積誤答数を表示
    if (wrongDisplay) {
        wrongDisplay.textContent = `誤答数: ${problemState.mistakeCount}`;
    }
}



// 問題をリセットする際に問題単位の正答数をリセットする
function resetProblemCorrectCount() {
    problemCorrectCount = 0; // 問題単位の正答数をリセット
    problemState.mistakeCount = 0;
    updateCorrectAnswerDisplay(); // 表示を更新
}




//コンプリートモーダル
function gridShowModal(level) {
    // 問題の正答率を計算
    const totalQuestions = problemCorrectCount + problemState.mistakeCount; // 全体の問題数
    const correctRate = totalQuestions > 0 ? (problemCorrectCount / totalQuestions) * 100 : 0; // 正答率を計算

    const modal = document.getElementById('completionModal');
    const modalTitle = document.getElementById('modalTitle');
    const clearTimeElement = document.getElementById('clearTime');
    const bestTimeElement = document.getElementById('bestTime');
    let rewardGenerated = false; // ご褒美コインが生成されたかのフラグ
    let drop = null;

    // クリアタイムの設定
    let clearTime = stopTimer(); // タイマーをストップし、経過時間を「分：秒」で取得
    const elapsedMilliseconds = parseTimeToSeconds(clearTime) * 1000; // 秒からミリ秒に変換

    if (correctRate >= 80) {
        clearTimeElement.textContent = `クリアタイム ${formatMilliseconds(elapsedMilliseconds)}`;

        saveBestTime(level, elapsedMilliseconds / 1000); // 秒単位で保存
        drop = createRewardCoin(level); // ご褒美コインを生成
        rewardGenerated = true; // フラグを更新

        // 記録を追加（秒単位で保存、表示時は「分：秒」にフォーマット）
        addRecord(level, Math.floor(elapsedMilliseconds / 1000), problemCorrectCount);
    } else {
        clearTimeElement.textContent = `クリアタイム ：きろくはありません。`;
    }

    // 最高記録の表示（今回の記録を保存した後に取得する）
    const bestTime = getBestTime(level); // 秒単位の最高記録を取得
    bestTimeElement.textContent = bestTime !== null
        ? `これまでのさいこうは ${formatMilliseconds(bestTime * 1000)}`
        : `これまでのさいこうは --:--`;

    // モーダルのタイトルを更新
    modalTitle.textContent = rewardGenerated
        ? `Lv${level}もんだい、クリア！`
        : `Lv${level}クリアできませんでした......。`;

    modal.style.display = 'flex'; // モーダルを表示
    unlockSliders(); //スライダーをunlock

    History.addEntry({
        mode: currentMode.id, level, ms: endTime - startTime,
        total: totalQuestions, miss: problemState.mistakeCount, cleared: rewardGenerated, drop,
    });
}




function gridRetryLevel() {
    // モーダルを非表示
    const completionModal = document.getElementById('completionModal');
    if (completionModal) completionModal.style.display = 'none';

    const mistakeModal = document.getElementById('mistakeModal');
    if (mistakeModal) mistakeModal.style.display = 'none';

    // テーブルをクリアして再生成
    const table = document.getElementById('calculation-grid');
    if (table) table.innerHTML = '';

    currentCellIndex = { row: 1, col: 1 }; // カーソル位置をリセット
    partialInput = ""; // 2けた入力の途中状態をリセット
    resetLineHighlight();
    createTable(problemState.level); // テーブルを生成
    //setTimeout(() => {
        //setCursorOnFirstCell(); // 適切なタイミングでカーソルを設定
    //}, 400); // 描画を待つため少し遅延
    resetProblemCorrectCount(); // 問題単位の正答数をリセット
    updateCorrectAnswerDisplay(problemState.level);
    startTimer();
    toggleKeypad(true);
}







//累積正答数保存。
function saveCumulativeCorrectCount(level, count) {
    const key = `hundredgrid_level_${level}_correct_count`;
    localStorage.setItem(key, count); // 累積正答数を保存
    console.log(`Saved cumulative correct count for Level ${level}: ${count}`);
}

//累積正答数読み込み
function getCumulativeCorrectCount(level) {
    const key = `hundredgrid_level_${level}_correct_count`;
    const storedCount = localStorage.getItem(key);
    return storedCount ? parseInt(storedCount, 10) : 0; // 保存された値を返すか、デフォルトで0を返す
}




//★★最高記録の表示と保存の制御
//ローカルストレージに保存
function addRecord(level, time, correctAnswers) {
    const key = `hundredgrid_level_${level}_records`;
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式の日付

    const newRecord = { time, correctAnswers, date };
    const records = JSON.parse(localStorage.getItem(key)) || [];

    // 新しい記録を追加し、時間順にソートして上位5件を保存
    records.push(newRecord);
    const sortedRecords = records.sort((a, b) => a.time - b.time).slice(0, 5);
    localStorage.setItem(key, JSON.stringify(sortedRecords));
}

//レベルの上位10件の記録を取得
function getSortedRecords(level) {
    const key = `hundredgrid_level_${level}_records`;
    const records = JSON.parse(localStorage.getItem(key)) || [];
    return records; // 既に上位10件だけが保存されている
}

//「分：秒」形式を秒単位に変換
function parseTimeToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
}

// 日付を「月/日」にフォーマット
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return `${month}/${day}`; // 「月/日」形式
}


//記録をHTMLリストに表示

function updateRecordDisplay(level) {
    const recordList = document.getElementById('recordList');
    recordList.innerHTML = ""; // 一旦クリア

    const records = getSortedRecords(level);    

    if (records.length === 0) {
        const noRecordItem = document.createElement('li');
        noRecordItem.textContent = "記録がありません。";
        recordList.appendChild(noRecordItem);
    } else {
        records.forEach((record, index) => {
            const formattedTime = formatMilliseconds(record.time * 1000); // 秒をミリ秒に変換してフォーマット
            const formattedDate = formatDate(record.date); // 日付を「月/日」形式にフォーマット

            const listItem = document.createElement('li');
            listItem.style.marginBottom = "10px";
            listItem.innerHTML = `
                ${index + 1}. ${formattedTime}, 正答:${record.correctAnswers}, ${formattedDate}
            `;
            recordList.appendChild(listItem);
        });
    }

}

// リストの手動展開・閉じる操作
document.getElementById("toggleRecordList").addEventListener("click", function() {
    const recordList = document.getElementById("recordList");
    if (recordList.classList.contains("show")) {
        recordList.classList.remove("show"); // クラスを削除して閉じる
        console.log("リストを閉じました。");
    } else {
        recordList.classList.add("show"); // クラスを追加して展開
        console.log("リストを展開しました。");
    }
});





//レベル6動的生成
document.addEventListener('DOMContentLoaded', () => {
    const rowsSlider = document.getElementById('custom-rows');
    const colsSlider = document.getElementById('custom-cols');
    const minSlider = document.getElementById('custom-min');
    const maxSlider = document.getElementById('custom-max');

    const rowsValue = document.getElementById('rows-value');
    const colsValue = document.getElementById('cols-value');
    const minValue = document.getElementById('min-value');
    const maxValue = document.getElementById('max-value');

    // スライダーの値をリアルタイムに表示
    const updateValueDisplay = (slider, display) => {
        display.textContent = slider.value;
    };

    // スライダーの値を levelConfigs に反映
    //restoreSliderにも使用。修正の際は、下記とそろえること。
    const updateLevel6Config = () => {
        const rows = parseInt(rowsSlider.value, 10);
        const cols = parseInt(colsSlider.value, 10);
        const min = parseInt(minSlider.value, 10);
        const max = parseInt(maxSlider.value, 10);

        const maxDimension = Math.max(rows, cols);

        // cellWidth, cellHeight, fontSize, position を設定
        let cellWidth, cellHeight, fontSize, position;
        if (maxDimension <= 5) {
            cellWidth = 70;
            cellHeight = 70;
            fontSize = "25px";
            position = { top: '20%', left: '25%' };
        } else if (maxDimension <= 8) {
            cellWidth = 60;
            cellHeight = 45;
            fontSize = "20px";
            position = { top: '13%', left: '15%' };
        } else {
            cellWidth = 40;
            cellHeight = 40;
            fontSize = "18px";
            position = { top: '12%', left: '20%' };
        }

        // levelConfigs のレベル6を更新
        levelConfigs[6] = {
            rows,
            cols,
            min,
            max,
            cellWidth,
            cellHeight,
            fontSize,
            position,
        };

        // 表を再生成
        createTable(6);
        //setCursorOnFirstCell(); // 初期カーソル位置設定
    };

    // スライダーのイベントリスナーを設定
    rowsSlider.addEventListener('input', () => {
        updateValueDisplay(rowsSlider, rowsValue);
        updateLevel6Config();
    });
    colsSlider.addEventListener('input', () => {
        updateValueDisplay(colsSlider, colsValue);
        updateLevel6Config();
    });
    minSlider.addEventListener('input', () => {
        if (parseInt(minSlider.value, 10) >= parseInt(maxSlider.value, 10)) {
            minSlider.value = maxSlider.value - 1; // max より小さい値に調整
        }
        updateValueDisplay(minSlider, minValue);
        updateLevel6Config();
    });
    maxSlider.addEventListener('input', () => {
        if (parseInt(maxSlider.value, 10) <= parseInt(minSlider.value, 10)) {
            maxSlider.value = parseInt(minSlider.value, 10) + 1; // min より大きい値に調整
        }
        updateValueDisplay(maxSlider, maxValue);
        updateLevel6Config();
    });
});



let isSliderCheckEnabled = false; // スライダーチェック（初期値は false）未保存。

//スライダーロック
function lockSliders() {
    // レベルが6でない場合は処理を中断
    if (problemState.level !== 6) {
        return;
    }

    // スライダーチェックが無効（true）保存済みの場合は処理を中断
    if (isSliderCheckEnabled) {
        return;
    }

    const sliders = document.querySelectorAll('#customize-level6 input[type="range"]');
    sliders.forEach(slider => {
        slider.disabled = true; // スライダーを無効化
    });
    
    isSliderCheckEnabled = true;

    // スライダーの値を保存
    saveSliderValues();
}


// スライダー値を localStorage に保存する関数
function saveSliderValues() {
    const sliders = document.querySelectorAll('#customize-level6 input[type="range"]');
    const sliderValues = {};

    sliders.forEach(slider => {
        sliderValues[slider.id] = slider.value; // スライダーの値を保存
    });

    localStorage.setItem('customize_level6_sliders', JSON.stringify(sliderValues));
    console.log('スライダーの値を保存しました:', sliderValues);
}



function unlockSliders() {
    const sliders = document.querySelectorAll('#customize-level6 input[type="range"]');
    sliders.forEach(slider => {
        slider.disabled = false; // スライダーを有効化
    });
    isSliderCheckEnabled = false; // スライダーチェックを無効化
    console.log('スライダーチェックがリセットされました');
}


function restoreSliders() {
    const savedSliders = localStorage.getItem('customize_level6_sliders');
    if (savedSliders) {
        const sliderValues = JSON.parse(savedSliders);
        for (const id in sliderValues) {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = sliderValues[id]; // スライダーの値を復元

                // 対応する <span> 要素を更新
                const spanId = `${id.replace('custom-', '')}-value`; // スライダーIDから対応する<span>のIDを生成
                const spanElement = document.getElementById(spanId);
                if (spanElement) {
                    spanElement.textContent = sliderValues[id]; // 値を表示
                }
            }
        }
        console.log('スライダーと対応する値を復元しました:', sliderValues);
    }

    //「レベル6動的生成」から借用。修正の際は、上記とそろえること。
    // スライダーの値を levelConfigs に反映
    const updateLevel6Config = () => {
        const rowsSlider = document.getElementById('custom-rows');
        const colsSlider = document.getElementById('custom-cols');
        const minSlider = document.getElementById('custom-min');
        const maxSlider = document.getElementById('custom-max');

        const rows = parseInt(rowsSlider.value, 10);
        const cols = parseInt(colsSlider.value, 10);
        const min = parseInt(minSlider.value, 10);
        const max = parseInt(maxSlider.value, 10);

        const maxDimension = Math.max(rows, cols);

        // cellWidth, cellHeight, fontSize, position を設定
        let cellWidth, cellHeight, fontSize, position;
        if (maxDimension <= 5) {
            cellWidth = 70;
            cellHeight = 70;
            fontSize = "25px";
            position = { top: '20%', left: '25%' };
        } else if (maxDimension <= 8) {
            cellWidth = 60;
            cellHeight = 45;
            fontSize = "20px";
            position = { top: '13%', left: '15%' };
        } else {
            cellWidth = 41;
            cellHeight = 41;
            fontSize = "18px";
            position = { top: '12%', left: '23%' };
        }

        // levelConfigs のレベル6を更新
        levelConfigs[6] = {
            rows,
            cols,
            min,
            max,
            cellWidth,
            cellHeight,
            fontSize,
            position,
        };

        console.log('レベル6の設定を更新しました:', levelConfigs[6]);
    };

    // 設定を更新して表を生成
    updateLevel6Config();
    createTable(6);
    //setCursorOnFirstCell(); // 初期カーソル位置設定
}


//スクリーンショット
// 音声ファイルを事前にロード
const audio = new Audio('se/complete.mp3');
audio.preload = 'auto'; // 音声を事前に読み込む

// スクリーンショット用のライブラリ（html2canvas）は、使うときだけ読み込む
function loadHtml2canvas() {
    if (window.html2canvas) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function captureScreenshot() {
    try {
        // 音声を再生（タップの直後に鳴らさないと、iPad などでは鳴らないことがある）
        audio.currentTime = 0; // 再生位置をリセット
        audio.play();
        await loadHtml2canvas();
        // キャプチャ対象（画面全体の場合はbodyを指定）
        const targetElement = document.body;

        // html2canvasでスクリーンショットを取得
        const canvas = await html2canvas(targetElement, {
            useCORS: true, // CORSエラーを防ぐ設定
            scale: 2,      // 解像度のスケールを指定（高解像度用）
        });

        // 画像データを取得（例: PNG形式）
        const screenshotData = canvas.toDataURL('image/png');

        // ダウンロード用リンクを生成して画像を保存
        const downloadLink = document.createElement('a');
        downloadLink.href = screenshotData;
        downloadLink.download = `screenshot_${Date.now()}.png`;
        downloadLink.click();

        console.log('Screenshot captured and downloaded.');
    } catch (error) {
        console.error('Error capturing screenshot:', error);
    }
}



// がんばったねパネルを表示する関数
function showCongratsPanel() {
    const panel = document.getElementById('congrats-panel');
    panel.style.display = 'block'; // パネルを表示
}

// がんばったねパネルを閉じる関数
function closeCongratsPanel() {
    const panel = document.getElementById('congrats-panel');
    panel.style.display = 'none'; // パネルを非表示
}

// 「はい」をクリックした場合の処理
document.getElementById('yes-button').addEventListener('click', async () => {
    closeCongratsPanel(); // パネルを閉じる
    await captureScreenshot(); // スクリーンショットを撮る
    gridShowModal(problemState.level); // モーダルを表示
});

// 「いいえ」をクリックした場合の処理
document.getElementById('no-button').addEventListener('click', () => {
    closeCongratsPanel(); // パネルを閉じる
    gridShowModal(problemState.level); // モーダルを表示
});


// ---------- テンキーの入力 ----------

// 現在のセルの入力状態を追跡
let partialInput = ""; // ユーザーの一時的な入力（十の位を保持）

function gridProcessButtonPress(value) {
    if (!problemState.keypadEnabled) {
        return;
    }
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



//百マスのカーソル情報を初期化。
function resetCursor() {
    // 現在のカーソル位置のスタイルをリセット
    const currentCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:nth-child(${currentCellIndex.col + 1})`
    );
    if (currentCell) {
        currentCell.classList.remove('input-target'); // 現在のセルの強調を削除
    }

    // カーソル情報を初期位置に戻す
    currentCellIndex = { row: 1, col: 1 };

    // 初期位置のセルを強調
    const firstCell = document.querySelector(
        `#calculation-grid tr:nth-child(${currentCellIndex.row + 1}) td:nth-child(${currentCellIndex.col + 1})`
    );
    if (firstCell) {
        firstCell.classList.add('input-target'); // 初期位置を強調
    }

    // ラインハイライトをリセット
    resetLineHighlight();
}


// 累積正答数をローカルストレージから取得して初期化する
function initializeCumulativeCorrectCounts() {
    for (let level = 1; level <= currentMode.levelCount; level++) {
        if (!correctAnswerCounts[level]) {
            correctAnswerCounts[level] = getCumulativeCorrectCount(level);
        }
    }
}


ENGINES.grid = {
    screenId: 'hundredgridScreen',
    start: gridStartLevel,
    retry: gridRetryLevel,
    onKey: gridProcessButtonPress,
};
