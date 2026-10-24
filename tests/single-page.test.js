// 第4段階：1ページ化のテスト
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };
const visible = (page, id) => page.$eval('#' + id, e => getComputedStyle(e).display !== 'none');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.route(/gstatic|googleapis|jsdelivr/, r => r.abort());

  await page.goto(BASE); await page.waitForTimeout(400);
  ok(await visible(page, 'homeScreen') && !(await visible(page, 'openingScreen')), 'さいしょの画面');
  ok(await page.title() === 'タマの【けいさん】ドロップス', 'さいしょのタイトル');

  await page.click('#homeAdd'); await page.waitForTimeout(300);
  ok(page.url().endsWith('#/add') && await visible(page, 'openingScreen') && !(await visible(page, 'homeScreen')), 'たしざんへ');
  ok(await page.title() === 'タマの【たしざん】ドロップス', 'たしざんのタイトル');
  ok(await page.$$eval('.select-level-buttons .level-pair', l => l.length) === 11, 'たしざんのレベルボタン 11個');
  ok(await visible(page, 'goToSub') && !(await visible(page, 'goToAdd')), 'たしざん：「ひきざんへ！」だけ出る');
  ok(await page.$eval('#goToIndex', e => getComputedStyle(e).bottom) === '83px', 'たしざん：「さいしょへ！」は上');

  // 問題の途中でブラウザの「もどる」
  await page.click('button#level1'); await page.waitForTimeout(900);
  ok(await page.$eval('#drillScreen .page-title', e => e.textContent) === 'Lv1もんだい★', '問題のタイトル');
  const a = await page.evaluate(() => problemState.answer);
  await page.keyboard.press(String(a)); await page.waitForTimeout(100);
  await page.goBack(); await page.waitForTimeout(1200);
  ok(await visible(page, 'homeScreen') && !(await visible(page, 'keypadScreen')) && !(await visible(page, 'drillScreen')), 'もどるで、さいしょの画面に戻る');
  ok((await page.$$('.coin, .reward-coin')).length === 0, 'ドロップが片づく');
  ok(await page.evaluate(() => currentMode === null), 'モードなし');

  // かけざん
  await page.click('#homeMulti'); await page.waitForTimeout(300);
  ok(await page.$$eval('.select-level-buttons .level-pair', l => l.length) === 28, 'かけざんのレベルボタン 28個');
  ok(await page.$$eval('#rescueModal input[type=checkbox]', l => l.length) === 9, 'かけざんの rescue は段のチェック');
  ok(!(await visible(page, 'goToSub')) && !(await visible(page, 'goToAdd')), 'かけざん：となりのモードへのボタンなし');
  ok(await page.$eval('#level4', e => getComputedStyle(e).backgroundColor) === 'rgb(230, 255, 250)', 'かけざん：段ごとの色');
  await page.setViewportSize({ width: 1024, height: 300 }); await page.waitForTimeout(200);
  const scrollable = await page.evaluate(() => { window.scrollTo(0, 300); return window.scrollY > 0 || document.body.scrollTop > 0 || document.documentElement.scrollTop > 0; });
  ok(scrollable, 'かけざん：縦にスクロールできる');
  await page.setViewportSize({ width: 1280, height: 800 });

  // ひきざん
  await page.evaluate(() => { location.hash = '#/sub'; }); await page.waitForTimeout(300);
  ok(await visible(page, 'goToAdd') && !(await visible(page, 'goToSub')), 'ひきざん：「たしざんへ！」だけ出る');
  ok(await page.$eval('#level1', e => getComputedStyle(e).backgroundColor) === 'rgb(135, 206, 235)', 'ひきざん：青いボタン');
  ok(await page.$eval('html', e => getComputedStyle(e).overflowY) === 'hidden', 'ひきざん：スクロールなし');
  await page.click('#goToAdd'); await page.waitForTimeout(300);
  ok(page.url().endsWith('#/add'), '「たしざんへ！」');

  // 百マスの途中で別モードへ → そのモードで遊べる
  await page.evaluate(() => { location.hash = '#/hundredgrid'; }); await page.waitForTimeout(300);
  ok(await page.$$eval('.select-level-buttons .level-pair', l => l.length) === 6, '百マスのレベルボタン 6個');
  await page.click('button#level1'); await page.waitForTimeout(900);
  ok(await visible(page, 'hundredgridScreen') && !(await visible(page, 'drillScreen')), '百マスの問題画面');
  ok(await page.$eval('#hundredgridScreen .page-title', e => e.textContent) === 'Lv1もんだい', '百マスのタイトル');
  for (let i = 0; i < 3; i++) { const x = await page.evaluate(() => problemState.answer); if (x >= 10) { await page.keyboard.press('1'); await page.keyboard.press(String(x % 10)); } else await page.keyboard.press(String(x)); await page.waitForTimeout(60); }
  await page.click('#goToIndex', { force: true }).catch(() => {});
  await page.evaluate(() => { location.hash = '#/add'; }); await page.waitForTimeout(400);
  ok(!(await visible(page, 'hundredgridScreen')) && await visible(page, 'openingScreen'), '百マスの途中から たしざんへ');
  await page.click('button#level1'); await page.waitForTimeout(900);
  for (let i = 0; i < 6; i++) { const x = await page.evaluate(() => problemState.answer); await page.keyboard.press(String(x)); await page.waitForTimeout(850); }
  ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'そのあと たしざん Lv1 をクリアできる');
  ok(await visible(page, 'completionModal') && await page.$eval('.drill-only', e => getComputedStyle(e).display) !== 'none', 'たしざんは「おめでとう！」あり');

  // 知らない URL → さいしょ
  await page.evaluate(() => { location.hash = '#/xyz'; }); await page.waitForTimeout(300);
  ok(await visible(page, 'homeScreen') && !(await visible(page, 'completionModal')), '知らないURLは さいしょの画面（モーダルも閉じる）');

  // 以前のURL
  for (const [old, mode] of [['tamaadddrops.html', 'add'], ['tamasubdrops.html', 'sub'], ['tamamultidrops.html', 'multi'], ['tamahundredgrid.html', 'hundredgrid']]) {
    await page.goto(BASE + old); await page.waitForTimeout(500);
    ok(page.url() === BASE + '#/' + mode && await page.evaluate(() => document.documentElement.dataset.mode) === mode, `${old} → #/${mode}`);
  }
  ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
