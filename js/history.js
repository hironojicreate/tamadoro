// プレイの記録
//   tamadoro.log.v1    1回あそぶごとの記録（いつ・どのレベル・かかった時間・まちがい・もらったドロップ）
//   tamadoro.stats.v1  1問ごとのできぐあい（モードごと・問題ごとに、回数・まちがい・かかった時間の合計）
// ドロップの保存（add_coins_3 など）は今までどおり。こちらは「きろく」画面のための記録

const History = {
    // 1問にこれより長くかかったときは「無効」（トイレに行った・ドロップで遊んでいた など）
    //   その問題は、にがての記録に入れない。その回のタイムも、タイムのうつりかわり・さいこうに入れない
    INVALID_MS: 30000,

    LOG_KEY: 'tamadoro.log.v1',
    STATS_KEY: 'tamadoro.stats.v1',
    SCHEMA_KEY: 'tamadoro.schema',

    // ---------- 1回ごとの記録 ----------

    // [{ t, mode, level, ms, total, miss, cleared, drop, paused }, ...]（古い順）
    //   t: 終わった時刻（ミリ秒）、drop: もらったドロップの画像名（もらえなかったら null）
    //   paused: true は、とちゅうで手をとめた（INVALID_MS より長くかかった問題があった）回
    //   imported: true は、記録をはじめる前のドロップ（日付はだいたい・時間なし）
    getLog() {
        return TamaStore.readJSON(this.LOG_KEY, []);
    },

    addEntry(entry) {
        const log = this.getLog();
        log.push({ t: Date.now(), ...entry });
        TamaStore.writeJSON(this.LOG_KEY, log);
    },


    // ---------- 1問ごとのできぐあい ----------

    // 素早く正解したとみなす基準（ミリ秒）：3.5秒以内ならHPが減る、4.5秒以上なら隠れ苦手としてHPが少し増える
    FAST_MS: 3500,
    SLOW_MS: 4500,

    // { add: { '7+6': { n: 回数, miss: まちがえた回数, ms: かかった時間の合計, hp: 苦手HP }, ... }, ... }
    getStats(modeId) {
        return TamaStore.readJSON(this.STATS_KEY, {})[modeId] || {};
    },

    // その問題の「苦手HP（0なら克服済み、1以上なら苦手）」を返す
    getWeakScore(modeId, key) {
        const stat = this.getStats(modeId)[key];
        if (!stat) return 0;
        // すでにhpが記録されていればそれを使う（なければ過去のmissと平均時間から初期HPを算出）
        if (typeof stat.hp === 'number') {
            return stat.hp;
        }
        const avgMs = stat.n > 0 ? stat.ms / stat.n : 0;
        const slowBonus = (stat.n >= 2 && avgMs >= this.SLOW_MS) ? 4 : 0;
        return Math.min(30, stat.miss * 10 + slowBonus);
    },

    recordProblem(modeId, key, ok, ms) {
        if (ms > this.INVALID_MS) {
            return; // 無効（にがてには入れない）
        }
        const stats = TamaStore.readJSON(this.STATS_KEY, {});
        const modeStats = stats[modeId] || (stats[modeId] = {});
        const stat = modeStats[key] || (modeStats[key] = { n: 0, miss: 0, ms: 0, hp: 0 });

        // 既存データにhpがまだ無い場合は初期値をセット
        if (typeof stat.hp !== 'number') {
            const avgMs = stat.n > 0 ? stat.ms / stat.n : 0;
            stat.hp = Math.min(30, stat.miss * 10 + ((stat.n >= 2 && avgMs >= this.SLOW_MS) ? 4 : 0));
        }

        stat.n += 1;
        stat.ms += ms;

        if (!ok) {
            stat.miss += 1;
            stat.hp = Math.min(30, stat.hp + 10); // まちがえたらHP+10（最大30）
        } else if (ms >= this.SLOW_MS) {
            stat.hp = Math.min(30, stat.hp + 3);  // 正解でも時間がかかったら隠れ苦手としてHP+3
        } else if (ms <= this.FAST_MS && stat.hp > 0) {
            stat.hp = Math.max(0, stat.hp - 2);   // 通常プレイでも即答できたら少しずつHPを減らす
        }

        TamaStore.writeJSON(this.STATS_KEY, stats);
    },

    // にがてちょうせんモードの「2段階卒業」判定：
    //   1回の挑戦で3回ともノーミス＆平均3.5秒以内ならHPを1段階（最大10）削る
    //   大苦手（HP11以上）なら1回では0にならず「あとすこし（HP6）」になり、次回の挑戦で0（完全克服）になる！
    graduateWeakProblem(modeId, key) {
        const stats = TamaStore.readJSON(this.STATS_KEY, {});
        const stat = stats[modeId] && stats[modeId][key];
        if (!stat) return;

        if (stat.hp > 10) {
            stat.hp = 6; // 第1段階クリア！（次回もう1回クリアで卒業）
        } else {
            stat.hp = 0; // 完全卒業！
        }
        TamaStore.writeJSON(this.STATS_KEY, stats);
    },

    recordProblem(modeId, key, ok, ms) {
        if (ms > this.INVALID_MS) {
            return; // 無効（にがてには入れない）
        }
        const stats = TamaStore.readJSON(this.STATS_KEY, {});
        const modeStats = stats[modeId] || (stats[modeId] = {});
        const stat = modeStats[key] || (modeStats[key] = { n: 0, miss: 0, ms: 0 });
        stat.n += 1;
        if (!ok) {
            stat.miss += 1;
        }
        stat.ms += ms;
        TamaStore.writeJSON(this.STATS_KEY, stats);
    },

    // /delete：そのモードの記録を消す
    removeMode(modeId) {
        TamaStore.writeJSON(this.LOG_KEY, this.getLog().filter(entry => entry.mode !== modeId));
        const stats = TamaStore.readJSON(this.STATS_KEY, {});
        delete stats[modeId];
        TamaStore.writeJSON(this.STATS_KEY, stats);
    },

    // ---------- 記録をはじめる前のドロップを取りこむ（はじめて開いたときに1回だけ） ----------

    migrate() {
        if (localStorage.getItem(this.SCHEMA_KEY)) {
            return;
        }
        const imported = [];
        Object.values(MODES).forEach(mode => {
            for (let level = 1; level <= mode.levels.length; level++) {
                const coins = TamaStore.readJSON(`${mode.storagePrefix}_coins_${level}`, []);
                coins.forEach(coin => {
                    if (coin && coin.image) {
                        imported.push({ t: this.guessTime(coin.date), mode: mode.id, level, drop: coin.image, imported: true });
                    }
                });
            }
        });
        // 日付がわかるものは古い順、わからないもの（rescue で復元したドロップなど）は前に
        imported.sort((a, b) => (a.t || 0) - (b.t || 0));
        TamaStore.writeJSON(this.LOG_KEY, [...imported, ...this.getLog()]);
        localStorage.setItem(this.SCHEMA_KEY, '1');
    },

    // 「10/31」のような日付（年なし）→ いちばん近い過去のその日のお昼
    guessTime(date) {
        const match = /^(\d{1,2})\/(\d{1,2})$/.exec(date || '');
        if (!match) {
            return null;
        }
        const now = new Date();
        const guess = new Date(now.getFullYear(), Number(match[1]) - 1, Number(match[2]), 12);
        if (guess > now) {
            guess.setFullYear(guess.getFullYear() - 1);
        }
        return guess.getTime();
    },
};
