// タマのおしゃべり：こするとしゃべる・クリア時のお祝いメッセージ

// くろねこ（#touchArea）をこすると、しゃべる
//   マウスでも指でも同じ。押したまま（さわったまま）動かした長さで「こすった回数」を数える
//   RUB_LENGTH 動かすと1回。10回ごとにしゃべる（100回をこえると「そろそろもんだいに…」）
const RUB_LENGTH = 40; // px

document.addEventListener('DOMContentLoaded', function () {
    const touchArea = document.getElementById('touchArea');
    let rubCount = 0;
    let distance = 0;
    let last = null;

    touchArea.addEventListener('pointerdown', event => {
        last = { x: event.clientX, y: event.clientY };
        touchArea.setPointerCapture(event.pointerId); // ねこの外に出ても、こすりつづけられる
    });

    touchArea.addEventListener('pointermove', event => {
        if (!last) return;
        distance += Math.hypot(event.clientX - last.x, event.clientY - last.y);
        last = { x: event.clientX, y: event.clientY };
        while (distance >= RUB_LENGTH) {
            distance -= RUB_LENGTH;
            rubCount++;
            if (rubCount % 10 === 0) {
                displayCachedMessage(rubCount);
            }
        }
    });

    const stop = () => { last = null; };
    touchArea.addEventListener('pointerup', stop);
    touchArea.addEventListener('pointercancel', stop);
});


// JSONファイルを読み込む関数
let cachedMessages = null; // メッセージのキャッシュ用変数

async function loadMessages() {
    if (!cachedMessages) { // キャッシュがなければ読み込む
        const response = await fetch('tashizan_message.json');
        cachedMessages = await response.json();
    }
    return cachedMessages;
}

// タマの吹き出し（形は CSS の .speech-bubble）
//   message.areaType：S 短い / M ふつう / L 長いメッセージ（長いほど少し下に出す）
//   吹き出しの中心が、たてはこの範囲（px）、よこは画面の 40%～60% のどこかに来る
const BUBBLE_CENTER_Y = { S: [110, 180], M: [130, 200], L: [160, 210] };

function displayComment(message) {
    const area = document.getElementById('commentArea');
    area.innerHTML = '';  // 前の吹き出しを消す

    const [minY, maxY] = BUBBLE_CENTER_Y[message.areaType] || BUBBLE_CENTER_Y.M;
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.style.top = `${minY + Math.random() * (maxY - minY)}px`;
    bubble.style.left = `${40 + Math.random() * 20}%`;

    const p = document.createElement('p');
    p.innerHTML = message.text;
    bubble.appendChild(p);
    area.appendChild(bubble);

    // お祝いのメッセージは長めに出しておく
    const delay = (problemState.lvTenClear || problemState.lvElevenClear) ? 20000 : 3000;
    setTimeout(() => {
        if (bubble.parentNode === area) {
            bubble.style.opacity = '0'; // フェードアウト
            setTimeout(() => bubble.remove(), 1000);
        }
    }, delay);
}



// ボタンクリックでJSONを読み込み、メッセージを表示
let lastSelectedId = null; // 最後に選択されたメッセージのIDを保持

async function displayCachedMessage(moveCount) {
    const messages = await loadMessages();  // キャッシュまたは読み込みからメッセージを取得

    // Level 10がクリアされた場合、ID 25のメッセージを表示
    if (problemState.lvTenClear) {
        const specialMessageLv10 = messages.find(message => message.ID === "25");
        if (specialMessageLv10) {
            displayComment(specialMessageLv10);
            throwCoin(10, false, 60, 1, problemState.useExistingCoins);
            problemState.lvTenClear = false;  // Stateをリセット
            return;  // 処理をここで終了
        }
    }

    // Level 11がクリアされた場合、ID 26のメッセージを表示
    if (problemState.lvElevenClear) {
        const specialMessageLv11 = messages.find(message => message.ID === "26");
        if (specialMessageLv11) {
            displayComment(specialMessageLv11);
            throwCoin(11, false, 90, 1, problemState.useExistingCoins);
            problemState.lvElevenClear = false;  // Stateをリセット
            return;  // 処理をここで終了
        }
    }

    // moveCountが100を超えた場合、ID 20のメッセージを表示
    if (moveCount > 100) {
        const specialMessage = messages.find(message => message.ID === "20");
        if (specialMessage) {
            displayComment(specialMessage);
            return; // 処理をここで終了
        }
    }

    const totalFrequency = messages.reduce((acc, message) => acc + parseInt(message.frequency, 10), 0);
    let selectedMessage = null;
    while (!selectedMessage) {
        messages.forEach(message => {
            if (lastSelectedId === message.ID) {
                return; // 最後に選択されたIDと同じならスキップ
            }
            const frequency = parseInt(message.frequency, 10);
            const selectionProbability = frequency / totalFrequency;

            if (Math.random() < selectionProbability) {
                if (!selectedMessage || Math.random() < 0.5) { // 確率的に選ぶ
                    selectedMessage = message;
                }
            }
        });
    }

    if (selectedMessage) {
        lastSelectedId = selectedMessage.ID; // 選択されたメッセージのIDを記録
        displayComment(selectedMessage);
    }
}