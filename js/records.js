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
                img.src = dropSrc(drop, true);
                img.alt = '';
                box.appendChild(img);
            });
            if (drops.length > shown.length) {
                box.insertAdjacentHTML('beforeend', `<span class="calendar-more">+${drops.length - shown.length}</span>`);
            }
            cell.appendChild(box);
            // マスがせまいときは、ドロップを並べるかわりに「さいごのドロップ ×こ数」を出す（css/records.css）
            if (drops.length > 0) {
                cell.insertAdjacentHTML('beforeend',
                    `<div class="calendar-count"><img src="${dropSrc(drops[drops.length - 1], true)}" alt="">×${drops.length}</div>`);
            }
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
            button.dataset.mode = mode.id; // モードごとの色（css/records.css）
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
    lidRocking: false,      // ふたが落ちてきて、まだ おさまっていないか
    lidHits: 0,             // ふたの角が、口のふちに当たった回数（開くたびに数えなおす）
    lidBounced: false,      // ふたが口にはまって、小さく跳ねたか
    LID_PLUG: 14,           // コルクの、口に差しこむ部分の長さ（px）
    CORK_H: 28,             // コルクの、上の太い部分の高さ（px）
    LID_ALIGN: 0.07,        // これより傾いていると、口のふちに当たって跳ねかえる（ラジアン）
    LID_MAX_HITS: 3,        // ふちに当たって跳ねかえるのは、この回数まで（そのあとは すべりこむ）
    baseR: 10.8,            // 個数に応じて自動調整された現在の基準半径
    mergeQueue: [],         // タッチで1つずつ発動する合体予約リスト
    UNPACK_GROW: 0.06,      // ほどけて生まれた粒が ふくらむ速さ（1ステップで のこりの何わり）
    pendingMerges: 0,       // ユーザーのクリックによって発動待機中の合体数
    mergeCooldown: 0,       // 合体直後の余韻フレーム
    settleBoost: 0,         // 合体直後に素早くピタッと落ち着かせるフレーム数
    settleDeadline: 0,      // 落下後にぷるぷる計算を強制終了する時刻
    activeMerges: [],       // 現在進行中の合体アニメーション
    popEffects: [],         // 「ピカッ！」のフラッシュ＆光の輪エフェクト
    shards: [],             // 「パキーン！」と飛びちる、ガラスのかけら
    fxTexts: [],            // 「100!」「500!」「1000!」の文字
    hitStop: 0,             // 合体の瞬間に、ほんの少し 時間を止めるコマ数（ヒットストップ）
    flash: 0,               // びん全体が光る強さ（100玉は白、500玉はピンク、1000玉は金色）
    flashColor: '255, 255, 255',
    quake: 0,               // びん全体がゆれる強さ（px）
    fxFrame: 0,             // ゆれの計算に使うコマ番号
    // 合体の演出（100玉 → 500玉 → 1000玉 と、大きな玉ほど 派手で大きく）
    //   tier：できる玉の種類、scale：できる玉の大きさ（ふつうの粒の何倍か）、from・count：あつめる玉の種類と数（100玉は100こ分の粒のかたまり）
    //   gather：集まる時間（ステップ）、gatherQuake：集まるときの ふるえ、hitStop：止めるコマ数、flash：びん全体の光、quake：びんのゆれ、kick：びんの傾き
    //   push：まわりの玉を押しのける強さ、maxR：衝撃波の大きさ（玉の半径の何倍か）、waves：衝撃波の数、rays：光線の数、lines：集中線の数
    //   shards：ガラスのかけらの数、sparkles：キラキラの数、after：あとから湧く余韻のキラキラの数、textSize：「100!」などの文字の大きさ
    FX: {
        to100: {
            tier: 100, scale: 1.5,
            gather: 34, gatherQuake: 2.0, hitStop: 3, flash: 0.7, quake: 6, kick: 0.045, push: 2.6,
            maxR: 4.6, popAge: 60, ring: 4.0, wave: 9, waves: 1, rays: 8, rayWidth: 3.2, ringReach: 5, lines: 10, lineWidth: 2,
            shards: 14, shardSpeed: 4, shardLen: 7,
            sparkles: 22, sparkSpeed: 3.6, sparkSize: 4.5, sparkAge: 85, after: 8, afterGap: 11,
            text: '100!', textSize: 26, textAge: 85, rimWidth: 2.0,
            color: {
                glow: '255, 248, 175', ring: '#ffffff', line: '#ffffff', wave: '#e8fbff', aura: '255, 255, 210', flash: '255, 255, 255',
                rim: 'rgba(255, 255, 255, 0.75)', textStroke: '#1f7fbf', textFill: '#ffffff',
                shards: ['#ffffff', '#e6fbff', '#b8f2ff', '#fffbe0'],
                sparkles: ['#ffffff', '#fff9b0', '#ffe066', '#b8f2ff'],
            },
        },
        to500: {
            tier: 500, scale: 1.75, from: 100, count: 5,
            gather: 42, gatherQuake: 2.8, hitStop: 5, flash: 0.85, quake: 9, kick: 0.06, push: 3.6,
            maxR: 6.0, popAge: 72, ring: 5.0, wave: 11, waves: 2, rays: 12, rayWidth: 4.0, ringReach: 6.5, lines: 14, lineWidth: 2.4,
            shards: 24, shardSpeed: 4.8, shardLen: 8.5,
            sparkles: 34, sparkSpeed: 4.8, sparkSize: 5.2, sparkAge: 100, after: 12, afterGap: 10,
            text: '500!', textSize: 32, textAge: 100, rimWidth: 2.5,
            color: {
                glow: '255, 175, 225', ring: '#ff8fd8', line: '#ffd1f0', wave: '#ffe0f4', aura: '255, 190, 235', flash: '255, 228, 246',
                rim: 'rgba(255, 140, 215, 0.9)', textStroke: '#c2187a', textFill: '#ffd6f2',
                shards: ['#ffffff', '#ffe0f4', '#ff9fdc', '#e6d4ff'],
                sparkles: ['#ffffff', '#ffd1f0', '#ff8fd8', '#c9a8ff', '#b8f2ff'],
            },
        },
        to1000: {
            tier: 1000, scale: 2.0, from: 500, count: 2,
            gather: 54, gatherQuake: 4.0, hitStop: 8, flash: 1.0, quake: 14, kick: 0.085, push: 5.0,
            maxR: 8.0, popAge: 92, ring: 6.5, wave: 14, waves: 3, rays: 20, rayWidth: 5.2, ringReach: 8.5, lines: 20, lineWidth: 3.0,
            shards: 38, shardSpeed: 5.5, shardLen: 10,
            sparkles: 52, sparkSpeed: 6.0, sparkSize: 6.0, sparkAge: 120, after: 20, afterGap: 8,
            text: '1000!', textSize: 40, textAge: 120, rimWidth: 3.0,
            color: {
                glow: '255, 220, 60', ring: '#ffd700', line: '#fff3a0', wave: '#fff0a0', aura: '255, 235, 110', flash: '255, 244, 190',
                rim: 'rgba(255, 230, 80, 0.9)', textStroke: '#c45a00', textFill: '#ffe14d',
                shards: ['#ffffff', '#fff3a0', '#ffd700', '#ffe9b0'],
                sparkles: ['#ffffff', '#fff799', '#ffd700', '#ffae00', '#a8f0ff', '#ffb8e6'],
            },
        },
    },
    sparkles: [],           // 「キラキラ✨」の星パーティクル

    // settled：テーブルから びんに もどったときは、上から落ちてくる粒なしで、ふたも しまった状態から はじめる（js/drop-table.js）
    show(log, settled = false) {
        const drops = log.filter(e => e.drop).map(e => e.drop);
        const total = drops.length;
        this.drops = drops;     // びんをたおしたとき（js/drop-table.js）に使う
        document.getElementById('dropTotal').textContent = `ぜんぶで ${total} こ`;

        const canvas = document.getElementById('dropJar');
        canvas.setAttribute('aria-label', `ドロップびん。ドロップが ${total} こ はいっている`);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.inner = { left: 34, right: canvas.width - 34, top: 46, bottom: canvas.height - 18 };
        this.buildJarShape();
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
        this.shards = [];
        this.fxTexts = [];
        this.hitStop = 0;
        this.flash = 0;
        this.quake = 0;

        // ページを開くたびに毎回「均一サイズで詰める ＞ 1クリックごとに100玉・500玉・1000玉」を準備する
        this.setupBallsAndMerges(drops, settled);
        this.start();
    },

    // 毎回最初はすべて均一な大きさで自然に詰め、クリックごとの「100玉生成 → 100玉5個で500玉 → 500玉2個で1000玉」を予約する
    setupBallsAndMerges(drops, settled = false) {
        const total = drops.length;
        const count100 = Math.floor(total / 100);
        const count500 = Math.floor(total / 500);
        const count1000 = Math.floor(total / 1000);
        const remainder = total % 100;
        const balls = [];

        // 総数が多いときは100個グループも端数も同じ比率で表示粒数を間引き、すべての粒のサイズを完全統一する
        const visualRatio = total > this.MAX_VISUAL_BALLS ? this.MAX_VISUAL_BALLS / total : 1;
        const ballsPer100 = count100 > 0 ? Math.max(12, Math.round(100 * visualRatio)) : 100;
        const remainderBalls = remainder > 0 ? Math.max(1, Math.round(remainder * visualRatio)) : 0;

        const { left, right, top, bottom } = this.inner;
        const cx = (left + right) / 2;

        // 100個ごとの塊を生成（1クリックごとに1つずつ100玉になり、5個たまると次のクリックで500玉、500玉が2個たまると次のクリックで1000玉になる）
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

            // 100玉が5個揃うごとに、次のクリックで500玉へ合体する予約を入れる
            if ((bIdx + 1) % 5 === 0) {
                const k500 = Math.floor(bIdx / 5);
                this.mergeQueue.push({
                    type: 'to500',
                    drop: drops[(bIdx + 1) * 100 - 1],
                    targetX: cx + (k500 % 2 === 0 ? -15 : 15) * (count500 > 1 ? 1 : 0),
                    targetY: (top + bottom) / 2 + 22,
                });
            }

            // 500玉が2個揃うごとに、次のクリックで1000玉へ合体する予約を入れる
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
        //   間引いているときは、1つぶが何こ分かを packed に覚えておき、合体のたびに少しずつ「ほどく」（unpackSome）
        const remStart = count100 * 100;
        for (let m = 0; m < remainderBalls; m++) {
            const from = remStart + Math.floor((m * remainder) / remainderBalls);
            const to = remStart + Math.floor(((m + 1) * remainder) / remainderBalls);
            const ball = this.newBall(drops[from], 1.0, 1);
            if (to - from > 1) ball.packed = drops.slice(from + 1, to);
            balls.push(ball);
        }

        this.balls = balls;
        this.updateRadii(true);

        // 新しい最大8個は上から落ちてくる
        const falling = settled ? 0 : Math.min(8, this.balls.length);
        this.lidY = settled ? 0 : falling > 0 ? -60 : -22;
        this.lidAngle = settled ? 0 : (Math.random() < 0.5 ? -1 : 1) * 0.20;
        this.lidVa = 0;
        this.lidRocking = false;
        this.lidHits = 0;
        this.lidBounced = false;

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
            ball.x = this.jar.cx - (this.jar.nw - ball.r) + Math.random() * (this.jar.nw - ball.r) * 2; // 口の上から落ちてくる
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
        const src = this.loadImage(drop);
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

    // ドロップの絵を読みこんでおく（読みこめたら this.images[src] が ready になる）。src を返す
    loadImage(drop) {
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
        return src;
    },

    // ふた（口のふちより上）をタッチしたか（clientX, clientY は画面の座標）
    hitsLid(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left) * this.canvas.width / rect.width;
        const y = (clientY - rect.top) * this.canvas.height / rect.height;
        const { cx, nw, wall, rimTop } = this.jar;
        return y < rimTop + 12 && Math.abs(x - cx) < nw + wall + 14;
    },

    // たおしたびんの絵（中身も ふたもない、からっぽのびん）
    emptyJarImage() {
        const off = document.createElement('canvas');
        off.width = this.canvas.width;
        off.height = this.canvas.height;
        const keys = ['canvas', 'ctx', 'balls', 'activeMerges', 'popEffects', 'sparkles', 'shards', 'fxTexts', 'lidY', 'flash', 'quake', 'jarKick'];
        const saved = {};
        keys.forEach(k => { saved[k] = this[k]; });
        Object.assign(this, {
            canvas: off, ctx: off.getContext('2d'), balls: [], activeMerges: [], popEffects: [], sparkles: [], shards: [], fxTexts: [],
            lidY: -1000, flash: 0, quake: 0, jarKick: 0,
        });
        this.draw();
        Object.assign(this, saved);
        return off;
    },

    // コルクのふたを、まんなかを (0, 0) にして描く（part：'plug' 口に差しこむ部分 / 'top' 上の太い部分）
    drawCork(ctx, part) {
        const { nw, wall } = this.jar;
        const corkW = nw + wall + 6;
        const corkH = this.CORK_H;
        if (part === 'plug') {
            ctx.fillStyle = 'rgba(200, 150, 100, 0.55)';
            ctx.fillRect(-nw, corkH / 2 - 4, nw * 2, 20);
            return;
        }
        const g = ctx.createLinearGradient(0, -corkH / 2, 0, corkH / 2);
        g.addColorStop(0, '#d9a36b');
        g.addColorStop(1, '#b8834f');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-corkW, -corkH / 2 + 3);
        ctx.quadraticCurveTo(-corkW, -corkH / 2, -corkW + 4, -corkH / 2);
        ctx.lineTo(corkW - 4, -corkH / 2);
        ctx.quadraticCurveTo(corkW, -corkH / 2, corkW, -corkH / 2 + 3);
        ctx.lineTo(corkW - 3, corkH / 2);
        ctx.lineTo(-corkW + 3, corkH / 2);
        ctx.closePath();
        ctx.fill();
        // コルクのつぶつぶ
        ctx.fillStyle = 'rgba(120, 80, 40, 0.35)';
        for (let i = 0; i < 70; i++) {
            ctx.fillRect(-corkW + 4 + ((i * 37) % (corkW * 2 - 8)), -corkH / 2 + 3 + ((i * 13) % (corkH - 6)), 2, 1.5);
        }
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
            balls.forEach(b => this.collideWithJar(b, false));
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
        // ① まだ合体していない100個・500個・1000個の塊があるときは、1クリックにつき次の1個だけを合体させる
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
        this.lidRocking = false;
        this.lidHits = 0;
        this.lidBounced = false;

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
            // ヒットストップのあいだは、動きを止めて 光だけ見せる
            if (this.hitStop > 0) {
                this.hitStop--;
            } else {
                this.step();
                this.step();
            }
            this.fxFrame++;
            this.flash = this.flash > 0.02 ? this.flash * (this.hitStop > 0 ? 0.97 : 0.84) : 0;
            this.quake = this.quake > 0.3 ? this.quake * 0.86 : 0;
            this.draw();

            const nowTime = performance.now();
            const { top } = this.inner;
            // 跳ね返りがあるときは、どこにも触れていない玉も「空中」（いちばん高い所で速さが0になっても、そこで止めない）
            const anyInAir = this.balls.some(b => !b.settled && !b.merging
                && (b.y < top || (b.y - b.py) < -1.5 || (this.BOUNCE_ENABLED && !b.wasHit)));
            // ほどけて生まれた粒が ふくらんでいるあいだも、止めない（止めると 小さいまま残る）
            const isMerging = (this.pendingMerges > 0 && this.mergeQueue.length > 0) || this.activeMerges.length > 0
                || this.balls.some(b => b.grow > 0);
            const hasEffects = this.popEffects.length > 0 || this.sparkles.length > 0 || this.shards.length > 0 || this.fxTexts.length > 0
                || this.hitStop > 0 || this.flash > 0 || this.quake > 0 || this.balls.some(b => b.glow > 0.01 || b.popTimer > 0);
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
                this.shards = [];
                this.fxTexts = [];
                this.flash = 0;
                this.quake = 0;
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

    // 合体した瞬間に「ピカッ！」のフラッシュと「キラキラ✨」を生成する（fx は FX.to100 など）
    spawnMergeEffects(x, y, baseRadius, fx, ball) {
        // ① ピカッと光るフラッシュ＆スターバースト光線＆衝撃波
        this.popEffects.push({
            x,
            y,
            r: baseRadius * 0.5,
            maxR: baseRadius * fx.maxR,
            age: 0,
            maxAge: fx.popAge,
            fx,
        });

        // ② パッと飛び散るキラキラ✨パーティクル
        const palette = fx.color.sparkles;
        const burstCount = fx.sparkles;
        for (let i = 0; i < burstCount; i++) {
            const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.35;
            const speed = 2.4 + Math.random() * fx.sparkSpeed;
            const dist = baseRadius * (0.2 + Math.random() * 0.4);
            this.sparkles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.35,
                size: fx.sparkSize * (1 + Math.random()),
                color: palette[i % palette.length],
                rot: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 0.12,
                age: 0,
                delay: 0,
                maxAge: fx.sparkAge + Math.floor(Math.random() * 55), // 約1.5〜3秒で消える
                twinkleSpeed: 0.22 + Math.random() * 0.18,
                phase: Math.random() * Math.PI * 2,
                isStar: i % 3 !== 2,
            });
        }

        // ③ 合体したドロップの周りから時間差でふわっと湧き出る余韻のキラキラ（約2秒間）
        for (let i = 0; i < fx.after; i++) {
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
                size: fx.sparkSize - 0.5 + Math.random() * 4.5,
                color: palette[i % palette.length],
                rot: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 0.08,
                age: 0,
                delay: 18 + Math.floor(i * fx.afterGap + Math.random() * 10),
                maxAge: 65 + Math.floor(Math.random() * 35),
                twinkleSpeed: 0.25 + Math.random() * 0.15,
                phase: Math.random() * Math.PI * 2,
                isStar: true,
            });
        }
    },

    // 「パキーン！」と飛びちる ガラスのかけらと、「100!」「500!」「1000!」の文字
    spawnShards(x, y, baseRadius, fx) {
        const colors = fx.color.shards;
        for (let i = 0; i < fx.shards; i++) {
            const angle = (Math.PI * 2 * i) / fx.shards + (Math.random() - 0.5) * 0.5;
            const speed = fx.shardSpeed * (1 + Math.random());
            this.shards.push({
                x: x + Math.cos(angle) * baseRadius * 0.6,
                y: y + Math.sin(angle) * baseRadius * 0.6,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.2,
                rot: angle,
                vr: (Math.random() - 0.5) * 0.5,
                len: fx.shardLen * (1 + Math.random()),
                color: colors[i % colors.length],
                age: 0,
                maxAge: 40 + Math.floor(Math.random() * 25),
            });
        }
        this.fxTexts.push({ x, y: y - baseRadius - 10, text: fx.text, fx, age: 0, maxAge: fx.textAge });
    },

    // 衝撃波：合体した玉のまわりの玉を、外へ はじきとばす（近いほど強く）
    pushAway(x, y, center, power) {
        const reach = center.targetR * 4;
        this.balls.forEach(b => {
            if (b === center || b.merging) return;
            const dx = b.x - x, dy = b.y - y;
            const d = Math.hypot(dx, dy);
            if (d === 0 || d > reach) return;
            const k = power * (1 - d / reach);
            b.settled = false;
            b.calmFrames = 0;
            b.bounces = 0;
            b.px = b.x - (dx / d) * k;
            b.py = b.y - (dy / d) * k - k * 0.3; // 少し上向きに
        });
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

        // ガラスのかけら（回りながら飛んで、少し落ちて消える）
        this.shards.forEach(sh => {
            sh.age++;
            sh.x += sh.vx;
            sh.y += sh.vy;
            sh.vx *= 0.95;
            sh.vy = sh.vy * 0.95 + 0.06;
            sh.rot += sh.vr;
        });
        this.shards = this.shards.filter(sh => sh.age < sh.maxAge);

        // 「100!」「500!」「1000!」の文字（ぽんと出て、ふわっと上がって消える）
        this.fxTexts.forEach(t => {
            t.age++;
            t.y -= 0.35;
        });
        this.fxTexts = this.fxTexts.filter(t => t.age < t.maxAge);

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
            const fx = this.FX[next.type];
            const targets = next.type === 'to100'
                ? this.balls.filter(b => b.mergeGroup === next.groupId && !b.merging)
                : this.balls.filter(b => b.tier === fx.from && !b.merging).slice(0, fx.count);

            if (targets.length > 0) {
                const newScale = fx.scale;

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
                    duration: fx.gather,                 // グワッと集まる時間
                    spin: Math.random() < 0.5 ? -1 : 1,  // うずを巻く向き
                    lines: Array.from({ length: fx.lines }, (_, k) => ({
                        angle: (Math.PI * 2 * k) / fx.lines + (Math.random() - 0.5) * 0.3,
                        phase: Math.random(),
                    })),
                });
            }
        }

        // 進行中の合体アニメーションを更新
        for (let i = this.activeMerges.length - 1; i >= 0; i--) {
            const m = this.activeMerges[i];
            const fx = this.FX[m.type];
            m.timer++;

            if (m.timer <= m.duration) {
                // グワッ：うずを巻きながら、だんだん速く 中心へ吸いこまれる。びんも だんだん強く ふるえる
                const progress = m.timer / m.duration;
                const pull = 0.08 + progress * progress * 0.3;
                const swirl = m.spin * (0.04 + progress * 0.14);
                const cos = Math.cos(swirl), sin = Math.sin(swirl);
                m.targets.forEach(b => {
                    const dx = b.x - m.cx, dy = b.y - m.cy;
                    b.x = m.cx + (dx * cos - dy * sin) * (1 - pull);
                    b.y = m.cy + (dx * sin + dy * cos) * (1 - pull);
                    b.px = b.x;
                    b.py = b.y;
                    b.r = Math.max(2.5, b.r * 0.976);
                });
                this.quake = Math.max(this.quake, progress * progress * fx.gatherQuake);
            } else {
                // ピカッ！と合体して1個の大きなドロップに変わる
                const targetSet = new Set(m.targets);
                this.balls = this.balls.filter(b => !targetSet.has(b));

                const newBall = this.newBall(m.drop, m.targetScale, fx.tier);
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

                // パキーン：フラッシュ・衝撃波・光線・ガラスのかけら・キラキラ・文字
                this.spawnMergeEffects(m.cx, m.cy, newBall.targetR, fx, newBall);
                this.spawnShards(m.cx, m.cy, newBall.targetR, fx);
                this.hitStop = fx.hitStop;
                this.flash = fx.flash;
                this.flashColor = fx.color.flash;
                this.quake = fx.quake;
                this.jarKick = (Math.random() < 0.5 ? -1 : 1) * fx.kick;
                this.pushAway(m.cx, m.cy, newBall, fx.push);

                this.activeMerges.splice(i, 1);
                this.mergeCooldown = 8;

                // 合体のたびに、間引いていた粒を少しずつ ほどく（さいごの合体で ちょうど ほんとうの数になる）
                this.unpackSome();
            }
        }
    },

    // 間引いていた粒（1つぶで何こ分かを packed に持っている）を、少しだけ ほんとうの数に もどす
    //   のこりの数 ÷ のこりの合体の回数 だけ、粒のすぐ上に 小さく生まれて ゆっくり ふくらむ（キラキラは出さず、さりげなく）
    unpackSome() {
        const packed = this.balls.filter(b => b.packed && b.packed.length > 0 && !b.merging);
        const remaining = packed.reduce((sum, b) => sum + b.packed.length, 0);
        if (remaining === 0) return;
        const count = Math.ceil(remaining / (this.mergeQueue.length + 1));
        const r = this.baseR;
        for (let n = 0; n < count; n++) {
            // いちばん多く かかえている粒から ほどく
            const b = packed.reduce((best, x) => ((x.packed ? x.packed.length : 0) > (best.packed ? best.packed.length : 0) ? x : best));
            if (!b.packed) break;
            const nb = this.newBall(b.packed.pop(), 1.0, 1);
            if (b.packed.length === 0) b.packed = null; // ほどき終わった
            nb.r = 3; // 小さく生まれて、ゆっくり ふくらむ
            nb.grow = this.UNPACK_GROW;
            nb.bounces = 0;
            // 粒の上がわで、ほかの玉に いちばん重ならない向きに 生まれる
            let best = null;
            for (let k = 0; k < 7; k++) {
                const angle = Math.PI + (Math.PI * (k + 0.5)) / 7;
                const x = b.x + Math.cos(angle) * (b.r + 4);
                const y = b.y + Math.sin(angle) * (b.r + 4);
                if (y < this.jar.shoulderBottom + r || !this.insideJar(x, y)) continue;
                const crowd = this.balls.reduce((sum, o) => sum + Math.max(0, o.r + 3 - Math.hypot(o.x - x, o.y - y)), 0);
                if (!best || crowd < best.crowd) best = { x, y, crowd };
            }
            nb.x = best ? best.x : b.x;
            nb.y = best ? best.y : b.y - b.r - 4;
            nb.px = nb.x;
            nb.py = nb.y;
            this.balls.push(nb);
        }
        this.updateRadii(false);
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
                b.r += (b.targetR - b.r) * (b.grow || 0.45);
                radiusChanging = true;
            } else {
                b.r = b.targetR;
                b.grow = 0;
            }
        });

        // コルクのふたの動き（stepLid）
        //   跳ね返りがあるときは、上向きに動いている玉は、いまの速さで ふたの高さまで届くとき
        //   （いちばん高い所が びんの口より上になるとき）だけ数える（びんの中で跳ねているだけの玉では、ふたは浮かない）
        const anyOut = balls.some(b => {
            if (b.settled || b.merging) return false;
            if (b.y - b.r < top - 4) return true;
            const vy = b.y - b.py;
            if (!this.BOUNCE_ENABLED) return vy < -2.5;
            return vy < -2.5 && b.y - b.r - (vy * vy) / (2 * 0.52) < top - 4;
        });
        this.stepLid(anyOut || this.heat > 1.0);

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

    // ビンの形（写真のガラスびん）：太い胴・短く丸い肩・口（胴の73%）・口のふち
    //   内がわのふちを、左の口 → 左の壁 → 底 → 右の壁 → 右の口 の折れ線（points）で持つ。当たり判定も描画もこれを使う
    buildJarShape() {
        const { left: L, right: R, top: T, bottom: B } = this.inner;
        const cx = (L + R) / 2, bw = (R - L) / 2, nw = bw * 0.73;
        const jar = {
            cx, bw, nw,
            rimTop: T - 6,                 // 口のふちの上（ここより上は びんの外）
            neckBottom: T + 16,            // 口（首）の下
            shoulderBottom: T + 16 + 24,   // 肩の下（ここから下は まっすぐな胴）
            bottom: B,
            cornerR: 30,                   // 底の角の丸み
            wall: 8,                       // ガラスの厚み（描画用）
        };
        const pts = [];
        const quad = (p0, c, p1) => {
            for (let i = 1; i <= 8; i++) {
                const t = i / 8, u = 1 - t;
                pts.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
            }
        };
        const { rimTop, neckBottom, shoulderBottom, cornerR: cr } = jar;
        pts.push([cx - nw, rimTop], [cx - nw, neckBottom]);
        quad([cx - nw, neckBottom], [cx - bw, neckBottom], [cx - bw, shoulderBottom]);
        pts.push([cx - bw, B - cr]);
        quad([cx - bw, B - cr], [cx - bw, B], [cx - bw + cr, B]);
        pts.push([cx + bw - cr, B]);
        quad([cx + bw - cr, B], [cx + bw, B], [cx + bw, B - cr]);
        pts.push([cx + bw, shoulderBottom]);
        quad([cx + bw, shoulderBottom], [cx + bw, neckBottom], [cx + nw, neckBottom]);
        pts.push([cx + nw, rimTop]);
        jar.points = pts;
        // 折れ線の1本ずつに、びんの内がわを向く向き（法線）をつけておく
        jar.segments = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
            const len = Math.hypot(bx - ax, by - ay);
            if (len === 0) continue;
            let nx = -(by - ay) / len, ny = (bx - ax) / len;
            if (!this.insideJar((ax + bx) / 2 + nx, (ay + by) / 2 + ny, pts)) {
                nx = -nx;
                ny = -ny;
            }
            jar.segments.push({ ax, ay, bx, by, nx, ny });
        }
        this.jar = jar;
    },

    // (x, y) が びんの中（口のふちより下）にあるか
    insideJar(x, y, pts = this.jar.points) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i], [xj, yj] = pts[j];
            if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    },

    // びんの壁・底・口のふちに当たったら、びんの中に押し戻す（record のときは、ぶつかった面の向きと速さも覚えておく）
    collideWithJar(b, record = true) {
        const jar = this.jar;
        const r = b.r;
        const dx = b.x - jar.cx;
        // 口より上：口のほうへ寄せて、びんの中へもどってくるようにする（上にいくほど ゆるく）
        if (b.y < jar.rimTop) {
            const margin = b.y < jar.rimTop - r ? Math.min(28, (jar.rimTop - b.y) * 0.12) : 0;
            const limit = jar.nw - r + margin;
            if (b.y >= jar.rimTop - r) {
                // ふちのすぐ上では、玉の中心が ふちより外に出ないようにする（ふちの角には、下の当たり判定で当たる）
                b.x = jar.cx + Math.max(-jar.nw, Math.min(jar.nw, dx));
            } else {
                b.x = jar.cx + Math.max(-limit, Math.min(limit, dx));
                return;
            }
        }
        // まっすぐな胴のまんなかあたりにいる玉は、どの壁にもとどかない（計算を はぶく）
        const y = b.y, adx = Math.abs(dx);
        if (y >= jar.shoulderBottom + r
            && ((adx <= jar.bw - r - 0.5 && y <= jar.bottom - jar.cornerR) || (adx <= jar.bw - jar.cornerR && y <= jar.bottom - r - 0.5))) {
            return;
        }
        const push = (nx, ny, depth) => {
            if (record) this.recordImpact(b, nx, ny, -(b.vinX * nx + b.vinY * ny));
            b.x += nx * depth;
            b.y += ny * depth;
            b.hit = true;
        };
        // 速くて壁をすりぬけたときは、いちばん近い壁の内がわへ もどす
        if (b.y >= jar.rimTop && !this.insideJar(b.x, b.y)) {
            let best = null;
            jar.segments.forEach(s => {
                const q = closestOnSegment(b.x, b.y, s);
                const d = Math.hypot(b.x - q.x, b.y - q.y);
                if (!best || d < best.d) best = { d, q, s };
            });
            b.x = best.q.x;
            b.y = best.q.y;
            push(best.s.nx, best.s.ny, r);
        }
        // 壁から玉の半径ぶん はなす（ふちの角では、角から まっすぐ押しかえされるので、自然に跳ねかえる）
        jar.segments.forEach(s => {
            const q = closestOnSegment(b.x, b.y, s);
            const ox = b.x - q.x, oy = b.y - q.y;
            const d = Math.hypot(ox, oy);
            if (d >= r || d === 0) return;
            push(ox / d, oy / d, r - d);
        });
    },

    // 玉が、上を向いたビンの面（底・底の丸い角）に のっているか
    restsOnJar(b) {
        return this.jar.segments.some(s => {
            if (s.ny > -0.2) return false;
            const q = closestOnSegment(b.x, b.y, s);
            return Math.hypot(b.x - q.x, b.y - q.y) < b.r + 1;
        });
    },

    // コルクのふた（1ステップぶん）
    //   口に差しこむ部分（LID_PLUG）が口から抜けるまでは、まっすぐ上下にしか動かない。抜けたら 回りながら飛ぶ
    //   落ちてきて口のふちに当たったとき、傾きが大きいと 角がふちに当たって跳ねかえり、傾きがなおる（LID_MAX_HITS 回まで）
    //   傾きが小さければ 口にすべりこみ、コトンと小さく1回跳ねて おさまる
    stepLid(pushed) {
        const PLUG = this.LID_PLUG;
        const wasOut = this.lidY < -PLUG;
        if (pushed) {
            // とび出す玉に押されて、ふたが開いていく
            this.lidRocking = false;
            this.lidVy -= 1.6;
            this.lidY += this.lidVy;
            if (this.lidY <= -60) {
                this.lidY = -60;
                this.lidVy = 0;
            }
            if (this.lidY > 0) {
                this.lidY = 0;
                this.lidVy = 0;
            }
        } else if (this.lidY < 0 || this.lidVy < 0) {
            // 落ちてくる
            this.lidRocking = true;
            this.lidVy += 0.65;
            const nextY = this.lidY + this.lidVy;
            if (this.lidY < -PLUG && nextY >= -PLUG) {
                // 差しこむ部分の先が、口のふちに とどいた
                if (Math.abs(this.lidAngle) > this.LID_ALIGN && this.lidHits < this.LID_MAX_HITS) {
                    // 傾いているので、角がふちに当たって 跳ねかえる（傾きは 水平にもどる向きに回る）
                    this.lidHits++;
                    this.lidY = -PLUG;
                    this.lidVy = -Math.min(6, this.lidVy * 0.35);
                    this.lidVa = -this.lidAngle * 0.12;
                    this.lidAngle *= 0.55;
                } else {
                    // まっすぐなので、口にすべりこむ（こすれて少しおそくなる）
                    this.lidY = nextY;
                    this.lidVy *= 0.7;
                }
            } else {
                this.lidY = nextY;
            }
            if (this.lidY >= 0) {
                // 口にはまった。速ければ小さく1回跳ねる
                if (this.lidVy > 2.5 && !this.lidBounced) {
                    this.lidBounced = true;
                    this.lidY = 0;
                    this.lidVy = -this.lidVy * 0.25;
                } else {
                    this.lidY = 0;
                    this.lidVy = 0;
                    this.lidRocking = false;
                }
            }
        }
        // 傾き：口に差しこまれているあいだは まっすぐ。抜けているあいだは 回る
        if (this.lidY < -PLUG) {
            if (!wasOut && pushed && this.lidVa === 0) {
                this.lidVa = (Math.random() < 0.5 ? -1 : 1) * (0.006 + Math.random() * 0.006);
            }
            // 空気にじゃまされて、回る勢いは だんだん弱まる（傾きは 0.2〜0.4 くらいまで）
            this.lidAngle = Math.max(-0.4, Math.min(0.4, this.lidAngle + this.lidVa));
            this.lidVa *= 0.97;
        } else {
            this.lidAngle *= 0.5;
            this.lidVa = 0;
            if (Math.abs(this.lidAngle) < 0.004) this.lidAngle = 0;
        }
    },

    // 止まっている玉のうち、ビンの底にも、下にある玉にも触れていないものを、また動かす
    wakeUnsupported(balls, cell) {
        const grid = new Map();
        balls.forEach((b, i) => {
            const key = `${Math.floor(b.x / cell)},${Math.floor(b.y / cell)}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(i);
        });
        balls.forEach(a => {
            if (!a.settled || this.restsOnJar(a)) return;
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

    // ビンのりんかく（o：内がわのふちから外へ どれだけ広げるか）
    jarPath(o) {
        const { cx, bw, nw, rimTop, neckBottom, shoulderBottom, bottom: B, cornerR: cr } = this.jar;
        const p = new Path2D();
        p.moveTo(cx - nw - o, rimTop + 2);
        p.lineTo(cx - nw - o, neckBottom);
        p.quadraticCurveTo(cx - bw - o, neckBottom, cx - bw - o, shoulderBottom);
        p.lineTo(cx - bw - o, B - cr);
        p.quadraticCurveTo(cx - bw - o, B + o, cx - bw + cr, B + o);
        p.lineTo(cx + bw - cr, B + o);
        p.quadraticCurveTo(cx + bw + o, B + o, cx + bw + o, B - cr);
        p.lineTo(cx + bw + o, shoulderBottom);
        p.quadraticCurveTo(cx + bw + o, neckBottom, cx + nw + o, neckBottom);
        p.lineTo(cx + nw + o, rimTop + 2);
        return p;
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
        // びん全体のゆれ（グワッ・パキーン）
        if (this.quake > 0) {
            ctx.translate(Math.sin(this.fxFrame * 2.7) * this.quake, Math.cos(this.fxFrame * 3.3) * this.quake * 0.6);
        }
        if (this.jarKick !== 0) {
            const cx = canvas.width / 2;
            const cy = (top + bottom) / 2;
            ctx.translate(cx, cy);
            ctx.rotate(this.jarKick);
            ctx.translate(-cx, -cy);
        }

        // びん（うしろ側）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill(this.jarPath(0));

        // 合体に向けてギュッと集まっている最中の中心の光の予兆
        this.activeMerges.forEach(m => {
            const fx = this.FX[m.type];
            const p = m.timer / m.duration;
            const glowR = this.baseR * m.targetScale * (0.4 + p * 1.3);
            const grad = ctx.createRadialGradient(m.cx, m.cy, 0, m.cx, m.cy, glowR);
            grad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * p})`);
            grad.addColorStop(0.5, `rgba(${fx.color.glow}, ${0.5 * p})`);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.save();
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(m.cx, m.cy, glowR, 0, Math.PI * 2);
            ctx.fill();

            // 外から縮んでくる光の輪
            const ringR = this.baseR * m.targetScale * (1 + (1 - p) * fx.ringReach);
            ctx.globalAlpha = 0.25 + p * 0.65;
            ctx.strokeStyle = fx.color.ring;
            ctx.lineWidth = 1.5 + p * (fx.ring - 1);
            ctx.beginPath();
            ctx.arc(m.cx, m.cy, ringR, 0, Math.PI * 2);
            ctx.stroke();

            // 中心へ流れこむ集中線
            ctx.lineCap = 'round';
            m.lines.forEach(l => {
                const t = (p * 2.2 + l.phase) % 1;
                const outer = this.baseR * m.targetScale * (2 + (1 - t) * fx.ringReach * 0.9);
                const inner = outer * 0.55;
                ctx.globalAlpha = p * (1 - t) * 0.9;
                ctx.strokeStyle = fx.color.line;
                ctx.lineWidth = fx.lineWidth;
                ctx.beginPath();
                ctx.moveTo(m.cx + Math.cos(l.angle) * outer, m.cy + Math.sin(l.angle) * outer);
                ctx.lineTo(m.cx + Math.cos(l.angle) * inner, m.cy + Math.sin(l.angle) * inner);
                ctx.stroke();
            });
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
                drawR = r * (1 + Math.sin(t * Math.PI * 2.5) * 0.42 * (1 - t));
            }

            ctx.save();
            ctx.translate(b.x, b.y);

            // 合体して生まれた大玉の背後で数秒間輝く余韻オーラ
            const tierFx = b.tier >= 100 ? this.FX[`to${b.tier}`] : null;
            if (b.glow > 0.01 && tierFx) {
                const auraR = drawR * (1.75 + Math.sin(b.glow * 18) * 0.12);
                const aura = ctx.createRadialGradient(0, 0, drawR * 0.4, 0, 0, auraR);
                aura.addColorStop(0, `rgba(${tierFx.color.aura}, ${b.glow * 0.8})`);
                aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(0, 0, auraR, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.rotate(b.angle);
            ctx.drawImage(img, -drawR, -drawR, drawR * 2, drawR * 2);

            // 100玉・500玉・1000玉の記念ドロップにはツヤの縁取りを添える（白・ピンク・金色）
            if (tierFx) {
                ctx.beginPath();
                ctx.arc(0, 0, drawR - 1, 0, Math.PI * 2);
                ctx.strokeStyle = tierFx.color.rim;
                ctx.lineWidth = tierFx.rimWidth;
                ctx.stroke();
            }
            ctx.restore();
        });

        // 「ピカッ！」と合体した瞬間のフラッシュ・クロス光線・二重リング
        this.popEffects.forEach(ef => {
            const fx = ef.fx;
            const p = ef.age / ef.maxAge;
            ctx.save();

            // ① 中心の強いフラッシュ（最初の瞬間ピカッと光る）
            if (p < 0.45) {
                const flashAlpha = (1 - p / 0.45);
                const flashR = ef.maxR * (0.65 + p * 0.8);
                const grad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, flashR);
                grad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
                grad.addColorStop(0.4, `rgba(${fx.color.glow}, ${flashAlpha * 0.8})`);
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
                const rayWidth = fx.rayWidth;
                const rays = fx.rays;
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
            ctx.strokeStyle = fx.color.ring;
            ctx.globalAlpha = ringAlpha;
            ctx.lineWidth = fx.ring * (1 - p * 0.6);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(ef.x, ef.y, ef.r * 0.72, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = ringAlpha * 0.75;
            ctx.lineWidth = 2.2 * (1 - p * 0.5);
            ctx.stroke();

            // ④ いちばん速く、太く広がる衝撃波（パキーン！）。500玉は2重、1000玉は3重に、少しずつ遅れて広がる
            for (let w = 0; w < fx.waves; w++) {
                const q = (p - w * 0.14) / 0.5;
                if (q <= 0 || q >= 1) continue;
                const waveR = ef.maxR * 1.5 * (1 - w * 0.15) * (1 - Math.pow(1 - q, 3));
                ctx.beginPath();
                ctx.arc(ef.x, ef.y, waveR, 0, Math.PI * 2);
                ctx.strokeStyle = w % 2 === 0 ? fx.color.wave : '#ffffff';
                ctx.globalAlpha = Math.pow(1 - q, 1.2) * (1 - w * 0.2);
                ctx.lineWidth = fx.wave * (1 - w * 0.25) * (1 - q) + 1;
                ctx.stroke();
            }

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

        const jar = this.jar;
        const { cx, nw, rimTop, wall } = jar;
        const rimW = nw + wall + 4;

        // コルクのふた：口に差しこむ部分（ガラスごしに見える）と、上の太い部分
        //   （傾きに応じて、口のふちを支点に斜めに浮き上がらせて描く）
        const corkW = rimW + 2;
        const corkH = this.CORK_H;
        const corkTop = rimTop - corkH + 2 + this.lidY;
        const drawCork = part => {
            if (corkTop < -45) return;
            const rockLift = Math.abs(Math.sin(this.lidAngle)) * (corkW * 0.84);
            ctx.save();
            ctx.translate(cx, corkTop + corkH / 2 - rockLift);
            ctx.rotate(this.lidAngle);
            this.drawCork(ctx, part);
            ctx.restore();
        };
        drawCork('plug');

        // びん（ガラスの厚みと、内と外のふち）
        ctx.lineWidth = wall;
        ctx.strokeStyle = 'rgba(160, 195, 215, 0.75)';
        ctx.stroke(this.jarPath(wall / 2));
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(110, 150, 180, 0.9)';
        ctx.stroke(this.jarPath(wall));
        ctx.stroke(this.jarPath(0));

        // 口のふち（少し厚い輪）
        ctx.fillStyle = 'rgba(175, 205, 225, 0.95)';
        roundRect(ctx, cx - rimW, rimTop, rimW * 2, 10, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(110, 150, 180, 0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        drawCork('top');

        // びんのガラスのツヤ
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        roundRect(ctx, left + 6, jar.shoulderBottom + 10, 7, (bottom - top) * 0.55, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        roundRect(ctx, right - 16, jar.shoulderBottom + 30, 4, (bottom - top) * 0.3, 3);
        ctx.fill();

        // 「パキーン！」のガラスのかけら（細長いひし形が、回りながら飛ぶ）
        this.shards.forEach(sh => {
            const p = sh.age / sh.maxAge;
            ctx.save();
            ctx.translate(sh.x, sh.y);
            ctx.rotate(sh.rot);
            ctx.globalAlpha = Math.pow(1 - p, 1.2);
            ctx.fillStyle = sh.color;
            ctx.strokeStyle = 'rgba(120, 170, 210, 0.8)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(sh.len, 0);
            ctx.lineTo(0, sh.len * 0.22);
            ctx.lineTo(-sh.len * 0.6, 0);
            ctx.lineTo(0, -sh.len * 0.22);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        // 「100!」「500!」「1000!」の文字（ぽんと大きく出て、少し縮んで、ふわっと消える）
        this.fxTexts.forEach(t => {
            const p = t.age / t.maxAge;
            const pop = p < 0.12 ? 0.4 + (p / 0.12) * 1.0 : 1.4 - Math.min(0.4, (p - 0.12) * 2.5);
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.scale(pop, pop);
            ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
            ctx.font = `900 ${t.fx.textSize}px 'M PLUS Rounded 1c', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 6;
            ctx.strokeStyle = t.fx.color.textStroke;
            ctx.strokeText(t.text, 0, 0);
            ctx.fillStyle = t.fx.color.textFill;
            ctx.fillText(t.text, 0, 0);
            ctx.restore();
        });

        ctx.restore();

        // びん全体が光る（パキーン！）
        if (this.flash > 0) {
            ctx.fillStyle = `rgba(${this.flashColor}, ${this.flash})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },
};

// 線分 s（ax, ay → bx, by）の上で、(x, y) にいちばん近い点
function closestOnSegment(x, y, s) {
    const vx = s.bx - s.ax, vy = s.by - s.ay;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * vx + (y - s.ay) * vy) / (vx * vx + vy * vy)));
    return { x: s.ax + vx * t, y: s.ay + vy * t };
}

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

// ふたをタッチしたら びんがたおれる（js/drop-table.js）。それ以外は、合体 → ぜんぶ合体したら ふたが開く
function tapDropJar(clientX, clientY) {
    if (DropJar.hitsLid(clientX, clientY)) {
        DropTable.open();
    } else {
        DropJar.shake();
    }
}

// ② タッチ端末（iPad / iPhone / Android）は touchstart で即座に拡大を阻止して反応させる
dropJarEl.addEventListener('touchstart', (e) => {
    e.preventDefault(); // iPadのダブルタップ拡大を完全に防ぐ
    const t = e.changedTouches[0];
    tapDropJar(t.clientX, t.clientY);
}, { passive: false });

// ③ PCのマウスクリック用（タッチのときは ② が動くので二重に反応しないようにする）
dropJarEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    tapDropJar(e.clientX, e.clientY);
});
document.getElementById('calPrev').addEventListener('click', () => Records.moveMonth(-1));
document.getElementById('calNext').addEventListener('click', () => Records.moveMonth(1));