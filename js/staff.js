// 五線（ト音記号）と 音符の絵（おんぷよみ）
//   TamaStaff.svg([60, 62, 64], { current: 1 })  → 五線に 音符を ならべた SVG（文字列）
//   音符は 白いけんばん（ド〜シ）だけ。下第2線の ひくいラ から、上第1線の ラ くらいまで
//   current：いま 読む音符（ピンクに 光る）。それより前の 音符は 読みおわり（みどり）
//   おんぷの しくみ（おんぷよみの さいしょの レベル）で 使う もの：
//     reveal：まだ 読まない 音符は かくしておく（1つずつ あらわれる）
//     tags：音符の 下に「せん」「あいだ」の ふだ
//     focusLedger：ドの みじかい せん（加線）を 光らせる
//     countLines：五線の せんを 下から かぞえる（タッチできる。counted 本めまで 光って 番号が 出る。
//                 まだ 1本も かぞえていない ときは、1ぽんめが やさしく 点滅して「おしてね」）
//   正解した 音符は、class に sparkle を つけると キラリンと 光る（★ が はじける）
//   chordName：五線の 上に コード名（おんぷよみ Lv9 きょくふう の れんしゅう）
//   rhythm：'●●●○' のように わたすと、4/4拍子の 1小節（拍子記号・4ぶきゅうふ・おわりの 小節線）。
//     ● に 音符、○ に 4ぶきゅうふ。きゅうふは data-r（0から）。音符の data-i は 音符だけで かぞえる
//   TamaStaff.score(phrases, { perRow })：きょくふう メロディ（Lv9）の ぜんぶの がくふ（4/4拍子）。
//     1だんに perRow 小節。1だんめの はじめに 4/4、小節の 上に コード名、小節の おわりに 小節線。
//     音符の data-i・きゅうふの data-r は 曲の はじめから
//   おだんご（おんぷよみ Lv1・Lv2）：
//     dango：音符を 1本の くしに さした おだんご に する。下から じゅんばんに 読む
//            おだんごの 色は 音の 色（けんばんの 名前の 色を あわく）。ドミソ と レファラ は べつの 色、
//            シは むらさき、たかいドは ドと 同じ 色
//     names：おだんごの よこに 音の 名前（さいしょの お手本）

const TamaStaff = {
    GAP: 20,           // 線と線の あいだ
    TOP: 100,          // いちばん上の 線（ファ）の 高さ
    LEFT: 124,         // 1こめの 音符の x（左は ト音記号）
    STEP_X: 64,        // 音符と 音符の あいだ

    // 白いけんばん → 五線の上の 高さ（y）。いちばん下の線（ミ）が TOP + 4 * GAP
    y(midi) {
        const step = TamaNotes.stepOf(midi);
        const octave = Math.floor(midi / 12) - 1;
        const index = octave * 7 + step;           // ド4 = 28、ミ4 = 30
        return this.TOP + 4 * this.GAP - (index - 30) * (this.GAP / 2);
    },

    // 五線の 外に はみだす 音符の、みじかい線（加線）の 高さ
    ledgers(y) {
        const bottom = this.TOP + 4 * this.GAP;
        const lines = [];
        for (let ly = bottom + this.GAP; ly <= y; ly += this.GAP) lines.push(ly);
        for (let ly = this.TOP - this.GAP; ly >= y; ly -= this.GAP) lines.push(ly);
        return lines;
    },

    // 1ぽんめ・2ほんめ・3ぼんめ・4ほんめ・5ほんめ（下から）
    LINE_COUNTS: ['1ぽんめ', '2ほんめ', '3ぼんめ', '4ほんめ', '5ほんめ'],

    // せんの上の 音か（ド・ミ・ソ・シ・たかいレ …）。そうでなければ せんの あいだ（レは ドの みじかい せんと 1ばん下の せんの あいだ）
    onLine(midi) {
        const step = TamaNotes.stepOf(midi);
        const octave = Math.floor(midi / 12) - 1;
        return (octave * 7 + step - 30) % 2 === 0;
    },

    // ト音記号（うずまきの まんなかが ソの線）
    clef() {
        const g = this.TOP + 3 * this.GAP; // ソの線
        return `<g class="staff-clef" transform="translate(0, ${g - 160})">
            <path d="M 52,160 C 40,158 38,144 50,139 C 64,134 78,146 75,162 C 72,182 46,190 33,176
                     C 20,161 28,140 44,126 C 58,113 72,99 71,78 C 70,62 58,56 52,70
                     C 47,84 49,110 53,138 L 61,198 C 63,214 51,222 41,215 C 33,209 37,197 47,199"
                  fill="none" stroke="#2d3436" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="45" cy="205" r="7" fill="#2d3436"/>
        </g>`;
    },

    // 4/4拍子の しるし（ト音記号の みぎ。上の 4 は 上の 2つの あいだ、下の 4 は 下の 2つの あいだ）
    TIME_W: 40, // 拍子記号の ぶん、音符を みぎへ
    timeSignature(x = this.LEFT - 18) {
        return `<g class="staff-time" aria-label="4ぶんの4びょうし">
            <text x="${x}" y="${this.TOP + 2 * this.GAP - 2}">4</text>
            <text x="${x}" y="${this.TOP + 4 * this.GAP - 2}">4</text>
        </g>`;
    },

    // 4ぶきゅうふ（ギザギザ。五線の まんなかあたり）。r：data-r
    rest(x, r) {
        const t = this.TOP;
        const d = `M ${x - 4},${t + 8} L ${x + 8},${t + 25} L ${x - 4},${t + 41} L ${x + 8},${t + 57}`
            + ` C ${x - 7},${t + 51} ${x - 10},${t + 64} ${x},${t + 72}`;
        return `<g class="staff-rest" data-r="${r}">
            <ellipse class="staff-glow" cx="${x + 2}" cy="${t + 40}" rx="22" ry="40"/>
            <path class="staff-rest-mark" d="${d}"/>
        </g>`;
    },

    // 1小節ぶんの 音符と きゅうふ（rhythm：'●●●○' など）。x0：1拍めの x、step：拍の あいだ
    //   first：さいしょの 音符の data-i、firstRest：さいしょの きゅうふの data-r、state(i)：音符の ようす
    bar(rhythm, notes, x0, step, { first = 0, firstRest = 0, state = () => 'next' } = {}) {
        const parts = [];
        let n = 0;
        let r = 0;
        rhythm.split('').forEach((mark, beat) => {
            const x = x0 + beat * step;
            if (mark === '●') {
                const i = first + n;
                parts.push(this.note(notes[n], x, i, state(i)));
                n++;
            } else {
                parts.push(this.rest(x, firstRest + r));
                r++;
            }
        });
        return parts.join('');
    },

    barLine(x, end = false) {
        return `<line class="staff-bar${end ? ' end' : ''}" x1="${x}" y1="${this.TOP}" x2="${x}" y2="${this.TOP + 4 * this.GAP}"/>`;
    },

    svg(notes, { current = 0, reveal = false, tags = false, focusLedger = false, countLines = null, dango = false, names = false, chordName = null, rhythm = null } = {}) {
        // 音符が ないとき（せんを かぞえる）は、音符 4こぶんの はば。おだんごは 1れつ（名前つきは すこし ひろく）
        //   rhythm が あるときは 4拍ぶん ＋ 拍子記号
        const longest = Math.max(0, ...notes.map(m => TamaNotes.lessonName(m).length));
        const first = this.LEFT + (rhythm ? this.TIME_W : 0); // 1こめ（1拍め）の x
        const width = dango
            ? this.LEFT + 56 + (names ? 14 + 18 * longest : 0) // 名前（「たかいファ」など）が はみださない はば
            : rhythm
                ? first + this.STEP_X * 3 + 56
                : this.LEFT + this.STEP_X * (notes.length ? notes.length - 1 : 3) + 56;
        // せんは 下から 1・2・3・4・5（i は 上から 0〜4）
        const lines = [0, 1, 2, 3, 4].map(i => {
            const y = this.TOP + i * this.GAP;
            const number = 5 - i;
            const counted = countLines !== null && number <= countLines;
            const beckon = countLines === 0 && number === 1;
            return `<line class="${counted ? 'counted' : ''}${beckon ? ' beckon' : ''}" x1="8" y1="${y}" x2="${width - 8}" y2="${y}"/>`
                + (counted ? `<text class="staff-line-number" x="${width - 10}" y="${y - 3}">${this.LINE_COUNTS[number - 1]}</text>` : '')
                + (beckon ? `<text class="staff-line-push" x="${width - 10}" y="${y - 5}">おしてね</text>` : '');
        }).join('');
        // せんを かぞえるときの、タッチする ところ（せんの 上下 すこし ひろめ）
        const hits = countLines === null ? '' : [0, 1, 2, 3, 4].map(i =>
            `<rect class="staff-line-hit" data-line="${5 - i}" x="0" y="${this.TOP + i * this.GAP - this.GAP / 2}" width="${width}" height="${this.GAP}"/>`).join('');
        const stateOf = i => (i < current ? 'done' : i === current ? 'current' : `next${reveal ? ' hidden' : ''}`);
        const heads = dango ? this.dango(notes, current, names, focusLedger)
            : rhythm ? this.bar(rhythm, notes, first, this.STEP_X, { state: stateOf })
                + this.timeSignature() + this.barLine(width - 10)
            : notes.map((midi, i) => this.note(midi, this.LEFT + i * this.STEP_X, i, stateOf(i), { focusLedger, tags })).join('');
        const chord = chordName ? `<text class="staff-chord" x="${first - 6}" y="52">${chordName}</text>` : '';
        return `<svg class="staff${dango ? ' dango' : ''}" viewBox="0 0 ${width} 260" role="img" aria-label="ト音記号の 五線の 音符">
            <g class="staff-lines">${lines}</g>
            ${this.clef()}
            ${chord}
            ${heads}
            ${hits}
        </svg>`;
    },

    // 音符 1つ（x：よこの いち、i：data-i、state：done・current・next）
    note(midi, x, i, state, { focusLedger = false, tags = false } = {}) {
        const y = this.y(midi);
        const ledgers = this.ledgers(y).map(ly =>
            `<line class="staff-ledger${focusLedger ? ' focus' : ''}" x1="${x - 20}" y1="${ly}" x2="${x + 20}" y2="${ly}"/>`).join('');
        const onLine = this.onLine(midi);
        const tag = tags
            ? `<text class="staff-tag ${onLine ? 'line' : 'space'}" x="${x}" y="252">${onLine ? 'せん' : 'あいだ'}</text>`
            : '';
        // ぼう：シより 上は 左に 下むき、それより 下は 右に 上むき
        const up = y > this.TOP + 2 * this.GAP;
        const stem = up
            ? `<line class="staff-stem" x1="${x + 12}" y1="${y - 3}" x2="${x + 12}" y2="${y - 68}"/>`
            : `<line class="staff-stem" x1="${x - 12}" y1="${y + 3}" x2="${x - 12}" y2="${y + 68}"/>`;
        return `<g class="staff-note ${state}" data-i="${i}">
            <ellipse class="staff-glow" cx="${x}" cy="${y}" rx="24" ry="20"/>
            ${ledgers}
            <ellipse class="staff-head" cx="${x}" cy="${y}" rx="12.5" ry="9" transform="rotate(-22 ${x} ${y})"/>
            ${stem}
            <text class="staff-star a" x="${x - 26}" y="${y - 14}">★</text>
            <text class="staff-star b" x="${x + 22}" y="${y - 20}">★</text>
            <text class="staff-star c" x="${x + 26}" y="${y + 18}">★</text>
            ${tag}
        </g>`;
    },

    // きょくふう メロディ（Lv9）：ぜんぶの がくふ（だんごとに 1つの svg。4/4拍子）
    score(phrases, { perRow = 4 } = {}) {
        const NOTE_X = 50;   // 拍と 拍の あいだ
        const BAR_PAD = 34;  // さいごの 拍から 小節線まで
        const BAR_NEXT = 56; // 小節線から つぎの 小節の 1拍めまで（コード名が 入る）
        const rows = [];
        let index = 0;
        let restIndex = 0;
        for (let start = 0; start < phrases.length; start += perRow) {
            const part = phrases.slice(start, start + perRow);
            const firstRow = start === 0;
            const last = start + perRow >= phrases.length;
            let x = this.LEFT + (firstRow ? this.TIME_W : 0);
            const parts = firstRow ? [this.timeSignature()] : [];
            let lineEnd = x;
            part.forEach((phrase, k) => {
                const rhythm = phrase.rhythm || '●'.repeat(phrase.notes.length);
                parts.push(`<text class="staff-chord" x="${x - 14}" y="48">${phrase.chord}</text>`);
                parts.push(this.bar(rhythm, phrase.notes, x, NOTE_X, {
                    first: index, firstRest: restIndex, state: i => (i === 0 ? 'current' : 'next'),
                }));
                index += phrase.notes.length;
                restIndex += rhythm.split('').filter(mark => mark === '○').length;
                const barX = x + (rhythm.length - 1) * NOTE_X + BAR_PAD;
                const end = last && k === part.length - 1;
                // 小節の おわりの せん（さいごは 2本：ほそい せんと ふとい せん）
                parts.push(end ? this.barLine(barX - 7) + this.barLine(barX, true) : this.barLine(barX));
                lineEnd = barX + (end ? 3 : 1);
                x = barX + BAR_NEXT;
            });
            const width = lineEnd + 8;
            const lines = [0, 1, 2, 3, 4].map(i =>
                `<line x1="8" y1="${this.TOP + i * this.GAP}" x2="${lineEnd}" y2="${this.TOP + i * this.GAP}"/>`).join('');
            rows.push(`<svg class="staff score-row" viewBox="0 22 ${width} 222" role="img" aria-label="がくふ ${rows.length + 1}だんめ">
                <g class="staff-lines">${lines}</g>
                ${this.clef()}
                ${parts.join('')}
            </svg>`);
        }
        return rows.join('');
    },

    // 色を あわく（白に ちかづける。amount：0〜1）
    tint(hex, amount = 0.35) {
        const n = parseInt(hex.slice(1), 16);
        const mix = c => Math.round(c + (255 - c) * amount);
        const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
        return `rgb(${r}, ${g}, ${b})`;
    },

    // おだんご：1本の くしに、下から じゅんに 音符（まるい おだんご）。ドの みじかい せんは 1本だけ
    dango(notes, current, names, focusLedger) {
        const x = this.LEFT + 4;
        const ys = notes.map(midi => this.y(midi));
        const skewer = `<line class="staff-skewer" x1="${x}" y1="${Math.max(...ys) + 26}" x2="${x}" y2="${Math.min(...ys) - 36}"/>`;
        const ledgerYs = [...new Set(ys.flatMap(y => this.ledgers(y)))];
        const ledgers = ledgerYs.map(ly =>
            `<line class="staff-ledger${focusLedger ? ' focus' : ''}" x1="${x - 22}" y1="${ly}" x2="${x + 22}" y2="${ly}"/>`).join('');
        const balls = notes.map((midi, i) => {
            const y = ys[i];
            const state = i < current ? 'done' : i === current ? 'current' : 'next';
            const name = names
                ? `<text class="staff-dango-name" x="${x + 32}" y="${y + 7}" fill="${TamaNotes.color(midi)}">${TamaNotes.lessonName(midi)}</text>`
                : '';
            return `<g class="staff-note dango d${i} ${state}" data-i="${i}">
                <circle class="staff-glow" cx="${x}" cy="${y}" r="20"/>
                <circle class="staff-head" cx="${x}" cy="${y}" r="10.5" style="fill: ${this.tint(TamaNotes.color(midi))}"/>
                <text class="staff-star a" x="${x - 26}" y="${y - 12}">★</text>
                <text class="staff-star b" x="${x + 24}" y="${y - 16}">★</text>
                <text class="staff-star c" x="${x + 26}" y="${y + 16}">★</text>
                ${name}
            </g>`;
        }).join('');
        return `${skewer}${ledgers}${balls}`;
    },
};
