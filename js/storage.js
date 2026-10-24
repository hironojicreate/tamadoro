// localStorage の読み書き
// 保存のキー名はここに集めておく（PAGE は各モードの *-menu-coin.js で定義）
const TamaStore = {
    // JSON を読む。無い・壊れているときは fallback を返す
    readJSON(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch (error) {
            console.error(`${key} を読み込めませんでした`, error);
            return fallback;
        }
    },

    writeJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    // 例: add_coins_3
    coinsKey(level) {
        return `${PAGE.storagePrefix}_coins_${level}`;
    },

    getCoins(level) {
        return this.readJSON(this.coinsKey(level), []);
    },

    setCoins(level, coins) {
        this.writeJSON(this.coinsKey(level), coins);
    },

    // 例: addition_level_3_best_time
    bestTimeKey(level) {
        return `${PAGE.bestTimePrefix}_level_${level}_best_time`;
    },
};
