// おんがくのへや（#/music）
//   ためしているあいだは、設定（歯車）の入力欄に「/music on」と入れたときだけ、
//   さいしょの画面に「おんがくのへや」のボタンが出る（「/music off」で かくす）
//   へやの中：けんばん（#/keys）・おんぷよみ と リズム（じゅんびちゅう）・おとを けす

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
