// うたう けんばん：ひいた けんばんの 高さで、声を 出す
//   声は 2しゅるい
//     'cat'   ：ネコの タマが「ニャー」と なく（黒いけんばんでも なく）。じゆうにひこうの「おと：ニャー」
//     'doremi'：ドを ひくと「どー」、レなら「れー」…（黒いけんばんは うたわない）。
//               ためしに つくって とっておいたもの（いまは 画面から えらべない）
//   声は 録音ではなく、その場で つくる（フォルマント合成）
//     ・のどの音（ブザーのような音）を、ひいた けんばんの 高さで つくる → 音程は ピアノと ぴったり同じ
//     ・それを「口の形」のフィルター（フォルマント）に通すと「お」「え」「い」「あ」の声になる
//     ・「ど」「れ」「み」「ふぁ」「そ」「ら」「し」の はじめの音（子音）は、
//       息の音（ノイズ）と、口の形の すばやい うつりかわりで つくる
//       （「ふぁ」「そ」「し」の かすれる 息の音は、ごく わずかに。大きいと 耳ざわり）
//     ・ネコは 小さな口の形（フォルマントを 高めに）で、こもった「ン」→ ぱっと「ニャ」→「アー」。
//       息は まぜず、はっきりした 声。のばすうちに すこし 口を すぼめ（ほんのり「ニャーォ」）、
//       消える 直前に 2半音 下げる（とちゅうで はなしたときも 消えながら 下げる）。
//       のばしている ところの 音程は ピアノと 同じ
//
//   TamaSing.voice(midi, { kind })          うたう。返り値の release() で はなす（すこし のこって 消える）
//   TamaSing.prepare([60, 62, …], kind)     声を さきに つくっておく（はじめて おしたときに おくれないように）
//   TamaSing.render(midi, rate, kind)       声の波形（Float32Array）をつくるだけ（鳴らさない）
//   TamaSing.canSing(midi, kind)            その けんばんで うたうか
//   TamaSing.syllableOf(midi)               うたう ことば（'ど' など。黒いけんばんは null）

const TamaSing = {
    LENGTH: 2.6,    // 1回の声の ながさ（秒）。おしつづけても ここで おわる
    FADE_FROM: 1.8, // ここから だんだん 小さく
    RATE: 24000,    // 声を つくるときの こまかさ（1秒に 24000）。声には これで じゅうぶんで、計算も メモリも 半分
    cache: new Map(),
    CACHE_SIZE: 60,
    preparing: null,

    // 口の形（日本語の あいうえお。こどもの声に ちかい 高めの値）
    //   f1〜f4：フォルマントの 周波数（Hz）
    VOWELS: {
        a: { f1: 850, f2: 1350, f3: 2900, f4: 4000 },
        i: { f1: 320, f2: 2700, f3: 3300, f4: 4200 },
        u: { f1: 380, f2: 1500, f3: 2600, f4: 4000 },
        e: { f1: 550, f2: 2250, f3: 3000, f4: 4100 },
        o: { f1: 520, f2: 880, f3: 2850, f4: 4000 },
    },

    // ネコの 口の形（小さな口なので、ひとの「あ」より 高め）
    CAT_A: { f1: 1150, f2: 1950, f3: 3700, f4: 5000 },

    // 声の しゅるいごとの ちがい
    //   breath：声に まぜる 息の音（ネコは なし。はっきりした 声に）
    //   vibrato：[はじまる 秒, ゆれの 大きさ（半音）, 1秒に ゆれる 回数]
    //   releaseDrop：とちゅうで はなしたとき、消えながら 音を 下げる（半音。0 は 下げない）
    //   level：のばしている ところ（0.3〜0.5秒）の 大きさを そろえる めやす。null は いちばん大きいところを そろえる
    //     （ネコは 口の形が かわるので、いちばん大きいところで そろえると けんばんごとに 大きさが ばらつく）
    KINDS: {
        doremi: { breath: 0.06, vibrato: [0.45, 0.15, 5.3], releaseDrop: 0, level: null },
        cat: { breath: 0, vibrato: [0.35, 0.12, 6.2], releaseDrop: 2, level: 0.22 },
    },

    canSing(midi, kind = 'doremi') {
        if (kind === 'cat') return true;
        return !!this.syllableOf(midi);
    },

    // ド〜シ（step 0〜6）の ことば
    SYLLABLES: ['ど', 'れ', 'み', 'ふぁ', 'そ', 'ら', 'し'],

    syllableOf(midi) {
        const step = TamaNotes.stepOf(midi);
        return step >= 0 ? this.SYLLABLES[step] : null;
    },

    // ことば → 時間ごとの 声の ようす（キーフレーム）。あいだは なめらかに つなぐ
    //   t：秒　av：声の大きさ　an：息の音の大きさ　nf・nb：息の音の 高さ・はば（Hz）
    //   f1〜f4：口の形　b1〜b3：口の形の ぼやけぐあい（大きいほど こもった音）
    //   pt：音の高さの ずれ（半音。ネコの すくい上げ。かかないときは 0）
    script(syllable) {
        const V = this.VOWELS;
        const open = { av: 1, an: 0, b1: 80, b2: 100, b3: 150 };
        const vowel = (name, t) => ({ t, ...V[name], ...open });
        switch (syllable) {
            case 'ど': // 口を とじたまま こもった 声（にごり）→ ぱっと はなす（みじかい 息）→ すばやく お
                //   にごりが 小さかったり、口の形が ゆっくり かわったりすると「よ」に 聞こえる
                return [
                    { t: 0, av: 0, an: 0, f1: 200, f2: 1600, f3: 2600, f4: 3800, b1: 120, b2: 600, b3: 900, nf: 4000, nb: 2500 },
                    { t: 0.012, av: 0.32 },
                    { t: 0.065, av: 0.32 },
                    { t: 0.066, an: 1.8 },
                    { t: 0.074, an: 0, av: 0.8, f1: 330, f2: 1450, b1: 80, b2: 100, b3: 150 },
                    vowel('o', 0.1),
                ];
            case 'れ': // 舌で かるく はじく → え
                return [
                    { t: 0, av: 0, an: 0, f1: 300, f2: 1700, f3: 2400, f4: 3800, b1: 90, b2: 160, b3: 250, nf: 3000, nb: 2000 },
                    { t: 0.015, av: 0.45 },
                    { t: 0.04, av: 0.45 },
                    { t: 0.055, av: 0.2, f1: 260 },
                    { t: 0.075, av: 0.6, f1: 380, f2: 1950 },
                    vowel('e', 0.13),
                ];
            case 'み': // 口を とじて ハミング（ん）→ ひらいて い
                return [
                    { t: 0, av: 0, an: 0, f1: 250, f2: 1150, f3: 2300, f4: 3800, b1: 110, b2: 500, b3: 700, nf: 3000, nb: 2000 },
                    { t: 0.02, av: 0.4 },
                    { t: 0.1, av: 0.4 },
                    { t: 0.125, av: 0.75, f1: 290, f2: 2300, b1: 90, b2: 200, b3: 300 },
                    vowel('i', 0.17),
                ];
            case 'ふぁ': // くちびるの すきまから 息（ふ）→ あ
                return [
                    { t: 0, av: 0, an: 0, f1: 350, f2: 1200, f3: 2400, f4: 3800, b1: 90, b2: 120, b3: 200, nf: 1600, nb: 3000 },
                    { t: 0.025, an: 0.3 },
                    { t: 0.085, an: 0.3, av: 0 },
                    { t: 0.11, an: 0.05, av: 0.6, f1: 450, f2: 1250 },
                    { t: 0.12, an: 0 },
                    vowel('a', 0.18),
                ];
            case 'そ': // 歯のあいだから「す」→ お（高い 息の音は 耳に つきやすいので ひかえめに。小さすぎると「お」に 聞こえる）
                return [
                    { t: 0, av: 0, an: 0, f1: 400, f2: 1500, f3: 2600, f4: 3800, b1: 90, b2: 120, b3: 200, nf: 5800, nb: 3500 },
                    { t: 0.01, an: 0 },
                    { t: 0.04, an: 0.11 },
                    { t: 0.085, an: 0.11, av: 0 },
                    { t: 0.105, an: 0, av: 0.55, f1: 420, f2: 1300 },
                    vowel('o', 0.16),
                ];
            case 'ら': // 舌で かるく はじく → あ
                return [
                    { t: 0, av: 0, an: 0, f1: 300, f2: 1500, f3: 2400, f4: 3800, b1: 90, b2: 160, b3: 250, nf: 3000, nb: 2000 },
                    { t: 0.015, av: 0.45 },
                    { t: 0.04, av: 0.45 },
                    { t: 0.055, av: 0.2, f1: 260 },
                    { t: 0.075, av: 0.6, f1: 500, f2: 1400 },
                    vowel('a', 0.14),
                ];
            case 'し': // 舌を ちかづけて「しー」→ い
                return [
                    { t: 0, av: 0, an: 0, f1: 300, f2: 2300, f3: 2900, f4: 3900, b1: 90, b2: 150, b3: 220, nf: 3600, nb: 1800 },
                    { t: 0.03, an: 0.35 },
                    { t: 0.12, an: 0.35, av: 0 },
                    { t: 0.14, an: 0, av: 0.6, f1: 300, f2: 2500 },
                    vowel('i', 0.18),
                ];
            default:
                return null;
        }
    },

    // ネコの「ニャー」
    catScript() {
        const A = this.CAT_A;
        return [
            // 「ン」：口を とじて、はなに ぬける こもった 声（ひくい ところだけ ひびかせる）。最初から 正しい 高さ
            //   （下から すくい上げると 甘えた 感じ。「ン」が みじかい・こもっていないと「ヤ」に 聞こえる）
            { t: 0, av: 0, an: 0, f1: 250, f2: 1000, f3: 2200, f4: 3500, b1: 60, b2: 1500, b3: 1500, nf: 3000, nb: 2000 },
            { t: 0.008, av: 0.5 },
            { t: 0.07, av: 0.5 },
            // 「ニャ」：ぱっと 口を ひらいて（こもった 声から いっきに）「イ」の 口から すばやく「ア」へ
            { t: 0.078, av: 1, f1: 420, f2: 2700, f3: 3500, f4: 4600, b1: 80, b2: 110, b3: 160 },
            { t: 0.13, ...A, b1: 90, b2: 110, b3: 160 },
            // 「アー」：のばすうちに すこし 口を すぼめる（ほんのり「ニャーォ」）
            { t: 0.5, ...A },
            { t: 1.3, f1: 850, f2: 1500, f3: 3400, f4: 4800 },
            // 消える 直前に 音を 下げる（さいごは 2半音 下）
            { t: 2.0, pt: 0 },
            { t: this.LENGTH, pt: -2 },
        ];
    },

    // キーフレームの すきまを うめて、どの時刻でも ぜんぶの値が わかるように
    fillScript(frames) {
        const full = [];
        let last = { pt: 0 };
        frames.forEach(frame => {
            last = { ...last, ...frame };
            full.push(last);
        });
        return full;
    },

    // 声の波形を つくる（Web Audio を使わない 計算だけ。Node でも うごく）
    render(midi, sampleRate = 44100, kind = 'doremi') {
        if (!this.canSing(midi, kind)) return null;
        const script = kind === 'cat' ? this.catScript() : this.script(this.syllableOf(midi));
        const frames = this.fillScript(script);
        const { breath, vibrato: [vibratoFrom, vibratoDepth, vibratoRate], level } = this.KINDS[kind];

        const f0 = 440 * Math.pow(2, (midi - 69) / 12);
        const length = Math.round(this.LENGTH * sampleRate);
        const out = new Float32Array(length);
        const T = 1 / sampleRate;
        const keys = ['av', 'an', 'nf', 'nb', 'f1', 'f2', 'f3', 'f4', 'b1', 'b2', 'b3', 'pt'];

        // 2極の 共鳴フィルター（口の形 1つぶん）。DC で 1倍
        const resonator = () => ({ a: 1, b: 0, c: 0, y1: 0, y2: 0 });
        const tune = (r, freq, bw) => {
            const f = Math.min(freq, sampleRate * 0.45);
            r.c = -Math.exp(-2 * Math.PI * bw * T);
            r.b = 2 * Math.exp(-Math.PI * bw * T) * Math.cos(2 * Math.PI * f * T);
            r.a = 1 - r.b - r.c;
        };
        // 息の音のフィルターは、まんなかの 周波数で 1倍に（高さが かわっても 大きさが かわらないように）
        const tuneNoise = (r, freq, bw) => {
            tune(r, freq, bw);
            const w = 2 * Math.PI * Math.min(freq, sampleRate * 0.45) * T;
            const re = 1 - r.b * Math.cos(w) - r.c * Math.cos(2 * w);
            const im = r.b * Math.sin(w) + r.c * Math.sin(2 * w);
            r.norm = Math.sqrt(re * re + im * im) / Math.abs(r.a);
        };
        const step = (r, x) => {
            const y = r.a * x + r.b * r.y1 + r.c * r.y2;
            r.y2 = r.y1;
            r.y1 = y;
            return y;
        };
        const formants = [resonator(), resonator(), resonator(), resonator()];
        const noiseFilter = resonator();

        // 値を なめらかに（カチッという音が でないように）
        const smooth = 1 - Math.exp(-T / 0.006);
        let av = 0;
        let an = 0;

        // いつも同じ声になるように、息の音は きまった ならびの 乱数
        let seed = 12345;
        const noise = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 2147483648 - 1;
        };

        // のこぎり波のかどを まるめる（高い音で ジリジリしないように。PolyBLEP）
        const blep = (t, dt) => {
            if (t < dt) { t /= dt; return t + t - t * t - 1; }
            if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
            return 0;
        };

        let phase = 0;
        let frame = 0;
        let p = {};
        const BLOCK = 32; // 口の形は 32サンプルごとに 計算しなおす
        for (let i = 0; i < length; i++) {
            const t = i * T;
            if (i % BLOCK === 0) {
                while (frame < frames.length - 1 && frames[frame + 1].t <= t) frame++;
                const a = frames[frame];
                const b = frames[Math.min(frame + 1, frames.length - 1)];
                const k = b.t > a.t ? Math.min(1, (t - a.t) / (b.t - a.t)) : 1;
                p = {};
                keys.forEach(key => { p[key] = a[key] + (b[key] - a[key]) * k; });
                // 高い音では、いちばん下の 口の形が 声より ひくくならないように
                const f1 = Math.max(p.f1, f0 * 1.1);
                tune(formants[0], f1, p.b1);
                tune(formants[1], Math.max(p.f2, f1 + 200), p.b2);
                tune(formants[2], p.f3, p.b3);
                tune(formants[3], p.f4, 250);
                tuneNoise(noiseFilter, p.nf, p.nb);
            }

            // ビブラート：のばしているうちに すこしだけ ゆらす（±0.15 半音ほど）
            const depth = Math.max(0, Math.min(1, (t - vibratoFrom) / 0.5)) * vibratoDepth;
            const freq = f0 * Math.pow(2, (p.pt + depth * Math.sin(2 * Math.PI * vibratoRate * t)) / 12);
            const dt = freq * T;
            phase += dt;
            if (phase >= 1) phase -= 1;

            av += (p.av - av) * smooth;
            an += (p.an - an) * smooth;

            // のどの音（のこぎり波 ＋ すこしの 息）→ 口の形
            const n = noise();
            let voice = (2 * phase - 1 - blep(phase, dt)) * av;
            voice += n * breath * av * (phase < 0.5 ? 1 : 0.4);
            for (let j = 0; j < 4; j++) voice = step(formants[j], voice);

            // 子音の 息の音
            const hiss = step(noiseFilter, n) * noiseFilter.norm * an;

            // おわりは だんだん 小さく
            const fade = t < this.FADE_FROM ? 1 : Math.max(0, 1 - (t - this.FADE_FROM) / (this.LENGTH - this.FADE_FROM));
            out[i] = (voice + hiss) * fade;
        }

        // 大きさを そろえる（いちばん大きいところを 0.9 に。level が あるときは のばしている ところを level に）
        let peak = 0;
        for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
        if (peak > 0) {
            let scale = 0.9 / peak;
            if (level) {
                const from = Math.round(0.3 * sampleRate);
                const to = Math.round(0.5 * sampleRate);
                let sum = 0;
                for (let i = from; i < to; i++) sum += out[i] * out[i];
                const rms = Math.sqrt(sum / (to - from));
                if (rms > 0) scale = Math.min(level / rms, 0.98 / peak); // われない ように
            }
            for (let i = 0; i < length; i++) out[i] *= scale;
        }
        return out;
    },

    // 声を AudioBuffer に（いちど つくったら おぼえておく）
    buffer(ctx, midi, kind = 'doremi') {
        const key = `${kind}:${midi}`;
        if (this.cache.has(key)) return this.cache.get(key);
        const data = this.render(midi, this.RATE, kind);
        if (!data) return null;
        const buffer = ctx.createBuffer(1, data.length, this.RATE);
        buffer.getChannelData(0).set(data);
        this.cache.set(key, buffer);
        if (this.cache.size > this.CACHE_SIZE) this.cache.delete(this.cache.keys().next().value);
        return buffer;
    },

    // 声を さきに つくっておく（1つずつ、すきまの 時間に。画面が かたまらないように）
    prepare(midis, kind = 'doremi') {
        const ctx = TamaSound.context();
        if (!ctx) return;
        const queue = midis.filter(midi => this.canSing(midi, kind) && !this.cache.has(`${kind}:${midi}`)).slice(0, this.CACHE_SIZE);
        if (this.preparing) clearTimeout(this.preparing);
        const next = () => {
            this.preparing = null;
            const midi = queue.shift();
            if (midi === undefined) return;
            this.buffer(ctx, midi, kind);
            this.preparing = setTimeout(next, 0);
        };
        this.preparing = setTimeout(next, 0);
    },

    // うたう。release() で はなす（「どー」の「ど」は かならず 聞こえるくらい のこす）
    voice(midi, { gain = 0.55, kind = 'doremi' } = {}) {
        const silent = { release() {} };
        const ctx = TamaSound.live();
        if (!ctx) return silent;
        const buffer = this.buffer(ctx, midi, kind);
        if (!buffer) return silent;

        const t = ctx.currentTime;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const amp = ctx.createGain();
        amp.gain.value = gain;
        source.connect(amp);
        amp.connect(TamaSound.master);
        source.start(t);
        const end = t + buffer.duration;

        let released = false;
        return {
            release() {
                if (released) return;
                released = true;
                const at = Math.max(ctx.currentTime, t + 0.4);
                if (at >= end) return;
                amp.gain.setValueAtTime(gain, at);
                amp.gain.setTargetAtTime(0.0001, at, 0.08);
                // ネコは 消えながら 音を 下げる（「ニャー↘」）
                const drop = TamaSing.KINDS[kind].releaseDrop;
                if (drop) {
                    source.playbackRate.setValueAtTime(1, at);
                    source.playbackRate.linearRampToValueAtTime(Math.pow(2, -drop / 12), at + 0.25);
                }
                source.stop(Math.min(end, at + 0.6));
            },
        };
    },
};

// Node で 波形を ためすとき用
if (typeof module !== 'undefined') module.exports = TamaSing;
