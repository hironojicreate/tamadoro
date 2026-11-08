// 音の部品（Web Audio API）
//   テンキーの音・百マスの音・けんばんの音は、ぜんぶここを通して鳴らす
//   「おとを けす」（TamaSound.setMuted）は、ぜんぶの音に効く
//
//   TamaSound.note(midi)        けんばんの音（ピアノふう）を鳴らす。返り値の release() で はなす
//     { voice: 'organ' } で 音色を かえる（TamaSound.VOICES。きょくふう の 曲調ごとの 音色）。
//     hold：はなしても さいていこれだけ 鳴らす 秒（のびる 音色を 拍の ながさ だけ 鳴らす ときに）
//   TamaSound.chord(name)       正解したときの、小さな ばんそう（C・F・G・G7）
//   TamaSound.loadSE(url)       効果音（mp3 など）を読みこむ → TamaSound.playSE(読みこんだもの)
//   TamaSound.musicSession(on)  iPhone のマナーモードでも 音が出るようにする（おんがくの画面だけ）
//   TamaSound.click・drum・heardTime  リズムの メトロノーム・たいこ・タップの 時刻（音の時計で）

const TamaSound = {
    MUTE_KEY: 'tamadoro.sound.muted',

    ctx: null,
    master: null,
    wave: null,

    // ---------- じゅんび ----------

    // AudioContext は、はじめて使うときにつくる（つくれないブラウザでは null）
    context() {
        if (this.ctx) return this.ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            this.ctx = new AC({ latencyHint: 'interactive' }); // おしてから鳴るまでを みじかく
        } catch (error) {
            this.ctx = new AC();
        }
        // 音が重なっても われないように、さいごに コンプレッサーをとおす
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.ratio.value = 6;
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(compressor);
        compressor.connect(this.ctx.destination);
        return this.ctx;
    },

    // スマホ・タブレットでは、画面にさわったときでないと 音を使えるようにできない
    unlock() {
        const ctx = this.context();
        if (!ctx) return;
        if (ctx.state !== 'running') {
            ctx.resume();
            // iPhone・iPad は、音のない音を1つ鳴らすと たしかに鳴るようになる
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        }
    },

    // iPhone のマナーモード（横のスイッチ）でも 音が出るようにする（Safari 16.4 から）
    //   おんがくの画面に いるあいだだけ 'playback'。ほかの画面では 'auto'（いままでどおり）
    musicSession(on) {
        try {
            if (navigator.audioSession) {
                navigator.audioSession.type = on ? 'playback' : 'auto';
            }
        } catch (error) {
            // 使えないブラウザでは なにもしない
        }
    },

    // ---------- おとを けす ----------

    get muted() {
        return TamaStore.readJSON(this.MUTE_KEY, false) === true;
    },

    setMuted(muted) {
        TamaStore.writeJSON(this.MUTE_KEY, !!muted);
    },

    // 鳴らせるときだけ AudioContext を返す
    live() {
        if (this.muted) return null;
        const ctx = this.context();
        if (!ctx) return null;
        if (ctx.state !== 'running') ctx.resume();
        return ctx;
    },

    // ---------- 効果音（ファイル） ----------

    loadSE(url) {
        const ctx = this.context();
        const se = { buffer: null };
        if (!ctx) return se;
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(data => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
            .then(buffer => { se.buffer = buffer; })
            .catch(() => {}); // 読みこめなくても、音が出ないだけ
        return se;
    },

    playSE(se) {
        const ctx = this.live();
        if (!ctx || !se || !se.buffer) return; // けしている・まだ読みこみ中
        const source = ctx.createBufferSource();
        source.buffer = se.buffer;
        source.connect(this.master);
        source.start(0);
    },

    // ---------- けんばんの音 ----------

    // MIDI の番号（60 が まんなかのド）→ 周波数
    frequency(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    },

    // ピアノふうの音色（倍音の強さ）。1回だけつくって 使いまわす
    pianoWave(ctx) {
        if (!this.wave) {
            const harmonics = [0, 1, 0.42, 0.22, 0.12, 0.08, 0.05, 0.03, 0.02];
            const real = new Float32Array(harmonics.length);
            const imag = new Float32Array(harmonics);
            this.wave = ctx.createPeriodicWave(real, imag);
        }
        return this.wave;
    },

    // 音を1つ鳴らす。返り値の release() で 指を はなしたことにする（すこし のこって 消える）
    //   gain: 大きさ（0〜1）、when: 何秒あとに鳴らすか、bus: 音の みち（TamaSound.bus()。とちゅうで まとめて 止めるとき）
    //   voice: 音色（'piano' 以外は synth）、hold: はなしても さいていこれだけ 鳴らす 秒
    note(midi, { gain = 0.5, when = 0, bus = null, voice = 'piano', hold = 0.35 } = {}) {
        const silent = { release() {} };
        const ctx = this.live();
        if (!ctx) return silent;
        if (voice !== 'piano' && this.VOICES[voice]) return this.synth(ctx, midi, voice, { gain, when, bus, hold });

        const t = ctx.currentTime + when;
        const freq = this.frequency(midi);

        const osc = ctx.createOscillator();
        osc.setPeriodicWave(this.pianoWave(ctx));
        osc.frequency.value = freq;

        // たたいた直後は明るく、だんだん まるい音に
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 0.6;
        filter.frequency.setValueAtTime(Math.min(freq * 9, 12000), t);
        filter.frequency.setTargetAtTime(Math.min(freq * 2.5, 6000), t + 0.02, 0.35);

        // 大きさ：すぐに大きくなって、ひくい音ほど ながく のこる
        const amp = ctx.createGain();
        const sustain = 1.1 * Math.sqrt(261.6 / freq);
        amp.gain.setValueAtTime(0.0001, t);
        amp.gain.linearRampToValueAtTime(gain, t + 0.006);
        amp.gain.setTargetAtTime(gain * 0.35, t + 0.006, 0.18);
        amp.gain.setTargetAtTime(0.0001, t + 0.35, sustain);

        osc.connect(filter);
        filter.connect(amp);
        amp.connect(bus || this.master);
        osc.start(t);
        const end = t + 0.35 + sustain * 6;
        osc.stop(end);

        let released = false;
        return {
            release() {
                if (released) return;
                released = true;
                // みじかく おしても、音の高さが わかるくらいは のこす
                const at = Math.max(ctx.currentTime, t + hold);
                if (at >= end) return;
                if (amp.gain.cancelAndHoldAtTime) {
                    amp.gain.cancelAndHoldAtTime(at);
                } else {
                    amp.gain.cancelScheduledValues(at);
                }
                amp.gain.setTargetAtTime(0.0001, at, 0.12);
                osc.stop(Math.min(end, at + 1));
            },
        };
    },

    // ---------- 音色（きょくふう の 曲調ごと。ピアノ いがい） ----------
    //   harmonics：倍音の 強さ（1ばんめが もとの 音）。attack：立ちあがり、sustain：のこる 大きさ（0〜1）、
    //   decay：sustain まで へる はやさ、fade：のこった 音が きえる はやさ（null は 押している あいだ のびる）、
    //   release：はなしてから きえる はやさ、bright：明るさ（フィルター。音の 高さの 何ばいまで）、
    //   level：大きさの そろえ、detune：2つの 音を すこし ずらして ひろがりを（セント）、vibrato：[はやさ Hz, ふかさ]
    //   breath：息の 音の 大きさ（ノイズを 音の 高さの あたりだけ とおす）、scoop：はじめに 下から ずりあげる（半音の 何わり）
    //   pluck：はじく 音（琴。Karplus-Strong で 一度 つくって つかいまわす）。はじく 音は 伴奏には つかわない（ひびかない）
    VOICES: {
        epiano: { harmonics: [0, 1, 0.12, 0.05, 0.12, 0.02, 0.01], attack: 0.004, sustain: 0.35, decay: 0.25, fade: 1.4, release: 0.25, bright: 5, level: 1.1 },
        organ: { harmonics: [0, 1, 0.75, 0.45, 0.55, 0, 0.25, 0, 0.2], attack: 0.012, sustain: 0.85, decay: 0.08, fade: null, release: 0.06, bright: 10, level: 0.6, detune: 4 },
        strings: { harmonics: [0, 1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.12, 0.1], attack: 0.14, sustain: 0.8, decay: 0.3, fade: null, release: 0.3, bright: 4, level: 0.55, detune: 7, vibrato: [5.2, 0.004] },
        chip: { harmonics: [0, 1, 0.71, 0.33, 0, 0.2, 0.24, 0.1, 0, 0.11, 0.14, 0.06], attack: 0.002, sustain: 0.55, decay: 0.08, fade: 2.5, release: 0.05, bright: 40, level: 0.42 },
        musicbox: { harmonics: [0, 1, 0, 0.08, 0.32, 0, 0, 0, 0.08], attack: 0.002, sustain: 0.05, decay: 0.55, fade: 0.6, release: 0.5, bright: 12, level: 1.0 },
        koto: { pluck: true, bright: 0.65, length: 2.4, decay: 1.6, release: 0.25, level: 1.25 },
        shakuhachi: { harmonics: [0, 1, 0.25, 0.1, 0.04, 0.02], attack: 0.09, sustain: 0.8, decay: 0.25, fade: null, release: 0.25, bright: 4, level: 0.7, vibrato: [4.3, 0.005], breath: 0.35, scoop: 0.4 },
    },

    // 倍音の 表 → PeriodicWave（AudioContext ごとに つくって つかいまわす）
    periodicWave(ctx, name, harmonics) {
        if (this.waveCtx !== ctx) {
            this.waveCtx = ctx;
            this.waves = {};
        }
        if (!this.waves[name]) {
            this.waves[name] = ctx.createPeriodicWave(new Float32Array(harmonics.length), new Float32Array(harmonics));
        }
        return this.waves[name];
    },

    // 息の 音の もと（1びょうの ノイズ。AudioContext ごとに つくって ループで つかう）
    noiseBuffer(ctx) {
        if (this.noiseCtx !== ctx) {
            this.noiseCtx = ctx;
            const length = ctx.sampleRate;
            this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
            const data = this.noise.getChannelData(0);
            for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        }
        return this.noise;
    },

    // はじく 音（Karplus-Strong）：みじかい ノイズを くりかえし なまらせると 弦の 音に なる
    //   bright：はじめの ノイズの 明るさ（0〜1）、decay：音が 1000分の1に なるまでの 秒
    //   かえすのは { buffer, rate（再生の はやさ。高さの ずれを なおす）}
    pluckBuffer(ctx, midi, spec) {
        this.plucks = this.plucks || {};
        const key = `${spec.bright}:${spec.decay}:${midi}:${ctx.sampleRate}`;
        if (this.plucks[key]) return this.plucks[key];
        const rate = ctx.sampleRate;
        const period = rate / this.frequency(midi);
        const n = Math.max(2, Math.round(period));
        const length = Math.floor(rate * spec.length);
        const data = new Float32Array(length);
        const ring = new Float32Array(n);
        let smooth = 0;
        for (let i = 0; i < n; i++) {
            const noise = Math.random() * 2 - 1;
            smooth += (noise - smooth) * spec.bright; // くらい 音は ノイズを なめらかに
            ring[i] = smooth;
        }
        const loss = Math.pow(0.001, 1 / (spec.decay * rate / n)); // 1しゅう ごとに へる わりあい
        let peak = 0;
        for (let i = 0, k = 0; i < length; i++) {
            const next = (k + 1) % n;
            const value = ring[k];
            data[i] = value;
            ring[k] = (value + ring[next]) * 0.5 * loss;
            k = next;
            peak = Math.max(peak, Math.abs(value));
        }
        const buffer = ctx.createBuffer(1, length, rate);
        const scale = peak > 0 ? 1 / peak : 1;
        buffer.getChannelData(0).set(data.map(v => v * scale));
        // くりかえしの ながさは n − 0.5（つぎの 値と ならして もどすので 半分 みじかい）。
        //   ほんとうの 高さに なるよう 再生の はやさを なおす（なおさないと たかいソで 20セントほど 高い）
        this.plucks[key] = { buffer, rate: (n - 0.5) / period };
        return this.plucks[key];
    },

    // ピアノ いがいの 音色を 1つ 鳴らす（返り値の release() で はなす）
    synth(ctx, midi, name, { gain, when, bus, hold }) {
        const spec = this.VOICES[name];
        const t = ctx.currentTime + when;
        const freq = this.frequency(midi);
        const level = gain * (spec.level || 1);
        const amp = ctx.createGain();
        amp.connect(bus || this.master);
        const sources = [];
        let end;
        if (spec.pluck) {
            const source = ctx.createBufferSource();
            const pluck = this.pluckBuffer(ctx, midi, spec);
            source.buffer = pluck.buffer;
            source.playbackRate.value = pluck.rate;
            source.connect(amp);
            amp.gain.setValueAtTime(level, t);
            sources.push(source);
            end = t + spec.length;
        } else {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 0.5;
            filter.frequency.value = Math.min(freq * spec.bright, 14000);
            filter.connect(amp);
            const detunes = spec.detune ? [-spec.detune, spec.detune] : [0];
            detunes.forEach(cents => {
                const osc = ctx.createOscillator();
                osc.setPeriodicWave(this.periodicWave(ctx, name, spec.harmonics));
                osc.frequency.value = freq;
                if (spec.scoop) {
                    // 下から ずりあげる（尺八の「メリ」から 「カリ」へ）
                    osc.frequency.setValueAtTime(freq * Math.pow(2, -spec.scoop / 12), t);
                    osc.frequency.exponentialRampToValueAtTime(freq, t + spec.attack * 1.6);
                }
                osc.detune.value = cents;
                if (spec.vibrato) {
                    const lfo = ctx.createOscillator();
                    const depth = ctx.createGain();
                    lfo.frequency.value = spec.vibrato[0];
                    depth.gain.value = freq * spec.vibrato[1];
                    lfo.connect(depth);
                    depth.connect(osc.frequency);
                    sources.push(lfo); // start・stop は 下で まとめて
                }
                osc.connect(filter);
                sources.push(osc);
            });
            if (spec.breath) {
                // 息の 音：ノイズを 音の 高さの あたりだけ とおして まぜる
                const noise = ctx.createBufferSource();
                noise.buffer = this.noiseBuffer(ctx);
                noise.loop = true;
                const band = ctx.createBiquadFilter();
                band.type = 'bandpass';
                band.frequency.value = Math.min(freq * 2, 12000);
                band.Q.value = 1.2;
                const breath = ctx.createGain();
                breath.gain.value = spec.breath;
                noise.connect(band);
                band.connect(breath);
                breath.connect(filter);
                sources.push(noise);
            }
            const each = level / detunes.length;
            amp.gain.setValueAtTime(0.0001, t);
            amp.gain.linearRampToValueAtTime(each, t + spec.attack);
            amp.gain.setTargetAtTime(each * spec.sustain, t + spec.attack, spec.decay);
            if (spec.fade) amp.gain.setTargetAtTime(0.0001, t + spec.attack + spec.decay * 2, spec.fade);
            end = t + (spec.fade ? spec.attack + spec.decay * 2 + spec.fade * 6 : 8);
        }
        sources.forEach(source => {
            source.start(t);
            source.stop(end);
        });
        let released = false;
        return {
            release() {
                if (released) return;
                released = true;
                const at = Math.max(ctx.currentTime, t + hold);
                if (at >= end) return;
                if (amp.gain.cancelAndHoldAtTime) {
                    amp.gain.cancelAndHoldAtTime(at);
                } else {
                    amp.gain.cancelScheduledValues(at);
                }
                amp.gain.setTargetAtTime(0.0001, at, spec.release);
                const stop = Math.min(end, at + spec.release * 8);
                sources.forEach(source => source.stop(stop));
            },
        };
    },

    // ---------- リズム（js/engines/rhythm.js） ----------

    // 音の時計の いま（秒）。「おと なし」でも 時計は すすむ（リズムの 拍は この時計で きめる）
    now() {
        const ctx = this.context();
        return ctx ? ctx.currentTime : performance.now() / 1000;
    },

    // 画面に さわった しゅんかん（event.timeStamp）→ そのとき スピーカーから 出ていた 音の時計の 時刻
    //   スピーカーから 音が出るまでの おくれ（outputLatency）も ふくめて、「聞こえた 音」と くらべられるように
    heardTime(eventTimeStamp = performance.now()) {
        const ctx = this.context();
        if (!ctx) return eventTimeStamp / 1000;
        const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
        if (ts && ts.performanceTime > 0) {
            return ts.contextTime + (eventTimeStamp - ts.performanceTime) / 1000;
        }
        const latency = ctx.outputLatency || ctx.baseLatency || 0;
        return ctx.currentTime - latency - (performance.now() - eventTimeStamp) / 1000;
    },

    // とちゅうで やめたとき まとめて 止められる 音の みち（disconnect() で ぜんぶ きえる）
    bus() {
        const ctx = this.context();
        if (!ctx) return null;
        const gain = ctx.createGain();
        gain.connect(this.master);
        return gain;
    },

    // メトロノームの カチッ（accent：1拍め は 高く）。when は 音の時計の 時刻
    click(when, accent = false, bus = null) {
        const ctx = this.live();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = accent ? 1760 : 1175;
        const amp = ctx.createGain();
        amp.gain.setValueAtTime(0.0001, when);
        amp.gain.linearRampToValueAtTime(accent ? 0.22 : 0.13, when + 0.002);
        amp.gain.setTargetAtTime(0.0001, when + 0.004, 0.018);
        osc.connect(amp);
        amp.connect(bus || this.master);
        osc.start(when);
        osc.stop(when + 0.12);
    },

    // たいこの ポン（タップしたとき・おてほん）
    drum(when = 0, bus = null) {
        const ctx = this.live();
        if (!ctx) return;
        const t = when || ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
        const amp = ctx.createGain();
        amp.gain.setValueAtTime(0.0001, t);
        amp.gain.linearRampToValueAtTime(0.7, t + 0.004);
        amp.gain.setTargetAtTime(0.0001, t + 0.01, 0.07);
        osc.connect(amp);
        amp.connect(bus || this.master);
        osc.start(t);
        osc.stop(t + 0.5);
    },

    // ばんそうの和音（ひくめの音で、やさしく）
    CHORDS: {
        C: [48, 52, 55],      // ド・ミ・ソ
        F: [48, 53, 57],      // ド・ファ・ラ
        G: [47, 50, 55],      // シ・レ・ソ
        G7: [47, 50, 53, 55], // シ・レ・ファ・ソ
        Dm: [50, 53, 57],     // レ・ファ・ラ（おんぷよみ Lv2 の おだんご）
        Cmaj7: [48, 52, 55, 59], // ド・ミ・ソ・シ（おんぷよみ Lv4：せんの おだんごに シ）
        Dm7: [50, 53, 57, 60],   // レ・ファ・ラ・ド（おんぷよみ Lv4：あいだの おだんごに たかいド）
        Em: [52, 55, 59],        // ミ・ソ・シ（おんぷよみ Lv4：シの 1おん。ドミソシ だんごの 上 3つ）
        // おんぷよみの メロディ（Lv8）
        Am: [45, 48, 52],        // ラ・ド・ミ（1の和音の かわりの 6の和音）
        C7: [48, 52, 55, 58],    // ド・ミ・ソ・シ♭（つぎの F へ いきたくなる）
        Fm: [48, 53, 56],        // ド・ファ・ラ♭（借用和音。すこし せつない）
        // 黒いけんばんの音が いちばん下の 和音（くろいけんばんの レッスン）
        Db: [49, 53, 56],     // ド♯・ファ・ソ♯
        Eb: [51, 55, 58],     // ミ♭・ソ・シ♭
        Gb: [54, 58, 61],     // ソ♭・シ♭・レ♭
        Ab: [44, 48, 51],     // ラ♭・ド・ミ♭
        Bb: [46, 50, 53],     // シ♭・レ・ファ
    },

    // 和音を ポロロンと鳴らす（when 秒あとから、strum 秒ずつ ずらして）
    //   voice：音色、hold：のびる 音色を 何秒 のばすか
    chord(name, { gain = 0.16, when = 0.12, strum = 0.035, bus = null, voice = 'piano', hold = 0.35 } = {}) {
        const notes = this.CHORDS[name];
        if (!notes) return;
        notes.forEach((midi, i) => {
            this.note(midi, { gain, when: when + i * strum, bus, voice, hold }).release();
        });
    },
};

// はじめて画面にさわったときに、音を使えるようにする（iPhone は touchend・click でないと だめなことがある）
['pointerdown', 'touchend', 'click', 'keydown'].forEach(type => {
    document.addEventListener(type, () => TamaSound.unlock(), { capture: true, passive: true });
});
