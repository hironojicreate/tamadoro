// じゆうにひこう（#/piano）：音が鳴る けんばんで、すきなように ひいて あそぶ（ドロップは なし）
//   けんばんは 画面の 左はしから 右はしまで。画面の はばに合わせて 数がかわる（まんなかの ドの あたりを 中心に）
//   「音名かくにん」を ON にすると、さわった けんばんの 名前が出る（ON／OFF は この端末に おぼえておく）
//   「けんばんの はば」の スライダーで、白いけんばん 1この はばを かえられる（この端末に おぼえておく。
//   うごかすまでは 画面の はばに合わせた めやす）

const TamaPiano = {
    NAMES_KEY: 'tamadoro.piano.names',
    WIDTH_KEY: 'tamadoro.piano.keyWidth',
    keyboard: null,

    // 白いけんばん 1この はば（px）。スライダーで えらんだ はば、なければ 指で おしやすい めやす
    keyWidth(width) {
        const chosen = TamaStore.readJSON(this.WIDTH_KEY, null);
        if (typeof chosen === 'number' && chosen > 0) return chosen;
        return this.autoKeyWidth(width);
    },

    autoKeyWidth(width) {
        if (width < 600) return 40;
        if (width < 1000) return 50;
        return 56;
    },

    // 画面の はば → 見せる けんばん [from, to]（ピアノの 88けん の中で、まんなかの ドの あたりを 中心に）
    range(width) {
        const whites = TamaNotes.whiteKeys(21, 108); // ラ〜ド（ピアノ 88けん の 白いけんばん 52こ）
        const count = Math.max(5, Math.min(whites.length, Math.round(width / this.keyWidth(width))));
        const center = whites.indexOf(65); // ファ（まんなかの ド〜たかいドの まんなか あたり）
        const start = Math.max(0, Math.min(whites.length - count, center - Math.floor(count / 2)));
        return [whites[start], whites[start + count - 1]];
    },

    namesOn() {
        return TamaStore.readJSON(this.NAMES_KEY, false) === true;
    },

    open() {
        if (!this.keyboard) {
            this.keyboard = new TamaKeyboard(document.getElementById('pianoKeyboard'), {
                onPress: midi => this.onPress(midi),
                glide: true, // 指を すべらせると つぎつぎ鳴る
            });
        }
        this.renderNamesButton();
        document.getElementById('pianoName').innerHTML = '';
        this.render();
    },

    width() {
        return document.getElementById('pianoKeyboard').clientWidth || window.innerWidth;
    },

    setKeyWidth(px) {
        TamaStore.writeJSON(this.WIDTH_KEY, px);
        this.render();
    },

    render() {
        const [from, to] = this.range(this.width());
        document.getElementById('pianoWidth').value = this.keyWidth(this.width()); // スライダーも いまの はばに
        this.keyboard.render({ from, to });
    },

    stop() {
        if (this.keyboard) this.keyboard.releaseAll();
    },

    toggleNames() {
        TamaStore.writeJSON(this.NAMES_KEY, !this.namesOn());
        this.renderNamesButton();
        if (!this.namesOn()) {
            document.getElementById('pianoName').innerHTML = '';
        }
    },

    renderNamesButton() {
        const button = document.getElementById('pianoNames');
        const on = this.namesOn();
        button.textContent = on ? '音名かくにん：ON' : '音名かくにん：OFF';
        button.classList.toggle('on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
    },

    onPress(midi) {
        if (!this.namesOn()) return;
        const name = TamaNotes.namesOf(midi).join('／');
        this.keyboard.balloon(midi, name);
        document.getElementById('pianoName').innerHTML = this.nameSVG(name, TamaNotes.color(midi));
    },

    // 名前を、ぷっくり文字の SVG に（黒いけんばんの「ド♯／レ♭」は 横に長い）
    nameSVG(name, color) {
        const fontSize = 92;
        const width = Math.max(160, name.length * fontSize * 0.92 + 40);
        const x = width / 2;
        return `<svg class="piano-name-svg" viewBox="0 0 ${width} 130" aria-label="${name}" role="img">
            <g font-family="'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', sans-serif" font-weight="900" text-anchor="middle">
                <text x="${x}" y="98" font-size="${fontSize}" stroke="#2d3436" stroke-width="12" stroke-linejoin="round" fill="none">${name}</text>
                <text x="${x}" y="98" font-size="${fontSize}" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" fill="${color}">${name}</text>
                <text x="${x}" y="96" font-size="${fontSize}" fill="url(#piano-gloss)">${name}</text>
            </g>
        </svg>`;
    },
};

document.getElementById('pianoNames').addEventListener('click', () => TamaPiano.toggleNames());
document.getElementById('pianoWidth').addEventListener('input', event => TamaPiano.setKeyWidth(Number(event.target.value)));

// 画面の むき・大きさが かわったら、けんばんの数を つくりなおす
window.addEventListener('resize', () => {
    if (document.getElementById('pianoScreen').style.display === 'block') {
        TamaPiano.render();
    }
});
