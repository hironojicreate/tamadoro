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
const press = (page, k) => page.keyboard.press(String(k));
const answer = async page => page.evaluate(() => problemState.answer);
async function answerCorrect(page) {
  const a = await answer(page);
  if (a >= 10) { await press(page, Math.floor(a / 10)); await page.waitForTimeout(50); await press(page, a % 10); }
  else await press(page, a);
  await page.waitForTimeout(850);
}

(async () => {
  const browser = await chromium.launch();

  // 1. 全ページがエラーなく開く
  for (const p of ['index.html', 'index.html#/add', 'index.html#/sub', 'index.html#/multi', 'index.html#/hundredgrid']) {
    const { page, errors } = await openPage(browser, p);
    ok(errors().length === 0, `${p} はエラーなく開く ${errors().join(' / ')}`);
    await page.close();
  }

  // 2. メニュー画面で数字キーを押しても何も起きない
  {
    const { page, errors } = await openPage(browser, 'index.html#/add');
    for (let i = 0; i < 8; i++) { await press(page, i % 10); await page.waitForTimeout(30); }
    await page.waitForTimeout(900);
    ok(await page.$eval('#mistakeModal', e => e.style.display) !== 'flex', 'メニューでキーを押してもミスモーダルが出ない');
    ok((await page.$$('.coin')).length === 0, 'メニューでキーを押してもドロップが飛ばない');
    ok(errors().length === 0, 'エラーなし');
    await page.close();
  }

  // 3. たしざん Lv9（2けた）：十の位のミスが数えられる
  {
    const seed = {}; for (let l = 1; l <= 8; l++) seed[`add_coins_${l}`] = JSON.stringify([{ image: '/img/Lmaru.png' }, { image: '/img/Lmaru.png' }, { image: '/img/Lmaru.png' }]);
    const { page, errors } = await openPage(browser, 'index.html#/add', seed);
    ok(await page.isVisible('#level9'), 'Lv9 が解放されている（既存データ互換）');
    await page.click('#level9'); await page.waitForTimeout(900);
    const a = await answer(page);
    const wrongTens = Math.floor(a / 10) === 1 ? 2 : 1;
    for (let i = 0; i < 5; i++) { await press(page, wrongTens); await page.waitForTimeout(80); }
    await page.waitForTimeout(300);
    ok(await page.$eval('#mistakeModal', e => e.style.display) === 'flex', '十の位を5回まちがえるとミスモーダルが出る');
    const items = await page.$$eval('#mistakeList li', l => l.map(x => x.textContent));
    ok(items.length === 5 && items[0].includes(`= ${wrongTens}□`) && items[0].includes(`せいかいは ${a}`), `間違いリスト: ${items[0]}`);
    // もういちど → 間違いリストは持ち越さない
    await page.click('#mistakeModal button >> nth=0'); await page.waitForTimeout(900);
    ok(await page.evaluate(() => problemState.mistakes.length) === 0, 'もういちどで間違いリストがリセットされる');
    // 一の位のミスは入力した2けたで記録
    const b = await answer(page);
    if (b >= 10) {
      await press(page, Math.floor(b / 10)); await page.waitForTimeout(50);
      const wrongOnes = (b % 10 + 1) % 10; await press(page, wrongOnes); await page.waitForTimeout(100);
      const m = await page.evaluate(() => problemState.mistakes[0].problem);
      ok(m.endsWith(`= ${Math.floor(b / 10)}${wrongOnes}`), `一の位のミスは2けたで記録: ${m}`);
    }
    ok(errors().length === 0, 'エラーなし ' + errors().join(' / '));
    await page.close();
  }

  // 4. たしざん Lv1 を全問正解 → クリア、ドロップ保存
  {
    const { page, errors } = await openPage(browser, 'index.html#/add');
    await page.click('#level1'); await page.waitForTimeout(900);
    for (let i = 0; i < 6; i++) await answerCorrect(page);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'Lv1 クリアモーダル');
    const coins = await page.evaluate(() => JSON.parse(localStorage.getItem('add_coins_1')));
    ok(coins.length === 1 && coins[0].image === '/img/Gmaru.png', 'ノーミスで金ドロップ保存');
    ok(errors().length === 0, 'エラーなし ' + errors().join(' / '));
    await page.close();
  }

  // 5. ひきざん：間違いの表示が「は と」にならない
  {
    const { page, errors } = await openPage(browser, 'index.html#/sub');
    await page.click('#level1'); await page.waitForTimeout(900);
    const a = await answer(page);
    await press(page, (a + 1) % 10); await page.waitForTimeout(100);
    const m = await page.evaluate(() => problemState.mistakes[0].problem);
    ok(/^\d+ - \d+ = \d$/.test(m), `ひきざんの間違い表示: ${m}`);
    ok(errors().length === 0, 'エラーなし ' + errors().join(' / '));
    await page.close();
  }

  // 6. かけざん：3回でミスモーダル、ノーミスでクリア、rescue
  {
    const { page, errors } = await openPage(browser, 'index.html#/multi');
    await page.click('button#level1'); await page.waitForTimeout(900);
    for (let i = 0; i < 9; i++) await answerCorrect(page);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'かけざん 1のだん クリア');
    await page.click('#completionModal button >> nth=0'); await page.waitForTimeout(900);
    for (let i = 0; i < 3; i++) { const a = await answer(page); await press(page, (a + 1) % 10); await page.waitForTimeout(80); }
    ok(await page.$eval('#mistakeModal', e => e.style.display) === 'flex', 'かけざんは3回でミスモーダル');
    const m = await page.$eval('#mistakeList li', e => e.textContent);
    ok(m.includes('×'), `かけざんの間違い表示: ${m}`);
    await page.click('#mistakeModal button >> nth=1'); await page.waitForTimeout(500);
    // rescue
    await page.evaluate(() => { document.getElementById('rescueModal').style.display = 'block'; });
    await page.check('#rescueDan3');
    await page.click('#rescueModal button:has-text("このレベルを復元")'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('multi_coins_7')).length) === 5, 'rescue: 3のだん にドロップ5個');
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('multi_coins_9')).length) === 1, 'rescue: 3:バラバラ にドロップ1個');
    ok(await page.isVisible('#lock9'), 'rescue: 3:バラバラ が解放');
    ok(errors().length === 0, 'エラーなし ' + errors().join(' / '));
    await page.close();
  }

  // 7. 百マス：Lv1 を解く → ベストタイム表示が今回を反映。2けた途中のリセット
  {
    const { page, errors } = await openPage(browser, 'index.html#/hundredgrid', { hundredgrid_level_1_best_time: '999' });
    await page.click('button#level1'); await page.waitForTimeout(900);
    const n = await page.evaluate(() => currentTotalRows * currentTotalCols);
    for (let i = 0; i < n; i++) {
      const a = await answer(page);
      if (a >= 10) { await press(page, 1); await page.waitForTimeout(30); await press(page, a % 10); } else await press(page, a);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(300);
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', '百マス Lv1 クリア');
    const best = await page.$eval('#bestTime', e => e.textContent);
    ok(best.includes('00:0'), `ベストタイムが今回の記録: ${best}`);
    // もういちど：十の位だけ入力して、もういちど
    // （飛んできたドロップがボタンに重なることがあるので、クリックの代わりに直接呼ぶ）
    await page.evaluate(() => retryLevel()); await page.waitForTimeout(900);
    await page.evaluate(() => { partialInput = '1'; });
    await page.evaluate(() => retryLevel()); await page.waitForTimeout(300);
    ok(await page.evaluate(() => partialInput) === '', 'もういちどで2けた入力途中がリセット');
    ok(errors().length === 0, 'エラーなし ' + errors().join(' / '));
    await page.close();
  }

  // 8. 百マス Lv5：イラスト読み込み／読み込み失敗でも表が出る
  {
    const seed = { hundredgrid_coins_4: JSON.stringify(Array(3).fill({ image: '/img/Amaru.png' })) };
    const { page, errors } = await openPage(browser, 'index.html#/hundredgrid', seed);
    await page.click('button#level5'); await page.waitForTimeout(900);
    ok(await page.evaluate(() => Array.isArray(window.patternArray) && document.querySelectorAll('#calculation-grid td').length === 121), '百マス Lv5 イラストあり');
    await page.close();
    const p2 = await browser.newPage();
    await p2.route(/illustration_patterns/, r => r.abort());
    await p2.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
    await p2.addInitScript(s => { for (const k in s) localStorage.setItem(k, s[k]); }, seed);
    await p2.goto(BASE + 'index.html#/hundredgrid'); await p2.waitForTimeout(500);
    await p2.click('button#level5'); await p2.waitForTimeout(900);
    ok(await p2.evaluate(() => document.querySelectorAll('#calculation-grid td').length === 121), '百マス Lv5 イラスト読込失敗でも表が出る');
    await p2.close();
  }

  // 9. index の隠しボタン：1回目のタップで切り替わる
  {
    const { page } = await openPage(browser, 'index.html');
    ok(await page.$eval('#version', e => e.textContent) === 'Ver.6.3.19', 'バージョン表記');
    await page.click('#version');
    ok(await page.isVisible('#homeHundredgrid'), 'Ver をタップしても百マスは消えない');
    await page.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
