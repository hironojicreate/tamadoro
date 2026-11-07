// きょくふう メロディ（おんぷよみ オニ）：曲調の 表と、その 曲調の メロディを つくる
//   1つの 曲は 8つの 和音（1つの 和音に 3〜4おんの メロディ ＝ 1フレーズ）。8フレーズを つなぐと 1曲
//   曲調には ノブ（weight）が ついている：0 で 出なくなり、2 で 2ばい 出やすい。
//   系統（FAMILIES）にも weight が あるので、「ジャズ風は まとめて 止める」も 1か所で できる
//   メロディは 白いけんばん（ひくいラ〜たかいソ）だけ。黒いけんばんの 音（C7 の シ♭ など）は 伴奏の 和音の 中だけ
//   メロディは「うたう メロディ」：つよい 拍は 和音の 音、よわい 拍は 経過音・刺繍音も。8小節を
//     起（1〜2）・承（3〜4）・サビ（5〜7、ときどき 5〜6）・結 に して、サビで もりあげる。
//     系統ごとに メロディの 性格（高さ・広さ・とび・サビの むき）が ある（FAMILIES の melody。下の「メロディ」）
//   リズムは 4/4拍子。1つの 和音 ＝ 1小節（4拍）。● は 4ぶおんぷ、○ は 4ぶきゅうふ（3おんの 小節は ●●●○）。
//     リズムの パターン（RHYTHMS）は 系統ごとに えらぶ（系統の rhythms。リズムにも ノブ weight）
//
//   TamaSongs.pick()                 曲調を 1つ えらぶ（/song で きめた 曲調・系統が あれば それ）
//   TamaSongs.pickRhythm(style)      その 曲調の リズムを 1つ えらぶ（/rhythm で きめた リズムが あれば それ）
//   TamaSongs.make(style, random, rhythm)  その 曲調の 8フレーズ [{ notes, chord, rhythm: '●●●○', sabi: 'up' か null }]
//   TamaSongs.melodyOf(style)        その 曲調の メロディの 性格（高さ・広さ・とび・サビの むき）
//   TamaSongs.scaleWhites(style)     その 曲調の メロディに つかう 白いけんばん（5音音階の 曲調は その 音だけ）
//   TamaSongs.soundOf(style)         その 曲調の 音色 { melody（けんばん・メロディ）, chord（伴奏） }
//   TamaSongs.restsAfter(bars)       休符の まえの 音符の ばんごう（-1 は 音符より まえ）。休符を ひからせる ときに 使う
//   TamaSongs.chordNotes(name)       和音記号（'Dm7' など）→ 伴奏の 音（MIDI）
//   TamaSongs.force(id) / forced()   /song で 曲調・系統を きめる（'off' で もとに もどす）
//   TamaSongs.forceRhythm(id) / forcedRhythm()   /rhythm で リズムを きめる（'off' で もとに もどす）

const TamaSongs = {
    FORCE_KEY: 'tamadoro.notes.song',
    RHYTHM_KEY: 'tamadoro.notes.rhythm',
    LOW: 57,  // メロディの いちばん下（ひくいラ）
    HIGH: 79, // メロディの いちばん上（たかいソ）

    // 系統（weight が 系統の ノブ。rhythms：その 系統で 使う リズム、melody：メロディの 性格。下の「メロディ」、
    //   sound：音色。melody ＝ けんばん・メロディ、chord ＝ 伴奏（js/sound.js の VOICES。'piano' は いつもの 音）。曲調の sound で 上書き）
    FAMILIES: {
        classic: { name: 'クラシック', weight: 1, rhythms: ['utau', 'setsunai'],
            melody: { center: 'mid', width: 'wide', leap: 'normal', sabi: { up: 4, surge: 1 } },
            sound: { melody: 'piano', chord: 'strings' } },
        pops: { name: 'ポップス', weight: 1, rhythms: ['genki', 'hazumu', 'utau'],
            melody: { center: 'mid', width: 'normal', leap: 'normal', verse: -3, lift: 9, sabi: { up: 4, surge: 1 } },
            sound: { melody: 'piano', chord: 'piano' } },
        minor: { name: 'マイナー', weight: 1, rhythms: ['setsunai', 'utau'],
            melody: { center: 'low', width: 'normal', leap: 'few', lift: 9, sabi: { up: 4, surge: 1 } },
            sound: { melody: 'piano', chord: 'strings' } },
        sus4: { name: 'サスフォー', weight: 1, rhythms: ['utau', 'setsunai'],
            melody: { center: 'mid', width: 'narrow', leap: 'few', lift: 3, sabi: { up: 1 } },
            sound: { melody: 'epiano', chord: 'strings' } },
        jazz: { name: 'ジャズ', weight: 1, rhythms: ['zurashi', 'utau'],
            melody: { center: 'mid', width: 'wide', leap: 'many', sabi: { up: 3, octave: 2 } },
            sound: { melody: 'epiano', chord: 'epiano' } },
        modern: { name: 'モダン', weight: 1, rhythms: ['setsunai', 'zurashi'],
            melody: { center: 'high', width: 'normal', leap: 'normal', sabi: { up: 1 } },
            sound: { melody: 'epiano', chord: 'epiano' } },
        borrowed: { name: 'せつない', weight: 1, rhythms: ['setsunai', 'utau'],
            melody: { center: 'low', width: 'normal', leap: 'few', lift: 9, sabi: { up: 4, surge: 1 } },
            sound: { melody: 'piano', chord: 'strings' } },
        church: { name: 'きょうかい', weight: 1, rhythms: ['utau', 'setsunai'],
            melody: { center: 'mid', width: 'narrow', leap: 'few', lift: 3, sabi: { up: 1 } },
            sound: { melody: 'organ', chord: 'organ' } },
        blues: { name: 'ブルース', weight: 1, rhythms: ['genki', 'zurashi'],
            melody: { center: 'low', width: 'normal', leap: 'normal', sabi: { up: 3, down: 2 } },
            sound: { melody: 'piano', chord: 'organ' } },
        rock: { name: 'ロック', weight: 1, rhythms: ['genki', 'hazumu'],
            melody: { center: 'low', width: 'normal', leap: 'normal', sabi: { up: 3, down: 2, surge: 1 } },
            sound: { melody: 'piano', chord: 'organ' } },
        bossa: { name: 'ボサノバ', weight: 1, rhythms: ['zurashi', 'utau'],
            melody: { center: 'mid', width: 'wide', leap: 'many', sabi: { up: 3, octave: 2 } },
            sound: { melody: 'epiano', chord: 'strings' } }, // ボサノバの 名曲の ように うすく のばす ストリングス
        game: { name: 'ゲーム', weight: 1, rhythms: ['genki', 'hazumu'],
            melody: { center: 'mid', width: 'wide', leap: 'many', sabi: { up: 2, octave: 2, surge: 1 } },
            sound: { melody: 'chip', chord: 'chip' } },
        nihon: { name: 'にほん', weight: 1, rhythms: ['utau', 'setsunai', 'hazumu'],
            melody: { center: 'mid', width: 'normal', leap: 'normal', sabi: { up: 3, surge: 1 } },
            sound: { melody: 'koto', chord: 'shakuhachi' } }, // ことの メロディに 尺八の のばし
        // おきなわ：「沖縄感が むずかしい」ので ほりゅう（ノブ 0 で おまかせでは 出ない。/song では ためせる）
        okinawa: { name: 'おきなわ', weight: 0, rhythms: ['hazumu', 'genki', 'utau'],
            melody: { center: 'mid', width: 'normal', leap: 'normal', sabi: { up: 1 } },
            sound: { melody: 'piano', chord: 'piano' } },
        doyo: { name: 'どうよう', weight: 1, rhythms: ['hazumu', 'utau'],
            melody: { center: 'mid', width: 'narrow', leap: 'few', lift: 3, sabi: { up: 1 } },
            sound: { melody: 'musicbox', chord: 'piano' } },
    },

    // リズムの パターン（4/4拍子・8小節。weight が リズムの ノブ、tempo が「じぶんの えんそうを きく」の はやさ（1分に 何拍））
    //   ● は 4ぶおんぷ（1つの 音）、○ は 4ぶきゅうふ（おやすみ）。｜ は 小節の くぎり、／ は だんの くぎり
    //   4小節めと 8小節めは かならず ●●●○（いきつぎ。さいごの ○ で 伴奏の 和音が のこる）
    RHYTHMS: {
        // うしろの だんほど 音が つまって、もりあがる
        genki: { name: 'げんきな リズム', weight: 1, tempo: 112, bars: '●●●○｜●●●○｜●●●●｜●●●○ ／ ●●●●｜●●●●｜●●●●｜●●●○' },
        // ●●●○ が おおくて、はずむ（行進曲・どうよう）
        hazumu: { name: 'はずむ リズム', weight: 1, tempo: 108, bars: '●●●○｜●●●○｜●●●●｜●●●○ ／ ●●●○｜●●●○｜●●●●｜●●●○' },
        // さいごに 休みが つづいて、しんみり おわる
        setsunai: { name: 'せつない リズム', weight: 1, tempo: 96, bars: '●●●●｜●●●○｜●●●●｜●●●○ ／ ●●●●｜●●●●｜●●●○｜●●●○' },
        // 2小節ずつ「とい → こたえ」
        utau: { name: 'うたう リズム', weight: 1, tempo: 96, bars: '●●●●｜●●●○｜●●●●｜●●●○ ／ ●●●●｜●●●○｜●●●●｜●●●○' },
        // 1拍めを 休んで、うしろに ずらす（ジャズ・ボサノバ）。ひくのは 音符だけ
        zurashi: { name: 'ずらす リズム', weight: 1, tempo: 104, bars: '○●●●｜●●●●｜○●●●｜●●●○ ／ ○●●●｜●●●●｜●●●●｜●●●○' },
    },

    // 曲調（weight が 曲調の ノブ）。key：おわりの 音（'C' は ドで、'Am' は ラで おわる）。melody：系統の 性格を 上書き
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
          melody: { center: 'low', sabi: { down: 1 } }, // ひくく うなる
          chords: ['Am', 'G', 'F', 'E7', 'Am', 'Dm', 'E7', 'Am'] },
        { id: 'doyo', family: 'doyo', name: 'どうよう風', sub: 'どうよう', key: 'C', weight: 1,
          chords: ['C', 'F', 'C', 'G7', 'C', 'F', 'G7', 'C'] },
        { id: 'warabe', family: 'doyo', name: 'どうよう風', sub: 'わらべうた', key: 'C', weight: 1,
          chords: ['C', 'Am', 'F', 'G7', 'C', 'F', 'G7', 'C'] },
        // 日本の 5音音階・沖縄の 音階（scale：メロディに つかう 音。ド＝0 … シ＝11）。メロディは その 音だけ、
        //   となりの 音も 音階の 中の となり（ドレミソラ なら ミの となりは ソ）
        { id: 'yonanuki', family: 'nihon', name: 'にほん風', sub: 'ヨナぬき・ドレミソラ', key: 'C', weight: 1,
          scale: [0, 2, 4, 7, 9], chords: ['C', 'Am', 'F', 'C', 'Am', 'F', 'G', 'C'] },
        // みんよう：伴奏は 空5度（ねもとと 5度だけ。A5 ＝ ラ・ミ）で、たいこや 三味線の ような ひびき
        { id: 'minyo', family: 'nihon', name: 'にほん風', sub: 'みんよう・ラドレミソ', key: 'Am', weight: 1,
          scale: [9, 0, 2, 4, 7], chords: ['A5', 'D5', 'A5', 'E5', 'A5', 'G5', 'D5', 'A5'] },
        { id: 'shimauta', family: 'okinawa', name: 'おきなわ風', sub: 'しまうた・ドミファソシ', key: 'C', weight: 1,
          scale: [0, 4, 5, 7, 11], chords: ['C', 'F', 'C', 'G7', 'C', 'F', 'G7', 'C'] },
        { id: 'kachashi', family: 'okinawa', name: 'おきなわ風', sub: 'カチャーシー', key: 'C', weight: 1,
          scale: [0, 4, 5, 7, 11], chords: ['C', 'Em', 'F', 'G', 'Cmaj7', 'F', 'G7', 'C'] },
    ],

    // ---------- 和音記号 ----------

    ROOTS: { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 },
    QUALITIES: {
        '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
        m7b5: [0, 3, 6, 10], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
        5: [0, 7], // 空5度（ねもとと 5度だけ。みんよう）
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

    forcedRhythm() {
        try {
            return localStorage.getItem(this.RHYTHM_KEY);
        } catch (error) {
            return null;
        }
    },

    // /rhythm で きめる：リズムの id。'off' で もとに もどす。きめられたら true
    forceRhythm(id) {
        if (id === 'off') {
            localStorage.removeItem(this.RHYTHM_KEY);
            return true;
        }
        if (!this.RHYTHMS[id]) return false;
        localStorage.setItem(this.RHYTHM_KEY, id);
        return true;
    },

    // リズムの 8小節（['●●●○', …]）
    rhythmBars(id) {
        return this.RHYTHMS[id].bars.split(/[｜／]/).map(bar => bar.trim());
    },

    // その 曲調の リズムを えらぶ（/rhythm で きめた リズム → 系統の rhythms から ノブの わりあいで）
    pickRhythm(style, random = Math.random) {
        const forced = this.forcedRhythm();
        if (forced && this.RHYTHMS[forced]) return forced;
        const ids = this.FAMILIES[style.family].rhythms;
        const total = ids.reduce((sum, id) => sum + Math.max(0, this.RHYTHMS[id].weight), 0);
        if (total <= 0) return ids[0];
        let r = random() * total;
        for (const id of ids) {
            r -= Math.max(0, this.RHYTHMS[id].weight);
            if (r < 0) return id;
        }
        return ids[ids.length - 1];
    },

    // 休符の まえの 音符の ばんごう（小節を つないだ ときの。-1 は 音符より まえ）
    restsAfter(bars) {
        const out = [];
        let count = 0;
        bars.join('').split('').forEach(mark => {
            if (mark === '●') count++;
            else if (mark === '○') out.push(count - 1);
        });
        return out;
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

    // 白いけんばん（ひくいラ〜たかいソ）
    whites() {
        const out = [];
        for (let m = this.LOW; m <= this.HIGH; m++) {
            if (![1, 3, 6, 8, 10].includes(m % 12)) out.push(m);
        }
        return out;
    },

    // その 曲調の メロディに つかう 白いけんばん（scale が ある 曲調は その 音階の 音だけ）
    scaleWhites(style) {
        return this.whites().filter(m => !style.scale || style.scale.includes(m % 12));
    },

    // その 和音の メロディに 使える 音（和音の 音の うち 白いけんばん）
    chordWhites(name) {
        const tones = this.tones(name);
        return this.whites().filter(m => tones.includes(m % 12));
    },

    // メロディの 性格の 目盛り（系統の melody、曲調の melody で 上書き）
    //   center（高さ）：low ひくめ・mid まんなか・high たかめ（まんなかに する 音）
    //   width（広さ）：narrow せまい（平ら）・normal ふつう・wide ひろい（1曲で かならず はしの 音に とどく）
    //   leap（とび）：few すくない・normal ふつう・many おおい（白いけんばんで いくつ とぶかの 出やすさと、いちばん 大きい とび）
    //   sabi（サビの むき。重み）：up もりあがる・down しずむ・octave オクターブ とびあがる・
    //     surge ぐぐぐっと（サビの 小節ごとに 1だんずつ 上がって、たかいファ・ソ まで。もりあげやすい 曲調に ときどき）
    //   lift：up の とき サビを どれだけ 上げるか（半音）、verse：サビの まえを どれだけ 下げるか（ポップスの「Aメロは ひくめ」）
    CENTERS: { low: 62, mid: 67, high: 72 },
    SPREADS: { narrow: 4, normal: 7, wide: 11 },
    LEAPS: {
        few: { weights: [0.3, 6, 3, 0.6, 0.2, 0.1], max: 3 },
        normal: { weights: [0.3, 5, 3.5, 1.6, 1, 0.4], max: 4 },
        many: { weights: [0.3, 3, 3.5, 2.5, 2, 1.2, 0.6, 0.8], max: 5 },
    },
    SURGE: { 2: [4, 12], 3: [3, 8, 12] }, // ぐぐぐっと：サビの 小節ごとの 上げかた（半音。サビが 2小節・3小節）

    // 音色の 名前（/song の 一覧に 出す）
    SOUND_NAMES: { piano: 'ピアノ', epiano: 'エレピ', organ: 'オルガン', strings: 'ストリングス', chip: 'ピコピコ', musicbox: 'オルゴール', koto: 'こと', shakuhachi: 'しゃくはち' },

    // その 曲調の 音色 { melody, chord }
    soundOf(style) {
        return { melody: 'piano', chord: 'piano', ...this.FAMILIES[style.family].sound, ...(style.sound || {}) };
    },

    // その 曲調の メロディの 性格
    melodyOf(style) {
        return { lift: 7, verse: 0, ...this.FAMILIES[style.family].melody, ...(style.melody || {}) };
    },

    // 重みの 表（{ up: 4, surge: 1 }）から 1つ
    pickWeighted(table, random = Math.random) {
        const entries = Object.entries(table).filter(([, w]) => w > 0);
        const total = entries.reduce((sum, [, w]) => sum + w, 0);
        let r = random() * total;
        for (const [key, w] of entries) {
            r -= w;
            if (r < 0) return key;
        }
        return entries[entries.length - 1][0];
    },

    // 8フレーズを つくる（うたう メロディ）。小節の 音の かずは リズム（● の かず）。
    //   ・つよい 拍（1・3拍め）、小節の さいしょの 音、きゅうふの まえの 音、さいごの 音 は 和音の 音
    //   ・よわい 拍（2・4拍め）は 和音の そとの 音も よい。ただし となり（白いけんばんで 1つ）から きて、
    //     となりの 和音の 音へ ぬける（経過音：同じ むきに すすむ、刺繍音：もとの 音に もどる）
    //   ・となりへの うごきが 中心。3つ以上 とんだら つぎは はんたいむきに 2つまで（とんだら もどる）
    //   ・ド・シ・ド・シ の いったりきたりと、となりの 小節と まったく 同じ ならびは なし。3小節めは 1小節めの かたちを まねる
    //   ・4小節めの おわりは ド（マイナーは ラ）以外（まだ つづく）。さいごは となりから ド（ラ）
    //   ・サビ（5〜7小節め、ときどき 5〜6）は 広さ・とびを 1だん 上げる。山（down は 谷）は サビの 中
    //   かえす フレーズの sabi：サビの 小節は サビの むき（'up' など）、ほかは null
    make(style, random = Math.random, rhythm = this.pickRhythm(style, random)) {
        const character = this.melodyOf(style);
        const whites = this.scaleWhites(style); // 「となり」は この ならびの となり（5音音階なら 音階の となり）
        const idx = m => whites.indexOf(m);
        const tonic = style.key === 'Am' ? 9 : 0;
        const bars = this.rhythmBars(rhythm);
        const sabiEnd = random() < 0.7 ? 6 : 5; // サビの おわりの 小節（0から）
        const chosen = this.pickWeighted(character.sabi, random);
        const inSabi = b => b >= 4 && b <= sabiEnd;
        const sabiBars = sabiEnd - 3;
        const levels = ['narrow', 'normal', 'wide'];
        const leaps = ['few', 'normal', 'many'];
        const raise = (list, v) => list[Math.min(list.length - 1, list.indexOf(v) + 1)];
        const isChordTone = (m, chord) => this.tones(chord).includes(m % 12);

        // sabiDir の サビで つくる（strict：1曲 ぜんたいの きまりも まもる。つくれなければ null）
        const compose = (sabiDir, strict) => {
            // 音を 出す ところ（slot）と、その ところの ねらう 高さ・広さ・とび
            const slots = [];
            bars.forEach((bar, b) => {
                const marks = bar.split('');
                let first = true;
                marks.forEach((mark, k) => {
                    if (mark !== '●') return;
                    const sabi = inSabi(b);
                    const surge = sabi && sabiDir === 'surge';
                    // しずむ（down）は、サビの まえを すこし 上げて、サビを 下げる（ひくい 曲調でも いちばん 下に つかえない）
                    const shift = !sabi ? character.verse + (sabiDir === 'down' ? 4 : 0)
                        : surge ? this.SURGE[sabiBars][b - 4]
                        : sabiDir === 'down' ? -4 : sabiDir === 'octave' ? 3 : character.lift;
                    const width = sabi ? (surge ? 'wide' : raise(levels, character.width)) : character.width;
                    const leap = this.LEAPS[sabi ? raise(leaps, character.leap) : character.leap];
                    slots.push({
                        bar: b, chord: style.chords[b], sabi, first,
                        strong: k === 0 || k === 2,
                        beforeRest: k === 3 ? (b === bars.length - 1 || bars[b + 1][0] === '○') : marks[k + 1] === '○',
                        target: this.CENTERS[character.center] + shift,
                        spread: this.SPREADS[width],
                        weights: leap.weights,
                        max: sabi && sabiDir === 'octave' ? 7 : leap.max,
                    });
                    first = false;
                });
            });
            const lastSlot = slots.length - 1;
            const mustChord = i => slots[i].strong || slots[i].first || slots[i].beforeRest || i === lastSlot;

            // 1かい ためす
            const attempt = () => {
                const out = [];
                let budget = 5000;
                const barNotes = b => slots.map((s, j) => (s.bar === b && j < out.length ? out[j] : null)).filter(m => m !== null);
                const allowed = (i, m) => {
                    const s = slots[i];
                    const chordTone = isChordTone(m, s.chord);
                    if (i === lastSlot && m % 12 !== tonic) return false;
                    if (s.bar === 3 && s.beforeRest && m % 12 === tonic) return false; // 4小節めは まだ つづく
                    if (mustChord(i) && !chordTone) return false;
                    if (i === 0) return true;
                    const prev = out[i - 1];
                    const d = idx(m) - idx(prev);
                    if (Math.abs(d) > s.max) return false;
                    if (i === lastSlot && Math.abs(d) !== 1) return false; // さいごは となりから
                    if (!chordTone && Math.abs(d) !== 1) return false;     // 和音の そとの 音は となりから
                    if (i > 1) {
                        const before = idx(prev) - idx(out[i - 2]);
                        if (Math.abs(before) >= 3 && (Math.sign(d) === Math.sign(before) || Math.abs(d) > 2)) return false; // とんだら もどる
                        if (m === prev && prev === out[i - 2]) return false;                                                  // 同じ 音 3つ
                        // まえが 和音の そとの 音：となりの 和音の 音へ ぬける（経過音か 刺繍音）
                        if (!isChordTone(prev, slots[i - 1].chord)
                            && (!chordTone || Math.abs(d) !== 1 || !(Math.sign(before) === Math.sign(d) || m === out[i - 2]))) return false;
                    }
                    if (i > 2 && m === out[i - 2] && prev === out[i - 3]) return false; // いったりきたり
                    // 小節の おわり：まえの 小節と まったく 同じ ならびは なし（3小節めの まねは べつ）
                    const next = slots[i + 1];
                    if ((!next || next.bar !== s.bar) && s.bar > 0 && s.bar !== 2
                        && [...barNotes(s.bar), m].join() === barNotes(s.bar - 1).join()) return false;
                    return true;
                };
                // つぎの 音の こうほを、出やすさの じゅんに（とびの 大きさ・ねらう 高さ・3小節めの まね）
                const candidates = i => {
                    const s = slots[i];
                    const prev = out[i - 1];
                    const motif = [];
                    if (s.bar === 2 && i > 0 && slots[i - 1].bar === 2) {
                        const b0 = barNotes(0);
                        b0.slice(1).forEach((m, j) => motif.push(idx(m) - idx(b0[j])));
                    }
                    const list = whites.map(m => {
                        let w = prev === undefined ? 1 : (s.weights[Math.abs(idx(m) - idx(prev))] || 0);
                        w *= 0.08 + Math.exp(-Math.pow((m - s.target) / s.spread, 2));
                        if (!isChordTone(m, s.chord)) w *= 0.6;
                        const pos = barNotes(2).length - 1;
                        if (motif[pos] !== undefined && idx(m) - idx(prev) === motif[pos]) w *= 8;
                        return { m, w };
                    }).filter(c => c.w > 0);
                    const order = [];
                    while (list.length) {
                        const total = list.reduce((sum, c) => sum + c.w, 0);
                        let r = random() * total;
                        let k = list.findIndex(c => (r -= c.w) < 0);
                        if (k < 0) k = list.length - 1;
                        order.push(list[k].m);
                        list.splice(k, 1);
                    }
                    return order;
                };
                const search = i => {
                    if (i === slots.length) return true;
                    if (--budget < 0) return false;
                    for (const m of candidates(i)) {
                        if (!allowed(i, m)) continue;
                        out.push(m);
                        if (search(i + 1)) return true;
                        out.pop();
                    }
                    return false;
                };
                if (!search(0)) return null;
                if (!strict) return out;
                // 1曲 ぜんたいの きまり
                const sabiNotes = out.filter((m, i) => slots[i].sabi);
                const verseNotes = out.filter((m, i) => slots[i].bar < 4);
                const others = out.filter((m, i) => !slots[i].sabi);
                const mean = list => list.reduce((sum, m) => sum + m, 0) / list.length;
                if (sabiDir === 'down') {
                    if (Math.min(...sabiNotes) > Math.min(...others) - 1) return null; // 谷は サビ
                    if (mean(sabiNotes) > mean(verseNotes) - 2) return null;
                } else {
                    if (Math.max(...sabiNotes) <= Math.max(...others)) return null;     // 山は サビ
                    if (mean(sabiNotes) < mean(verseNotes) + (character.lift >= 7 ? 3 : 1)) return null;
                    if (sabiDir === 'octave' && !out.some((m, i) => i > 0 && slots[i].sabi && Math.abs(m - out[i - 1]) === 12)) return null;
                    if (sabiDir === 'surge') {
                        // ぐぐぐっと：サビの 小節ごとに 高く なって、たかいファ・ソ まで
                        const tops = [];
                        for (let b = 4; b <= sabiEnd; b++) tops.push(Math.max(...out.filter((m, i) => slots[i].bar === b)));
                        if (tops.some((t, j) => j > 0 && t <= tops[j - 1]) || tops[tops.length - 1] < 77) return null;
                    }
                }
                if (character.width === 'wide' && !out.some(m => m <= 59 || m >= 77)) return null; // ひろい 曲調は はしに とどく
                return out;
            };
            let notes = null;
            for (let tries = 0; tries < 400 && !notes; tries++) notes = attempt();
            return notes && bars.map((bar, b) => ({
                notes: notes.filter((m, i) => slots[i].bar === b),
                chord: style.chords[b],
                rhythm: bar,
                sabi: inSabi(b) ? sabiDir : null,
            }));
        };
        // えらんだ むきで → だめなら もりあがる（up）で → それでも だめなら 1曲 ぜんたいの きまりを ゆるめて（まず ない）
        return compose(chosen, true) || compose('up', true) || compose(chosen, false);
    },
};

TamaSongs.registerChords();

// Node で ためすとき用
if (typeof module !== 'undefined') module.exports = TamaSongs;
