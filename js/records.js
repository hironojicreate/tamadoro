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

        mode.levels.forEach((def, i) => {
            const level = i + 1;
            const entries = log.filter(e => e.mode === mode.id && e.level === level);
            const clears = entries.filter(e => e.cleared || e.imported).length;
            const timed = entries.filter(e => e.cleared && e.ms).slice(-20);

            // ベストタイム（百マスは秒で保存している）
            // ベストタイム：以前からの保存（百マスは秒）と、記録のうち、はやいほう
            const savedBest = localStorage.getItem(`${mode.bestTimePrefix}_level_${level}_best_time`);
            const times = entries.filter(e => e.cleared && e.ms).map(e => e.ms);
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

        // 9×9 の表（たしざん・かけざん）
        if (mode.id === 'add' || mode.id === 'multi') {
            map.appendChild(weakGrid(mode, stats));
            map.appendChild(weakLegend());
        }

        // まちがえた割合が高い順（同じなら、時間がかかった順）
        const weak = Object.entries(stats)
            .map(([key, s]) => ({ key, ...s, rate: s.miss / s.n, avg: s.ms / s.n }))
            .filter(s => s.miss > 0)
            .sort((a, b) => b.rate - a.rate || b.avg - a.avg)
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

function weakGrid(mode, stats) {
    const table = document.createElement('table');
    table.className = 'weak-grid';
    let html = `<tr><th>${mode.symbol}</th>`;
    for (let b = 1; b <= 9; b++) html += `<th>${b}</th>`;
    html += '</tr>';
    for (let a = 1; a <= 9; a++) {
        html += `<tr><th>${a}</th>`;
        for (let b = 1; b <= 9; b++) {
            const s = stats[`${a}${mode.symbol}${b}`];
            if (!s) {
                html += `<td class="empty" data-label="${a} ${mode.symbol} ${b}：まだ やっていないよ">－</td>`;
                continue;
            }
            const rate = s.miss / s.n;
            const step = weakStep(rate);
            html += `<td style="background:${step.color}" class="${step.dark ? 'dark' : ''}" data-label="${a} ${mode.symbol} ${b}：${s.n}かいちゅう ${s.miss}かい まちがい・へいきん ${(s.ms / s.n / 1000).toFixed(1)}びょう"></td>`;
        }
        html += '</tr>';
    }
    table.innerHTML = html;
    table.querySelectorAll('td').forEach(td => {
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
    MAX_SHOWN: 400,      // これより多いときは、新しいほうから
    balls: [],
    images: {},
    running: false,

    show(log) {
        const drops = log.filter(e => e.drop).map(e => e.drop);
        document.getElementById('dropTotal').textContent = `ぜんぶで ${drops.length} こ`;

        const canvas = document.getElementById('dropJar');
        canvas.setAttribute('aria-label', `ドロップびん。ドロップが ${drops.length} こ はいっている`);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.inner = { left: 34, right: canvas.width - 34, top: 46, bottom: canvas.height - 18 };

        const shown = drops.slice(-this.MAX_SHOWN);
        const area = (this.inner.right - this.inner.left) * (this.inner.bottom - this.inner.top);
        this.radius = Math.max(6, Math.min(16, Math.sqrt((area * 0.5) / (Math.PI * Math.max(shown.length, 1)))));

        // 古いドロップは先に積もらせておき、新しい8こが上から落ちてくる
        const falling = Math.min(8, shown.length);
        this.balls = shown.map((drop, i) => this.newBall(drop, i));
        const settled = this.balls.slice(0, shown.length - falling);
        const dropping = this.balls.slice(shown.length - falling);
        this.balls = settled;
        for (let i = 0; i < 400; i++) this.step();
        dropping.forEach((ball, i) => {
            ball.y = -this.radius * 2 - i * this.radius * 3;
            this.balls.push(ball);
        });
        this.start();
    },

    newBall(drop, i) {
        const src = dropSrc(drop);
        if (!this.images[src]) {
            const img = new Image();
            img.src = src;
            img.onload = () => this.draw();
            this.images[src] = img;
        }
        const { left, right, bottom } = this.inner;
        return {
            src,
            x: left + this.radius + Math.random() * (right - left - this.radius * 2),
            y: bottom - this.radius - i * 2,
            vx: 0,
            vy: 0,
            angle: Math.random() * Math.PI * 2,
        };
    },

    // ゆらす（びんをタップしたとき）
    shake() {
        this.balls.forEach(ball => {
            ball.vx += (Math.random() - 0.5) * 6;
            ball.vy -= Math.random() * 7;
        });
        this.start();
    },

    start() {
        this.quietFrames = 0;
        if (this.running) return;
        this.running = true;
        const loop = () => {
            if (!this.running) return;
            this.step();
            this.step();
            this.draw();
            // ほとんど動かなくなったら止める
            const moving = this.balls.some(b => Math.abs(b.vx) + Math.abs(b.vy) > 0.15);
            this.quietFrames = moving ? 0 : this.quietFrames + 1;
            if (this.quietFrames > 30 || document.getElementById('recordsScreen').style.display === 'none') {
                this.running = false;
                return;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    step() {
        const r = this.radius;
        const { left, right, bottom } = this.inner;
        const balls = this.balls;
        balls.forEach(b => {
            b.vy += 0.25;          // 重力
            b.vx *= 0.99;
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < left + r) { b.x = left + r; b.vx = -b.vx * 0.3; }
            if (b.x > right - r) { b.x = right - r; b.vx = -b.vx * 0.3; }
            if (b.y > bottom - r) { b.y = bottom - r; b.vy = -b.vy * 0.25; b.vx *= 0.8; }
        });
        // ドロップどうしが重ならないように押しあう
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                const a = balls[i], b = balls[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const dist2 = dx * dx + dy * dy;
                if (dist2 >= 4 * r * r || dist2 === 0) continue;
                const dist = Math.sqrt(dist2);
                const nx = dx / dist, ny = dy / dist;
                const push = (2 * r - dist) / 2;
                a.x -= nx * push; a.y -= ny * push;
                b.x += nx * push; b.y += ny * push;
                const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (relative < 0) {
                    const impulse = -relative * 0.6;
                    a.vx -= nx * impulse; a.vy -= ny * impulse;
                    b.vx += nx * impulse; b.vy += ny * impulse;
                }
            }
        }
    },

    draw() {
        const { ctx, canvas, radius: r } = this;
        const { left, right, top, bottom } = this.inner;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // びん（うしろ側）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        roundRect(ctx, left - 10, top - 14, right - left + 20, bottom - top + 26, 26);
        ctx.fill();

        this.balls.forEach(b => {
            const img = this.images[b.src];
            if (!img || !img.complete) return;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle);
            ctx.drawImage(img, -r, -r, r * 2, r * 2);
            ctx.restore();
        });

        // びん（ガラスのふちと、ふた）
        ctx.strokeStyle = 'rgba(120, 160, 190, 0.9)';
        ctx.lineWidth = 4;
        roundRect(ctx, left - 10, top - 14, right - left + 20, bottom - top + 26, 26);
        ctx.stroke();
        ctx.fillStyle = '#e8a87c';
        roundRect(ctx, left - 4, top - 34, right - left + 8, 18, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        roundRect(ctx, left - 2, top + 10, 8, bottom - top - 40, 4);
        ctx.fill();
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


document.getElementById('dropJar').addEventListener('click', () => DropJar.shake());
document.getElementById('calPrev').addEventListener('click', () => Records.moveMonth(-1));
document.getElementById('calNext').addEventListener('click', () => Records.moveMonth(1));
