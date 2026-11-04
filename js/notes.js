// 音のデータ（どの けんばんか・どんな名前か）
//   けんばんは MIDI の番号であらわす（60 が まんなかのド、61 が その右の黒いけんばん …）
//   名前は「どの音か（ド〜シ）」と「♯・♭」で べつに持つので、
//   ひとつの黒いけんばんに 2つの名前（ド♯ と レ♭）を つけられる（黒いけんばんのレッスンで使う）

const TamaNotes = {
    MIDDLE_C: 60,

    // ド〜シ（step 0〜6）
    NAMES: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'],
    // ド〜シの、ドからの半音の数
    STEP_SEMITONES: [0, 2, 4, 5, 7, 9, 11],
    // 音ごとの色（カードの文字・けんばんの文字）。ドは赤、レはオレンジ … シはむらさき
    COLORS: ['#e74c3c', '#f39c12', '#d4ac0d', '#27ae60', '#2e86de', '#3742fa', '#8e44ad'],

    // 黒いけんばんか
    isBlack(midi) {
        return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
    },

    // 白いけんばんの、ド〜シの番号（黒いけんばんは -1）
    stepOf(midi) {
        return this.STEP_SEMITONES.indexOf(((midi % 12) + 12) % 12);
    },

    // 名前（step・♯♭・オクターブ）→ けんばん。octave 4 が まんなかのドの段
    //   alter: 1 は ♯（すぐ右どなり）、-1 は ♭（すぐ左どなり）
    //   ミ♯ や シ♯ は、白いけんばん（ファ・たかいド）になる
    keyOf(step, alter = 0, octave = 4) {
        return 12 * (octave + 1) + this.STEP_SEMITONES[step] + alter;
    },

    // ♯・♭ つきの名前（spellName(0, 1) → 'ド♯'）
    spellName(step, alter = 0) {
        return this.NAMES[step] + (alter > 0 ? '♯' : alter < 0 ? '♭' : '');
    },

    // けんばんの名前（白いけんばんは1つ、黒いけんばんは 2つ：['ド♯', 'レ♭']）
    namesOf(midi) {
        const step = this.stepOf(midi);
        if (step >= 0) return [this.NAMES[step]];
        return [`${this.NAMES[this.stepOf(midi - 1)]}♯`, `${this.NAMES[this.stepOf(midi + 1)]}♭`];
    },

    // レッスンで使う名前：まんなかのドの段はそのまま、1つ上の段のドは「たかいド」
    //   （もっと上・下の段は、いまのレッスンでは こたえに 出さない）
    lessonName(midi) {
        const names = this.namesOf(midi);
        const name = names.join('／');
        if (midi >= 72 && midi < 84) return `たかい${name}`;
        if (midi >= 48 && midi < 60) return `ひくい${name}`;
        return name;
    },

    color(midi) {
        const step = this.stepOf(midi);
        return step >= 0 ? this.COLORS[step] : '#5f27cd'; // 黒いけんばんの名前は こい むらさき
    },

    // from〜to の白いけんばん
    whiteKeys(from, to) {
        const keys = [];
        for (let midi = from; midi <= to; midi++) {
            if (!this.isBlack(midi)) keys.push(midi);
        }
        return keys;
    },
};
