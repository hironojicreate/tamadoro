// テンキー（画面のボタン・タッチ・パソコンの数字キー）
// 押された数字は、いまのモードのエンジン（js/engines/）に渡す

// テンキーを画面の右下に置く
function adjustKeypadPosition() {
    document.querySelector('.keypad').style.bottom = '5px';
}

window.addEventListener('resize', adjustKeypadPosition);
window.addEventListener('orientationchange', adjustKeypadPosition);
window.addEventListener('load', adjustKeypadPosition);


// ---------- 押したときの音 ----------

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// スマホ・タブレットでは、最初にさわったときに音を使えるようにする
document.body.addEventListener('touchend', function () {
    audioContext.resume();
}, { once: true });

let soundBuffer = null;
fetch('/se/seSelect.mp3')
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(decodedAudio => {
        soundBuffer = decodedAudio;
    });

function playSound() {
    if (!soundBuffer) {
        return; // まだ読み込み中
    }
    const source = audioContext.createBufferSource();
    source.buffer = soundBuffer;
    source.connect(audioContext.destination);
    source.start(0);
}


// ---------- 入力 ----------

function handleButtonPress(button) {
    // 問題画面（テンキー）が表示されていないときは、物理キーボードの入力も受け付けない
    if (document.getElementById('keypadScreen').style.display === 'none') {
        return;
    }
    playSound();
    currentEngine().onKey(button.getAttribute('data-value'));
}

function toggleKeypad(enabled) {
    problemState.keypadEnabled = enabled;
    document.querySelectorAll('#keypadScreen .num').forEach(button => {
        button.disabled = !enabled;
    });
}

// キーの数字を字形（js/glyphs.js）で描く
document.querySelectorAll('.num').forEach(button => {
    const value = button.getAttribute('data-value');
    button.setAttribute('aria-label', value);
    button.querySelector('.key-digit').innerHTML = glyphSVG(value);
});

//タッチパッド、マウス
document.querySelectorAll('.num').forEach(button => {
    let touchActive = false; // タッチのあとに来る click を無視するためのフラグ

    button.addEventListener('touchstart', function (event) {
        touchActive = true;
        activateButtonVisual(this);
        handleButtonPress(this);
        event.preventDefault(); // デフォルトのクリックイベントを防止
    }, { passive: false });

    button.addEventListener('touchend', function () {
        deactivateButtonVisual(this);
        setTimeout(() => {
            touchActive = false;
        }, 100);
    }, { passive: true });

    button.addEventListener('click', function () {
        if (!touchActive) {
            activateButtonVisual(this);
            handleButtonPress(this);
            deactivateButtonVisual(this);
        }
        this.blur();
    });
});

//パソコンの数字キー
document.addEventListener('keydown', function (event) {
    const key = event.key;
    if (key >= '0' && key <= '9') {
        const button = document.querySelector(`button[data-value="${key}"]`);
        if (button) {
            activateButtonVisual(button);
            handleButtonPress(button);
        }
    }
});

document.addEventListener('keyup', function (event) {
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


// ---------- マスターボタン（おとな用：答えを自動で入れる） ----------

let isMasterButtonCooldown = false;

function pressMasterButton() {
    if (isMasterButtonCooldown) {
        return;
    }
    isMasterButtonCooldown = true;

    const answer = problemState.answer;
    if (answer < 10) {
        currentEngine().onKey(answer.toString());
    } else {
        currentEngine().onKey(Math.floor(answer / 10).toString());
        setTimeout(() => {
            currentEngine().onKey((answer % 10).toString());
        }, 100);
    }

    setTimeout(() => {
        isMasterButtonCooldown = false;
    }, 200);
}
