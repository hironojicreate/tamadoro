// きょくふうを えらぶ（おんぷよみ Lv9 きょくふう。おとなが ためすとき用）
//   設定の 入力欄に /song だけ 入れて Enter で ひらく。
//   上に リズム（おまかせ・5つ）、下に 系統ごとの 曲調の ボタン（系統の「ぜんぶ」は その 系統から おまかせ）。
//   リズムの ボタンは えらぶだけ（ひらいた まま）。曲調を えらぶと きまって とじる。
//   きょくふう（Lv9）を あそんでいる ときは、えらんだ 曲で はじめから やりなおす。
//   えらんだ ものは おぼえておく（TamaSongs.force・forceRhythm。/song off⏎・/rhythm off⏎ でも もどせる）

const TamaSongPicker = {
    ID: 'songPicker',

    // いま きょくふう（Lv9）の 画面に いるか
    inSongLevel() {
        return typeof keysLesson !== 'undefined' && keysLesson.run && keysLesson.run.def.style === 'song'
            && document.getElementById('keysScreen').style.display !== 'none';
    },

    open() {
        this.close();
        const overlay = document.createElement('div');
        overlay.id = this.ID;
        overlay.className = 'song-picker-overlay';
        overlay.innerHTML = `<div class="song-picker" role="dialog" aria-label="きょくふうを えらぶ">${this.html()}</div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) this.close();
        });
        overlay.querySelector('.song-picker').addEventListener('click', event => this.onClick(event));
    },

    close() {
        const overlay = document.getElementById(this.ID);
        if (overlay) overlay.remove();
    },

    html() {
        const S = TamaSongs;
        const song = S.forced();
        const rhythm = S.forcedRhythm();
        const on = flag => (flag ? ' on' : '');
        const rhythms = [`<button type="button" class="song-chip${on(!rhythm)}" data-rhythm="off">おまかせ<small>曲調に あう リズム</small></button>`]
            .concat(Object.entries(S.RHYTHMS).map(([id, r]) =>
                `<button type="button" class="song-chip${on(rhythm === id)}" data-rhythm="${id}">${r.name}<small>${r.bars}</small></button>`));
        const families = Object.entries(S.FAMILIES).map(([id, family]) => {
            const styles = S.STYLES.filter(style => style.family === id).map(style =>
                `<button type="button" class="song-chip${on(song === style.id)}" data-song="${style.id}">${style.sub}<small>${style.chords.join(' ')}</small></button>`);
            return `<div class="song-family">
                <div class="song-family-name">${family.name}
                    <button type="button" class="song-chip mini${on(song === id)}" data-song="${id}">ぜんぶ</button></div>
                <div class="song-chips">${styles.join('')}</div>
            </div>`;
        });
        const total = S.STYLES.reduce((sum, style) => sum + S.FAMILIES[style.family].rhythms.length, 0);
        return `<h2>きょくふうを えらぶ（おんぷよみ Lv9）</h2>
            <p class="song-picker-note">曲調 ${S.STYLES.length}こ（${Object.keys(S.FAMILIES).length}系統）× リズム → ${total}とおり。
                ${this.inSongLevel() ? '曲調を えらぶと、その 曲で Lv9 を はじめから やりなおします。' : 'えらぶと、つぎに Lv9 を あそぶ ときから その 曲に なります。'}</p>
            <h3>リズム</h3>
            <div class="song-chips">${rhythms.join('')}</div>
            <h3>曲調</h3>
            <div class="song-chips"><button type="button" class="song-chip${on(!song)}" data-song="off">おまかせ<small>ノブの わりあいで</small></button></div>
            ${families.join('')}
            <div class="song-picker-buttons"><button type="button" data-close>とじる</button></div>`;
    },

    onClick(event) {
        const button = event.target.closest('button');
        if (!button) return;
        const S = TamaSongs;
        if (button.dataset.rhythm) {
            S.forceRhythm(button.dataset.rhythm);
            // えらんだ ところを 光らせなおす（ひらいた まま）
            button.parentElement.querySelectorAll('[data-rhythm]').forEach(chip => chip.classList.toggle('on', chip === button));
            return;
        }
        if (button.dataset.song) {
            const id = button.dataset.song;
            S.force(id);
            this.close();
            const style = S.STYLES.find(s => s.id === id);
            const rhythm = S.forcedRhythm();
            const name = id === 'off' ? 'おまかせ' : style ? `${style.name}（${style.sub}）` : `${S.FAMILIES[id].name}風`;
            showNotification(`きょくふうを「${name}」${rhythm ? `・「${S.RHYTHMS[rhythm].name}」` : ''}に しました。`);
            if (this.inSongLevel()) keysRetryLevel();
            return;
        }
        if (button.hasAttribute('data-close')) this.close();
    },
};
