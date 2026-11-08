// おんがくのへや（#/music）
//   ためしているあいだは、設定（歯車）の入力欄に「/music on」と入れたときだけ、
//   さいしょの画面に「おんがくのへや」のボタンが出る（「/music off」で かくす）
//   ひみつの しかけ（じっきで ためしやすく）：さいしょの画面で
//     パソコン：Shift キーを おしながら「ひきざん」を 5かい クリック
//     タブレット：「たしざん」を おさえた まま、べつの 指で「ひきざん」を 5かい タップ
//   で 出る。出ている ときに 同じ ことを すると かくれる（TamaMusicSecret）
//   へやの中：けんばん（#/keys）・くろいけんばん（#/black。けんばんの Lv6 を クリアすると ひらく）・
//             じゆうにひこう（#/piano）・おんぷよみ（#/notes）・リズム（#/rhythm）・おとを けす

const TamaMusic = {
    KEY: 'tamadoro.music.enabled',

    enabled() {
        return TamaStore.readJSON(this.KEY, false) === true;
    },

    setEnabled(on) {
        TamaStore.writeJSON(this.KEY, !!on);
        this.applyHome();
    },

    // さいしょの画面の「おんがくのへや」ボタンを 出す・かくす
    applyHome() {
        const button = document.getElementById('homeMusic');
        if (button) {
            button.style.display = this.enabled() ? '' : 'none';
        }
    },

    // へやの「おと」ボタンの表示
    renderSoundButton() {
        const button = document.getElementById('musicSound');
        if (!button) return;
        const muted = TamaSound.muted;
        button.textContent = muted ? '🔇 おと なし' : '🔊 おと あり';
        button.classList.toggle('off', muted);
        button.setAttribute('aria-pressed', muted ? 'true' : 'false');
    },

    // まだ ひらいていない レッスン（くろいけんばん）は、カギを かけて見せる
    renderLocks() {
        const button = document.getElementById('musicBlack');
        if (button) button.classList.toggle('locked', MODES.black.locked());
    },

    openBlack() {
        if (MODES.black.locked()) {
            showNotification(MODES.black.lockedMessage);
            return;
        }
        location.hash = '#/black';
    },

    toggleSound() {
        TamaSound.setMuted(!TamaSound.muted);
        this.renderSoundButton();
        if (!TamaSound.muted) {
            TamaSound.note(72, { gain: 0.3 }).release(); // 鳴るようになったことが わかるように「ド」
        }
    },
};

document.getElementById('musicSound').addEventListener('click', () => TamaMusic.toggleSound());
TamaMusic.applyHome();

// ひみつの しかけ：さいしょの画面で「おんがくのへや」を 出す・かくす（おとなが じっきで ためすとき）
//   パソコン：Shift を おしながら「ひきざん」を 5かい クリック
//   タブレット：「たしざん」を おさえた まま、べつの 指で「ひきざん」を 5かい タップ
//   1かいごとに GAP ミリびょう いないで つづけて おしたときだけ かぞえる。しかけの 操作では 画面は うつらない
const TamaMusicSecret = {
    COUNT: 5,
    GAP: 3000,
    taps: 0,
    last: 0,
    holdPointer: null,  // 「たしざん」を おさえている 指（pointerId）
    used: false,        // おさえている あいだに「ひきざん」を タップした（はなしても たしざんに うつらない）
    silence: 0,         // この 時刻までの クリックは とめる（タップの あとに ブラウザが 出す クリック）

    tap() {
        const now = Date.now();
        this.taps = now - this.last <= this.GAP ? this.taps + 1 : 1;
        this.last = now;
        if (this.taps < this.COUNT) return;
        this.taps = 0;
        const on = !TamaMusic.enabled();
        TamaMusic.setEnabled(on);
        showNotification(on ? 'おんがくのへやを ONにしました。' : 'おんがくのへやを OFFにしました。');
    },

    init() {
        const add = document.getElementById('homeAdd');
        const sub = document.getElementById('homeSub');
        if (!add || !sub) return;
        // タブレット：たしざんを おさえる
        add.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse') return;
            this.holdPointer = event.pointerId;
            this.used = false;
        });
        window.addEventListener('pointerup', event => this.letGo(event), true);
        window.addEventListener('pointercancel', event => this.letGo(event), true);
        // おさえている あいだの「ひきざん」の タップ（クリックは 出ない ことが あるので、ふれた ときに かぞえる）
        sub.addEventListener('pointerdown', event => {
            if (this.holdPointer === null || event.pointerType === 'mouse') return;
            this.used = true;
            this.silence = Date.now() + 800;
            this.tap();
        });
        // クリックは さきに うけとって、しかけの ときは 画面を うつらない（ボタンの onclick より まえ）
        document.addEventListener('click', event => {
            const onSub = event.target.closest && event.target.closest('#homeSub');
            const onAdd = event.target.closest && event.target.closest('#homeAdd');
            if (!onSub && !onAdd) return;
            const stop = () => { event.stopPropagation(); event.preventDefault(); };
            if (onSub && event.shiftKey) { stop(); this.tap(); return; } // パソコン：Shift ＋ クリック
            if (Date.now() < this.silence || (onAdd && this.used)) { stop(); this.used = onAdd ? false : this.used; }
        }, true);
    },

    letGo(event) {
        if (event.pointerId !== this.holdPointer) return;
        this.holdPointer = null;
        if (this.used) this.silence = Date.now() + 800; // はなした あとの たしざんの クリックも とめる
    },
};

TamaMusicSecret.init();
