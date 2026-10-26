// 第6段階：プレイの記録・まちがえた問題のもういちど・きろく画面
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
  await page.addInitScript(() => {
    if (sessionStorage.seeded) return; sessionStorage.seeded = 1;
    localStorage.setItem('add_coins_1', JSON.stringify([{ image: '/img/Lmaru.png', date: '1/2' }, { image: '/img/Gmaru.png' }]));
  });
  const answer = () => page.evaluate(() => problemState.answer);
  const type = async n => { if (n >= 10) { await page.keyboard.press(String(Math.floor(n / 10))); await page.keyboard.press(String(n % 10)); } else await page.keyboard.press(String(n)); };

  // 取りこみ（1回だけ）
  await page.goto(BASE); await page.waitForTimeout(400);
  let log = await page.evaluate(() => History.getLog());
  ok(log.length === 2 && log.every(e => e.imported && e.mode === 'add' && e.level === 1), `以前のドロップを取りこむ（${log.length}こ）`);
  ok(log.some(e => e.t && new Date(e.t).getMonth() === 0 && new Date(e.t).getDate() === 2) && log.some(e => e.t === null), '日付つき → 1/2、日付なし → null');
  await page.reload(); await page.waitForTimeout(400);
  ok((await page.evaluate(() => History.getLog())).length === 2, '2回目は取りこまない');

  // たしざん Lv1：1問まちがえる → 最後にもういちど
  await page.evaluate(() => { location.hash = '#/add'; }); await page.waitForTimeout(300);
  await page.click('button#level1'); await page.waitForTimeout(900);
  const first = await page.evaluate(() => ({ ...problemState.currentProblem }));
  const a1 = await answer();
  await page.keyboard.press(String((a1 + 1) % 10)); await page.waitForTimeout(100);
  await page.keyboard.press(String(a1)); await page.waitForTimeout(850);
  for (let i = 0; i < 5; i++) { await type(await answer()); await page.waitForTimeout(850); }
  const review = await page.evaluate(() => ({ p: problemState.currentProblem, isReview: problemState.isReview, text: document.getElementById('remaining-problems').textContent }));
  ok(review.isReview && review.p.a === first.a && review.p.b === first.b, `まちがえた問題がもういちど出る（${first.a} は ${first.b} と）`);
  ok(review.text === 'のこり1もん（もういちど！）', `のこりの表示: ${review.text}`);
  ok(await page.$eval('#completionModal', e => e.style.display) !== 'flex', 'まだクリアにならない');
  await type(await answer()); await page.waitForTimeout(900);
  ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'もういちどの問題に正解してクリア');
  log = await page.evaluate(() => History.getLog());
  const last = log[log.length - 1];
  ok(last.mode === 'add' && last.level === 1 && last.cleared && last.miss === 1 && last.total === 6 && last.ms > 0 && last.drop === '/img/Lmaru.png', `記録: ${JSON.stringify(last)}`);
  const stats = await page.evaluate(() => History.getStats('add'));
  ok(stats[`${first.a}は${first.b}と`].n === 2 && stats[`${first.a}は${first.b}と`].miss === 1, '1問ごとの記録（まちがえた問題は2かい・まちがい1）');
  ok(Object.keys(stats).length === 6, `1問ごとの記録は6もん（${Object.keys(stats).length}）`);

  // ノーミス → 金のドロップを記録
  await page.evaluate(() => retryLevel()); await page.waitForTimeout(900);
  for (let i = 0; i < 6; i++) { await type(await answer()); await page.waitForTimeout(850); }
  log = await page.evaluate(() => History.getLog());
  ok(log[log.length - 1].drop === '/img/Gmaru.png' && log[log.length - 1].miss === 0, 'ノーミスは金のドロップ');

  // ミスモーダル → クリアできなかった記録
  await page.evaluate(() => retryLevel()); await page.waitForTimeout(900);
  for (let i = 0; i < 5; i++) { const x = await answer(); await page.keyboard.press(String((x + 1) % 10)); await page.waitForTimeout(80); }
  log = await page.evaluate(() => History.getLog());
  ok(await page.$eval('#mistakeModal', e => e.style.display) === 'flex' && log[log.length - 1].cleared === false && log[log.length - 1].drop === null, 'クリアできなかった記録');
  await page.evaluate(() => returnToLevelSelection()); await page.waitForTimeout(400);

  // きろく画面（たしざんから）
  await page.click('#goToRecords'); await page.waitForTimeout(1200);
  ok(page.url().endsWith('#/records/add') && await page.$eval('#recordsScreen', e => e.style.display) === 'block', 'きろく画面へ');
  ok(await page.$eval('#dropTotal', e => e.textContent) === 'ぜんぶで 4 こ', `ドロップびん: ${await page.$eval('#dropTotal', e => e.textContent)}`);
  ok(await page.$eval('.calendar-day.today', e => e.querySelectorAll('.calendar-drops img').length) === 2, 'カレンダー：きょうのドロップ2こ');
  ok(!(await page.isVisible('.calendar-day.today .calendar-count')), 'カレンダー：広い画面では ドロップを並べる');
  const vp = page.viewportSize();
  await page.setViewportSize({ width: 768, height: 1024 }); await page.waitForTimeout(300);
  ok(await page.isVisible('.calendar-day.today .calendar-count') && !(await page.isVisible('.calendar-day.today .calendar-drops'))
    && (await page.$eval('.calendar-day.today .calendar-count', e => e.textContent)) === '×2', 'カレンダー：せまい画面では「×2」');
  await page.setViewportSize(vp); await page.waitForTimeout(300);
  ok(await page.$eval('#levelRecords tr:first-child', e => e.textContent.includes('4かい')), 'Lv1 のクリア4かい（取りこみ2＋クリア2）');
  ok((await page.$$('#levelRecords tr:first-child .spark-dot')).length === 2, 'タイムのグラフに2てん');
  ok((await page.$$('.weak-grid')).length === 1 && (await page.$$('#weakList li')).length === 1, 'にがてマップと、にがてな問題');
  await page.hover('#levelRecords tr:first-child .spark-hit >> nth=0');
  ok(!(await page.$eval('#chartTooltip', e => e.hidden)), 'グラフのてんに さわるとふきだし');
  await page.click('#recordsTabs button:nth-child(4)'); await page.waitForTimeout(500);
  ok(page.url().endsWith('#/records/hundredgrid') && await page.$eval('#weakSection', e => e.style.display) === 'none', '百マスのタブ（にがてマップなし）');
  await page.click('#calPrev'); await page.waitForTimeout(200);
  ok(!(await page.$eval('#calTitle', e => e.textContent)).includes(`${new Date().getMonth() + 1}がつ`) || new Date().getMonth() === 0, 'カレンダーの まえの月');
  await page.click('.records-back'); await page.waitForTimeout(400);
  ok(page.url().endsWith('#/add'), `もどる → たしざん（${page.url()}）`);

  // 百マスの記録
  await page.evaluate(() => { location.hash = '#/hundredgrid'; }); await page.waitForTimeout(300);
  await page.click('button#level1'); await page.waitForTimeout(900);
  const cells = await page.evaluate(() => currentTotalRows * currentTotalCols);
  for (let i = 0; i < cells; i++) { await type(await answer()); await page.waitForTimeout(50); }
  await page.waitForTimeout(300);
  log = await page.evaluate(() => History.getLog());
  ok(log[log.length - 1].mode === 'hundredgrid' && log[log.length - 1].cleared && log[log.length - 1].total === 9, '百マスの記録');

  // /delete でそのモードの記録が消える
  await page.evaluate(() => returnToLevelSelection()); await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/add'; }); await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('deleteModal').style.display = 'flex'; deleteData(); });
  await page.waitForTimeout(300);
  log = await page.evaluate(() => History.getLog());
  ok(log.every(e => e.mode !== 'add') && log.some(e => e.mode === 'hundredgrid') && Object.keys(await page.evaluate(() => History.getStats('add'))).length === 0, '/delete で たしざんの記録だけ消える');

  ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
