// データ管理モーダル（セーブ／ロード）・通知・おとな用コマンド
// index.html と各計算ページの両方で使う

function openDataModal() {
    document.getElementById('dataModal').style.display = 'block';
    document.getElementById('dataModalOverlay').style.display = 'block';
}

function closeDataModal() {
    document.getElementById('dataModal').style.display = 'none';
    document.getElementById('dataModalOverlay').style.display = 'none';
    const importChoice = document.getElementById('importChoice');
    if (importChoice) {
        importChoice.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('dataModalOverlay').addEventListener('click', closeDataModal);
});


// 画面中央に2秒だけ出るお知らせ
function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.opacity = 1;
    setTimeout(() => {
        notification.style.opacity = 0;
    }, 2000);
}


// セーブ：localStorage を丸ごと tamadoro_月日時分.txt に書き出す
document.getElementById('exportData').addEventListener('click', function () {
    const blob = new Blob([JSON.stringify(localStorage)], { type: 'text/plain' });

    const date = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timestamp = `${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamadoro_${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});


// ロード（ロードボタンは index.html にだけある）
//   「たして」  ：ファイルにあるデータだけ入れかえ、ファイルにないデータはのこす
//   「うわがき」：いまのデータをぜんぶ消してから、ファイルのデータを入れる
let importMode = 'merge';

function chooseImportFile(mode) {
    importMode = mode;
    document.getElementById('importChoice').style.display = 'none';
    const fileInput = document.getElementById('fileInput');
    fileInput.value = ''; // 同じファイルをもう一度えらんでも読みこめるように
    fileInput.click();
}

const importButton = document.getElementById('importData');
if (importButton) {
    importButton.addEventListener('click', function () {
        document.getElementById('importChoice').style.display = 'block';
    });
    document.getElementById('importMerge').addEventListener('click', () => chooseImportFile('merge'));
    document.getElementById('importReplace').addEventListener('click', () => chooseImportFile('replace'));
    document.getElementById('importCancel').addEventListener('click', function () {
        document.getElementById('importChoice').style.display = 'none';
    });
}

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) {
        showNotification("ファイルがせんたくされていません。");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            // 中身をたしかめてから消す（こわれたファイルで、いまのデータだけ消えないように）
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('セーブファイルではありません');
            }
            if (importMode === 'replace') {
                localStorage.clear();
            }
            Object.keys(data).forEach(key => {
                localStorage.setItem(key, data[key]);
            });
            // むかしのアプリのファイルを「うわがき」で読んだときは、ドロップを記録に取りこむ
            History.migrate();
            showNotification(importMode === 'replace' ? "データをうわがきして よみこみました。" : "データをよみこみました。");
        } catch (error) {
            showNotification("データをよみこめませんでした。");
        } finally {
            closeDataModal();
            // 計算の画面なら、メニュー画面を読み込んだデータで描き直す
            if (currentMode) {
                returnMenu();
            }
        }
    };

    reader.onerror = function () {
        showNotification("よみこみちゅうに、エラーがでました。");
        closeDataModal();
    };

    reader.readAsText(file);
});


// おとな用コマンド（計算ページのデータ管理モーダルにある入力欄）
//   /rescue      レベルを復元するモーダル
//   /delete      このページのデータを消すモーダル
//   /master on   マスターボタン（答えを自動入力）を表示
//   /master off  マスターボタンを非表示
const commandInput = document.getElementById('commandInput');
if (commandInput) {
    commandInput.addEventListener('input', function (event) {
        const command = event.target.value.trim();
        const masterButton = document.getElementById('masterButton');

        switch (command) {
            case "/rescue":
                document.getElementById('rescueModal').style.display = 'block';
                break;
            case "/delete":
                document.getElementById('deleteModal').style.display = 'flex';
                break;
            case "/master on":
                masterButton.style.display = 'block';
                showNotification("マスターボタンをONにしました。");
                break;
            case "/master off":
                masterButton.style.display = 'none';
                showNotification("マスターボタンをOFFにしました。");
                break;
            default:
                return; // その他の入力には何もしない
        }
        event.target.value = ''; // コマンド実行後、テキストエリアをクリア
        closeDataModal();
    });
}


// ---------- /delete ----------

function deleteData() {
    for (let level = 1; level <= currentMode.levelCount; level++) {
        localStorage.removeItem(TamaStore.coinsKey(level));
    }
    History.removeMode(currentMode.id); // きろく画面の記録も消す
    if (currentMode.onDeleteData) {
        currentMode.onDeleteData(); // モードごとの追加データ（百マスのタイム記録など）
    }
    closeModal();
    showNotification(currentMode.deleteMessage);
    if (currentMode.reloadAfterDelete) {
        setTimeout(() => location.reload(), 1000); // 最新状態を反映
    } else {
        returnMenu();
    }
}

function closeModal() {
    document.getElementById('deleteModal').style.display = 'none';
}


// ---------- /rescue ----------
// 復元の本体（restoreLevels）は js/menu.js

// スライダー値の表示
function updateSliderValue(value) {
    document.getElementById('sliderValue').textContent = 'Lv' + value;
}

// レベルを解放するための、日付なしのドロップを count 個保存する
function rescueSaveCoinInfo(level, coinInfo) {
    TamaStore.setCoins(level, Array(coinInfo.count).fill({ image: coinInfo.image }));
}

function rescueCloseModal() {
    document.getElementById('rescueModal').style.display = 'none';
    const slider = document.getElementById('levelSlider');
    if (slider) {
        slider.value = 2;  // スライダーの位置をリセット
        updateSliderValue(2);
    }
}
