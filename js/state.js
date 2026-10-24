// いま遊んでいるモードと、問題の状態
// （モードの定義は js/modes/、問題の進め方は js/engines/）

let currentMode = null;      // MODES.add など
let problemState = createProblemState();

// 問題の進め方（エンジン）。各エンジンのファイルが登録する
//   start(level)  レベルを始める
//   retry()       同じレベルをもういちど
//   onKey(value)  テンキーの入力
//   screenId      問題画面の要素ID
const ENGINES = {};

function createProblemState() {
    return {
        level: 1,
        answer: 0,               // いまの問題の答え
        tens: 0,                 // 答えの十の位（0 なら1けた）
        keypadEnabled: true,
        patterns: [],            // このレベルの問題 [a, b] の一覧
        solved: [],              // 出した問題
        currentProblem: { a: null, b: null },
        correctStreak: 0,        // ノーミスで正解した数
        mistakeMade: false,      // いまの問題で間違えたか
        mistakeCount: 0,
        mistakes: [],            // 間違いリスト（ミスモーダル用）
        remainingQuestions: 0,
        howManyOriginalProblems: 0,
        lvTenClear: false,       // ノーミスでクリアしたときのお祝いフラグ（おしゃべりで使う）
        lvElevenClear: false,
        useExistingCoins: 0,
        levelToImage: {},        // レベル → ドロップの画像
    };
}

// モードを切り替える
function setMode(id) {
    const mode = MODES[id];
    mode.levelCount = mode.levels.length;
    if (!mode.isUnlocked) {
        // ふつうは、1つ前のレベルのドロップが coinsToUnlock 個あれば解放
        mode.isUnlocked = level => TamaStore.getCoins(level - 1).length >= mode.coinsToUnlock(level);
    }
    currentMode = mode;

    problemState = createProblemState();
    mode.levels.forEach((level, i) => {
        problemState.levelToImage[i + 1] = dropImage(level.drop);
    });

    document.body.setAttribute('data-mode', id);
}

// いまのモードのエンジン
function currentEngine() {
    return ENGINES[currentMode.engine];
}
