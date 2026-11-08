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
// おんぷよみの データの 版（js/modes/notes.js の dataVersion）。ないと、入れておいた ドロップが はじめに 消える
const MUSIC_ON = { 'tamadoro.music.enabled': 'true', 'tamadoro.notes.dataVersion': '5' };
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
    // つぎの 音と「うけつけ中か」は いっしょに よむ（べつべつに よむと、問題の きりかわりの あいだに ずれて
    // 「おわった 問題の つぎの 音（ない音）」を おしてしまう ことが あった）
    const { midi, accepting } = await page.evaluate(() => {
      const run = keysLesson.run;
      const m = run && run.problem ? run.problem.notes[run.pos] : undefined;
      return { midi: m === undefined ? null : m, accepting: !!(run && run.accepting) };
    });
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
    ok((await page.$$('#musicScreen .music-lesson.coming')).length === 0
      && (await page.$$eval('#musicScreen .music-lesson', l => l.filter(b => b.offsetParent !== null).map(b => b.id).join())) === 'musicKeys,musicBlack,musicPiano,musicNotes,musicNotesBass,musicRhythm',
      'レッスンは 6こ（おんぷよみ ヘおん を ふくむ。ヘおんよみ（トロンボーン・ユーフォ／チューバ）は かくしている。じゅんびちゅう なし）');

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

  // 1b. ひみつの しかけ：さいしょの画面で Shift ＋「ひきざん」5かい（タブレットは「たしざん」を おさえて「ひきざん」5かい）で 出る・かくれる
  {
    const { page, errors } = await openPage(browser, 'index.html#/');
    const state = () => page.evaluate(() => ({ on: TamaMusic.enabled(), hash: location.hash, shown: getComputedStyle(document.getElementById('homeMusic')).display !== 'none' }));
    for (let i = 0; i < 4; i++) { await page.click('#homeSub', { modifiers: ['Shift'] }); await page.waitForTimeout(60); }
    const four = await state();
    await page.click('#homeSub', { modifiers: ['Shift'] }); await page.waitForTimeout(150);
    const five = await state();
    ok(!four.on && four.hash === '#/' && five.on && five.shown && five.hash === '#/' && (await page.textContent('#notification')).includes('ON'),
      `Shift ＋ ひきざん 5かいで おんがくのへやが 出る（4かいでは まだ。画面は うつらない）${JSON.stringify([four, five])}`);
    for (let i = 0; i < 5; i++) { await page.click('#homeSub', { modifiers: ['Shift'] }); await page.waitForTimeout(60); }
    const off = await state();
    ok(!off.on && !off.shown && off.hash === '#/', 'もう いちど 5かいで かくれる');
    // タブレット：たしざんを おさえた まま、べつの 指で ひきざんを 5かい（はなしても たしざんに うつらない）
    await page.evaluate(() => {
      const fire = (el, type, id) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId: id, isPrimary: id === 1 }));
      const add = document.getElementById('homeAdd'), sub = document.getElementById('homeSub');
      fire(add, 'pointerdown', 1);
      for (let i = 0; i < 5; i++) { fire(sub, 'pointerdown', 2 + i); fire(sub, 'pointerup', 2 + i); sub.click(); }
      fire(add, 'pointerup', 1);
      add.click();
    });
    await page.waitForTimeout(150);
    const tablet = await state();
    ok(tablet.on && tablet.shown && tablet.hash === '#/', `タブレット：たしざんを おさえて ひきざん 5かいで 出る ${JSON.stringify(tablet)}`);
    // ゆっくり おした ときは かぞえない
    await page.evaluate(() => { TamaMusicSecret.GAP = 100; });
    for (let i = 0; i < 5; i++) { await page.click('#homeSub', { modifiers: ['Shift'] }); await page.waitForTimeout(250); }
    ok((await state()).on, 'あいだが あいた ときは かぞえない');
    await page.evaluate(() => { TamaMusicSecret.GAP = 3000; });
    // ふつうの クリックは いつもどおり
    await page.waitForTimeout(900);
    await page.click('#homeSub'); await page.waitForTimeout(300);
    ok((await state()).hash === '#/sub', 'ふつうの クリックは ひきざんへ');
    await page.evaluate(() => TamaMusic.setEnabled(false));
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
  // 7e. じゆうにひこう：おと（ピアノ ⇄ ニャー。js/sing.js）
  {
    const { page, errors } = await openPage(browser, 'index.html#/piano', MUSIC_ON);
    ok((await page.textContent('#pianoSound')) === 'おと：ピアノ', 'さいしょは ピアノ');
    const spy = () => page.evaluate(() => {
      window.heard = [];
      const voice = TamaSing.voice.bind(TamaSing);
      const note = TamaSound.note.bind(TamaSound);
      TamaSing.voice = (midi, o) => { window.heard.push(`${o && o.kind}${midi}`); return voice(midi, o); };
      TamaSound.note = (midi, o) => { window.heard.push(`piano${midi}`); return note(midi, o); };
    });
    const press = async midis => { for (const midi of midis) { await page.click(`#pianoKeyboard .tk-key[data-midi="${midi}"]`); await page.waitForTimeout(40); } };
    await spy();
    await press([60, 61]);
    ok(JSON.stringify(await page.evaluate(() => window.heard)) === '["piano60","piano61"]', 'ピアノの ときは ピアノの音だけ');
    await page.click('#pianoSound'); await page.waitForTimeout(100);
    ok((await page.textContent('#pianoSound')) === 'おと：ニャー' && await page.$eval('#pianoSound', e => e.classList.contains('cat')), '押すと ニャー');
    await page.evaluate(() => { window.heard = []; });
    await press([60, 61, 62]);
    ok(JSON.stringify(await page.evaluate(() => window.heard)) === '["cat60","cat61","cat62"]', 'ニャーの ときは ネコの声だけ（黒いけんばんでも なく）');
    // 音名かくにん：ニャーの ときは 名前も ぜんぶ「ニャー」、ピアノの ときは ほんとうの 音名
    const shownName = async midi => {
      await page.click(`#pianoKeyboard .tk-key[data-midi="${midi}"]`); await page.waitForTimeout(80);
      return [await page.textContent(`#pianoKeyboard .tk-balloon[data-midi="${midi}"]`), await page.$eval('#pianoName svg', e => e.getAttribute('aria-label'))].join('|');
    };
    await page.click('#pianoNames'); await page.waitForTimeout(100);
    ok((await shownName(64)) === 'ニャー|ニャー' && (await shownName(70)) === 'ニャー|ニャー', 'ニャーの ときは 音名も「ニャー」（黒いけんばんも）');
    await page.click('#pianoSound'); await page.waitForTimeout(100);
    ok((await shownName(64)) === 'ミ|ミ' && (await shownName(70)) === 'ラ♯／シ♭|ラ♯／シ♭', 'ピアノに もどすと ほんとうの 音名');
    await page.click('#pianoSound'); await page.click('#pianoNames'); await page.waitForTimeout(100);
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
    const catCents = await pitchCents('cat');
    ok(catCents.every(c => Math.abs(c) <= 5), `ニャーの 高さは けんばんと 同じ（ずれ ${catCents.join('・')} セント）`);
    // とっておいた ドレミの 声（画面からは えらべない）も、高さは けんばんと 同じ
    const cents = await pitchCents('doremi');
    ok(cents.every(c => Math.abs(c) <= 5), `ドレミの 声の 高さも 同じ（ずれ ${cents.join('・')} セント）`);
    ok(JSON.stringify(await page.evaluate(() => [60, 62, 64, 65, 67, 69, 71, 61].map(m => TamaSing.syllableOf(m)))) === '["ど","れ","み","ふぁ","そ","ら","し",null]', 'ドレミの ことばは ど・れ・み・ふぁ・そ・ら・し');
    await page.waitForTimeout(800);
    ok((await page.evaluate(() => TamaSing.cache.size)) >= 20, '見えている けんばんの ニャーは さきに つくっておく');
    await page.reload(); await page.waitForTimeout(500);
    ok((await page.textContent('#pianoSound')) === 'おと：ニャー', 'ニャー は おぼえている');
    await page.click('#pianoSound'); await page.waitForTimeout(100);
    ok((await page.textContent('#pianoSound')) === 'おと：ピアノ', 'もう1回 押すと ピアノに もどる');
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

  // くろいけんばんの データの 版（js/modes/black.js の dataVersion）。ないと、入れておいた ドロップが はじめに 消える
  const blackOpen = { ...MUSIC_ON, 'tamadoro.black.dataVersion': '2', keys_coins_7: JSON.stringify([{ image: '/img/Pmaru.png' }]) };
  const blackAll = { ...blackOpen };
  for (let l = 1; l <= 5; l++) blackAll[`black_coins_${l}`] = JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' }));

  // いまの問題を ぜんぶ正解する（「ド♯ ＝ ？♭」は ボタンで）
  //   かえりちは 出た 問題の じゅんばん（'press'・'name'。もういちどの 問題は うしろに *）
  async function answerAllBlack(page) {
    const order = [];
    let last = null;
    for (let guard = 0; guard < 600; guard++) {
      const s = await page.evaluate(() => {
        const r = keysLesson.run;
        if (!r || r.finished) return { done: true };
        if (!r.accepting || !r.problem) return { wait: true };
        const id = `${r.index}/${r.isReview}/${r.reviewQueue.length}`;
        const tag = (r.problem.type || 'press') + (r.isReview ? '*' : '');
        return r.problem.type === 'name' ? { step: r.problem.answerStep, id, tag } : { midi: r.problem.notes[r.pos], id, tag };
      });
      if (s.done) return order;
      if (s.id && s.id !== last) { order.push(s.tag); last = s.id; }
      if (s.wait) { await page.waitForTimeout(150); continue; }
      if (s.step !== undefined) await page.click(`#keysAnswers .keys-answer[data-step="${s.step}"]`);
      else await pressKey(page, s.midi);
      await page.waitForTimeout(40);
    }
    return order;
  }

  // 12b. くろいけんばんを 作りなおした（版 2）：まえの 版の ドロップは 消える
  {
    const old = { ...MUSIC_ON, keys_coins_7: JSON.stringify([{ image: '/img/Pmaru.png' }]), black_coins_5: JSON.stringify(Array(3).fill({ image: '/img/Smaru.png' })) };
    const { page, errors } = await openPage(browser, 'index.html#/black', old);
    const left = await page.evaluate(() => ({ coins: localStorage.getItem('black_coins_5'), version: localStorage.getItem('tamadoro.black.dataVersion') }));
    ok(left.coins === null && left.version === '2', `まえの 版の ドロップは 消えて 版 2 に（${JSON.stringify(left)}）`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 13. くろいけんばん Lv1 ♯：もとの音を ふちどりして ↗。正解すると 2つの名前
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', blackOpen);
    ok(!(await page.$eval('#musicBlack', e => e.classList.contains('locked'))), 'けんばんの Lv6 の ドロップが あれば ひらく');
    await page.click('#musicBlack'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/black' && await page.isVisible('#openingScreen .title-black'), 'タイトルは「タマのくろいけんばんドロップス」');
    ok((await page.$$('.select-level-buttons button')).length === 6, 'レベルは 6こ（Lv1〜6）');
    ok(!(await page.textContent('#openingScreen')).includes('オニ'), '「オニ」という 名前は つかわない');
    await page.click('#level1'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => p.key));
    ok(deck.length === 10 && deck.every(k => k.endsWith('♯')), `Lv1 は ♯ だけ 10もん（${deck.join(' ')}）`);
    const g = await page.evaluate(() => {
      const p = keysLesson.run.problem;
      const key = document.querySelector('#keysKeyboard .tk-guide');
      return { base: p.guide.base, guided: key && Number(key.dataset.midi), arrow: key && key.querySelector('.tk-arrow').textContent, midi: p.notes[0] };
    });
    ok(g.guided === g.base && g.arrow === '↗' && g.midi === g.base + 1, `もとの音を ふちどりして ↗（${JSON.stringify(g)}）`);
    ok(await page.$eval('#keysKeyboard .tk-arrow', e => e.className) === 'tk-arrow up right', '矢印は 黒いけんばんの すぐ下（up right）');
    // もとの音（白いけんばん）を おすのは「おしい！」：まちがいに しない
    await pressKey(page, g.base); await page.waitForTimeout(100);
    const name = await page.evaluate(() => keysLesson.run.problem.names[0]);
    ok(await page.evaluate(() => problemState.mistakeCount) === 0, 'もとの音を おしても まちがいに しない');
    const near = await page.textContent('#keysMessage');
    ok(near.startsWith('おしい！') && near.includes(`${name}は その すぐ みぎどなり`), `「おしい！ そこが …」（${near}）`);
    ok((await page.textContent(`#keysKeyboard .tk-balloon[data-midi="${g.base}"]`)).startsWith('そこが '), 'けんばんの 上に「そこが レ！」');
    // まちがい：2つ となりの 白いけんばん
    await pressKey(page, g.base + 2); await page.waitForTimeout(100);
    ok(await page.evaluate(() => problemState.mistakes[0].correct) === name, `まちがいの せいかいは ♯の名前（${name}）`);
    await pressKey(page, g.midi); await page.waitForTimeout(100);
    const balloon = await page.textContent(`#keysKeyboard .tk-balloon[data-midi="${g.midi}"]`);
    ok(balloon.includes('♯／') && balloon.includes('♭'), `正解すると 2つの名前（${balloon}）`);
    await answerAllBlack(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex' && await page.textContent('#modalTitle') === 'Lv1 ♯、クリア！', 'Lv1 クリア');
    const stats = await page.evaluate(() => History.getStats('black'));
    ok(stats['ド♯'] && stats['ド♯'].n >= 2 && !stats['レ♭'], '♯の名前ごとに きろく（2かいずつ 出る）');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 14. くろいけんばん Lv2 ♭：←
  {
    const { page, errors } = await openPage(browser, 'index.html#/black', blackAll);
    await page.click('#level2'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => p.key));
    ok(deck.length === 10 && deck.every(k => k.endsWith('♭')), 'Lv2 は ♭ だけ 10もん');
    const g = await page.evaluate(() => {
      const p = keysLesson.run.problem;
      const key = document.querySelector('#keysKeyboard .tk-guide');
      return { base: p.guide.base, guided: Number(key.dataset.midi), arrow: key.querySelector('.tk-arrow').textContent, midi: p.notes[0] };
    });
    ok(g.guided === g.base && g.arrow === '↖' && g.midi === g.base - 1, `もとの音を ふちどりして ↖（${JSON.stringify(g)}）`);
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(300);
    await page.click('#level3'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => keysLesson.run.deck.length) === 16 && (await page.$$('#keysKeyboard .tk-guide')).length === 0, 'Lv3 は 16もん・矢印なし');
    ok((await page.$$('#keysKeyboard .tk-label')).length === 7, 'Lv3 は 白いけんばんの 名前が のこる（ド〜シ）');
    // せまい 画面では、つかわない けんばんを 見せない（ド〜シ の 7こ）
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(300);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('#level3'); await page.waitForTimeout(300);
    const narrow = await page.evaluate(() => ({ whites: document.querySelectorAll('#keysKeyboard .tk-white-key').length, dim: document.querySelectorAll('#keysKeyboard .tk-dim').length }));
    ok(narrow.whites === 7 && narrow.dim === 0, `せまい 画面は ド〜シ だけ（${JSON.stringify(narrow)}）`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 15. くろいけんばん Lv4：「ド♯ ＝ ？♭」を ボタンで
  {
    const { page, errors } = await openPage(browser, 'index.html#/black', blackAll);
    await page.click('#level4'); await page.waitForTimeout(300);
    const p = await page.evaluate(() => { const p = keysLesson.run.problem; return { given: p.given, answer: p.answer, step: p.answerStep, acc: p.accidental, midi: p.notes[0] }; });
    const buttons = await page.$$eval('#keysAnswers .keys-answer', l => l.map(b => b.textContent));
    ok(buttons.length === 5 && !buttons.some(b => /^(ド♭|ファ♭|ミ♯|シ♯)$/.test(b)), `こたえの ボタンは 黒いけんばんの 名前 5こ（${buttons.join(' ')}）`);
    ok(await page.$eval(`#keysAnswers .keys-answer[data-step="${p.step}"]`, e => e.textContent) === p.answer, `ボタンの 名前（${p.answer}）`);
    ok(await page.evaluate(() => TamaNotes.namesOf(keysLesson.run.problem.notes[0]).includes(keysLesson.run.problem.answer)), 'こたえは 同じ けんばんの もうひとつの名前');
    // けんばんを おしても こたえには ならない
    await pressKey(page, p.midi); await page.waitForTimeout(100);
    ok(await page.evaluate(() => keysLesson.run.index === 1 && problemState.mistakeCount === 0), 'Lv4 は けんばんを おしても 鳴るだけ');
    const wrong = await page.$$eval('#keysAnswers .keys-answer', (l, st) => Number(l.find(b => Number(b.dataset.step) !== st).dataset.step), p.step);
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
      const ng = await page.$$eval('#keysAnswers .keys-answer', (l, st) => Number(l.find(b => Number(b.dataset.step) !== st).dataset.step), st);
      await page.click(`#keysAnswers .keys-answer[data-step="${ng}"]`); await page.waitForTimeout(80);
    }
    await page.waitForTimeout(200);
    const items = await page.$$eval('#mistakeList li', l => l.map(x => x.textContent));
    ok(items.length === 5 && /^「.[♯♭]? ＝ ？」で .+ を えらんだ 【せいかいは .+】$/.test(items[0].replace('ファ', 'フ')), `まちがいの いちらん：${items[0]}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  const expectWhite = { 'ミ♯': 65, 'シ♯': 72, 'ファ♭': 64, 'ド♭': 59 };

  // 16. くろいけんばん Lv5：白いけんばんに なる 名前（ミ♯ ＝ ファ など）。はじめの 4もんは 1つずつ 矢印つき
  {
    const { page, errors } = await openPage(browser, 'index.html#/black', blackAll);
    await page.click('#level5'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => ({ key: p.key, midi: p.notes[0], arrow: !!p.arrow, onWhite: !!p.onWhite })));
    ok(deck.length === 12 && deck.every(p => p.onWhite && expectWhite[p.key] === p.midi), `Lv5 は 白いけんばんに なる 名前 12もん（${deck.map(p => p.key).join(' ')}）`);
    ok(deck.slice(0, 4).map(p => p.key).join(' ') === 'ミ♯ ファ♭ シ♯ ド♭' && deck.slice(0, 4).every(p => p.arrow) && !deck.slice(4).some(p => p.arrow), 'はじめの 4もんは 1つずつ 矢印つき');
    ok(deck.every((p, i) => i === 0 || p.key !== deck[i - 1].key), 'おなじ 問題は つづけて 出ない');
    const g = await page.evaluate(() => {
      const key = document.querySelector('#keysKeyboard .tk-guide');
      return { guided: Number(key.dataset.midi), arrow: key.querySelector('.tk-arrow').textContent, say: document.getElementById('keysMessage').textContent };
    });
    ok(g.guided === 64 && g.arrow === '→' && g.say.includes('くろい けんばんは ないよ'), `ミが ふちどりで →・「ミの すぐ みぎどなりに、くろい けんばんは ないよ」（${JSON.stringify(g)}）`);
    await pressKey(page, 65); await page.waitForTimeout(100);
    ok((await page.textContent('#keysKeyboard .tk-balloon[data-midi="65"]')) === 'ミ♯は ファ！', '正解すると「ミ♯は ファ！」');
    // オクターブは くべつしない：シ♯ は ひくい ほうの ド（60）、ド♭ は たかい ほうの シ（71）でも 正解
    const waitFor = key => page.waitForFunction(k => keysLesson.run.accepting && keysLesson.run.problem.key === k, key);
    await waitFor('ファ♭'); await pressKey(page, 64);
    await waitFor('シ♯'); await pressKey(page, 60); await page.waitForTimeout(100);
    ok((await page.textContent('#keysKeyboard .tk-balloon[data-midi="60"]')) === 'シ♯は ド！', 'シ♯ は どの ドでも 正解（「シ♯は ド！」）');
    await waitFor('ド♭'); await pressKey(page, 71); await page.waitForTimeout(100);
    ok((await page.textContent('#keysKeyboard .tk-balloon[data-midi="71"]')) === 'ド♭は シ！', 'ド♭ は どの シでも 正解');
    ok(await page.evaluate(() => problemState.mistakeCount) === 0, 'オクターブちがいは まちがいに しない');
    await answerAllBlack(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv5 クリア');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 16b. くろいけんばん Lv6：ぜんぶ まぜる。名前なし（「けんばんの よみかた」で 出せる）
  {
    const { page, errors } = await openPage(browser, 'index.html#/black', blackAll);
    ok(await page.isVisible('#level6'), 'Lv6 が ひらく');
    ok(await page.evaluate(() => [2, 3, 4, 5, 6].every(l => MODES.black.coinsToUnlock(l) === 3)), 'どの レベルも ドロップ 3こで ひらく（Lv6 も）');
    await page.click('#level6'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => ({ key: p.key, type: p.type || 'press', onWhite: !!p.onWhite, midi: p.notes[0] })));
    ok(deck.length === 20 && deck.filter(p => p.type === 'name').length === 8 && deck.filter(p => p.onWhite).length === 4, 'Lv6 は ♯♭ 8もん・白いけんばんの 名前 4もん・2つの名前 4もん・「ド♭ ＝ ？」4もん');
    ok(deck.slice(0, 12).every(p => p.type === 'press') && deck.slice(12).every(p => p.type === 'name'), '前半 12もんは けんばん、後半 8もんは ボタン');
    const whiteNames = deck.filter(p => p.type === 'name' && !p.key.slice(p.key.indexOf('＝')).match(/[♯♭]/)).map(p => p.key).sort();
    ok(whiteNames.join(' ') === ['ミ♯＝ファ', 'ファ♭＝ミ', 'シ♯＝ド', 'ド♭＝シ'].sort().join(' '), `後半に「ド♭ ＝ シ」など 4もん（${whiteNames.join(' ')}）`);
    ok(new Set(deck.map(p => p.key)).size === 20, `同じ 問題は 出ない（${deck.map(p => p.key).join(' ')}）`);
    const whites = deck.filter(p => p.onWhite);
    ok(whites.every(p => expectWhite[p.key] === p.midi), `白いけんばんに なる（${whites.map(p => `${p.key}=${p.midi}`).join(' ')}）`);
    ok((await page.$$('#keysKeyboard .tk-label')).length === 0 && await page.isVisible('#keysHelp'), '名前なし・「けんばんの よみかた」スイッチ');
    await page.click('#keysHelpCheckbox'); await page.waitForTimeout(100);
    ok((await page.$$('#keysKeyboard .tk-label')).length === 9, 'スイッチを ON に すると 名前（ひくいシ〜たかいド）');
    // さいしょの 問題で まちがえる（こたえでも もとの音でもない けんばん）→ その 問題は 後半の まえに もういちど
    const wrong = await page.evaluate(() => {
      const p = keysLesson.run.problem;
      const same = (a, b) => (((a - b) % 12) + 12) % 12 === 0;
      for (let m = 60; m <= 71; m++) if (!same(m, p.notes[0]) && !same(m, p.guide.base)) return m;
    });
    await pressKey(page, wrong); await page.waitForTimeout(100);
    ok(await page.evaluate(() => problemState.mistakeCount) === 1, 'Lv6：まちがい 1かい');
    const order = await answerAllBlack(page);
    const firstName = order.indexOf('name');
    ok(order.length === 21 && order.slice(0, firstName).filter(t => t === 'press*').length === 1 && order.slice(firstName).every(t => t === 'name'),
      `まちがえた けんばんの 問題は 後半（ボタン）の まえに もういちど（${order.join(' ')}）`);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv6 クリア');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 16c. くろいけんばん Lv6 の「ド♭ ＝ ？」：♯・♭ なしの ド〜シ の ボタンで こたえる（こたえは シ）
  {
    const { page, errors } = await openPage(browser, 'index.html#/black', blackAll);
    await page.click('#level6'); await page.waitForTimeout(300);
    await page.evaluate(() => { keysLesson.run.problem = keysEnharmonic([0, -1]); keysShowCards(); });
    const buttons = await page.$$eval('#keysAnswers .keys-answer', l => l.map(b => b.textContent));
    ok(buttons.join(' ') === 'ド レ ミ ファ ソ ラ シ', `ボタンは ♯・♭ なしの ド〜シ 7こ（${buttons.join(' ')}）`);
    ok(await page.$eval('#keysCards .keys-question svg', e => e.getAttribute('aria-label')) === '？', 'こたえの カードは「？」だけ');
    await page.click('#keysAnswers .keys-answer[data-step="0"]'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => problemState.mistakes.length === 1 && problemState.mistakes[0].pressed === 'ド' && problemState.mistakes[0].correct === 'シ'), 'ド を えらぶと まちがい（せいかいは シ）');
    await page.click('#keysAnswers .keys-answer[data-step="6"]'); await page.waitForTimeout(100);
    ok(await page.$eval('#keysCards .keys-question svg', e => e.getAttribute('aria-label')) === 'シ', '？が シ に かわる');
    ok((await page.textContent('#keysKeyboard .tk-balloon[data-midi="59"]')) === 'ド♭ ＝ シ', 'けんばんの 上に「ド♭ ＝ シ」');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17. おんぷよみ：五線の 音符を 読んで けんばんを おす
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', MUSIC_ON);
    await page.click('#musicNotes'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/notes' && await page.isVisible('#openingScreen .title-notes'), 'おんがくのへやから おんぷよみへ（タイトル）');
    ok((await page.$$('.select-level-buttons button')).length === 10, 'おんぷよみの レベルは 10こ（しくみ ＋ Lv1〜Lv8 ＋ マスタークラス）');
    ok(await page.isVisible('#level1') && !(await page.isVisible('#level2')), 'さいしょは しくみ だけ');
    await page.evaluate(() => localStorage.setItem('notes_coins_1', JSON.stringify([{ image: '/img/Lmaru.png' }])));
    await page.reload(); await page.waitForTimeout(500);
    ok(await page.isVisible('#level2'), 'しくみで ドロップを 1こ もらうと Lv1 が ひらく');
    await page.click('#level2'); await page.waitForTimeout(300);
    // Lv1 せんの おだんご：さいしょは 名前つきの お手本（ド・ミ・ソ を 1本の くしに）
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => (p.dango ? 'D' : '') + p.notes.join(',')));
    ok(deck.length === 13 && deck[0] === 'D60,64,67' && deck.filter(x => x === 'D60,64,67').length === 4
      && ['60', '64', '67'].every(n => deck.filter(x => x === n).length === 3), `お手本 ＋ 1おん 9もん ＋ おだんご 3もん ${JSON.stringify(deck)}`);
    const s = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('#keysCards .staff-note .staff-head')];
      return {
        count: heads.length, ys: heads.map(h => Number(h.getAttribute('cy'))).join(','), want: [60, 64, 67].map(m => TamaStaff.y(m)).join(','),
        xs: new Set(heads.map(h => h.getAttribute('cx'))).size, skewer: document.querySelectorAll('#keysCards .staff-skewer').length,
        names: [...document.querySelectorAll('#keysCards .staff-dango-name')].map(t => t.textContent).join(''),
        clef: !!document.querySelector('#keysCards .staff-clef'), lines: document.querySelectorAll('#keysCards .staff-lines line').length,
      };
    });
    ok(s.count === 3 && s.xs === 1 && s.skewer === 1 && s.ys === s.want && s.names === 'ドミソ' && s.clef && s.lines === 5, `おだんご：1本の くしに ド・ミ・ソ（名前つき）${JSON.stringify(s)}`);
    // おだんごの 色は 音の 色：ドミソ と レファラ は ちがう 色、シは あたらしい 色、たかいドは ドと 同じ
    const colors = await page.evaluate(() => {
      const fill = notes => { const box = document.createElement('div'); box.innerHTML = TamaStaff.svg(notes, { dango: true }); return [...box.querySelectorAll('.staff-head')].map(h => h.style.fill); };
      const [c, e, g, b] = fill([60, 64, 67, 71]);
      const [d, f, a, c5] = fill([62, 65, 69, 72]);
      return { line: [c, e, g], space: [d, f, a], b, c, c5 };
    });
    ok(colors.line.every(x => !colors.space.includes(x)) && new Set([...colors.line, ...colors.space, colors.b]).size === 7 && colors.c5 === colors.c,
      `おだんごの 色：ドミソ と レファラ は ちがう、シは あたらしい 色、たかいドは ドと 同じ ${JSON.stringify(colors)}`);
    ok(await page.$$eval('#keysKeyboard .tk-label', l => l.map(e => e.textContent).join('')) === 'ドレミファソ', 'Lv1 は けんばんに 名前あり');
    const ring = () => page.evaluate(() => { const r = document.querySelector('#keysKeyboard .tk-ring'); return r ? Number(r.parentElement.dataset.midi) : null; });
    ok((await ring()) === 60, 'お手本：ドの けんばんに わっか');
    await pressKey(page, 60); await page.waitForTimeout(80);
    ok((await ring()) === 64 && await page.$eval('#keysCards .staff-note[data-i="1"]', e => e.classList.contains('current')), 'ドを おすと わっかは ミへ（つぎの おだんご）');
    await pressKey(page, 67); await page.waitForTimeout(80);
    ok(await page.evaluate(() => keysLesson.run.pos) === 1, 'おだんごは 下から じゅんばん（とばすと まちがい）');
    await answerAll(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex' && await page.textContent('#modalTitle') === 'Lv1 せんの おだんご、クリア！', 'おんぷよみ Lv1 クリア');
    const stats = await page.evaluate(() => History.getStats('notes'));
    ok(stats['ド'] && stats['ド'].n >= 3, 'おんぷよみの きろく（ド）');
    ok(await page.evaluate(() => { const def = MODES.notes.levels[2]; return keysDangoDeck(def).every(p => p.chord === 'Dm'); }), 'Lv2 は 1おんの 問題も 和音は Dm だけ');
    // Lv2 あいだの おだんご：レ・ファ・ラ（和音は Dm）
    const lv2 = await page.evaluate(() => { const d = MODES.notes.levels[2]; const g = d.dangos[0]; return { notes: g.notes.join(','), chord: g.chord, dm: TamaSound.CHORDS.Dm.join(','), hint: d.hint, space: g.notes.every(m => !TamaStaff.onLine(m)), line: MODES.notes.levels[1].dangos[0].notes.every(m => TamaStaff.onLine(m)) }; });
    ok(lv2.notes === '62,65,69' && lv2.chord === 'Dm' && lv2.dm === '50,53,57' && lv2.hint.startsWith('せんの あいだの おだんご') && lv2.space && lv2.line,
      `Lv2 は せんの あいだの おだんご（レ・ファ・ラ）、Lv1 は ぜんぶ せんの上 ${JSON.stringify(lv2)}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17a. おんぷよみ Lv3 おだんご まぜ・Lv4 おだんごの つづき・Lv6 うえの おと・Lv7 したの おと（もんだいの つくりかた）
  {
    const { page, errors } = await openPage(browser, 'index.html#/', MUSIC_ON);
    const r = await page.evaluate(() => {
      const deck = n => keysDangoDeck(MODES.notes.levels[n]);
      const show = p => (p.dango ? 'D' : '') + p.notes.join(',');
      const out = {};
      [3, 4, 6, 7].forEach(n => {
        const d = deck(n + 0);
        const def = MODES.notes.levels[n];
        out[n] = {
          len: d.length,
          intros: d.filter(p => p.showNames).map(show),
          dangos: [...new Set(d.filter(p => p.dango && !p.showNames).map(show))].sort(),
          singlesInActive: d.filter(p => !p.dango).every(p => p.notes[0] >= def.active[0] && p.notes[0] <= def.active[1]),
          chordsMatch: d.filter(p => !p.dango).every(p => ((def.singleChords || {})[p.notes[0]] || def.dangos.find(g => g.notes.includes(p.notes[0])).chord) === p.chord),
          singleChords: [...new Set(d.filter(p => !p.dango).map(p => `${p.notes[0]}:${p.chord}`))].sort().join(','),
          dangoChords: [...new Set(d.filter(p => p.dango).map(p => p.chord))].sort().join(','),
          label: def.label,
        };
      });
      out.chords = ['Cmaj7', 'Dm7', 'G7'].every(c => Array.isArray(TamaSound.CHORDS[c]));
      out.upper = MODES.notes.levels[6].dangos[0].notes.every(m => TamaStaff.onLine(m)) && MODES.notes.levels[6].dangos[1].notes.every(m => !TamaStaff.onLine(m));
      out.lower = MODES.notes.levels[7].dangos[0].notes.every(m => TamaStaff.onLine(m)) && MODES.notes.levels[7].dangos[1].notes.every(m => !TamaStaff.onLine(m));
      out.lowNames = [57, 59].map(m => TamaNotes.lessonName(m)).join(',');
      return out;
    });
    ok(r[3].label === 'Lv3 おだんご まぜ' && r[3].len === 16 && r[3].intros.length === 0 && r[3].dangos.join('|') === 'D60,64,67|D62,65,69' && r[3].singlesInActive && r[3].chordsMatch,
      `Lv3 おだんご まぜ：ド・ミ・ソ と レ・ファ・ラ（1おん 12 ＋ おだんご 4）${JSON.stringify(r[3])}`);
    ok(r[4].label === 'Lv4 おだんごの つづき' && r[4].len === 18 && r[4].intros.join('|') === 'D60,64,67,71|D62,65,69,72' && r[4].singlesInActive && r.chords,
      `Lv4 おだんごの つづき：4つだま（シ・たかいド）の お手本 2つ ${JSON.stringify(r[4])}`);
    ok(r[4].singleChords === '60:C,62:Dm,64:C,65:Dm,67:C,69:Dm,71:Em,72:C' && r[4].dangoChords === 'Cmaj7,Dm7',
      `Lv4 の 1おんは これまでと 同じ ひびき（C・Dm）、シは Em、たかいドは C。おだんごは Cmaj7・Dm7 ${r[4].singleChords} / ${r[4].dangoChords}`);
    ok(r[6].label === 'Lv6 うえの おと' && r[6].len === 18 && r[6].intros.join('|') === 'D71,74,77|D72,76,79' && r[6].singlesInActive && r[6].chordsMatch && r.upper,
      `Lv6 うえの おと：うえの せんの おだんご・あいだの おだんご ${JSON.stringify(r[6])}`);
    ok(r[7].label === 'Lv7 したの おと' && r[7].len === 22 && r[7].intros.join('|') === 'D57,60,64|D59,62,65' && r[7].singlesInActive && r[7].chordsMatch && r.lower
      && r[7].dangoChords === 'Am,G7' && r.lowNames === 'ひくいラ,ひくいシ',
      `Lv7 したの おと：したの せんの おだんご（ひくいラ・ド・ミ ＝ Am）・あいだの おだんご（ひくいシ・レ・ファ ＝ G7）${JSON.stringify(r[7])}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17d. おんぷよみ Lv5：けんばんの よみかた スイッチ／Lv6：あかるい けんばんは 右がわ
  {
    const unlock = { ...MUSIC_ON };
    for (let l = 1; l <= 6; l++) unlock[`notes_coins_${l}`] = JSON.stringify(Array(3).fill({ image: '/img/Lmaru.png' }));
    const { page, errors } = await openPage(browser, 'index.html#/notes', unlock);
    await page.click('#level6'); await page.waitForTimeout(300);
    const labels = () => page.$$eval('#keysKeyboard .tk-label', l => l.map(e => e.textContent).join(''));
    ok(await page.isVisible('#keysHelp') && !(await page.isChecked('#keysHelpCheckbox')) && (await labels()) === '', 'Lv5 は スイッチ OFF（けんばんに 名前なし）');
    await page.click('#keysHelp label'); await page.waitForTimeout(100);
    ok(await page.isChecked('#keysHelpCheckbox') && (await labels()) === 'ドレミファソラシド', 'スイッチ ON で けんばんに 名前');
    await pressKey(page, await expected(page)); await page.waitForTimeout(1000);
    ok((await labels()) === 'ドレミファソラシド', 'つぎの 問題でも 名前は 出たまま');
    await page.click('#keysHelp label'); await page.waitForTimeout(100);
    ok(!(await page.isChecked('#keysHelpCheckbox')) && (await labels()) === '', 'もう1回 おすと OFF（トグル）');
    await page.click('#keysHelp label'); await page.waitForTimeout(100);
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(300);
    await page.click('#level7'); await page.waitForTimeout(300);
    ok(!(await page.isVisible('#keysHelp')), 'Lv6（名前あり）には スイッチなし');
    const kb = await page.evaluate(() => {
      const keys = [...document.querySelectorAll('#keysKeyboard .tk-white-key')];
      const bright = keys.filter(k => !k.classList.contains('tk-dim'));
      const first = keys.indexOf(bright[0]);
      return { all: keys.length, left: first, right: keys.length - 1 - keys.indexOf(bright[bright.length - 1]), from: keys[0].dataset.midi };
    });
    ok(kb.left > kb.right && kb.left >= 6 && kb.from === '59', `Lv6 は あかるい けんばんが 右がわ（左に くらい けんばん ${kb.left}こ、右に ${kb.right}こ）`);
    // けんばんは 画面の 下。はじめにもどる は まん丸（けんばんに かさなる）で、マウスを のせると のびる
    const layout = await page.evaluate(() => {
      const kb = document.getElementById('keysKeyboard').getBoundingClientRect();
      const back = document.querySelector('#keysScreen .round-return');
      const r = back.getBoundingClientRect();
      return { kbBottom: innerHeight - kb.bottom, kbHeight: kb.height, w: r.width, h: r.height, label: back.getAttribute('aria-label'), over: r.top < kb.bottom && r.bottom > kb.top,
        z: Number(getComputedStyle(back).zIndex) > Number(getComputedStyle(document.getElementById('keysKeyboard')).zIndex) };
    });
    await page.hover('#keysScreen .round-return'); await page.waitForTimeout(500);
    const wide = await page.evaluate(() => document.querySelector('#keysScreen .round-return').getBoundingClientRect().width);
    await page.mouse.move(640, 10); await page.waitForTimeout(400);
    ok(layout.kbBottom <= 10 && layout.kbHeight <= 270 && Math.abs(layout.w - layout.h) < 2 && layout.label === 'はじめにもどる' && layout.over && layout.z && wide > layout.w * 2,
      `けんばんは 画面の 下・はじめにもどる は まん丸で 上に かさなり、マウスで のびる ${JSON.stringify({ ...layout, wide })}`);
    // けんばんの おおきさ（右上の スライダー）：はばも たかさも 同じ わりあい。上の 文字も いっしょに 上下。おぼえておく
    const zoom = async () => page.evaluate(() => { const kb = document.getElementById('keysKeyboard').getBoundingClientRect(); const st = document.querySelector('#keysScreen .keys-stage').getBoundingClientRect();
      return { w: kb.width, h: kb.height, top: kb.top, stage: st.bottom, value: document.getElementById('keysZoom').value }; });
    const z1 = await zoom();
    await page.evaluate(() => { const r = document.getElementById('keysZoom'); r.value = '1.5'; r.dispatchEvent(new Event('input')); });
    const z2 = await zoom();
    ok(z1.value === '1' && Math.abs(z2.w / z1.w - 1.5) < 0.02 && Math.abs(z2.h / z1.h - 1.5) < 0.02 && z2.top < z1.top && Math.abs((z1.top - z1.stage) - (z2.top - z2.stage)) < 2,
      `けんばんの おおきさ：はばも たかさも 1.5ばい、上の 文字も いっしょに 上がる ${JSON.stringify([z1, z2])}`);
    await page.reload(); await page.waitForTimeout(500);
    await page.click('#level7'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => document.getElementById('keysZoom').value === '1.5' && localStorage.getItem('tamadoro.keys.zoom') === '1.5'), 'けんばんの おおきさは おぼえておく');
    await page.evaluate(() => { const r = document.getElementById('keysZoom'); r.value = '1'; r.dispatchEvent(new Event('input')); });
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(300);
    await page.click('#level6'); await page.waitForTimeout(300);
    ok(!(await page.isChecked('#keysHelpCheckbox')) && (await labels()) === '', 'もう一度 ひらくと スイッチは OFF から');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17b. おんぷよみ しくみ：せんは 5ほん → ドの ばしょ → のぼる・くだる（せん・あいだ）→ つづけて 読む
  {
    const { page, errors } = await openPage(browser, 'index.html#/notes', MUSIC_ON);
    await page.evaluate(() => {
      window.sung = [];
      const voice = TamaSing.voice.bind(TamaSing);
      TamaSing.voice = (midi, o) => { window.sung.push(`${o && o.kind}${midi}`); return voice(midi, o); };
    });
    await page.click('#level1'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => p.type || p.notes.join(',')));
    ok(deck.length === 8 && deck[0] === 'lines' && deck[1] === '60' && deck[2] === '60,62,64,65,67,69,71,72' && deck[3] === '72,71,69,67,65,64,62,60', `しくみの ながれ ${JSON.stringify(deck)}`);
    // せんは 5ほん：下から じゅんばんに タッチ
    ok((await page.$$('#keysCards .staff-line-hit')).length === 5 && (await page.$$('#keysCards .staff-note')).length === 0, 'さいしょは せんだけ（タッチできる せん 5ほん）');
    ok((await page.$$('#keysCards .staff-lines line.beckon')).length === 1 && (await page.textContent('#keysCards .staff-line-push')) === 'おしてね', '1ぽんめが 点滅して「おしてね」');
    await page.click('#keysCards .staff-line-hit[data-line="3"]'); await page.waitForTimeout(80);
    ok((await page.$$('#keysCards .staff-lines line.counted')).length === 0 && (await page.textContent('#keysMessage')).includes('1ぽんめは いちばん下'), '下から じゅんばんで ないと かぞえない');
    const counts = [];
    for (const l of [1, 2, 3, 4, 5]) {
      await page.click(`#keysCards .staff-line-hit[data-line="${l}"]`); await page.waitForTimeout(80);
      counts.push((await page.textContent('#keysMessage')).split('！')[0]);
      if (l === 1) ok((await page.$$('#keysCards .staff-lines line.beckon')).length === 0, 'かぞえはじめたら 点滅は おわり');
    }
    ok(counts.join('・') === '1ぽんめ・2ほんめ・3ぼんめ・4ほんめ・5ほんめ', `1ぽんめ・2ほんめ・3ぼんめ・4ほんめ・5ほんめ（${counts.join('・')}）`);
    ok((await page.$$eval('#keysCards .staff-line-number', l => l.map(e => e.textContent).join('・'))) === '5ほんめ・4ほんめ・3ぼんめ・2ほんめ・1ぽんめ', 'せんの よこにも 1ぽんめ〜5ほんめ');
    ok((await page.$$('#keysCards .staff-lines line.counted')).length === 5 && (await page.textContent('#keysMessage')).includes('せんは 5ほん'), 'せんは 5ほん');
    await page.waitForTimeout(2000);
    // ドの ばしょ：みじかい せんが 光る、ふだは「せん」
    const d = await page.evaluate(() => ({ focus: document.querySelectorAll('#keysCards .staff-ledger.focus').length, tag: document.querySelector('#keysCards .staff-tag').textContent, msg: document.getElementById('keysMessage').textContent }));
    ok(d.focus === 1 && d.tag === 'せん' && d.msg.startsWith('ドは'), `ドは 下の みじかい せん ${JSON.stringify(d)}`);
    ok(await page.$eval('#keysKeyboard .tk-key[data-midi="60"]', e => e.classList.contains('tk-beckon') && !!e.querySelector('.tk-ring')) && (await page.$$('#keysKeyboard .tk-ring')).length === 1, 'ドの けんばんに ポワンポワンの わっか');
    // まちがえても しっぱいに ならない
    for (let i = 0; i < 6; i++) { await pressKey(page, 64); await page.waitForTimeout(30); }
    ok(await page.$eval('#mistakeModal', e => e.style.display) !== 'flex' && (await page.textContent('#keysMessage')).includes('ざんねん'), 'まちがえても しっぱいに ならない');
    await pressKey(page, 60); await page.waitForTimeout(60);
    ok((await page.$$('#keysKeyboard .tk-ring')).length === 0 && await page.$eval('#keysCards .staff-note[data-i="0"]', e => e.classList.contains('sparkle')), 'おすと わっかは きえて、音符が キラリン');
    await page.waitForTimeout(1500);
    // のぼる：1つずつ あらわれる。ふだは せん・あいだ を くりかえす
    const up = await page.evaluate(() => ({
      hidden: document.querySelectorAll('#keysCards .staff-note.hidden').length,
      tags: [...document.querySelectorAll('#keysCards .staff-tag')].map(t => t.textContent).join(''),
    }));
    ok(up.hidden === 7 && up.tags === 'せんあいだせんあいだせんあいだせんあいだ', `のぼる：音符は 1つずつ、せん・あいだ ${JSON.stringify(up)}`);
    await pressKey(page, 60); await page.waitForTimeout(80);
    ok((await page.$$('#keysCards .staff-note.hidden')).length === 7 && await page.$eval('#keysCards .staff-note[data-i="0"]', e => e.classList.contains('sparkle')), 'おした 直後は、読んだ 音符が キラリン（つぎは まだ 出ない）');
    await pressKey(page, 62); await page.waitForTimeout(80);
    ok(await page.evaluate(() => keysLesson.run.pos) === 1, 'キラリンの あいだに おしても すすまない');
    await page.waitForTimeout(600);
    ok((await page.$$('#keysCards .staff-note.hidden')).length === 6, 'キラリンの あと、つぎの 音符が あらわれる');
    ok(await page.evaluate(() => TamaStaff.onLine(60) && !TamaStaff.onLine(62) && TamaStaff.onLine(64) && !TamaStaff.onLine(72) && TamaStaff.onLine(71)), 'ド・ミ・シ は せん、レ・たかいド は あいだ');
    ok((await page.evaluate(() => window.sung)).includes('doremi60'), 'けんばんを おすと 名前を うたう');
    await answerAll(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex' && await page.textContent('#modalTitle') === 'しくみ、クリア！', 'しくみ クリア');
    ok((await page.evaluate(() => Object.keys(History.getStats('notes') || {}))).length === 0, 'しくみは にがての きろくに 入れない');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17c. レベルの ならびを かえたので、まえの おんぷよみの データは 1回だけ 消す
  {
    const old = { 'tamadoro.music.enabled': 'true', notes_coins_3: JSON.stringify([{ image: '/img/Lmaru.png' }]), notes_level_3_best_time: '12345', keys_coins_2: JSON.stringify([{ image: '/img/Lmaru.png' }]) };
    const { page } = await openPage(browser, 'index.html#/', old);
    const r = await page.evaluate(() => ({ coins: localStorage.getItem('notes_coins_3'), best: localStorage.getItem('notes_level_3_best_time'), keys: localStorage.getItem('keys_coins_2'), ver: localStorage.getItem('tamadoro.notes.dataVersion') }));
    ok(r.coins === null && r.best === null && r.keys !== null && r.ver === '5', `まえの おんぷよみの ドロップ・タイムは 消える（けんばんは そのまま）${JSON.stringify(r)}`);
    await page.evaluate(() => localStorage.setItem('notes_coins_1', JSON.stringify([{ image: '/img/Lmaru.png' }])));
    await page.reload(); await page.waitForTimeout(400);
    ok(await page.evaluate(() => localStorage.getItem('notes_coins_1')) !== null, '2回めからは 消さない');
    await page.close();
  }

  // 17e. 版 2 → 5：メロディは 8 から 9 へ、まえの オニ（9）は いまの オニ（きょくふう 10）へ（ドロップ・きろくは のこす。タイムは 中身が ちがうので つかわない）
  {
    const v2 = { 'tamadoro.music.enabled': 'true', 'tamadoro.notes.dataVersion': '2', notes_coins_1: JSON.stringify([{ image: '/img/Lmaru.png' }]),
      notes_coins_8: JSON.stringify([{ image: '/img/Ymaru.png' }]),
      notes_coins_9: JSON.stringify([{ image: '/img/Smaru.png' }, { image: '/img/Smaru.png' }]), notes_level_9_best_time: '54321',
      'tamadoro.log.v1': JSON.stringify([{ t: 1, mode: 'notes', level: 9, drop: '/img/Smaru.png' }, { t: 2, mode: 'notes', level: 1, drop: '/img/Lmaru.png' }]) };
    const { page } = await openPage(browser, 'index.html#/', v2);
    const r = await page.evaluate(() => ({
      c1: localStorage.getItem('notes_coins_1') !== null, c8: localStorage.getItem('notes_coins_8'), c9: JSON.parse(localStorage.getItem('notes_coins_9') || '[]').map(d => d.image[5]).join(''),
      c10: JSON.parse(localStorage.getItem('notes_coins_10') || '[]').length, c11: localStorage.getItem('notes_coins_11'),
      best: [9, 10].map(l => localStorage.getItem(`notes_level_${l}_best_time`)).join(','), ver: localStorage.getItem('tamadoro.notes.dataVersion'),
      log: History.getLog().filter(e => e.mode === 'notes' && !e.imported).map(e => e.level).join(','),
    }));
    ok(r.c1 && r.c8 === null && r.c9 === 'Y' && r.c10 === 2 && r.c11 === null && r.best === ',' && r.ver === '5' && r.log === '10,1', `版2 の メロディは 9、オニは オニ（きょくふう）へ ${JSON.stringify(r)}`);
    await page.close();
  }

  // 17e2. 版 3 → 5：メロディ 8 → 9、きょくふう 9 → 10、まえの オニ 10 → 10（きょくふうの ドロップに たしあわせる）
  {
    const d = c => JSON.stringify([{ image: `/img/${c}maru.png` }]);
    const v3 = { 'tamadoro.music.enabled': 'true', 'tamadoro.notes.dataVersion': '3', notes_coins_7: d('P'), notes_coins_8: d('Y'), notes_coins_9: d('C'), notes_coins_10: d('S'),
      notes_level_9_best_time: '11111', notes_level_10_best_time: '22222',
      'tamadoro.log.v1': JSON.stringify([8, 9, 10, 7].map((level, t) => ({ t, mode: 'notes', level, drop: '/img/Lmaru.png' }))) };
    const { page } = await openPage(browser, 'index.html#/', v3);
    const r = await page.evaluate(() => ({
      coins: [7, 8, 9, 10, 11].map(l => JSON.parse(localStorage.getItem(`notes_coins_${l}`) || '[]').map(c => c.image[5]).join('') || '-').join(' '),
      best: [9, 10, 11].map(l => localStorage.getItem(`notes_level_${l}_best_time`)).join(','),
      ver: localStorage.getItem('tamadoro.notes.dataVersion'),
      log: History.getLog().filter(e => e.mode === 'notes' && !e.imported).map(e => e.level).join(','),
    }));
    ok(r.coins === 'P - Y CS -' && r.best === ',11111,' && r.ver === '5' && r.log === '9,10,10,7', `版3：きょくふうと まえの オニの ドロップは オニ（きょくふう）に あつまる ${JSON.stringify(r)}`);
    await page.close();
  }

  // 17e3. 版 4 → 5：まえの オニ（11）の ドロップ・きろくは オニ（きょくふう 10）へ たしあわせる。きょくふうの タイムは そのまま
  {
    const v4 = { 'tamadoro.music.enabled': 'true', 'tamadoro.notes.dataVersion': '4',
      notes_coins_9: JSON.stringify([{ image: '/img/Ymaru.png' }]), notes_coins_10: JSON.stringify([{ image: '/img/Cmaru.png' }]),
      notes_coins_11: JSON.stringify([{ image: '/img/Smaru.png' }, { image: '/img/Smaru.png' }]),
      notes_level_10_best_time: '33333', notes_level_11_best_time: '44444',
      'tamadoro.log.v1': JSON.stringify([11, 10, 9].map((level, t) => ({ t, mode: 'notes', level, drop: '/img/Lmaru.png' }))) };
    const { page } = await openPage(browser, 'index.html#/', v4);
    const r = await page.evaluate(() => ({
      coins: [9, 10, 11].map(l => JSON.parse(localStorage.getItem(`notes_coins_${l}`) || '[]').map(c => c.image[5]).join('') || '-').join(' '),
      best: [10, 11].map(l => localStorage.getItem(`notes_level_${l}_best_time`)).join(','),
      ver: localStorage.getItem('tamadoro.notes.dataVersion'),
      log: History.getLog().filter(e => e.mode === 'notes' && !e.imported).map(e => e.level).join(','),
    }));
    ok(r.coins === 'Y CSS -' && r.best === '33333,' && r.ver === '5' && r.log === '10,10,9', `版4：まえの オニの ドロップは オニ（きょくふう）へ ${JSON.stringify(r)}`);
    await page.close();
  }

  // 17f. きょくふう（js/songs.js）：曲調の 表・ノブ・/song
  {
    const { page, errors } = await openPage(browser, 'index.html#/', MUSIC_ON);
    const t = await page.evaluate(() => {
      const S = TamaSongs;
      const bad = [];
      const stats = { nct: 0 };
      // メロディの 性格（系統の melody）
      Object.entries(S.FAMILIES).forEach(([id, f]) => {
        const m = f.melody || {};
        if (!S.CENTERS[m.center] || !S.SPREADS[m.width] || !S.LEAPS[m.leap] || !m.sabi || !Object.keys(m.sabi).every(d => ['up', 'down', 'octave', 'surge'].includes(d))) bad.push(`${id} せいかく`);
      });
      S.STYLES.forEach(st => {
        const tonic = st.key === 'Am' ? 9 : 0;
        if (st.chords.length !== 8) bad.push(`${st.id} 8こ`);
        st.chords.forEach((c, i) => {
          if (!S.parse(c) || !TamaSound.CHORDS[c]) bad.push(`${st.id} ${c}`);
          if (i > 0 && c === st.chords[i - 1]) bad.push(`${st.id} つづく ${c}`);
        });
        if (!S.FAMILIES[st.family]) bad.push(`${st.id} けいとう`);
        // うたう メロディ（js/songs.js の make）の きまり
        const whites = S.scaleWhites(st); // 5音音階の 曲調は その 音だけ（となりも 音階の となり）
        const idx = m => whites.indexOf(m);
        const ch = S.melodyOf(st);
        if (st.scale && (st.scale.length !== 5 || whites.some(m => !st.scale.includes(m % 12)))) bad.push(`${st.id} 音階`);
        for (let k = 0; k < 30; k++) {
          const phrases = S.make(st);
          const flat = [];
          phrases.forEach((ph, b) => {
            if (!ph.rhythm || ph.notes.length !== ph.rhythm.split('').filter(c => c === '●').length) bad.push(`${st.id} リズム`);
            let n = 0;
            ph.rhythm.split('').forEach((mark, beat) => {
              if (mark !== '●') return;
              const restNext = beat === 3 ? (b === 7 || phrases[b + 1].rhythm[0] === '○') : ph.rhythm[beat + 1] === '○';
              flat.push({ m: ph.notes[n], chord: ph.chord, b, must: beat === 0 || beat === 2 || n === 0 || restNext, sabi: ph.sabi });
              n++;
            });
          });
          flat[flat.length - 1].must = true;
          flat.forEach((x, i) => {
            const tone = S.tones(x.chord).includes(x.m % 12);
            if (!(x.m >= 57 && x.m <= 79 && !TamaNotes.isBlack(x.m))) bad.push(`${st.id} はんい`);
            if (!whites.includes(x.m)) bad.push(`${st.id} 音階の そとの 音`);
            if (x.must && !tone) bad.push(`${st.id} つよい拍は 和音の 音`);
            if (!tone) {
              // 和音の そとの 音：となりから きて、となりの 和音の 音へ ぬける（経過音・刺繍音）
              const a = flat[i - 1], c = flat[i + 1];
              const d1 = idx(x.m) - idx(a.m), d2 = idx(c.m) - idx(x.m);
              if (Math.abs(d1) !== 1 || Math.abs(d2) !== 1 || !S.tones(c.chord).includes(c.m % 12)) bad.push(`${st.id} 経過音`);
            }
          });
          const last = flat[flat.length - 1];
          if (last.m % 12 !== tonic || Math.abs(idx(last.m) - idx(flat[flat.length - 2].m)) !== 1) bad.push(`${st.id} おわり`);
          if (phrases[3].notes[phrases[3].notes.length - 1] % 12 === tonic) bad.push(`${st.id} 4小節め`);
          // サビ：5〜6小節めは かならず、7小節めは ときどき。1〜4・8小節めは ちがう
          const dir = phrases[4].sabi;
          if (!dir || phrases[5].sabi !== dir || phrases.slice(0, 4).some(p => p.sabi) || phrases[7].sabi || (phrases[6].sabi && phrases[6].sabi !== dir)) bad.push(`${st.id} サビの ばしょ`);
          const sabi = flat.filter(x => x.sabi).map(x => x.m), others = flat.filter(x => !x.sabi).map(x => x.m);
          if (dir === 'down' ? Math.min(...sabi) >= Math.min(...others) : Math.max(...sabi) <= Math.max(...others)) bad.push(`${st.id} 山（谷）は サビ`);
          if (dir === 'surge') {
            const tops = phrases.filter(p => p.sabi).map(p => Math.max(...p.notes));
            if (tops.some((t, j) => j > 0 && t <= tops[j - 1]) || tops[tops.length - 1] < 77) bad.push(`${st.id} ぐぐぐっと`);
          }
          if (ch.width === 'wide' && !flat.some(x => x.m <= 59 || x.m >= 77)) bad.push(`${st.id} はしの 音`);
          if (!(dir in ch.sabi)) bad.push(`${st.id} サビの むき`);
          stats[dir] = (stats[dir] || 0) + 1;
          stats.nct += flat.filter(x => !S.tones(x.chord).includes(x.m % 12)).length;
        }
      });
      // リズムの パターン：8小節・4拍、4小節めと 8小節めは ●●●○。系統の rhythms は ある リズム
      Object.keys(S.RHYTHMS).forEach(id => {
        const bars = S.rhythmBars(id);
        if (bars.length !== 8 || bars.some(b => !/^[●○]{4}$/.test(b))) bad.push(`${id} 4/4`);
        if (bars[3] !== '●●●○' || bars[7] !== '●●●○') bad.push(`${id} いきつぎ`);
      });
      Object.entries(S.FAMILIES).forEach(([id, f]) => { if (!f.rhythms || !f.rhythms.length || f.rhythms.some(r => !S.RHYTHMS[r])) bad.push(`${id} rhythms`); });
      if (!S.FAMILIES.jazz.rhythms.some(r => S.rhythmBars(r)[0].startsWith('○'))) bad.push('ジャズの はじめの 休符');
      if (S.restsAfter(['○●●●', '●●●○', '●●●○']).join() !== '-1,5,8') bad.push('restsAfter');
      // 日本の 5音音階・沖縄風：ヨナぬき（ドレミソラ）・みんよう（ラドレミソ。空5度の 伴奏）・琉球音階（ドミファソシ）
      const scaleOf = id => (S.STYLES.find(x => x.id === id) || {}).scale || [];
      if (scaleOf('yonanuki').join() !== '0,2,4,7,9' || scaleOf('minyo').join() !== '9,0,2,4,7' || scaleOf('shimauta').join() !== '0,4,5,7,11' || scaleOf('kachashi').join() !== '0,4,5,7,11') bad.push('5音音階');
      if (S.chordNotes('A5').join() !== '45,52' || !S.STYLES.find(x => x.id === 'minyo').chords.every(c => c.endsWith('5'))) bad.push('空5度');
      if (S.FAMILIES.nihon.name !== 'にほん' || S.FAMILIES.okinawa.name !== 'おきなわ') bad.push('にほん・おきなわ');
      // えんそうの ひょうげん：ずれ → ゆれ、つっかえ → ため、まちがえた 音 → かざりの 音
      {
        const ph = S.make(S.STYLES.find(x => x.id === 'komuro'), Math.random, 'genki');
        const grid = [];
        ph.forEach((p, b) => p.rhythm.split('').forEach((m, k) => { if (m === '●') grid.push(b * 4 + k); }));
        const even = grid.map(g => ({ t: g * 800, wrongs: [] }));
        const e0 = S.expressive(ph, even, 0.54);
        if (e0.holds.length || !e0.notes.every((n, i) => Math.abs(n.beat - grid[i]) < 1e-9) || e0.traits.swing !== 'pittari') bad.push('ひょうげん ずれなし');
        const e1 = S.expressive(ph, even.map((x, i) => (i === 5 ? { ...x, t: x.t + 400 } : x)), 0.54);
        const d = e1.notes[5].beat - grid[5];
        if (!(d > 0 && d <= S.RUBATO_MAX) || e1.holds.length) bad.push(`ひょうげん ゆれ ${d}`);
        const e2 = S.expressive(ph, even.map((x, i) => (i >= 10 ? { ...x, t: x.t + 4000 } : x)), 0.54);
        if (e2.holds.length !== 1 || e2.holds[0].before !== 10 || Math.abs(e2.notes[10].beat - grid[10] - 1) > 1e-9 || e2.warp(grid[10]) !== grid[10] + 1 || e2.warp(grid[9]) !== grid[9]) bad.push('ひょうげん ため');
        const target = ph.flatMap(p => p.notes)[3];
        // まちがえた 音（さいごの 2つ）は 正しい 音の ちかくへ（オクターブ ちがいの 音も 5度 いないに よせる）
        const e3 = S.expressive(ph, even.map((x, i) => (i === 3 ? { ...x, wrongs: [target + 5, target - 13, target + 14] } : x)), 0.54);
        if (e3.notes[3].graces.join() !== `${target - 1},${target + 2}` || e3.traits.graces !== 2) bad.push(`ひょうげん かざり ${e3.notes[3].graces}`);
        // 正しい 音と 同じ 音（オクターブ ちがい）は かざりに しない
        if (S.expressive(ph, even.map((x, i) => (i === 3 ? { ...x, wrongs: [target - 12] } : x)), 0.54).notes[3].graces.length) bad.push('ひょうげん かざり 同じ 音');
        const slow = S.expressive(ph, grid.map(g => ({ t: g * 1500, wrongs: [] })), 0.54);
        const fast = S.expressive(ph, grid.map(g => ({ t: g * 500, wrongs: [] })), 0.54);
        if (slow.traits.pace !== 'yuttari' || fast.traits.pace !== 'ikiiki' || !S.traitWords(slow.traits).join().includes('バラード')) bad.push('ひょうげん はやさ');
        if (S.expressive(ph, [], 0.54).notes.some((n, i) => n.beat !== grid[i])) bad.push('ひょうげん きろくなし');
      }
      // 曲調ごとの 音色（けんばん・メロディ／伴奏）は ある 音色
      S.STYLES.forEach(st => { const v = S.soundOf(st); if (![v.melody, v.chord].every(x => x === 'piano' || TamaSound.VOICES[x]) || !S.SOUND_NAMES[v.melody] || !S.SOUND_NAMES[v.chord]) bad.push(`${st.id} 音色`); });
      const used = new Set(S.STYLES.flatMap(st => Object.values(S.soundOf(st))));
      if (!Object.keys(TamaSound.VOICES).every(v => used.has(v))) bad.push('つかわない 音色');
      // はじく 音（pluck）は 伴奏に つかわない（ひびかない）
      S.STYLES.forEach(st => { if (TamaSound.VOICES[S.soundOf(st).chord] && TamaSound.VOICES[S.soundOf(st).chord].pluck) bad.push(`${st.id} 伴奏が はじく 音`); });
      const ids = new Set(S.STYLES.map(s => s.id));
      // ノブ：曲調の weight 0 は 出ない、系統の weight 0 も 出ない
      const komuro = S.STYLES.find(s => s.id === 'komuro');
      komuro.weight = 0;
      S.FAMILIES.jazz.weight = 0;
      let seen = new Set();
      for (let k = 0; k < 2000; k++) seen.add(S.pick().id);
      komuro.weight = 1;
      S.FAMILIES.jazz.weight = 1;
      // おきなわ は ほりゅう（系統の ノブ 0）
      const knob = !seen.has('komuro') && !['twofive', 'junkan', 'minortwofive', 'shimauta', 'kachashi'].some(id => seen.has(id)) && seen.size >= S.STYLES.length - 7
        && S.FAMILIES.okinawa.weight === 0;
      return { bad: [...new Set(bad)], styles: S.STYLES.length, families: Object.keys(S.FAMILIES).length, unique: ids.size === S.STYLES.length, knob, stats };
    });
    ok(t.bad.length === 0 && t.styles >= 25 && t.families >= 12 && t.unique, `曲調 ${t.styles}こ・系統 ${t.families}こ：和音・メロディ・おわりの 音 ${JSON.stringify(t.bad.slice(0, 5))}`);
    ok(t.knob, 'ノブ（weight 0）の 曲調・系統は 出ない');
    ok(t.stats.up > 0 && t.stats.down > 0 && t.stats.octave > 0 && t.stats.surge > 0 && t.stats.surge < t.stats.up / 3 && t.stats.nct > 0,
      `サビの むき：もりあがる・しずむ・とびあがる・ぐぐぐっと（ぐぐぐっとは ときどき）。経過音も 出る ${JSON.stringify(t.stats)}`);
    // /song：Enter で きまる
    await command(page, '/song jaz');
    ok(await page.evaluate(() => TamaSongs.forced()) === null, '/song は Enter まで きまらない');
    await command(page, '/song jazz\n'); await page.waitForTimeout(100);
    const forced = await page.evaluate(() => { const ids = new Set(); for (let k = 0; k < 200; k++) ids.add(TamaSongs.pick().family); return { f: TamaSongs.forced(), fam: [...ids].join() }; });
    ok(forced.f === 'jazz' && forced.fam === 'jazz', `/song jazz で ジャズ風だけ ${JSON.stringify(forced)}`);
    await command(page, '/song komuro\n'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => TamaSongs.pick().id) === 'komuro', '/song komuro で その 曲調だけ');
    await command(page, '/song nai\n'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => TamaSongs.forced()) === 'komuro', 'ない 曲調は きめない');
    await command(page, '/song off\n'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => TamaSongs.forced()) === null, '/song off で もとに もどす');
    // /rhythm：リズムを きめる（どの 系統でも その リズム）
    await command(page, '/rhythm zurashi\n'); await page.waitForTimeout(100);
    const rh = await page.evaluate(() => {
      const ids = new Set(TamaSongs.STYLES.map(st => TamaSongs.pickRhythm(st)));
      const phrases = TamaSongs.make(TamaSongs.STYLES[0]);
      return { f: TamaSongs.forcedRhythm(), ids: [...ids].join(), first: phrases[0].rhythm };
    });
    ok(rh.f === 'zurashi' && rh.ids === 'zurashi' && rh.first === '○●●●', `/rhythm zurashi で ずらす リズム ${JSON.stringify(rh)}`);
    await command(page, '/rhythm nai\n'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => TamaSongs.forcedRhythm()) === 'zurashi', 'ない リズムは きめない');
    await command(page, '/rhythm off\n'); await page.waitForTimeout(100);
    const back = await page.evaluate(() => { const ids = new Set(); for (let k = 0; k < 200; k++) ids.add(TamaSongs.pickRhythm(TamaSongs.STYLES.find(s => s.id === 'komuro'))); return { f: TamaSongs.forcedRhythm(), ids: [...ids].sort().join() }; });
    ok(back.f === null && back.ids === 'genki,hazumu,utau', `/rhythm off で 系統の リズムに もどす ${JSON.stringify(back)}`);
    // /song だけ：一覧から えらぶ（リズムは えらんでも ひらいた まま、曲調で きまって とじる）
    await command(page, '/song\n'); await page.waitForTimeout(200);
    const list = await page.evaluate(() => ({
      open: !!document.getElementById('songPicker'), styles: document.querySelectorAll('#songPicker [data-song]').length,
      rhythms: document.querySelectorAll('#songPicker [data-rhythm]').length, forced: TamaSongs.forced(),
    }));
    ok(list.open && list.styles === 33 + 15 + 1 && list.rhythms === 5 + 1 && list.forced === null, `/song⏎ で 曲調の 一覧 ${JSON.stringify(list)}`);
    await page.click('#songPicker [data-rhythm="setsunai"]'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => TamaSongs.forcedRhythm() === 'setsunai' && !!document.getElementById('songPicker') && document.querySelector('#songPicker [data-rhythm="setsunai"]').classList.contains('on')),
      '一覧：リズムを えらぶ（ひらいた まま）');
    await page.click('#songPicker [data-song="bossa"]'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => TamaSongs.forced() === 'bossa' && !document.getElementById('songPicker')), '一覧：曲調を えらぶと きまって とじる');
    await command(page, '/song\n'); await page.waitForTimeout(200);
    await page.click('#songPicker [data-song="off"]'); await page.waitForTimeout(100);
    await command(page, '/rhythm off\n'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => TamaSongs.forced() === null && TamaSongs.forcedRhythm() === null), '一覧：おまかせに もどす');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17i. きょくノート（js/song-note.js）：のこした 曲・曲名・ほかの なまえ・きく・けす・きょくふう ずかん
  {
    const { page, errors } = await openPage(browser, 'index.html#/notes', { ...MUSIC_ON });
    ok(await page.isVisible('#goToSongNote'), 'おんぷよみの メニューに「📖 きょくノート」');
    await page.evaluate(() => {
      // ずれの ない きろくで 2曲 のこす（ジャズ と どうよう）
      const fake = (id, rhythm) => {
        const style = TamaSongs.STYLES.find(s => s.id === id);
        const phrases = TamaSongs.make(style, Math.random, rhythm);
        const take = phrases.map(p => p.rhythm).join('').split('').map((m, k) => (m === '●' ? { t: k * 560, wrongs: [] } : null)).filter(x => x);
        return { song: { style, rhythm, phrases }, take };
      };
      TamaSongNote.save(fake('twofive', 'zurashi'));
      TamaSongNote.save(fake('doyo', 'hazumu'));
      TamaSongNote.addFamily('jazz');
    });
    await page.click('#goToSongNote'); await page.waitForTimeout(200);
    const book = await page.evaluate(() => ({
      head: [...document.querySelectorAll('#songNote h3')].map(h => h.textContent).join('|'),
      on: [...document.querySelectorAll('#songNote .zukan-card.on')].map(c => c.textContent.trim()).join(),
      cards: document.querySelectorAll('#songNote .zukan-card').length,
      names: [...document.querySelectorAll('#songNote .note-song-name')].map(n => n.textContent),
      want: TamaSongNote.list().map(e => TamaSongNote.nameOf(e)),
      info: document.querySelector('#songNote .note-song-info').textContent,
    }));
    ok(book.head.includes('ずかん　1 / 14') && book.on === 'ジャズ' && book.cards === 14 && book.head.includes('2きょく'),
      `きょくふう ずかん（あつめた 系統。おやすみ中の おきなわは のせない）${JSON.stringify(book)}`);
    ok(book.names.join() === book.want.join() && book.names[0] !== book.names[1] && book.info.includes('どうよう風') && /^.+の (うた|さんぽ|セレナーデ|メロディ|マーチ|ダンス|ロンド|パレード|バラード|こもりうた|ノクターン|ゆめ)$/.test(book.names[0]),
      `のこした 曲は 新しい じゅん。名前は 系統の ばめん × はやさの 曲の しゅるい ${JSON.stringify(book.names)}`);
    // ほかの なまえ：つぎの こうほへ（なんど ひらいても 同じ 名前）
    await page.click('#songNote [data-rename]'); await page.waitForTimeout(100);
    const renamed = await page.evaluate(() => ({ shown: document.querySelector('#songNote .note-song-name').textContent, saved: TamaSongNote.nameOf(TamaSongNote.list()[0]), seed: TamaSongNote.list()[0].seed }));
    ok(renamed.shown !== book.names[0] && renamed.shown === renamed.saved && renamed.seed === 1, `ほかの なまえ ${JSON.stringify(renamed)}`);
    // ▶ きく → ■ とめる（もういちど おすと とまる）
    const notes = await page.evaluate(() => {
      window.played = 0;
      const note = TamaSound.note.bind(TamaSound);
      TamaSound.note = (m, o) => { if (!o || o.gain === undefined) window.played++; return note(m, o); };
      return TamaSongNote.list()[0].take.length;
    });
    await page.click('#songNote [data-play]'); await page.waitForTimeout(150);
    const playing = await page.evaluate(() => ({ playback: !!keysLesson.playback, text: document.querySelector('#songNote .note-play').textContent, played: window.played }));
    ok(playing.playback && playing.text === '■ とめる' && playing.played === notes, `▶ きく：のこした えんそうが ながれる（${notes}おん）${JSON.stringify(playing)}`);
    await page.click('#songNote [data-play]'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => !keysLesson.playback && document.querySelector('#songNote .note-play').textContent === '▶ きく'), '■ とめる で とまる');
    // けす：1かいめは「ほんとうに けす？」、2かいめで けす
    await page.click('#songNote [data-remove]'); await page.waitForTimeout(100);
    const sure = await page.evaluate(() => ({ text: document.querySelector('#songNote [data-remove]').textContent, n: TamaSongNote.list().length }));
    await page.click('#songNote [data-remove]'); await page.waitForTimeout(100);
    ok(sure.text === 'ほんとうに けす？' && sure.n === 2 && await page.evaluate(() => TamaSongNote.list().length) === 1, `けす（たしかめて から）${JSON.stringify(sure)}`);
    // ノブ：RENAME を false に すると「ほかの なまえ」は 出ない
    await page.evaluate(() => { TamaSongNote.RENAME = false; TamaSongNote.refresh(); });
    ok(await page.evaluate(() => !document.querySelector('#songNote [data-rename]')), 'ノブ RENAME: false で 名前を かえられない');
    // とじる・ほかの 画面へ いくと とじる（ながれていれば とまる）
    await page.click('#songNote [data-play]'); await page.waitForTimeout(100);
    await page.evaluate(() => { location.hash = '#/'; }); await page.waitForTimeout(300);
    ok(await page.evaluate(() => !document.getElementById('songNote') && !keysLesson.playback), 'ほかの 画面へ いくと きょくノートは とじて、とまる');
    await page.evaluate(() => { location.hash = '#/add'; }); await page.waitForTimeout(300);
    ok(!(await page.isVisible('#goToSongNote')), 'ほかの モードには「きょくノート」は 出ない');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17h. 曲調ごとの 音色（js/sound.js の VOICES）：ぜんぶ 鳴る・こと の 高さ・きょくふう の けんばんと 伴奏・伴奏の 型
  {
    const unlock = { ...MUSIC_ON, 'tamadoro.notes.song': 'hymn' };
    for (let l = 1; l <= 9; l++) unlock[`notes_coins_${l}`] = JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' }));
    const { page, errors } = await openPage(browser, 'index.html#/notes', unlock);
    const offline = await page.evaluate(async () => {
      // ぜんぶの 音色を 録音用の 音の 時計で 鳴らして、音が 出るか・こと の 高さが あっているか
      const sr = 44100, out = {};
      const save = { ctx: TamaSound.ctx, master: TamaSound.master, live: TamaSound.live };
      for (const voice of Object.keys(TamaSound.VOICES)) {
        const off = new OfflineAudioContext(1, sr, sr);
        TamaSound.ctx = off; TamaSound.master = off.createGain(); TamaSound.master.connect(off.destination); TamaSound.live = () => off;
        TamaSound.note(79, { voice, hold: 0.5 }).release();
        const d = (await off.startRendering()).getChannelData(0);
        out[voice] = Math.max(...d.subarray(0, 20000).map(Math.abs));
        if (voice === 'koto') {
          const seg = d.subarray(3000), per = sr / 784, P = 10;
          let best = -1e9, lagBest = 0;
          for (let lag = P * (per - 2); lag <= P * (per + 2); lag += 0.02) {
            let c = 0; for (let i = 0; i < 6000; i++) { const x = i + lag, a = Math.floor(x), fr = x - a; c += seg[i] * (seg[a] * (1 - fr) + seg[a + 1] * fr); }
            if (c > best) { best = c; lagBest = lag; }
          }
          out.kotoCents = 1200 * Math.log2(per / (lagBest / P));
        }
      }
      Object.assign(TamaSound, save);
      return out;
    });
    const voices = Object.keys(offline).filter(k => k !== 'kotoCents');
    ok(voices.length >= 7 && voices.every(v => offline[v] > 0.01), `音色は ぜんぶ 鳴る ${voices.map(v => `${v}:${offline[v].toFixed(2)}`).join(' ')}`);
    ok(Math.abs(offline.kotoCents) < 5, `こと（はじく 音）の 高さが あう（たかいソで ${offline.kotoCents.toFixed(1)}セント）`);
    // きょうかい風（さんびか）：けんばんも 正解の 和音も オルガン
    await page.click('#level10'); await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.voices = [];
      const note = TamaSound.note.bind(TamaSound);
      TamaSound.note = (m, o = {}) => { window.voices.push(o.voice || 'piano'); return note(m, o); };
    });
    const len = await page.evaluate(() => keysLesson.run.problem.notes.length);
    for (let i = 0; i < len; i++) { await pressKey(page, await expected(page)); await page.waitForTimeout(40); }
    await page.waitForTimeout(400);
    const heard = await page.evaluate(() => ({ style: keysLesson.run.song.style.id, voices: [...new Set(window.voices)].join() }));
    ok(heard.style === 'hymn' && heard.voices === 'organ', `きょくふう の けんばん・伴奏は 曲調の 音色（きょうかい ＝ オルガン）${JSON.stringify(heard)}`);
    // /song の 一覧に 音色と「おやすみ中」
    await command(page, '/song\n'); await page.waitForTimeout(200);
    const pickerText = await page.$eval('#songPicker', e => e.textContent);
    ok(pickerText.includes('♪ オルガン／オルガン・のばす') && pickerText.includes('♪ オルゴール／ピアノ・ズン・チャッ') && pickerText.includes('おきなわ（おやすみ中）'),
      '一覧に 音色と 伴奏の 型（♪ メロディ／伴奏・型）と おきなわ（おやすみ中）');
    await page.click('#songPicker [data-close]'); await page.waitForTimeout(200);
    // 「じぶんの えんそう」の 伴奏は 曲調ごとの 型（TamaSongs.ACCOMPS）
    const accomps = await page.evaluate(() => Object.fromEntries(Object.keys(TamaSongs.FAMILIES).map(f =>
      [f, TamaSongs.accompOf(TamaSongs.STYLES.find(s => s.family === f) || { family: f })])));
    ok(accomps.pops === 'beat' && accomps.rock === 'beat' && accomps.doyo === 'oompah' && accomps.bossa === 'bossa' && accomps.blues === 'shuffle'
      && accomps.game === 'arpeggio' && accomps.church === 'pad' && accomps.classic === 'basic' && accomps.jazz === 'basic',
      `伴奏の 型：ポップス・ロックは 4分で きざむ、どうようは ズン・チャッ、ボサノバ・ブルースは はねる、ゲームは 分散和音、きょうかいは のばす ${JSON.stringify(accomps)}`);
    // 型の とおりに 鳴る（ずれの ない きろくで）。拍の いちを 1小節ごとに しらべる
    const timing = await page.evaluate(() => {
      const run = keysLesson.run;
      const check = (styleId, rhythm) => {
        const style = TamaSongs.STYLES.find(s => s.id === styleId);
        const phrases = TamaSongs.make(style, Math.random, rhythm);
        run.song = { style, rhythm, phrases };
        run.take = phrases.map(p => p.rhythm).join('').split('').map((m, k) => (m === '●' ? { t: k * 600, wrongs: [] } : null)).filter(x => x);
        const beat = 60 / TamaSongs.RHYTHMS[rhythm].tempo;
        const chords = [], basses = [];
        const note = TamaSound.note.bind(TamaSound), chord = TamaSound.chord.bind(TamaSound);
        let inChord = false; // 和音の 中の 音は ベースに かぞえない
        TamaSound.chord = (n, o) => { chords.push(o.when); inChord = true; const r = chord(n, o); inChord = false; return r; };
        TamaSound.note = (m, o) => { if (!inChord && o && o.gain !== undefined && m < 48) basses.push(Math.round(((o.when - 0.3) / beat) * 100) / 100); return note(m, o); };
        keysPlayback();
        keysStopPlayback();
        TamaSound.note = note; TamaSound.chord = chord;
        const inBar = list => [...new Set(list.filter(b => b < 4))].sort((a, b) => a - b).join(' ');
        return { chords: inBar(chords.map(w => Math.round(((w - 0.3) / beat) * 100) / 100)), basses: inBar(basses) };
      };
      return { doyo: check('doyo', 'hazumu'), pops: check('komuro', 'genki'), blues: check('blues', 'genki'), church: check('hymn', 'utau'), classic: check('cadence', 'utau') };
    });
    ok(timing.doyo.basses === '0 2' && timing.doyo.chords === '1 3', `どうよう：ズン（ベース 1・3拍め）・チャッ（和音 2・4拍め）${JSON.stringify(timing.doyo)}`);
    ok(timing.pops.chords === '0 1 2 3' && timing.pops.basses === '0 2', `ポップス：和音を 4分で きざむ ${JSON.stringify(timing.pops)}`);
    ok(timing.blues.chords === '0 1.67 2 3.67' && timing.blues.basses === '0 1 2 3', `ブルース：はねる（うら拍は 3分の2 うしろ）・ベースは あるく ${JSON.stringify(timing.blues)}`);
    ok(timing.church.chords === '0' && timing.church.basses === '0', `きょうかい：1小節 のばす ${JSON.stringify(timing.church)}`);
    ok(timing.classic.chords === '0 2' && timing.classic.basses === '0 2', `ほかの 系統は いままでどおり（1拍め・3拍め）${JSON.stringify(timing.classic)}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 17g. おんぷよみ マスタークラス きょくふう：8フレーズ れんしゅう → とおし えんそう → じぶんの えんそう → 拍手と ドロップ
  {
    const unlock = { ...MUSIC_ON, 'tamadoro.notes.song': 'komuro', 'tamadoro.notes.rhythm': 'genki' };
    for (let l = 1; l <= 9; l++) unlock[`notes_coins_${l}`] = JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' }));
    const { page, errors } = await openPage(browser, 'index.html#/notes', unlock);
    await page.click('#level10'); await page.waitForTimeout(300);
    const first = await page.evaluate(() => ({
      deck: keysLesson.run.deck.length, style: keysLesson.run.song.style.id, chords: keysLesson.run.deck.map(p => p.chord).join(','),
      msg: document.getElementById('keysMessage').textContent, chord: document.querySelector('#keysCards .staff-chord').textContent,
    }));
    ok(first.deck === 8 && first.style === 'komuro' && first.chords === 'Am,F,G,C,Am,F,G,C' && first.msg.includes('ポップス風（こむろ しんこう）') && first.msg.includes('1/8') && first.chord === 'Am',
      `Lv9：曲調の 8フレーズを 1つずつ（コード名つき）${JSON.stringify(first)}`);
    ok(await page.isVisible('#keysHelp'), 'Lv9 にも けんばんの よみかた スイッチ');
    ok(await page.evaluate(() => keysLesson.run.deck.every((p, i) => p.say.includes('（サビ）') === !!keysLesson.run.song.phrases[i].sabi) && keysLesson.run.deck[4].say.includes('（サビ）')),
      'れんしゅうの せつめいに「（サビ）」（5小節めから）');
    // 4/4拍子の 1小節：げんきな リズムの 1小節めは ●●●○（音符 3つ・きゅうふ 1つ）
    const bar1 = await page.evaluate(() => ({
      time: document.querySelectorAll('#keysCards .staff-time').length, notes: document.querySelectorAll('#keysCards .staff-note').length,
      rests: document.querySelectorAll('#keysCards .staff-rest').length, rhythm: keysLesson.run.problem.rhythm, msg: document.getElementById('keysMessage').textContent,
    }));
    ok(bar1.time === 1 && bar1.notes === 3 && bar1.rests === 1 && bar1.rhythm === '●●●○' && bar1.msg.includes('きゅうふは おやすみ'),
      `れんしゅうは 4/4拍子の 1小節（4ぶきゅうふ つき）${JSON.stringify(bar1)}`);
    for (let i = 0; i < 2; i++) { await pressKey(page, await expected(page)); await page.waitForTimeout(30); }
    await page.waitForTimeout(400);
    const restBefore = await page.$eval('#keysCards .staff-rest', e => e.classList.contains('on'));
    await pressKey(page, await expected(page)); await page.waitForTimeout(400);
    ok(!restBefore && await page.$eval('#keysCards .staff-rest', e => e.classList.contains('on')), 'さいごの 音を ひくと、きゅうふが 光る（おさなくて いい）');
    // れんしゅうを ぜんぶ こたえる（とおし えんそうが はじまるまで）
    for (let guard = 0; guard < 400; guard++) {
      const st = await page.evaluate(() => { const r = keysLesson.run; return { type: r.problem && r.problem.type, acc: r.accepting, m: r.problem ? r.problem.notes[r.pos] : null }; });
      if (st.type === 'perform') break;
      if (!st.acc || st.m == null) { await page.waitForTimeout(120); continue; }
      await pressKey(page, st.m); await page.waitForTimeout(30);
    }
    await page.waitForTimeout(300);
    const score = await page.evaluate(() => ({
      rows: document.querySelectorAll('#keysCards .score-row').length,
      chords: [...document.querySelectorAll('#keysCards .staff-chord')].map(t => t.textContent).join(','),
      notes: document.querySelectorAll('#keysCards .staff-note').length, want: keysLesson.run.problem.notes.length,
      bars: document.querySelectorAll('#keysCards .staff-bar').length, remain: document.getElementById('keysRemaining').textContent,
    }));
    ok(score.rows === 2 && score.chords === 'Am,F,G,C,Am,F,G,C' && score.notes === score.want && score.notes === 28 && score.bars === 4 + 3 + 2 && score.remain.includes('とおし えんそう') && score.remain.includes('ポップス風') && score.remain.includes('げんきな リズム'),
      `とおし えんそう：ぜんぶの がくふ（2だん・コード名・小節線）${JSON.stringify(score)}`);
    const meter = await page.evaluate(() => ({ time: document.querySelectorAll('#keysCards .staff-time').length, rests: document.querySelectorAll('#keysCards .staff-rest').length }));
    ok(meter.time === 1 && meter.rests === 4, `ぜんぶの がくふは 4/4（はじめに 1つ）・4ぶきゅうふ 4つ ${JSON.stringify(meter)}`);
    const leads = await page.evaluate(() => {
      const by = id => TamaSongs.STYLES.find(s => s.id === id);
      const ids = ['oudou', 'komuro', 'fifties', 'sad', 'twofive', 'yonanuki', 'minyo', 'kachashi'];
      return {
        lead: ids.map(id => `${id}:${keysLeadChord(by(id))}`).join(' '),
        tonic: ['oudou', 'sad', 'yonanuki', 'minyo'].map(id => `${id}:${keysIntroTonic(by(id))}`).join(' '),
        pad: ['oudou', 'twofive', 'fanfare', 'amen', 'cadence', 'blues', 'yonanuki'].map(id => `${id}:${keysPadVoice({ style: by(id) })}`).join(' '),
        registered: ['C7', 'E7', 'G7', 'A7', 'G5', 'D5', 'F5'].every(c => Array.isArray(TamaSound.CHORDS[c])),
      };
    });
    ok(leads.lead === 'oudou:C7 komuro:E7 fifties:G7 sad:E7 twofive:A7 yonanuki:G5 minyo:D5 kachashi:F5' && leads.registered,
      `ひっぱる 和音：はじめの 和音の 5度 上の 7の和音（5音音階の 曲調は 音階の 音だけ）${leads.lead}`);
    ok(leads.tonic === 'oudou:C sad:Am yonanuki:C minyo:A5', `イントロの 1小節めは 主和音（曲の おわりの 和音の ながれに しない）${leads.tonic}`);
    ok(leads.pad === 'oudou:strings twofive:strings fanfare:strings amen:strings cadence:strings blues:organ yonanuki:shakuhachi',
      `まって くれる 伴奏は のびる 音色で、メロディと ちがう もの ${leads.pad}`);
    // イントロ（2小節）：その あいだは うけつけない →「さあ どうぞ！」。2小節めは はじめの 和音へ ひっぱる 和音（Am なら E7）を のばす
    const intro = await page.evaluate(() => {
      window.plays = [];
      const play = keysAccomp.play.bind(keysAccomp);
      keysAccomp.play = c => { window.plays.push(c); return play(c); };
      return { acc: keysLesson.run.accepting, msg: document.getElementById('keysMessage').textContent };
    });
    ok(!intro.acc && intro.msg.includes('イントロ'), `とおし えんそうの まえに イントロ（うけつけない）${JSON.stringify(intro)}`);
    const stage = await page.evaluate(() => {
      const screen = document.getElementById('keysScreen');
      const pile = document.createElement('img'); // つもった ドロップ
      pile.className = 'coin keys-pile';
      document.body.appendChild(pile);
      const front = Number(getComputedStyle(screen.querySelector('.keys-audience')).zIndex) > Number(getComputedStyle(pile).zIndex);
      pile.remove();
      return { on: screen.classList.contains('on-stage'), sway: screen.querySelector('.keys-audience').classList.contains('sway'),
        beat: screen.style.getPropertyValue('--beat'), front };
    });
    ok(stage.front, 'タマは つもった ドロップより 手前');
    ok(stage.on && stage.sway && stage.beat === `${60 / 112}s`, `とおし えんそうは ステージ（まわりが 暗く なって スポットライト。タマが 曲の 拍で ゆれる）${JSON.stringify(stage)}`);
    await page.waitForFunction(() => keysLesson.run.accepting, null, { timeout: 15000 });
    const ready = await page.evaluate(() => ({ msg: document.getElementById('keysMessage').textContent, chord: keysAccomp.chord, plays: window.plays.join() }));
    ok(!ready.msg.includes('さあ どうぞ') && ready.chord === 'E7' && ready.plays === 'E7',
      `はいりの 拍の すこし まえから うけつける（カウントの さいご）。ひっぱる 和音 E7 を のばして まって いる ${JSON.stringify(ready)}`);
    await page.waitForFunction(() => document.getElementById('keysMessage').textContent.includes('さあ どうぞ'), null, { timeout: 3000 });
    ok(await page.evaluate(() => keysAccomp.chord) === 'E7', '「さあ どうぞ！」の あとも、はじめの 和音は まだ 鳴らない（1音めと いっしょに）');
    // 伴奏の 音を きろくする（まって くれる 伴奏：のばす 和音は ストリングス、ベースは ひくい ピアノ。きざまない）
    await page.evaluate(() => {
      window.notes = [];
      const note = TamaSound.note.bind(TamaSound);
      TamaSound.note = (midi, o = {}) => { window.notes.push({ midi, voice: o.voice || 'piano', gain: o.gain }); return note(midi, o); };
      keysLesson.keyboard.sound = () => ({ release() {} }); // けんばんの 音は きろくしない
    });
    // まちがえても とまらない（すすまないだけ）
    // まちがいは 正しい 音の 半音上・全音上（オクターブ ちがいの 同じ 音に ならないように。かざりの 音が 2つ）
    const wrong = await page.evaluate(() => keysLesson.run.problem.notes[0] + 1);
    for (let i = 0; i < 6; i++) { await pressKey(page, i % 2 ? wrong : wrong + 1); await page.waitForTimeout(30); }
    ok(await page.$eval('#mistakeModal', e => e.style.display) !== 'flex' && await page.evaluate(() => keysLesson.run.pos) === 0, 'とおし えんそうは まちがえても とまらない');
    // 1音め：はじめの 和音（Am）が のびる 音色で 鳴って、ねもとの ベース（ひくい ラ）が ドン
    await page.evaluate(() => { window.notes = []; });
    await pressKey(page, await expected(page)); await page.waitForTimeout(60);
    const entry = await page.evaluate(() => ({ chord: keysAccomp.chord, notes: window.notes, pad: keysPadVoice() }));
    const padNotes = entry.notes.filter(n => n.voice === 'strings').map(n => n.midi).join();
    const bass1 = entry.notes.filter(n => n.voice === 'piano').map(n => n.midi).join();
    ok(entry.chord === 'Am' && entry.pad === 'strings' && padNotes === '45,48,52' && bass1 === '33',
      `1音めと いっしょに はじめの 和音（ポップスでも のばす ストリングス）と ねもとの ベース ${JSON.stringify({ padNotes, bass1, chord: entry.chord })}`);
    // 2音め：ベースが 5度で そっと ついてくる。ひかないと なにも 鳴らない（きざまない）
    await page.evaluate(() => { window.notes = []; });
    await pressKey(page, await expected(page)); await page.waitForTimeout(60);
    const bass2 = await page.evaluate(() => window.notes.map(n => `${n.voice}:${n.midi}`).join());
    await page.evaluate(() => { window.notes = []; });
    await page.waitForTimeout(1200);
    const quiet = await page.evaluate(() => window.notes.length);
    ok(bass2 === 'piano:40' && quiet === 0, `ひいた 音に ベースが ついてくる（5度）。ひかない あいだは 鳴らない ${JSON.stringify({ bass2, quiet })}`);
    const total = await page.evaluate(() => keysLesson.run.problem.notes.length);
    // 2小節め まで ひいて、しばらく ひかないと 伴奏は きえる（テストでは 0.3びょう）
    const half = await page.evaluate(() => keysLesson.run.problem.starts[2]);
    const done2 = await page.evaluate(() => keysLesson.run.pos); // うえで 2音 ひいた ぶん
    for (let i = done2; i < half; i++) { await pressKey(page, await expected(page)); await page.waitForTimeout(30); }
    const mid = await page.evaluate(() => keysAccomp.chord);
    await page.evaluate(() => { keysAccomp.idle = 0.3; keysAccomp.poke(); });
    await page.waitForTimeout(600);
    ok(mid === 'F' && await page.evaluate(() => keysAccomp.chord) === null, `伴奏は 小節ごとに つぎの 和音へ。しばらく ひかないと きえる（${mid}）`);
    await page.evaluate(() => {
      keysAccomp.idle = 20;
      window.chords = [];
      const chord = TamaSound.chord.bind(TamaSound);
      TamaSound.chord = (name, o) => { window.chords.push(name); return chord(name, o); };
    });
    for (let i = half; i < total; i++) { await pressKey(page, await expected(page)); await page.waitForTimeout(30); }
    await page.waitForTimeout(150);
    const done = await page.evaluate(() => ({ plays: window.plays.filter((c, i, a) => i === 0 || c !== a[i - 1]).join(), chord: keysAccomp.chord, acc: keysLesson.run.accepting,
      take: keysLesson.run.take.length, wrongs: keysLesson.run.take[0].wrongs.length, msg: document.getElementById('keysMessage').textContent }));
    ok(done.plays === 'E7,Am,F,G,C,Am,F,G,C' && done.chord === null && !done.acc && done.take === total && done.wrongs === 2,
      `フレーズの はじめで その 和音へ。ひいた きろく（まちがえた 音は さいごの 2つ）${JSON.stringify(done)}`);
    ok(await page.evaluate(() => document.querySelector('#keysScreen .keys-audience').classList.contains('clap') && document.getElementById('keysScreen').classList.contains('on-stage')),
      'ひきおわると タマが 拍手（ステージは そのまま）');
    ok(done.msg.includes('えんそう おわり') && /ゆったり|ちょうどいい|いきいき/.test(done.msg) && /ぴったり|ロマンチック/.test(done.msg) && done.msg.includes('かざりの 音'),
      `えんそうの とくちょうを ほめる（ミスでは なく 味）${done.msg}`);
    ok(await page.isVisible('#keysAnswers .listen') && await page.isVisible('#keysAnswers .again') && await page.isVisible('#keysAnswers .another') && await page.isVisible('#keysAnswers .finish')
      && (await page.$$eval('#keysAnswers button', bs => bs.map(b => b.textContent).join())) === 'もういちど きく,この 曲を もういちど,ノートに のこす,べつの 曲,えんそうを おわる',
      'ひきおわったら「もういちど きく」「この 曲を もういちど」「ノートに のこす」「べつの 曲」「えんそうを おわる」');
    ok(await page.evaluate(() => { const sub = document.querySelector('#keysMessage .keys-message-sub'); return !!sub && /ゆれ|ぴったり/.test(sub.textContent) && !document.getElementById('keysMessage').firstChild.textContent.includes('ゆれ'); }),
      'えんそうの とくちょうは 2だんめに');
    // すぐに じぶんの えんそうが ながれる（イントロなし。さいごは アウトロ F → C）
    await page.waitForFunction(() => keysLesson.playback !== null, null, { timeout: 3000 });
    ok((await page.evaluate(() => window.chords.slice(-2).join())) === 'F,C',
      `ひきおわると じぶんの えんそうが ながれる（アウトロは F → C）${await page.evaluate(() => window.chords.slice(-3).join())}`);
    ok(await page.evaluate(() => [...document.querySelectorAll('#keysCards .staff-rest')].every(r => r.classList.contains('on'))), 'とおし えんそうでも きゅうふが 光る');
    // もういちど きく：ながれている とちゅうでも はじめから（メロディ ぜんぶと かざりの 音）
    const notesPlayed = await page.evaluate(() => {
      window.before = keysLesson.playback;
      window.played = 0;
      window.graces = 0;
      const note = TamaSound.note.bind(TamaSound);
      TamaSound.note = (m, o) => { if (!o || o.gain === undefined) window.played++; if (o && o.gain === 0.22) window.graces++; return note(m, o); }; // 和音の 中の 音は かぞえない
      return keysLesson.run.problem.notes.length;
    });
    await page.click('#keysAnswers .listen'); await page.waitForTimeout(150);
    ok(notesPlayed === total && await page.evaluate(() => window.played) === total && await page.evaluate(() => window.graces) === 2
      && await page.evaluate(() => window.before !== null && keysLesson.playback !== null && keysLesson.playback !== window.before) && await page.textContent('#keysAnswers .listen') === 'もういちど きく',
      `もういちど きく：はじめから ながれる（${total}おん ＋ かざりの 音 2こ）${JSON.stringify(await page.evaluate(() => ({ played: window.played, graces: window.graces })))}`);
    await page.evaluate(() => keysStopPlayback());
    // ずれの ない きろくなら 4/4 の マス目 どおり（イントロなし）→ アウトロ
    const grid = await page.evaluate(() => {
      const song = keysLesson.run.song;
      const beat = 60 / TamaSongs.RHYTHMS[song.rhythm].tempo;
      const marks = song.phrases.map(p => p.rhythm).join('').split('');
      keysLesson.run.take = marks.map((m, k) => (m === '●' ? { t: k * 700, wrongs: [] } : null)).filter(x => x);
      const when = [];
      const bars = [];
      const note = TamaSound.note.bind(TamaSound);
      const chord = TamaSound.chord.bind(TamaSound);
      TamaSound.note = (m, o) => { if (o && o.gain === undefined) when.push(o.when); return note(m, o); };
      TamaSound.chord = (n, o) => { bars.push(o.when); return chord(n, o); };
      keysPlayback();
      TamaSound.note = note;
      TamaSound.chord = chord;
      const start = 0.3; // イントロなし
      const want = marks.map((m, k) => (m === '●' ? start + k * beat : null)).filter(t => t !== null);
      const close = (a, b) => a.length === b.length && a.every((t, i) => Math.abs(t - b[i]) < 1e-6);
      const downbeats = song.phrases.map((p, b) => start + b * 4 * beat);
      const has = t => bars.some(w => Math.abs(w - t) < 1e-6);
      return {
        melody: close(when, want), notes: when.length, tempo: TamaSongs.RHYTHMS[song.rhythm].tempo,
        down: downbeats.every(has), noIntro: Math.min(...bars) >= start - 1e-6,
        outro: has(start + 32 * beat) && has(start + 34 * beat), // アウトロ：下属和音 → 主和音
      };
    });
    ok(grid.melody && grid.down && grid.noIntro && grid.outro && grid.tempo === 112, `ずれの ない えんそうは 4/4 の マス目 どおり（イントロなし）→ アウトロ ${JSON.stringify(grid)}`);
    // この 曲を もういちど：ながれている とちゅうでも とめて（音の みちが きれる）、がくふを はじめに もどし、イントロ（カウント）から ひきなおす
    await page.evaluate(() => {
      window.cut = 0;
      const bus = keysLesson.playback.bus;
      if (bus) { const off = bus.disconnect.bind(bus); bus.disconnect = (...a) => { window.cut++; return off(...a); }; }
    });
    await page.click('#keysAnswers .again'); await page.waitForTimeout(200);
    const retry = await page.evaluate(() => ({ playback: keysLesson.playback, cut: window.cut === (TamaSound.context() ? 1 : 0), buttons: document.querySelectorAll('#keysAnswers button').length, pos: keysLesson.run.pos, acc: keysLesson.run.accepting,
      done: document.querySelectorAll('#keysCards .staff-note.done').length, msg: document.getElementById('keysMessage').textContent, take: keysLesson.run.take.length }));
    ok(retry.playback === null && retry.cut && retry.buttons === 0 && retry.pos === 0 && !retry.acc && retry.done === 0 && retry.msg.includes('イントロ') && retry.take === 0,
      `この 曲を もういちど：ながれている じぶんの えんそうを とめて、イントロから ひきなおす ${JSON.stringify(retry)}`);
    await page.waitForFunction(() => keysLesson.run.accepting, null, { timeout: 15000 });
    for (let i = 0; i < total; i++) { await pressKey(page, await expected(page)); await page.waitForTimeout(20); }
    await page.waitForSelector('#keysAnswers .another', { timeout: 5000 });
    ok(await page.evaluate(() => keysLesson.run.take.length) === total, 'もういちど ひいた きろくで ながれる');
    // ノートに のこす：名前を つけて きょくノートへ（ボタンは「のこしたよ！」に なって もう おせない）
    await page.click('#keysAnswers .save'); await page.waitForTimeout(100);
    const saved = await page.evaluate(() => {
      const list = TamaSongNote.list();
      const b = document.querySelector('#keysAnswers .save');
      return { n: list.length, style: list[0] && list[0].style, take: list[0] && list[0].take.length, phrases: list[0] && list[0].phrases.length,
        name: list[0] && TamaSongNote.nameOf(list[0]), msg: document.getElementById('keysMessage').textContent, disabled: b.disabled, text: b.textContent };
    });
    ok(saved.n === 1 && saved.style === 'komuro' && saved.take === total && saved.phrases === 8 && saved.disabled && saved.text === 'のこしたよ！'
      && saved.msg.includes(`「${saved.name}」を きょくノートに のこしたよ`), `ノートに のこす ${JSON.stringify(saved)}`);
    // べつの 曲：じぶんの えんそうを とめて 拍手 → ごほうびの ドロップ（クリアの 画面は 出さない）→ べつの 曲で はじめから
    await page.waitForFunction(() => keysLesson.playback !== null, null, { timeout: 3000 });
    const before = await page.evaluate(() => {
      TamaSound.APPLAUSE_SECONDS = 0.4; // テストでは みじかく
      window.applause = 0;
      const applause = TamaSound.applause.bind(TamaSound);
      TamaSound.applause = o => { window.applause++; return applause(o); };
      window.firstSong = keysLesson.run.song;
      return { coins: TamaStore.getCoins(10).length, history: History.getLog().length };
    });
    await page.click('#keysAnswers .another'); await page.waitForTimeout(150);
    const cheering = await page.evaluate(() => ({ playback: keysLesson.playback, applause: window.applause, buttons: document.querySelectorAll('#keysAnswers button').length,
      msg: document.getElementById('keysMessage').textContent, coins: TamaStore.getCoins(10).length }));
    ok(cheering.playback === null && cheering.applause === 1 && cheering.buttons === 0 && cheering.msg.includes('パチパチ') && cheering.coins === before.coins,
      `べつの 曲：じぶんの えんそうを とめて、まず 拍手（ドロップは まだ）${JSON.stringify(cheering)}`);
    await page.waitForTimeout(600);
    const dropped = await page.evaluate(() => ({ coins: TamaStore.getCoins(10).length, flying: document.querySelectorAll('.reward-coin').length, history: History.getLog().length,
      modal: document.getElementById('completionModal').style.display }));
    ok(dropped.coins === before.coins + 1 && dropped.history === before.history + 1 && dropped.modal !== 'flex',
      `拍手の あと ごほうびの ドロップ。クリアの 画面は 出ない ${JSON.stringify(dropped)}`);
    const zukan = await page.evaluate(() => ({ families: TamaSongNote.families().join(), drop: TamaStore.getCoins(10).slice(-1)[0].image }));
    ok(cheering.msg.includes('はじめての ポップス風！ ずかんに のったよ') && zukan.families === 'pops' && zukan.drop === '/img/Gmaru.png',
      `はじめての 系統は ずかんに のって、ごほうびの ドロップは 金 ${JSON.stringify(zukan)}`);
    await page.waitForTimeout(1600);
    const next = await page.evaluate(() => ({ newSong: keysLesson.run.song !== window.firstSong, index: keysLesson.run.index, performed: keysLesson.run.performed,
      coins: document.querySelectorAll('.reward-coin').length, modal: document.getElementById('completionModal').style.display,
      screen: document.getElementById('keysScreen').style.display, msg: document.getElementById('keysMessage').textContent }));
    ok(await page.evaluate(() => !document.getElementById('keysScreen').classList.contains('on-stage')), 'べつの 曲の れんしゅうでは ステージの 明かりが もどる');
    ok(next.newSong && next.index === 1 && !next.performed && next.coins === before.coins + 1 && next.modal !== 'flex' && next.screen !== 'none' && next.msg.includes('1/8'),
      `ドロップの あと、べつの 曲で マスタークラスを はじめから ${JSON.stringify(next)}`);
    // えんそうを おわる：拍手 → ごほうびの ドロップ → レベルを えらぶ 画面へ（れんしゅうは とばして とおし えんそうから）
    await page.evaluate(() => { const r = keysLesson.run; r.index = r.deck.length; keysNextProblem(); });
    await page.waitForFunction(() => keysLesson.run.accepting, null, { timeout: 15000 });
    const total2 = await page.evaluate(() => keysLesson.run.problem.notes.length);
    for (let i = 0; i < total2; i++) { await pressKey(page, await expected(page)); await page.waitForTimeout(20); }
    await page.waitForSelector('#keysAnswers .finish', { timeout: 5000 });
    await page.click('#keysAnswers .finish'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => window.applause === 2 && keysLesson.playback === null && document.getElementById('keysScreen').style.display !== 'none'),
      'えんそうを おわる：まず 拍手');
    await page.waitForTimeout(2200);
    const menu = await page.evaluate(() => ({ coins: TamaStore.getCoins(10).length, opening: document.getElementById('openingScreen').style.display,
      keys: document.getElementById('keysScreen').style.display, modal: document.getElementById('completionModal').style.display, run: keysLesson.run }));
    ok(menu.coins === before.coins + 2 && menu.opening === 'block' && menu.keys === 'none' && menu.modal !== 'flex' && menu.run === null,
      `拍手と ドロップの あと、レベルを えらぶ 画面へ（クリアの 画面は 出ない）${JSON.stringify(menu)}`);
    // ながれている とちゅうで ほかの 画面へ いっても 止まる
    await page.click('#level10'); await page.waitForTimeout(300);
    await page.evaluate(() => {
      const song = keysLesson.run.song;
      keysLesson.run.take = song.phrases.map(p => p.rhythm).join('').split('').map((m, k) => (m === '●' ? { t: k * 700, wrongs: [] } : null)).filter(x => x);
      keysPlayback();
    });
    const playing = await page.evaluate(() => keysLesson.playback !== null);
    await page.evaluate(() => { location.hash = '#/'; }); await page.waitForTimeout(300);
    ok(playing && await page.evaluate(() => keysLesson.playback === null && keysAccomp.bus === null && keysAccomp.chord === null), 'ほかの 画面へ いくと、じぶんの えんそうが 止まる（伴奏の 音の みちも きれる）');
    // Lv9 で /song⏎ → 曲調を えらぶと、その 曲で はじめから
    await page.evaluate(() => { location.hash = '#/notes'; }); await page.waitForTimeout(400);
    await page.click('#level10'); await page.waitForTimeout(300);
    await pressKey(page, await expected(page)); await page.waitForTimeout(30);
    await command(page, '/song\n'); await page.waitForTimeout(200);
    await page.click('#songPicker [data-song="cadence"]'); await page.waitForTimeout(400);
    const again = await page.evaluate(() => ({ style: keysLesson.run.song.style.id, rhythm: keysLesson.run.song.rhythm, index: keysLesson.run.index, pos: keysLesson.run.pos }));
    ok(again.style === 'cadence' && again.rhythm === 'genki' && again.index === 1 && again.pos === 0, `Lv9 で 曲調を えらぶと その 曲で はじめから ${JSON.stringify(again)}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 18. 五線の 高さ・加線
  {
    const { page } = await openPage(browser, 'index.html#/', MUSIC_ON);
    const r = await page.evaluate(() => ({
      e4: TamaStaff.y(64), c4: TamaStaff.y(60), b4: TamaStaff.y(71), f5: TamaStaff.y(77), g5: TamaStaff.y(79),
      c4l: TamaStaff.ledgers(TamaStaff.y(60)), d4l: TamaStaff.ledgers(TamaStaff.y(62)), a5l: TamaStaff.ledgers(TamaStaff.y(81)), g5l: TamaStaff.ledgers(TamaStaff.y(79)), b3l: TamaStaff.ledgers(TamaStaff.y(59)), a3l: TamaStaff.ledgers(TamaStaff.y(57)), b3y: TamaStaff.y(59), a3y: TamaStaff.y(57),
    }));
    ok(r.e4 === 180 && r.b4 === 140 && r.f5 === 100 && r.c4 === 200 && r.g5 === 90, `ミは いちばん下の せん、シは まんなか、ファは いちばん上 ${JSON.stringify(r)}`);
    ok(r.c4l.join() === '200' && r.d4l.length === 0 && r.a5l.join() === '80' && r.g5l.length === 0, 'ドと 上のラ だけ みじかい せん（加線）');
    ok(r.b3l.join() === '200' && r.a3l.join() === '200,220' && r.b3y === 210 && r.a3y === 220, `ひくいシは ドの せんに ぶらさがり、ひくいラは 2本めの みじかい せんの 上 ${JSON.stringify([r.b3l, r.a3l, r.b3y, r.a3y])}`);
    await page.close();
  }

  // 19. おんぷよみ Lv8 メロディ・オニ（きょくふう）
  {
    const unlockNotes = { ...MUSIC_ON };
    for (let l = 1; l <= 10; l++) unlockNotes[`notes_coins_${l}`] = JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' }));
    const { page, errors } = await openPage(browser, 'index.html#/notes', unlockNotes);
    await page.click('#level9'); await page.waitForTimeout(300);
    const n = await page.evaluate(() => keysLesson.run.problem.notes.length);
    ok((await page.$$('#keysCards .staff-note')).length === n && await page.$eval('#keysCards .staff-note[data-i="0"]', e => e.classList.contains('current')), 'メロディは 1つの 五線に ならぶ（さいしょが いま）');
    await pressKey(page, await expected(page)); await page.waitForTimeout(100);
    ok(await page.$eval('#keysCards .staff-note[data-i="0"]', e => e.classList.contains('done')) && await page.$eval('#keysCards .staff-note[data-i="1"]', e => e.classList.contains('current')), '読んだ 音符は みどり、つぎが いま');
    // 4/4拍子の 1小節：3おんは ●●●○、4おんは ●●●●。拍の かず 1・2・3・4。はじめての きゅうふで せつめい
    const bars = await page.evaluate(() => keysLesson.run.deck.map(p => `${p.notes.length}:${p.rhythm}:${p.rests.join()}:${p.counts}`));
    ok(bars.every(b => /^3:●●●○:2:true$|^4:●●●●::true$/.test(b)), `Lv8 メロディは 4/4 の 1小節（3おんは ●●●○）${bars.join(' ')}`);
    const firstRest = await page.evaluate(() => keysLesson.run.deck.findIndex(p => p.rests.length));
    const says = await page.evaluate(() => keysLesson.run.deck.filter(p => p.rests.length).map(p => p.say));
    ok(firstRest >= 0 && says[0].includes('4ぶきゅうふ') && says.slice(1).every(t => t.includes('おやすみ') && !t.includes('4ぶきゅうふ')), `はじめての きゅうふで せつめい ${says.slice(0, 2).join(' / ')}`);
    // きゅうふの ある 問題を 出して、ぜんぶ ひくと きゅうふと「4」が 光る
    await page.evaluate(() => { const r = keysLesson.run; const p = r.deck.find(q => q.rests.length); r.deck.splice(r.index, 0, p); r.accepting = false; keysNextProblem(); });
    await page.waitForTimeout(200);
    const shown = await page.evaluate(() => ({ time: document.querySelectorAll('#keysCards .staff-time').length, rests: document.querySelectorAll('#keysCards .staff-rest').length,
      counts: [...document.querySelectorAll('#keysCards .staff-count')].map(t => t.textContent + (t.classList.contains('rest') ? 'r' : '')).join(',') }));
    ok(shown.time === 1 && shown.rests === 1 && shown.counts === '1,2,3,4r', `4/4・きゅうふ・拍の かず ${JSON.stringify(shown)}`);
    for (let j = 0; j < 3; j++) { await pressKey(page, await expected(page)); await page.waitForTimeout(40); }
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => document.querySelector('#keysCards .staff-rest').classList.contains('on') && document.querySelector('#keysCards [data-rc="0"]').classList.contains('on')),
      'さいごの 音を ひくと きゅうふと「4」が 光る（おさなくて いい）');
    // オニは きょくふう（マスタークラス）。Lv8 の ドロップ 5こで ひらく。ドリルの オニは もう ない
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(300);
    const oni = await page.evaluate(() => ({ label: document.getElementById('level10').textContent, eleven: !!document.getElementById('level11'), visible: getComputedStyle(document.getElementById('level10')).display !== 'none',
      style: MODES.notes.levels[9].style, drop: MODES.notes.levels[9].drop, need: MODES.notes.coinsToUnlock(10), drill: MODES.notes.levels.some(l => l.style === 'oni') }));
    ok(oni.label === 'マスタークラス' && !oni.eleven && oni.visible && oni.style === 'song' && oni.drop === 'S' && oni.need === 5 && !oni.drill,
      `マスタークラス ＝ きょくふう（Lv8 の ドロップ 5こで ひらく。「オニ」は つかわない）${JSON.stringify(oni)}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 19b. おんぷよみ Lv8：とびはねる メロディと 和音の かわりかた（けんばんの Lv7 は もとの まま）
  {
    const { page, errors } = await openPage(browser, 'index.html#/', MUSIC_ON);
    const r = await page.evaluate(() => {
      const out = { leapAll: true, range: true, noRepeat: true, slots: true, fm: true, chordsExist: true, fmSeen: 0, amSeen: 0, c7Seen: 0, lowSeen: 0 };
      for (let k = 0; k < 300; k++) {
        const deck = keysPhraseDeck(8, 'leap');
        const chords = deck.map(p => p.chord);
        deck.forEach(p => {
          const jumps = p.notes.slice(1).map((m, i) => Math.abs(m - p.notes[i]));
          if (!jumps.some(j => j >= 3)) out.leapAll = false;
          if (!p.notes.every(m => m >= 57 && m <= 72 && !TamaNotes.isBlack(m))) out.range = false;
          if (p.notes.some(m => m < 60)) out.lowSeen++;
          if (p.chord === 'Fm' && !p.notes.every(m => m % 12 === 5 || m % 12 === 0)) out.fm = false;
          if (!TamaSound.CHORDS[p.chord]) out.chordsExist = false;
        });
        if (chords.some((c, i) => i > 0 && c === chords[i - 1])) out.noRepeat = false;
        if (chords[0] !== 'C' || chords[1] !== 'F' || chords[5] !== 'F' || chords[3] !== 'C' || chords[7] !== 'C'
          || !['Am', 'C7'].includes(chords[4]) || !['G', 'G7', 'Fm'].includes(chords[2]) || !['G', 'G7', 'Fm'].includes(chords[6])) out.slots = false;
        if (deck[3].notes[2] % 12 !== 0 || deck[7].notes[2] % 12 !== 0) out.slots = false; // C の おわりは ド
        out.fmSeen += chords.filter(c => c === 'Fm').length;
        out.amSeen += chords.filter(c => c === 'Am').length;
        out.c7Seen += chords.filter(c => c === 'C7').length;
      }
      const keysDeck = keysPhraseDeck(8);
      out.keysSame = keysDeck.every((p, i) => (['C', 'F', ['G', 'G7'], 'C'][i % 4]).includes(p.chord)) && keysDeck.every(p => Object.values(KEYS_PHRASES).flat().some(q => q.join() === p.notes.join()));
      out.notesDef = MODES.notes.levels[8].melody === 'leap' && MODES.notes.levels.filter(l => l.melody === 'leap').length === 1 && !MODES.keys.levels[7].melody;
      return out;
    });
    ok(r.leapAll && r.range && r.lowSeen > 0, `どの メロディにも 3度より 大きい とび（ひくいラ〜たかいド の 白いけんばん。ひくい 音も 出る）${JSON.stringify(r)}`);
    ok(r.noRepeat && r.slots, '同じ 和音は つづかない（C の つぎの C は Am か C7、G の ところは G・G7・Fm、C は ドで おわる）');
    ok(r.fm && r.fmSeen > 0 && r.amSeen > 0 && r.c7Seen > 0 && r.chordsExist, `Fm の メロディは ファ と ド だけ。Am・C7・Fm も 出る（Fm ${r.fmSeen}・Am ${r.amSeen}・C7 ${r.c7Seen}）`);
    ok(r.keysSame && r.notesDef, 'けんばんの Lv7 は もとの メロディ（おんぷよみの Lv8・オニ だけ かわる）');
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

  // ---------- ヘおんよみ（js/modes/bass.js）：ヘ音記号。トロンボーン・ユーフォ と チューバ ----------
  const bassAll = { ...MUSIC_ON };
  for (const id of ['bassTb', 'bassTuba']) for (let l = 1; l <= 10; l++) bassAll[`${id}_coins_${l}`] = JSON.stringify(Array(3).fill({ image: '/img/Lmaru.png' }));

  // いまの レベルを ぜんぶ こたえる（せんを かぞえる・名前の ボタン・けんばん）
  async function answerBass(page) {
    for (let guard = 0; guard < 800; guard++) {
      const s = await page.evaluate(() => {
        const r = keysLesson.run;
        if (!r || r.finished) return { done: true };
        if (!r.accepting || !r.problem) return { wait: true };
        if (r.problem.type === 'lines') return { line: r.pos + 1 };
        const m = r.problem.notes[r.pos];
        if (m === undefined) return { wait: true };
        return r.def.answer === 'name' ? { step: TamaNotes.stepOf(m) } : { midi: m };
      });
      if (s.done) return;
      if (s.wait) { await page.waitForTimeout(120); continue; }
      if (s.line) await page.click(`#keysCards .staff-line-hit[data-line="${s.line}"]`);
      else if (s.step !== undefined) await page.click(`#keysAnswers .keys-answer[data-step="${s.step}"]`);
      else await pressKey(page, s.midi);
      await page.waitForTimeout(40);
    }
  }

  // 30. ヘおんよみ（トロンボーン・ユーフォ／チューバ）は お休み中：へやの ボタンは かくれていて、URL で ひらける。
  //     名前は ド3 の 段が「ただの ド」、ほかの 画面では もとに もどる
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', bassAll);
    ok(!(await page.isVisible('#musicBassTb')) && !(await page.isVisible('#musicBassTuba')), 'ヘおんよみ（トロンボーン・ユーフォ／チューバ）の ボタンは かくれている（お休み中）');
    await page.evaluate(() => { location.hash = '#/bassTb'; }); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/bassTb' && await page.isVisible('#openingScreen .title-bassTb'), 'トロンボーン・ユーフォ の レベル選択（タイトル）');
    ok((await page.$$('.select-level-buttons button')).length === 9, 'トロンボーン・ユーフォ は しくみ ＋ Lv1〜Lv8');
    await page.click('#level2'); await page.waitForTimeout(300);
    const names = await page.evaluate(() => ({
      home: TamaNotes.home, kind: TamaStaff.kind,
      names: [29, 36, 43, 48, 53, 60, 65].map(m => TamaNotes.lessonName(m)).join(' '),
      clef: !!document.querySelector('#keysCards .staff-clef.bass'), label: document.querySelector('#keysCards svg.staff').getAttribute('aria-label'),
      y: [TamaStaff.y(43), TamaStaff.y(53), TamaStaff.y(60), TamaStaff.y(29)], line: [43, 45, 53, 60].map(m => TamaStaff.onLine(m)),
    }));
    ok(names.home === 3 && names.kind === 'bass' && names.names === 'ひくいひくいファ ひくいド ひくいソ ド ファ たかいド たかいファ',
      `名前：ド3 の 段が「ド」、上は たかい、下は ひくい・ひくいひくい ${names.names}`);
    ok(names.clef && names.label.includes('ヘ音記号'), '五線は ヘ音記号');
    ok(names.y.join() === '180,120,80,260' && names.line.join() === 'true,false,true,true',
      `ヘ音記号の 高さ：いちばん下の せんが ひくいソ、4ほんめが ファ、上の かせん 1本が たかいド、下の かせん 4本が ひくいひくいファ ${JSON.stringify(names)}`);
    await page.evaluate(() => { location.hash = '#/music'; }); await page.waitForTimeout(300);
    ok(await page.evaluate(() => TamaNotes.home === 4 && TamaStaff.kind === 'treble' && TamaNotes.lessonName(60) === 'ド'), 'ほかの 画面へ いくと ト音記号・まんなかの ド に もどる');
    await page.evaluate(() => { location.hash = '#/bassTuba'; }); await page.waitForTimeout(300);
    ok(await page.isVisible('#openingScreen .title-bassTuba') && (await page.$$('.select-level-buttons button')).length === 10, 'チューバ は しくみ ＋ Lv1〜Lv9');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 31. しくみ（ヘ音記号）：せんを かぞえる → ファの せん → ひくいソ から のぼる・くだる
  {
    const { page, errors } = await openPage(browser, 'index.html#/bassTb', bassAll);
    await page.click('#level1'); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => keysLesson.run.deck.map(p => p.key));
    ok(deck.length === 7 && deck[0] === 'せんは5ほん' && deck[1] === 'ファ' && deck[2] === 'ひくいソ' && deck[3] === 'ひくいソひくいラひくいシドレミファソ', `しくみの ながれ ${deck.join(' / ')}`);
    await answerBass(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'しくみ クリア');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 32. まえはんは 名前の ボタン（ド〜シ。オクターブは とわない）。けんばんは 鳴るだけ。正解すると その 高さの けんばんが 光って 名前
  {
    const { page, errors } = await openPage(browser, 'index.html#/bassTb', bassAll);
    await page.click('#level2'); await page.waitForTimeout(300);
    ok((await page.$$eval('#keysAnswers .keys-answer', l => l.map(b => b.textContent))).join(' ') === 'ド レ ミ ファ ソ ラ シ', '名前の ボタン ド〜シ');
    const first = await page.evaluate(() => ({ m: keysLesson.run.problem.notes[0], dango: !!keysLesson.run.problem.dango, beckon: !!keysLesson.run.problem.beckon, msg: document.getElementById('keysMessage').textContent }));
    ok(first.dango && !first.beckon && first.msg.includes('なまえの ボタン'), `おだんごの お手本は ボタンで（けんばんの わっかは 出さない）${JSON.stringify(first)}`);
    await pressKey(page, first.m); await page.waitForTimeout(100);
    ok(await page.evaluate(() => keysLesson.run.pos === 0 && problemState.mistakeCount === 0), 'けんばんを おしても こたえに ならない（鳴るだけ）');
    const wrongStep = await page.evaluate(m => (TamaNotes.stepOf(m) + 1) % 7, first.m);
    await page.click(`#keysAnswers .keys-answer[data-step="${wrongStep}"]`); await page.waitForTimeout(100);
    ok(await page.evaluate(() => problemState.mistakeCount === 1 && /^(ド|レ|ミ|ファ|ソ|ラ|シ)$/.test(problemState.mistakes[0].correct)), 'ちがう 名前は まちがい（せいかいは オクターブ なしの 名前）');
    await page.click(`#keysAnswers .keys-answer[data-step="${await page.evaluate(m => TamaNotes.stepOf(m), first.m)}"]`); await page.waitForTimeout(100);
    const hit = await page.evaluate(m => ({ pos: keysLesson.run.pos, balloon: (document.querySelector(`#keysKeyboard .tk-balloon[data-midi="${m}"]`) || {}).textContent, name: TamaNotes.lessonName(m) }), first.m);
    ok(hit.pos === 1 && hit.balloon === hit.name, `正解すると つぎの おだんご へ。けんばんの その 高さに 名前（${hit.balloon}）`);
    await answerBass(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv1 クリア（名前の ボタン）');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 33. うしろはんは けんばんで 高さまで（同じ 名前でも オクターブが ちがうと まちがい）。トロンボーン・ユーフォ の そとの おと・メロディ
  {
    const { page, errors } = await openPage(browser, 'index.html#/bassTb', bassAll);
    await page.click('#level6'); await page.waitForTimeout(300);
    const outer = await page.evaluate(() => ({ notes: [...new Set(keysLesson.run.deck.flatMap(p => p.notes))].sort((a, b) => a - b).join(), star: document.querySelectorAll('#keysKeyboard .tk-mark').length,
      starKey: Number((document.querySelector('#keysKeyboard .tk-mark') || { parentElement: { dataset: {} } }).parentElement.dataset.midi) }));
    ok(outer.notes === '41,57,59,60,62,64,65' && outer.star === 1 && outer.starKey === 60, `そとの おと：ひくいファ と うえの おと（たかいファ まで）。まんなかの ド に ★ ${JSON.stringify(outer)}`);
    await page.click('#keysScreen .returnButton'); await page.waitForTimeout(300);
    await page.click('#level8'); await page.waitForTimeout(300);
    ok((await page.$$('#keysAnswers .keys-answer')).length === 0, 'けんばんで こたえる レベルは ボタンなし');
    const m = await expected(page);
    const other = m + 12 <= 65 ? m + 12 : m - 12; // ひくいファ〜たかいファ の なかで 1オクターブ ちがい
    await pressKey(page, other); await page.waitForTimeout(100);
    ok(await page.evaluate(() => problemState.mistakeCount) === 1, '同じ 名前でも オクターブが ちがうと まちがい');
    await answerBass(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv7 ファ〜ファ クリア');
    await page.click('#completionModal >> text=もんだいをえらぶ').catch(() => {}); await page.waitForTimeout(300);
    await page.evaluate(() => { location.hash = '#/music'; }); await page.waitForTimeout(200);
    await page.evaluate(() => { location.hash = '#/bassTb'; }); await page.waitForTimeout(300);
    await page.click('#level9'); await page.waitForTimeout(300);
    const melody = await page.evaluate(() => keysLesson.run.deck.flatMap(p => p.notes));
    ok(melody.length > 0 && melody.every(n => n >= 45 && n <= 60), `メロディは 1オクターブ 下（ひくいラ〜たかいド）${Math.min(...melody)}〜${Math.max(...melody)}`);
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 34. チューバ：下の かせん（ひくいひくいファ まで）・ベースの うごき・せまい 画面
  {
    const { page, errors } = await openPage(browser, 'index.html#/bassTuba', bassAll);
    await page.click('#level7'); await page.waitForTimeout(300);
    const low = await page.evaluate(() => ({ notes: [...new Set(keysLesson.run.deck.flatMap(p => p.notes))].sort((a, b) => a - b).join(),
      height: Number(document.querySelector('#keysCards svg.staff').getAttribute('viewBox').split(' ')[3]), star: document.querySelectorAll('#keysKeyboard .tk-mark').length }));
    ok(low.notes === '29,31,33,35,36,38' && low.height > 260 && low.star === 0, `もっと したの おと：ひくいひくいファ〜ひくいレ（かせん 4本 まで。五線の 絵が 下に のびる）${JSON.stringify(low)}`);
    await answerBass(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv6 もっと したの おと クリア');
    await page.evaluate(() => { location.hash = '#/music'; }); await page.waitForTimeout(200);
    await page.evaluate(() => { location.hash = '#/bassTuba'; }); await page.waitForTimeout(300);
    await page.click('#level10'); await page.waitForTimeout(300);
    const line = await page.evaluate(() => ({ n: keysLesson.run.deck.length, notes: keysLesson.run.deck.flatMap(p => p.notes), multi: keysLesson.run.deck.every(p => p.notes.length >= 2) }));
    ok(line.n === 10 && line.multi && line.notes.every(n => n >= 29 && n <= 50), `ベースの うごき 10もん（ひくいひくいファ〜レ）`);
    await answerBass(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv9 ベースの うごき クリア');
    // せまい 画面では つかわない けんばんを 見せない（ひくいひくいファ〜レ の 白 13こ）
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { location.hash = '#/music'; }); await page.waitForTimeout(200);
    await page.evaluate(() => { location.hash = '#/bassTuba'; }); await page.waitForTimeout(300);
    await page.click('#level9'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => document.querySelectorAll('#keysKeyboard .tk-white-key').length) === 13, 'せまい 画面の チューバ Lv8 は 白 13こ');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // ---------- おんぷよみ／ヘおん（js/modes/notes-bass.js）：ト音記号の おんぷよみ を ヘ音記号に。ふつうの けんばんで ----------
  const nbAll = { ...MUSIC_ON };
  for (let l = 1; l <= 9; l++) nbAll[`notesBass_coins_${l}`] = JSON.stringify(Array(3).fill({ image: '/img/Lmaru.png' }));

  // 35. へやの ボタン → レベル選択。しくみ（だい2かんの ド 〜 たかいド）
  {
    const { page, errors } = await openPage(browser, 'index.html#/music', nbAll);
    await page.click('#musicNotesBass'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#/notesBass' && await page.isVisible('#openingScreen .title-notesBass'), 'おんぷよみ ヘおん の レベル選択（タイトル）');
    ok((await page.$$eval('.select-level-buttons button', l => l.map(b => b.textContent).join(','))) === 'しくみ,Lv1 あいだの おだんご,Lv2 せんの おだんご,Lv3 おだんご まぜ,Lv4 おだんごの つづき,Lv5 ド〜ド,Lv6 うえの おと,Lv7 したの おと,Lv8 メロディ',
      'レベルは しくみ ＋ Lv1〜Lv8（ト音記号と 同じ ならび。マスタークラスは まだ）');
    await page.click('#level1'); await page.waitForTimeout(300);
    const tour = await page.evaluate(() => ({ deck: keysLesson.run.deck.map(p => p.key), notes: keysLesson.run.deck[2].notes.join(), home: TamaNotes.home, kind: TamaStaff.kind,
      sing: keysLesson.run.def.sing, start: keysLesson.run.deck[1].say }));
    ok(tour.home === 3 && tour.kind === 'bass' && tour.sing, 'ヘ音記号・ド3 が「ド」・けんばんを おすと うたう');
    ok(tour.deck.slice(0, 4).join(' / ') === 'せんは5ほん / ド / ドレミファソラシたかいド / たかいドシラソファミレド' && tour.notes === '48,50,52,53,55,57,59,60' && tour.start.includes('2つめの あいだ'),
      `しくみ：せんを かぞえる → だい2かんの ド → ド〜たかいド を のぼる・くだる ${tour.deck.join(' / ')}`);
    await answerBass(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'しくみ クリア');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 36. おだんご：あいだの ド・ミ・ソ（C）→ せんの レ・ファ・ラ（Dm）。ト音記号と 線・あいだ が 入れかわる。けんばんで こたえる
  {
    const { page, errors } = await openPage(browser, 'index.html#/notesBass', nbAll);
    await page.click('#level2'); await page.waitForTimeout(300);
    const lv1 = await page.evaluate(() => ({ dango: keysLesson.run.deck.find(p => p.dango), buttons: document.querySelectorAll('#keysAnswers .keys-answer').length,
      onLine: [48, 52, 55, 50, 53, 57].map(m => TamaStaff.onLine(m)).join() }));
    ok(lv1.dango.notes.join() === '48,52,55' && lv1.dango.chord === 'C' && lv1.buttons === 0 && lv1.onLine === 'false,false,false,true,true,true',
      `Lv1 は あいだの ド・ミ・ソ（C）。レ・ファ・ラ は せんの 上。名前の ボタンは なし（けんばんで）${JSON.stringify(lv1.dango)}`);
    await answerBass(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv1 あいだの おだんご クリア');
    await page.evaluate(() => { location.hash = '#/music'; }); await page.waitForTimeout(200);
    await page.evaluate(() => { location.hash = '#/notesBass'; }); await page.waitForTimeout(300);
    await page.click('#level3'); await page.waitForTimeout(300);
    const lv2 = await page.evaluate(() => keysLesson.run.deck.find(p => p.dango));
    ok(lv2.notes.join() === '50,53,57' && lv2.chord === 'Dm', 'Lv2 は せんの レ・ファ・ラ（Dm）');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  // 37. はんい：ひくいファ（下第1間）〜 たかいミ（上第2線）。うえの おと・したの おと・メロディ
  {
    const { page, errors } = await openPage(browser, 'index.html#/notesBass', nbAll);
    const ranges = await page.evaluate(() => {
      const notesOf = level => [...new Set(MODES.notesBass.levels[level].dangos.flatMap(d => d.notes).concat(MODES.notesBass.levels[level].singles))].sort((a, b) => a - b).join();
      const all = MODES.notesBass.levels.flatMap(l => (l.notes || []).concat(l.singles || [], (l.dangos || []).flatMap(d => d.notes)));
      return { up: notesOf(6), down: notesOf(7), low: Math.min(...all), high: Math.max(...all), names: [41, 64].map(m => { TamaNotes.home = 3; return TamaNotes.lessonName(m); }).join(' ') };
    });
    ok(ranges.up === '55,57,59,60,62,64' && ranges.down === '41,43,45,47,48,50' && ranges.low === 41 && ranges.high === 64 && ranges.names === 'ひくいファ たかいミ',
      `うえの おと（ソ〜たかいミ）・したの おと（ひくいファ〜レ）。はんいは ひくいファ〜たかいミ ${JSON.stringify(ranges)}`);
    await page.click('#level9'); await page.waitForTimeout(300);
    const melody = await page.evaluate(() => keysLesson.run.deck.flatMap(p => p.notes));
    ok(melody.length > 0 && melody.every(n => n >= 41 && n <= 64), `メロディは はんいの 中（${Math.min(...melody)}〜${Math.max(...melody)}）`);
    await answerBass(page);
    await page.waitForTimeout(400);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv8 メロディ クリア');
    ok(errors().length === 0, `エラーなし ${errors().join(' / ')}`);
    await page.close();
  }

  await browser.close();
  console.log(failures === 0 ? 'ALL PASSED' : `${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
