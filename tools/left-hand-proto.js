// ヘおん マスタークラス（左手）の 試作を つくる 道具（アプリには 入れない）：「左手の 音の ながれの ルール」（docs/handoff-music.md）で 左手を つくり、
//   がくふの 画像（上：アプリの 右手、下：子どもの 左手）と 試聴用の WAV を 書き出す。ルールの たしかめも 出す
//   ・1〜2小節：左手 やすみ。3〜6小節：段階の リズム。7小節め（V）：ソ3 から くだる。8小節め（I）：1拍めは ド3
//   ・単音・白い けんばん・ひくいファ〜シ3（41〜59）、手は ド3〜ソ3。1拍めは ねもと
//   ・ほかの 音は 和音の 音か、つぎの 小節の ねもとの となりの 音（つなぐ 音）
//   ・とびは 5度まで。4ぶ音符どうしは 2度・3度だけ。同じ 音の くりかえしは へらす
//   ・リズム：全(W)・2ぶ×2(H)・2ぶ＋4ぶ×2(HQQ)・4ぶ×2＋2ぶ(QQH)・4ぶ×4(Q)。3〜6小節に HQQ か QQH を かならず。Q は 1曲 1小節まで
//   ・赤本（和声 理論と実習）の きほん：終止は S → D → T の ねもと（7小節めは ソ で おわり、ソ → ド の 完全終止）、
//     限定進行（シ → ド、7の 音 ファ → ミ）、外声の 連続5度・8度（反行も）と ソプラノが とぶ 並達を さける、
//     和音に ない 音は 2度で 入って 2度で ぬける（経過音・刺繍音）、右手の 終止は 2度で ド へ。8小節めは 同じ 音を つづけない
//   つかいかた：アプリを うごかして（例：python3 -m http.server 8765）→ node tools/left-hand-proto.js http://localhost:8765/ <出力フォルダ>
//   （Playwright が いる。tests/ と 同じ）
const { chromium } = require('playwright');
const fs = require('fs');
const [BASE, OUT] = process.argv.slice(2);

const wavFile = (path, { rate, data }) => {
  const pcm = Buffer.from(data, 'base64');
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path, Buffer.concat([h, pcm]));
};

// 段階ごとの 3〜6小節の リズム（ならびは ランダムに。となり どうしは ちがう リズム）と、7・8小節めの リズム
const PLANS = {
  stage1: { style: 'hymn', rhythm: 'utau', label: '段階1 きょうかい風（のばす：全音符・2ぶ が 中心）', body: ['W', 'W', 'H', 'HQQ'], seventh: 'W', eighth: 'QQH' },
  stage2: { style: 'doyo', rhythm: 'hazumu', label: '段階2 どうよう風（2ぶ音符が 中心）', body: ['H', 'H', 'HQQ', 'QQH'], seventh: 'HQQ', eighth: 'QQH' },
  stage3: { style: 'fifties', rhythm: 'genki', label: '段階3 ポップス風（2ぶと 4ぶを まぜて うごく）', body: ['HQQ', 'QQH', 'H', 'Q'], seventh: 'HQQ', eighth: 'QQH' },
  stage4: { style: 'cadence', rhythm: 'utau', label: '段階4 クラシック風（分散和音：のぼって もどる）', body: ['QQH', 'Q', 'HQQ', 'H'], seventh: 'Q', eighth: 'QQH' },
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
  await p.addInitScript(() => { if (location.href.startsWith('http')) localStorage.setItem('tamadoro.music.enabled', 'true'); });
  await p.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
  await p.goto(BASE + 'index.html#/music'); await p.waitForTimeout(500);

  for (const [id, plan] of Object.entries(PLANS)) {
    const song = await p.evaluate(({ id, plan }) => {
      let x = 20261110 + id.length * 13;
      const rng = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
      const style = TamaSongs.STYLES.find(s => s.id === plan.style);
      const phrases = TamaSongs.make(style, rng, plan.rhythm);
      // 右手の 終止（赤本：完全終止の ソプラノは 主音へ 2度で）：7小節めの さいごの 音を、8小節めの はじめの ド の すぐ下の シ（か 上の レ）に
      {
        const p7 = phrases[phrases.length - 2], p8 = phrases[phrases.length - 1];
        const target = p8.rhythm[0] === '●' ? p8.notes[0] : null;
        const lastIndex = p7.notes.length - 1;
        if (target !== null && p7.rhythm.endsWith('●') && Math.abs(p7.notes[lastIndex] - target) > 2 && target % 12 === 0) {
          p7.notes = [...p7.notes.slice(0, -1), Math.abs(target - 1 - p7.notes[lastIndex]) <= Math.abs(target + 2 - p7.notes[lastIndex]) ? target - 1 : target + 2];
        }
      }
      const LOW = 41, HIGH = 59;
      const WHITE = m => [0, 2, 4, 5, 7, 9, 11].includes(((m % 12) + 12) % 12);
      const tonesOf = c => { const q = TamaSongs.parse(c); return q.intervals.slice(0, 3).map(i => (q.root + i) % 12); };
      const inRange = (pc, lo, hi) => { const out = []; for (let m = lo; m <= hi; m++) if (m % 12 === pc) out.push(m); return out; };
      const nearest = (list, to) => list.reduce((a, m) => (Math.abs(m - to) < Math.abs(a - to) ? m : a));
      const BEATS = { W: [4], H: [2, 2], HQQ: [2, 1, 1], QQH: [1, 1, 2], Q: [1, 1, 1, 1] };

      // ねもと：ド3〜ソ3 に あれば そこ、なければ まえの ねもとに ちかい 高さ。7小節めは ソ3、8小節めは ド3
      let prev = 48;
      const roots = phrases.map((ph, i) => {
        if (i === phrases.length - 2) return (prev = 55);
        if (i === phrases.length - 1) return (prev = 48);
        const pc = TamaSongs.parse(ph.chord).root;
        const home = inRange(pc, 48, 55);
        prev = home.length ? home[0] : nearest(inRange(pc, LOW, HIGH), prev);
        return prev;
      });

      // 3〜6小節の リズム：plan.body を まぜる（となり どうし ちがう。Q は 7小節めの となりに しない）
      const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      let body;
      for (let t = 0; t < 200; t++) {
        body = shuffle(plan.body);
        const ok = body.every((r, i) => i === 0 || r !== body[i - 1]) && body[3] !== plan.seventh; // となり どうし（6・7小節めも）ちがう リズム
        if (ok) break;
      }
      const rhythms = ['REST', 'REST', ...body, plan.seventh, plan.eighth];

      // 赤本（和声 理論と実習）の きほん：外声の 連続5度・連続8度（反行も）と、ソプラノが とぶ 並達5度・8度を さける
      //   メロディは 4ぶ音符と 4ぶきゅうふ だけ なので、拍 t の メロディの 音は その 拍に はじまる 音（きゅうふは なし）
      const melodyAt = t => {
        const bar = Math.floor(t / 4), k = t - bar * 4;
        const ph = phrases[bar];
        if (!ph || !Number.isInteger(k) || ph.rhythm[k] !== '●') return null;
        return ph.notes[ph.rhythm.slice(0, k).split('').filter(c => c === '●').length];
      };
      const perfect = (m, b) => { const iv = (((m - b) % 12) + 12) % 12; return iv === 0 || iv === 7 ? iv : -1; };
      // 2つの バスの 音（t1, b1）→（t2, b2）の あいだの 外声の 禁則の かず
      const outerFaults = (t1, b1, t2, b2) => {
        const m1 = melodyAt(t1), m2 = melodyAt(t2);
        if (m1 == null || m2 == null) return 0;
        const p1 = perfect(m1, b1), p2 = perfect(m2, b2);
        const dm = m2 - m1, db = b2 - b1;
        if (p2 < 0 || (dm === 0 && db === 0)) return 0;
        if (p1 === p2 && dm !== 0 && db !== 0) return 1;                                   // 連続（反行も）
        if (Math.sign(dm) === Math.sign(db) && dm !== 0 && Math.abs(dm) > 2) return 1;      // 並達（ソプラノが とぶ）
        return 0;
      };

      // 1小節の 音を えらぶ：1拍めは ねもと、まんなかの 音は 和音の 音、さいごの 音は 和音の 音か つぎの ねもとの となりの 音（つなぐ 音）。
      //   とびは 5度（7半音）まで、4ぶ音符どうしは 3度（4半音）まで。同じ 音の くりかえしは さける。
      //   なめらか（とびが ちいさい）で、のぼり・くだりの むきが かわりすぎない ものを えらぶ
      const fill = (i, rhythm, before) => {
        const beats = BEATS[rhythm];
        const onsets = beats.map((_, j) => i * 4 + beats.slice(0, j).reduce((a, x) => a + x, 0));
        const seventh = TamaSongs.parse(phrases[i].chord).intervals.includes(10);
        const root = roots[i];
        const next = roots[i + 1];
        const chordPool = tonesOf(phrases[i].chord).flatMap(pc => inRange(pc, LOW, HIGH)).filter(m => Math.abs(m - root) <= 9);
        const linkPool = next === undefined ? [] : [next - 2, next - 1, next + 1, next + 2].filter(m => WHITE(m) && m >= LOW && m <= HIGH && m !== next);
        let best = null;
        const walk = seq => {
          const k = seq.length;
          if (k === beats.length) {
            let cost = 0;
            // 和音に ない 音（経過音・刺繍音）は まえと あとを 2度で（さいごの 音は つぎの 小節の ねもとへ 2度）
            const chordPcs = tonesOf(phrases[i].chord);
            for (let j = 1; j < k; j++) {
              if (chordPcs.includes(seq[j] % 12)) continue;
              const after = j + 1 < k ? seq[j + 1] : next;
              if (after === undefined || Math.abs(seq[j] - seq[j - 1]) > 2 || Math.abs(after - seq[j]) > 2) return;
              cost += 1;
            }
            const all = before ? [before, ...seq.map((m, j) => ({ m, beats: beats[j] }))] : seq.map((m, j) => ({ m, beats: beats[j] }));
            for (let j = 1; j < all.length; j++) {
              const d = Math.abs(all[j].m - all[j - 1].m);
              if (d > 7) return;                                      // とびは 5度まで
              if (all[j].beats === 1 && all[j - 1].beats === 1 && d > 4) return; // 4ぶ音符どうしは 3度まで
              cost += d + (d === 0 ? 8 : 0) + (d > 4 ? 4 : 0);
            }
            for (let j = 2; j < seq.length; j++) if ((seq[j] - seq[j - 1]) * (seq[j - 1] - seq[j - 2]) < 0) cost += 2;
            if (next !== undefined) { const d = Math.abs(next - seq[k - 1]); if (d > 7) return; cost += d + (d === 0 ? 8 : 0); } // 小節を またぐ 同じ 音も さける
            // 限定進行：小節の さいごの シ（みちびく 音）は つぎの ド へ 2度 上、7の和音の 7の 音（ファ）は 2度 下へ
            const lastPc = seq[k - 1] % 12;
            if (next !== undefined && lastPc === 11 && next !== seq[k - 1] + 1) return;
            if (next !== undefined && seventh && lastPc === (TamaSongs.parse(phrases[i].chord).root + 10) % 12 && !(next < seq[k - 1] && seq[k - 1] - next <= 2)) return;
            // 外声の 禁則（まえの 小節の さいごの 音 → この 小節 → つぎの 小節の 1拍め）
            let faults = 0;
            if (before) faults += outerFaults(before.t, before.m, onsets[0], seq[0]);
            for (let j = 1; j < k; j++) faults += outerFaults(onsets[j - 1], seq[j - 1], onsets[j], seq[j]);
            if (next !== undefined) faults += outerFaults(onsets[k - 1], seq[k - 1], (i + 1) * 4, next);
            cost += faults * 50;
            if (!best || cost < best.cost) best = { seq, cost };
            return;
          }
          // まんなかは 和音の 音か、2度で 入って 2度で ぬける 経過音・刺繍音（あとで たしかめる）
          const passPool = [-2, -1, 1, 2].map(d => seq[k - 1] + d).filter(m => WHITE(m) && m >= LOW && m <= HIGH);
          const pool = k === beats.length - 1 ? [...new Set([...chordPool, ...linkPool, ...passPool])] : [...new Set([...chordPool, ...passPool])];
          pool.forEach(m => walk([...seq, m]));
        };
        walk([root]);
        return best ? best.seq : beats.map(() => root);
      };

      // 7小節め（V）：ソ3 から くだる。8小節め（I）：1拍めは ド3
      // 7小節め（V）：ソ3 で はじまり ソ3 で おわる（完全終止：V と I の ねもと ソ → ド。ファ（7の 音）は つかわない）
      // 8小節め（I）：1拍めは ド3。同じ 音を つづけない（ド・ミ・ド ／ ド・レ・ド ／ ド・シ・ド から 外声の 禁則が ない もの）
      const SEVENTH = {
        W: [[55]],
        HQQ: [[55, 59, 55], [55, 57, 55], [43, 47, 43], [43, 45, 43]],
        QQH: [[55, 59, 55], [55, 57, 55], [43, 47, 43], [43, 45, 43]],
        Q: [[55, 57, 59, 55], [55, 59, 57, 55], [43, 45, 47, 43], [43, 47, 45, 43]],
      };
      const EIGHTH = { QQH: [[48, 52, 48], [48, 50, 48], [48, 47, 48]] };
      const pickFixed = (i, rhythm, choices, before) => {
        const beats = BEATS[rhythm];
        const onsets = beats.map((_, j) => i * 4 + beats.slice(0, j).reduce((a, x) => a + x, 0));
        const faultsOf = seq => {
          let f = before ? outerFaults(before.t, before.m, onsets[0], seq[0]) : 0;
          for (let j = 1; j < seq.length; j++) f += outerFaults(onsets[j - 1], seq[j - 1], onsets[j], seq[j]);
          if (roots[i + 1] !== undefined) f += outerFaults(onsets[seq.length - 1], seq[seq.length - 1], (i + 1) * 4, roots[i + 1]);
          return f;
        };
        const ok = choices.find(seq => faultsOf(seq) === 0);
        return ok || { fallback: true, seq: choices.reduce((best, seq) => (faultsOf(seq) < faultsOf(best) ? seq : best)) };
      };

      let last = null;
      const lh = phrases.map((ph, i) => {
        let rhythm = rhythms[i];
        if (rhythm === 'REST') return { chord: ph.chord, kind: 'やすみ', rhythm: [{ rest: true, beats: 4 }] };
        let notes;
        if (i === phrases.length - 2) {
          // その 段階の リズムで だめなら、全音符の ソ（小節の なかで うごかないので 連続に ならない）
          let got = pickFixed(i, rhythm, SEVENTH[rhythm], last);
          if (got.fallback) { const w = pickFixed(i, 'W', SEVENTH.W, last); if (!w.fallback) { rhythm = 'W'; got = w; } else got = got.seq; }
          notes = got;
        } else if (i === phrases.length - 1) {
          const got = pickFixed(i, rhythm, EIGHTH[rhythm], last);
          notes = got.fallback ? got.seq : got;
        }
        else notes = fill(i, rhythm, last);
        const bt = BEATS[rhythm];
        last = { m: notes[notes.length - 1], beats: bt[bt.length - 1], t: i * 4 + bt.slice(0, -1).reduce((a, x) => a + x, 0) };
        rhythms[i] = rhythm;
        return { chord: ph.chord, kind: rhythm, rhythm: BEATS[rhythm].map((beats, k) => ({ notes: [notes[k]], beats })) };
      });

      // ルールの たしかめ
      const seqAll = lh.flatMap(bar => bar.rhythm.filter(e => !e.rest).map(e => ({ m: e.notes[0], beats: e.beats })));
      const leaps = seqAll.slice(1).map((e, k) => Math.abs(e.m - seqAll[k].m));
      const cadenceAt = seqAll.length - BEATS[rhythms[rhythms.length - 1]].length; // 8小節めの 1つめ
      const qLeaps = seqAll.slice(1).map((e, k) => (k + 1 !== cadenceAt && e.beats === 1 && seqAll[k].beats === 1 ? Math.abs(e.m - seqAll[k].m) : 0));
      const check = {
        range: seqAll.every(e => e.m >= 41 && e.m <= 59 && WHITE(e.m)),
        roots: lh.every((bar, i) => i < 2 || bar.rhythm[0].notes[0] === roots[i]),
        maxLeap: Math.max(...leaps),
        maxQuarterLeap: Math.max(...qLeaps),
        mixed: rhythms.slice(2, 6).some(r => r === 'HQQ' || r === 'QQH'),
        fourQuarters: rhythms.filter(r => r === 'Q').length,
        sameNeighbors: rhythms.slice(2).some((r, i, a) => i > 0 && r === a[i - 1]),
        repeats: leaps.filter(d => d === 0).length,
        cadence: `${lh[lh.length - 2].rhythm[lh[lh.length - 2].rhythm.length - 1].notes[0]}→${lh[lh.length - 1].rhythm[0].notes[0]}`,
        lastBarRepeat: lh[lh.length - 1].rhythm.some((e, k, a) => k > 0 && e.notes[0] === a[k - 1].notes[0]),
        outerFaults: (() => {
          const ev = [];
          lh.forEach((bar, bi) => { let pos = 0; bar.rhythm.forEach(e => { if (!e.rest) ev.push({ t: bi * 4 + pos, m: e.notes[0] }); pos += e.beats; }); });
          return ev.slice(1).reduce((a, e, k) => a + outerFaults(ev[k].t, ev[k].m, e.t, e.m), 0);
        })(),
        faultAt: (() => {
          const ev = [];
          lh.forEach((bar, bi) => { let pos = 0; bar.rhythm.forEach(e => { if (!e.rest) ev.push({ t: bi * 4 + pos, m: e.notes[0] }); pos += e.beats; }); });
          return ev.slice(1).map((e, k) => (outerFaults(ev[k].t, ev[k].m, e.t, e.m) ? `拍${ev[k].t}→${e.t} バス${ev[k].m}→${e.m} メロ${melodyAt(ev[k].t)}→${melodyAt(e.t)}` : '')).filter(Boolean).join(' / ');
        })(),
      };
      return { name: `${style.name}（${style.sub}）`, tempo: TamaSongs.RHYTHMS[plan.rhythm].tempo,
        melody: phrases.map(ph => ({ notes: ph.notes, rhythm: ph.rhythm, chord: ph.chord })), lh, check };
    }, { id, plan });
    console.log(id, song.name, song.tempo);
    console.log('  ', song.lh.map(bar => `${bar.chord}[${bar.kind}]:${bar.rhythm.map(e => (e.rest ? '休' : e.notes[0])).join(' ')}`).join(' | '));
    console.log('   ルール', JSON.stringify(song.check));

    await p.evaluate(({ melody, lh, label }) => {
      document.getElementById('protoScore')?.remove();
      const div = document.createElement('div');
      div.id = 'protoScore';
      div.style.cssText = 'position:fixed;left:0;top:0;width:1250px;background:#fff;padding:12px;z-index:9999;font-family:sans-serif';
      TamaStaff.kind = 'treble';
      const top = TamaStaff.score(melody, { perRow: 4 });
      TamaStaff.kind = 'bass';
      const bottom = TamaStaff.score(lh, { perRow: 4 });
      TamaStaff.kind = 'treble';
      div.innerHTML = `<div style="font-weight:bold;font-size:22px;margin:4px 0">${label}</div>
        <div style="color:#666;margin:2px 0">右手：アプリ（ト音記号）</div><div class="keys-cards staff">${top}</div>
        <div style="color:#666;margin:8px 0 2px">左手：子ども（ヘ音記号）。1〜2小節 やすみ／3〜6小節 段階の リズム／7小節め おわりへ／8小節め ド</div><div class="keys-cards staff">${bottom}</div>`;
      div.querySelectorAll('svg').forEach(s => { s.style.width = '100%'; s.style.height = 'auto'; s.style.display = 'block'; });
      document.body.appendChild(div);
    }, { melody: song.melody, lh: song.lh, label: plan.label });
    await p.locator('#protoScore').screenshot({ path: `${OUT}/left-hand-${id}.png` });

    const wav = await p.evaluate(async ({ melody, lh, tempo }) => {
      const beat = 60 / tempo;
      const start = 0.3;
      const seconds = start + melody.length * 4 * beat + 3;
      const rate = 44100;
      const off = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
      const comp = off.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 6;
      comp.connect(off.destination);
      TamaSound.ctx = off;
      TamaSound.wave = null; TamaSound.waves = {}; TamaSound.plucks = {};
      TamaSound.master = off.createGain(); TamaSound.master.gain.value = 0.9; TamaSound.master.connect(comp);
      TamaSound.muted = false;
      TamaSound.live = () => off; TamaSound.context = () => off;
      const playBars = (bars, gain) => bars.forEach((bar, bi) => {
        let pos = 0;
        TamaStaff.events(bar.rhythm, bar.notes).forEach(e => {
          const when = start + (bi * 4 + pos) * beat;
          if (!e.rest) e.notes.forEach(m => TamaSound.note(m, { when, gain, hold: beat * e.beats * 0.92 }).release());
          pos += e.beats;
        });
      });
      playBars(melody, 0.42);
      playBars(lh, 0.36);
      const buffer = await off.startRendering();
      const ch = buffer.getChannelData(0);
      const pcm = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) pcm[i] = Math.max(-1, Math.min(1, ch[i])) * 32767;
      const bytes = new Uint8Array(pcm.buffer);
      let bin = '';
      for (let k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
      return { rate, data: btoa(bin) };
    }, { melody: song.melody, lh: song.lh, tempo: song.tempo });
    wavFile(`${OUT}/left-hand-${id}.wav`, wav);
  }
  await b.close();
})();
