// 「タマのきろく」：びんのふたをタッチすると、びんがコテンとたおれて、ドロップがテーブルにちらばる
//   テーブルは上から見たところ（重力なし）。うしろの きろくの画面が すけて見える、水色のテーブル
//   びんは 左上のすみに たおれて、口が 右下のすみを むく。びんの中に見えていたドロップが、口から コロコロ出てくる
//   ガラスのかべ・口のふちには 当たり判定がある。口は あいているので、ドロップを びんの中に入れることもできる
//   止まったあとは、指でつまんで動かせる（何本の指でも）。はじくと、すべって止まる
//   「おかたづけ」で、びんが おきあがって きろくの定位置に もどり、ドロップが 口から すいこまれて 下から つもり、コルクで ふたをする
//   ちらばった場所は保存しないので、ほかの画面へ行ったり読みこみなおしたりすると、びんにもどっている
// びんの中身・形・絵は js/records.js の DropJar

const DropTable = {
    AREA: 0.3,          // ドロップがテーブルの何わりまで おおうか（こえるときは、出す粒の数を へらす）
    MAX_BALLS: 1500,    // 動きが重くならないための、粒の数の上限
    SIZE_UP: 1.35,      // テーブルの粒は、びんの中より 少し大きく（びんの中の粒の何倍か）
    MIN_R: 9,           // テーブルの粒の半径（px）の下限・上限
    MAX_R: 15,
    FRICTION: 0.97,     // 1こまごとに 速さを どれだけ残すか（摩擦）
    BOUNCE: 0.45,       // テーブルのはしや ガラスに当たったときの はねかえり
    MAX_FLICK: 45,      // はじいたときの速さの上限（px／こま）
    HOP_FRAMES: 24,     // 口から とびだした粒は、しばらく ほかの粒の上を はねて こえる（出たとたんに ぶつかりあって、まんなかに かたまらない）
    GAP: 2.4,           // たおれたびんの うしろの すきま（テーブルの粒の半径の何倍か。粒が1つぶ通れる）
    POUR_PULL: 0.3,     // ぶちまけるとき、びんの中の粒が 口のほうへ ころがる強さ（px／こま²）
    TIP_FRAMES: 36,     // びんが たおれる時間（こま）
    POUR_FRAMES: 70,    // 見えていなかった粒が 口から出てくる時間
    POUR_MAX: 360,      // ぶちまけるのは ここまで（つまって出られない粒は、びんの中に のこる）
    RISE_FRAMES: 34,    // おかたづけで、びんが おきあがって 定位置に もどる時間
    FILL_FRAMES: 150,   // 粒が つぎつぎ 口に あつまってくる時間のはば（ながいほど、口から落ちる ながれが ほそい）
    FLY_FRAMES: 22,     // 1つぶが びんの口の上へ とんでいく時間
    LID_FRAMES: 30,     // さいごに コルクが とんできて ふたをする時間
    HEAP_SLOPE: 1.0,    // つもっている とちゅうの 山の けわしさ（まんなかから 1px はなれると、どれだけ ひくいか）。はじめは けわしい山
    MOUND_SLOPE: 0.3,   // さいごに つもった山の なだらかさ（すそが うまって、ここまで なだらかに なる）

    isOpen: false,
    running: false,
    phase: '',          // 'tip' たおれる → 'pour' ちらばる → 'play' あそぶ → 'rise' おきあがる → 'fill' つもる → 'lid' ふたをする
    balls: [],          // テーブルの上（と、びんの中）の粒
    extra: [],          // びんの中に見えていなかった分（口から つづけて出す）
    holds: new Map(),   // 指（pointerId）ごとに、つまんでいる粒
    bump: 0,            // びんがたおれたときの、テーブルのゆれ（px）

    // ---------- ひらく・とじる ----------

    open() {
        if (this.isOpen) return;
        this.setupDom();
        const jar = DropJar;
        jar.running = false;
        this.saveJar();
        this.isOpen = true;
        this.savedOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        this.el.hidden = false;
        this.resize();
        void this.el.offsetWidth; // テーブルを ふわっと出す
        this.el.classList.add('is-shown');
        this.doneButton.disabled = false;

        const rect = jar.canvas.getBoundingClientRect();
        this.cw = jar.canvas.width;
        this.ch = jar.canvas.height;
        this.jarImage = jar.emptyJarImage();
        jar.canvas.style.visibility = 'hidden';
        this.setupGlass();
        const r = clampNum(jar.baseR * this.SIZE_UP, this.MIN_R, this.MAX_R);
        const s0 = rect.width / this.cw;
        this.from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, angle: 0, scale: s0 };
        this.to = this.restPose(s0, r);
        this.pose = { ...this.from };

        // コルク：ポンと とんで、口の先の、びんの よこに おちる
        const shape = jar.jar;
        const start = this.toWorld(this.from, shape.cx, shape.rimTop - 12 + Math.max(-60, jar.lidY));
        const mouth = this.toWorld(this.to, shape.cx, shape.rimTop);
        const mx = Math.sin(this.to.angle), my = -Math.cos(this.to.angle); // 口の向き
        const side = (this.cw / 2) * this.to.scale * 0.9 + 20;
        this.cork = {
            x: start.x, y: start.y, angle: 0, scale: s0,
            from: { x: start.x, y: start.y, angle: 0, scale: s0 },
            to: {
                x: clampNum(mouth.x + mx * 20 + my * side, 40, this.W - 40),
                y: clampNum(mouth.y + my * 20 - mx * side, 30, this.H - 30),
                angle: this.to.angle + 0.35,
                scale: this.to.scale,
            },
            t: 0,
        };

        this.balls = this.makeBalls(r);
        this.pourRate = Math.max(1, Math.ceil(this.extra.length / this.POUR_FRAMES));
        this.holds.clear();
        this.phase = 'tip';
        this.t = 0;
        this.emptyT = 0;
        this.placeRigid();
        this.wake();
    },

    // handoff：おかたづけが おわった。びんは もう いつもの びんに なっていて、粒も ふたも 同じ場所なので、そのまま 見せる
    //   （ほかの画面へ行くときは しない。もどってきたときに描きなおされる）
    close(handoff) {
        this.isOpen = false;
        this.running = false;
        this.phase = '';
        this.balls = [];
        this.extra = [];
        this.holds.clear();
        this.el.hidden = true;
        this.el.classList.remove('is-shown');
        document.documentElement.style.overflow = this.savedOverflow || '';
        DropJar.canvas.style.visibility = '';
        if (handoff) DropJar.draw();
    },

    // 「おかたづけ」：びんが おきあがって 定位置に もどる → 粒が 口から すいこまれて 下から つもる → コルクで ふたをする
    cleanUp() {
        if (!this.isOpen || ['rise', 'fill', 'lid'].includes(this.phase)) return;
        this.doneButton.disabled = true;
        this.holds.forEach(h => { h.ball.held = false; });
        this.holds.clear();
        this.extra = [];
        // びんの中の粒は、びんと いっしょに おきあがる
        this.balls.forEach(b => {
            b.hop = 0;
            if (b.inside) {
                const l = this.toLocal(b.x, b.y, true);
                Object.assign(b, { rigid: true, lx: l.x, ly: l.y, la: b.angle - this.pose.angle });
            } else {
                b.rigid = false;
            }
        });
        const rect = DropJar.canvas.getBoundingClientRect();
        this.riseFrom = { ...this.pose };
        this.home = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, angle: 0, scale: rect.width / this.cw };
        this.phase = 'rise';
        this.t = 0;
        this.wake();
    },

    setupDom() {
        if (this.el) return;
        const el = document.createElement('div');
        el.id = 'dropTable';
        el.className = 'drop-table';
        el.hidden = true;
        el.innerHTML = '<div class="drop-table-bg"></div>'
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

    // ---------- びん ----------

    // ガラスのかべ：びんの形の折れ線（内がわの面）を、ガラスの厚みの半分だけ 外へずらした「太い線」（太さは ガラスの厚み）
    //   口のふちの でっぱりも 太い線にする。口は あいている
    setupGlass() {
        const jar = DropJar.jar, h = jar.wall / 2;
        this.glassR = h;
        this.glass = jar.segments.map(s => ({ ax: s.ax - s.nx * h, ay: s.ay - s.ny * h, bx: s.bx - s.nx * h, by: s.by - s.ny * h }));
        const rimW = jar.nw + jar.wall + 4, y = jar.rimTop + 5;
        this.glass.push(
            { ax: jar.cx - rimW + h, ay: y, bx: jar.cx - jar.nw - h, by: y },
            { ax: jar.cx + jar.nw + h, ay: y, bx: jar.cx + rimW - h, by: y },
        );
        this.jarReach = Math.max(...jar.points.map(([x, y]) => Math.hypot(x - this.cw / 2, y - this.ch / 2))) + jar.wall + 10;
    },

    // たおれたびんの置き場所：左上のすみに、口を 右下のすみへ むけて（うしろに 粒が1つぶ通れる すきまを あける）
    restPose(s0, r) {
        const gap = r * this.GAP + 6;
        let angle = Math.atan2(this.W, -this.H);
        let pose = null;
        for (let k = 0; k < 2; k++) {
            const e = this.extents(angle);
            const scale = Math.min(s0, (this.W * 0.6) / (e.maxX - e.minX), (this.H * 0.45) / (e.maxY - e.minY));
            pose = { x: gap - e.minX * scale, y: gap - e.minY * scale, angle, scale };
            angle = Math.atan2(this.W - pose.x, -(this.H - pose.y)); // 口（びんの上）が 右下のすみを むく向き
        }
        return pose;
    },

    // angle だけ まわしたびん（ガラスの厚みこみ）の、びんの絵の まんなかからの はば
    extents(angle) {
        const c = Math.cos(angle), s = Math.sin(angle), w = DropJar.jar.wall;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        DropJar.jar.points.forEach(([px, py]) => {
            const dx = px - this.cw / 2, dy = py - this.ch / 2;
            const x = dx * c - dy * s, y = dx * s + dy * c;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        });
        return { minX: minX - w, maxX: maxX + w, minY: minY - w, maxY: maxY + w };
    },

    // びんの絵の中の点（lx, ly）が、画面のどこにあるか
    toWorld(p, lx, ly) {
        const dx = (lx - this.cw / 2) * p.scale, dy = (ly - this.ch / 2) * p.scale;
        const c = Math.cos(p.angle), s = Math.sin(p.angle);
        return { x: p.x + dx * c - dy * s, y: p.y + dx * s + dy * c };
    },

    // 画面の点が、びんの絵の どこにあるか（びんから はなれていたら null。always のときは かならず返す）
    toLocal(x, y, always = false) {
        const p = this.pose, dx = x - p.x, dy = y - p.y;
        if (!always && dx * dx + dy * dy > (this.jarReach * p.scale) ** 2) return null;
        const c = Math.cos(p.angle), s = Math.sin(p.angle);
        return { x: (dx * c + dy * s) / p.scale + this.cw / 2, y: (-dx * s + dy * c) / p.scale + this.ch / 2 };
    },

    nearJar(b, extra) {
        const p = this.pose;
        return Math.hypot(b.x - p.x, b.y - p.y) < this.jarReach * p.scale + b.r + extra;
    },

    // ガラスに めりこんでいたら、めりこんだ向きの反対へ おしだして、はねかえす
    hitGlass(b) {
        const l = this.toLocal(b.x, b.y);
        if (!l) return;
        const s = this.pose.scale, rr = b.r / s + this.glassR;
        let { x: lx, y: ly } = l;
        let nx = 0, ny = 0, hit = false;
        for (const g of this.glass) {
            const q = closestOnSegment(lx, ly, g);
            const ox = lx - q.x, oy = ly - q.y;
            const d2 = ox * ox + oy * oy;
            if (d2 >= rr * rr || d2 === 0) continue;
            const d = Math.sqrt(d2);
            lx = q.x + (ox / d) * rr;
            ly = q.y + (oy / d) * rr;
            nx += ox / d;
            ny += oy / d;
            hit = true;
        }
        if (!hit) return;
        const w = this.toWorld(this.pose, lx, ly);
        b.x = w.x;
        b.y = w.y;
        if (b.held) return;
        const c = Math.cos(this.pose.angle), sn = Math.sin(this.pose.angle);
        const len = Math.hypot(nx, ny) || 1;
        const wx = (nx * c - ny * sn) / len, wy = (nx * sn + ny * c) / len;
        const vn = b.vx * wx + b.vy * wy;
        if (vn < 0) {
            b.vx -= (1 + this.BOUNCE) * vn * wx;
            b.vy -= (1 + this.BOUNCE) * vn * wy;
        }
    },

    // ガラスの かべ ごしに、びんの中と外を 行き来させない（たくさんの粒に おされて、かべを すりぬけたときなど）
    //   入るのも出るのも、口からだけ。かべを こえてしまったら、さいごに いた場所へ もどす
    hitWall(b) {
        this.hitGlass(b);
        const l = this.toLocal(b.x, b.y);
        const inside = l ? DropJar.insideJar(l.x, l.y) : false;
        if (inside !== b.inside) {
            const shape = DropJar.jar;
            // 口から入れるのは、指で入れたとき・ころがって入ったとき・おかたづけのときだけ
            //   （まわりの粒に そっと おされただけでは 入らない。入ると 小さくなって すきまが できるので、つぎつぎ すいこまれてしまう）
            //   ぶちまけている あいだは、出ていった粒は もどらない（口のふちで はねて、また入ってしまわないように）
            const rolling = b.vx * b.vx + b.vy * b.vy > 2.25;
            const blocked = inside && (this.phase === 'pour' ? b.launched : !(b.held || rolling));
            const atMouth = !blocked && l && l.y < shape.rimTop + b.r / this.pose.scale + 12 && Math.abs(l.x - shape.cx) < shape.nw + 2;
            if (!atMouth && b.safeX !== undefined) {
                b.x = b.safeX;
                b.y = b.safeY;
                b.vx *= -0.3;
                b.vy *= -0.3;
                return;
            }
            b.inside = inside;
        }
        b.safeX = b.x;
        b.safeY = b.y;
    },

    // ガラスに どれだけ めりこんでいるか（びんの絵の大きさで。テストで使う）
    glassDepth(b) {
        const l = this.toLocal(b.x, b.y, true), rr = b.r / this.pose.scale + this.glassR;
        return this.glass.reduce((m, g) => { const q = closestOnSegment(l.x, l.y, g); return Math.max(m, rr - Math.hypot(l.x - q.x, l.y - q.y)); }, -Infinity);
    },

    // びんと いっしょに動く粒（たおれる・おきあがるとき）を、びんの絵の中の場所から 置きなおす
    placeRigid() {
        this.balls.forEach(b => {
            if (!b.rigid) return;
            const w = this.toWorld(this.pose, b.lx, b.ly);
            b.x = w.x;
            b.y = w.y;
            b.angle = b.la + this.pose.angle;
            b.r = b.rIn * this.pose.scale;
        });
    },

    // ---------- 粒をつくる ----------

    // びんの「いま」の中身から、テーブルに出す粒をつくる。びんの中に見えている粒は、びんと いっしょに たおれる
    //   合体した玉（100玉・500玉・1000玉）はそのまま。のこりの粒は、テーブルを おおいつくさない数まで ほんとうの数で出す
    //   見えている粒より多いときは、のこりを 口から つづけて出す（びんの おくに あった分）。少ないときは、見えている粒を まんべんなく へらす
    makeBalls(r) {
        const jar = DropJar;
        const drops = jar.drops || [];
        const bigs = jar.balls.filter(b => b.tier >= 100);
        const smalls = jar.balls.filter(b => b.tier < 100);
        const singles = Math.max(0, drops.length - bigs.reduce((sum, b) => sum + b.tier, 0));
        const room = this.AREA * this.W * this.H - bigs.reduce((sum, b) => sum + Math.PI * (r * b.scale) ** 2, 0);
        const n = Math.max(0, Math.min(singles, this.MAX_BALLS - bigs.length, Math.floor(room / (Math.PI * r * r))));
        const keep = smalls.length > n
            ? smalls.filter((b, i) => Math.floor(((i + 1) * n) / smalls.length) > Math.floor((i * n) / smalls.length))
            : smalls;

        const list = bigs.concat(keep).map(b => Object.assign(this.newBall(b.src, b.tier, r * b.scale, jar.baseR * b.scale), {
            rigid: true, lx: b.x, ly: b.y, la: b.angle, inside: jar.insideJar(b.x, b.y), from: b, // from：もとになった びんの粒
        }));
        // 合体した分は、記録の はじめのほうから つかっている。のこりの粒は うしろのほうから まんべんなく えらぶ
        const first = drops.length - singles;
        this.extra = [];
        for (let i = keep.length; i < n; i++) {
            this.extra.push(this.newBall(jar.loadImage(drops[first + Math.floor((i * singles) / n)]), 1, r, jar.baseR));
        }
        // 遠くまで とぶ粒から先に出す（あとから出る粒は 手前で止まるので、先の粒を おしかためない）
        //   テーブルのはしまでの何わりまで とぶか（ひろさが まんべんなく なるように √ でえらぶ）。pop() で 大きいほうから
        this.reach = Array.from({ length: list.length + this.extra.length }, () => Math.sqrt(Math.random())).sort((a, b) => a - b);
        this.cell = 2 * list.concat(this.extra).reduce((m, b) => Math.max(m, b.rTable), r);
        return list;
    },

    // たおす ときの びんの中身を おぼえておく（おかたづけで そのまま もどす。合体した玉も、合体の つづきも）
    //   合体の とちゅうだったら、その合体は とりけして、つぎに タップしたときに やりなおす
    saveJar() {
        const jar = DropJar;
        jar.activeMerges.forEach(m => {
            m.targets.forEach(t => { t.merging = false; });
            jar.mergeQueue.unshift({ type: m.type, groupId: m.groupId, drop: m.drop, targetX: m.targetX, targetY: m.targetY });
        });
        jar.activeMerges = [];
        jar.pendingMerges = 0;
        jar.balls.forEach(b => { b.grow = 0; b.glow = 0; b.popTimer = 0; });
        jar.updateRadii(true);
        this.saved = { balls: jar.balls.slice(), mergeQueue: jar.mergeQueue.slice() };
    },

    // びんを、たおす前の中身に もどす（ならべる場所は moundLayout で きめなおす）
    restoreJar() {
        const jar = DropJar;
        Object.assign(jar, {
            balls: this.saved.balls, mergeQueue: this.saved.mergeQueue, activeMerges: [], pendingMerges: 0, mergeCooldown: 0,
            popEffects: [], sparkles: [], shards: [], fxTexts: [], hitStop: 0, flash: 0, quake: 0, jarKick: 0, heat: 0,
            lidY: 0, lidVy: 0, lidAngle: 0, lidVa: 0, lidRocking: false, running: false,
        });
        jar.updateRadii(true);
    },

    // rTable：テーブルでの半径（px）、rIn：びんの中での半径（びんの絵の大きさで）
    newBall(src, tier, rTable, rIn) {
        return {
            src, tier, rTable, rIn, r: rTable, m: rTable * rTable,
            x: 0, y: 0, vx: 0, vy: 0, angle: Math.random() * Math.PI * 2,
            held: false, inside: false, launched: false, rigid: false,
        };
    },

    // 口から とびだす：口の向きを まんなかに、おうぎ形に ひろがって。とどく きょりは テーブルのはしまでの reach わり
    launch(b) {
        const angle = this.pose.angle - Math.PI / 2 + (Math.random() * 2 - 1) * 1.3;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const reach = this.reach.length ? this.reach.pop() : Math.sqrt(Math.random());
        const v = this.reachToEdge(b.x, b.y, dx, dy, b.rTable) * (0.16 + 0.74 * reach) * (1 - this.FRICTION); // 口の前には 止まらない
        b.vx = dx * v;
        b.vy = dy * v;
        b.launched = true;
        b.hop = this.HOP_FRAMES;
    },

    // びんの おくに あった分：口の すぐ外に 小さく生まれて、とびだしながら ふくらむ
    emit(b) {
        const shape = DropJar.jar;
        const p = this.toWorld(this.pose, shape.cx + (Math.random() * 2 - 1) * shape.nw * 0.6, shape.rimTop - b.rIn - 2);
        b.x = p.x;
        b.y = p.y;
        b.r = b.rIn * this.pose.scale;
        b.safeX = b.x;
        b.safeY = b.y;
        this.launch(b);
        this.balls.push(b);
    },

    // (x, y) から (dx, dy) の向きに進んで、テーブルのはしまでの きょり
    reachToEdge(x, y, dx, dy, r) {
        const tx = dx > 0 ? (this.W - r - x) / dx : dx < 0 ? (r - x) / dx : Infinity;
        const ty = dy > 0 ? (this.H - r - y) / dy : dy < 0 ? (r - y) / dy : Infinity;
        return Math.max(0, Math.min(tx, ty));
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
            if (!this.isOpen) return;
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
        if (this.phase === 'rise') this.stepRise();
        else if (this.phase === 'fill') this.stepFill();
        else if (this.phase === 'lid') this.stepLid();
        if (this.phase === 'rise' || this.phase === 'fill' || this.phase === 'lid' || !this.isOpen) return true;
        if (this.phase === 'tip') this.stepTip();
        else if (this.phase === 'pour') this.stepPour();
        const corkMoving = this.stepCork();
        const moving = this.phase !== 'tip' && this.stepPhysics();
        return this.phase !== 'play' || moving || corkMoving || this.holds.size > 0 || this.bump > 0;
    },

    // コテン：だんだん速く たおれて、テーブルに当たって 少し はねかえる（中の粒も いっしょに）
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
        this.placeRigid();
        if (k >= 1) {
            this.pose = { ...this.to };
            this.placeRigid();
            this.balls.forEach(b => {
                b.rigid = false;
                b.wasInside = b.inside;
                b.safeX = b.x;
                b.safeY = b.y;
                if (!b.inside) this.launch(b); // ふたが開いて、びんの外に とびだしていた粒
            });
            this.phase = 'pour';
            this.t = 0;
        }
    },

    // ドロップが びんの口から コロコロ 出てくる（びんの中の粒は 口のほうへ ころがる。見えていなかった分も 口から出る）
    stepPour() {
        this.t++;
        if (this.t > 8) {
            for (let i = 0; i < this.pourRate && this.extra.length > 0; i++) this.emit(this.extra.pop());
        }
        // びんが からっぽのまま 少し たったら（口のところで ゆれている粒も 出きってから）おわり
        this.emptyT = this.balls.some(b => b.inside) ? 0 : (this.emptyT || 0) + 1;
        if (this.extra.length === 0 && (this.t > this.POUR_MAX || this.emptyT > 15)) {
            this.balls.forEach(b => { b.launched = true; });
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
        c.angle = lerp(c.from.angle, c.to.angle, e) + Math.PI * 4 * e;
        c.scale = lerp(c.from.scale, c.to.scale, e);
        return true;
    },

    // びんの中か外かを しらべて、大きさを なじませる（びんの中は びんの粒の大きさ、外は テーブルの大きさ）
    //   ぶちまけている とちゅうに 口から出た粒は、おうぎ形に とびだす
    //   （中か外かは、うごかすたびに hitWall で しらべている。ここでは、びんから はなれた粒を「外」にするだけ）
    updateInside(b) {
        if (b.inside && !this.nearJar(b, 0)) b.inside = false;
        if (b.wasInside && !b.inside && !b.launched && this.phase === 'pour') this.launch(b);
        b.wasInside = b.inside;
        const target = b.inside ? b.rIn * this.pose.scale : b.rTable;
        b.r += (target - b.r) * 0.15;
        b.m = b.r * b.r;
        return Math.abs(target - b.r) > 0.2;
    },

    // テーブルの上：転がる・摩擦で止まる・ぶつかる・はしと ガラスで はねかえる
    stepPhysics() {
        const SUB = 2;
        let moving = false;
        const mouth = this.toWorld(this.pose, DropJar.jar.cx, DropJar.jar.rimTop - 80); // 口の 少し先
        this.balls.forEach(b => {
            if (b.hop > 0) b.hop--;
            if (this.updateInside(b)) moving = true;
            if (b.held) {
                // つまんでいる粒の速さ（ほかの粒を おしのける強さに使う）
                b.vx = b.x - (b.lastX ?? b.x);
                b.vy = b.y - (b.lastY ?? b.y);
                b.lastX = b.x;
                b.lastY = b.y;
                return;
            }
            // ぶちまけるとき、びんの中の粒は 口の先へ ころがる（肩の すみに ひっかからない）
            if (this.phase === 'pour' && b.inside) {
                const dx = mouth.x - b.x, dy = mouth.y - b.y, d = Math.hypot(dx, dy) || 1;
                b.vx += (dx / d) * this.POUR_PULL;
                b.vy += (dy / d) * this.POUR_PULL;
            }
        });
        for (let sub = 0; sub < SUB; sub++) {
            this.balls.forEach(b => {
                if (b.held) return;
                if (b.vx !== 0 || b.vy !== 0) {
                    this.moveBall(b, b.vx / SUB, b.vy / SUB);
                    b.angle += (Math.hypot(b.vx, b.vy) / SUB / b.r) * (b.vx >= 0 ? 1 : -1); // コロコロ
                }
                this.hitEdges(b);
            });
            if (this.collide() > 0.3) moving = true;
            this.balls.forEach(b => { if (this.nearJar(b, 0)) this.hitWall(b); });
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

    // びんの近くでは、ガラスを すりぬけないように 少しずつ動かす
    moveBall(b, dx, dy) {
        const dist = Math.hypot(dx, dy);
        const near = this.nearJar(b, dist);
        const n = near ? Math.max(1, Math.ceil(dist / Math.max(1, b.r * 0.6))) : 1;
        for (let k = 0; k < n; k++) {
            b.x += dx / n;
            b.y += dy / n;
            if (near) this.hitWall(b);
        }
    },

    hitEdges(b) {
        const { W, H, BOUNCE } = this;
        if (b.x < b.r) { b.x = b.r; if (b.vx < 0) b.vx = -b.vx * BOUNCE; }
        if (b.x > W - b.r) { b.x = W - b.r; if (b.vx > 0) b.vx = -b.vx * BOUNCE; }
        if (b.y < b.r) { b.y = b.r; if (b.vy < 0) b.vy = -b.vy * BOUNCE; }
        if (b.y > H - b.r) { b.y = H - b.r; if (b.vy > 0) b.vy = -b.vy * BOUNCE; }
    },

    // 粒どうしの ぶつかり（近くのマスの粒だけ しらべる）。いちばん大きく おしもどした きょりを返す
    collide() {
        const balls = this.balls, size = this.cell, n = balls.length;
        const grid = new Map();
        for (let i = 0; i < n; i++) {
            if (balls[i].hop > 0) continue;
            const key = Math.floor(balls[i].x / size) + Math.floor(balls[i].y / size) * 4096;
            const list = grid.get(key);
            if (list) list.push(i); else grid.set(key, [i]);
        }
        let maxFix = 0;
        for (let i = 0; i < n; i++) {
            const a = balls[i];
            if (a.hop > 0) continue;
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

    // ---------- おかたづけ ----------

    // びんが おきあがって、きろくの定位置へ もどる（中の粒も いっしょに）
    stepRise() {
        this.t++;
        const k = Math.min(1, this.t / this.RISE_FRAMES);
        const e = easeInOut(k);
        const a = this.riseFrom, b = this.home;
        this.pose = { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), angle: lerp(a.angle, b.angle, e), scale: lerp(a.scale, b.scale, e) };
        this.placeRigid();
        if (k >= 1) this.startFill();
    },

    // びんを たおす前の中身に もどし（合体した玉も、合体の つづきも そのまま）、その粒を なだらかな山の形に ならべなおして「おく場所」にする
    //   テーブルの粒は、もとになった びんの粒の場所へ もどる（100玉は 100玉のまま）
    //   びんの粒が ない粒（びんの おくに あった分）は、テーブルに 出なかった びんの粒の かわりになる。あまったら、口で すいこまれて 見えなくなる
    //   びんの中に 入れておいた粒は、かならず のこる（場所が たりなければ、いちばん遠い粒と いれかわる）
    //   粒は 口の上から とびこんで、いまの 山の てっぺんに 落ち、斜面を ころがって おく場所で 止まる（つもる じゅんばんは moundLayout）
    //   粒どうしで おしあう計算は しないので、つもった粒は ぴたっと 止まる。ふたが しまったら、そのまま いつもの びん
    startFill() {
        this.restoreJar();
        const shape = DropJar.jar;
        const mouth = this.toWorld(this.pose, shape.cx, shape.rimTop);
        const dist = b => Math.hypot(b.x - mouth.x, b.y - mouth.y);
        const inside = this.balls.filter(b => b.inside);
        const outside = this.balls.filter(b => !b.inside).sort((a, b) => dist(a) - dist(b));
        const drops = inside.concat(outside);

        // テーブルの粒と びんの粒を くみあわせる
        const left = new Set(DropJar.balls);
        drops.forEach(b => {
            b.home = b.from && left.has(b.from) ? b.from : null;
            if (b.home) left.delete(b.home);
        });
        const take = tier => {
            const j = [...left].find(x => x.tier === tier);
            if (j) left.delete(j);
            return j || null;
        };
        inside.forEach(b => {
            if (b.home) return;
            b.home = take(b.tier);
            if (b.home) return;
            const giver = outside.slice().reverse().find(o => o.home && o.home.tier === b.tier);
            if (giver) {
                b.home = giver.home;
                giver.home = null;
            }
        });
        outside.forEach(b => { if (!b.home) b.home = take(b.tier); });
        const spawned = [...left]; // テーブルの粒が たりない分：口の上から 入ってくる

        const homes = drops.filter(b => b.home).map(b => b.home).concat(spawned);
        const layout = this.moundLayout(homes);
        const delayOf = j => Math.floor((layout.get(j).rank / Math.max(1, homes.length)) * this.FILL_FRAMES);
        drops.forEach((b, n) => {
            Object.assign(b, { rigid: false, held: false, t: 0, sx: b.x, sy: b.y, sr: b.r });
            b.slot = b.home ? { ball: b.home, landY: layout.get(b.home).landY } : null;
            if (b.slot) b.slot.ball.src = b.src;
            if (b.inside) {
                b.stage = b.slot ? 'roll' : 'gone'; // びんの中にいた粒は、そのまま 山の場所へ ころがる
                b.delay = b.slot ? delayOf(b.home) : 0;
            } else {
                b.stage = 'fly';
                b.delay = b.slot ? delayOf(b.home) : Math.floor((n / drops.length) * this.FILL_FRAMES);
                b.gather = this.gatherPoint();
            }
        });
        this.balls = this.balls.filter(b => b.stage !== 'gone');
        spawned.forEach(j => {
            const at = this.gatherPoint();
            const r = j.r * this.pose.scale;
            const b = this.newBall(j.src, j.tier, r, j.r);
            Object.assign(b, {
                slot: { ball: j, landY: layout.get(j).landY }, stage: 'spawn', hidden: true, t: 0, x: at.x, y: at.y, r, sx: at.x, sy: at.y, sr: r,
                delay: delayOf(j) + this.FLY_FRAMES,
            });
            this.balls.push(b);
        });
        this.phase = 'fill';
        this.t = 0;
    },

    // びんの粒（大きさの ちがう 100玉なども）を、なだらかな山の形に ならべる（びんの絵の大きさで）。粒ごとに { rank, landY } を返す
    //   ① order の じゅんばんに、六角形の あみの目のうち「高さ ＋ まんなかからの きょり × MOUND_SLOPE」が いちばん ひくい、空いている場所に おく
    //     （上の面が なだらかな山）。大きい玉は、そこから 下に つかえるまで しずめる（すきまの上に うかない）
    //   ② つもる じゅんばん（rank）は、おいた場所の「高さ ＋ まんなかからの きょり × HEAP_SLOPE」が ひくい順（まんなかから けわしく つもり、すそが あとから うまる）
    //   粒は いまの 山の てっぺんに 落ちてから ころがってくる（landY）。入りきらない粒は（ふつうは ない）、いまの場所のまま
    moundLayout(order) {
        const result = new Map();
        if (!order.length) return result;
        const jar = DropJar.jar;
        const rs = Math.min(...order.map(b => b.r)), d = 2 * rs + 0.4, rowH = (d * Math.sqrt(3)) / 2;
        const y0 = jar.bottom - rs - 0.5;
        const cands = [];
        for (let k = 0; y0 - k * rowH > jar.shoulderBottom + rs; k++) {
            const y = y0 - k * rowH;
            const reach = Math.ceil(jar.bw / d) + 1;
            for (let m = -reach; m <= reach; m++) {
                const x = jar.cx + m * d + ((k % 2) * d) / 2;
                if (!this.fitsInJar(x, y, rs + 0.3)) continue;
                cands.push({ x, y, free: true, p: y0 - y + Math.abs(x - jar.cx) * this.MOUND_SLOPE + Math.random() * d * 0.6 });
            }
        }
        cands.sort((a, b) => a.p - b.p);
        const placed = [];
        const clear = (x, y, r) => this.fitsInJar(x, y, r + 0.3) && placed.every(o => Math.hypot(o.x - x, o.y - y) >= o.r + r + 0.3);
        order.forEach(ball => {
            const r = ball.r, big = r > rs + 0.01;
            const spot = cands.find(c => c.free && (!big || clear(c.x, c.y, r)));
            if (!spot) {
                placed.push({ ball, x: ball.x, y: ball.y, r });
                return;
            }
            let { x, y } = spot;
            if (big) while (clear(x, y + 0.5, r)) y += 0.5;
            cands.forEach(c => { if (c.free && Math.hypot(c.x - x, c.y - y) < r + rs + 0.3) c.free = false; });
            placed.push({ ball, x, y, r });
            Object.assign(ball, { x, y, px: x, py: y, va: 0, settled: true, calmFrames: 20, wasHit: false });
        });
        const heap = o => y0 - o.y + Math.abs(o.x - jar.cx) * this.HEAP_SLOPE;
        const top = Math.max(0, ...placed.filter(o => Math.abs(o.x - jar.cx) < d).map(o => y0 - o.y)); // さいごの 山の てっぺん
        placed.sort((a, b) => heap(a) - heap(b)).forEach((o, rank) => {
            const peak = Math.min(top, heap(o)); // この粒が つもるときの 山の てっぺん
            result.set(o.ball, { rank, landY: Math.max(jar.shoulderBottom + o.r, y0 - peak - o.r) });
        });
        return result;
    },

    // (x, y) に 半径 rr の粒が、びんの かべに かからずに 入るか（びんの絵の大きさで）
    fitsInJar(x, y, rr) {
        if (!DropJar.insideJar(x, y)) return false;
        return DropJar.jar.segments.every(g => {
            const q = closestOnSegment(x, y, g);
            return Math.hypot(x - q.x, y - q.y) >= rr;
        });
    },

    // とんでいく道（k：0〜1）。ポンと 上へ とびあがり、びんより 上を よこへ わたって、口の上の 真上から まっすぐ 口へ とびこむ
    //   よこの速さは まんなかで いちばん速く、たかい所を わたる あいだも よこへ うごきつづけるので、空中で 止まって見えない
    //   口の ほぼ真下から 高く とびあがる粒は、よこに 少し ふくらむ（まっすぐ 上がって まっすぐ 落ちると、てっぺんで 止まって見える）
    flyAt(b, k) {
        const s = this.pose.scale, m = b.gather, w = 50 * s;
        const dx = m.x - b.sx, top = this.flyTop(b), u = 1 - k;
        const swing = Math.abs(dx) < 2 * w && b.sy - top > 2 * w ? (b.sx >= m.x ? 1 : -1) * w * 6.75 * k * u * u : 0;
        return {
            x: b.sx + dx * k * k * (3 - 2 * k) + swing,
            y: u * u * u * b.sy + 3 * u * k * top + k * k * k * m.y,
        };
    },

    // とんでいく道の、山なりの 高さ（口の上の 少し上。上のほうから とんでくる粒は、ここまで おりてくる）
    flyTop(b) {
        return b.gather.y - 80 * this.pose.scale;
    },

    // 口から 落ちはじめる（v：はじめの 速さ px／こま）。落ちる先は、いまの 山の てっぺん
    startFall(b, v) {
        const shape = DropJar.jar;
        const land = this.toWorld(this.pose, shape.cx + (Math.random() - 0.5) * b.slot.ball.r, b.slot.landY);
        Object.assign(b, { stage: 'fall', t: 0, sx: b.x, sy: b.y, tx: land.x, ty: land.y, v, d: 0, len: Math.max(1, Math.hypot(land.x - b.x, land.y - b.y)) });
    },

    // 粒が あつまる、口の上の まんなかあたり
    gatherPoint() {
        const shape = DropJar.jar;
        return this.toWorld(this.pose, shape.cx + (Math.random() * 2 - 1) * shape.nw * 0.35, shape.rimTop - 16 - Math.random() * 22);
    },

    // 'fly'：山なりに とんで、口の 真上から 口へ とびこむ（とびながら びんの粒の大きさに ちぢむ）
    // 'fall'：とびこんだ いきおいのまま、どんどん 速く 落ちて、いまの 山の てっぺんへ（とちゅうで 止まらない）
    // 'roll'：山の斜面を ころがって、おく場所で ぴたっと 止まる
    stepFill() {
        this.t++;
        const s = this.pose.scale;
        this.balls = this.balls.filter(b => {
            if (b.stage === 'done') return true;
            if (b.delay > 0) {
                b.delay--;
                return true;
            }
            b.hidden = false;
            b.t++;
            if (b.stage === 'fly') {
                const k = Math.min(1, b.t / this.FLY_FRAMES);
                const at = this.flyAt(b, k);
                b.x = at.x;
                b.y = at.y;
                b.r = lerp(b.sr, b.slot ? b.slot.ball.r * s : 0.5, k);
                b.angle += 0.3;
                if (k < 1) return true;
                if (!b.slot) return false; // おく場所がない：口で すいこまれて 見えなくなる
                this.startFall(b, (3 * (b.gather.y - this.flyTop(b))) / this.FLY_FRAMES); // とびこんだ ときの 速さのまま
                return true;
            }
            if (b.stage === 'spawn') {
                this.startFall(b, 4 * s); // たりない分：口の上から 落ちてくる
                return true;
            }
            if (b.stage === 'fall') {
                b.v = Math.min(b.v + 0.6 * s, 30 * s); // 重力で どんどん 速く（はやすぎない）
                b.d += b.v;
                const k = Math.min(1, b.d / b.len);
                b.x = lerp(b.sx, b.tx, k);
                b.y = lerp(b.sy, b.ty, k);
                b.angle += 0.08;
                if (k >= 1) Object.assign(b, { stage: 'roll', t: 0, sx: b.x, sy: b.y, frames: 0 });
                return true;
            }
            // 'roll'：はじめは はやく、止まる前に ゆっくり（ころがった きょりの分だけ まわる）
            const to = this.toWorld(this.pose, b.slot.ball.x, b.slot.ball.y);
            if (!b.frames) b.frames = Math.max(4, Math.round(Math.hypot(to.x - b.sx, to.y - b.sy) / 4));
            const k = Math.min(1, b.t / b.frames);
            const e = 1 - (1 - k) * (1 - k);
            const nx = lerp(b.sx, to.x, e), ny = lerp(b.sy, to.y, e);
            b.angle += (Math.hypot(nx - b.x, ny - b.y) / Math.max(1, b.r)) * (to.x >= b.sx ? 1 : -1);
            b.x = nx;
            b.y = ny;
            b.r = lerp(b.sr, b.slot.ball.r * s, k);
            if (k >= 1) {
                b.stage = 'done';
                b.slot.ball.angle = b.angle; // いつもの びんでも、同じ向き
            }
            return true;
        });
        if (this.balls.every(b => b.stage === 'done')) {
            // さいごに コルクが とんできて、ふたをする（テーブルは すうっと 消える）
            this.corkFrom = { x: this.cork.x, y: this.cork.y, angle: this.cork.angle, scale: this.cork.scale };
            this.el.classList.remove('is-shown');
            this.phase = 'lid';
            this.t = 0;
        }
    },

    stepLid() {
        this.t++;
        const k = Math.min(1, this.t / this.LID_FRAMES);
        const e = easeInOut(k);
        const shape = DropJar.jar;
        const home = this.toWorld(this.pose, shape.cx, shape.rimTop - 12);
        const f = this.corkFrom;
        Object.assign(this.cork, {
            x: lerp(f.x, home.x, e), y: lerp(f.y, home.y, e) - Math.sin(Math.PI * e) * 60 * this.pose.scale,
            angle: lerp(f.angle, 0, e), scale: lerp(f.scale, this.pose.scale, e),
        });
        if (k >= 1) this.close(true);
    },

    // ---------- 指 ----------

    onDown(e) {
        e.preventDefault();
        if (!this.isOpen || ['tip', 'rise', 'fill', 'lid'].includes(this.phase) || this.holds.has(e.pointerId)) return;
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

    // つまんだ粒は 指を追いかける。ガラスは すりぬけない（口からなら、びんの中へ入れられる）
    onMove(e) {
        const h = this.holds.get(e.pointerId);
        if (!h) return;
        const b = h.ball;
        const tx = clampNum(e.clientX + h.ox, b.r, this.W - b.r);
        const ty = clampNum(e.clientY + h.oy, b.r, this.H - b.r);
        this.moveBall(b, tx - b.x, ty - b.y);
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

        // おかたづけで びんへ とんでいく粒は、びんの うしろを通る（びんの中に うかんで見えないように）
        const behind = b => b.stage === 'fly';
        this.balls.forEach(b => { if (behind(b)) this.drawBall(b, ox, oy); });
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

        // 粒のかげ（まとめて1回で塗る。つまんでいる粒は うきあがって、かげが はなれる。びんの中の粒は かげが小さい）
        ctx.fillStyle = 'rgba(30, 80, 120, 0.2)';
        ctx.beginPath();
        this.balls.forEach(b => {
            if (b.hidden || behind(b)) return;
            const off = b.held ? 7 : b.inside || b.rigid || ['fall', 'roll', 'done'].includes(b.stage) ? 1 : 2;
            ctx.moveTo(b.x + off + b.r, b.y + off * 1.4);
            ctx.arc(b.x + off, b.y + off * 1.4, b.r, 0, Math.PI * 2);
        });
        ctx.fill();

        // 粒
        this.balls.forEach(b => { if (!behind(b)) this.drawBall(b, ox, oy); });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    },

    drawBall(b, ox, oy) {
        const { ctx, dpr } = this;
        const img = DropJar.images[b.src];
        if (!img || !img.ready || b.hidden) return;
        const r = b.r * (b.held ? 1.15 : 1);
        const cos = Math.cos(b.angle) * dpr, sin = Math.sin(b.angle) * dpr;
        ctx.setTransform(cos, sin, -sin, cos, (b.x + ox) * dpr, (b.y + oy) * dpr);
        ctx.drawImage(img, -r, -r, r * 2, r * 2);
        // 100玉・500玉・1000玉は、びんの中と同じ ふちどり
        const fx = b.tier >= 100 ? DropJar.FX[`to${b.tier}`] : null;
        if (fx) {
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, r - 1), 0, Math.PI * 2);
            ctx.strokeStyle = fx.color.rim;
            ctx.lineWidth = fx.rimWidth * Math.min(1, r / b.rTable);
            ctx.stroke();
        }
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
