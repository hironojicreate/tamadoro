// モード（たしざん・ひきざん・かけざん・百マス）の定義をここに集める
// 各モードのファイル（js/modes/addition.js など）が MODES に登録する
const MODES = {};

// 問題パターンづくりの道具
const ProblemPatterns = {
    // a を aMin～aMax、b を bMin～bMax（bMax は a に合わせて決めることもできる）で回して、条件に合う [a, b] を集める
    pairs(aMin, aMax, bMin, bMax, condition = () => true) {
        const patterns = [];
        for (let a = aMin; a <= aMax; a++) {
            const bLimit = typeof bMax === 'function' ? bMax(a) : bMax;
            for (let b = bMin; b <= bLimit; b++) {
                if (condition(a, b)) {
                    patterns.push([a, b]);
                }
            }
        }
        return patterns;
    },

    // [a, from]～[a, to]
    withFirst(a, from, to) {
        return this.range(from, to).map(b => [a, b]);
    },

    // [from, b]～[to, b]
    withSecond(b, from, to) {
        return this.range(from, to).map(a => [a, b]);
    },

    range(from, to) {
        const step = from <= to ? 1 : -1;
        const list = [];
        for (let n = from; n !== to + step; n += step) {
            list.push(n);
        }
        return list;
    },

    // 配列をシャッフルする（Fisher-Yates法）
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },
};

// ドロップの色：L 水色 / M みどり / B 青 / A あか / R むらさき / K きみどり / P ピンク
//               Y 黄色 / C うすむらさき / O オレンジ / S 銀 / G 金
// 保存データには、以前からの画像名（/img/Lmaru.png）で記録する
function dropImage(letter) {
    return `/img/${letter}maru.png`;
}

// 保存データの画像名 → 画面に出す、球のドロップ（img/drops/L.svg。tools/make_drops.py でつくる）
function dropSrc(image) {
    const match = /\/img\/([A-Z])maru\.png$/.exec(image || '');
    return match ? `/img/drops/${match[1]}.svg` : image;
}
