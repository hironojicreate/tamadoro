// ヘおん マスタークラスの 左手（おんぷよみ／ヘおん。js/modes/notes-bass.js の マスタークラス1〜4）
//   アプリが 右手（メロディ。js/songs.js の TamaSongs.make）を ひき、子どもが 左手（ヘ音記号・単音）を ひく。
//   左手は「左手の 音の ながれの ルール」（docs/handoff-music.md。ユーザーと きめた もの）で つくる：
//     A 曲の かたち：1〜2小節は 左手 やすみ（メロディだけで 印象づけ）、3〜6小節は 段階の リズム、
//       7小節め（V）は ねもとで はじまり ねもとで おわる、8小節め（I）は 1拍めが 主音で 同じ 音を つづけない（4ぶ×2＋2ぶ）
//     B 音：単音・白い けんばん・ひくいファ〜シ3（41〜59）、手は ド3〜ソ3 が 中心。1拍めは ねもと、まんなかは 和音の 音か
//       経過音・刺繍音（2度で 入って 2度で ぬける）、さいごは 和音の 音か つぎの ねもとの となり。とびは 5度まで、4ぶどうしは 3度まで
//     C リズム：全(W)・2ぶ×2(H)・2ぶ＋4ぶ×2(HQQ)・4ぶ×2＋2ぶ(QQH)・4ぶ×4(Q)。全・2ぶ ばかりに しない、4ぶ×4 は すくなく
//     E 赤本（和声 理論と実習）の きほん：S → D → T の 完全終止（バスは ねもと）、D → S は つかわない、
//       限定進行（みちびく 音 → 主音、7の 音は 2度 下）、外声の 連続5度・8度（反行も）と ソプラノが とぶ 並達を さける、
//       右手の 終止は 2度で 主音へ（アプリの メロディを なおす）
//   TamaLeftHand.make(stage, random)  → { left: true, stage, family, style, rhythm, phrases（右手）, lh: [{ chord, kind, events }] }
//   TamaLeftHand.STAGES・SONGS  段階ごとの リズムと 系統、系統ごとの 和音の 進行
//   試作の 道具（がくふの 画像と WAV）：tools/left-hand-proto.js

const TamaLeftHand = {
    LOW: 41,   // ひくいファ
    HIGH: 59,  // シ3
    BEATS: { W: [4], H: [2, 2], HQQ: [2, 1, 1], QQH: [1, 1, 2], Q: [1, 1, 1, 1] },

    // 段階：3〜6小節の リズム（ならびは ランダム。となり どうし ちがう）・7小節め・8小節めの リズム・系統
    STAGES: {
        1: { name: 'のばす', body: ['W', 'W', 'H', 'HQQ'], seventh: 'W', eighth: 'QQH', families: ['church', 'nihon', 'sus4'] },
        2: { name: '2ぶ音符', body: ['H', 'H', 'HQQ', 'QQH'], seventh: 'HQQ', eighth: 'QQH', families: ['doyo', 'jazz', 'modern'] },
        3: { name: 'まぜて うごく', body: ['HQQ', 'QQH', 'H', 'Q'], seventh: 'HQQ', eighth: 'QQH', families: ['pops', 'rock', 'minor'] },
        4: { name: 'よく うごく', body: ['QQH', 'Q', 'HQQ', 'H'], seventh: 'Q', eighth: 'QQH', families: ['classic', 'game', 'bossa'] },
    },

    // 系統：もとに する 曲調（名前・メロディの 性格・リズム）と、左手の ための 和音の 進行
    //   白い けんばんだけ。6〜8小節は S（IV か II）→ D（V）→ T（I）。D → S は つかわない
    //   （黒い けんばんが いる 系統（せつない・ブルース など）と おきなわ は まだ）
    SONGS: {
        church: { style: 'hymn', chords: ['C', 'Am', 'Dm', 'G', 'C', 'F', 'G', 'C'] },
        nihon: { style: 'yonanuki', chords: ['C', 'Am', 'F', 'C', 'Am', 'F', 'G', 'C'] },
        sus4: { style: 'sus4', chords: ['C', 'F', 'Csus4', 'C', 'Am', 'F', 'G', 'C'] },
        doyo: { style: 'doyo', chords: ['C', 'F', 'C', 'G7', 'C', 'F', 'G7', 'C'] },
        jazz: { style: 'junkan', chords: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'G7', 'Cmaj7'] },
        modern: { style: 'citypop', chords: ['Cmaj7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Fmaj7', 'G7', 'Cmaj7'] },
        pops: { style: 'fifties', chords: ['C', 'Am', 'F', 'G', 'C', 'F', 'G7', 'C'] },
        rock: { style: 'ballad', chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'C'] },
        minor: { style: 'sad', chords: ['Am', 'Dm', 'Em', 'Am', 'F', 'Dm', 'Em', 'Am'] },
        classic: { style: 'cadence', chords: ['C', 'F', 'G7', 'C', 'Am', 'Dm', 'G7', 'C'] },
        game: { style: 'fanfare', chords: ['C', 'G', 'Am', 'Em', 'F', 'Dm', 'G', 'C'] },
        bossa: { style: 'bossa', chords: ['Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7'] },
    },

    white(m) {
        return [0, 2, 4, 5, 7, 9, 11].includes(((m % 12) + 12) % 12);
    },

    // lo〜hi の なかで pc（0〜11）の 音
    inRange(pc, lo, hi) {
        const out = [];
        for (let m = lo; m <= hi; m++) if (m % 12 === pc) out.push(m);
        return out;
    },

    nearest(list, to) {
        return list.reduce((a, m) => (Math.abs(m - to) < Math.abs(a - to) ? m : a));
    },

    // 和音の 音（ねもと・3度・5度。0〜11）
    tonesOf(chord) {
        const q = TamaSongs.parse(chord);
        return q.intervals.slice(0, 3).map(i => (q.root + i) % 12);
    },

    make(stage, random = Math.random) {
        const plan = this.STAGES[stage];
        const family = plan.families[Math.floor(random() * plan.families.length)];
        const spec = this.SONGS[family];
        const base = TamaSongs.STYLES.find(s => s.id === spec.style);
        const style = { ...base, chords: spec.chords };
        const minor = style.key === 'Am';
        const tonicPc = minor ? 9 : 0;
        // 外声の 禁則が のこったら（左手が 全音符で うごけない ところ など）、同じ 系統で つくりなおす（6かい まで。いちばん よい もの）
        let best = null;
        for (let tries = 0; tries < 6; tries++) {
            const rhythm = TamaSongs.pickRhythm(style, random);
            const phrases = TamaSongs.make(style, random, rhythm).map(p => ({ ...p, notes: [...p.notes] }));
            this.fixMelodyCadence(phrases, tonicPc);
            const lh = this.leftHand(phrases, plan, minor, random);
            const song = { left: true, stage, family, style, rhythm, phrases, lh };
            const { faults, repeats } = this.check(song);
            const score = faults * 10 + repeats;
            if (!best || score < best.score) best = { song, score };
            if (faults === 0 && repeats <= 1) break;
        }
        return best.song;
    },

    // 左手の たしかめ：外声の 禁則の かず・同じ 音の くりかえしの かず
    check(song) {
        const ev = [];
        song.lh.forEach((bar, bi) => {
            let pos = 0;
            bar.events.forEach(e => { if (!e.rest) ev.push({ t: bi * 4 + pos, m: e.notes[0] }); pos += e.beats; });
        });
        let faults = 0;
        let repeats = 0;
        ev.slice(1).forEach((e, i) => {
            faults += this.outerFaults(song.phrases, ev[i].t, ev[i].m, e.t, e.m);
            if (e.m === ev[i].m) repeats++;
        });
        return { faults, repeats };
    },

    // 右手の 終止（赤本：完全終止の ソプラノは 主音へ 2度で）：7小節めの さいごの 音が 8小節めの はじめの 主音へ とぶ ときは、
    //   主音の となりの 白い けんばん（もとの 音に ちかい ほう）に なおす
    fixMelodyCadence(phrases, tonicPc) {
        const p7 = phrases[phrases.length - 2];
        const p8 = phrases[phrases.length - 1];
        if (p8.rhythm[0] !== '●' || !p7.rhythm.endsWith('●')) return;
        const target = p8.notes[0];
        if (((target % 12) + 12) % 12 !== tonicPc) return;
        const last = p7.notes[p7.notes.length - 1];
        if (Math.abs(last - target) <= 2) return;
        const steps = [target - 2, target - 1, target + 1, target + 2].filter(m => this.white(m));
        p7.notes[p7.notes.length - 1] = this.nearest(steps, last);
    },

    // 拍 t（曲の はじめから）の メロディの 音（メロディは 4ぶ音符と 4ぶきゅうふ。きゅうふは null）
    melodyAt(phrases, t) {
        const bar = Math.floor(t / 4);
        const k = t - bar * 4;
        const ph = phrases[bar];
        if (!ph || !Number.isInteger(k) || ph.rhythm[k] !== '●') return null;
        return ph.notes[ph.rhythm.slice(0, k).split('').filter(c => c === '●').length];
    },

    // 拍 t1〜t2（t2 は ふくまない）で さいごに はじまる メロディの 音（なければ null）
    melodyBefore(phrases, t1, t2) {
        for (let t = Math.ceil(t2) - 1; t >= t1; t--) {
            const m = this.melodyAt(phrases, t);
            if (m != null) return m;
        }
        return null;
    },

    // 外声（メロディ ＝ ソプラノ、左手 ＝ バス）の 禁則の かず：バスが（t1, b1）→（t2, b2）と かわる ところで、
    //   かわる すぐ まえの ひびき（b1 と、t2 の まえに さいごに 鳴った メロディ）→ かわった ひびき（b2 と t2 の メロディ）を くらべる
    //   （バスが のびている あいだに メロディが うごいても 連続には ならない）
    outerFaults(phrases, t1, b1, t2, b2) {
        const m1 = this.melodyBefore(phrases, t1, t2);
        const m2 = this.melodyAt(phrases, t2);
        if (m1 == null || m2 == null) return 0;
        const perfect = (m, b) => { const iv = (((m - b) % 12) + 12) % 12; return iv === 0 || iv === 7 ? iv : -1; };
        const p1 = perfect(m1, b1);
        const p2 = perfect(m2, b2);
        const dm = m2 - m1;
        const db = b2 - b1;
        if (p2 < 0 || (dm === 0 && db === 0)) return 0;
        if (p1 === p2 && dm !== 0 && db !== 0) return 1;                              // 連続5度・8度（反行も）
        if (Math.sign(dm) === Math.sign(db) && dm !== 0 && Math.abs(dm) > 2) return 1; // 並達（ソプラノが とぶ）
        return 0;
    },

    leftHand(phrases, plan, minor, random) {
        const { LOW, HIGH, BEATS } = this;
        const n = phrases.length;
        const tonicPc = minor ? 9 : 0;
        const leading = (tonicPc + 11) % 12; // みちびく 音（ハ長調の シ。イ短調の ソ♯ は 白い けんばんに ないので なし）
        const home = minor ? [45, 52] : [48, 55]; // 手の いち（ハ長調 ド3〜ソ3、イ短調 ラ2〜ミ3）
        const dominant = minor ? 52 : 55;  // 7小節め（V）の ねもと：ソ3（イ短調は ミ3）
        const tonic = minor ? 45 : 48;     // 8小節め（I）の ねもと：ド3（イ短調は ラ2）

        // 3〜6小節の リズム（となり どうし ちがう。6小節めと 7小節めも ちがう）
        const shuffle = list => {
            const a = [...list];
            for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
            return a;
        };
        let body = plan.body;
        for (let t = 0; t < 200; t++) {
            body = shuffle(plan.body);
            if (body.every((r, i) => i === 0 || r !== body[i - 1]) && body[body.length - 1] !== plan.seventh) break;
        }
        const rhythms = ['REST', 'REST', ...body, plan.seventh, plan.eighth];

        // ねもとの 高さ：3〜6小節の ねもとの オクターブを ぜんぶ ためして（2〜3とおりずつ）、いちばん よい ものを えらぶ。
        //   全音符の 小節（なかで うごけない）から つぎの ねもとへの とびが 5度を こえない こと、手の いち（ド3〜ソ3）に いること、
        //   とびが ちいさい ことを よしと する。7小節めは V の ねもと、8小節めは 主音
        const roots = new Array(n).fill(null);
        roots[n - 2] = dominant;
        roots[n - 1] = tonic;
        const free = [];
        for (let i = 2; i < n - 2; i++) free.push(i);
        const options = free.map(i => this.inRange(TamaSongs.parse(phrases[i].chord).root, LOW, HIGH));
        let bestRoots = null;
        const tryRoots = (k, picked) => {
            if (k === free.length) {
                const r = [...roots];
                free.forEach((i, j) => { r[i] = picked[j]; });
                let cost = 0;
                for (let i = 3; i < n; i++) {
                    const d = Math.abs(r[i] - r[i - 1]);
                    const steps = this.BEATS[rhythms[i - 1]].length; // まえの 小節の 音の かず（おおいほど とちゅうで つなげる）
                    if (d > 7 * steps) cost += 100;
                    else if (d > 7) cost += steps === 1 ? 100 : 3;
                    cost += d * 0.3;
                }
                free.forEach(i => { if (r[i] < home[0] || r[i] > home[1]) cost += 2; });
                if (!bestRoots || cost < bestRoots.cost) bestRoots = { r, cost };
                return;
            }
            options[k].forEach(m => tryRoots(k + 1, [...picked, m]));
        };
        tryRoots(0, []);
        bestRoots.r.forEach((m, i) => { roots[i] = m; });

        const onsetsOf = (i, beats) => beats.map((_, j) => i * 4 + beats.slice(0, j).reduce((a, x) => a + x, 0));

        // 1小節の 音を えらぶ（ルール B・E。ひくい コストの ものを）
        const fill = (i, rhythm, before) => {
            const beats = BEATS[rhythm];
            const onsets = onsetsOf(i, beats);
            const root = roots[i];
            const next = roots[i + 1];
            const chord = TamaSongs.parse(phrases[i].chord);
            const chordPcs = this.tonesOf(phrases[i].chord);
            const seventhPc = chord.intervals.includes(10) ? (chord.root + 10) % 12 : null;
            const chordPool = chordPcs.flatMap(pc => this.inRange(pc, LOW, HIGH)).filter(m => Math.abs(m - root) <= 9);
            const linkPool = next === undefined ? [] : [next - 2, next - 1, next + 1, next + 2].filter(m => this.white(m) && m >= LOW && m <= HIGH && m !== next);
            let best = null;
            let strict = true; // false：4ぶの とび・限定進行・和音に ない 音の きまりを ゆるめる（どうしても 見つからない とき）
            const judge = seq => {
                const k = seq.length;
                let cost = 0;
                // 和音に ない 音（経過音・刺繍音）は まえと あとを 2度で
                for (let j = 1; j < k; j++) {
                    if (chordPcs.includes(seq[j] % 12)) continue;
                    const after = j + 1 < k ? seq[j + 1] : next;
                    if (strict && (after === undefined || Math.abs(seq[j] - seq[j - 1]) > 2 || Math.abs(after - seq[j]) > 2)) return;
                    cost += strict ? 1 : 20;
                }
                const all = (before ? [before] : []).concat(seq.map((m, j) => ({ m, beats: beats[j] })));
                for (let j = 1; j < all.length; j++) {
                    const d = Math.abs(all[j].m - all[j - 1].m);
                    if (d > 7) { if (before && j === 1) cost += 30; else return; }       // とびは 5度まで（まえの 小節から ねもとへ は さけられない ときも ある）
                    // 4ぶ音符どうしは 3度まで（小節の さかいめで ねもとへ うつる ところは 5度まで：ねもとの 強進行）
                    if (all[j].beats === 1 && all[j - 1].beats === 1 && d > 4 && !(before && j === 1)) { if (strict) return; cost += 20; }
                    cost += d + (d === 0 ? 8 : 0) + (d > 4 ? 4 : 0);
                }
                for (let j = 2; j < k; j++) if ((seq[j] - seq[j - 1]) * (seq[j - 1] - seq[j - 2]) < 0) cost += 2;
                if (next !== undefined) {
                    const d = Math.abs(next - seq[k - 1]);
                    if (d > 7) return;
                    cost += d + (d === 0 ? 8 : 0);
                    // 限定進行：みちびく 音は 主音へ 2度 上、7の 音は 2度 下へ
                    const lastPc = seq[k - 1] % 12;
                    if (lastPc === leading && next !== seq[k - 1] + 1) { if (strict) return; cost += 20; }
                    if (seventhPc !== null && lastPc === seventhPc && !(next < seq[k - 1] && seq[k - 1] - next <= 2)) { if (strict) return; cost += 20; }
                }
                let faults = before ? this.outerFaults(phrases, before.t, before.m, onsets[0], seq[0]) : 0;
                for (let j = 1; j < k; j++) faults += this.outerFaults(phrases, onsets[j - 1], seq[j - 1], onsets[j], seq[j]);
                if (next !== undefined) faults += this.outerFaults(phrases, onsets[k - 1], seq[k - 1], (i + 1) * 4, next);
                return cost + faults * 50;
            };
            const walk = seq => {
                const k = seq.length;
                if (k === beats.length) {
                    const cost = judge(seq);
                    if (cost !== undefined && (!best || cost < best.cost)) best = { seq, cost };
                    return;
                }
                const passPool = [-2, -1, 1, 2].map(d => seq[k - 1] + d).filter(m => this.white(m) && m >= LOW && m <= HIGH);
                const pool = k === beats.length - 1 ? [...chordPool, ...linkPool, ...passPool] : [...chordPool, ...passPool];
                [...new Set(pool)].forEach(m => walk([...seq, m]));
            };
            walk([root]);
            if (!best) { strict = false; walk([root]); }
            return best ? best.seq : beats.map(() => root);
        };

        // 7小節め（V）：ねもとで はじまり ねもとで おわる（ねもと → 主音 の 完全終止）。7の 音は つかわない
        // 8小節め（I）：1拍めは 主音。同じ 音を つづけない（主音・3度・主音 ／ 主音・上の となり・主音 ／ 主音・下の となり・主音）
        const upStep = m => (this.white(m + 1) ? m + 1 : m + 2);
        const downStep = m => (this.white(m - 1) ? m - 1 : m - 2);
        const third = (m, chord) => m + (TamaSongs.parse(chord).intervals[1]);
        const seventhShapes = rhythm => {
            const d = dominant;
            const chord = phrases[n - 2].chord;
            const shapes = { W: [[d]], HQQ: [[d, third(d, chord), d], [d, upStep(d), d]], Q: [[d, upStep(d), third(d, chord), d], [d, third(d, chord), upStep(d), d]] };
            shapes.QQH = shapes.HQQ;
            const low = d - 12;
            if (low >= LOW && rhythm !== 'W') {
                const more = rhythm === 'Q'
                    ? [[low, upStep(low), third(low, chord), low], [low, third(low, chord), upStep(low), low]]
                    : [[low, third(low, chord), low], [low, upStep(low), low]];
                return [...shapes[rhythm], ...more];
            }
            return shapes[rhythm];
        };
        const eighthShapes = () => {
            const t = tonic;
            return [[t, third(t, phrases[n - 1].chord), t], [t, upStep(t), t], [t, downStep(t), t]];
        };
        const pickFixed = (i, rhythm, choices, before) => {
            const beats = BEATS[rhythm];
            const onsets = onsetsOf(i, beats);
            const faultsOf = seq => {
                let f = before ? this.outerFaults(phrases, before.t, before.m, onsets[0], seq[0]) : 0;
                for (let j = 1; j < seq.length; j++) f += this.outerFaults(phrases, onsets[j - 1], seq[j - 1], onsets[j], seq[j]);
                if (roots[i + 1] !== undefined) f += this.outerFaults(phrases, onsets[seq.length - 1], seq[seq.length - 1], (i + 1) * 4, roots[i + 1]);
                return f;
            };
            // まえの 音からの とびが 5度を こえる 形は さける
            const reach = seq => (before && Math.abs(seq[0] - before.m) > 7 ? 1 : 0);
            const usable = choices.filter(seq => seq.every(m => m >= LOW && m <= HIGH));
            const ok = usable.find(seq => faultsOf(seq) === 0 && !reach(seq));
            const score = seq => faultsOf(seq) * 10 + reach(seq) * 100;
            return ok ? { seq: ok } : { seq: usable.reduce((a, s) => (score(s) < score(a) ? s : a)), fallback: true };
        };

        let last = null;
        const lh = phrases.map((ph, i) => {
            let rhythm = rhythms[i];
            if (rhythm === 'REST') return { chord: ph.chord, kind: 'REST', events: [{ rest: true, beats: 4 }] };
            let notes;
            if (i === n - 2) {
                // その 段階の リズムで 外声の 禁則が さけられなければ、全音符の ねもと（小節の なかで うごかない）
                let got = pickFixed(i, rhythm, seventhShapes(rhythm), last);
                if (got.fallback && rhythm !== 'W') {
                    const whole = pickFixed(i, 'W', seventhShapes('W'), last);
                    if (!whole.fallback) { rhythm = 'W'; got = whole; }
                }
                notes = got.seq;
            } else if (i === n - 1) {
                notes = pickFixed(i, rhythm, eighthShapes(), last).seq;
            } else {
                notes = fill(i, rhythm, last);
            }
            const beats = BEATS[rhythm];
            last = { m: notes[notes.length - 1], beats: beats[beats.length - 1], t: i * 4 + beats.slice(0, -1).reduce((a, x) => a + x, 0) };
            return { chord: ph.chord, kind: rhythm, events: beats.map((b, k) => ({ notes: [notes[k]], beats: b })) };
        });
        this.repairMelody(phrases, lh);
        return lh;
    },

    // 外声の 禁則が のこった ところ（左手が 全音符で うごけない ときなど）は、アプリの メロディの その 拍の 音を、
    //   ちかくの 和音の 音（もとの 音が 和音に ない ときは となりの 白い けんばん）に なおす。
    //   終止（7小節めの さいごの 音・8小節めの 1つめ）は なおさない。メロディの とびは 5度まで
    repairMelody(phrases, lh) {
        const bass = [];
        lh.forEach((bar, bi) => { let pos = 0; bar.events.forEach(e => { if (!e.rest) bass.push({ t: bi * 4 + pos, m: e.notes[0] }); pos += e.beats; }); });
        const n = phrases.length;
        const indexAt = t => {
            const bar = Math.floor(t / 4);
            const k = t - bar * 4;
            const ph = phrases[bar];
            if (!ph || !Number.isInteger(k) || ph.rhythm[k] !== '●') return null;
            return { ph, i: ph.rhythm.slice(0, k).split('').filter(c => c === '●').length, bar };
        };
        const allMelody = () => phrases.flatMap(ph => ph.notes);
        const faultsNear = j => (j > 0 ? this.outerFaults(phrases, bass[j - 1].t, bass[j - 1].m, bass[j].t, bass[j].m) : 0)
            + (j + 1 < bass.length ? this.outerFaults(phrases, bass[j].t, bass[j].m, bass[j + 1].t, bass[j + 1].m) : 0);
        for (let j = 1; j < bass.length; j++) {
            if (!this.outerFaults(phrases, bass[j - 1].t, bass[j - 1].m, bass[j].t, bass[j].m)) continue;
            const at = indexAt(bass[j].t);
            if (!at) continue;
            const { ph, i, bar } = at;
            const isCadence = (bar === n - 1 && i === 0) || (bar === n - 2 && i === ph.notes.length - 1);
            if (isCadence) continue;
            const orig = ph.notes[i];
            const chordPcs = this.tonesOf(ph.chord);
            const flat = allMelody();
            const gi = phrases.slice(0, bar).reduce((a, p) => a + p.notes.length, 0) + i;
            const before = flat[gi - 1];
            const after = flat[gi + 1];
            const options = [];
            for (let m = orig - 5; m <= orig + 5; m++) {
                if (m === orig || !this.white(m) || m < TamaSongs.LOW || m > TamaSongs.HIGH) continue;
                if (chordPcs.includes(orig % 12) ? !chordPcs.includes(m % 12) : Math.abs(m - orig) > 2) continue;
                if ((before !== undefined && Math.abs(m - before) > 7) || (after !== undefined && Math.abs(after - m) > 7)) continue;
                options.push(m);
            }
            options.sort((a, b) => Math.abs(a - orig) - Math.abs(b - orig));
            for (const m of options) {
                ph.notes[i] = m;
                if (faultsNear(j) === 0) break;
                ph.notes[i] = orig;
            }
        }
    },
};
