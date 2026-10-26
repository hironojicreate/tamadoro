// 「タマのきろく」画面（#/records、#/records/add など）
//   ドロップびん・ドロップカレンダー・レベルごとのタイム・にがてマップ
// 記録そのものは js/history.js

const Records = {
    tab: 'add',          // いま見ているモード
    month: null,         // カレンダーの月（その月の1日の Date）
    returnTo: '#/',      // 「もどる」で戻る画面

    open(tab) {
        this.tab = MODES[tab] ? tab : this.tab;
        if (!this.month) {
            const now = new Date();
            this.month = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        const log = History.getLog();
        DropJar.show(log);
        this.renderCalendar(log);
        this.renderTabs();
        this.renderLevels(log);
        this.renderWeak();
    },

    // ---------- ドロップカレンダー ----------

    renderCalendar(log) {
        const year = this.month.getFullYear();
        const month = this.month.getMonth();
        document.getElementById('calTitle').textContent = `${year}ねん ${month + 1}がつ`;

        // 日にちごとのドロップ
        const byDay = {};
        log.forEach(entry => {
            if (entry.drop && entry.t) {
                const d = new Date(entry.t);
                if (d.getFullYear() === year && d.getMonth() === month) {
                    (byDay[d.getDate()] = byDay[d.getDate()] || []).push(entry.drop);
                }
            }
        });

        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';
        '日月火水木金土'.split('').forEach(w => {
            const head = document.createElement('div');
            head.className = 'calendar-head';
            head.textContent = w;
            calendar.appendChild(head);
        });
        const firstWeekday = new Date(year, month, 1).getDay();
        for (let i = 0; i < firstWeekday; i++) {
            calendar.appendChild(document.createElement('div'));
        }
        const today = new Date();
        const days = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= days; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                cell.classList.add('today');
            }
            const drops = byDay[day] || [];
            cell.innerHTML = `<span class="calendar-date">${day}</span>`;
            const shown = drops.slice(-6);
            const box = document.createElement('div');
            box.className = 'calendar-drops';
            shown.forEach(drop => {
                const img = document.createElement('img');
                img.src = dropSrc(drop);
                img.alt = '';
                box.appendChild(img);
            });
            if (drops.length > shown.length) {
                box.insertAdjacentHTML('beforeend', `<span class="calendar-more">+${drops.length - shown.length}</span>`);
            }
            cell.appendChild(box);
            if (drops.length > 0) {
                cell.title = `${month + 1}/${day}：ドロップ ${drops.length}こ`;
            }
            calendar.appendChild(cell);
        }
    },

    moveMonth(diff) {
        this.month = new Date(this.month.getFullYear(), this.month.getMonth() + diff, 1);
        this.renderCalendar(History.getLog());
    },

    // ---------- モードのタブ ----------

    renderTabs() {
        const tabs = document.getElementById('recordsTabs');
        tabs.innerHTML = '';
        Object.values(MODES).forEach(mode => {
            const button = document.createElement('button');
            button.textContent = mode.name;
            button.className = mode.id === this.tab ? 'active' : '';
            button.addEventListener('click', () => {
                location.hash = `#/records/${mode.id}`;
            });
            tabs.appendChild(button);
        });
    },

    // ---------- レベルごとのタイム ----------

    renderLevels(log) {
        const mode = MODES[this.tab];
        const tbody = document.getElementById('levelRecords');
        tbody.innerHTML = '';

        // ちょうせんしたレベルだけ出す（オニなどの、まだ見つけていないレベルは出さない）
        let shownRows = 0;
        mode.levels.forEach((def, i) => {
            const level = i + 1;
            const entries = log.filter(e => e.mode === mode.id && e.level === level && !e.weakChallenge);
            const savedBest = localStorage.getItem(`${mode.bestTimePrefix}_level_${level}_best_time`);
            if (entries.length === 0 && !savedBest) {
                return;
            }
            shownRows++;

            const clears = entries.filter(e => e.cleared || e.imported).length;
            // とちゅうで手をとめた回（paused）は、タイムに入れない
            const timedAll = entries.filter(e => e.cleared && e.ms && !e.paused);
            const timed = timedAll.slice(-20);

            // ベストタイム：以前からの保存（百マスは秒）と、記録のうち、はやいほう
            const times = timedAll.map(e => e.ms);
            if (savedBest) {
                times.push(parseInt(savedBest) * (mode.engine === 'grid' ? 1000 : 1));
            }
            const bestMs = times.length > 0 ? Math.min(...times) : null;

            const row = document.createElement('tr');
            row.innerHTML = `
                <th scope="row">${def.label}</th>
                <td class="num">${clears > 0 ? `${clears}かい` : '－'}</td>
                <td class="num">${bestMs !== null ? formatTime(bestMs) : '－'}</td>
                <td class="spark-cell"></td>`;
            row.querySelector('.spark-cell').appendChild(timed.length > 0 ? sparkline(timed) : noData());
            tbody.appendChild(row);
        });

        if (shownRows === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="records-note">まだ きろくが ないよ。もんだいに ちょうせんしよう！</td></tr>';
        }

        function noData() {
            const span = document.createElement('span');
            span.className = 'records-note';
            span.textContent = 'まだ ないよ';
            return span;
        }
    },

    // ---------- にがてマップ・にがてな問題 ----------

    renderWeak() {
        const mode = MODES[this.tab];
        const section = document.getElementById('weakSection');
        const map = document.getElementById('weakMap');
        const list = document.getElementById('weakList');
        map.innerHTML = '';
        list.innerHTML = '';

        if (mode.engine !== 'drill') {
            section.style.display = 'none';
            return;
        }
        section.style.display = '';

        const stats = History.getStats(mode.id);

        // にがてマップ（たて：はじめの数、よこ：2つめの数）
        map.appendChild(weakGrid(mode, stats));
        map.appendChild(weakLegend());

        // まちがえた割合が高い順（同じなら、時間がかかった順）
        const weak = Object.entries(stats)
            .map(([key, s]) => ({ key, ...s, hp: History.getWeakScore(mode.id, key), rate: s.miss / s.n, avg: s.ms / s.n }))
            .filter(s => s.hp > 0)
            .sort((a, b) => b.hp - a.hp || b.rate - a.rate || b.avg - a.avg)
            .slice(0, 8);
        if (weak.length === 0) {
            list.innerHTML = '<li class="records-note">にがてな もんだいは まだ ないよ！</li>';
        }
        weak.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `${s.key.replace('-', '−')}　…　${s.n}かいちゅう ${s.miss}かい まちがい・へいきん ${(s.avg / 1000).toFixed(1)}びょう`;
            list.appendChild(li);
        });
    },
};


// ---------- 小さな折れ線グラフ（タイムのうつりかわり） ----------

function sparkline(entries) {
    const width = 220, height = 44, pad = 6;
    const values = entries.map(e => e.ms);
    const min = Math.min(...values), max = Math.max(...values);
    const x = i => entries.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (entries.length - 1);
    // 時間が長いほど上（はやくなると、せんが下がる）
    const y = v => max === min ? height / 2 : height - pad - ((v - min) * (height - pad * 2)) / (max - min);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'sparkline');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `さいきん${entries.length}かいのタイム：${values.map(formatTime).join('、')}`);

    if (entries.length > 1) {
        const line = document.createElementNS(svgNS, 'polyline');
        line.setAttribute('points', values.map((v, i) => `${x(i)},${y(v)}`).join(' '));
        line.setAttribute('class', 'spark-line');
        svg.appendChild(line);
    }
    entries.forEach((entry, i) => {
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('cx', x(i));
        dot.setAttribute('cy', y(entry.ms));
        dot.setAttribute('r', 4);
        dot.setAttribute('class', entry.ms === min ? 'spark-dot best' : 'spark-dot');
        // さわる・マウスをのせると、日付とタイム
        const date = new Date(entry.t);
        const label = `${date.getMonth() + 1}/${date.getDate()}　${formatTime(entry.ms)}${entry.miss ? `（まちがい ${entry.miss}）` : ''}`;
        const hit = document.createElementNS(svgNS, 'circle');
        hit.setAttribute('cx', x(i));
        hit.setAttribute('cy', y(entry.ms));
        hit.setAttribute('r', 10);
        hit.setAttribute('class', 'spark-hit');
        hit.addEventListener('pointerenter', event => ChartTooltip.show(event, label));
        hit.addEventListener('pointerleave', () => ChartTooltip.hide());
        svg.appendChild(dot);
        svg.appendChild(hit);
    });
    return svg;
}


// ---------- にがてマップ（9×9） ----------

// まちがえた割合 → 色（うすい青 → こい青）
const WEAK_STEPS = [
    { max: 0, color: '#cde2fb', label: 'まちがいなし' },
    { max: 0.1, color: '#9ec5f4', label: 'すこし' },
    { max: 0.25, color: '#6da7ec', label: 'ときどき' },
    { max: 0.5, color: '#3987e5', label: 'よく', dark: true },
    { max: 1, color: '#1c5cab', label: 'とても', dark: true },
];

function weakStep(rate) {
    return WEAK_STEPS.find(step => rate <= step.max);
}

// たしざん・かけざんは 1～9 × 1～9、ひきざんは ひかれる数 1～18 × ひく数 1～9
function weakGrid(mode, stats) {
    const isSub = mode.id === 'sub';
    const lastRow = isSub ? 18 : 9;
    const shown = isSub ? '−' : mode.symbol;
    const table = document.createElement('table');
    table.className = 'weak-grid';
    let html = `<tr><th>${shown}</th>`;
    for (let b = 1; b <= 9; b++) html += `<th>${b}</th>`;
    html += '</tr>';
    for (let a = 1; a <= lastRow; a++) {
        html += `<tr><th>${a}</th>`;
        for (let b = 1; b <= 9; b++) {
            if (isSub && b > a) {
                html += '<td class="none"></td>'; // こたえがマイナスになる（出ない問題）
                continue;
            }
            const name = `${a} ${shown} ${b}`;
            const s = stats[`${a}${mode.symbol}${b}`];
            if (!s) {
                html += `<td class="empty" data-label="${name}：まだ やっていないよ">－</td>`;
                continue;
            }
            const hp = History.getWeakScore(mode.id, `${a}${mode.symbol}${b}`);
            const rate = hp === 0 ? 0 : (s.miss / s.n);
            const step = weakStep(rate);
            html += `<td style="background:${step.color}" class="${step.dark ? 'dark' : ''}" data-label="${name}：${s.n}かいちゅう ${s.miss}かい まちがい・へいきん ${(s.ms / s.n / 1000).toFixed(1)}びょう"></td>`;
        }
        html += '</tr>';
    }
    table.innerHTML = html;
    table.querySelectorAll('td[data-label]').forEach(td => {
        td.addEventListener('pointerenter', event => ChartTooltip.show(event, td.dataset.label));
        td.addEventListener('pointerleave', () => ChartTooltip.hide());
    });
    return table;
}

function weakLegend() {
    const legend = document.createElement('div');
    legend.className = 'weak-legend';
    legend.innerHTML = 'まちがえた わりあい：' + WEAK_STEPS
        .map(step => `<span><i style="background:${step.color}"></i>${step.label}</span>`).join('')
        + '<span><i class="empty"></i>まだ</span>';
    return legend;
}


// ---------- グラフのふきだし（ツールチップ） ----------

const ChartTooltip = {
    show(event, text) {
        const tip = document.getElementById('chartTooltip');
        tip.textContent = text;
        tip.hidden = false;
        const rect = event.target.getBoundingClientRect();
        const tipWidth = tip.offsetWidth;
        const left = Math.min(Math.max(8, rect.left + rect.width / 2 - tipWidth / 2), window.innerWidth - tipWidth - 8);
        tip.style.left = `${left}px`;
        tip.style.top = `${rect.top + window.scrollY - tip.offsetHeight - 8}px`;
    },
    hide() {
        document.getElementById('chartTooltip').hidden = true;
    },
};


// ---------- ドロップびん（集めたドロップが、ころころ積もる） ----------

const DropJar = {
    BASE_RADIUS: 10.8,      // 基本のドロップ半径（px）
    MAX_VISUAL_BALLS: 350,  // 画面が重くならないための最大表示粒数（これを超えると自動間引き）
    MOVE_MS: 5000,          // アニメーション全体の最大安全タイマー（ミリ秒）
    SETTLE_MS: 1200,        // 玉がびん内に戻ってから物理計算を完全停止するまでの時間（ミリ秒）

    // 跳ね返り：強くぶつかったときだけ、ぶつかった面の向きに跳ね返す（false にすると、跳ね返りのない以前の動きに戻る）
    BOUNCE_ENABLED: true,
    BOUNCE_RESTITUTION: 0.4, // 反発係数（ぶつかる速さの何倍で跳ね返るか）
    BOUNCE_MIN_SPEED: 1.2,   // 跳ね返る速さがこれより小さいときは跳ねない（px／ステップ）
    BOUNCE_MAX_HEIGHT: 2,    // 跳ねる高さの上限（玉の半径の何倍か。2 で玉1つぶん）
    BOUNCE_MAX: 2,           // 1つの玉が跳ねる回数の上限（落ちるたび・飛び出すたびに数えなおす）
    BOUNCE_FRICTION: 0.7,    // 跳ねるとき、面にそった速さをどれだけ残すか
    balls: [],
    images: {},
    running: false,
    heat: 0,                // 連打の勢い
    lastShakeAt: 0,         // 最後にタップした時刻
    jarKick: 0,             // びん自体の揺れ角度
    lidY: 0,                // コルクのふたの浮き上がり量
    lidVy: 0,               // コルクのふたの速度
    lidAngle: 0,            // コルクのふたの傾き角度（ラジアン）
    lidVa: 0,               // コルクのふたの角速度
    lidRocking: false,      // ふたが閉まる瞬間のなじみ中か
    baseR: 10.8,            // 個数に応じて自動調整された現在の基準半径
    mergeQueue: [],         // タッチで1つずつ発動する合体予約リスト
    pendingMerges: 0,       // ユーザーのクリックによって発動待機中の合体数
    mergeCooldown: 0,       // 合体直後の余韻フレーム
    settleBoost: 0,         // 合体直後に素早くピタッと落ち着かせるフレーム数
    settleDeadline: 0,      // 落下後にぷるぷる計算を強制終了する時刻
    activeMerges: [],       // 現在進行中の合体アニメーション
    popEffects: [],         // 「ピカッ！」のフラッシュ＆光の輪エフェクト
    sparkles: [],           // 「キラキラ✨」の星パーティクル

    show(log) {
        const drops = log.filter(e => e.drop).map(e => e.drop);
        const total = drops.length;
        document.getElementById('dropTotal').textContent = `ぜんぶで ${total} こ`;

        const canvas = document.getElementById('dropJar');
        canvas.setAttribute('aria-label', `ドロップびん。ドロップが ${total} こ はいっている`);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.inner = { left: 34, right: canvas.width - 34, top: 46, bottom: canvas.height - 18 };
        this.heat = 0;
        this.jarKick = 0;
        this.lidVy = 0;
        this.lidAngle = (Math.random() < 0.5 ? -1 : 1) * 0.20;
        this.lidVa = 0;
        this.lidRocking = false;
        this.mergeQueue = [];
        this.pendingMerges = 0;
        this.mergeCooldown = 0;
        this.settleBoost = 0;
        this.activeMerges = [];
        this.popEffects = [];
        this.sparkles = [];

        // ページを開くたびに毎回「均一サイズで詰める ＞ 1クリックごとに100玉・1000玉」を準備する
        this.setupBallsAndMerges(drops);
        this.start();
    },

    // 毎回最初はすべて均一な大きさで自然に詰め、クリックごとの「100玉生成 → 10個で1000玉生成」を予約する
    setupBallsAndMerges(drops) {
        const total = drops.length;
        const count100 = Math.floor(total / 100);
        const count1000 = Math.floor(total / 1000);
        const remainder = total % 100;
        const balls = [];

        // 総数が多いときは100個グループも端数も同じ比率で表示粒数を間引き、すべての粒のサイズを完全統一する
        const visualRatio = total > this.MAX_VISUAL_BALLS ? this.MAX_VISUAL_BALLS / total : 1;
        const ballsPer100 = count100 > 0 ? Math.max(12, Math.round(100 * visualRatio)) : 100;
        const remainderBalls = remainder > 0 ? Math.max(1, Math.round(remainder * visualRatio)) : 0;

        const { left, right, top, bottom } = this.inner;
        const cx = (left + right) / 2;

        // 100個ごとの塊を生成（1クリックごとに1つずつ100玉になり、10個たまると次のクリックで1000玉になる）
        for (let bIdx = 0; bIdx < count100; bIdx++) {
            const groupId = `m100_${bIdx}`;
            const startIdx = bIdx * 100;
            for (let m = 0; m < ballsPer100; m++) {
                const k = startIdx + Math.min(99, Math.floor((m * 100) / ballsPer100));
                const ball = this.newBall(drops[k], 1.0, 1);
                ball.mergeGroup = groupId;
                balls.push(ball);
            }
            const offsetX = count100 === 1 ? 0 : ((bIdx % 3) - 1) * 28;
            const offsetY = Math.min(36, Math.floor((bIdx % 10) / 3) * -16);
            this.mergeQueue.push({
                type: 'to100',
                groupId,
                drop: drops[(bIdx + 1) * 100 - 1],
                targetX: cx + offsetX,
                targetY: (top + bottom) / 2 + 20 + offsetY,
            });

            // 100玉が10個揃うごとに、次のクリックで1000玉へ合体する予約を入れる
            if ((bIdx + 1) % 10 === 0) {
                const k1000 = Math.floor(bIdx / 10);
                this.mergeQueue.push({
                    type: 'to1000',
                    drop: drops[(bIdx + 1) * 100 - 1],
                    targetX: cx + (k1000 % 2 === 0 ? -15 : 15) * (count1000 > 1 ? 1 : 0),
                    targetY: (top + bottom) / 2 + 25,
                });
            }
        }

        // 100個未満の端数の通常ドロップ（100個グループと全く同じ大きさ）
        const remStart = count100 * 100;
        for (let m = 0; m < remainderBalls; m++) {
            const k = remStart + Math.min(remainder - 1, Math.floor((m * remainder) / remainderBalls));
            balls.push(this.newBall(drops[k], 1.0, 1));
        }

        this.balls = balls;
        this.updateRadii(true);

        // 新しい最大8個は上から落ちてくる
        const falling = Math.min(8, this.balls.length);
        this.lidY = falling > 0 ? -60 : -22;
        this.lidAngle = (Math.random() < 0.5 ? -1 : 1) * 0.20;
        this.lidVa = 0;
        this.lidRocking = false;

        const packedBalls = this.balls.slice(0, this.balls.length - falling);
        const fallingBalls = this.balls.slice(this.balls.length - falling);

        // 下層のドロップを配置し、画面表示前に物理計算を回して隙間なく落ち着かせ、完全静止させる
        this.packFromBottom(packedBalls);
        this.balls = packedBalls;
        for (let s = 0; s < 65; s++) {
            this.settleStep();
        }
        packedBalls.forEach(b => {
            b.px = b.x;
            b.py = b.y;
            b.va = 0;
            b.settled = true;
            b.calmFrames = 20;
        });

        // 上から落ちてくるドロップを配置
        fallingBalls.forEach((ball, i) => {
            ball.x = left + ball.r + Math.random() * (right - left - ball.r * 2);
            ball.y = top - ball.r * 2 - i * ball.r * 2.8;
            ball.px = ball.x;
            ball.py = ball.y;
            ball.settled = false;
            ball.bounces = 0;
        });

        this.balls = packedBalls.concat(fallingBalls);
    },

    // 実際に表示されている粒の面積合計から基準半径を計算する（extraAreaは合体で増える予定の面積）
    updateRadii(instant = false, extraArea = 0) {
        const visualArea = this.balls.reduce((sum, b) => sum + (b.merging ? 0 : b.scale * b.scale), extraArea);
        if (visualArea > 110) {
            this.baseR = Math.max(4.5, this.BASE_RADIUS * Math.sqrt(110 / visualArea));
        } else {
            this.baseR = this.BASE_RADIUS;
        }
        this.balls.forEach(b => {
            if (b.merging) return;
            b.targetR = this.baseR * b.scale;
            if (instant || !b.r) b.r = b.targetR;
        });
    },

    newBall(drop, scale = 1.0, tier = 1) {
        const src = dropSrc(drop);
        if (!this.images[src]) {
            const img = new Image();
            this.images[src] = { ready: false };
            img.onload = () => {
                const size = 96;
                const offCanvas = document.createElement('canvas');
                offCanvas.width = size;
                offCanvas.height = size;
                offCanvas.getContext('2d').drawImage(img, 0, 0, size, size);
                offCanvas.ready = true;
                this.images[src] = offCanvas;
                this.draw();
            };
            img.src = src;
        }
        const r = this.baseR * scale;
        return {
            src, scale, tier, r, targetR: r,
            x: 0, y: 0, px: 0, py: 0,
            angle: Math.random() * Math.PI * 2, va: 0,
            settled: false, wasHit: false,
            calmFrames: 0, merging: false,
            glow: 0, popTimer: 0,
        };
    },

    // 初期配置：千鳥（ハニカム）＋ランダムな揺らぎを入れて不自然な格子整列を防ぐ
    packFromBottom(balls) {
        const { left, right, bottom } = this.inner;
        const width = right - left;
        let row = 0;
        let y = bottom;

        let idx = 0;
        while (idx < balls.length) {
            const sampleR = balls[idx].r;
            const maxInRow = Math.max(1, Math.floor(width / (sampleR * 2)));
            const countInRow = Math.min(balls.length - idx, maxInRow);
            const rowSpan = countInRow * sampleR * 2;
            const extraSpace = Math.max(0, width - rowSpan);
            const rowOffset = (row % 2 === 1 ? extraSpace * 0.65 : extraSpace * 0.25) + (Math.random() - 0.5) * sampleR * 0.5;
            let x = left + Math.max(0, Math.min(extraSpace, rowOffset));
            let rowHeight = 0;

            for (let c = 0; c < countInRow; c++) {
                const ball = balls[idx++];
                const r = ball.r;
                const jitterX = (Math.random() - 0.5) * r * 0.45;
                const jitterY = (Math.random() - 0.5) * r * 0.35;
                ball.x = Math.min(right - r, Math.max(left + r, x + r + jitterX));
                ball.y = Math.min(bottom - r, y - r + jitterY);
                ball.px = ball.x;
                ball.py = ball.y;
                x += r * 2 + (extraSpace / Math.max(1, countInRow)) * 0.25;
                rowHeight = Math.max(rowHeight, r * 2);
            }
            y -= rowHeight * 0.85;
            row++;
        }
    },

    // 画面表示前に内部で実行する初期馴染ませ用の物理ステップ
    settleStep() {
        const { left, right, bottom } = this.inner;
        const balls = this.balls;
        const cell = Math.max(14, this.baseR * 3.2);

        balls.forEach(b => {
            const vx = (b.x - b.px) * 0.65;
            const vy = (b.y - b.py) * 0.65 + 0.45;
            b.px = b.x;
            b.py = b.y;
            b.x += vx;
            b.y += vy;
        });

        for (let iter = 0; iter < 5; iter++) {
            const grid = new Map();
            balls.forEach((b, i) => {
                const key = `${Math.floor(b.x / cell)},${Math.floor(b.y / cell)}`;
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key).push(i);
            });
            balls.forEach((a, i) => {
                const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        (grid.get(`${cx + dx},${cy + dy}`) || []).forEach(j => {
                            if (j <= i) return;
                            const b = balls[j];
                            const minDist = a.r + b.r;
                            const ox = b.x - a.x, oy = b.y - a.y;
                            const dist2 = ox * ox + oy * oy;
                            if (dist2 >= minDist * minDist || dist2 === 0) return;
                            const dist = Math.sqrt(dist2);
                            const overlap = (minDist - dist) * 0.5;
                            const nx = ox / dist, ny = oy / dist;
                            a.x -= nx * overlap;
                            a.y -= ny * overlap;
                            b.x += nx * overlap;
                            b.y += ny * overlap;
                        });
                    }
                }
            });
            balls.forEach(b => {
                if (b.x < left + b.r) b.x = left + b.r;
                if (b.x > right - b.r) b.x = right - b.r;
                if (b.y > bottom - b.r) b.y = bottom - b.r;
            });
        }
    },

    // 全ドロップの静止状態を解除して動かす
    wakeAllBalls() {
        this.balls.forEach(b => {
            b.settled = false;
            b.calmFrames = 0;
        });
    },

    // びんをタッチ（クリック）したときの処理
    shake() {
        // ① まだ合体していない100個・1000個の塊があるときは、1クリックにつき次の1個だけを合体させる
        if (this.mergeQueue.length > 0 || this.activeMerges.length > 0) {
            if (this.mergeQueue.length > 0) {
                if (this.activeMerges.length === 0) {
                    this.pendingMerges = 1;
                    this.mergeCooldown = 0;
                } else {
                    this.pendingMerges = Math.min(1, this.mergeQueue.length);
                }
            }
            this.jarKick = (Math.random() < 0.5 ? -1 : 1) * 0.035;
            this.start();
            return;
        }

        // ② 合体がすべて終わったあとのタッチは、蓋がポンと開いて全部飛び出す！
        this.wakeAllBalls();
        const now = performance.now();
        const dt = now - (this.lastShakeAt || 0);
        this.lastShakeAt = now;

        if (dt < 450) {
            this.heat = Math.min(12, this.heat + 1.35);
        } else {
            this.heat = Math.max(1.5, this.heat * 0.5 + 1.2);
        }

        this.jarKick = (Math.random() < 0.5 ? -1 : 1) * Math.min(0.08, 0.02 + this.heat * 0.006);
        this.lidVy = -Math.min(24, 8 + this.heat * 2.2);
        this.lidAngle = (Math.random() < 0.5 ? -1 : 1) * 0.22;
        this.lidVa = 0;
        this.lidRocking = false;

        const { bottom } = this.inner;

        this.balls.forEach(ball => {
            const vx = ball.x - ball.px;
            const vy = ball.y - ball.py;
            const depthBonus = Math.max(0, (ball.y - 100) / Math.max(1, bottom - 100)) * 4;
            const weightFactor = ball.scale > 1 ? 0.92 : 1.0;
            const jumpPower = (0.5 + this.heat * 1.35 + Math.random() * (5.5 + this.heat * 1.1) + depthBonus) * weightFactor;

            const newVy = Math.max(-5, Math.min(vy, 0) * 0.65 - jumpPower);
            const sidePower = (Math.random() - 0.5) * (8 + this.heat * 2.2);
            const newVx = Math.max(-18, Math.min(18, vx * 0.8 + sidePower));

            ball.px = ball.x - newVx;
            ball.py = ball.y - newVy;
            ball.va = (Math.random() - 0.5) * (0.25 + this.heat * 0.05);
            ball.wasHit = false;
            ball.bounces = 0;
        });

        this.start();
    },

    start() {
        const now = performance.now();
        this.stopAt = now + this.MOVE_MS;
        this.settleDeadline = now + this.SETTLE_MS;
        this.quietFrames = 0;
        if (this.running) return;
        this.running = true;
        const loop = () => {
            if (!this.running) return;
            this.step();
            this.step();
            this.draw();

            const nowTime = performance.now();
            const { top } = this.inner;
            // 跳ね返りがあるときは、どこにも触れていない玉も「空中」（いちばん高い所で速さが0になっても、そこで止めない）
            const anyInAir = this.balls.some(b => !b.settled && !b.merging
                && (b.y < top || (b.y - b.py) < -1.5 || (this.BOUNCE_ENABLED && !b.wasHit)));
            const isMerging = (this.pendingMerges > 0 && this.mergeQueue.length > 0) || this.activeMerges.length > 0;
            const hasEffects = this.popEffects.length > 0 || this.sparkles.length > 0 || this.balls.some(b => b.glow > 0.01 || b.popTimer > 0);
            const lidMoving = Math.abs(this.lidY) > 0.5 || Math.abs(this.lidVy) > 0.1 || this.lidRocking || Math.abs(this.lidAngle) > 0.006;

            // 空中に玉がある・合体吸引中・ふたが開いている間は物理計算のタイマーを延長する
            if (anyInAir || isMerging || this.lidY < 0) {
                this.settleDeadline = nowTime + this.SETTLE_MS;
                this.stopAt = Math.max(this.stopAt, nowTime + 2800);
            }
            // キラキラエフェクトが出ている間は全体タイマーだけ延長して最後まで綺麗に描画する
            if (hasEffects) {
                this.stopAt = Math.max(this.stopAt, nowTime + 600);
            }

            // 物理計算の締め切り（settleDeadline）を過ぎたら、エフェクト中であっても玉のぷるぷるはピタッと完全停止させる
            if (!anyInAir && !isMerging && nowTime > this.settleDeadline) {
                this.balls.forEach(b => {
                    if (!b.merging) {
                        b.px = b.x;
                        b.py = b.y;
                        b.va = 0;
                        b.settled = true;
                    }
                });
            }

            const ballsMoving = this.balls.some(b => !b.settled && !b.merging);
            const moving = anyInAir || isMerging || lidMoving || ballsMoving || hasEffects;
            this.quietFrames = moving ? 0 : this.quietFrames + 1;

            if ((this.quietFrames > 6 && !anyInAir && !isMerging && !hasEffects && this.lidY === 0 && !this.lidRocking)
                || nowTime > this.stopAt
                || document.getElementById('recordsScreen').style.display === 'none') {
                this.running = false;
                this.jarKick = 0;
                this.lidY = 0;
                this.lidVy = 0;
                this.lidAngle = 0;
                this.lidVa = 0;
                this.lidRocking = false;
                this.popEffects = [];
                this.sparkles = [];
                this.balls.forEach(b => {
                    b.px = b.x;
                    b.py = b.y;
                    b.va = 0;
                    b.glow = 0;
                    b.popTimer = 0;
                    b.settled = true;
                });
                this.draw();
                return;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    // 合体した瞬間に「ピカッ！」のフラッシュと「キラキラ✨」を生成する
    spawnMergeEffects(x, y, baseRadius, is1000, ball) {
        // ① ピカッと光るフラッシュ＆スターバースト光線＆二重リング
        this.popEffects.push({
            x,
            y,
            r: baseRadius * 0.5,
            maxR: baseRadius * (is1000 ? 4.8 : 3.4),
            age: 0,
            maxAge: is1000 ? 76 : 56,
            is1000,
        });

        // ② パッと飛び散るキラキラ✨パーティクル
        const palette = is1000
            ? ['#ffffff', '#fff799', '#ffd700', '#ffae00', '#a8f0ff', '#ffb8e6']
            : ['#ffffff', '#fff9b0', '#ffe066', '#b8f2ff'];

        const burstCount = is1000 ? 26 : 16;
        for (let i = 0; i < burstCount; i++) {
            const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.35;
            const speed = (1.6 + Math.random() * (is1000 ? 3.8 : 2.6));
            const dist = baseRadius * (0.2 + Math.random() * 0.4);
            this.sparkles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.35,
                size: (is1000 ? 5.5 : 4.5) + Math.random() * (is1000 ? 6.5 : 4.5),
                color: palette[i % palette.length],
                rot: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 0.12,
                age: 0,
                delay: 0,
                maxAge: (is1000 ? 110 : 85) + Math.floor(Math.random() * 55), // 約1.5〜2.5秒で消える
                twinkleSpeed: 0.22 + Math.random() * 0.18,
                phase: Math.random() * Math.PI * 2,
                isStar: i % 3 !== 2,
            });
        }

        // ③ 合体したドロップの周りから時間差でふわっと湧き出る余韻のキラキラ（約2秒間）
        const afterCount = is1000 ? 14 : 8;
        for (let i = 0; i < afterCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = baseRadius * (0.55 + Math.random() * 0.75);
            this.sparkles.push({
                followBall: ball,
                offsetX: Math.cos(angle) * dist,
                offsetY: Math.sin(angle) * dist,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -0.25 - Math.random() * 0.35,
                size: (is1000 ? 5.0 : 4.0) + Math.random() * 4.5,
                color: palette[i % palette.length],
                rot: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 0.08,
                age: 0,
                delay: 18 + Math.floor(i * (is1000 ? 9 : 11) + Math.random() * 10),
                maxAge: 65 + Math.floor(Math.random() * 35),
                twinkleSpeed: 0.25 + Math.random() * 0.15,
                phase: Math.random() * Math.PI * 2,
                isStar: true,
            });
        }
    },

    // ユーザーのクリックで許可された分（pendingMerges）だけ1つずつ合体を進める
    updateMerge() {
        // フラッシュ＆光の輪の更新
        this.popEffects.forEach(ef => {
            ef.age++;
            const p = ef.age / ef.maxAge;
            ef.r = ef.maxR * (1 - Math.pow(1 - p, 2.6));
        });
        this.popEffects = this.popEffects.filter(ef => ef.age < ef.maxAge);

        // キラキラ✨パーティクルの更新
        this.sparkles.forEach(sp => {
            if (sp.delay > 0) {
                sp.delay--;
                if (sp.followBall) {
                    sp.x = sp.followBall.x + sp.offsetX;
                    sp.y = sp.followBall.y + sp.offsetY;
                }
                return;
            }
            sp.age++;
            sp.x += sp.vx;
            sp.y += sp.vy;
            sp.vx *= 0.94;
            sp.vy = sp.vy * 0.94 + 0.012; // 空気抵抗でふわっと減速
            sp.rot += sp.vRot;
        });
        this.sparkles = this.sparkles.filter(sp => sp.age < sp.maxAge);

        // 合体した大玉の余韻グローとぷるん演出の更新
        this.balls.forEach(b => {
            if (b.glow > 0) {
                b.glow = Math.max(0, b.glow - 0.0065); // 約2秒間ふんわり輝く
            }
            if (b.popTimer > 0) {
                b.popTimer--;
            }
        });

        if (this.mergeCooldown > 0) {
            this.mergeCooldown--;
        }

        // クリックされた分だけキューから1つ取り出して合体を開始する
        if (this.pendingMerges > 0 && this.mergeQueue.length > 0 && this.activeMerges.length === 0 && this.mergeCooldown <= 0) {
            this.pendingMerges--;
            const next = this.mergeQueue.shift();
            const targets = next.type === 'to100'
                ? this.balls.filter(b => b.mergeGroup === next.groupId && !b.merging)
                : this.balls.filter(b => b.tier === 100 && !b.merging).slice(0, 10);

            if (targets.length > 0) {
                const is1000 = next.type === 'to1000';
                const newScale = is1000 ? 2.0 : 1.5;

                // 合体する粒たちの現在位置の平均を求め、高すぎない自然な位置で合体させる
                const avgY = targets.reduce((s, b) => s + b.y, 0) / targets.length;
                const { left, right, top, bottom } = this.inner;
                const targetR = this.baseR * newScale;
                const cx = Math.min(right - targetR - 4, Math.max(left + targetR + 4, next.targetX));
                const cy = Math.min(bottom - targetR - 8, Math.max(top + 40, Math.max(next.targetY, avgY - 12)));

                this.wakeAllBalls();
                targets.forEach(b => { b.merging = true; });

                // 合体後の玉の分も含めて、集まっている最中に周囲の玉のサイズ変更を先に済ませる
                this.updateRadii(false, newScale * newScale);

                this.activeMerges.push({
                    ...next,
                    targets,
                    cx,
                    cy,
                    targetScale: newScale,
                    timer: 0,
                    duration: 32, // ギュッと集まる時間
                });
            }
        }

        // 進行中の合体アニメーションを更新
        for (let i = this.activeMerges.length - 1; i >= 0; i--) {
            const m = this.activeMerges[i];
            m.timer++;

            if (m.timer <= m.duration) {
                const progress = m.timer / m.duration;
                const pull = 0.11 + progress * progress * 0.28;
                m.targets.forEach(b => {
                    b.x += (m.cx - b.x) * pull;
                    b.y += (m.cy - b.y) * pull;
                    b.px = b.x;
                    b.py = b.y;
                    b.r = Math.max(2.5, b.r * 0.978);
                });
            } else {
                // ピカッ！と合体して1個の大きなドロップに変わる
                const targetSet = new Set(m.targets);
                this.balls = this.balls.filter(b => !targetSet.has(b));

                const is1000 = m.type === 'to1000';
                const newBall = this.newBall(m.drop, m.targetScale, is1000 ? 1000 : 100);
                this.balls.push(newBall);

                // 合体中にスペースもサイズも調整済みなので、物理半径はそのままピタッと出現させる
                this.updateRadii(true);
                this.wakeAllBalls();

                newBall.x = m.cx;
                newBall.y = m.cy;
                newBall.px = m.cx;
                newBall.py = m.cy;
                newBall.r = newBall.targetR;
                newBall.va = 0;
                newBall.glow = 1.0;      // 出現後のキラキラ発光オーラ
                newBall.popTimer = 36;   // 見た目だけぷるんと弾むアニメーション

                this.settleBoost = 22;
                this.settleDeadline = performance.now() + 900; // 物理は0.9秒以内にピタッと静止させる
                this.jarKick = (Math.random() < 0.5 ? -1 : 1) * (is1000 ? 0.045 : 0.028);

                // フラッシュ＆キラキラ✨を生成
                this.spawnMergeEffects(m.cx, m.cy, newBall.targetR, is1000, newBall);

                this.activeMerges.splice(i, 1);
                this.mergeCooldown = 8;
            }
        }
    },

    // 1こま進める：重力で動かしてから、重なりとびんの外を直す
    step() {
        const { left, right, top, bottom } = this.inner;
        const cxJar = (left + right) / 2;
        const balls = this.balls;

        this.updateMerge();

        if (performance.now() - this.lastShakeAt > 250) {
            this.heat = Math.max(0, this.heat * 0.95 - 0.05);
        }
        if (this.settleBoost > 0) {
            this.settleBoost--;
        }

        this.jarKick *= -0.78;
        if (Math.abs(this.jarKick) < 0.001) this.jarKick = 0;

        // 半径の補間（合体吸引中に素早く完了させる）
        let radiusChanging = false;
        balls.forEach(b => {
            if (b.merging) return;
            if (Math.abs(b.r - b.targetR) > 0.05) {
                b.r += (b.targetR - b.r) * 0.45;
                radiusChanging = true;
            } else {
                b.r = b.targetR;
            }
        });

        // コルクのふたの動き（落下中に傾きを整え、着地したら往復振動せずコトンと一発で閉まる）
        //   跳ね返りがあるときは、上向きに動いている玉は、いまの速さで ふたの高さまで届くとき
        //   （いちばん高い所が びんの口より上になるとき）だけ数える（びんの中で跳ねているだけの玉では、ふたは浮かない）
        const anyOut = balls.some(b => {
            if (b.settled || b.merging) return false;
            if (b.y - b.r < top - 4) return true;
            const vy = b.y - b.py;
            if (!this.BOUNCE_ENABLED) return vy < -2.5;
            return vy < -2.5 && b.y - b.r - (vy * vy) / (2 * 0.52) < top - 4;
        });
        if (anyOut || this.heat > 1.0) {
            this.lidRocking = false;
            this.lidVy -= 1.6;
            this.lidY += this.lidVy;
            if (this.lidY <= -60) {
                this.lidY = -60;
                this.lidVy = 0;
            }
            // 閉まりかけていたふたが、びんの口より下に入りこまないようにする
            if (this.BOUNCE_ENABLED && this.lidY > 0) {
                this.lidY = 0;
                this.lidVy = 0;
            }
            const targetTilt = (this.lidAngle >= 0 ? 1 : -1) * 0.20;
            this.lidAngle += (targetTilt - this.lidAngle) * 0.12;
        } else if (this.lidY < 0 || this.lidVy < 0) {
            this.lidRocking = false;
            this.lidVy += 0.65;
            this.lidY += this.lidVy;
            if (this.lidY > -28) {
                this.lidAngle *= 0.82;
            }
            if (this.lidY >= 0) {
                this.lidY = 0;
                this.lidVy = 0;
                this.lidVa = 0;
                this.lidAngle = (this.lidAngle >= 0 ? 1 : -1) * Math.min(0.06, Math.abs(this.lidAngle));
                this.lidRocking = true;
            }
        } else if (this.lidRocking) {
            this.lidAngle *= 0.52;
            if (Math.abs(this.lidAngle) < 0.006) {
                this.lidAngle = 0;
                this.lidVa = 0;
                this.lidRocking = false;
            }
        }

        // 停止時刻（settleDeadline）が近づくにつれて減衰を強め、ぷるぷるを残さず滑らかに完全停止へ導く
        const timeRemaining = Math.max(0, (this.settleDeadline || (performance.now() + 1000)) - performance.now());
        const calmRatio = Math.min(1, timeRemaining / 600);

        // 重力移動（空中の玉は減衰 0.99＋重力 0.52 でスパッと気持ちよく落下させる）
        const activeBalls = [];
        const isShaking = this.heat > 0.5;
        const gravity = 0.52;

        balls.forEach(b => {
            if (b.merging) return;
            activeBalls.push(b);
            b.vinX = 0;        // ぶつかる前の速さ（跳ね返りの計算に使う）
            b.vinY = 0;
            b.impactSpeed = 0; // このステップでいちばん強くぶつかったときの、近づく速さ
            b.impactNx = 0;    // そのときの、玉を押し返す向き
            b.impactNy = 0;
            if (b.settled) {
                b.sx = b.x;
                b.sy = b.y;
                return;
            }

            let dampX = 0.99;
            let dampY = 0.99;
            if (!isShaking && b.wasHit) {
                const baseDamp = this.settleBoost > 0 ? 0.72 : 0.84;
                dampX = baseDamp * (0.4 + 0.6 * calmRatio);
                dampY = Math.min(0.92, (baseDamp + 0.06) * (0.4 + 0.6 * calmRatio));
            }

            const vx = (b.x - b.px) * dampX;
            const vy = (b.y - b.py) * dampY + gravity;
            b.sx = b.x;
            b.sy = b.y;
            b.hit = false;
            b.vinX = vx;
            b.vinY = vy;
            b.x += vx;
            b.y += vy;
        });

        const iterations = isShaking ? 4 : 6;
        const cell = Math.max(14, this.baseR * 3.2);

        for (let iteration = 0; iteration < iterations; iteration++) {
            // 合体進行中の中心点にスペースを空けておき、合体完了時の重なり爆発を防ぐ
            if (this.activeMerges.length > 0) {
                this.activeMerges.forEach(m => {
                    const reserveR = this.baseR * m.targetScale * Math.min(1, (m.timer / m.duration) * 1.05);
                    activeBalls.forEach(b => {
                        const minDist = reserveR + b.r;
                        const ox = b.x - m.cx, oy = b.y - m.cy;
                        const dist2 = ox * ox + oy * oy;
                        if (dist2 >= minDist * minDist || dist2 === 0) return;
                        const dist = Math.sqrt(dist2);
                        const overlap = minDist - dist;
                        b.x += (ox / dist) * overlap * 0.6;
                        b.y += (oy / dist) * overlap * 0.6;
                        b.settled = false;
                        b.hit = true;
                    });
                });
            }

            const grid = new Map();
            activeBalls.forEach((b, i) => {
                if (b.y < -b.r * 4) return;
                const key = `${Math.floor(b.x / cell)},${Math.floor(b.y / cell)}`;
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key).push(i);
            });

            activeBalls.forEach((a, i) => {
                if (a.y < -a.r * 4) return;
                const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        (grid.get(`${cx + dx},${cy + dy}`) || []).forEach(j => {
                            if (j <= i) return;
                            const b = activeBalls[j];
                            if (a.settled && b.settled) return;

                            const minDist = a.r + b.r;
                            let ox = b.x - a.x, oy = b.y - a.y;
                            const dist2 = ox * ox + oy * oy;
                            if (dist2 >= minDist * minDist || dist2 === 0) return;
                            const dist = Math.sqrt(dist2);
                            const overlap = minDist - dist;

                            // 壁際などでほぼ真上に重なっている場合は、衝突解決の中でびんの中央側へわずかに傾けて自然に転がり落とす
                            if (Math.abs(ox) < minDist * 0.22 && Math.abs(oy) > minDist * 0.85) {
                                const upper = a.y < b.y ? a : b;
                                const dirToCenter = upper.x < cxJar ? 1 : -1;
                                ox = (upper === a ? -dirToCenter : dirToCenter) * minDist * 0.22;
                            }

                            const norm = Math.hypot(ox, oy) || 1;
                            const nx = ox / norm, ny = oy / norm;

                            if (overlap > 0.22) {
                                a.settled = false;
                                b.settled = false;
                            }

                            a.hit = true;
                            b.hit = true;
                            // 2つの玉が近づく速さ（いっしょに動いている玉どうしは、近づく速さが小さいので跳ねない）
                            const approach = (a.vinX - b.vinX) * nx + (a.vinY - b.vinY) * ny;
                            this.recordImpact(a, -nx, -ny, approach);
                            this.recordImpact(b, nx, ny, approach);

                            if (a.settled) {
                                b.x += nx * overlap;
                                b.y += ny * overlap;
                            } else if (b.settled) {
                                a.x -= nx * overlap;
                                a.y -= ny * overlap;
                            } else {
                                const ma = a.scale;
                                const mb = b.scale;
                                const totalM = ma + mb;
                                const ratioA = mb / totalM;
                                const ratioB = ma / totalM;
                                a.x -= nx * overlap * ratioA;
                                a.y -= ny * overlap * ratioA;
                                b.x += nx * overlap * ratioB;
                                b.y += ny * overlap * ratioB;
                            }
                        });
                    }
                }
            });

            // びんの壁と底との当たり判定
            activeBalls.forEach(b => {
                if (!b.settled) this.collideWithJar(b);
            });
        }

        // 止まっている玉でも、下から支えられていなければ、また落とす
        //   （支えていた玉が跳ねて離れたとき、空中で止まったままにしない）
        if (this.BOUNCE_ENABLED && this.activeMerges.length === 0) {
            this.wakeUnsupported(activeBalls, cell);
        }

        // 衝突解決後の実移動量から次ステップの速度を更新し、動きが小さい粒は即座に固定してぷるぷるを防ぐ
        activeBalls.forEach(b => {
            b.wasHit = b.hit;
            if (b.settled) return;

            let newVx = b.x - b.sx;
            let newVy = b.y - b.sy;

            // 強くぶつかったときは、ぶつかった面の向きに跳ね返す
            const bounced = this.applyBounce(b, gravity);
            if (bounced) {
                newVx = bounced.vx;
                newVy = bounced.vy;
            }

            if (!isShaking && b.hit && !bounced) {
                if (newVy < 0) newVy *= 0.35;
                if (b.y >= bottom - b.r - 0.5) {
                    newVx *= 0.72;
                } else {
                    newVx *= 0.82;
                }

                const settleThreshold = 0.25 + (1 - calmRatio) * 0.35;
                const spd = Math.hypot(newVx, newVy);
                if (!radiusChanging && this.activeMerges.length === 0 && b.y >= top && spd < settleThreshold) {
                    b.x = b.sx;
                    b.y = b.sy;
                    b.px = b.sx;
                    b.py = b.sy;
                    b.va = 0;
                    b.calmFrames = (b.calmFrames || 0) + 1;
                    if (b.calmFrames > 2) {
                        b.settled = true;
                    }
                    return;
                }
            }

            b.calmFrames = 0;
            b.px = b.x - newVx;
            b.py = b.y - newVy;

            // はっきり動いているときだけ回転させる
            const speed = Math.hypot(newVx, newVy);
            if (Math.abs(b.va) > 0.005) {
                b.angle += b.va;
                b.va *= isShaking ? 0.92 : 0.65;
            } else if (speed > 1.1) {
                b.angle += newVx * 0.035;
            } else {
                b.va = 0;
            }

            if (b.y < -950 && b.y < b.py) {
                b.py = b.y + (b.py - b.y) * 0.5;
            }
        });
    },

    // びんの壁と底に当たったら、びんの中に押し戻す（ぶつかった面の向きも覚えておく）
    collideWithJar(b) {
        const { left, right, top, bottom } = this.inner;
        const r = b.r;
        if (b.y >= top - r) {
            if (b.x < left + r) {
                this.recordImpact(b, 1, 0, -b.vinX);
                b.x = left + r;
                b.hit = true;
            }
            if (b.x > right - r) {
                this.recordImpact(b, -1, 0, b.vinX);
                b.x = right - r;
                b.hit = true;
            }
            if (b.y > bottom - r) {
                this.recordImpact(b, 0, -1, b.vinY);
                b.y = bottom - r;
                b.hit = true;
            }
        } else {
            const funnelMargin = Math.min(28, Math.max(0, (top - b.y) * 0.12));
            const minX = left + r - funnelMargin;
            const maxX = right - r + funnelMargin;
            if (b.x < minX) b.x = minX;
            if (b.x > maxX) b.x = maxX;
        }
    },

    // 止まっている玉のうち、底にも、下にある玉にも触れていないものを、また動かす
    wakeUnsupported(balls, cell) {
        const { bottom } = this.inner;
        const grid = new Map();
        balls.forEach((b, i) => {
            const key = `${Math.floor(b.x / cell)},${Math.floor(b.y / cell)}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(i);
        });
        balls.forEach(a => {
            if (!a.settled || a.y + a.r >= bottom - 1) return;
            const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (const j of grid.get(`${cx + dx},${cy + dy}`) || []) {
                        const b = balls[j];
                        if (b === a || b.y <= a.y + 0.5) continue;
                        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 1) return; // 下の玉に支えられている
                    }
                }
            }
            a.settled = false;
            a.calmFrames = 0;
        });
    },

    // ぶつかったことを覚えておく（nx, ny：玉を押し返す向き、speed：近づく速さ）。いちばん強いものだけ残す
    recordImpact(b, nx, ny, speed) {
        if (speed > b.impactSpeed) {
            b.impactSpeed = speed;
            b.impactNx = nx;
            b.impactNy = ny;
        }
    },

    // 跳ね返り：落ちてきて強くぶつかったときだけ、ぶつかった面の向きに跳ね返す速さを返す（跳ねないときは null）
    //   跳ねる高さは玉1つぶんまで。跳ねるたびに弱くなり、BOUNCE_MIN_SPEED より小さくなったら、いつもの「止める」処理にまかせる
    applyBounce(b, gravity) {
        if (!this.BOUNCE_ENABLED || !b.hit || (b.bounces || 0) >= this.BOUNCE_MAX) return null;
        if (b.vinY <= 0 || b.impactSpeed <= 0) return null; // 上に向かって動いている玉は跳ねない（落ちてきたときだけ）
        const nx = b.impactNx, ny = b.impactNy;
        if (ny > 0) return null;                             // 下向きに押し返される（上にある玉に当たった）ときは跳ねない
        const inSpeed = b.impactSpeed;
        const maxOut = Math.sqrt(2 * gravity * this.BOUNCE_MAX_HEIGHT * b.r);
        const outSpeed = Math.min(inSpeed * this.BOUNCE_RESTITUTION, maxOut);
        if (outSpeed < this.BOUNCE_MIN_SPEED) return null;
        b.bounces = (b.bounces || 0) + 1;
        // 面にそった速さは、ぶつかる前の速さから少し弱めて残し、面の向きには outSpeed で跳ね返す
        //   （めりこみを押し戻したときの動きは使わない。使うと、横に飛びすぎる）
        const tx = (b.vinX + inSpeed * nx) * this.BOUNCE_FRICTION;
        const ty = (b.vinY + inSpeed * ny) * this.BOUNCE_FRICTION;
        // 面にそった速さも、跳ねる速さの上限より大きくしない（斜めにぶつかった玉が、横に飛びすぎないように）
        const tLen = Math.hypot(tx, ty);
        const tScale = tLen > maxOut ? maxOut / tLen : 1;
        return { vx: tx * tScale + outSpeed * nx, vy: ty * tScale + outSpeed * ny };
    },

    // キラキラの4つ角スター（✨）を描画するヘルパー
    drawSparkleStar(ctx, x, y, size, rot, color, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // 中心のふんわりした光彩
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.3);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.45, color);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // シャープな4つ角の星（✨）
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const outer = size;
        const inner = size * 0.22;
        for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2;
            const nextAng = ang + Math.PI / 4;
            if (i === 0) ctx.moveTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
            else ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
            ctx.lineTo(Math.cos(nextAng) * inner, Math.sin(nextAng) * inner);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },

    draw() {
        const { ctx, canvas } = this;
        const { left, right, top, bottom } = this.inner;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        if (this.jarKick !== 0) {
            const cx = canvas.width / 2;
            const cy = (top + bottom) / 2;
            ctx.translate(cx, cy);
            ctx.rotate(this.jarKick);
            ctx.translate(-cx, -cy);
        }

        // びん（うしろ側）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        roundRect(ctx, left - 10, top - 14, right - left + 20, bottom - top + 26, 26);
        ctx.fill();

        // 合体に向けてギュッと集まっている最中の中心の光の予兆
        this.activeMerges.forEach(m => {
            const p = m.timer / m.duration;
            const glowR = this.baseR * m.targetScale * (0.4 + p * 1.3);
            const grad = ctx.createRadialGradient(m.cx, m.cy, 0, m.cx, m.cy, glowR);
            grad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * p})`);
            grad.addColorStop(0.5, m.type === 'to1000' ? `rgba(255, 215, 0, ${0.55 * p})` : `rgba(255, 245, 160, ${0.45 * p})`);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.save();
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(m.cx, m.cy, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // ドロップの描画
        this.balls.forEach(b => {
            const r = b.r;
            if (b.y < -r * 2) return;
            const img = this.images[b.src];
            if (!img || !img.ready) return;

            // 合体直後の大玉は見た目だけ少しぷるんと弾ませる（物理半径は変えないので周りは揺れない）
            let drawR = r;
            if (b.popTimer > 0) {
                const t = 1 - b.popTimer / 36;
                drawR = r * (1 + Math.sin(t * Math.PI * 2.5) * 0.25 * (1 - t));
            }

            ctx.save();
            ctx.translate(b.x, b.y);

            // 合体して生まれた大玉の背後で数秒間輝く余韻オーラ
            if (b.glow > 0.01) {
                const auraR = drawR * (1.75 + Math.sin(b.glow * 18) * 0.12);
                const aura = ctx.createRadialGradient(0, 0, drawR * 0.4, 0, 0, auraR);
                aura.addColorStop(0, b.tier === 1000 ? `rgba(255, 235, 110, ${b.glow * 0.85})` : `rgba(255, 255, 210, ${b.glow * 0.75})`);
                aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(0, 0, auraR, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.rotate(b.angle);
            ctx.drawImage(img, -drawR, -drawR, drawR * 2, drawR * 2);

            // 1.5倍・2倍の記念ドロップにはツヤの縁取りを添える
            if (b.tier >= 100) {
                ctx.beginPath();
                ctx.arc(0, 0, drawR - 1, 0, Math.PI * 2);
                ctx.strokeStyle = b.tier === 1000 ? 'rgba(255, 230, 80, 0.9)' : 'rgba(255, 255, 255, 0.75)';
                ctx.lineWidth = b.tier === 1000 ? 2.8 : 2.0;
                ctx.stroke();
            }
            ctx.restore();
        });

        // 「ピカッ！」と合体した瞬間のフラッシュ・クロス光線・二重リング
        this.popEffects.forEach(ef => {
            const p = ef.age / ef.maxAge;
            ctx.save();

            // ① 中心の強いフラッシュ（最初の瞬間ピカッと光る）
            if (p < 0.45) {
                const flashAlpha = (1 - p / 0.45);
                const flashR = ef.maxR * (0.65 + p * 0.8);
                const grad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, flashR);
                grad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
                grad.addColorStop(0.4, ef.is1000 ? `rgba(255, 230, 90, ${flashAlpha * 0.85})` : `rgba(255, 250, 190, ${flashAlpha * 0.75})`);
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(ef.x, ef.y, flashR, 0, Math.PI * 2);
                ctx.fill();
            }

            // ② 放射状に伸びるスターバースト光線
            if (p < 0.6) {
                const rayAlpha = (1 - p / 0.6) * 0.95;
                const rayLen = ef.maxR * (0.75 + p * 0.75);
                const rayWidth = ef.is1000 ? 4.5 : 3.2;
                const rays = ef.is1000 ? 8 : 4;
                ctx.save();
                ctx.translate(ef.x, ef.y);
                ctx.rotate(p * 0.35);
                ctx.globalAlpha = rayAlpha;
                ctx.fillStyle = '#ffffff';
                for (let rIdx = 0; rIdx < rays; rIdx++) {
                    ctx.save();
                    ctx.rotate((rIdx * Math.PI) / (rays / 2));
                    const len = rIdx % 2 === 1 ? rayLen * 0.68 : rayLen;
                    ctx.beginPath();
                    ctx.moveTo(0, -rayWidth);
                    ctx.lineTo(len, 0);
                    ctx.lineTo(0, rayWidth);
                    ctx.lineTo(-len, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                ctx.restore();
            }

            // ③ 外側へ広がる二重の光のリング
            const ringAlpha = Math.pow(1 - p, 1.5);
            ctx.beginPath();
            ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
            ctx.strokeStyle = ef.is1000 ? '#ffd700' : '#ffffff';
            ctx.globalAlpha = ringAlpha;
            ctx.lineWidth = (ef.is1000 ? 5.5 : 4.0) * (1 - p * 0.6);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(ef.x, ef.y, ef.r * 0.72, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = ringAlpha * 0.75;
            ctx.lineWidth = 2.2 * (1 - p * 0.5);
            ctx.stroke();

            ctx.restore();
        });

        // 「キラキラ✨」パーティクルの描画
        this.sparkles.forEach(sp => {
            if (sp.delay > 0) return;
            const p = sp.age / sp.maxAge;
            const fade = p < 0.15 ? p / 0.15 : Math.pow(1 - (p - 0.15) / 0.85, 1.3);
            const twinkle = 0.55 + 0.45 * Math.sin(sp.age * sp.twinkleSpeed + sp.phase);
            const alpha = fade * twinkle;
            if (alpha <= 0.02) return;

            const curSize = sp.size * (0.65 + 0.35 * twinkle) * (1 - p * 0.3);
            if (sp.isStar) {
                this.drawSparkleStar(ctx, sp.x, sp.y, curSize, sp.rot, sp.color, alpha);
            } else {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = sp.color;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, curSize * 0.45, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });

        // びん（ガラスのふち）
        ctx.strokeStyle = 'rgba(120, 160, 190, 0.9)';
        ctx.lineWidth = 4;
        roundRect(ctx, left - 10, top - 14, right - left + 20, bottom - top + 26, 26);
        ctx.stroke();

        // コルクのふた（傾きに応じてビンの口の上端を支点に斜めに浮き上がらせて描画）
        const lidW = right - left + 8;
        const lidH = 18;
        const lidBaseY = top - 34 + this.lidY;
        if (lidBaseY > -45) {
            const lidCx = (left + right) / 2;
            const rockLift = Math.abs(Math.sin(this.lidAngle)) * (lidW * 0.42);
            const lidCy = lidBaseY + lidH / 2 - rockLift;

            ctx.save();
            ctx.translate(lidCx, lidCy);
            ctx.rotate(this.lidAngle);
            ctx.fillStyle = '#e8a87c';
            roundRect(ctx, -lidW / 2, -lidH / 2, lidW, lidH, 6);
            ctx.fill();
            ctx.restore();
        }

        // びんのガラスのツヤ
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        roundRect(ctx, left - 2, top + 10, 8, bottom - top - 40, 4);
        ctx.fill();

        ctx.restore();
    },
};

function roundRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

// PCのクリックでもiPad・スマホの高速連打でも拡大されずに気持ちよく反応させる設定
const dropJarEl = document.getElementById('dropJar');

// ① CSSでiPadのダブルタップ拡大・長押し選択を無効化
dropJarEl.style.touchAction = 'none';
dropJarEl.style.webkitUserSelect = 'none';
dropJarEl.style.userSelect = 'none';

// ② タッチ端末（iPad / iPhone / Android）は touchstart で即座に拡大を阻止して反応させる（合体 → ぜんぶ合体したら ふたが開く）
dropJarEl.addEventListener('touchstart', (e) => {
    e.preventDefault(); // iPadのダブルタップ拡大を完全に防ぐ
    DropJar.shake();
}, { passive: false });

// ③ PCのマウスクリック用（タッチのときは ② が動くので二重に反応しないようにする）
dropJarEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    DropJar.shake();
});
document.getElementById('calPrev').addEventListener('click', () => Records.moveMonth(-1));
document.getElementById('calNext').addEventListener('click', () => Records.moveMonth(1));