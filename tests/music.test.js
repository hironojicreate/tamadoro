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
    ok((await page.$$('#musicScreen .music-lesson.coming:disabled')).length === 2, 'おんぷよみ・リズムは じゅんびちゅう（押せない）');

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
