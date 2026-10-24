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
  await page.route(/gstatic|googleapis|jsdelivr/, r => r.abort());
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
    const { page, errors } = await openPage(ctx, 'tamasubdrops.html', { sub_coins_1: JSON.stringify([{ image: '/img/Lmaru.png', date: '1/2' }]) });
    await page.click('#openDataModal');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportData')]);
    ok(/^tamadoro_\d{8}\.txt$/.test(dl.suggestedFilename()), `セーブのファイル名 ${dl.suggestedFilename()}`);
    const file = await dl.path();
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    ok(saved.sub_coins_1 && JSON.parse(saved.sub_coins_1).length === 1, 'セーブにドロップが入っている');
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));

    const ctx2 = await newCtx();
    const { page: idx, errors: e2 } = await openPage(ctx2, 'index.html');
    await idx.click('#openDataModalHome');
    const [chooser] = await Promise.all([idx.waitForEvent('filechooser'), idx.click('#importData')]);
    await chooser.setFiles(file); await idx.waitForTimeout(300);
    ok(await idx.evaluate(() => !!localStorage.getItem('sub_coins_1')), 'index でロードできる');
    ok(await idx.$eval('#notification', e => e.textContent) === 'データをよみこみました。', 'ロードの通知');
    ok(await idx.$eval('#dataModal', e => e.style.display) === 'none', 'ロード後にモーダルが閉じる');
    // 読み込んだデータでひきざんページの Lv2 はまだロック、ドロップ表示はある
    const p2 = await ctx2.newPage(); await p2.route(/gstatic|googleapis|jsdelivr/, r => r.abort());
    await p2.goto(BASE + 'tamasubdrops.html'); await p2.waitForTimeout(400);
    ok(await p2.$$eval('#coins1 .main-reward-coin', l => l.length) === 1, 'ロードしたドロップがメニューに出る');
    ok(e2.length === 0, 'index エラーなし ' + e2.join(' / '));
    await ctx.close(); await ctx2.close();
  }

  // たしざん：/rescue で Lv11 まで → Lv10 に5個
  {
    const ctx = await newCtx();
    const { page, errors } = await openPage(ctx, 'tamaadddrops.html');
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
    const { page, errors } = await openPage(ctx, 'tamaadddrops.html', seed);
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
    const { page } = await openPage(ctx, 'tamamultidrops.html');
    const box = await page.$eval('#touchArea', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    // ねこの上で押して、左右に こする（はじめて開いた画面でも、すぐに反応する）
    await page.mouse.move(box.x - 40, box.y); await page.mouse.down();
    for (let i = 0; i < 3; i++) { await page.mouse.move(box.x + 40, box.y, { steps: 4 }); await page.mouse.move(box.x - 40, box.y, { steps: 4 }); }
    await page.mouse.up(); await page.waitForTimeout(300);
    ok((await page.$$('.speech-bubble')).length === 1, 'こするとタマがしゃべる（3往復で）');
    await ctx.close();
  }

  // 百マス：/delete で関連データが全部消えてリロード、Lv6 スライダー保存
  {
    const ctx = await newCtx();
    const seed = { hundredgrid_coins_3: JSON.stringify(Array(3).fill({ image: '/img/Bmaru.png' })), hundredgrid_level_1_best_time: '30', hundredgrid_level_1_correct_count: '320', hundredgrid_level_1_records: '[]', customize_level6_sliders: '{"custom-rows":"4"}' };
    const { page, errors } = await openPage(ctx, 'tamahundredgrid.html', seed);
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
