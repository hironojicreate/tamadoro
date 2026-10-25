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
    RADIUS: 10.8,        // ドロップの大きさ（びんの中の半径 px）
    MAX_SHOWN: 170,      // びんが いっぱいになる数
    MOVE_MS: 8000,       // 空高く飛び出したドロップが全て落ちて落ち着くまで十分な時間を確保
    balls: [],
    images: {},
    running: false,
    heat: 0,             // 連打の勢い（タップするたびに増え、時間とともに減る）
    lastShakeAt: 0,      // 最後にタップした時刻
    jarKick: 0,          // びん自体の揺れ角度
    lidY: 0,             // コルクのふたの浮き上がり量（飛び出し演出用）
    lidVy: 0,            // コルクのふたの速度

    show(log) {
        const drops = log.filter(e => e.drop).map(e => e.drop);
        document.getElementById('dropTotal').textContent = `ぜんぶで ${drops.length} こ`;

        const canvas = document.getElementById('dropJar');
        canvas.setAttribute('aria-label', `ドロップびん。ドロップが ${drops.length} こ はいっている`);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.inner = { left: 34, right: canvas.width - 34, top: 46, bottom: canvas.height - 18 };
        this.heat = 0;
        this.jarKick = 0;
        this.lidY = 0;
        this.lidVy = 0;

        const shown = drops.slice(-this.MAX_SHOWN);
        const falling = Math.min(8, shown.length);   // 新しい8こは、上から落ちてくる
        this.balls = shown.map(drop => this.newBall(drop));
        this.packFromBottom(this.balls.slice(0, shown.length - falling));
        this.balls.slice(shown.length - falling).forEach((ball, i) => {
            ball.x = this.inner.left + this.RADIUS + Math.random() * (this.inner.right - this.inner.left - this.RADIUS * 2);
            ball.y = this.inner.top - this.RADIUS * 2 - i * this.RADIUS * 3;
            ball.px = ball.x;
            ball.py = ball.y;
        });
        this.start();
    },

    newBall(drop) {
        const src = dropSrc(drop);
        if (!this.images[src]) {
            const img = new Image();
            this.images[src] = { ready: false };
            img.onload = () => {
                // ミニCanvasに1回だけ焼き付けて高速化
                const size = 64;
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
        return { src, x: 0, y: 0, px: 0, py: 0, angle: Math.random() * Math.PI * 2, va: 0 };
    },

    // 古いドロップを、下から順に、すきまなく積んでおく
    packFromBottom(balls) {
        const r = this.RADIUS;
        const { left, right, bottom } = this.inner;
        const perRow = Math.floor((right - left) / (r * 2));
        balls.forEach((ball, i) => {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const shift = row % 2 === 1 ? r : 0;
            ball.x = Math.min(right - r, left + r + shift + col * r * 2 + (Math.random() - 0.5) * 2);
            ball.y = bottom - r - row * r * 1.75;
            ball.px = ball.x;
            ball.py = ball.y;
        });
    },

    // ゆらす（びんをタップするたびに勢いが増し、連打で全部飛び出す！）
    shake() {
        const now = performance.now();
        const dt = now - (this.lastShakeAt || 0);
        this.lastShakeAt = now;

        // 素早く連打するほど heat（勢い）がどんどん溜まる（最大 12）
        if (dt < 450) {
            this.heat = Math.min(12, this.heat + 1.35);
        } else {
            this.heat = Math.max(1.5, this.heat * 0.5 + 1.2);
        }

        // びん自体も左右にプルッと揺らす
        this.jarKick = (Math.random() < 0.5 ? -1 : 1) * Math.min(0.08, 0.02 + this.heat * 0.006);

        // コルクのふたをポンッと上に吹き飛ばす
        this.lidVy = -Math.min(28, 6 + this.heat * 2.5);

        const { bottom } = this.inner;

        this.balls.forEach(ball => {
            // 現在の速度
            const vx = ball.x - ball.px;
            const vy = ball.y - ball.py;

            // タップ1回ごとの上向きジャンプ力（連打するほど激しくなる）
            // 下のほうにあるドロップもしっかり押し上げられるようにボーナスをつける
            const depthBonus = Math.max(0, (ball.y - 100) / Math.max(1, bottom - 100)) * 4;
            const jumpPower = 0.01 + this.heat * 1.2 + Math.random() * (5 + this.heat * 1.0) + depthBonus;

            // すでに上へ飛んでいるドロップもさらに加速させて空高く全部打ち上げる！
            const newVy = Math.max(-5, Math.min(vy, 0) * 0.65 - jumpPower);

            // 左右にも激しく暴れさせる
            const sidePower = (Math.random() - 0.5) * (8 + this.heat * 2.2);
            const newVx = Math.max(-18, Math.min(18, vx * 0.8 + sidePower));

            ball.px = ball.x - newVx;
            ball.py = ball.y - newVy;

            // くるくる回転させる
            ball.va = (Math.random() - 0.5) * (0.25 + this.heat * 0.05);
        });

        this.start();
    },

    start() {
        this.stopAt = performance.now() + this.MOVE_MS;
        this.quietFrames = 0;
        if (this.running) return;
        this.running = true;
        const loop = () => {
            if (!this.running) return;
            this.step();
            this.step();
            this.draw();

            // まだ空中に飛んでいるドロップがあるか、動いているドロップがあるかチェック
            const { top } = this.inner;
            const anyInAir = this.balls.some(b => b.y < top);
            const moving = anyInAir || Math.abs(this.lidY) > 0.5 || this.balls.some(b => Math.abs(b.x - b.px) + Math.abs(b.y - b.py) > 0.05);
            this.quietFrames = moving ? 0 : this.quietFrames + 1;

            // 空中にドロップが残っている間は、時間を延長して必ず全部落ちてくるまで待つ
            if (anyInAir) {
                this.stopAt = Math.max(this.stopAt, performance.now() + 3000);
            }

            if ((this.quietFrames > 25 && !anyInAir) || performance.now() > this.stopAt
                || document.getElementById('recordsScreen').style.display === 'none') {
                this.running = false;
                this.jarKick = 0;
                this.lidY = 0;
                this.draw();
                return;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    // 1こま進める：重力で動かしてから、重なりとびんの外を直す
    step() {
        const r = this.RADIUS;
        const { left, right, top, bottom } = this.inner;
        const balls = this.balls;

        // 連打していないときは少しずつ heat（勢い）を冷ます
        if (performance.now() - this.lastShakeAt > 250) {
            this.heat = Math.max(0, this.heat * 0.985 - 0.02);
        }

        // びんの揺れの減衰
        this.jarKick *= -0.82;
        if (Math.abs(this.jarKick) < 0.001) this.jarKick = 0;

        // コルクのふたの動き（ドロップが上に飛び出している間は上空に退避し、落ち着いたら閉まる）
        const highestBallY = balls.length > 0 ? Math.min(...balls.map(b => b.y)) : bottom;
        if (highestBallY < top + 10 || this.heat > 1.5) {
            // ドロップが飛び出し中：ふたは画面の上の外へ飛んでいく
            this.lidVy -= 1.2;
            this.lidY = Math.max(-160, this.lidY + this.lidVy);
        } else {
            // ドロップがすべてびんに戻った：重力でふたがスポッと閉まる
            this.lidVy += 0.8;
            this.lidY = Math.min(0, this.lidY + this.lidVy);
            if (this.lidY === 0) this.lidVy = 0;
        }

        balls.forEach(b => {
            const vx = (b.x - b.px) * 0.99;
            const vy = (b.y - b.py) * 0.99 + 0.28; // 重力（空から気持ちよく落ちてくる強さ）
            b.px = b.x;
            b.py = b.y;
            b.x += vx;
            b.y += vy;

            // 回転を進める
            if (b.va) {
                b.angle += b.va;
                b.va *= 0.985;
            } else {
                b.angle += vx * 0.04;
            }

            // 最高速連打で飛び出したドロップが上空1200pxより遠くへ行きすぎないようソフトに折り返させる（指を止めたあと気持ちよく降ってくるため）
            if (b.y < -950 && b.y < b.py) {
                b.py = b.y + (b.py - b.y) * 0.5;
            }
        });

        for (let iteration = 0; iteration < 4; iteration++) {
            // 近くのドロップだけ調べるように、ます目に分ける
            const cell = r * 2;
            const grid = new Map();
            balls.forEach((b, i) => {
                // 空高く飛んでいる最中は衝突計算を軽くしてスムーズに飛ばす
                if (b.y < -r * 4) return;
                const key = `${Math.floor(b.x / cell)},${Math.floor(b.y / cell)}`;
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key).push(i);
            });
            balls.forEach((a, i) => {
                if (a.y < -r * 4) return;
                const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        (grid.get(`${cx + dx},${cy + dy}`) || []).forEach(j => {
                            if (j <= i) return;
                            const b = balls[j];
                            const ox = b.x - a.x, oy = b.y - a.y;
                            const dist2 = ox * ox + oy * oy;
                            if (dist2 >= 4 * r * r || dist2 === 0) return;
                            const dist = Math.sqrt(dist2);
                            const push = (2 * r - dist) / 2;
                            const nx = ox / dist, ny = oy / dist;
                            a.x -= nx * push; a.y -= ny * push;
                            b.x += nx * push; b.y += ny * push;
                        });
                    }
                }
            });

            // びんの壁との当たり判定
            balls.forEach(b => {
                if (b.y >= top - r) {
                    // びんの中：左右の壁と底でしっかり跳ね返る
                    if (b.x < left + r) {
                        const vx = b.x - b.px;
                        b.x = left + r;
                        b.px = b.x + vx * 0.5;
                    }
                    if (b.x > right - r) {
                        const vx = b.x - b.px;
                        b.x = right - r;
                        b.px = b.x + vx * 0.5;
                    }
                    if (b.y > bottom - r) {
                        const vy = b.y - b.py;
                        b.y = bottom - r;
                        b.py = b.y + vy * 0.35; // 底で少しバウンドする
                    }
                } else {
                    // びんより上（空中）：画面外に散らばりすぎず、落ちてきたときに必ずびんの口（left〜right）へ吸い込まれるようにガイドする
                    const funnelMargin = Math.min(28, Math.max(0, (top - b.y) * 0.12));
                    const minX = left + r - funnelMargin;
                    const maxX = right - r + funnelMargin;
                    if (b.x < minX) {
                        b.x = minX;
                        b.px = b.x;
                    }
                    if (b.x > maxX) {
                        b.x = maxX;
                        b.px = b.x;
                    }
                }
            });
        }

        // びんの中でほとんど動いていないドロップは、止めておく（ぴくぴくしないように）
        balls.forEach(b => {
            if (b.y >= top && Math.abs(b.x - b.px) < 0.04 && Math.abs(b.y - b.py) < 0.04) {
                b.px = b.x;
                b.py = b.y;
                b.va = 0;
            }
        });
    },

    draw() {
        const { ctx, canvas } = this;
        const r = this.RADIUS;
        const { left, right, top, bottom } = this.inner;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // タップしたときにびん全体が中心を軸に少しプルプル揺れる
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

        // ドロップの描画（空へ飛び出して画面の上端に消えていくものも滑らかに描画）
        this.balls.forEach(b => {
            if (b.y < -r * 2) return; // 画面よりずっと上にある間は描画をスキップしてさらに高速化
            const img = this.images[b.src];
            if (!img || !img.ready) return;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle);
            ctx.drawImage(img, -r, -r, r * 2, r * 2);
            ctx.restore();
        });

        // びん（ガラスのふち）
        ctx.strokeStyle = 'rgba(120, 160, 190, 0.9)';
        ctx.lineWidth = 4;
        roundRect(ctx, left - 10, top - 14, right - left + 20, bottom - top + 26, 26);
        ctx.stroke();

        // コルクのふた（タップするとポンッと上に飛んでいき、ドロップが全部戻ると閉まる！）
        if (top - 34 + this.lidY > -30) {
            ctx.fillStyle = '#e8a87c';
            roundRect(ctx, left - 4, top - 34 + this.lidY, right - left + 8, 18, 6);
            ctx.fill();
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

// ② タッチ端末（iPad / iPhone / Android）は touchstart で即座に拡大を阻止して揺らす
dropJarEl.addEventListener('touchstart', (e) => {
    e.preventDefault(); // iPadのダブルタップ拡大を完全に防ぐ
    DropJar.shake();
}, { passive: false });

// ③ PCのマウスクリック用（タッチのときは ② が動くので二重に揺れないようにする）
dropJarEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    DropJar.shake();
});
document.getElementById('calPrev').addEventListener('click', () => Records.moveMonth(-1));
document.getElementById('calNext').addEventListener('click', () => Records.moveMonth(1));