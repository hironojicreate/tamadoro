
//隠しボタンを表示
        document.getElementById("version").addEventListener("click", function () {
            const hiddenButton = document.getElementById("goToHundredgrid");

            // 現在の表示状態を取得し、切り替える
            if (getComputedStyle(hiddenButton).display === "none") {
                hiddenButton.style.display = "block"; // 表示
            } else {
                hiddenButton.style.display = "none"; // 非表示
            }
        });


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



document.getElementById('importData').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});

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
            //returnMenu(); // データの読み込みが完了し、メニュー画面へ戻る
        }
    };

    // エラーが発生したときの処理
    reader.onerror = function() {
        showNotification("よみこみちゅうに、エラーがでました。");
        closeDataModal(); // エラー時もモーダルを閉じる
    };

    reader.readAsText(file);
});

function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.opacity = 1;
    setTimeout(() => {
        notification.style.opacity = 0;
    }, 2000);
}
