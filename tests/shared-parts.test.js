// 第2段階で共通化した部品のテスト
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };
async function openPage(ctx, path, storage = {}) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
  await page.addInitScript(s => { if (!sessionStorage.seeded) { for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.seeded = 1; } }, storage);
  await page.goto(BASE + path); await page.waitForTimeout(500);
  return { page, errors };
}
const command = (page, c) => page.evaluate(c => { const t = document.getElementById('commandInput'); t.value = c; t.dispatchEvent(new Event('input')); }, c);

(async () => {
  const browser = await chromium.launch();
  const newCtx = () => browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });

  // セーブ（各ページ・index）→ index でロード
  {
    const ctx = await newCtx();
    const { page, errors } = await openPage(ctx, 'index.html#/sub', { sub_coins_1: JSON.stringify([{ image: '/img/Lmaru.png', date: '1/2' }]) });
    await page.click('#openDataModal');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportData')]);
    ok(/^tamadoro_\d{8}\.json$/.test(dl.suggestedFilename()), `セーブのファイル名は .json ${dl.suggestedFilename()}`);
    const file = await dl.path();
    const raw = fs.readFileSync(file, 'utf8');
    const saved = JSON.parse(raw);
    ok(saved.format === 'tamadoro-save' && saved.version === 2 && !!saved.savedAt, 'セーブは タマドロの セーブファイルの 形');
    ok(Array.isArray(saved.data.sub_coins_1) && saved.data.sub_coins_1.length === 1 && saved.data.sub_coins_1[0].image === '/img/Lmaru.png',
      'セーブに ドロップが ふつうの JSON（入れ子）で 入っている');
    ok(raw.includes('\n  "data": {') && !raw.includes('\\"'), 'セーブは 改行・字下げ つきで、中に \\" が ない');
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));

    const ctx2 = await newCtx();
    const { page: idx, errors: e2 } = await openPage(ctx2, 'index.html');
    await idx.click('#openDataModalHome');
    await idx.click('#importData');
    ok(await idx.isVisible('#importChoice'), 'ロードを押すと、よみこみかたをえらぶ');
    const [chooser] = await Promise.all([idx.waitForEvent('filechooser'), idx.click('#importMerge')]);
    await chooser.setFiles(file); await idx.waitForTimeout(300);
    ok(await idx.evaluate(() => !!localStorage.getItem('sub_coins_1')), 'index でロードできる');
    ok(await idx.$eval('#notification', e => e.textContent) === 'データをよみこみました。', 'ロードの通知');
    ok(await idx.$eval('#dataModal', e => e.style.display) === 'none', 'ロード後にモーダルが閉じる');
    // 読み込んだデータでひきざんページの Lv2 はまだロック、ドロップ表示はある
    const p2 = await ctx2.newPage(); await p2.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
    await p2.goto(BASE + 'index.html#/sub'); await p2.waitForTimeout(400);
    ok(await p2.$$eval('#coins1 .main-reward-coin', l => l.length) === 1, 'ロードしたドロップがメニューに出る');
    ok(e2.length === 0, 'index エラーなし ' + e2.join(' / '));
    await ctx.close(); await ctx2.close();
  }

  // ロードの「たして」と「うわがき」
  {
    const before = {
      add_coins_1: JSON.stringify([{ image: '/img/Amaru.png', date: '1/2' }]),
      sub_coins_1: JSON.stringify([{ image: '/img/Bmaru.png', date: '1/3' }]),
      'tamadoro.schema': '1',
      'tamadoro.log.v1': JSON.stringify([{ t: 1, mode: 'add', level: 1, ms: 5000, total: 10, miss: 0, cleared: true, drop: null }]),
    };
    // むかしのアプリのセーブファイル（記録なし・ドロップだけ）
    const oldFile = require('path').join(require('os').tmpdir(), 'tashizan_d_test.txt');
    fs.writeFileSync(oldFile, JSON.stringify({ multi_coins_1: JSON.stringify([{ image: '/img/Cmaru.png', date: '1/4' }]), sub_coins_1: JSON.stringify([]) }));
    const load = async (button) => {
      const ctx = await newCtx();
      const { page, errors } = await openPage(ctx, 'index.html', before);
      await page.click('#openDataModalHome');
      await page.click('#importData');
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click(button)]);
      await chooser.setFiles(oldFile); await page.waitForTimeout(300);
      const result = await page.evaluate(() => ({ ...localStorage }));
      const note = await page.$eval('#notification', e => e.textContent);
      await ctx.close();
      return { result, note, errors };
    };

    const merged = await load('#importMerge');
    ok(merged.result.add_coins_1 === before.add_coins_1, 'たして：ファイルにないドロップはのこる');
    ok(merged.result.sub_coins_1 === '[]', 'たして：ファイルにあるドロップは入れかわる');
    ok(!!merged.result.multi_coins_1, 'たして：ファイルのドロップが入る');
    ok(JSON.parse(merged.result['tamadoro.log.v1']).length === 1, 'たして：いまの記録はのこる');
    ok(merged.note === 'データをよみこみました。', 'たして：通知');

    const replaced = await load('#importReplace');
    ok(!replaced.result.add_coins_1, 'うわがき：ファイルにないドロップは消える');
    ok(!!replaced.result.multi_coins_1, 'うわがき：ファイルのドロップが入る');
    const log = JSON.parse(replaced.result['tamadoro.log.v1']);
    ok(log.length === 1 && log[0].mode === 'multi' && log[0].imported, 'うわがき：いまの記録は消え、ファイルのドロップが記録に取りこまれる');
    ok(replaced.note === 'データをうわがきして よみこみました。', 'うわがき：通知');
    ok(merged.errors.length === 0 && replaced.errors.length === 0, 'ロードでエラーなし ' + [...merged.errors, ...replaced.errors].join(' / '));

    // 新しい .json の セーブ → ロードで、もとの localStorage と まったく 同じに もどる（JSON では ない 文字も）
    {
      const ctx = await newCtx();
      const odd = { ...before, 'tamadoro.music.enabled': 'true', 'tamadoro.notes.dataVersion': '5', plain_text: 'ひづけ ON', quoted: '"abc"', spaced: '[1, 2]' };
      const { page } = await openPage(ctx, 'index.html', odd);
      await page.click('#openDataModalHome');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportData')]);
      const saved = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
      const want = await page.evaluate(() => ({ ...localStorage }));
      await page.evaluate(() => localStorage.clear());
      await page.click('#importData');
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#importReplace')]);
      await chooser.setFiles(await dl.path()); await page.waitForTimeout(300);
      const got = await page.evaluate(() => ({ ...localStorage }));
      const same = Object.keys(want).every(k => got[k] === want[k]) && Object.keys(got).length === Object.keys(want).length;
      ok(same && saved.text.plain_text === 'ひづけ ON' && saved.data.quoted === 'abc' && saved.text.spaced === '[1, 2]' && saved.data['tamadoro.music.enabled'] === true,
        `.json の セーブ → ロードで もとどおり（JSON では ない 文字は text に そのまま）${JSON.stringify({ text: saved.text })}`);
      ok(await page.evaluate(() => document.getElementById('fileInput').accept) === '.json,.txt,application/json,text/plain', 'ロードは .json も .txt も えらべる');
      await ctx.close();
    }

    // 「たして」：きょくノートの 曲と ずかんは 入れかえずに あわせる（同じ 曲は 1つ・新しい じゅん）
    {
      const song = (id, style) => ({ id, date: '2026/11/8', style, rhythm: 'genki', phrases: [], take: [], pace: 'choudo', words: [], seed: 0 });
      const nowState = { ...before, 'tamadoro.notes.songbook': JSON.stringify([song('3000-1', 'komuro'), song('1000-1', 'doyo')]), 'tamadoro.notes.families': JSON.stringify(['pops', 'doyo']) };
      const noteFile = require('path').join(require('os').tmpdir(), 'tamadoro_note_test.json');
      fs.writeFileSync(noteFile, JSON.stringify({ format: 'tamadoro-save', version: 2, savedAt: '', data: {
        'tamadoro.notes.songbook': [song('2000-1', 'twofive'), { ...song('1000-1', 'doyo'), seed: 3 }],
        'tamadoro.notes.families': ['jazz', 'pops'],
        add_coins_1: [],
      }, text: {} }, null, 2));
      const loadNote = async button => {
        const ctx = await newCtx();
        const { page } = await openPage(ctx, 'index.html', nowState);
        await page.click('#openDataModalHome');
        await page.click('#importData');
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click(button)]);
        await chooser.setFiles(noteFile); await page.waitForTimeout(300);
        const result = await page.evaluate(() => ({ ...localStorage }));
        await ctx.close();
        return result;
      };
      const m = await loadNote('#importMerge');
      const songs = JSON.parse(m['tamadoro.notes.songbook']);
      ok(songs.map(x => x.id).join() === '3000-1,2000-1,1000-1' && songs[2].seed === 3, `たして：きょくノートは 両方の 曲（同じ 曲は 1つ・ファイルの ほう。新しい じゅん）${songs.map(x => x.id).join()}`);
      ok(JSON.parse(m['tamadoro.notes.families']).join() === 'pops,doyo,jazz', `たして：ずかんは 両方の 系統 ${m['tamadoro.notes.families']}`);
      ok(m.add_coins_1 === '[]', 'たして：ほかの データは これまでどおり ファイルの ほうに 入れかわる');
      const r = await loadNote('#importReplace');
      ok(JSON.parse(r['tamadoro.notes.songbook']).map(x => x.id).join() === '2000-1,1000-1' && JSON.parse(r['tamadoro.notes.families']).join() === 'jazz,pops',
        'うわがき：きょくノートも ずかんも ファイルの とおり');
    }

    // こわれたファイルを「うわがき」でえらんでも、いまのデータは消えない
    fs.writeFileSync(oldFile, 'こわれたファイル');
    const broken = await load('#importReplace');
    ok(broken.result.add_coins_1 === before.add_coins_1, 'うわがき：こわれたファイルなら、いまのデータは消えない');
    ok(broken.note === 'データをよみこめませんでした。', 'うわがき：こわれたファイルの通知');

    // やめる
    const ctx = await newCtx();
    const { page } = await openPage(ctx, 'index.html');
    await page.click('#openDataModalHome');
    await page.click('#importData');
    await page.click('#importCancel');
    ok(!(await page.isVisible('#importChoice')), 'やめるで、えらぶところが閉じる');
    await ctx.close();
  }

  // レベル選択に たくさん並ぶドロップは軽い PNG、投げるときは SVG。オニ（黒）の光は描き直しのいらない opacity で動かす
  {
    const ctx = await newCtx();
    const storage = {};
    for (let lv = 1; lv <= 30; lv++) storage[`multi_coins_${lv}`] = JSON.stringify(Array.from({ length: 5 }, () => ({ image: '/img/Amaru.png', date: '1/2' })));
    const { page, errors } = await openPage(ctx, 'index.html#/multi', storage);
    const srcs = await page.$$eval('.main-reward-coin', l => l.map(e => new URL(e.src).pathname));
    ok(srcs.length === 150 && srcs.every(s => s === '/img/drops/small/A.png'), `メニューのドロップは小さい PNG ${srcs.length}こ`);
    const png = await page.evaluate(() => fetch('/img/drops/small/G.png').then(r => r.ok));
    ok(png, '金のドロップの小さい PNG もある');
    await page.evaluate(() => throwCoin(30, false, 50, 1, 30)); await page.waitForTimeout(300);
    ok(await page.$eval('.coin', e => new URL(e.src).pathname) === '/img/drops/A.svg', '投げるドロップは SVG');
    const anims = await page.evaluate(() => document.getElementById('level30').getAnimations({ subtree: true })
      .map(a => a.effect.getKeyframes().flatMap(k => Object.keys(k)).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k))));
    ok(anims.length > 0 && anims.every(props => props.every(p => p === 'opacity')), `オニ（黒）の光は opacity だけで動く ${JSON.stringify(anims)}`);
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
    await ctx.close();
  }

  // たしざん：/rescue で Lv11 まで → Lv10 に5個
  {
    const ctx = await newCtx();
    const { page, errors } = await openPage(ctx, 'index.html#/add');
    await page.click('#openDataModal'); await command(page, '/rescue');
    ok(await page.$eval('#rescueModal', e => e.style.display) === 'block', '/rescue でモーダル');
    await page.$eval('#levelSlider', e => { e.value = 11; e.dispatchEvent(new Event('input')); });
    ok(await page.$eval('#sliderValue', e => e.textContent) === 'Lv11', 'スライダー表示');
    await page.click('#rescueModal button >> nth=0'); await page.waitForTimeout(300);
    const counts = await page.evaluate(() => Array.from({ length: 11 }, (_, i) => JSON.parse(localStorage.getItem(`add_coins_${i + 1}`)).length));
    ok(JSON.stringify(counts) === JSON.stringify([3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 0]), `rescue のドロップ数 ${counts}`);
    ok(await page.isVisible('#level11'), 'オニが解放');
    ok(await page.$eval('#levelSlider', e => e.value) === '2', 'スライダーが戻る');
    // 日付 ON/OFF（rescue のドロップは「ﾜｽﾚﾀ」）
    await page.click('#openDataModal'); await page.click('#toggleDateButton');
    const msgs = await page.$$eval('.message-div', l => l.map(x => x.textContent));
    ok(msgs.length > 0 && msgs.every(m => m === 'ﾜｽﾚﾀﾆｬ'), `日付ON: ${msgs.length}個 ${msgs[0]}`);
    await page.click('#toggleDateButton');
    ok((await page.$$('.message-div')).length === 0, '日付OFF');
    await page.click('#closeDataModalDummy').catch(() => {});
    await page.evaluate(() => closeDataModal());
    // /master on → マスターボタン
    await page.click('#openDataModal'); await command(page, '/master on');
    ok(await page.$eval('#masterButton', e => e.style.display) === 'block', '/master on');
    // /delete
    await page.click('#openDataModal'); await command(page, '/delete');
    await page.click('#deleteModal button >> nth=0'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('add_coins_')).length) === 0, '/delete でたしざんのドロップが消える');
    ok(!(await page.isVisible('#level2')), '/delete 後は Lv2 がロック');
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
    await ctx.close();
  }

  // たしざん Lv10 ノーミス → 特別メッセージで、メニューのドロップを全部投げる
  {
    const ctx = await newCtx();
    const seed = {}; for (let l = 1; l <= 9; l++) seed[`add_coins_${l}`] = JSON.stringify([{ image: '/img/Lmaru.png' }, { image: '/img/Lmaru.png' }, { image: '/img/Lmaru.png' }]);
    const { page, errors } = await openPage(ctx, 'index.html#/add', seed);
    await page.click('#level10'); await page.waitForTimeout(900);
    const total = await page.evaluate(() => MODES.add.levels[9].patterns().length);
    for (let i = 0; i < total; i++) {
      const a = await page.evaluate(() => problemState.answer);
      await page.keyboard.press(String(Math.floor(a / 10))); await page.waitForTimeout(30);
      await page.keyboard.press(String(a % 10)); await page.waitForTimeout(800);
    }
    ok(await page.evaluate(() => problemState.lvTenClear && problemState.useExistingCoins === 10), 'Lv10 ノーミスでフラグ');
    await page.evaluate(() => returnToLevelSelection()); await page.waitForTimeout(2800);
    const menuDrops = await page.$$eval('.main-reward-coin', l => l.length);
    await page.evaluate(() => displayCachedMessage(10)); await page.waitForTimeout(menuDrops * 100 + 300);
    ok(await page.$eval('.speech-bubble p', e => e.innerHTML.includes('Lv10もんだいのクリア')), 'Lv10 お祝いメッセージ（tashizan_message.json）');
    ok((await page.$$('.coin')).length >= menuDrops, `メニューのドロップ ${menuDrops} 個を投げる`);
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
    await ctx.close();
  }

  // タマをこするとしゃべる
  {
    const ctx = await newCtx();
    const { page } = await openPage(ctx, 'index.html#/multi');
    const box = await page.$eval('#touchArea', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    // ねこの上で押して、左右に こする（はじめて開いた画面でも、すぐに反応する）
    await page.mouse.move(box.x - 40, box.y); await page.mouse.down();
    for (let i = 0; i < 5; i++) { await page.mouse.move(box.x + 40, box.y, { steps: 4 }); await page.mouse.move(box.x - 40, box.y, { steps: 4 }); }
    await page.mouse.up(); await page.waitForTimeout(300);
    ok((await page.$$('.speech-bubble')).length === 1, 'こするとタマがしゃべる（5往復で）');
    await ctx.close();
  }

  // 百マス：/delete で関連データが全部消えてリロード、Lv6 スライダー保存
  {
    const ctx = await newCtx();
    const seed = { hundredgrid_coins_3: JSON.stringify(Array(3).fill({ image: '/img/Bmaru.png' })), hundredgrid_level_1_best_time: '30', hundredgrid_level_1_correct_count: '320', hundredgrid_level_1_records: '[]', customize_level6_sliders: '{"custom-rows":"4"}' };
    const { page, errors } = await openPage(ctx, 'index.html#/hundredgrid', seed);
    ok(await page.isVisible('button#level5'), '百マス Lv5：正答数300以上で解放');
    ok(await page.isVisible('button#level6'), '百マス Lv6：Lv3 のドロップ3個で解放');
    await page.click('button#level6'); await page.waitForTimeout(800);
    ok(await page.isVisible('#customize-level6') && !(await page.isVisible('#recordDisplay')), 'Lv6 はスライダーを表示');
    ok(await page.evaluate(() => currentTotalRows) === 4, 'Lv6 スライダーの保存値を復元');
    await page.$eval('#custom-cols', e => { e.value = 3; e.dispatchEvent(new Event('input')); });
    await page.click('#hundredgridScreen .returnButton'); await page.waitForTimeout(300);
    ok(JSON.parse(await page.evaluate(() => localStorage.getItem('customize_level6_sliders')))['custom-cols'] === '3', 'もどるでスライダー値を保存');
    await page.click('button#level1'); await page.waitForTimeout(800);
    ok(!(await page.isVisible('#customize-level6')) && await page.isVisible('#recordDisplay'), 'Lv1 はタイムを表示');
    await page.click('#hundredgridScreen .returnButton'); await page.waitForTimeout(300);
    await page.click('#openDataModal'); await command(page, '/delete');
    await Promise.all([page.waitForEvent('load'), page.click('#deleteModal button >> nth=0')]);
    const left = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hundredgrid') || k.startsWith('customize')));
    ok(left.length === 0, `/delete で百マスのデータが全部消える ${left}`);
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
