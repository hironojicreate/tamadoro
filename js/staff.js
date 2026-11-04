// 五線（ト音記号）と 音符の絵（おんぷよみ）
//   TamaStaff.svg([60, 62, 64], { current: 1 })  → 五線に 音符を ならべた SVG（文字列）
//   音符は 白いけんばん（ド〜シ）だけ。下第1線の ド から、上第1線の ラ くらいまで
//   current：いま 読む音符（ピンクに 光る）。それより前の 音符は 読みおわり（みどり）

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

    svg(notes, { current = 0 } = {}) {
        const width = this.LEFT + this.STEP_X * (notes.length - 1) + 56;
        const lines = [0, 1, 2, 3, 4].map(i =>
            `<line x1="8" y1="${this.TOP + i * this.GAP}" x2="${width - 8}" y2="${this.TOP + i * this.GAP}"/>`).join('');
        const heads = notes.map((midi, i) => {
            const x = this.LEFT + i * this.STEP_X;
            const y = this.y(midi);
            const state = i < current ? 'done' : i === current ? 'current' : 'next';
            const ledgers = this.ledgers(y).map(ly =>
                `<line class="staff-ledger" x1="${x - 20}" y1="${ly}" x2="${x + 20}" y2="${ly}"/>`).join('');
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
            </g>`;
        }).join('');
        return `<svg class="staff" viewBox="0 0 ${width} 260" role="img" aria-label="ト音記号の 五線の 音符">
            <g class="staff-lines">${lines}</g>
            ${this.clef()}
            ${heads}
        </svg>`;
    },
};
