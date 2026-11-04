// 画面のけんばん（おんがくの画面で使う部品）
//   さわった しゅんかん（pointerdown）に 音を鳴らす。何本の指でも おせる
//
//   const kb = new TamaKeyboard(要素, { onPress(midi, inRange) {...}, glide: true })
//   kb.render({ from, to, activeFrom, activeTo, label(midi) })
//     from〜to       見せる けんばん（白いけんばんで はじまり、白いけんばんで おわる）
//     activeFrom〜To あかるく見せる けんばん（そのレベルで使う けんばん）。そとがわは うすく見せる（おせば鳴る）
//     label(midi)    けんばんに 名前を書くか
//   kb.mark(midi, 'ok' | 'ng')   正解・まちがいの 色を一瞬つける
//   kb.balloon(midi, 'ミ')       けんばんの上に ふきだし
//   kb.vanishLabels([60, 67])    名前が まほうで きえる
//   kb.guide(60, '→')           その けんばんを 光らせて 矢印（くろいけんばんの ♯・♭）。kb.clearGuide() で けす

class TamaKeyboard {
    constructor(container, { onPress = () => {}, glide = false } = {}) {
        this.container = container;
        this.onPress = onPress;
        this.glide = glide;          // 指を すべらせると となりの けんばんも鳴る（おとあそび）
        this.keys = new Map();       // midi → 要素
        this.pointers = new Map();   // pointerId → { midi, voice }
        this.range = null;

        container.classList.add('tk');
        container.addEventListener('pointerdown', event => this.down(event));
        container.addEventListener('pointermove', event => this.move(event));
        ['pointerup', 'pointercancel'].forEach(type => {
            window.addEventListener(type, event => this.up(event));
        });
        // 長おしで メニューが出たり、文字がえらばれたり しないように
        container.addEventListener('contextmenu', event => event.preventDefault());
    }

    render({ from, to, activeFrom = from, activeTo = to, label = () => false }) {
        this.releaseAll();
        this.range = { from, to, activeFrom, activeTo };
        this.container.innerHTML = '';
        this.keys.clear();

        const whites = TamaNotes.whiteKeys(from, to);
        const whiteWidth = 100 / whites.length;
        this.container.style.setProperty('--tk-white', `${whiteWidth}%`);

        whites.forEach((midi, i) => {
            const key = this.makeKey(midi, 'tk-white-key');
            key.style.left = `${i * whiteWidth}%`;
            key.style.width = `${whiteWidth}%`;
            if (label(midi)) {
                const text = document.createElement('span');
                text.className = 'tk-label';
                text.textContent = TamaNotes.NAMES[TamaNotes.stepOf(midi)];
                text.style.color = TamaNotes.color(midi);
                key.appendChild(text);
            }
        });

        // 黒いけんばんは、左の白いけんばんと 右の白いけんばんの さかいめに
        for (let midi = from + 1; midi < to; midi++) {
            if (!TamaNotes.isBlack(midi)) continue;
            const leftIndex = whites.indexOf(midi - 1);
            const key = this.makeKey(midi, 'tk-black-key');
            key.style.left = `${(leftIndex + 1) * whiteWidth - whiteWidth * 0.31}%`;
            key.style.width = `${whiteWidth * 0.62}%`;
        }
    }

    makeKey(midi, className) {
        const key = document.createElement('div');
        key.className = `tk-key ${className}`;
        key.dataset.midi = midi;
        if (!this.inRange(midi)) key.classList.add('tk-dim');
        this.container.appendChild(key);
        this.keys.set(midi, key);
        return key;
    }

    inRange(midi) {
        return !!this.range && midi >= this.range.activeFrom && midi <= this.range.activeTo;
    }

    keyAt(x, y) {
        const el = document.elementFromPoint(x, y);
        const key = el && el.closest ? el.closest('.tk-key') : null;
        return key && this.container.contains(key) ? Number(key.dataset.midi) : null;
    }

    // ---------- おす・はなす ----------

    down(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const key = event.target.closest('.tk-key');
        if (!key) return;
        event.preventDefault();
        this.start(event.pointerId, Number(key.dataset.midi));
    }

    start(pointerId, midi) {
        const voice = TamaSound.note(midi);
        this.pointers.set(pointerId, { midi, voice });
        const key = this.keys.get(midi);
        if (key) key.classList.add('tk-down');
        this.onPress(midi, this.inRange(midi));
    }

    move(event) {
        const held = this.pointers.get(event.pointerId);
        if (!held || !this.glide) return;
        const midi = this.keyAt(event.clientX, event.clientY);
        if (midi === null || midi === held.midi) return;
        this.stop(event.pointerId);
        this.start(event.pointerId, midi);
    }

    up(event) {
        this.stop(event.pointerId);
    }

    stop(pointerId) {
        const held = this.pointers.get(pointerId);
        if (!held) return;
        held.voice.release();
        this.pointers.delete(pointerId);
        // ほかの指が まだ おしていなければ、へこみを もどす
        const stillDown = [...this.pointers.values()].some(p => p.midi === held.midi);
        const key = this.keys.get(held.midi);
        if (key && !stillDown) key.classList.remove('tk-down');
    }

    releaseAll() {
        [...this.pointers.keys()].forEach(id => this.stop(id));
    }

    // ---------- 見た目 ----------

    mark(midi, kind, ms = 450) {
        const key = this.keys.get(midi);
        if (!key) return;
        const className = `tk-${kind}`;
        key.classList.remove(className);
        void key.offsetWidth; // アニメーションを はじめから
        key.classList.add(className);
        setTimeout(() => key.classList.remove(className), ms);
    }

    balloon(midi, text, { color = TamaNotes.color(midi), ms = 1100 } = {}) {
        const key = this.keys.get(midi);
        if (!key) return;
        this.container.querySelectorAll(`.tk-balloon[data-midi="${midi}"]`).forEach(b => b.remove());
        const balloon = document.createElement('div');
        balloon.className = 'tk-balloon';
        balloon.dataset.midi = midi;
        balloon.textContent = text;
        balloon.style.color = color;
        // けんばんの まんなかの上に（画面のはしでは、はみださないように よせる）
        const center = parseFloat(key.style.left) + parseFloat(key.style.width) / 2;
        balloon.style.left = `${Math.min(92, Math.max(8, center))}%`;
        this.container.appendChild(balloon);
        setTimeout(() => balloon.remove(), ms);
    }

    guide(midi, arrow) {
        this.clearGuide();
        const key = this.keys.get(midi);
        if (!key) return;
        key.classList.add('tk-guide');
        const mark = document.createElement('span');
        mark.className = 'tk-arrow';
        mark.textContent = arrow;
        key.appendChild(mark);
    }

    clearGuide() {
        this.container.querySelectorAll('.tk-guide').forEach(key => key.classList.remove('tk-guide'));
        this.container.querySelectorAll('.tk-arrow').forEach(mark => mark.remove());
    }

    vanishLabels(midis) {
        midis.forEach((midi, i) => {
            const key = this.keys.get(midi);
            const label = key && key.querySelector('.tk-label');
            if (!label) return;
            setTimeout(() => {
                label.classList.add('tk-vanish');
                const sparkle = document.createElement('span');
                sparkle.className = 'tk-sparkle';
                sparkle.textContent = '✨';
                key.appendChild(sparkle);
                setTimeout(() => { label.remove(); sparkle.remove(); }, 1000);
            }, i * 350);
        });
    }
}
