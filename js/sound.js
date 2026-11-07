// 音の部品（Web Audio API）
//   テンキーの音・百マスの音・けんばんの音は、ぜんぶここを通して鳴らす
//   「おとを けす」（TamaSound.setMuted）は、ぜんぶの音に効く
//
//   TamaSound.note(midi)        けんばんの音（ピアノふう）を鳴らす。返り値の release() で はなす
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
    //   gain: 大きさ（0〜1）、when: 何秒あとに鳴らすか
    note(midi, { gain = 0.5, when = 0 } = {}) {
        const silent = { release() {} };
        const ctx = this.live();
        if (!ctx) return silent;

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
        amp.connect(this.master);
        osc.start(t);
        const end = t + 0.35 + sustain * 6;
        osc.stop(end);

        let released = false;
        return {
            release() {
                if (released) return;
                released = true;
                // みじかく おしても、音の高さが わかるくらいは のこす
                const at = Math.max(ctx.currentTime, t + 0.35);
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
        // 黒いけんばんの音が いちばん下の 和音（くろいけんばんの レッスン）
        Db: [49, 53, 56],     // ド♯・ファ・ソ♯
        Eb: [51, 55, 58],     // ミ♭・ソ・シ♭
        Gb: [54, 58, 61],     // ソ♭・シ♭・レ♭
        Ab: [44, 48, 51],     // ラ♭・ド・ミ♭
        Bb: [46, 50, 53],     // シ♭・レ・ファ
    },

    // 和音を ポロロンと鳴らす（when 秒あとから、strum 秒ずつ ずらして）
    chord(name, { gain = 0.16, when = 0.12, strum = 0.035 } = {}) {
        const notes = this.CHORDS[name];
        if (!notes) return;
        notes.forEach((midi, i) => {
            const voice = this.note(midi, { gain, when: when + i * strum });
            voice.release();
        });
    },
};

// はじめて画面にさわったときに、音を使えるようにする（iPhone は touchend・click でないと だめなことがある）
['pointerdown', 'touchend', 'click', 'keydown'].forEach(type => {
    document.addEventListener(type, () => TamaSound.unlock(), { capture: true, passive: true });
});
