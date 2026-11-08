// きょくノート（おんぷよみ マスタークラス）：ひいた 曲に 名前を つけて のこし、あとで きける。系統を あつめる 図鑑つき
//   のこすのは、ひきおわった 画面の「ノートに のこす」を おした 曲だけ（新しい ほうから MAX 曲まで）
//   のこす もの：曲調・リズム・8小節（音・和音・リズム・サビ）・ひいた きろく（時刻・まちがえた 音）・えんそうの とくちょう。
//     きくときは「じぶんの えんそう」と 同じ（keysPlaySong。ゆれ・ため・かざりの 音・曲調の 伴奏）
//   曲名は 自動で つける（系統の「ばめん」× はやさの「曲の しゅるい」）。RENAME が true なら「ほかの なまえ」で かえられる
//     （ノブ：false に すると 自動の 名前の まま かえられない）
//   図鑑：とおし えんそうを ひきおわって「べつの 曲」「えんそうを おわる」で ドロップを もらった 系統を あつめる。
//     はじめての 系統の ときは ごほうびの ドロップが 金（js/engines/keys.js の keysPerformFinish）
//   ひらきかた：おんぷよみの レベルを えらぶ 画面の「📖 きょくノート」
//   セーブファイル（歯車）にも 入る。「いまのデータに たして よみこむ」では、曲も ずかんも 入れかえずに あわせる（mergeSongs・mergeFamilies）

const TamaSongNote = {
    KEY: 'tamadoro.notes.songbook',     // のこした 曲（新しい じゅん）
    FAMILY_KEY: 'tamadoro.notes.families', // 図鑑に のった 系統
    MAX: 50,
    RENAME: true, // ノブ：曲名を「ほかの なまえ」で かえられるか
    ID: 'songNote',

    // 系統ごとの ばめん（曲名の 前の ほう）
    SCENES: {
        classic: ['おしろの', 'ぶとうかいの', 'もりの こびとの', 'ほしぞらの'],
        pops: ['あおぞらの', 'はれの日の', 'にじの', 'あしたへの'],
        minor: ['あめの日の', 'たそがれの', 'ふるい おしろの', 'つきよの'],
        sus4: ['ふうせんの', 'くもの うえの', 'しゃぼんだまの', 'そよかぜの'],
        jazz: ['よるの まちの', 'カフェの', 'ほしぞらの', 'まよなかの'],
        modern: ['とかいの', 'ネオンの', 'よるの ドライブの', 'ガラスの'],
        borrowed: ['おもいでの', 'てがみの', 'ゆうやけの', 'さよならの'],
        church: ['あさの いのりの', 'かねの', 'ステンドグラスの', 'しずかな もりの'],
        blues: ['まちかどの', 'ゆうぐれの', 'ふるい ラジオの', 'ねこの せなかの'],
        rock: ['いなずまの', 'はしれ はしれの', 'ほのおの', 'ギターの'],
        bossa: ['なみうちぎわの', 'ひるさがりの', 'ヤシの きの', 'うみかぜの'],
        game: ['ぼうけんの', 'ダンジョンの', 'まおうの しろの', 'ドットの もりの'],
        nihon: ['さくらの', 'おまつりの', 'おつきみの', 'ちょうちんの'],
        okinawa: ['さんごの うみの', 'シーサーの', 'さとうきびの', 'あおい うみの'],
        doyo: ['こみちの', 'はらっぱの', 'どんぐりの', 'ひだまりの'],
    },
    // えんそうの はやさ ごとの 曲の しゅるい（曲名の うしろの ほう）
    PIECES: {
        yuttari: ['バラード', 'こもりうた', 'ノクターン', 'ゆめ'],
        choudo: ['うた', 'さんぽ', 'セレナーデ', 'メロディ'],
        ikiiki: ['マーチ', 'ダンス', 'ロンド', 'パレード'],
    },

    // ---------- データ ----------

    list() {
        const list = TamaStore.readJSON(this.KEY, []);
        return Array.isArray(list) ? list : [];
    },

    write(list) {
        TamaStore.writeJSON(this.KEY, list.slice(0, this.MAX));
    },

    // ひきおわった 曲を のこす（run：keysLesson.run）。かえすのは のこした もの
    save(run) {
        const song = run.song;
        const { traits } = TamaSongs.expressive(song.phrases, run.take, 60 / TamaSongs.RHYTHMS[song.rhythm].tempo);
        const now = new Date();
        const entry = {
            id: `${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
            date: `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`,
            style: song.style.id,
            rhythm: song.rhythm,
            phrases: song.phrases.map(p => ({ notes: p.notes, chord: p.chord, rhythm: p.rhythm, sabi: p.sabi || null })),
            take: run.take.map(t => ({ t: Math.round(t.t), wrongs: t.wrongs })),
            pace: traits.pace,
            words: TamaSongs.traitWords(traits),
            seed: 0,
        };
        this.write([entry, ...this.list()]);
        return entry;
    },

    find(id) {
        return this.list().find(entry => entry.id === id) || null;
    },

    remove(id) {
        this.write(this.list().filter(entry => entry.id !== id));
    },

    // 「ほかの なまえ」：つぎの 名前の こうほへ
    rename(id) {
        if (!this.RENAME) return;
        const list = this.list();
        const entry = list.find(e => e.id === id);
        if (!entry) return;
        entry.seed = (entry.seed || 0) + 1;
        this.write(list);
    },

    styleOf(entry) {
        return TamaSongs.STYLES.find(s => s.id === entry.style) || null;
    },

    // ---------- 曲名 ----------

    // 名前の こうほ（その 曲で きまった ならび。seed ばんめを つかう）
    names(entry) {
        const style = this.styleOf(entry);
        const scenes = this.SCENES[style ? style.family : 'pops'] || this.SCENES.pops;
        const pieces = this.PIECES[entry.pace] || this.PIECES.choudo;
        const names = [];
        scenes.forEach(scene => pieces.forEach(piece => {
            names.push(`タマの ${scene} ${piece}`);
            names.push(`${scene} ${piece}`);
        }));
        // その 曲の id で まぜる（曲ごとに ちがう じゅん。なんど よんでも 同じ）
        let seed = 0;
        for (const ch of String(entry.id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        for (let i = names.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [names[i], names[j]] = [names[j], names[i]];
        }
        return names;
    },

    nameOf(entry) {
        const names = this.names(entry);
        return names[(entry.seed || 0) % names.length];
    },

    // ---------- 図鑑 ----------

    families() {
        const list = TamaStore.readJSON(this.FAMILY_KEY, []);
        return Array.isArray(list) ? list : [];
    },

    // 図鑑に のせる。はじめての 系統なら true
    addFamily(family) {
        const list = this.families();
        if (list.includes(family)) return false;
        TamaStore.writeJSON(this.FAMILY_KEY, [...list, family]);
        return true;
    },

    // 図鑑に ならべる 系統（おやすみ中の 系統は、あつめた ときだけ）
    zukanFamilies() {
        const got = this.families();
        return Object.entries(TamaSongs.FAMILIES).filter(([id, family]) => family.weight > 0 || got.includes(id));
    },

    // ---------- 画面 ----------

    open() {
        this.close();
        const overlay = document.createElement('div');
        overlay.id = this.ID;
        overlay.className = 'song-picker-overlay';
        overlay.innerHTML = `<div class="song-picker song-note" role="dialog" aria-label="きょくノート">${this.html()}</div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) this.close();
        });
        overlay.querySelector('.song-note').addEventListener('click', event => this.onClick(event));
    },

    close() {
        const overlay = document.getElementById(this.ID);
        if (!overlay) return;
        if (this.playing) keysStopPlayback();
        overlay.remove();
    },

    refresh() {
        const box = document.querySelector(`#${this.ID} .song-note`);
        if (box) box.innerHTML = this.html();
    },

    html() {
        const got = this.families();
        const zukan = this.zukanFamilies();
        const count = zukan.filter(([id]) => got.includes(id)).length;
        const cards = zukan.map(([id, family]) => (got.includes(id)
            ? `<div class="zukan-card on" data-family="${id}"><span>${family.name}</span></div>`
            : '<div class="zukan-card"><span>？？？</span></div>'));
        const songs = this.list().map(entry => {
            const style = this.styleOf(entry);
            const rhythm = TamaSongs.RHYTHMS[entry.rhythm];
            const playing = this.playing === entry.id;
            const confirm = this.confirming === entry.id;
            return `<div class="note-song${playing ? ' playing' : ''}" data-id="${entry.id}">
                <div class="note-song-name">${this.nameOf(entry)}</div>
                <div class="note-song-info">${style ? `${style.name}（${style.sub}）` : ''}${rhythm ? `・${rhythm.name}` : ''}　${entry.date}</div>
                <div class="note-song-words">${(entry.words || []).join('・')}</div>
                <div class="note-song-buttons">
                    <button type="button" class="note-play" data-play="${entry.id}">${playing ? '■ とめる' : '▶ きく'}</button>
                    ${this.RENAME ? `<button type="button" data-rename="${entry.id}">ほかの なまえ</button>` : ''}
                    <button type="button" class="note-remove${confirm ? ' sure' : ''}" data-remove="${entry.id}">${confirm ? 'ほんとうに けす？' : 'けす'}</button>
                </div>
            </div>`;
        });
        return `<h2>📖 タマの きょくノート</h2>
            <h3>きょくふう ずかん　${count} / ${zukan.length}</h3>
            <p class="song-picker-note">マスタークラスで さいごまで ひいた きょくふうが のるよ。はじめての きょくふうは きんの ドロップ！</p>
            <div class="zukan">${cards.join('')}</div>
            <h3>のこした きょく（${songs.length}きょく）</h3>
            ${songs.length ? `<div class="note-songs">${songs.join('')}</div>`
                : '<p class="song-picker-note">まだ ないよ。マスタークラスで ひきおわったら「ノートに のこす」を おしてね。</p>'}
            <div class="song-picker-buttons"><button type="button" data-close>とじる</button></div>`;
    },

    onClick(event) {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.remove !== undefined) {
            const id = button.dataset.remove;
            if (this.confirming === id) {
                if (this.playing === id) keysStopPlayback();
                this.remove(id);
                this.confirming = null;
            } else {
                this.confirming = id; // 1かいめは「ほんとうに けす？」
            }
            this.refresh();
            return;
        }
        this.confirming = null;
        if (button.dataset.play !== undefined) {
            this.play(button.dataset.play);
            return;
        }
        if (button.dataset.rename !== undefined) {
            this.rename(button.dataset.rename);
            this.refresh();
            return;
        }
        if (button.hasAttribute('data-close')) this.close();
    },

    // ▶ きく（ながれている 曲を もういちど おすと とまる）
    play(id) {
        if (this.playing === id) {
            keysStopPlayback();
            return;
        }
        const entry = this.find(id);
        const style = entry && this.styleOf(entry);
        if (!style) return;
        const song = { style, rhythm: entry.rhythm, phrases: entry.phrases };
        keysPlaySong(song, entry.take, {
            onEnd: () => {
                if (this.playing === id) this.playing = null;
                this.refresh();
            },
        });
        this.playing = id;
        this.refresh();
    },

    playing: null,    // いま ながしている 曲の id
    confirming: null, // 「ほんとうに けす？」の 曲の id

    // ---------- 「いまのデータに たして よみこむ」で あわせる（js/data-modal.js） ----------

    // 曲：両方の 曲を のこす（同じ 曲は 1つ。ファイルの ほうを つかう）。新しい じゅんに ならべて MAX 曲まで
    mergeSongs(now, file) {
        const parse = text => {
            try {
                const list = JSON.parse(text);
                return Array.isArray(list) ? list : [];
            } catch (error) {
                return [];
            }
        };
        const byId = new Map();
        [...parse(now), ...parse(file)].forEach(entry => { if (entry && entry.id) byId.set(entry.id, entry); });
        const time = entry => parseInt(String(entry.id), 10) || 0; // id の はじめは のこした 時刻
        return JSON.stringify([...byId.values()].sort((a, b) => time(b) - time(a)).slice(0, this.MAX));
    },

    // ずかん：両方の 系統を あわせる
    mergeFamilies(now, file) {
        const parse = text => {
            try {
                const list = JSON.parse(text);
                return Array.isArray(list) ? list : [];
            } catch (error) {
                return [];
            }
        };
        return JSON.stringify([...new Set([...parse(now), ...parse(file)])]);
    },
};

TamaStore.MERGERS[TamaSongNote.KEY] = (now, file) => TamaSongNote.mergeSongs(now, file);
TamaStore.MERGERS[TamaSongNote.FAMILY_KEY] = (now, file) => TamaSongNote.mergeFamilies(now, file);
