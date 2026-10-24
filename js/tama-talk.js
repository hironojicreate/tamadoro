// タマのおしゃべり：こするとしゃべる・クリア時のお祝いメッセージ

//タッチエリアの挙動
document.addEventListener('DOMContentLoaded', function() {
    const touchArea = document.getElementById('touchArea');
    const feedback = document.getElementById('feedback');
    let moveCount = 0;
    let isInTouchArea = false; // タッチエリア内かどうかを追跡するフラグ

    touchArea.addEventListener('mouseenter', function(event) {
        if (event.buttons === 1 && !isInTouchArea) { // マウスがクリックされた状態でエリアに入る
            moveCount++;
            isInTouchArea = true;
            updateFeedback();
        }
    });

    touchArea.addEventListener('mouseleave', function(event) {
        isInTouchArea = false; // エリアから出るとフラグをリセット
    });

    // ドキュメント全体にマウスアップイベントを適用
    document.addEventListener('mouseup', function(event) {
        if (isInTouchArea || moveCount > 0) { // エリア内であれば、またはカウントが0より大きい場合
            moveCount = 0; // カウントをリセット
            updateFeedback();
            isInTouchArea = false; // フラグをリセット
        }
    });

    //タッチパッドでの操作
    function isTouchInsideArea(event) {
        const touch = event.touches[0]; // 最初のタッチポイントを取得
        const rect = touchArea.getBoundingClientRect(); // touchAreaの境界を取得
        return touch.clientX >= rect.left && touch.clientX <= rect.right &&
               touch.clientY >= rect.top && touch.clientY <= rect.bottom;
    }

    document.addEventListener('touchmove', function(event) {
        const insideArea = isTouchInsideArea(event);
        if (insideArea && !isInTouchArea) {
            moveCount++; // エリア外からエリア内に入った時だけカウントを増やす
            isInTouchArea = true; // 状態を更新
            updateFeedback();
        } else if (!insideArea) {
            isInTouchArea = false; // タッチがエリア外に出たらフラグをリセット
        }
    });

    document.addEventListener('touchend', function(event) {
        isInTouchArea = false; // タッチ終了時にフラグをリセット
        updateFeedback();
    });


    function updateFeedback() {
        if (moveCount > 500) {
            feedback.textContent = 'たくさん擦りましたね！';
        } else {
            feedback.textContent = `擦った回数: ${moveCount}`;
        }

        // 10回こするごとにしゃべる
        if (moveCount % 10 === 0 && moveCount !== 0) {
            displayCachedMessage(moveCount);
        }
    }

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

//猫にしゃべらせる関数。
function displayComment(areaType, imageSize, text) {

    const area = document.getElementById('commentArea');
    area.innerHTML = '';  // Clear previous content

    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';

    const img = document.createElement('img');
    img.alt = "Speech Bubble";
    img.className = 'bubble-image';
    img.style.width = imageSize; // Optional: If you want to adjust the size dynamically
    img.style.height = imageSize; // Optional: If you want to adjust the size dynamically

    // エリアタイプに応じた画像パスの決定
    switch (areaType) {
        case 'S':
            img.src = '/img/fukidasiS.png';
            bubble.style.top = `${Math.random() * (120 - 50) - 40}px`;  // 60px to 200px
            const horizontalPositionS = 40 + Math.random() * 20; // 40% to 60%
            bubble.style.left = `${horizontalPositionS}%`;
            bubble.style.transform = 'translateX(-50%)'; // 中心を画面中央から指定した%へ移動
            break;
        case 'M':
            img.src = '/img/fukidasiM.png';
            bubble.style.top = `${Math.random() * (110 - 40) - 20}px`;  // 60px to 200px
            const horizontalPositionM = 40 + Math.random() * 20; // 40% to 60%
            bubble.style.left = `${horizontalPositionM}%`;
            bubble.style.transform = 'translateX(-50%)'; // 中心を画面中央から指定した%へ移動
            break;
        case 'L':
            img.src = '/img/fukidasiL.png';
            bubble.style.top = `${Math.random() * (90 - 40) + 10}px`;  // 60px to 200px
            const horizontalPositionL = 40 + Math.random() * 20; // 40% to 60%
            bubble.style.left = `${horizontalPositionL}%`;
            bubble.style.transform = 'translateX(-50%)'; // 中心を画面中央から指定した%へ移動
            break;
    }

    const p = document.createElement('p');
    p.innerHTML = text;
    bubble.appendChild(img);
    bubble.appendChild(p);

    area.appendChild(bubble);
    // 条件によって遅延時間を変更
    const delay = (problemState.lvTenClear || problemState.lvElevenClear) ? 20000 : 3000;

    setTimeout(() => {
        // bubbleがまだareaの子要素であることを確認
        if (bubble.parentNode === area) {  
            bubble.style.opacity = '0'; // フェードアウト開始
            setTimeout(() => {
                // 再度、bubbleがareaの子要素であることを確認してから削除
                if (bubble.parentNode === area) {
                    area.removeChild(bubble);  // DOMからbubbleを削除
                }
            }, 1000); // CSSのtransitionの時間と同じかそれ以上を指定
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
            displayComment(specialMessageLv10.areaType, specialMessageLv10.imageSize, specialMessageLv10.text);
            throwCoin(10, false, 60, 1, problemState.useExistingCoins);
            problemState.lvTenClear = false;  // Stateをリセット
            return;  // 処理をここで終了
        }
    }

    // Level 11がクリアされた場合、ID 26のメッセージを表示
    if (problemState.lvElevenClear) {
        const specialMessageLv11 = messages.find(message => message.ID === "26");
        if (specialMessageLv11) {
            displayComment(specialMessageLv11.areaType, specialMessageLv11.imageSize, specialMessageLv11.text);
            throwCoin(11, false, 90, 1, problemState.useExistingCoins);
            problemState.lvElevenClear = false;  // Stateをリセット
            return;  // 処理をここで終了
        }
    }

    // moveCountが100を超えた場合、ID 20のメッセージを表示
    if (moveCount > 100) {
        const specialMessage = messages.find(message => message.ID === "20");
        if (specialMessage) {
            displayComment(specialMessage.areaType, specialMessage.imageSize, specialMessage.text);
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
        displayComment(selectedMessage.areaType, selectedMessage.imageSize, selectedMessage.text);
    }
}