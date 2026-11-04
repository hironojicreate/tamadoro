// 画面の切り替え
//   #/            さいしょの画面
//   #/add など    そのモードのレベル選択画面（MODES のキー）
//   #/records     タマのきろく（#/records/add のように、はじめに見るモードも指定できる）
//   #/music       おんがくのへや（/music on のときだけ。#/keys などの おんがくのモードも同じ）
//   #/piano       じゆうにひこう（おんがくのへやから。/music on のときだけ）

const HOME_TITLE = document.title;
const SCREENS = ['homeScreen', 'musicScreen', 'pianoScreen', 'openingScreen', 'drillScreen', 'hundredgridScreen', 'keysScreen', 'rhythmScreen', 'keypadScreen', 'recordsScreen'];

function showOnly(screenId) {
    SCREENS.forEach(id => {
        document.getElementById(id).style.display = id === screenId ? 'block' : 'none';
    });
}

// 前の画面で出ていたもの（ドロップ・モーダル・おしゃべり など）を片づける
function closeEverything() {
    const inProblem = document.getElementById('keypadScreen').style.display !== 'none';
    if (currentMode && inProblem && currentMode.onReturnMenu) {
        currentMode.onReturnMenu();
    }
    if (currentMode && currentEngine().stop) {
        currentEngine().stop(); // けんばんなど：鳴っている音・タイマーを止める
    }
    TamaPiano.stop();

    document.querySelectorAll('.coin, .reward-coin').forEach(coin => coin.remove());
    ['completionModal', 'mistakeModal', 'deleteModal', 'rescueModal', 'congrats-panel', 'masterButton'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    closeDataModal();
    ChartTooltip.hide();
    resetTamaTalk();
    document.getElementById('commandInput').value = '';
    document.getElementById('toggleDateButton').textContent = 'ひづけON';
    document.getElementById('helpCheckbox').checked = false;
    document.querySelectorAll('.dot-set').forEach(dotSet => { dotSet.style.display = 'none'; });
}

function openHome() {
    closeEverything();
    currentMode = null;
    problemState = createProblemState();
    document.documentElement.setAttribute('data-mode', 'home');
    document.title = HOME_TITLE;
    showOnly('homeScreen');
}

function openMode(id) {
    closeEverything();
    setMode(id);
    document.title = currentMode.pageTitle;
    // 「タマのきろく」に まだ出さないモード（けんばん）は、「きろく」ボタンも出さない
    document.getElementById('goToRecords').style.display = currentMode.inRecords === false ? 'none' : '';
    renderLevelButtons();
    renderRescueModal();
    document.getElementById('maxMistakes').textContent = currentMode.maxMistakes || '';
    displayAllLevelsCoins();
    unlockLevels();
    showOnly('openingScreen');
    window.scrollTo(0, 0);
}

function openMusic() {
    closeEverything();
    currentMode = null;
    problemState = createProblemState();
    document.documentElement.setAttribute('data-mode', 'music');
    document.title = 'タマの おんがくのへや';
    TamaMusic.renderSoundButton();
    TamaMusic.renderLocks();
    showOnly('musicScreen');
}

function openPiano() {
    closeEverything();
    currentMode = null;
    problemState = createProblemState();
    document.documentElement.setAttribute('data-mode', 'piano');
    document.title = 'タマの じゆうにひこう';
    showOnly('pianoScreen');
    TamaPiano.open(); // 画面が見えてから（けんばんの数は 画面の はばで きまる）
}

function openRecords(tab) {
    const from = currentMode ? `#/${currentMode.id}` : (document.documentElement.dataset.mode === 'records' ? Records.returnTo : '#/');
    closeEverything();
    currentMode = null;
    problemState = createProblemState();
    Records.returnTo = from;
    document.documentElement.setAttribute('data-mode', 'records');
    document.title = 'タマのきろく';
    showOnly('recordsScreen');
    Records.open(tab);
}

function route() {
    const [id, sub] = location.hash.replace(/^#\/?/, '').split('/');
    // おんがくの画面は、ためしているあいだ「/music on」のときだけ開ける
    const music = id === 'music' || id === 'piano' || (MODES[id] && MODES[id].music);
    if (music && !TamaMusic.enabled()) {
        openHome();
        return;
    }
    TamaSound.musicSession(music); // おんがくの画面では、iPhone のマナーモードでも 音を出す
    // まだ ひらいていない おんがくのモード（くろいけんばん）は、おんがくのへやへ
    if (MODES[id] && MODES[id].locked && MODES[id].locked()) {
        location.hash = '#/music';
        return;
    }
    if (id === 'music') {
        openMusic();
    } else if (id === 'piano') {
        openPiano();
    } else if (MODES[id]) {
        openMode(id);
    } else if (id === 'records') {
        openRecords(sub);
    } else {
        openHome();
    }
}

History.migrate(); // 記録をはじめる前のドロップを取りこむ（1回だけ）
window.addEventListener('hashchange', route);
route();
