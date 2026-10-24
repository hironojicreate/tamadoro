// レベル選択画面のボタンと、rescue モーダルの中身を、モードの定義（js/modes/）からつくる

function renderLevelButtons() {
    const container = document.querySelector('.select-level-buttons');
    container.innerHTML = '';

    currentMode.levels.forEach((def, i) => {
        const level = i + 1;

        const pair = document.createElement('div');
        pair.className = 'level-pair';

        // lockN：解放されるまで隠しておく（解放の判定は js/menu.js の unlockLevels）
        const lock = document.createElement('div');
        lock.id = `lock${level}`;
        if (level > 1) {
            lock.style.display = 'none';
        }

        const button = document.createElement('button');
        button.id = `level${level}`;
        button.textContent = def.label;
        button.addEventListener('click', () => {
            resetTamaTalk(); // 問題に入るタイミングでこすりカウントを初期化
            switchLevel(level, def.title || def.label);
        });
        lock.appendChild(button);

        const coins = document.createElement('div');
        coins.id = `coins${level}`;
        coins.className = 'coin-container';
        lock.appendChild(coins);

        if (def.comment) {
            const comment = document.createElement('div');
            comment.className = 'comment';
            comment.textContent = def.comment;
            lock.appendChild(comment);
        }

        pair.appendChild(lock);
        container.appendChild(pair);
    });
}


// rescue：スライダーで「Lv○まで」を選ぶ（かけざんは、段をチェックで選ぶ）
function renderRescueModal() {
    const modal = document.getElementById('rescueModal');
    const rescue = currentMode.rescue;

    let body = '<p>どの問題まで解放させますか？</p>';
    if (rescue.type === 'dan') {
        for (let row = 0; row < 3; row++) {
            body += '<div>';
            for (let dan = row * 3 + 1; dan <= row * 3 + 3; dan++) {
                body += `<label><input type="checkbox" id="rescueDan${dan}" value="${dan}"> ${dan}の段</label>\n`;
            }
            body += '</div>';
        }
        body += '<button onclick="restoreLevels()">このレベルを復元</button>';
    } else {
        body += `<input type="range" min="2" max="${rescue.max}" value="2" id="levelSlider" oninput="updateSliderValue(this.value)">
            <span id="sliderValue">Lv2</span>
            <button onclick="restoreLevels()">このレベルまで復元</button>`;
    }
    body += '<button onclick="rescueCloseModal()">閉じる</button>';

    modal.innerHTML = body;
    modal.style.zIndex = rescue.type === 'dan' ? '9999' : '5';
}
