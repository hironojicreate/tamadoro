// きょくふう メロディ（おんぷよみ Lv8）：曲調の 表と、その 曲調の メロディを つくる
//   1つの 曲は 8つの 和音（1つの 和音に 3〜4おんの メロディ ＝ 1フレーズ）。8フレーズを つなぐと 1曲
//   曲調には ノブ（weight）が ついている：0 で 出なくなり、2 で 2ばい 出やすい。
//   系統（FAMILIES）にも weight が あるので、「ジャズ風は まとめて 止める」も 1か所で できる
//   メロディは 白いけんばん（ド〜たかいソ）だけ。黒いけんばんの 音（C7 の シ♭ など）は 伴奏の 和音の 中だけ
//
//   TamaSongs.pick()                 曲調を 1つ えらぶ（/song で きめた 曲調・系統が あれば それ）
//   TamaSongs.make(style)            その 曲調の 8フレーズ [{ notes, chord }]
//   TamaSongs.chordNotes(name)       和音記号（'Dm7' など）→ 伴奏の 音（MIDI）
//   TamaSongs.force(id) / forced()   /song で 曲調・系統を きめる（'off' で もとに もどす）

const TamaSongs = {
    FORCE_KEY: 'tamadoro.notes.song',
    LOW: 60,  // メロディの いちばん下（ド）
    HIGH: 79, // メロディの いちばん上（たかいソ）

    // 系統（weight が 系統の ノブ）
    FAMILIES: {
        classic: { name: 'クラシック', weight: 1 },
        pops: { name: 'ポップス', weight: 1 },
        minor: { name: 'マイナー', weight: 1 },
        sus4: { name: 'サスフォー', weight: 1 },
        jazz: { name: 'ジャズ', weight: 1 },
        modern: { name: 'モダン', weight: 1 },
        borrowed: { name: 'せつない', weight: 1 },
        church: { name: 'きょうかい', weight: 1 },
        blues: { name: 'ブルース', weight: 1 },
        rock: { name: 'ロック', weight: 1 },
        bossa: { name: 'ボサノバ', weight: 1 },
        game: { name: 'ゲーム', weight: 1 },
        doyo: { name: 'どうよう', weight: 1 },
    },

    // 曲調（weight が 曲調の ノブ）。key：おわりの 音（'C' は ドで、'Am' は ラで おわる）
    //   となりあう 和音は かならず ちがう。さいごの 和音は おわりの 音を ふくむ
    STYLES: [
        { id: 'cadence', family: 'classic', name: 'クラシック風', sub: 'カデンツ', key: 'C', weight: 1,
          chords: ['C', 'F', 'G7', 'C', 'Am', 'Dm', 'G7', 'C'] },
        { id: 'canon', family: 'classic', name: 'クラシック風', sub: 'カノン しんこう', key: 'C', weight: 1,
          chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'G7', 'C'] },
        { id: 'circle', family: 'classic', name: 'クラシック風', sub: 'ごどけん しんこう', key: 'C', weight: 1,
          chords: ['C', 'F', 'Bm7b5', 'Em', 'Am', 'Dm', 'G7', 'C'] },
        { id: 'oudou', family: 'pops', name: 'ポップス風', sub: 'おうどう しんこう', key: 'C', weight: 1,
          chords: ['F', 'G', 'Em', 'Am', 'F', 'G7', 'Csus4', 'C'] },
        { id: 'komuro', family: 'pops', name: 'ポップス風', sub: 'こむろ しんこう', key: 'C', weight: 1,
          chords: ['Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'] },
        { id: 'fifties', family: 'pops', name: 'ポップス風', sub: 'フィフティーズ', key: 'C', weight: 1,
          chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'G7', 'C'] },
        { id: 'fourchords', family: 'pops', name: 'ポップス風', sub: '4つの コード', key: 'C', weight: 1,
          chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'] },
        { id: 'sad', family: 'minor', name: 'マイナー風', sub: 'かなしい きょく', key: 'Am', weight: 1,
          chords: ['Am', 'Dm', 'E7', 'Am', 'F', 'Dm', 'E7', 'Am'] },
        { id: 'aeolian', family: 'minor', name: 'マイナー風', sub: 'エオリアン', key: 'Am', weight: 1,
          chords: ['Am', 'F', 'G', 'Em', 'F', 'G', 'E7', 'Am'] },
        { id: 'minorcircle', family: 'minor', name: 'マイナー風', sub: 'マイナーの ごどけん', key: 'Am', weight: 1,
          chords: ['Am', 'Dm', 'G', 'C', 'F', 'Bm7b5', 'E7', 'Am'] },
        { id: 'sus4', family: 'sus4', name: 'サスフォー風', sub: 'ひっぱって おさまる', key: 'C', weight: 1,
          chords: ['C', 'Gsus4', 'G', 'Am', 'F', 'Gsus4', 'G7', 'C'] },
        { id: 'fuwari', family: 'sus4', name: 'サスフォー風', sub: 'ふんわり', key: 'C', weight: 1,
          chords: ['Csus4', 'C', 'Fsus4', 'F', 'Gsus4', 'G', 'Csus4', 'C'] },
        { id: 'twofive', family: 'jazz', name: 'ジャズ風', sub: 'ツーファイブワン', key: 'C', weight: 1,
          chords: ['Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'C6'] },
        { id: 'junkan', family: 'jazz', name: 'ジャズ風', sub: 'じゅんかん しんこう', key: 'C', weight: 1,
          chords: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'A7', 'G7', 'Cmaj7'] },
        { id: 'minortwofive', family: 'jazz', name: 'ジャズ風', sub: 'マイナー ツーファイブ', key: 'Am', weight: 1,
          chords: ['Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7', 'Am6'] },
        { id: 'marunouchi', family: 'modern', name: 'モダン風', sub: 'まるのうち しんこう', key: 'Am', weight: 1,
          chords: ['Fmaj7', 'E7', 'Am7', 'Gm7', 'C7', 'Fmaj7', 'E7', 'Am7'] },
        { id: 'citypop', family: 'modern', name: 'シティポップ風', sub: 'おしゃれな よる', key: 'C', weight: 1,
          chords: ['Fmaj7', 'G6', 'Em7', 'Am7', 'Dm7', 'G7sus4', 'G7', 'Cmaj7'] },
        { id: 'dorian', family: 'modern', name: 'モダン風', sub: 'ドリアン', key: 'Am', weight: 1,
          chords: ['Am7', 'D7', 'Am7', 'D7', 'Fmaj7', 'G7', 'Em7', 'Am7'] },
        { id: 'subdominantminor', family: 'borrowed', name: 'せつない風', sub: 'サブドミナント マイナー', key: 'C', weight: 1,
          chords: ['C', 'F', 'Fm', 'C', 'Am', 'F', 'Fm', 'C'] },
        { id: 'amen', family: 'church', name: 'きょうかい風', sub: 'アーメン', key: 'C', weight: 1,
          chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'C'] },
        { id: 'hymn', family: 'church', name: 'きょうかい風', sub: 'さんびか', key: 'C', weight: 1,
          chords: ['C', 'Am', 'Dm', 'G', 'C', 'F', 'G', 'C'] },
        { id: 'blues', family: 'blues', name: 'ブルース風', sub: 'ブルース', key: 'C', weight: 1,
          chords: ['C7', 'F7', 'C7', 'G7', 'F7', 'C7', 'G7', 'C7'] },
        { id: 'mixolydian', family: 'rock', name: 'ロック風', sub: 'ミクソリディアン', key: 'C', weight: 1,
          chords: ['C', 'Bb', 'F', 'C', 'G', 'F', 'Bb', 'C'] },
        { id: 'ballad', family: 'rock', name: 'ロック風', sub: 'バラード', key: 'C', weight: 1,
          chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'C'] },
        { id: 'bossa', family: 'bossa', name: 'ボサノバ風', sub: 'ボサノバ', key: 'C', weight: 1,
          chords: ['Cmaj7', 'D7', 'Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'Cmaj7'] },
        { id: 'fanfare', family: 'game', name: 'ゲーム風', sub: 'ファンファーレ', key: 'C', weight: 1,
          chords: ['C', 'G', 'Am', 'F', 'C', 'Ab', 'Bb', 'C'] },
        { id: 'dungeon', family: 'game', name: 'ゲーム風', sub: 'ダンジョン', key: 'Am', weight: 1,
          chords: ['Am', 'G', 'F', 'E7', 'Am', 'Dm', 'E7', 'Am'] },
        { id: 'doyo', family: 'doyo', name: 'どうよう風', sub: 'どうよう', key: 'C', weight: 1,
          chords: ['C', 'F', 'C', 'G7', 'C', 'F', 'G7', 'C'] },
        { id: 'warabe', family: 'doyo', name: 'どうよう風', sub: 'わらべうた', key: 'C', weight: 1,
          chords: ['C', 'Am', 'F', 'G7', 'C', 'F', 'G7', 'C'] },
    ],

    // ---------- 和音記号 ----------

    ROOTS: { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 },
    QUALITIES: {
        '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
        m7b5: [0, 3, 6, 10], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
        dim: [0, 3, 6], aug: [0, 4, 8], add9: [0, 4, 7, 14],
    },

    // 'Bm7b5' → { root: 11, intervals: [0, 3, 6, 10] }
    parse(name) {
        const match = /^([A-G])([b#]?)(.*)$/.exec(name);
        if (!match || !(match[3] in this.QUALITIES)) return null;
        const root = (this.ROOTS[match[1]] + (match[2] === 'b' ? -1 : match[2] === '#' ? 1 : 0) + 12) % 12;
        return { root, intervals: this.QUALITIES[match[3]] };
    },

    // 和音の 音の なまえ（0〜11）
    tones(name) {
        const chord = this.parse(name);
        return chord ? chord.intervals.map(i => (chord.root + i) % 12) : [];
    },

    // 伴奏の 音（ひくめ。ねもとは ラ〜ソ♯ の あいだ）
    chordNotes(name) {
        const chord = this.parse(name);
        if (!chord) return null;
        const base = 48 + chord.root - (chord.root >= 9 ? 12 : 0);
        return chord.intervals.map(i => base + i);
    },

    // 曲調で 使う 和音を、TamaSound.CHORDS に たしておく（もとから ある 和音は そのまま）
    registerChords() {
        if (typeof TamaSound === 'undefined') return;
        this.STYLES.forEach(style => style.chords.forEach(name => {
            if (!TamaSound.CHORDS[name]) TamaSound.CHORDS[name] = this.chordNotes(name);
        }));
    },

    // ---------- 曲調を えらぶ ----------

    forced() {
        try {
            return localStorage.getItem(this.FORCE_KEY);
        } catch (error) {
            return null;
        }
    },

    // /song で きめる：曲調の id か 系統の 名前。'off' で もとに もどす。きめられたら true
    force(id) {
        if (id === 'off') {
            localStorage.removeItem(this.FORCE_KEY);
            return true;
        }
        if (!this.FAMILIES[id] && !this.STYLES.some(s => s.id === id)) return false;
        localStorage.setItem(this.FORCE_KEY, id);
        return true;
    },

    weightOf(style) {
        return Math.max(0, style.weight) * Math.max(0, this.FAMILIES[style.family].weight);
    },

    pick(random = Math.random) {
        const forced = this.forced();
        let pool = this.STYLES;
        if (forced) {
            const exact = this.STYLES.filter(s => s.id === forced);
            const family = this.STYLES.filter(s => s.family === forced);
            if (exact.length) return exact[0];
            if (family.length) pool = family;
        }
        // ノブ（weight）が 0 の 曲調は 出ない。ぜんぶ 0 なら さいしょの 曲調
        const total = pool.reduce((sum, s) => sum + this.weightOf(s), 0);
        if (total <= 0) return pool[0];
        let r = random() * total;
        for (const style of pool) {
            r -= this.weightOf(style);
            if (r < 0) return style;
        }
        return pool[pool.length - 1];
    },

    // ---------- メロディ ----------

    // 白いけんばん（ド〜たかいソ）
    whites() {
        const out = [];
        for (let m = this.LOW; m <= this.HIGH; m++) {
            if (![1, 3, 6, 8, 10].includes(m % 12)) out.push(m);
        }
        return out;
    },

    // その 和音の メロディに 使える 音（和音の 音の うち 白いけんばん）
    chordWhites(name) {
        const tones = this.tones(name);
        return this.whites().filter(m => tones.includes(m % 12));
    },

    // 8フレーズを つくる。どの フレーズも 和音の 音だけで、3度より 大きい とびが 1かいは ある。
    //   まえの フレーズの おわりから、むりの ない ところで はじまる。さいごは key の 音（ド か ラ）で おわる
    make(style, random = Math.random) {
        const pickOne = list => list[Math.floor(random() * list.length)];
        const tonic = style.key === 'Am' ? 9 : 0;
        const phrases = [];
        let previous = 67; // さいしょは ソの あたりから
        style.chords.forEach((chord, index) => {
            const last = index === style.chords.length - 1;
            const pool = this.chordWhites(chord);
            let notes = null;
            for (let tries = 0; tries < 200 && !notes; tries++) {
                const length = random() < 0.3 ? 4 : 3;
                // はじめの 音：まえの おわりに ちかい 和音の 音（ちかい 3つから）
                const near = [...pool].sort((a, b) => Math.abs(a - previous) - Math.abs(b - previous)).slice(0, 3);
                const candidate = [pickOne(near)];
                while (candidate.length < length) {
                    const from = candidate[candidate.length - 1];
                    const choices = pool.filter(m => m !== from && Math.abs(m - from) <= 12);
                    candidate.push(pickOne(choices.length ? choices : pool));
                }
                if (last) {
                    // さいごは おわりの 音（いちばん ちかい ド・ラ）
                    const ends = pool.filter(m => m % 12 === tonic);
                    const before = candidate[candidate.length - 2];
                    candidate[candidate.length - 1] = [...ends].sort((a, b) => Math.abs(a - before) - Math.abs(b - before))[0];
                }
                const jumps = candidate.slice(1).map((m, i) => Math.abs(m - candidate[i]));
                const leap = jumps.some(j => j >= 3);
                const tooBig = jumps.some(j => j > 12);
                const same = phrases.length && phrases[phrases.length - 1].notes.join() === candidate.join();
                if (leap && !tooBig && !same) notes = candidate;
            }
            phrases.push({ notes, chord });
            previous = notes[notes.length - 1];
        });
        return phrases;
    },
};

TamaSongs.registerChords();

// Node で ためすとき用
if (typeof module !== 'undefined') module.exports = TamaSongs;
