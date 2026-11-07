// データ管理モーダル（セーブ／ロード）・通知・おとな用コマンド
// index.html と各計算ページの両方で使う

function openDataModal() {
    // さいしょの画面では、モードのコマンド（/rescue など）は使えない
    document.getElementById('commandInput').placeholder = currentMode
        ? '【⚠緊急復元⚠】ここに「/rescue」と入力。その後Lvを選択。'
        : 'おとな用：ここにコマンドを入力';
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


// おとな用コマンド（データ管理モーダルにある入力欄）
//   どの画面でも：
//   /music on    さいしょの画面に「おんがくのへや」を出す（ためしているあいだ。js/music.js）
//   /music off   「おんがくのへや」をかくす
//   /song⏎       おんぷよみ マスタークラス の 曲調と リズムを 一覧から えらぶ（js/song-picker.js）
//   /song jazz⏎  おんぷよみ マスタークラス の 曲調を きめる（曲調の id か 系統。js/songs.js。Enter で きまる）
//   /song off⏎   曲調を もとに もどす（ノブの わりあいで えらぶ）
//   /rhythm genki⏎  おんぷよみ マスタークラス の リズムを きめる（genki・hazumu・setsunai・utau・zurashi。Enter で きまる）
//   /rhythm off⏎    リズムを もとに もどす（曲調の 系統から ノブの わりあいで えらぶ）
//   計算・けんばんの画面だけ：
//   /rescue      レベルを復元するモーダル
//   /delete      このページのデータを消すモーダル
//   /master on   マスターボタン（答えを自動入力）を表示
//   /master off  マスターボタンを非表示
const commandInput = document.getElementById('commandInput');
if (commandInput) {
    commandInput.addEventListener('input', function (event) {
        const command = event.target.value.trim();
        const masterButton = document.getElementById('masterButton');

        if (command === '/music on' || command === '/music off') {
            const on = command === '/music on';
            TamaMusic.setEnabled(on);
            showNotification(on ? 'おんがくのへやを ONにしました。' : 'おんがくのへやを OFFにしました。');
            event.target.value = '';
            closeDataModal();
            // おんがくの画面にいるときに OFF にしたら、さいしょの画面へ
            if (!on && /^#\/?(music|keys|black|notes|rhythm|piano)/.test(location.hash)) {
                location.hash = '#/';
            }
            return;
        }
        // /song：Enter（改行）で きまる（とちゅうの 文字で うごかないように）
        if (command.startsWith('/song')) {
            if (!/\n$/.test(event.target.value)) return;
            const id = command.slice(5).trim();
            if (!id) {
                // /song だけ：一覧から えらぶ
                event.target.value = '';
                closeDataModal();
                TamaSongPicker.open();
                return;
            }
            if (TamaSongs.force(id)) {
                const style = TamaSongs.STYLES.find(s => s.id === id);
                const family = TamaSongs.FAMILIES[id];
                showNotification(id === 'off' ? 'きょくふうを もとに もどしました。'
                    : `きょくふうを「${style ? `${style.name}（${style.sub}）` : `${family.name}風`}」に しました。`);
            } else {
                showNotification(`「${id}」という きょくふうは ありません。`);
            }
            event.target.value = '';
            closeDataModal();
            return;
        }
        // /rhythm：Enter（改行）で きまる
        if (command.startsWith('/rhythm')) {
            if (!/\n$/.test(event.target.value)) return;
            const id = command.slice(7).trim() || 'off';
            if (TamaSongs.forceRhythm(id)) {
                showNotification(id === 'off' ? 'リズムを もとに もどしました。'
                    : `リズムを「${TamaSongs.RHYTHMS[id].name}」に しました。`);
            } else {
                showNotification(`「${id}」という リズムは ありません。`);
            }
            event.target.value = '';
            closeDataModal();
            return;
        }
        if (!currentMode) {
            return; // さいしょの画面では、モードのコマンドは使えない
        }

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
