// 「タマのきろく」：びんのふたをタッチすると、びんがコテンとたおれて、ドロップがテーブルにちらばる
//   テーブルは上から見たところ（重力なし）。コロコロ転がって、摩擦で止まる
//   止まったあとは、指でつまんで動かせる（何本の指でも）。はじくと、すべって止まる
//   「おかたづけ」で びんにもどる。ちらばった場所は保存しないので、ほかの画面へ行ったり読みこみなおしたりすると、びんにもどっている
// びんの中身・形・絵は js/records.js の DropJar

const DropTable = {
    AREA: 0.3,          // ドロップがテーブルの何わりまで おおうか（こえるときは、出す粒の数を へらす）
    MAX_BALLS: 1500,    // 動きが重くならないための、粒の数の上限
    SIZE_UP: 1.35,      // びんの中より 少し大きく（びんの中の粒の何倍か）
    MIN_R: 9,           // ちらばった粒の半径（px）の下限・上限
    MAX_R: 15,
    FRICTION: 0.97,     // 1こまごとに 速さを どれだけ残すか（摩擦）
    BOUNCE: 0.45,       // テーブルのはしや びんに当たったときの はねかえり
    MAX_FLICK: 45,      // はじいたときの速さの上限（px／こま）
    TIP_FRAMES: 36,     // びんが たおれる時間（こま）
    POUR_FRAMES: 70,    // ドロップが びんから ぜんぶ出てくるまでの時間
    CLEAN_FRAMES: 60,   // おかたづけで、粒が つぎつぎ もどりはじめる時間のはば
    FLY_FRAMES: 22,     // 1つぶが びんの口へ とんでいく時間
    STAND_FRAMES: 34,   // びんが おきあがる時間

    isOpen: false,
    running: false,
    phase: '',          // 'tip' たおれる → 'pour' ちらばる → 'play' あそぶ → 'clean' もどる → 'stand' おきあがる
    balls: [],          // テーブルの上の粒
    queue: [],          // まだ びんから出ていない粒
    holds: new Map(),   // 指（pointerId）ごとに、つまんでいる粒
    bump: 0,            // びんがたおれたときの、テーブルのゆれ（px）

    // ---------- ひらく・とじる ----------

    open() {
        if (this.isOpen) return;
        this.setupDom();
        const jar = DropJar;
        jar.running = false;
        this.isOpen = true;
        this.savedOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        this.el.hidden = false;
        this.resize();
        void this.el.offsetWidth; // テーブルを ふわっと出す
        this.el.classList.add('is-shown');
        this.doneButton.disabled = false;

        // びん：いまの場所から、テーブルの はしに コテンと たおれる（口が テーブルの ひろいほうを むく）
        //   よこ長の画面：左（右）のはしに よこだおし。たて長の画面：上のすみに ななめに たおれて、口が下を むく
        const rect = jar.canvas.getBoundingClientRect();
        this.cw = jar.canvas.width;
        this.ch = jar.canvas.height;
        this.jarImage = jar.emptyJarImage();
        jar.canvas.style.visibility = 'hidden';
        const s0 = rect.width / this.cw;
        const sF = Math.min(s0, (this.W * 0.5) / this.ch, (this.H * 0.42) / this.cw);
        this.dir = rect.left + rect.width / 2 <= this.W / 2 ? 1 : -1;
        this.from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, angle: 0, scale: s0 };
        const angle = this.dir * (this.H > this.W * 1.15 ? Math.PI * 5 / 6 : Math.PI / 2);
        const c = Math.abs(Math.cos(angle)), sn = Math.abs(Math.sin(angle));
        const hx = (c * this.cw / 2 + sn * this.ch / 2) * sF; // たおれたびんの はば・高さの半分
        const hy = (sn * this.cw / 2 + c * this.ch / 2) * sF;
        this.to = {
            x: this.dir > 0 ? 10 + hx : this.W - 10 - hx,
            y: this.H > this.W * 1.15 ? 10 + hy : clampNum(this.from.y, hy + 10, this.H - hy - 10),
            angle,
            scale: sF,
        };
        this.pose = { ...this.from };
        const { inner, jar: shape } = jar;
        this.box = { l: inner.left - shape.wall, r: inner.right + shape.wall, t: shape.rimTop, b: inner.bottom + shape.wall };

        // コルク：ポンと とんで、たおれたびんの そばに おちる
        //   口の先の、びんの よこがわ（よこだおしなら 上）に おちる
        const start = this.toWorld(this.from, shape.cx, shape.rimTop - 12 + Math.max(-60, jar.lidY));
        const mouth = this.toWorld(this.to, shape.cx, shape.rimTop);
        const mx = Math.sin(angle), my = -Math.cos(angle); // 口の向き
        const side = (this.cw / 2) * sF * 0.9 + 20;
        this.cork = {
            x: start.x, y: start.y, angle: 0, scale: s0,
            from: { x: start.x, y: start.y, angle: 0, scale: s0 },
            to: {
                x: clampNum(mouth.x + mx * 20 + this.dir * my * side, 40, this.W - 40),
                y: clampNum(mouth.y + my * 20 - this.dir * mx * side, 30, this.H - 30),
                angle: angle + this.dir * 0.35,
                scale: sF,
            },
            t: 0,
        };

        this.queue = this.makeBalls();
        this.pourRate = Math.max(1, Math.ceil(this.queue.length / this.POUR_FRAMES));
        this.balls = [];
        this.holds.clear();
        this.phase = 'tip';
        this.t = 0;
        this.wake();
    },

    // refill：びんに中身を もどして 描きなおす（ほかの画面へ行くときは しない。もどってきたときに描きなおされる）
    close(refill) {
        this.isOpen = false;
        this.running = false;
        this.phase = '';
        this.balls = [];
        this.queue = [];
        this.holds.clear();
        this.el.hidden = true;
        this.el.classList.remove('is-shown');
        document.documentElement.style.overflow = this.savedOverflow || '';
        DropJar.canvas.style.visibility = '';
        if (refill) DropJar.show(History.getLog());
    },

    // 「おかたづけ」：口に近い粒から じゅんばんに、びんへ すいこまれる
    cleanUp() {
        if (!this.isOpen || this.phase === 'clean' || this.phase === 'stand') return;
        this.doneButton.disabled = true;
        this.holds.clear();
        this.queue = [];
        const shape = DropJar.jar;
        this.mouth = this.toWorld(this.pose, shape.cx, shape.rimTop + 6);
        const dist = b => Math.hypot(b.x - this.mouth.x, b.y - this.mouth.y);
        const order = this.balls.slice().sort((a, b) => dist(a) - dist(b));
        order.forEach((b, i) => {
            b.held = false;
            b.delay = Math.floor((i / order.length) * this.CLEAN_FRAMES);
            b.fly = 0;
            b.sx = b.x;
            b.sy = b.y;
        });
        this.phase = 'clean';
        this.t = 0;
        this.wake();
    },

    setupDom() {
        if (this.el) return;
        const el = document.createElement('div');
        el.id = 'dropTable';
        el.className = 'drop-table';
        el.hidden = true;
        el.innerHTML = '<div class="drop-table-wood"></div>'
            + '<canvas role="img" aria-label="テーブルに ちらばった ドロップ。ゆびで うごかせる"></canvas>'
            + '<button type="button" class="drop-table-done">おかたづけ</button>';
        document.body.appendChild(el);
        this.el = el;
        this.canvas = el.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.doneButton = el.querySelector('.drop-table-done');
        this.doneButton.addEventListener('click', () => this.cleanUp());

        const c = this.canvas;
        c.addEventListener('pointerdown', e => this.onDown(e));
        c.addEventListener('pointermove', e => this.onMove(e));
        c.addEventListener('pointerup', e => this.onUp(e));
        c.addEventListener('pointercancel', e => this.onUp(e));
        c.addEventListener('lostpointercapture', e => this.onUp(e));
        c.addEventListener('touchstart', e => e.preventDefault(), { passive: false }); // iPad のダブルタップ拡大を止める
        window.addEventListener('resize', () => { if (this.isOpen) this.resize(); });
        // ほかの画面へ行ったら、すぐ とじる
        window.addEventListener('hashchange', () => { if (this.isOpen) this.close(false); });
    },

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.W = this.el.clientWidth;
        this.H = this.el.clientHeight;
        this.canvas.width = Math.round(this.W * this.dpr);
        this.canvas.height = Math.round(this.H * this.dpr);
        if (this.phase) this.wake();
    },

    // ---------- 粒をつくる ----------

    // びんの「いま」の中身から、テーブルに出す粒をつくる
    //   合体した玉（100玉・500玉・1000玉）はそのまま。のこりの粒は、テーブルを おおいつくさない数まで ほんとうの数で出す
    makeBalls() {
        const jar = DropJar;
        const drops = jar.drops || [];
        const r = clampNum(jar.baseR * this.SIZE_UP, this.MIN_R, this.MAX_R);
        const bigs = jar.balls.filter(b => b.tier >= 100 && !b.merging);
        const singles = Math.max(0, drops.length - bigs.reduce((sum, b) => sum + b.tier, 0));
        const room = this.AREA * this.W * this.H - bigs.reduce((sum, b) => sum + Math.PI * (r * b.scale) ** 2, 0);
        const n = Math.max(0, Math.min(singles, this.MAX_BALLS - bigs.length, Math.floor(room / (Math.PI * r * r))));

        const list = bigs.map(b => this.newBall(b.src, r * b.scale, b.tier));
        // 合体した分は、記録の はじめのほうから つかっている。のこりの粒は うしろのほうから まんべんなく えらぶ
        const first = drops.length - singles;
        for (let i = 0; i < n; i++) {
            list.push(this.newBall(jar.loadImage(drops[first + Math.floor((i * singles) / n)]), r, 1));
        }
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        // 遠くまで とぶ粒から先に出す（あとから出る粒は 手前で止まるので、先の粒を おしかためない）
        //   reach：テーブルのはしまでの何わりまで とぶか（ひろさが まんべんなく なるように √ でえらぶ）。queue は うしろから出す
        const reach = list.map(() => Math.sqrt(Math.random())).sort((a, b) => a - b);
        list.forEach((b, i) => { b.reach = reach[i]; });
        this.cell = 2 * list.reduce((m, b) => Math.max(m, b.r), r);
        return list;
    },

    newBall(src, r, tier) {
        return { src, r, tier, m: r * r, x: 0, y: 0, vx: 0, vy: 0, angle: Math.random() * Math.PI * 2, held: false, drawScale: 1 };
    },

    // びんの口から 1つぶ出す（口の向きを まんなかに、おうぎ形に ひろがって。とどく きょりは テーブルのはしまでの b.reach わり）
    emit(b) {
        const shape = DropJar.jar;
        const s = this.pose.scale;
        const p = this.toWorld(this.pose, shape.cx + (Math.random() * 2 - 1) * shape.nw * 0.7, shape.rimTop - b.r / s - 2);
        const angle = this.pose.angle - Math.PI / 2 + (Math.random() * 2 - 1) * 1.3;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const v = this.reachToEdge(p.x, p.y, dx, dy, b.r) * (0.06 + 0.88 * b.reach) * (1 - this.FRICTION);
        Object.assign(b, { x: p.x, y: p.y, vx: dx * v, vy: dy * v });
        this.balls.push(b);
    },

    // (x, y) から (dx, dy) の向きに進んで、テーブルのはしまでの きょり
    reachToEdge(x, y, dx, dy, r) {
        const tx = dx > 0 ? (this.W - r - x) / dx : dx < 0 ? (r - x) / dx : Infinity;
        const ty = dy > 0 ? (this.H - r - y) / dy : dy < 0 ? (r - y) / dy : Infinity;
        return Math.max(0, Math.min(tx, ty));
    },

    // びんの絵の中の点（lx, ly）が、画面のどこにあるか
    toWorld(p, lx, ly) {
        const dx = (lx - this.cw / 2) * p.scale, dy = (ly - this.ch / 2) * p.scale;
        const c = Math.cos(p.angle), s = Math.sin(p.angle);
        return { x: p.x + dx * c - dy * s, y: p.y + dx * s + dy * c };
    },

    // ---------- うごき ----------

    wake() {
        this.quiet = 0;
        if (this.running || !this.isOpen) return;
        this.running = true;
        const loop = () => {
            if (!this.running) return;
            if (document.getElementById('recordsScreen').style.display === 'none') {
                this.close(false);
                return;
            }
            const busy = this.update();
            this.draw();
            this.quiet = busy ? 0 : this.quiet + 1;
            if (this.quiet > 20) {
                this.running = false; // 止まったら、指でさわるまで休む
                return;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    // 1こま進める。まだ動いているものがあれば true
    update() {
        this.bump = this.bump > 0.3 ? this.bump * 0.8 : 0;
        if (this.phase === 'clean') return this.stepClean() || true;
        if (this.phase === 'stand') return this.stepStand() || true;

        if (this.phase === 'tip') this.stepTip();
        if (this.phase === 'pour') this.stepPour();
        const corkMoving = this.stepCork();
        const moving = this.stepPhysics();
        return this.phase !== 'play' || moving || corkMoving || this.holds.size > 0 || this.bump > 0;
    },

    // コテン：だんだん速く たおれて、テーブルに当たって 少し はねかえる
    stepTip() {
        this.t++;
        const k = Math.min(1, this.t / this.TIP_FRAMES);
        const fall = k < 0.75 ? (k / 0.75) ** 2 : 1 - 0.07 * Math.sin(Math.PI * (k - 0.75) / 0.25);
        const e = easeInOut(k);
        this.pose = {
            x: lerp(this.from.x, this.to.x, e),
            y: lerp(this.from.y, this.to.y, e),
            angle: this.to.angle * fall,
            scale: lerp(this.from.scale, this.to.scale, e),
        };
        if (this.t === Math.ceil(this.TIP_FRAMES * 0.75)) this.bump = 7;
        if (k >= 1) {
            this.pose = { ...this.to };
            this.phase = 'pour';
            this.t = 0;
        }
    },

    // ドロップが びんの口から コロコロ 出てくる（びんも少し ゆれる）
    stepPour() {
        this.t++;
        for (let i = 0; i < this.pourRate && this.queue.length > 0; i++) this.emit(this.queue.pop());
        this.pose.angle = this.to.angle + Math.sin(this.t * 0.9) * 0.02 * Math.max(0, 1 - this.t / this.POUR_FRAMES);
        if (this.queue.length === 0) {
            this.pose = { ...this.to };
            this.phase = 'play';
        }
    },

    stepCork() {
        const c = this.cork;
        if (c.t >= 1) return false;
        c.t = Math.min(1, c.t + 1 / 40);
        const e = easeInOut(c.t);
        c.x = lerp(c.from.x, c.to.x, e);
        c.y = lerp(c.from.y, c.to.y, e) - Math.sin(Math.PI * c.t) * 90 * c.to.scale; // ポンと上へ とんで、おちる
        c.angle = lerp(c.from.angle, c.to.angle, e) + this.dir * Math.PI * 4 * e;
        c.scale = lerp(c.from.scale, c.to.scale, e);
        return true;
    },

    // テーブルの上：転がる・摩擦で止まる・ぶつかる・はしと びんで はねかえる
    stepPhysics() {
        const SUB = 2;
        let moving = false;
        this.balls.forEach(b => {
            if (b.held) {
                // つまんでいる粒の速さ（ほかの粒を おしのける強さに使う）
                b.vx = b.x - (b.lastX ?? b.x);
                b.vy = b.y - (b.lastY ?? b.y);
                b.lastX = b.x;
                b.lastY = b.y;
            }
        });
        for (let sub = 0; sub < SUB; sub++) {
            this.balls.forEach(b => {
                if (b.held) return;
                if (b.vx !== 0 || b.vy !== 0) {
                    b.x += b.vx / SUB;
                    b.y += b.vy / SUB;
                    b.angle += (Math.hypot(b.vx, b.vy) / SUB / b.r) * (b.vx >= 0 ? 1 : -1); // コロコロ
                }
                this.hitEdges(b);
                this.hitJar(b);
            });
            if (this.collide() > 0.3) moving = true;
        }
        this.balls.forEach(b => {
            if (b.held) return;
            b.vx *= this.FRICTION;
            b.vy *= this.FRICTION;
            if (b.vx * b.vx + b.vy * b.vy < 0.001) {
                b.vx = 0;
                b.vy = 0;
            } else {
                moving = true;
            }
        });
        return moving;
    },

    hitEdges(b) {
        const { W, H, BOUNCE } = this;
        if (b.x < b.r) { b.x = b.r; if (b.vx < 0) b.vx = -b.vx * BOUNCE; }
        if (b.x > W - b.r) { b.x = W - b.r; if (b.vx > 0) b.vx = -b.vx * BOUNCE; }
        if (b.y < b.r) { b.y = b.r; if (b.vy < 0) b.vy = -b.vy * BOUNCE; }
        if (b.y > H - b.r) { b.y = H - b.r; if (b.vy > 0) b.vy = -b.vy * BOUNCE; }
    },

    // たおれたびん（四角とみなす）に入りこんだ粒を、いちばん近い面から おしだす
    hitJar(b) {
        const p = this.pose, s = p.scale;
        const c = Math.cos(p.angle), sn = Math.sin(p.angle);
        const dx = b.x - p.x, dy = b.y - p.y;
        let lx = (dx * c + dy * sn) / s + this.cw / 2;
        let ly = (-dx * sn + dy * c) / s + this.ch / 2;
        const rr = b.r / s;
        const { l, r, t, b: bottom } = this.box;
        if (lx < l - rr || lx > r + rr || ly < t - rr || ly > bottom + rr) return;
        const pens = [lx - (l - rr), r + rr - lx, ly - (t - rr), bottom + rr - ly];
        const k = pens.indexOf(Math.min(...pens));
        const nl = [[-1, 0], [1, 0], [0, -1], [0, 1]][k];
        if (k === 0) lx = l - rr;
        if (k === 1) lx = r + rr;
        if (k === 2) ly = t - rr;
        if (k === 3) ly = bottom + rr;
        const w = this.toWorld(p, lx, ly);
        b.x = w.x;
        b.y = w.y;
        const nx = nl[0] * c - nl[1] * sn, ny = nl[0] * sn + nl[1] * c;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0 && !b.held) {
            b.vx -= (1 + this.BOUNCE) * vn * nx;
            b.vy -= (1 + this.BOUNCE) * vn * ny;
        }
    },

    // 粒どうしの ぶつかり（近くのマスの粒だけ しらべる）。いちばん大きく おしもどした きょりを返す
    collide() {
        const balls = this.balls, size = this.cell, n = balls.length;
        const grid = new Map();
        for (let i = 0; i < n; i++) {
            const key = Math.floor(balls[i].x / size) + Math.floor(balls[i].y / size) * 4096;
            const list = grid.get(key);
            if (list) list.push(i); else grid.set(key, [i]);
        }
        let maxFix = 0;
        for (let i = 0; i < n; i++) {
            const a = balls[i];
            const gx = Math.floor(a.x / size), gy = Math.floor(a.y / size);
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    const list = grid.get(gx + ox + (gy + oy) * 4096);
                    if (!list) continue;
                    for (const j of list) {
                        if (j > i) maxFix = Math.max(maxFix, this.resolve(a, balls[j]));
                    }
                }
            }
        }
        return maxFix;
    },

    resolve(a, b) {
        let dx = b.x - a.x, dy = b.y - a.y;
        const min = a.r + b.r;
        let d2 = dx * dx + dy * dy;
        if (d2 >= min * min) return 0;
        if (d2 === 0) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = dx * dx + dy * dy; }
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d;
        // つまんでいる粒は うごかない（おしのけるだけ）。大きい玉ほど 重い
        const ia = a.held ? 0 : 1 / a.m, ib = b.held ? 0 : 1 / b.m;
        const sum = ia + ib;
        if (sum === 0) return 0;
        const fix = Math.max(0, min - d - 0.1);
        a.x -= nx * fix * (ia / sum);
        a.y -= ny * fix * (ia / sum);
        b.x += nx * fix * (ib / sum);
        b.y += ny * fix * (ib / sum);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
            const j = (-(1 + 0.3) * rv) / sum;
            a.vx -= j * ia * nx;
            a.vy -= j * ia * ny;
            b.vx += j * ib * nx;
            b.vy += j * ib * ny;
        }
        return fix;
    },

    // おかたづけ：すこし ふくらんだ道を通って、口へ すいこまれる
    stepClean() {
        const m = this.mouth;
        this.balls = this.balls.filter(b => {
            if (b.delay > 0) { b.delay--; return true; }
            b.fly++;
            const k = Math.min(1, b.fly / this.FLY_FRAMES);
            const e = k * k;
            const cx = (b.sx + m.x) / 2 + (b.sy - m.y) * 0.25;
            const cy = (b.sy + m.y) / 2 - (b.sx - m.x) * 0.25;
            b.x = (1 - e) * (1 - e) * b.sx + 2 * (1 - e) * e * cx + e * e * m.x;
            b.y = (1 - e) * (1 - e) * b.sy + 2 * (1 - e) * e * cy + e * e * m.y;
            b.drawScale = 1 - 0.55 * e;
            b.angle += 0.3;
            return k < 1;
        });
        this.stepCork();
        if (this.balls.length === 0) {
            // ぜんぶ もどったら、びんが おきあがって もとの場所へ（コルクも口へ もどる）
            const rect = DropJar.canvas.getBoundingClientRect();
            this.standFrom = { ...this.pose };
            this.home = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, angle: 0, scale: rect.width / this.cw };
            this.corkFrom = { x: this.cork.x, y: this.cork.y, angle: this.cork.angle, scale: this.cork.scale };
            this.el.classList.remove('is-shown');
            this.phase = 'stand';
            this.t = 0;
        }
    },

    stepStand() {
        this.t++;
        const k = Math.min(1, this.t / this.STAND_FRAMES);
        const e = easeInOut(k);
        const a = this.standFrom, b = this.home;
        this.pose = { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), angle: lerp(a.angle, b.angle, e), scale: lerp(a.scale, b.scale, e) };
        const shape = DropJar.jar;
        const home = this.toWorld(this.pose, shape.cx, shape.rimTop - 12);
        const ce = easeInOut(Math.min(1, k * 1.4));
        const f = this.corkFrom;
        Object.assign(this.cork, {
            x: lerp(f.x, home.x, ce), y: lerp(f.y, home.y, ce) - Math.sin(Math.PI * ce) * 50 * this.pose.scale,
            angle: lerp(f.angle, this.pose.angle, ce), scale: lerp(f.scale, this.pose.scale, ce),
        });
        if (k >= 1) this.close(true);
    },

    // ---------- 指 ----------

    onDown(e) {
        e.preventDefault();
        if (!this.isOpen || this.phase === 'clean' || this.phase === 'stand' || this.holds.has(e.pointerId)) return;
        // 指の下（少し はなれていても）で、いちばん近い粒をつまむ
        let best = null, bestGap = Infinity;
        this.balls.forEach(b => {
            if (b.held) return;
            const gap = Math.hypot(b.x - e.clientX, b.y - e.clientY) - b.r;
            if (gap < Math.max(8, 24 - b.r) && gap < bestGap) {
                best = b;
                bestGap = gap;
            }
        });
        if (!best) return;
        try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 指が すでに はなれているとき */ }
        best.held = true;
        best.vx = 0;
        best.vy = 0;
        best.lastX = best.x;
        best.lastY = best.y;
        this.balls.splice(this.balls.indexOf(best), 1);
        this.balls.push(best); // いちばん上に描く
        this.holds.set(e.pointerId, { ball: best, ox: best.x - e.clientX, oy: best.y - e.clientY, trail: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] });
        this.wake();
    },

    onMove(e) {
        const h = this.holds.get(e.pointerId);
        if (!h) return;
        const b = h.ball;
        b.x = clampNum(e.clientX + h.ox, b.r, this.W - b.r);
        b.y = clampNum(e.clientY + h.oy, b.r, this.H - b.r);
        h.trail.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
        while (h.trail.length > 2 && h.trail[h.trail.length - 1].t - h.trail[0].t > 100) h.trail.shift();
        this.wake();
    },

    // はなす：さいごの 0.1秒の 指の速さで すべっていく（指を止めてから はなしたら、その場に おく）
    onUp(e) {
        const h = this.holds.get(e.pointerId);
        if (!h) return;
        this.holds.delete(e.pointerId);
        const b = h.ball;
        b.held = false;
        const a = h.trail[0], z = h.trail[h.trail.length - 1];
        const dt = z.t - a.t;
        if (dt > 0 && e.timeStamp - z.t < 80) {
            let vx = ((z.x - a.x) / dt) * (1000 / 60);
            let vy = ((z.y - a.y) / dt) * (1000 / 60);
            const v = Math.hypot(vx, vy);
            if (v > this.MAX_FLICK) {
                vx *= this.MAX_FLICK / v;
                vy *= this.MAX_FLICK / v;
            }
            b.vx = vx;
            b.vy = vy;
        } else {
            b.vx = 0;
            b.vy = 0;
        }
        this.wake();
    },

    // ---------- 描く ----------

    draw() {
        const { ctx, dpr } = this;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const ox = this.bump ? Math.sin(this.t * 2.3) * this.bump : 0;
        const oy = this.bump ? Math.cos(this.t * 3.1) * this.bump * 0.6 : 0;
        ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);

        // びん と コルク
        const p = this.pose;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(p.scale, p.scale);
        ctx.drawImage(this.jarImage, -this.cw / 2, -this.ch / 2);
        ctx.restore();
        const c = this.cork;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.scale(c.scale, c.scale);
        DropJar.drawCork(ctx, 'plug');
        DropJar.drawCork(ctx, 'top');
        ctx.restore();

        // 粒のかげ（まとめて1回で塗る。つまんでいる粒は うきあがって、かげが はなれる）
        ctx.fillStyle = 'rgba(110, 70, 30, 0.2)';
        ctx.beginPath();
        this.balls.forEach(b => {
            const r = b.r * b.drawScale;
            const off = b.held ? 7 : 2;
            ctx.moveTo(b.x + off + r, b.y + off * 1.4);
            ctx.arc(b.x + off, b.y + off * 1.4, r, 0, Math.PI * 2);
        });
        ctx.fill();

        // 粒
        this.balls.forEach(b => {
            const img = DropJar.images[b.src];
            if (!img || !img.ready) return;
            const r = b.r * b.drawScale * (b.held ? 1.15 : 1);
            const cos = Math.cos(b.angle) * dpr, sin = Math.sin(b.angle) * dpr;
            ctx.setTransform(cos, sin, -sin, cos, (b.x + ox) * dpr, (b.y + oy) * dpr);
            ctx.drawImage(img, -r, -r, r * 2, r * 2);
            // 100玉・500玉・1000玉は、びんの中と同じ ふちどり
            const fx = b.tier >= 100 ? DropJar.FX[`to${b.tier}`] : null;
            if (fx) {
                ctx.beginPath();
                ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
                ctx.strokeStyle = fx.color.rim;
                ctx.lineWidth = fx.rimWidth;
                ctx.stroke();
            }
        });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
};

function clampNum(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}
