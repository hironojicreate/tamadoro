
function adjustKeypadPosition() {
  const keypad = document.querySelector('.keypad');
  keypad.style.bottom = '5px';
}

window.addEventListener('resize', adjustKeypadPosition);
window.addEventListener('orientationchange', adjustKeypadPosition);
window.addEventListener('load', adjustKeypadPosition);

// 画面遷移
function switchLevel(level, title) {

    // 指定されたレベルで問題を開始
    startLevel(level);
    // キーパッドスクリーンを表示
    document.getElementById('keypadScreen').style.display = 'block';
    // 足し算スクリーンを表示
    document.getElementById('additionScreen').style.display = 'block';
    // オープニングスクリーンを非表示
    document.getElementById('openingScreen').style.display = 'none';
    // タイトルを更新
    document.getElementById('pageTitle').textContent = title;
}

function returnMenu() {
    scatterCoins(); // コインを散らばせる新しい関数を呼び出す
    clearCoinsOnDOM();
    displayAllLevelsCoins();
    unlockLevels();
    // キーパッドスクリーンを非表示
    document.getElementById('keypadScreen').style.display = 'none';
    // 足し算スクリーンを非表示
    document.getElementById('additionScreen').style.display = 'none';
    // オープニングスクリーンを表示
    document.getElementById('openingScreen').style.display = 'block';
}

//coinが飛び散ります。
function scatterCoins() {
    var coins = document.querySelectorAll('.coin');
    coins.forEach(function(coin) {
        // ランダムな水平方向（X軸）の移動を計算
        const randomX = (Math.random() - 0.5) * 700; // -350vw から +350vw の範囲でランダム
        // ランダムな垂直方向（Y軸）の移動を計算（上または下）
        const randomY = (Math.random() - 0.5) * 700; // -350vh から +350vh の範囲でランダム

        // アニメーションをJavaScriptで動的に定義
        coin.animate([
            { transform: 'translate(0, 0)' }, // 開始位置
            { transform: `translate(${randomX}vw, ${randomY}vh)` } // ランダムな位置に移動
        ], {
            duration: 2000, // アニメーションの時間
            easing: 'ease-out', // アニメーションの速度曲線
            delay: Math.random() * 700 // 0から700ミリ秒の間でランダムな遅延
        }).finished.then(() => {
            // アニメーションが完了したらコインをDOMから削除
            if (coin.parentNode) {
                coin.parentNode.removeChild(coin);
            }
        });
    });
}



// ウィンドウサイズが変更されたときに高さを更新
window.addEventListener('resize', function() {
    windowHeight = window.innerHeight; // ウィンドウサイズが変更されたときに高さを更新
});
/*
function throwCoin(level, special = false, coinSize = 50, howManyCoins = 1) {
    // 複数のコインを指定された数だけ投げる
    for (let i = 0; i < howManyCoins; i++) {
        setTimeout(() => {
            const coin = document.createElement('img');
            coin.src = special ? '/img/Gmaru.png' : problemState.levelToImage[level];
            coin.className = 'coin';
            coin.style.width = `${coinSize}px`;
            coin.style.height = `${coinSize}px`;
            document.body.appendChild(coin);

            const startX = Math.random() * (window.innerWidth / 1.38);
            coin.style.left = `${startX}px`;
            coin.style.top = `0px`;

            let velocityX = (window.innerWidth / 4 - startX) / 10;
            let velocityY = 0;

            // 各コインにアニメーションを適用
            animateCoin(coin, velocityX, velocityY);
        }, i * 100);  // i * 100ミリ秒の遅延を加える
    }
}
*/

// 外部関数としてアニメーションのロジックを定義
function throwCoin(level, special = false, coinSize = 50, howManyCoins = 1, useExistingCoins = 0) {
    //console.log("useExistingCoins の値: ", useExistingCoins); // useExistingCoins の値をログに出力

    // useExistingCoinsが、10または11の時に実行
    if (useExistingCoins === 10 || useExistingCoins === 11) {
        const existingCoins = document.querySelectorAll('.main-reward-coin');
        //console.log("'.main-reward-coin' クラスを持つ画像の数: ", existingCoins.length); // 既存のコインの数をログに出力

        existingCoins.forEach((coin, index) => {
            //console.log(`${index}番目のコインのソース: `, coin.src); // 各コインのソースをログに出力
            setTimeout(() => {
                const newCoin = document.createElement('img');
                newCoin.src = coin.src;  // 既存のコインの画像を使用
                newCoin.className = 'coin';
                newCoin.style.width = `${coinSize}px`;
                newCoin.style.height = `${coinSize}px`;
                document.body.appendChild(newCoin);

                const startX = Math.random() * (window.innerWidth / 1.38);
                newCoin.style.left = `${startX}px`;
                newCoin.style.top = `0px`;

                let velocityX = (window.innerWidth / 4 - startX) / 10;
                let velocityY = 0;

                animateCoin(newCoin, velocityX, velocityY);
            }, index * 100);  // 少し遅延を加えて投げる
        });
        problemState.useExistingCoins = 0; // useExistingCoins をリセット
        return;
    }

    // useExistingCoinsが10または11以外の時に実行
    if (useExistingCoins !== 10 && useExistingCoins !== 11) {
        // 新たなコインを投げる
        for (let i = 0; i < howManyCoins; i++) {
            setTimeout(() => {
                const coin = document.createElement('img');
                coin.src = special ? '/img/Gmaru.png' : problemState.levelToImage[level];
                coin.className = 'coin';
                coin.style.width = `${coinSize}px`;
                coin.style.height = `${coinSize}px`;
                document.body.appendChild(coin);

                const startX = Math.random() * (window.innerWidth / 1.38);
                coin.style.left = `${startX}px`;
                coin.style.top = `0px`;

                let velocityX = (window.innerWidth / 4 - startX) / 10;
                let velocityY = 0;

                animateCoin(coin, velocityX, velocityY);
            }, i * 100);  // i * 100ミリ秒の遅延を加える
        }
    }
}


function animateCoin(coin, initialVelocityX, initialVelocityY) {
    let currentLeft = parseFloat(coin.style.left);
    let currentTop = parseFloat(coin.style.top);
    let velocityX = initialVelocityX;
    let velocityY = initialVelocityY;
    const gravity = 3;
    let hasBounced = false;

    function frame() {
        velocityY += gravity;
        currentLeft += velocityX;
        currentTop += velocityY;

        coin.style.left = `${currentLeft}px`;
        coin.style.top = `${currentTop}px`;

        if (currentLeft >= window.innerWidth * 0.7) {
            coin.style.animation = 'none';
            coin.style.transform = `rotate(${Math.random() * 360}deg)`;
            enableDrag(coin);
            cancelAnimationFrame(requestId);
            return;
        }

        const bounceThreshold = window.innerHeight * 0.95 - coin.offsetHeight;
        if (currentTop >= bounceThreshold && !hasBounced) {
            velocityY *= -0.7;
            velocityX += (Math.random() - 1.5) * 2;
            hasBounced = true;
        } else if (hasBounced) {
            if (currentTop >= window.innerHeight * 0.1 && currentTop <= window.innerHeight * 0.9) {
                if (Math.random() < 0.21) {
                    coin.style.animation = 'none';
                    coin.style.transform = `rotate(${Math.random() * 360}deg)`;
                    enableDrag(coin);
                    return;
                }
            }
        }

        if (currentTop > window.innerHeight || currentLeft < 0 || currentLeft > window.innerWidth) {
            if (currentLeft < 0 || currentLeft > window.innerWidth) {
                velocityX *= -1;
            }
            if (currentTop > window.innerHeight) {
                velocityY *= -0.7;
            }
        }

        requestId = requestAnimationFrame(frame);
    }

    var requestId = requestAnimationFrame(frame);
}


//コインのドラッグアンドドロップ処理
function enableDrag(coin) {
    let offsetX = 0;
    let offsetY = 0;

    function startDrag(event) {
        event.preventDefault(); // ブラウザのデフォルト動作を抑制

        let clientX = event.clientX || event.touches[0].clientX;
        let clientY = event.clientY || event.touches[0].clientY;

        offsetX = clientX - coin.getBoundingClientRect().left;
        offsetY = clientY - coin.getBoundingClientRect().top;

        function onMove(eventMove) {
            let moveX = eventMove.clientX || eventMove.touches[0].clientX;
            let moveY = eventMove.clientY || eventMove.touches[0].clientY;

            coin.style.left = `${moveX - offsetX}px`;
            coin.style.top = `${moveY - offsetY}px`;
        }

        function endDrag() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', endDrag);
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    coin.addEventListener('mousedown', startDrag);
    coin.addEventListener('touchstart', startDrag, { passive: false });
}


//ご褒美コイン生成
function createRewardCoin(level) {
    const existingCoins = document.querySelectorAll('.reward-coin');
    const offset = existingCoins.length * 50;  // 新しいコインは前のコインの左に50pxずつずれます。

    // ご褒美コインの生成
    const rewardCoin = document.createElement('img');
    if (problemState.mistakeCount === 0) {
        rewardCoin.src = '/img/Gmaru.png';
    } else {
        rewardCoin.src = problemState.levelToImage[level];
    }
    rewardCoin.className = 'reward-coin';
    rewardCoin.style.position = 'fixed';
    rewardCoin.style.top = '50%';  // 中央に配置
    rewardCoin.style.left = '50%';
    rewardCoin.style.transform = 'translate(-50%, -50%) scale(2.67)';  // 300pxから800pxに拡大
    rewardCoin.style.opacity = '0';  // 初期状態は透明
    rewardCoin.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';  // トランジションを設定
    document.body.appendChild(rewardCoin);

    // コイン情報をオブジェクトとして保存
    const coinImage = problemState.mistakeCount === 0 ? '/img/Gmaru.png' : problemState.levelToImage[level];

    // 日本時間を取得
    const now = new Date();
    const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dateStr = `${jstNow.getMonth() + 1}/${jstNow.getDate()}`;

    const coinInfo = {
        level: level,
        order: existingCoins.length + 1,
        image: coinImage,
        date: dateStr // 日付を追加
    };

    // ローカルストレージにコイン情報を保存
    saveCoinInfo(level, coinInfo);

    // アニメーションでコインを表示
    setTimeout(() => {
        rewardCoin.style.opacity = '1';  // 透明度を1に設定
        rewardCoin.style.transform = 'translate(-50%, -50%) scale(0.167)';  // 50pxサイズに縮小
        setTimeout(() => {
            // コインを右上に移動
            const finalRight = 35 + offset;  // 最終的な右の位置
            rewardCoin.style.transition = 'top 0.5s ease-out, left 0.5s ease-out';  // トップとレフトのみトランジション
            rewardCoin.style.top = '60px';
            rewardCoin.style.left = `calc(100% - ${finalRight}px)`;
        }, 500);  // 0.5秒後に最終位置へ移動
    }, 10);  // 少し遅延して拡大アニメーションを開始
}



// コイン情報をローカルストレージに保存する関数
function saveCoinInfo(level, coinInfo) {
    let coins = JSON.parse(localStorage.getItem(`add_coins_${level}`)) || [];
    coins.push(coinInfo); // 新しいコイン情報を追加
    if (coins.length > 10) { // コインの数が10を超えたら
        coins = coins.slice(-10); // 最新の10個のみを保持
    }
    localStorage.setItem(`add_coins_${level}`, JSON.stringify(coins)); // 更新された配列を保存
    // ローカルストレージに保存した後のコイン情報をコンソールに表示
    console.log(`Saved coin info for level ${level}:`, coinInfo);
    console.log(`All coins for level ${level}:`, coins);
}



// ページ遷移やレベル変更時に呼ばれる関数
function clearCoinsOnDOM() {
    document.querySelectorAll('.reward-coin').forEach(coin => coin.remove());
}


//コインの再現
function createRewardCoinFromInfo(coinInfo) {
    const rewardCoin = document.createElement('img');
    rewardCoin.src = coinInfo.image;
    rewardCoin.className = 'reward-coin';
    rewardCoin.style.position = 'fixed';
    rewardCoin.style.width = '50px';  // コインのサイズを50pxに設定
    rewardCoin.style.height = '50px';  // コインの高さも50pxに設定

    // 既存のコインの数に基づいて右のオフセットを計算
    const existingCoins = document.querySelectorAll('.reward-coin').length;
    const rightOffset = 10 + existingCoins * 50;  // それぞれのコインを50pxずつずらす

    rewardCoin.style.top = '35px';
    rewardCoin.style.right = `${rightOffset}px`;

    document.body.appendChild(rewardCoin);

    // コインに日付をデータ属性として追加
    rewardCoin.setAttribute('data-date', coinInfo.date);

    // タップ時にメッセージを表示/非表示にするイベントリスナーを追加
    //rewardCoin.addEventListener('click', toggleMessageDisplay);
}


function restoreCoins(level) {
    let coins = JSON.parse(localStorage.getItem(`add_coins_${level}`)) || [];
    console.log(`Restoring coins for level ${level}:`, coins);

    coins.forEach(coinInfo => {
        console.log(`Restoring coin: Level ${level}, Image ${coinInfo.image}, Order ${coinInfo.order}, Date ${coinInfo.date}`);
        createRewardCoinFromInfo(coinInfo);
    });
}



//メイン画面にコインを表示
function displayAllLevelsCoins() {
    for (let level = 1; level <= 11; level++) {
        displayLatestCoins(level, `coins${level}`);
    }
}

function displayLatestCoins(level, containerId, limit = 5) {
    const coinsData = JSON.parse(localStorage.getItem(`add_coins_${level}`)) || [];
    const container = document.getElementById(containerId);

    // コンテナをクリアする
    container.innerHTML = '';
    container.style.display = 'flex'; // 横並びにするためにフレックスボックスを使用
    container.style.flexWrap = 'wrap'; // コインが多い場合に折り返すようにする

    // 最新のコインから5つ取得
    const latestCoins = coinsData.slice(-limit).reverse();

    latestCoins.forEach(coin => {
        const coinWrapper = document.createElement('div');
        coinWrapper.style.position = 'relative'; // 相対位置を設定してメッセージの位置を調整
        coinWrapper.style.marginRight = '3px'; // コイン間の余白を設定
        coinWrapper.style.display = 'inline-block'; // 横並びにするためにインラインブロックを使用

        const img = document.createElement('img');
        img.src = coin.image;
        img.className = 'main-reward-coin'; // 再利用可能なクラスを追加
        img.style.width = '25px';
        img.style.height = '25px';  // サイズ設定
        img.setAttribute('data-level', level);
        img.setAttribute('data-order', coin.order);
        img.setAttribute('data-date', coin.date); // 日付をデータ属性として追加

        // タップ時にメッセージを表示/非表示にするイベントリスナーを追加
        img.addEventListener('click', toggleMessageDisplay);

        coinWrapper.appendChild(img);
        container.appendChild(coinWrapper);
    });

    if (latestCoins.length === 0) {
        container.textContent = 'ドロップをゲットしよう！';
    }
}



// コインメッセージ表示
function toggleMessageDisplay(event) {
    const coin = event.target;
    const coinWrapper = coin.parentElement;
    //console.log('Clicked coin:', coin);
    //console.log('Coin data-date:', coin.getAttribute('data-date'));

    const existingMessageDiv = coinWrapper.querySelector('.message-div');

    if (existingMessageDiv) {
        existingMessageDiv.remove();
    } else {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-div';
        messageDiv.style.position = 'absolute';
        messageDiv.style.zIndex = '1';
        messageDiv.style.pointerEvents = 'none';
        messageDiv.style.backgroundColor = '#FFFDD0';
        messageDiv.style.color = 'black';
        messageDiv.style.padding = '1px';
        messageDiv.style.fontSize = '9px';
        messageDiv.style.border = '1px solid lightblue';
        messageDiv.style.borderRadius = '9px';
        messageDiv.style.display = 'inline';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.whiteSpace = 'nowrap';
        
        // 日付がnullまたはundefined、またはスラッシュが含まれていない場合は「ﾜｽﾚﾀ」と表示
        let dateText = coin.getAttribute('data-date');
        if (!dateText || dateText === "null" || dateText === "undefined" || !dateText.includes('/')) {
            dateText = 'ﾜｽﾚﾀ';
        } else {
            // ランダムに特定のメッセージを設定
            const randomNum = Math.random() * 1000;  // 0から999のランダムな数を生成
            if (randomNum < 1) {
                dateText = 'ｶﾝﾍﾟｷ';  // 1000回に1回の割合
            } else if (randomNum < 11) {
                dateText = 'ｽﾃｷ';  // 100回に1回の割合
            } else if (randomNum < 31) {
                dateText = 'ｲｲ';  // 50回に1回の割合
            }
        }
        messageDiv.textContent = `${dateText}ﾆｬ`; // 日付と文字列を表示

        coinWrapper.appendChild(messageDiv);

        const coinRect = coin.getBoundingClientRect();
        const messageRect = messageDiv.getBoundingClientRect();
        const offset = -2;

        const wrapperRect = coinWrapper.getBoundingClientRect();

        messageDiv.style.left = `${coinRect.left - wrapperRect.left + coinRect.width / 2 - messageRect.width / 2}px`;
        messageDiv.style.top = `${coinRect.top - wrapperRect.top - messageRect.height - offset}px`;
    }
}

//日付AllOnOff
document.getElementById('toggleDateButton').addEventListener('click', function() {
    const button = this;
    const coins = document.querySelectorAll('.main-reward-coin');

    if (button.textContent === "ひづけON") {
        coins.forEach(coin => {
            // 日付が表示されていない場合、表示する
            if (!coin.nextElementSibling || !coin.nextElementSibling.classList.contains('message-div')) {
                const event = new Event('click');
                coin.dispatchEvent(event);
            }
        });
        button.textContent = "ひづけOFF";
    } else {
        coins.forEach(coin => {
            // 日付が表示されている場合、非表示にする
            if (coin.nextElementSibling && coin.nextElementSibling.classList.contains('message-div')) {
                const event = new Event('click');
                coin.dispatchEvent(event);
            }
        });
        button.textContent = "ひづけON";
    }
});


// ページの読み込み時や特定のイベントが発生した際に呼び出す
document.addEventListener('DOMContentLoaded', displayAllLevelsCoins);


document.addEventListener('DOMContentLoaded', function() {
    // ページ読み込み時に実行
    const coinImages = document.querySelectorAll('.main-reward-coin');
    coinImages.forEach(coin => {
        coin.addEventListener('click', toggleMessageDisplay);
    });
});

//deleteモーダル
/*
const activeKeys = new Set();

document.addEventListener('keydown', function(event) {
    // キーを追加
    activeKeys.add(event.key.toLowerCase());  // 小文字に統一して追加

    // Ctrl、Alt、Cキー、Lキーが同時に押されたかを確認
    if (activeKeys.has('control') && activeKeys.has('alt') && activeKeys.has('c') && activeKeys.has('l')) {
        document.getElementById('deleteModal').style.display = 'flex'; // モーダルを表示
    }
});

document.addEventListener('keyup', function(event) {
    // キーを削除
    activeKeys.delete(event.key.toLowerCase());  // 小文字に統一して削除
});
*/

function deleteData() {
    //localStorage.clear();
    for (let level = 1; level <= 11; level++) { // 例えばレベル1から11までの場合
        localStorage.removeItem(`add_coins_${level}`);
        console.log(`Deleted add_coins_${level} from localStorage`);
    }
    closeModal();
    showNotification("足し算のデータを消去しました");
    returnMenu();
}

function closeModal() {
    document.getElementById('deleteModal').style.display = 'none';
}


function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.opacity = 1;
    setTimeout(() => {
        notification.style.opacity = 0;
    }, 2000);
}


//unlock機能
function unlockLevels() {
    for (let level = 2; level <= 11; level++) {
        const previousLevel = level - 1;
        const previousLevelCoinsData = JSON.parse(localStorage.getItem(`add_coins_${previousLevel}`)) || [];
        const lockDiv = document.getElementById(`lock${level}`);

        if (lockDiv) {
            let coinsNeeded = 3;  // デフォルトでは3個のコインが必要
            if (level === 11) {   // Lv11の場合のみ、5個のコインが必要
                coinsNeeded = 5;
            }

            // 前のレベルのコインが必要数以上ある場合、現在のレベルのロックを解除し、表示する
            if (previousLevelCoinsData.length >= coinsNeeded) {
                lockDiv.style.display = 'block';
            } else {
                // 必要なコイン数に満たない場合、現在のレベルを非表示にする
                lockDiv.style.display = 'none';
            }
        }
    }
}



document.addEventListener('DOMContentLoaded', unlockLevels);


//データの保存と読み込み
//document.getElementById('openModal').addEventListener('click', function() {
//    document.getElementById('modalOverlay').style.display = 'block';
//});
//モーダル操作
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('dataModalOverlay');

    overlay.addEventListener('click', function() {
        closeDataModal();
    });
});

function closeDataModal() {
    document.getElementById('dataModal').style.display = 'none';
    document.getElementById('dataModalOverlay').style.display = 'none';
}

function openDataModal() {
    document.getElementById('dataModal').style.display = 'block';
    document.getElementById('dataModalOverlay').style.display = 'block';
}


document.getElementById('exportData').addEventListener('click', function() {
    const data = JSON.stringify(localStorage);
    const blob = new Blob([data], { type: 'text/plain' });

    // 現在の日時を取得してファイル名に組み込む
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月を2桁で表示
    const day = date.getDate().toString().padStart(2, '0'); // 日を2桁で表示
    const hour = date.getHours().toString().padStart(2, '0'); // 時を2桁で表示
    const minute = date.getMinutes().toString().padStart(2, '0'); // 分を2桁で表示

    const timestamp = `${month}${day}${hour}${minute}`;

    const fileName = `keisan_d_${timestamp}.txt`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName; // タイムスタンプ付きのファイル名
    a.click();
    URL.revokeObjectURL(url);
});


/* //各計算ページからは読み込まない。
document.getElementById('importData').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});
*/

document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) {
        showNotification("ファイルがせんたくされていません。"); // ファイルが選択されていない場合の処理
        return; // ここで処理を終了
    }

    const reader = new FileReader();

    // 成功したときの処理
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            Object.keys(data).forEach(key => {
                localStorage.setItem(key, data[key]);
            });
            showNotification("データをよみこみました。");
        } catch (error) {
            // パースエラーの処理
            showNotification("データをよみこめませんでした。");
        }
        finally {
            // 成功でも失敗でも必ずモーダルを閉じる
            closeDataModal();
            returnMenu(); // データの読み込みが完了し、メニュー画面へ戻る
        }
    };

    // エラーが発生したときの処理
    reader.onerror = function() {
        showNotification("よみこみちゅうに、エラーがでました。");
        closeDataModal(); // エラー時もモーダルを閉じる
    };

    reader.readAsText(file);
});



//レスキューモーダル展開。
// コマンド入力によるマスターボタンの表示・非表示制御とレスキューモーダルの表示
document.getElementById('commandInput').addEventListener('input', function(event) {
    const command = event.target.value.trim();
    const masterButton = document.getElementById('masterButton');

    switch (command) {
        case "/rescue":
            document.getElementById('rescueModal').style.display = 'block';
            event.target.value = ''; // コマンド実行後、テキストエリアをクリア
            closeDataModal();
            break;
        case "/delete":
            document.getElementById('deleteModal').style.display = 'flex';
            event.target.value = ''; // コマンド実行後、テキストエリアをクリア
            closeDataModal();
            break;
        case "/master on":
            masterButton.style.display = 'block';
            event.target.value = ''; // コマンド実行後、テキストエリアをクリア
            showNotification("マスターボタンをONにしました。");
            closeDataModal();
            break;
        case "/master off":
            masterButton.style.display = 'none';
            event.target.value = ''; // コマンド実行後、テキストエリアをクリア
            showNotification("マスターボタンをOFFにしました。");
            closeDataModal();
            break;
        default:
            // その他のコマンドには何もしない
            break;
    }
});



// スライダー値の更新
function updateSliderValue(value) {
    document.getElementById('sliderValue').textContent = 'Lv' + value;
}

// レベルに応じて擬似的なコイン情報を復元
function restoreLevels() {
const selectedLevel = parseInt(document.getElementById('levelSlider').value);
/*const levelToImage = {
    1: '/img/Lmaru.png',
    2: '/img/Mmaru.png',
    3: '/img/Bmaru.png',
    4: '/img/Amaru.png',
    5: '/img/Rmaru.png',
    6: '/img/Kmaru.png',
    7: '/img/Pmaru.png',
    8: '/img/Ymaru.png',
    9: '/img/Pmaru.png',
    10: '/img/Omaru.png',
    11: '/img/Smaru.png'
};*/

// レベルに応じたコインの保存
for (let level = 1; level < selectedLevel; level++) {
    let coinsNeeded = 3;  // デフォルトで3枚のコイン

    // コイン情報の生成と保存
    let coinInfo = {
        image: problemState.levelToImage[level],
        count: coinsNeeded
    };
    rescueSaveCoinInfo(level, coinInfo);
}

// 特別なケース: Lv11が選択されたとき、Lv10に5枚のコインを設定
if (selectedLevel === 11) {
    rescueSaveCoinInfo(10, { image: problemState.levelToImage[10], count: 5 });
}

// 選択されたレベル以上のコインをリセット
for (let level = selectedLevel; level <= 11; level++) {
    if (level !== 10 || selectedLevel < 11) { // Lv10の特別ケースを除外
        rescueSaveCoinInfo(level, { image: null, count: 0 });
    }
}

    returnMenu();
    rescueCloseModal();
    document.getElementById('levelSlider').value = 2;  // スライダーの位置を1にリセット
    updateSliderValue(2);  // スライダーの表示値も更新
}

function rescueSaveCoinInfo(level, coinInfo) {
    let coins = JSON.parse(localStorage.getItem(`add_coins_${level}`)) || [];
    // コインを特定の数だけ配列に追加
    coins = Array(coinInfo.count).fill({ image: coinInfo.image });
    localStorage.setItem(`add_coins_${level}`, JSON.stringify(coins));
    console.log(`Saved coin info for level ${level}:`, coinInfo);
    console.log(`All coins for level ${level}:`, coins);
}

function pseudoSaveCoinInfo(level, coinInfo) {
    let coins = Array(coinInfo.count).fill(coinInfo.image);
    localStorage.setItem(`add_coins_${level}`, JSON.stringify(coins));
    console.log(`Restored coin info for level ${level}:`, coins);
}

// モーダルを閉じる
function rescueCloseModal() {
    document.getElementById('rescueModal').style.display = 'none';
    document.getElementById('levelSlider').value = 2;  // スライダーの位置を1にリセット
    updateSliderValue(2);  // スライダーの表示値も更新
}


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

        // moveCountが5の倍数のときに displayCachedMessage() を呼び出す
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
                } else {
                    console.log("bubbleはすでに削除されているか、別の親要素に移動しています。");
                }
            }, 1000); // CSSのtransitionの時間と同じかそれ以上を指定
        } else {
            console.log("bubbleはすでに削除されているか、別の親要素に移動しています。");
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
            //problemState.useExistingCoins = true;
            throwCoin(10, special = false, coinSize = 60, howManyCoins = 1, problemState.useExistingCoins);
            problemState.lvTenClear = false;  // Stateをリセット
            return;  // 処理をここで終了
        }
    }

    // Level 11がクリアされた場合、ID 26のメッセージを表示
    if (problemState.lvElevenClear) {
        const specialMessageLv11 = messages.find(message => message.ID === "26");
        if (specialMessageLv11) {
            displayComment(specialMessageLv11.areaType, specialMessageLv11.imageSize, specialMessageLv11.text);
            //problemState.useExistingCoins = true;
            throwCoin(11, special = false, coinSize = 90, howManyCoins = 1, problemState.useExistingCoins);
            problemState.lvElevenClear = false;  // Stateをリセット
            return;  // 処理をここで終了
        }
    }

    // moveCountが100を超えた場合、ID 20のメッセージを表示
    if (moveCount > 100) {
        const specialMessage = messages.find(message => message.ID === "20");
        if (specialMessage) {
            displayComment(specialMessage.areaType, specialMessage.imageSize, specialMessage.text);
            //lastSelectedId = specialMessage.ID; // 選択されたメッセージのIDを記録
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