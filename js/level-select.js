// レベル選択画面のボタンと、rescue モーダルの中身を、モードの定義（js/modes/）からつくる

let isWeakMode = false; // 「にがてちょうせん！」モードかどうか
let lastWeakModeId = null; // 直前に開いていたモードIDを記憶

// 問題（[a, b]）から記録用のキー（「7+6」「5は2と」など）をつくる
function makeProblemKey(def, a, b) {
    return def.style === 'decompose' ? `${a}は${b}と` : `${a}${currentMode.symbol}${b}`;
}

// 指定したレベルの「苦手問題（hp > 0）」のリストを返す
function getWeakPatternsForLevel(level) {
    if (!currentMode || currentMode.engine !== 'drill') return [];
    const def = currentMode.levels[level - 1];
    if (!def || typeof def.patterns !== 'function') return [];

    const patterns = def.patterns();
    const seen = new Set();
    const weakList = [];

    patterns.forEach(([a, b]) => {
        const key = makeProblemKey(def, a, b);
        if (seen.has(key)) return;
        seen.add(key);
        const hp = History.getWeakScore(currentMode.id, key);
        if (hp > 0) {
            weakList.push({ a, b, key, hp, level, style: def.style });
        }
    });

    // 苦手HPが高い順に並べる
    return weakList.sort((x, y) => y.hp - x.hp);
}

// 解放されている全レベルから苦手問題を集める（特訓コース用）
function getAllUnlockedWeakPatterns() {
    if (!currentMode || currentMode.engine !== 'drill') return [];
    const allWeak = [];
    const seen = new Set();
    for (let lv = 1; lv <= currentMode.levels.length; lv++) {
        if (lv === 1 || currentMode.isUnlocked(lv)) {
            const def = currentMode.levels[lv - 1];
            if (def.style !== 'decompose') {
                getWeakPatternsForLevel(lv).forEach(item => {
                    if (!seen.has(item.key)) {
                        seen.add(item.key);
                        allWeak.push(item);
                    }
                });
            }
        }
    }
    return allWeak.sort((x, y) => y.hp - x.hp);
}

// 「にがてちょうせん！」ボタンを押したときの切り替え
function toggleWeakMode(forceState) {
    if (!currentMode || currentMode.engine !== 'drill') {
        isWeakMode = false;
    } else {
        isWeakMode = typeof forceState === 'boolean' ? forceState : !isWeakMode;
    }

    const screen = document.getElementById('openingScreen');
    const toggleBtn = document.getElementById('toggleWeakMode');
    if (screen) {
        screen.classList.toggle('weak-mode-active', isWeakMode);
    }
    if (toggleBtn) {
        toggleBtn.style.display = (currentMode && currentMode.engine === 'drill') ? 'block' : 'none';
        toggleBtn.classList.toggle('active', isWeakMode);
        toggleBtn.textContent = isWeakMode ? '🔥 にがてモードを終わる' : '🔥 にがてちょうせん！';
    }

    updateWeakBadges();
}

// 各レベルボタンの🔥バッジと「特訓コース」ボタンの表示を更新
function updateWeakBadges() {
    if (!currentMode || currentMode.engine !== 'drill') return;

    currentMode.levels.forEach((def, i) => {
        const level = i + 1;
        const btn = document.getElementById(`level${level}`);
        if (!btn) return;

        // 古いバッジがあれば消す
        const oldBadge = btn.querySelector('.weak-badge');
        if (oldBadge) oldBadge.remove();

        const weakCount = getWeakPatternsForLevel(level).length;
        btn.classList.toggle('has-weak', isWeakMode && weakCount > 0);
        btn.classList.toggle('no-weak', isWeakMode && weakCount === 0);

        if (isWeakMode) {
            const badge = document.createElement('span');
            badge.className = 'weak-badge';
            badge.textContent = weakCount > 0 ? `🔥${weakCount}` : '✨';
            btn.appendChild(badge);
        }
    });

    // 特訓コースボタンの表示・更新
    const specialPair = document.getElementById('tamaSpecialPair');
    if (specialPair) {
        const allWeak = getAllUnlockedWeakPatterns();
        specialPair.style.display = isWeakMode ? 'flex' : 'none';
        const specialBtn = document.getElementById('levelSpecial');
        if (specialBtn) {
            specialBtn.innerHTML = allWeak.length > 0
                ? `👑 特訓コース <span class="weak-badge">🔥${allWeak.length}</span>`
                : `👑 特訓コース <span class="weak-badge">✨</span>`;
        }
    }
}

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
            resetTamaTalk();
            const title = (def.title || def.label) + (isWeakMode ? '【🔥にがて】' : '');
            switchLevel(level, title);
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

    // ドリル系モード（たしざん・ひきざん・かけざん）なら「特訓コース」ボタンを追加
    if (currentMode.engine === 'drill') {
        const specialPair = document.createElement('div');
        specialPair.className = 'level-pair special-course-pair';
        specialPair.id = 'tamaSpecialPair';
        specialPair.style.display = isWeakMode ? 'flex' : 'none';

        const specialBtn = document.createElement('button');
        specialBtn.id = 'levelSpecial';
        specialBtn.className = 'special-course-btn';
        specialBtn.textContent = '👑 特訓コース';
        specialBtn.addEventListener('click', () => {
            resetTamaTalk();
            const countText = (typeof WEAK_DECK_STYLE !== 'undefined' && WEAK_DECK_STYLE === 'blend') ? '15もん' : '12もん';
            switchLevel(0, `👑 特訓コース【全レベルから${countText}】`);
        });
        specialPair.appendChild(specialBtn);
        container.appendChild(specialPair);
    }

    const keepWeak = (lastWeakModeId === currentMode.id) ? isWeakMode : false;
    lastWeakModeId = currentMode.id;
    toggleWeakMode(keepWeak);
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
        body += '<div style="margin-top: 8px; margin-bottom: 8px;">';
        body += '<button type="button" onclick="for(let d=1;d<=9;d++){const c=document.getElementById(\'rescueDan\'+d);if(c)c.checked=true;}">すべてチェック（オニ出現）</button>';
        body += '</div>';
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