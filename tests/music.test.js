// おんがくのへや・けんばんレッスン（js/music.js・js/sound.js・js/keyboard.js・js/engines/keys.js）
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

async function openPage(browser, path, storage = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
  await page.addInitScript(s => { if (!sessionStorage.seeded) { for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.seeded = 1; } }, storage);
  await page.goto(BASE + path);
  await page.waitForTimeout(500);
  return { page, errors: () => errors.filter(e => !/gstatic|googleapis|googletagmanager|jsdelivr|ERR_FAILED/.test(e)) };
}
const MUSIC_ON = { 'tamadoro.music.enabled': 'true' };
const command = (page, c) => page.evaluate(c => { const t = document.getElementById('commandInput'); t.value = c; t.dispatchEvent(new Event('input')); }, c);
const pressKey = (page, midi) => page.click(`#keysKeyboard .tk-key[data-midi="${midi}"]`);
const expected = page => page.evaluate(() => keysLesson.run && keysLesson.run.problem ? keysLesson.run.problem.notes[keysLesson.run.pos] : null);
const drops = (page, level) => page.evaluate(l => JSON.parse(localStorage.getItem(`keys_coins_${l}`) || '[]'), level);
const unlockAll = { ...MUSIC_ON };
for (let l = 1; l <= 8; l++) unlockAll[`keys_coins_${l}`] = JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' }));

// いまの問題を ぜんぶ正解する（つぎの問題が出るまで まつ）
async function answerAll(page) {
  for (let guard = 0; guard < 600; guard++) {
    const done = await page.evaluate(() => !keysLesson.run || keysLesson.run.finished);
    if (done) return;
    const midi = await expected(page);
    const accepting = await page.evaluate(() => keysLesson.run.accepting);
    if (midi === null || !accepting) { await page.waitForTimeout(150); continue; }
    await pressKey(page, midi);
    await page.waitForTimeout(40);
  }
}

(async () => {
  const browser = await chromium.launch();

  // 1. ふだんは かくれている（/music on のときだけ）
  {
    const { page, errors } = await openPage(browser, 'index.html#/');
    ok(!(await page.isVisible('#homeMusic')), 'さいしょは「おんがくのへや」のボタンが かくれている');
    await page.evaluate(() => { location.hash = '#/music'; }); await page.waitForTimeout(300);
    ok(await page.isVisible('#homeScreen') && !(await page.isVisible('#musicScreen')), 'OFF のときは #/music を開いても さいしょの画面');
    await page.evaluate(() => { location.hash = '#/keys'; }); await page.waitForTimeout(300);
    ok(await page.isVisible('#homeScreen') && !(await page.isVisible('#openingScreen')), 'OFF のときは #/keys を開いても さいしょの画面');

    // 設定（歯車）の入力欄は、さいしょの画面にも出る
    await page.click('#openDataModalHome'); await page.waitForTimeout(200);
    ok(await page.isVisible('#commandInput'), 'さいしょの画面の設定に 入力欄がある');
    ok(!(await page.$eval('#commandInput', e => e.placeholder)).includes('music'), '入力欄に /music のことは書いていない（ためしているあいだは ないしょ）');
    await command(page, '/rescue'); await page.waitForTimeout(200);
    ok(!(await page.isVisible('#rescueModal')), 'さいしょの画面では /rescue は なにもしない（エラーにならない）');
    await command(page, '/music on'); await page.waitForTimeout(300);
    ok(await page.isVisible('#homeMusic'), '/music on で「おんがくのへや」のボタンが出る');
    ok(!(await page.isVisible('#dataModal')), '/music on のあと、設定はとじる');
    await page.evaluate(() => { location.hash = '#/'; }); await page.waitForTimeout(200);
    await page.reload(); await page.waitForTimeout(500);
    ok(await page.isVisible('#homeMusic'), '読みこみなおしても 出たまま');
    await page.click('#homeMusic'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/music' && await page.isVisible('#musicScreen'), 'ボタンで おんがくのへやへ');
    ok(await page.evaluate(() => document.title) === 'タマの おんがくのへや', 'へやの タイトル');
    ok((await page.$$('#musicScreen .music-lesson.coming')).length === 0 && (await page.$$('#musicScreen .music-lesson')).length === 5, 'レッスンは 5こ（じゅんびちゅう なし）');

    // おと あり／なし
    ok((await page.textContent('#musicSound')).includes('あり'), 'さいしょは おと あり');
    await page.click('#musicSound'); await page.waitForTimeout(100);
    ok((await page.textContent('#musicSound')).includes('なし') && await page.evaluate(() => TamaSound.muted), '「おと」を押すと おと なし');
    await page.click('#musicSound'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => !TamaSound.muted), 'もういちど押すと おと あり');

    // けんばん → レベル選択 →「もどる」で へやへ
    await page.click('#musicKeys'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/keys' && await page.isVisible('#openingScreen'), 'けんばんの レベル選択');
    ok(await page.isVisible('#openingScreen .title-keys') && !(await page.isVisible('#openingScreen .title-add')), 'タイトルは「タマのけんばんドロップス」');
    ok(!(await page.isVisible('#goToRecords')) && !(await page.isVisible('#toggleWeakMode')), 'けんばんでは「きろく」「にがてちょうせん」は まだ出さない');
    ok((await page.$$('.select-level-buttons button')).length === 9, 'レベルは9こ（おとあそび〜オニ）');
    ok(await page.isVisible('#level1') && !(await page.isVisible('#level2')), 'さいしょは おとあそび だけ');
    await page.click('#goToIndex'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/music', 'けんばんの「もどる」は おんがくのへやへ');
    await page.click('#musicBack'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/' && await page.isVisible('#homeScreen'), 'へやの「もどる」で さいしょの画面へ');

    // /music off
    await page.click('#openDataModalHome'); await page.waitForTimeout(200);
    await command(page, '/music off'); await page.waitForTimeout(300);
    ok(!(await page.isVisible('#homeMusic')), '/music off で かくれる');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 2. おとあそび：10かい鳴らすと クリア（ドロップは そのレベルの色。金ではない）
  {
    const { page, errors } = await openPage(browser, 'index.html#/keys', MUSIC_ON);
    await page.click('#level1'); await page.waitForTimeout(300);
    ok(await page.isVisible('#keysScreen') && !(await page.isVisible('#keypadScreen')), 'けんばんの画面（テンキーは出ない）');
    ok((await page.$$('#keysKeyboard .tk-key')).length > 20, 'けんばんが出る');
    const firstWhite = await page.$eval('#keysKeyboard .tk-white-key', e => Number(e.dataset.midi));
    ok(firstWhite !== 60 && firstWhite % 12 !== 0, `左はしは ドではない（${firstWhite}）`);
    await pressKey(page, 61); await page.waitForTimeout(100);
    ok((await page.textContent('#keysKeyboard .tk-balloon')) === 'ド♯／レ♭', '黒いけんばんは 2つの名前の ふきだし');
    for (const m of [60, 62, 64, 65, 67, 69, 71, 72, 74]) { await pressKey(page, m); await page.waitForTimeout(30); }
    await page.waitForTimeout(1000);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', '10かいで クリア');
    const d = await drops(page, 1);
    ok(d.length === 1 && d[0].image === '/img/Lmaru.png', `おとあそびの ドロップ（${d[0] && d[0].image}）`);
    const log = await page.evaluate(() => JSON.parse(localStorage.getItem('tamadoro.log.v1')).filter(e => e.mode === 'keys'));
    ok(log.length === 1 && log[0].cleared && log[0].level === 1, 'きろくに のこる');
    await page.click('#completionModal >> text=もんだいをえらぶ'); await page.waitForTimeout(300);
    ok(await page.isVisible('#level2'), 'Lv1 ドレミ が ひらく（おとあそびは ドロップ1こで）');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 3. Lv1 ドレミ：ぜんぶ正解すると 金のドロップ。黒いけんばん・うすいけんばんの あつかい
  {
    const { page, errors } = await openPage(browser, 'index.html#/keys', unlockAll);
    await page.click('#level2'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => keysLesson.run.deck.length) === 12, 'Lv1 は 12もん');
    const keys = await page.evaluate(() => keysLesson.run.deck.map(p => p.key));
    ok(keys.every((k, i) => i === 0 || k !== keys[i - 1]), `同じ音が つづかない（${keys.join('')}）`);
    ok(await page.$$eval('#keysKeyboard .tk-label', l => l.map(e => e.textContent).join('')) === 'ドレミ', 'ガイドは ド・レ・ミ だけ');
    ok(await page.$eval('#keysKeyboard .tk-key[data-midi="57"]', e => e.classList.contains('tk-dim')), 'つかわない けんばんは うすい');
    // うすい けんばんは まちがいに ならない
    await pressKey(page, 57); await page.waitForTimeout(100);
    ok(await page.evaluate(() => problemState.mistakeCount) === 0, 'うすい けんばんを おしても まちがいに ならない');
    ok((await page.textContent('#keysKeyboard .tk-balloon')).includes('あかるい'), 'うすい けんばんでは「あかるい けんばんで さがしてね」');
    await answerAll(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv1 クリア');
    ok(await page.textContent('#modalTitle') === 'Lv1 ドレミ、クリア！', 'クリアのタイトル');
    ok(await page.$eval('#completionModal > div', e => e.getBoundingClientRect().bottom) < await page.$eval('#keysKeyboard', e => e.getBoundingClientRect().top) - 32 * 2,
      'クリアの カードは 上のほう（けんばんの上に つもった ドロップと かさならない）');
    const d = await drops(page, 2);
    ok(d[d.length - 1].image === '/img/Gmaru.png', 'ノーミスなら 金のドロップ');
    const stats = await page.evaluate(() => History.getStats('keys'));
    ok(stats['ド'] && stats['レ'] && stats['ミ'] && stats['ド'].n === 4, '1おんずつ きろく（ド 4かい）');
    // もういちど
    await page.click('#completionModal >> text=もういちどちょうせん'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => keysLesson.run.index) === 1 && await page.$eval('#completionModal', e => e.style.display) === 'none', 'もういちど で はじめから');
    // まちがい：5かいで ざんねん
    for (let i = 0; i < 5; i++) {
      const midi = await expected(page);
      const wrong = [60, 62, 64].find(m => m !== midi);
      await pressKey(page, wrong); await page.waitForTimeout(80);
    }
    await page.waitForTimeout(200);
    ok(await page.$eval('#mistakeModal', e => e.style.display) === 'flex', '5かい まちがえると ざんねん');
    const items = await page.$$eval('#mistakeList li', l => l.map(x => x.textContent));
    ok(items.length === 5 && /^「(ド|レ|ミ)」で (ド|レ|ミ) を おした 【せいかいは (ド|レ|ミ)】$/.test(items[0]), `まちがいの いちらん：${items[0]}`);
    // はじめにもどる で とまる
    await page.click('#mistakeModal >> text=もんだいをえらぶ'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => keysLesson.run === null) && await page.isVisible('#openingScreen'), 'レベル選択に もどると レッスンは とまる');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 4. まちがえた問題は さいごに もういちど
  {
    const { page, errors } = await openPage(browser, 'index.html#/keys', unlockAll);
    await page.click('#level2'); await page.waitForTimeout(300);
    const midi = await expected(page);
    await pressKey(page, [60, 62, 64].find(m => m !== midi)); await page.waitForTimeout(80);
    await answerAll(page);
    await page.waitForTimeout(300);
    const log = await page.evaluate(() => JSON.parse(localStorage.getItem('tamadoro.log.v1')).filter(e => e.mode === 'keys').pop());
    ok(log && log.cleared && log.miss === 1, 'まちがえても さいごまで できる（miss 1）');
    const d = await drops(page, 2);
    ok(d[d.length - 1].image !== '/img/Gmaru.png', 'まちがえたら 金ではない');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 5. Lv3 まほう：ド と ソ の 名前が きえる
  {
    const { page, errors } = await openPage(browser, 'index.html#/keys', unlockAll);
    await page.click('#level4'); await page.waitForTimeout(300);
    ok(await page.$$eval('#keysKeyboard .tk-label', l => l.length) === 5, 'はじめは ド〜ソ の名前がある');
    ok(await page.evaluate(() => keysLesson.run.accepting) === false, 'まほうの あいだは こたえない');
    await page.waitForTimeout(3000);
    const labels = await page.$$eval('#keysKeyboard .tk-label', l => l.map(e => e.textContent).join(''));
    ok(labels === 'レミファ', `ドと ソの名前が きえた（${labels}）`);
    ok((await page.textContent('#keysHint')).includes('ひだりどなりが ド'), 'ヒントが出る');
    ok(await page.evaluate(() => keysLesson.run.accepting) === true, 'まほうのあと はじまる');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 6. Lv7 メロディ：左から じゅんばんに。和音の じゅんばん C → F → G → C
  {
    const { page, errors } = await openPage(browser, 'index.html#/keys', unlockAll);
    await page.click('#level8'); await page.waitForTimeout(300);
    const chords = await page.evaluate(() => keysLesson.run.deck.map(p => p.chord));
    ok(chords.length === 8 && chords.every((c, i) => c === ['C', 'F', 'G', 'C'][i % 4] || (i % 4 === 2 && c === 'G7')), `和音の じゅんばん（${chords.join(' ')}）`);
    const ends = await page.evaluate(() => keysLesson.run.deck.filter((p, i) => i % 4 === 3).map(p => p.notes[p.notes.length - 1]));
    ok(ends.every(m => m === 60 || m === 72), 'C にもどる メロディは ドで おわる');
    ok((await page.$$('#keysCards .keys-card')).length >= 3, 'カードが 3〜4まい');
    ok(await page.$$eval('#keysKeyboard .tk-label', l => l.length) === 0, 'メロディは 名前なし');
    const first = await expected(page);
    await pressKey(page, first); await page.waitForTimeout(80);
    ok(await page.evaluate(() => keysLesson.run.pos) === 1 && await page.$eval('#keysCards .keys-card[data-i="0"]', e => e.classList.contains('done')), '1おんめ 正解で つぎのカードへ');
    await answerAll(page);
    await page.waitForTimeout(300);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'メロディ クリア');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 7. オニ：けんばんの場所が かわる・ぜんぶ まぜる
  {
    const { page, errors } = await openPage(browser, 'index.html#/keys', unlockAll);
    ok(await page.isVisible('#level9'), 'オニが ひらく（Lv7 のドロップ5こ）');
    await page.click('#level9'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => p.notes.length));
    ok(deck.length === 16 && deck.filter(n => n === 1).length === 12, 'オニは 1おん12もん＋メロディ4もん');
    const starts = new Set();
    for (let i = 0; i < 6; i++) {
      starts.add(await page.$eval('#keysKeyboard .tk-white-key', e => Number(e.dataset.midi)));
      const s = await page.evaluate(() => keysLesson.run.problem.notes.length);
      for (let j = 0; j < s; j++) { await pressKey(page, await expected(page)); await page.waitForTimeout(40); }
      await page.waitForTimeout(1000);
    }
    ok([...starts].every(m => m % 12 !== 0), `左はしは いつも ドではない（${[...starts].join(',')}）`);
    ok(starts.size >= 2, 'けんばんの場所が かわる');
    const blacks = await page.$$eval('#keysKeyboard .tk-black-key', l => l.length);
    ok(blacks === 10, `オニの 黒いけんばんは いつも 10こ（${blacks}）`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 7b. 見せる けんばんの はしで、黒いけんばんの かたまり（3こ・2こ）が かけない（3この かたまりが 2こに見えない）
  {
    const { page, errors } = await openPage(browser, 'index.html#/', MUSIC_ON);
    const bad = await page.evaluate(() => {
      const complete = ([from, to]) => {
        for (let m = from + 1; m < to; m++) {
          if (!TamaNotes.isBlack(m)) continue;
          const pc = m % 12, base = m - pc;
          const group = pc <= 3 ? [base + 1, base + 3] : [base + 6, base + 8, base + 10];
          if (!group.every(g => g > from && g < to)) return false;
        }
        return true;
      };
      const views = [...MODES.keys.levels.filter(l => l.view).map(l => [l.label, l.view]), ...KEYS_ONI_VIEWS.map(v => ['オニ', v])];
      return views.filter(([, v]) => !complete(v) || v[0] % 12 === 0).map(([label, v]) => `${label}:${v}`);
    });
    ok(bad.length === 0, `どのレベルも かたまりが かけない・左はしが ドでない ${bad.join(' ')}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 7c. ごほうびのドロップは けんばんの上に 左から ならび、2だんめは あいだに はまる。指で うごかせる
  {
    const { page, errors } = await openPage(browser, 'index.html#/keys', unlockAll);
    await page.click('#level2'); await page.waitForTimeout(300);
    for (let i = 0; i < 3; i++) {
      await pressKey(page, await expected(page));
      await page.waitForTimeout(1000);
    }
    const kbTop = await page.$eval('#keysKeyboard', e => e.getBoundingClientRect().top);
    const pile = await page.$$eval('.coin.keys-pile', l => l.map(c => ({ left: parseFloat(c.style.left), top: parseFloat(c.style.top) })));
    ok(pile.length === 3, `正解ごとに 1こ つもる（${pile.length}）`);
    ok(pile.every((c, i) => c.left === i * 32 && Math.abs(c.top - (kbTop - 32)) < 0.5), `けんばんの上に 左から ならぶ（32px）${JSON.stringify(pile)}`);
    const slots = await page.evaluate(() => [keysPileSlot(25, 1280, 500, 50), keysPileSlot(26, 1280, 500, 50), keysPileSlot(25 + 25, 1280, 500, 50)]);
    ok(slots[0].left === 25 && Math.abs(slots[0].top - (450 - 50 * Math.sqrt(3) / 2)) < 0.01 && slots[1].left === 75,
      `画面の はしまで ならんだら 2だんめは あいだに はまる ${JSON.stringify(slots)}`);
    ok(slots[2].left === 0 && slots[2].top < slots[0].top, '3だんめは また 左はしから');
    // 指（マウス）で うごかす
    await page.mouse.move(16, kbTop - 16); await page.mouse.down(); await page.mouse.move(300, 200, { steps: 5 }); await page.mouse.up();
    const moved = await page.$eval('.coin.keys-pile', c => ({ left: parseFloat(c.style.left), top: parseFloat(c.style.top) }));
    ok(Math.abs(moved.left - 284) < 3 && Math.abs(moved.top - 184) < 3, `つもった ドロップを うごかせる ${JSON.stringify(moved)}`);
    // けんばんは ふさがれない（つぎの問題も こたえられる）
    const before = await page.evaluate(() => keysLesson.run.index);
    await pressKey(page, await expected(page)); await page.waitForTimeout(1000);
    ok(await page.evaluate(() => keysLesson.run.index) === before + 1, 'ドロップが つもっても けんばんを おせる');
    // レベル選択へ もどると とびちる
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(2900);
    ok((await page.$$('.coin.keys-pile')).length === 0, 'もどると とびちって なくなる');

    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 7d. じゆうにひこう：画面の はしから はしまで。音名かくにん
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', MUSIC_ON);
    await page.click('#musicPiano'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/piano' && await page.isVisible('#pianoScreen'), 'おんがくのへやから じゆうにひこうへ');
    const kb = await page.$eval('#pianoKeyboard', e => { const r = e.getBoundingClientRect(); return { left: r.left, width: r.width }; });
    ok(kb.left === 0 && kb.width === 1280, `けんばんは 画面の 左はしから 右はしまで ${JSON.stringify(kb)}`);
    const whites = await page.$$eval('#pianoKeyboard .tk-white-key', l => l.map(e => Number(e.dataset.midi)));
    ok(whites.length === 23 && whites.includes(60), `パソコンの はばでは 白いけんばん 23こ（まんなかの ドを ふくむ）（${whites.length}）`);
    ok((await page.$$('#pianoKeyboard .tk-dim')).length === 0 && (await page.$$('#pianoKeyboard .tk-label')).length === 0, 'うすい けんばん・名前は なし');
    ok((await page.textContent('#pianoNames')) === '音名かくにん：OFF', 'さいしょは 音名かくにん OFF');
    await page.click('#pianoKeyboard .tk-key[data-midi="60"]'); await page.waitForTimeout(100);
    ok((await page.$$('#pianoKeyboard .tk-balloon')).length === 0 && await page.$eval('#pianoName', e => e.innerHTML === ''), 'OFF のときは 名前を出さない');
    await page.click('#pianoNames'); await page.waitForTimeout(100);
    ok((await page.textContent('#pianoNames')) === '音名かくにん：ON', '押すと ON');
    await page.click('#pianoKeyboard .tk-key[data-midi="64"]'); await page.waitForTimeout(100);
    ok((await page.textContent('#pianoKeyboard .tk-balloon')) === 'ミ' && await page.$eval('#pianoName svg', e => e.getAttribute('aria-label')) === 'ミ', 'ON のときは さわった音の名前（ミ）');
    await page.click('#pianoKeyboard .tk-key[data-midi="70"]'); await page.waitForTimeout(100);
    ok(await page.$eval('#pianoName svg', e => e.getAttribute('aria-label')) === 'ラ♯／シ♭', '黒いけんばんは 2つの名前');
    ok(await page.evaluate(() => (keysLesson.run === null) && !document.querySelector('.coin')), 'ドロップは もらえない');
    await page.reload(); await page.waitForTimeout(500);
    ok((await page.textContent('#pianoNames')) === '音名かくにん：ON', 'ON は おぼえている');
    // 画面の はばで けんばんの数が かわる
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
    const phone = await page.$$eval('#pianoKeyboard .tk-white-key', l => l.map(e => Number(e.dataset.midi)));
    ok(phone.length === 10 && phone.includes(60), `スマホの はばでは 10こ（${phone.length}）`);
    // けんばんの はばの スライダー
    ok(await page.isVisible('#pianoWidth') && Number(await page.$eval('#pianoWidth', e => e.value)) === 40, 'スライダーは いまの はば（スマホ 40px）');
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(300);
    await page.$eval('#pianoWidth', e => { e.value = 80; e.dispatchEvent(new Event('input')); }); await page.waitForTimeout(100);
    const wide = await page.$$eval('#pianoKeyboard .tk-white-key', l => l.map(e => e.getBoundingClientRect().width));
    ok(wide.length === 16 && Math.abs(wide[0] - 80) < 1, `はばを 80px に すると 白いけんばん 16こ（${wide.length}・${Math.round(wide[0])}px）`);
    await page.$eval('#pianoWidth', e => { e.value = 28; e.dispatchEvent(new Event('input')); }); await page.waitForTimeout(100);
    ok((await page.$$('#pianoKeyboard .tk-white-key')).length === 46, 'はばを 28px に すると 46こ');
    await page.reload(); await page.waitForTimeout(500);
    ok((await page.$$('#pianoKeyboard .tk-white-key')).length === 46 && Number(await page.$eval('#pianoWidth', e => e.value)) === 28, 'はばは おぼえている');
    await page.click('#pianoBack'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/music', '「もどる」で おんがくのへやへ');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }
  // 7e. じゆうにひこう：うたう（ドを ひくと「どー」。js/sing.js）
  {
    const { page, errors } = await openPage(browser, 'index.html#/piano', MUSIC_ON);
    ok((await page.textContent('#pianoSing')) === 'うたう：OFF', 'さいしょは うたう OFF');
    await page.evaluate(() => {
      window.sung = [];
      const voice = TamaSing.voice.bind(TamaSing);
      TamaSing.voice = (midi, o) => { window.sung.push(o && o.kind === 'cat' ? `cat${midi}` : midi); return voice(midi, o); };
    });
    await page.click('#pianoKeyboard .tk-key[data-midi="60"]'); await page.waitForTimeout(100);
    ok((await page.evaluate(() => window.sung.length)) === 0, 'OFF のときは うたわない');
    await page.click('#pianoSing'); await page.waitForTimeout(100);
    ok((await page.textContent('#pianoSing')) === 'うたう：ドレミ', '押すと ドレミ');
    for (const midi of [60, 62, 64, 65, 67, 69, 71, 72, 61]) { await page.click(`#pianoKeyboard .tk-key[data-midi="${midi}"]`); await page.waitForTimeout(40); }
    ok(JSON.stringify(await page.evaluate(() => window.sung)) === '[60,62,64,65,67,69,71,72]', '白いけんばんで うたう（黒いけんばんは ピアノだけ）');
    ok(JSON.stringify(await page.evaluate(() => [60, 62, 64, 65, 67, 69, 71, 61].map(m => TamaSing.syllableOf(m)))) === '["ど","れ","み","ふぁ","そ","ら","し",null]', 'ことばは ど・れ・み・ふぁ・そ・ら・し');
    // 声の高さは けんばんと 同じ（のばしている ところの 周期を はかる）
    const pitchCents = kind => page.evaluate(kind => [48, 60, 67, 72, 84].map(midi => {
      const rate = TamaSing.RATE;
      const b = TamaSing.render(midi, rate, kind);
      const from = Math.round(rate * 0.3), len = 2048;
      const r = []; let e0 = 0; for (let i = from; i < from + len; i++) e0 += b[i] * b[i];
      for (let lag = 0; lag < 1200; lag++) { let s = 0; for (let i = from; i < from + len; i++) s += b[i] * b[i + lag]; r[lag] = s / e0; }
      let lag = 5; while (r[lag] > 0.3) lag++;
      for (; lag < 1199; lag++) if (r[lag] > 0.8 && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) break;
      const exact = lag + (r[lag - 1] - r[lag + 1]) / (2 * (r[lag - 1] - 2 * r[lag] + r[lag + 1]));
      const want = 440 * Math.pow(2, (midi - 69) / 12);
      return Math.round(1200 * Math.log2(rate / exact / want));
    }), kind);
    const cents = await pitchCents('doremi');
    ok(cents.every(c => Math.abs(c) <= 5), `声の高さは けんばんと 同じ（ずれ ${cents.join('・')} セント）`);
    await page.waitForTimeout(800);
    ok((await page.evaluate(() => TamaSing.cache.size)) >= 20, '見えている 白いけんばんの 声は さきに つくっておく');
    await page.reload(); await page.waitForTimeout(500);
    ok((await page.textContent('#pianoSing')) === 'うたう：ドレミ', 'ドレミ は おぼえている');
    // ネコの「ニャー」
    await page.click('#pianoSing'); await page.waitForTimeout(100);
    ok((await page.textContent('#pianoSing')) === 'うたう：ニャー' && await page.$eval('#pianoSing', e => e.classList.contains('cat')), 'もう1回 押すと ニャー');
    await page.evaluate(() => {
      window.sung = [];
      const voice = TamaSing.voice.bind(TamaSing);
      TamaSing.voice = (midi, o) => { window.sung.push(o && o.kind === 'cat' ? `cat${midi}` : midi); return voice(midi, o); };
    });
    for (const midi of [60, 61, 62]) { await page.click(`#pianoKeyboard .tk-key[data-midi="${midi}"]`); await page.waitForTimeout(40); }
    ok(JSON.stringify(await page.evaluate(() => window.sung)) === '["cat60","cat61","cat62"]', 'ネコは 黒いけんばんでも なく');
    const catCents = await pitchCents('cat');
    ok(catCents.every(c => Math.abs(c) <= 5), `ニャーの 高さも けんばんと 同じ（ずれ ${catCents.join('・')} セント）`);
    ok(await page.evaluate(() => { const a = TamaSing.render(60, 24000, 'doremi'), b = TamaSing.render(60, 24000, 'cat'); return a.some((x, i) => x !== b[i]); }), 'ドレミ と ニャー は ちがう声');
    await page.reload(); await page.waitForTimeout(500);
    ok((await page.textContent('#pianoSing')) === 'うたう：ニャー', 'ニャー も おぼえている');
    await page.click('#pianoSing'); await page.waitForTimeout(100);
    ok((await page.textContent('#pianoSing')) === 'うたう：OFF', 'もう1回 押すと OFF にもどる');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }
  {
    const { page } = await openPage(browser, 'index.html#/piano');
    ok(await page.isVisible('#homeScreen') && !(await page.isVisible('#pianoScreen')), 'OFF のときは #/piano を開いても さいしょの画面');
    await page.close();
  }

  // 12. くろいけんばん：けんばんの Lv6 を クリアするまでは ひらかない
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', MUSIC_ON);
    ok(await page.$eval('#musicBlack', e => e.classList.contains('locked')), 'くろいけんばんは カギ（けんばんの Lv6 まだ）');
    await page.click('#musicBlack'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => location.hash) === '#/music', 'カギのときは おしても ひらかない');
    ok((await page.textContent('#notification')).includes('Lv6'), '「しろい けんばんの Lv6 を クリアすると ひらくよ」');
    await page.evaluate(() => { location.hash = '#/black'; }); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/music' && await page.isVisible('#musicScreen'), '#/black を ひらいても おんがくのへやへ');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  const blackOpen = { ...MUSIC_ON, keys_coins_7: JSON.stringify([{ image: '/img/Pmaru.png' }]) };
  const blackAll = { ...blackOpen };
  for (let l = 1; l <= 4; l++) blackAll[`black_coins_${l}`] = JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' }));

  // いまの問題を ぜんぶ正解する（「ド♯ ＝ ？♭」は ボタンで）
  async function answerAllBlack(page) {
    for (let guard = 0; guard < 600; guard++) {
      const s = await page.evaluate(() => {
        const r = keysLesson.run;
        if (!r || r.finished) return { done: true };
        if (!r.accepting || !r.problem) return { wait: true };
        return r.problem.type === 'name' ? { step: r.problem.answerStep } : { midi: r.problem.notes[r.pos] };
      });
      if (s.done) return;
      if (s.wait) { await page.waitForTimeout(150); continue; }
      if (s.step !== undefined) await page.click(`#keysAnswers .keys-answer[data-step="${s.step}"]`);
      else await pressKey(page, s.midi);
      await page.waitForTimeout(40);
    }
  }

  // 13. くろいけんばん Lv1 ♯：もとの音が 光って →。正解すると 2つの名前
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', blackOpen);
    ok(!(await page.$eval('#musicBlack', e => e.classList.contains('locked'))), 'けんばんの Lv6 の ドロップが あれば ひらく');
    await page.click('#musicBlack'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/black' && await page.isVisible('#openingScreen .title-black'), 'タイトルは「タマのくろいけんばんドロップス」');
    ok((await page.$$('.select-level-buttons button')).length === 5, 'レベルは 5こ（Lv1〜4・オニ）');
    await page.click('#level1'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => p.key));
    ok(deck.length === 15 && deck.every(k => k.endsWith('♯')), `Lv1 は ♯ だけ 15もん（${deck.join(' ')}）`);
    const g = await page.evaluate(() => {
      const p = keysLesson.run.problem;
      const key = document.querySelector('#keysKeyboard .tk-guide');
      return { base: p.guide.base, guided: key && Number(key.dataset.midi), arrow: key && key.querySelector('.tk-arrow').textContent, midi: p.notes[0] };
    });
    ok(g.guided === g.base && g.arrow === '→' && g.midi === g.base + 1, `もとの音が 光って →（${JSON.stringify(g)}）`);
    // まちがい：もとの音（白いけんばん）を おす
    await pressKey(page, g.base); await page.waitForTimeout(100);
    const name = await page.evaluate(() => keysLesson.run.problem.names[0]);
    ok(await page.evaluate(() => problemState.mistakes[0].correct) === name, `まちがいの せいかいは ♯の名前（${name}）`);
    await pressKey(page, g.midi); await page.waitForTimeout(100);
    const balloon = await page.textContent(`#keysKeyboard .tk-balloon[data-midi="${g.midi}"]`);
    ok(balloon.includes('♯／') && balloon.includes('♭'), `正解すると 2つの名前（${balloon}）`);
    await answerAllBlack(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex' && await page.textContent('#modalTitle') === 'Lv1 ♯、クリア！', 'Lv1 クリア');
    const stats = await page.evaluate(() => History.getStats('black'));
    ok(stats['ド♯'] && stats['ド♯'].n >= 3 && !stats['レ♭'], '♯の名前ごとに きろく（まちがえた問題は もういちど出るので 3かい以上）');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 14. くろいけんばん Lv2 ♭：←
  {
    const { page, errors } = await openPage(browser, 'index.html#/black', blackAll);
    await page.click('#level2'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => p.key));
    ok(deck.length === 15 && deck.every(k => k.endsWith('♭')), 'Lv2 は ♭ だけ');
    const g = await page.evaluate(() => {
      const p = keysLesson.run.problem;
      const key = document.querySelector('#keysKeyboard .tk-guide');
      return { base: p.guide.base, guided: Number(key.dataset.midi), arrow: key.querySelector('.tk-arrow').textContent, midi: p.notes[0] };
    });
    ok(g.guided === g.base && g.arrow === '←' && g.midi === g.base - 1, `もとの音が 光って ←（${JSON.stringify(g)}）`);
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(300);
    await page.click('#level3'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => keysLesson.run.deck.length) === 16 && (await page.$$('#keysKeyboard .tk-guide')).length === 0, 'Lv3 は 16もん・ガイドなし');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 15. くろいけんばん Lv4：「ド♯ ＝ ？♭」を ボタンで
  {
    const { page, errors } = await openPage(browser, 'index.html#/black', blackAll);
    await page.click('#level4'); await page.waitForTimeout(300);
    const p = await page.evaluate(() => { const p = keysLesson.run.problem; return { given: p.given, answer: p.answer, step: p.answerStep, acc: p.accidental, midi: p.notes[0] }; });
    ok((await page.$$('#keysAnswers .keys-answer')).length === 7, 'こたえの ボタンは 7こ（ド〜シ）');
    ok(await page.$eval(`#keysAnswers .keys-answer[data-step="${p.step}"]`, e => e.textContent) === p.answer, `ボタンの 名前（${p.answer}）`);
    ok(await page.evaluate(() => TamaNotes.namesOf(keysLesson.run.problem.notes[0]).includes(keysLesson.run.problem.answer)), 'こたえは 同じ けんばんの もうひとつの名前');
    // けんばんを おしても こたえには ならない
    await pressKey(page, p.midi); await page.waitForTimeout(100);
    ok(await page.evaluate(() => keysLesson.run.index === 1 && problemState.mistakeCount === 0), 'Lv4 は けんばんを おしても 鳴るだけ');
    const wrong = (p.step + 3) % 7;
    await page.click(`#keysAnswers .keys-answer[data-step="${wrong}"]`); await page.waitForTimeout(100);
    ok(await page.evaluate(() => problemState.mistakeCount) === 1, 'ちがう ボタンは まちがい');
    await page.click(`#keysAnswers .keys-answer[data-step="${p.step}"]`); await page.waitForTimeout(100);
    ok(await page.$eval('#keysCards .keys-question svg', e => e.getAttribute('aria-label')) === p.answer, '？が こたえに かわる');
    ok((await page.textContent(`#keysKeyboard .tk-balloon[data-midi="${p.midi}"]`)) === `${p.given} ＝ ${p.answer}`, 'けんばんの上に「ド♯ ＝ レ♭」');
    await answerAllBlack(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv4 クリア');
    // まちがえて ざんねん → いちらん
    await page.click('#completionModal >> text=もういちどちょうせん'); await page.waitForTimeout(300);
    for (let i = 0; i < 5; i++) {
      const st = await page.evaluate(() => keysLesson.run.problem.answerStep);
      await page.click(`#keysAnswers .keys-answer[data-step="${(st + 2) % 7}"]`); await page.waitForTimeout(80);
    }
    await page.waitForTimeout(200);
    const items = await page.$$eval('#mistakeList li', l => l.map(x => x.textContent));
    ok(items.length === 5 && /^「.[♯♭]? ＝ ？」で .+ を えらんだ 【せいかいは .+】$/.test(items[0].replace('ファ', 'フ')), `まちがいの いちらん：${items[0]}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 16. くろいけんばん オニ：ぜんぶ まぜる＋ひっかけ（ミ♯ ＝ ファ など）
  {
    const { page, errors } = await openPage(browser, 'index.html#/black', blackAll);
    ok(await page.isVisible('#level5'), 'オニが ひらく');
    await page.click('#level5'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => ({ key: p.key, type: p.type || 'press', trap: !!p.trap, midi: p.notes[0] })));
    ok(deck.length === 16 && deck.filter(p => p.type === 'name').length === 4 && deck.filter(p => p.trap).length === 4, 'オニは ♯♭ 8もん・2つの名前 4もん・ひっかけ 4もん');
    const traps = deck.filter(p => p.trap);
    const expectTrap = { 'ミ♯': 65, 'シ♯': 72, 'ファ♭': 64, 'ド♭': 59 };
    ok(traps.every(p => expectTrap[p.key] === p.midi), `ひっかけは 白いけんばん（${traps.map(p => `${p.key}=${p.midi}`).join(' ')}）`);
    await answerAllBlack(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'オニ クリア');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17. おんぷよみ：五線の 音符を 読んで けんばんを おす
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', MUSIC_ON);
    await page.click('#musicNotes'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/notes' && await page.isVisible('#openingScreen .title-notes'), 'おんがくのへやから おんぷよみへ（タイトル）');
    ok((await page.$$('.select-level-buttons button')).length === 8, 'おんぷよみの レベルは 8こ');
    await page.click('#level1'); await page.waitForTimeout(300);
    const s = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('#keysCards .staff-note .staff-head')];
      return { count: heads.length, y: heads[0] && Number(heads[0].getAttribute('cy')), want: TamaStaff.y(keysLesson.run.problem.notes[0]), clef: !!document.querySelector('#keysCards .staff-clef'), lines: document.querySelectorAll('#keysCards .staff-lines line').length };
    });
    ok(s.count === 1 && s.clef && s.lines === 5 && s.y === s.want, `五線（5本）・ト音記号・音符 1こ ${JSON.stringify(s)}`);
    ok(await page.$$eval('#keysKeyboard .tk-label', l => l.map(e => e.textContent).join('')) === 'ドレミ', 'Lv1 は けんばんに 名前あり');
    await answerAll(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex' && await page.textContent('#modalTitle') === 'Lv1 ドレミ、クリア！', 'おんぷよみ Lv1 クリア');
    const stats = await page.evaluate(() => History.getStats('notes'));
    ok(stats['ド'] && stats['ド'].n === 4, 'おんぷよみの きろく（ド 4かい）');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 18. 五線の 高さ・加線
  {
    const { page } = await openPage(browser, 'index.html#/', MUSIC_ON);
    const r = await page.evaluate(() => ({
      e4: TamaStaff.y(64), c4: TamaStaff.y(60), b4: TamaStaff.y(71), f5: TamaStaff.y(77), g5: TamaStaff.y(79),
      c4l: TamaStaff.ledgers(TamaStaff.y(60)), d4l: TamaStaff.ledgers(TamaStaff.y(62)), a5l: TamaStaff.ledgers(TamaStaff.y(81)), g5l: TamaStaff.ledgers(TamaStaff.y(79)),
    }));
    ok(r.e4 === 180 && r.b4 === 140 && r.f5 === 100 && r.c4 === 200 && r.g5 === 90, `ミは いちばん下の せん、シは まんなか、ファは いちばん上 ${JSON.stringify(r)}`);
    ok(r.c4l.join() === '200' && r.d4l.length === 0 && r.a5l.join() === '80' && r.g5l.length === 0, 'ドと 上のラ だけ みじかい せん（加線）');
    await page.close();
  }

  // 19. おんぷよみ Lv7 メロディ・オニ
  {
    const unlockNotes = { ...MUSIC_ON };
    for (let l = 1; l <= 7; l++) unlockNotes[`notes_coins_${l}`] = JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' }));
    const { page, errors } = await openPage(browser, 'index.html#/notes', unlockNotes);
    await page.click('#level7'); await page.waitForTimeout(300);
    const n = await page.evaluate(() => keysLesson.run.problem.notes.length);
    ok((await page.$$('#keysCards .staff-note')).length === n && await page.$eval('#keysCards .staff-note[data-i="0"]', e => e.classList.contains('current')), 'メロディは 1つの 五線に ならぶ（さいしょが いま）');
    await pressKey(page, await expected(page)); await page.waitForTimeout(100);
    ok(await page.$eval('#keysCards .staff-note[data-i="0"]', e => e.classList.contains('done')) && await page.$eval('#keysCards .staff-note[data-i="1"]', e => e.classList.contains('current')), '読んだ 音符は みどり、つぎが いま');
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(300);
    ok(await page.isVisible('#level8'), 'おんぷよみの オニが ひらく');
    await page.click('#level8'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => p.notes));
    ok(deck.length === 16 && deck.filter(x => x.length === 1).every(x => x[0] >= 60 && x[0] <= 79), 'オニは ド〜たかいソ の 1おん12もん＋メロディ4もん');
    const views = new Set();
    for (let i = 0; i < 3; i++) {
      views.add(await page.$eval('#keysKeyboard .tk-white-key', e => e.dataset.midi));
      const len = await page.evaluate(() => keysLesson.run.problem.notes.length);
      for (let j = 0; j < len; j++) { await pressKey(page, await expected(page)); await page.waitForTimeout(40); }
      await page.waitForTimeout(1000);
    }
    ok(views.size === 1 && views.has('59'), 'おんぷよみの オニは けんばんの場所が かわらない（読むことに 集中）');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 20. リズム：おんがくのへやから。さいしょは ちょうせい だけ
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', MUSIC_ON);
    await page.click('#musicRhythm'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/rhythm' && await page.isVisible('#openingScreen .title-rhythm'), 'おんがくのへやから リズムへ（タイトル）');
    ok((await page.$$('.select-level-buttons button')).length === 7 && await page.isVisible('#level1') && !(await page.isVisible('#level2')), 'リズムは 7レベル。さいしょは ちょうせい だけ');
    // しょうせつの つくりかた
    const bad = await page.evaluate(() => {
      const out = [];
      MODES.rhythm.levels.forEach(def => {
        for (let k = 0; k < 30; k++) {
          const bars = rhythmMakeBars(def);
          const n = def.fixed ? def.fixed.length : def.bars;
          if (bars.length !== n) out.push(`${def.label}:数`);
          bars.forEach(bar => {
            const beats = bar.reduce((s, t) => s + RHYTHM_TOKENS[t].beats, 0);
            if (beats !== 4) out.push(`${def.label}:${bar.join('')}`);
            if (bar.every(t => t === 'r')) out.push(`${def.label}:ぜんぶ やすみ`);
            if (def.tokens && bar.some(t => !def.tokens.includes(t))) out.push(`${def.label}:ちがう ことば`);
          });
          if ((def.required || []).some(t => !bars.flat().includes(t))) out.push(`${def.label}:${def.required}が ない`);
        }
      });
      return [...new Set(out)];
    });
    ok(bad.length === 0, `しょうせつは いつも 4はく・ぜんぶ やすみ なし・かならず 入れる ことばが 入る ${bad.join(' ')}`);
    ok(await page.evaluate(() => Math.abs(TamaSound.heardTime() - TamaSound.now()) < 0.5), 'たたいた 時刻を 音の時計に なおせる');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // テストを はやくするため、テンポを 240 に
  const fastRhythm = page => page.evaluate(() => MODES.rhythm.levels.forEach(l => { l.bpm = 240; }));
  // いまの レベルの 音符を ぜんぶ「ずれ（秒）」で たたいたことにする
  const tapAll = (page, late, skip = () => false) => page.evaluate(([late, skipSrc]) => {
    const run = rhythm.run;
    const skip = new Function('n', 'i', `return (${skipSrc})(n, i);`);
    run.timeline.notes.forEach((n, i) => { if (!skip(n, i)) rhythmJudge(run.start + n.beat * run.spb + late + (run.def.calibrate ? 0 : rhythmOffset())); });
  }, [late, skip.toString()]);
  const waitDone = page => page.waitForFunction(() => !rhythm.run || rhythm.run.phase === 'done' || rhythm.run.phase === 'ready', null, { timeout: 20000 });

  // 21. リズムの ちょうせい：たたく ずれを はかって おぼえる
  {
    const { page, errors } = await openPage(browser, 'index.html#/rhythm', MUSIC_ON);
    await fastRhythm(page);
    await page.click('#level1'); await page.waitForTimeout(300);
    ok(await page.isVisible('#rhythmScreen') && !(await page.isVisible('#keypadScreen')) && !(await page.isVisible('#rhythmDemo')), 'ちょうせいの 画面（おてほん なし）');
    ok((await page.$$('#rhythmLane .rh-note')).length === 8, 'ちょうせいは 8はく');
    // 3かい しか たたかない → もういちど
    await page.click('#rhythmStart'); await page.waitForTimeout(200);
    await tapAll(page, 0.05, (n, i) => i >= 3);
    await page.waitForFunction(() => rhythm.run.phase === 'ready', null, { timeout: 20000 });
    ok((await page.textContent('#rhythmMessage')).includes('5かい'), 'たたいた 数が すくないと「5かい いじょう たたいてね」');
    // 0.05びょう おそく たたく
    await page.click('#rhythmStart'); await page.waitForTimeout(200);
    await tapAll(page, 0.05);
    await waitDone(page); await page.waitForTimeout(300);
    ok(await page.textContent('#modalTitle') === 'ちょうせい できたよ！', 'ちょうせい できた');
    const offset = await page.evaluate(() => rhythmOffset());
    ok(Math.abs(offset - 0.05) < 0.002, `ずれを おぼえる（${offset}）`);
    ok((await page.textContent('#clearTime')).includes('+50'), `ずれを 見せる（${await page.textContent('#clearTime')}）`);
    const d = await page.evaluate(() => JSON.parse(localStorage.getItem('rhythm_coins_1')));
    ok(d.length === 1 && d[0].image === '/img/Lmaru.png', 'ちょうせいの ドロップは そのレベルの色');
    await page.click('#completionModal >> text=もんだいをえらぶ'); await page.waitForTimeout(300);
    ok(await page.isVisible('#level2'), 'Lv1 タン が ひらく');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  const rhythmAll = { ...MUSIC_ON, 'tamadoro.rhythm.offset': '0.05' };
  for (let l = 1; l <= 6; l++) rhythmAll[`rhythm_coins_${l}`] = JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' }));

  // 22. リズム Lv1：ぴったり たたくと 金・しょうせつごとに ドロップ
  {
    const { page, errors } = await openPage(browser, 'index.html#/rhythm', rhythmAll);
    await fastRhythm(page);
    await page.click('#level2'); await page.waitForTimeout(300);
    ok((await page.$$('#rhythmLane .rh-note')).length === 16 && (await page.$$('#rhythmLane .rh-syllable')).length === 16, 'Lv1 は タン 16こ（ことばつき）');
    // おてほん（たたかなくても ミスに ならない）
    await page.click('#rhythmDemo'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => rhythm.run.phase) === 'demo' && !(await page.isVisible('#rhythmStartButtons')), 'おてほん ちゅう');
    await page.waitForFunction(() => rhythm.run.phase === 'ready', null, { timeout: 20000 });
    ok(await page.evaluate(() => problemState.levelMistakes) === 0 && await page.isVisible('#rhythmStart'), 'おてほんの あとは また えらべる（ミス なし）');
    await page.click('#rhythmStart'); await page.waitForTimeout(200);
    await tapAll(page, 0.01); // ずれ（0.05）を ひいて 0.01びょう おそい → ぴったり
    await waitDone(page); await page.waitForTimeout(300);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex' && await page.textContent('#modalTitle') === 'Lv1 タン、クリア！', 'Lv1 クリア');
    ok((await page.textContent('#clearTime')) === 'ぴったり 16こ・いいね 0こ・ミス 0こ', `けっか（${await page.textContent('#clearTime')}）`);
    ok((await page.$$('#rhythmLane .rh-note.perfect')).length === 16, '音符が みどりに');
    const d = await page.evaluate(() => JSON.parse(localStorage.getItem('rhythm_coins_2')));
    ok(d[d.length - 1].image === '/img/Gmaru.png', 'ミスなしで 金のドロップ');
    ok((await page.$$('.coin')).length >= 4, `しょうせつごとに ドロップが とぶ（${(await page.$$('.coin')).length}）`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 23. リズム：はやすぎ・おそすぎ・おやすみで たたく と ミス → ざんねん
  {
    const { page, errors } = await openPage(browser, 'index.html#/rhythm', rhythmAll);
    await page.evaluate(() => MODES.rhythm.levels.forEach(l => { l.bpm = 120; })); // ウンの まんなかが となりの 音符から はなれる テンポ
    await page.click('#level3'); await page.waitForTimeout(300);
    await page.click('#rhythmStart'); await page.waitForTimeout(200);
    // 「いいね」の はんいを 1こ ためす
    const good = await page.evaluate(() => {
      const run = rhythm.run, n = run.timeline.notes[0];
      rhythmJudge(run.start + n.beat * run.spb + rhythmOffset() + 0.12);
      return n.result;
    });
    ok(good === 'good', `0.12びょう おそいと「いいね」（${good}）`);
    // ウンで たたく・ほかは たたかない
    const rests = await page.evaluate(() => {
      const run = rhythm.run;
      run.timeline.rests.forEach(r => rhythmJudge(run.start + (r.from + 0.5) * run.spb + rhythmOffset()));
      return run.timeline.rests.length;
    });
    await waitDone(page); await page.waitForTimeout(300);
    ok(await page.$eval('#mistakeModal', e => e.style.display) === 'flex', 'ミスが 4こ いじょうで ざんねん');
    const items = await page.$$eval('#mistakeList li', l => l.map(x => x.textContent));
    ok(items.some(t => /しょうせつめ：ウン（おやすみ）で たたいた/.test(t)) && items.some(t => /しょうせつめ：.+を たたけなかった/.test(t)), `ミスの いちらん（ウン ${rests}こ）：${items[0]}`);
    ok((await page.$$('#rhythmLane .rh-note.miss')).length > 0, 'たたかなかった 音符は 赤');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 24. リズム：画面を たたくと ポン（ボタンでは たたいたことに ならない）・もどると とまる
  {
    const { page, errors } = await openPage(browser, 'index.html#/rhythm', rhythmAll);
    await fastRhythm(page);
    await page.click('#level2'); await page.waitForTimeout(300);
    await page.evaluate(() => { window.__taps = 0; const orig = rhythmJudge; window.rhythmJudge = (...a) => { window.__taps++; return orig(...a); }; });
    await page.mouse.click(640, 400); await page.waitForTimeout(100);
    ok(await page.$eval('#rhythmPad', e => e.classList.contains('hit')), 'たたくと たいこが へこむ');
    ok(await page.evaluate(() => window.__taps) === 0, 'スタート まえは はんていしない');
    await page.click('#rhythmStart'); await page.waitForTimeout(150);
    await page.mouse.click(900, 650); await page.keyboard.press('Space'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => window.__taps) === 2, '画面の どこでも・スペースキーでも たたける');
    await page.click('#rhythmScreen .returnButton'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => rhythm.run === null) && await page.isVisible('#openingScreen'), 'もどると リズムは とまる');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 8. タマのきろく：けんばんの タブは まだ出さない（びんには ドロップが入る）
  {
    const { page, errors } = await openPage(browser, 'index.html#/records/keys', unlockAll);
    const tabs = await page.$$eval('#recordsTabs button', l => l.map(b => b.textContent));
    ok(!tabs.includes('けんばん') && tabs.length === 4, `きろくの タブ（${tabs.join('・')}）`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 9. 「おと なし」は テンキーの音にも効く（音の部品が ひとつ）
  {
    const { page, errors } = await openPage(browser, 'index.html#/add', { 'tamadoro.sound.muted': 'true' });
    const played = await page.evaluate(() => {
      let count = 0;
      const ctx = TamaSound.context();
      const orig = ctx.createBufferSource.bind(ctx);
      ctx.createBufferSource = () => { count++; return orig(); };
      TamaSound.playSE({ buffer: ctx.createBuffer(1, 1, 22050) });
      TamaSound.note(60);
      return count;
    });
    ok(played === 0, 'おと なし のときは 鳴らさない');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 10. 音のデータ
  {
    const { page } = await openPage(browser, 'index.html#/');
    const r = await page.evaluate(() => ({
      c: TamaNotes.namesOf(60), cs: TamaNotes.namesOf(61), bb: TamaNotes.namesOf(70),
      high: TamaNotes.lessonName(72), esharp: TamaNotes.keyOf(2, 1), csharp: TamaNotes.keyOf(0, 1), dflat: TamaNotes.keyOf(1, -1),
    }));
    ok(r.c.join() === 'ド' && r.cs.join() === 'ド♯,レ♭' && r.bb.join() === 'ラ♯,シ♭', '黒いけんばんには 2つの名前');
    ok(r.high === 'たかいド', '1つ上のドは「たかいド」');
    ok(r.csharp === r.dflat && r.csharp === 61, 'ド♯ と レ♭ は 同じけんばん');
    ok(r.esharp === 65, 'ミ♯ は ファ（白いけんばん）');
    await page.close();
  }

  await browser.close();
  console.log(failures === 0 ? 'ALL PASSED' : `${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
