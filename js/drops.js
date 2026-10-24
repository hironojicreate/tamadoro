// ドロップ（コイン）：投げる・はねる・ドラッグ・ごほうび・メニューへの表示
// （currentMode は js/state.js）

//coinが飛び散ります。
function scatterCoins() {
    document.querySelectorAll('.coin').forEach(coin => {
        // -350vw～+350vw、-350vh～+350vh の範囲でランダムに飛ばす
        const randomX = (Math.random() - 0.5) * 700;
        const randomY = (Math.random() - 0.5) * 700;

        coin.animate([
            { transform: 'translate(0, 0)' },
            { transform: `translate(${randomX}vw, ${randomY}vh)` }
        ], {
            duration: 2000,
            easing: 'ease-out',
            delay: Math.random() * 700 // 0から700ミリ秒の間でランダムな遅延
        }).finished.then(() => {
            coin.remove(); // アニメーションが完了したらコインをDOMから削除
        });
    });
}


// コインを投げる
//   special: 金のドロップ
//   useExistingCoins: currentMode.existingCoinsLevels のレベルのときは、メニューに並んでいるドロップを全部投げる
//   bounce: 床ではね返るときの強さ（百マスは低め）
function throwCoin(level, special = false, coinSize = 50, howManyCoins = 1, useExistingCoins = 0, bounce = 0.7) {
    if (currentMode.existingCoinsLevels.includes(useExistingCoins)) {
        document.querySelectorAll('.main-reward-coin').forEach((coin, index) => {
            setTimeout(() => launchCoin(coin.src, coinSize, bounce), index * 100); // 少し遅延を加えて投げる
        });
        problemState.useExistingCoins = 0; // useExistingCoins をリセット
        return;
    }

    const src = special ? '/img/Gmaru.png' : problemState.levelToImage[level];
    for (let i = 0; i < howManyCoins; i++) {
        setTimeout(() => launchCoin(src, coinSize, bounce), i * 100); // i * 100ミリ秒の遅延を加える
    }
}

// コインを1枚つくって画面の上から投げる
function launchCoin(src, coinSize, bounce) {
    const coin = document.createElement('img');
    coin.src = dropSrc(src);
    coin.className = 'coin';
    coin.style.width = `${coinSize}px`;
    coin.style.height = `${coinSize}px`;
    document.body.appendChild(coin);

    const startX = Math.random() * (window.innerWidth / 1.38);
    coin.style.left = `${startX}px`;
    coin.style.top = `0px`;

    const velocityX = (window.innerWidth / 4 - startX) / 10;
    animateCoin(coin, velocityX, 0, bounce);
}


function animateCoin(coin, initialVelocityX, initialVelocityY, bounce = 0.7) {
    let currentLeft = parseFloat(coin.style.left);
    let currentTop = parseFloat(coin.style.top);
    let velocityX = initialVelocityX;
    let velocityY = initialVelocityY;
    const gravity = 3;
    let hasBounced = false;

    // 止まったら、少し回転させてドラッグできるようにする
    function settle() {
        coin.style.animation = 'none';
        coin.style.transform = `rotate(${Math.random() * 360}deg)`;
        enableDrag(coin);
    }

    function frame() {
        velocityY += gravity;
        currentLeft += velocityX;
        currentTop += velocityY;

        coin.style.left = `${currentLeft}px`;
        coin.style.top = `${currentTop}px`;

        if (currentLeft >= window.innerWidth * 0.7) {
            settle();
            return;
        }

        const bounceThreshold = window.innerHeight * 0.95 - coin.offsetHeight;
        if (currentTop >= bounceThreshold && !hasBounced) {
            velocityY *= -bounce;
            velocityX += (Math.random() - 1.5) * 2;
            hasBounced = true;
        } else if (hasBounced) {
            if (currentTop >= window.innerHeight * 0.1 && currentTop <= window.innerHeight * 0.9) {
                if (Math.random() < 0.21) {
                    settle();
                    return;
                }
            }
        }

        if (currentLeft < 0 || currentLeft > window.innerWidth) {
            velocityX *= -1;
        }
        if (currentTop > window.innerHeight) {
            velocityY *= -bounce;
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}


//コインのドラッグアンドドロップ処理
function enableDrag(coin) {
    let offsetX = 0;
    let offsetY = 0;

    function startDrag(event) {
        event.preventDefault(); // ブラウザのデフォルト動作を抑制

        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        offsetX = clientX - coin.getBoundingClientRect().left;
        offsetY = clientY - coin.getBoundingClientRect().top;

        function onMove(eventMove) {
            const moveX = eventMove.touches ? eventMove.touches[0].clientX : eventMove.clientX;
            const moveY = eventMove.touches ? eventMove.touches[0].clientY : eventMove.clientY;

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


//ご褒美コイン生成（もらったドロップの画像名を返す）
function createRewardCoin(level) {
    const existingCoins = document.querySelectorAll('.reward-coin');
    const offset = existingCoins.length * 50;  // 新しいコインは前のコインの左に50pxずつずれます。

    // ノーミスなら金のドロップ
    const coinImage = problemState.mistakeCount === 0 ? '/img/Gmaru.png' : problemState.levelToImage[level];

    const rewardCoin = document.createElement('img');
    rewardCoin.src = dropSrc(coinImage);
    rewardCoin.className = 'reward-coin';
    rewardCoin.style.position = 'fixed';
    rewardCoin.style.top = '50%';  // 中央に配置
    rewardCoin.style.left = '50%';
    rewardCoin.style.transform = 'translate(-50%, -50%) scale(2.67)';  // 300pxから800pxに拡大
    rewardCoin.style.opacity = '0';  // 初期状態は透明
    rewardCoin.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
    document.body.appendChild(rewardCoin);

    // 日本時間の「月/日」
    const now = new Date();
    const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dateStr = `${jstNow.getMonth() + 1}/${jstNow.getDate()}`;

    saveCoinInfo(level, {
        level: level,
        order: existingCoins.length + 1,
        image: coinImage,
        date: dateStr
    });

    // アニメーションでコインを表示
    setTimeout(() => {
        rewardCoin.style.opacity = '1';
        rewardCoin.style.transform = 'translate(-50%, -50%) scale(0.167)';  // 50pxサイズに縮小
        setTimeout(() => {
            // コインを右上に移動
            const finalRight = 35 + offset;
            rewardCoin.style.transition = 'top 0.5s ease-out, left 0.5s ease-out';
            rewardCoin.style.top = '60px';
            rewardCoin.style.left = `calc(100% - ${finalRight}px)`;
        }, 500);
    }, 10);
    return coinImage; // もらったドロップ（記録用）
}


// コイン情報をローカルストレージに保存する（レベルごとに最新10個まで）
function saveCoinInfo(level, coinInfo) {
    const coins = TamaStore.getCoins(level);
    coins.push(coinInfo);
    TamaStore.setCoins(level, coins.slice(-10));
}


// ページ遷移やレベル変更時に呼ばれる関数
function clearCoinsOnDOM() {
    document.querySelectorAll('.reward-coin').forEach(coin => coin.remove());
}


//問題画面の右上に、これまでのコインを並べる
function createRewardCoinFromInfo(coinInfo) {
    const rewardCoin = document.createElement('img');
    rewardCoin.src = dropSrc(coinInfo.image);
    rewardCoin.className = 'reward-coin';
    rewardCoin.style.position = 'fixed';
    rewardCoin.style.width = '50px';
    rewardCoin.style.height = '50px';

    // 既存のコインの数に基づいて右のオフセットを計算（50pxずつずらす）
    const existingCoins = document.querySelectorAll('.reward-coin').length;
    rewardCoin.style.top = '35px';
    rewardCoin.style.right = `${10 + existingCoins * 50}px`;

    document.body.appendChild(rewardCoin);
    rewardCoin.setAttribute('data-date', coinInfo.date);
}


function restoreCoins(level) {
    TamaStore.getCoins(level).forEach(createRewardCoinFromInfo);
}


//メイン画面にコインを表示
function displayAllLevelsCoins() {
    for (let level = 1; level <= currentMode.levelCount; level++) {
        displayLatestCoins(level, `coins${level}`);
    }
}

function displayLatestCoins(level, containerId, limit = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.style.display = 'flex'; // 横並びにする
    container.style.flexWrap = 'wrap'; // コインが多い場合に折り返す

    // 最新のコインから5つ取得
    const latestCoins = TamaStore.getCoins(level).slice(-limit).reverse();

    latestCoins.forEach(coin => {
        const coinWrapper = document.createElement('div');
        coinWrapper.style.position = 'relative'; // メッセージの位置の基準
        coinWrapper.style.marginRight = '3px';
        coinWrapper.style.display = 'inline-block';

        const img = document.createElement('img');
        img.src = dropSrc(coin.image);
        img.className = 'main-reward-coin';
        img.style.width = currentMode.menuCoinSize;
        img.style.height = currentMode.menuCoinSize;
        img.setAttribute('data-level', level);
        img.setAttribute('data-order', coin.order);
        img.setAttribute('data-date', coin.date);

        // タップ時に日付を表示/非表示
        img.addEventListener('click', toggleMessageDisplay);

        coinWrapper.appendChild(img);
        container.appendChild(coinWrapper);
    });

    if (latestCoins.length === 0) {
        container.textContent = 'ドロップをゲットしよう！';
    }
}


// コインをタップしたときの「月/日ﾆｬ」
function toggleMessageDisplay(event) {
    const coin = event.target;
    const coinWrapper = coin.parentElement;

    const existingMessageDiv = coinWrapper.querySelector('.message-div');
    if (existingMessageDiv) {
        existingMessageDiv.remove();
        return;
    }

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

    // 日付が無い（rescue で復元したドロップなど）ときは「ﾜｽﾚﾀ」
    let dateText = coin.getAttribute('data-date');
    if (!dateText || dateText === "null" || dateText === "undefined" || !dateText.includes('/')) {
        dateText = 'ﾜｽﾚﾀ';
    } else {
        // たまに特別なメッセージ
        const randomNum = Math.random() * 1000;
        if (randomNum < 1) {
            dateText = 'ｶﾝﾍﾟｷ';  // 1000回に1回
        } else if (randomNum < 11) {
            dateText = 'ｽﾃｷ';  // 100回に1回
        } else if (randomNum < 31) {
            dateText = 'ｲｲ';  // 50回に1回
        }
    }
    messageDiv.textContent = `${dateText}ﾆｬ`;

    coinWrapper.appendChild(messageDiv);

    // コインの真上に置く
    const coinRect = coin.getBoundingClientRect();
    const messageRect = messageDiv.getBoundingClientRect();
    const wrapperRect = coinWrapper.getBoundingClientRect();
    const offset = -2;

    messageDiv.style.left = `${coinRect.left - wrapperRect.left + coinRect.width / 2 - messageRect.width / 2}px`;
    messageDiv.style.top = `${coinRect.top - wrapperRect.top - messageRect.height - offset}px`;
}


//日付をまとめて ON/OFF
document.getElementById('toggleDateButton').addEventListener('click', function () {
    const button = this;
    const showDates = button.textContent === "ひづけON";

    document.querySelectorAll('.main-reward-coin').forEach(coin => {
        const isShown = coin.nextElementSibling && coin.nextElementSibling.classList.contains('message-div');
        if (isShown !== showDates) {
            coin.dispatchEvent(new Event('click'));
        }
    });
    button.textContent = showDates ? "ひづけOFF" : "ひづけON";
});

