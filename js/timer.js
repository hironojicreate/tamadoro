//ストップウォッチ
let startTime;
let endTime;

function startTimer() {
    startTime = new Date();
}

// タイマーを止めて「分:秒」を返す
function stopTimer() {
    endTime = new Date();
    return formatTime(endTime - startTime);
}

// ミリ秒 → 「分:秒」
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const formatMilliseconds = formatTime;


//最高記録（たしざん・ひきざん・かけざんはミリ秒、百マスは秒で保存している）
function saveBestTime(level, time) {
    const key = TamaStore.bestTimeKey(level);
    const currentBestTime = localStorage.getItem(key);
    if (!currentBestTime || time < parseInt(currentBestTime)) {
        localStorage.setItem(key, time);
    }
}

function getBestTime(level) {
    const bestTime = localStorage.getItem(TamaStore.bestTimeKey(level));
    return bestTime ? parseInt(bestTime) : null;
}
