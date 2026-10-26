// にがてちょうせん・特訓コースのテスト
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

async function openPage(browser, path, storage = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
  await page.addInitScript(s => { if (!sessionStorage.seeded) { for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.seeded = 1; } }, storage);
  await page.goto(BASE + path);
  await page.waitForTimeout(500);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch();

  // まだ あそんでいないときは、特訓コースを押せない（押してもクリアにならない・ドロップももらえない）
  for (const mode of ['add', 'sub', 'multi']) {
    const { page, errors } = await openPage(browser, 'index.html#/' + mode);
    await page.click('#toggleWeakMode'); await page.waitForTimeout(200);
    ok(await page.isVisible('#levelSpecial') && await page.$eval('#levelSpecial', e => e.disabled), `${mode}：にがてがないと特訓コースは押せない`);
    await page.click('#levelSpecial', { force: true }); await page.waitForTimeout(1200);
    ok(await page.isVisible('#openingScreen') && await page.$eval('#completionModal', e => e.style.display) !== 'flex', `${mode}：押しても問題がはじまらない`);
    ok(await page.evaluate(() => History.getLog().length) === 0, `${mode}：ドロップも記録もふえない`);
    ok(await page.$eval('#level1', e => e.disabled), `${mode}：まだあそんでいない Lv1 は押せない`);
    await page.click('#level1', { force: true }); await page.waitForTimeout(900);
    ok(await page.isVisible('#openingScreen') && await page.evaluate(() => History.getLog().length) === 0, `${mode}：押しても問題がはじまらない（Lv1）`);
    await page.click('#toggleWeakMode'); await page.waitForTimeout(200);
    ok(!(await page.$eval('#level1', e => e.disabled)), `${mode}：にがてちょうせんを終わると Lv1 を押せる`);
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
    await page.close();
  }

  // にがてがあると押せて、12問でる。クリアするとドロップがもらえ、タイムは記録しない
  {
    const seed = {
      sub_coins_1: JSON.stringify([{ image: '/img/Lmaru.png', date: '1/2' }]),
      'tamadoro.stats.v1': JSON.stringify({ sub: { '5-2': { n: 2, miss: 1, ms: 8000, hp: 10 } } }),
    };
    const { page, errors } = await openPage(browser, 'index.html#/sub', seed);
    await page.click('#toggleWeakMode'); await page.waitForTimeout(200);
    ok(!(await page.$eval('#levelSpecial', e => e.disabled)), 'にがてがあると特訓コースを押せる');
    ok(!(await page.$eval('#level1', e => e.disabled)), 'にがてがある Lv1 は押せる');
    await page.click('#levelSpecial'); await page.waitForTimeout(900);
    ok(await page.evaluate(() => problemState.patterns.length) === 12, '特訓コースは12問');
    for (let i = 0; i < 12; i++) {
      const a = await page.evaluate(() => problemState.answer);
      await page.keyboard.press(String(a)); await page.waitForTimeout(850);
    }
    ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', '特訓コースをクリア');
    const last = await page.evaluate(() => History.getLog().slice(-1)[0]);
    ok(last.drop && last.weakChallenge && last.ms === null, `ドロップはもらえて、タイムは記録しない ${JSON.stringify(last)}`);
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('sub_coins_1')).length) === 2, 'レベル選択画面のドロップもふえる');
    ok(await page.evaluate(() => localStorage.getItem('subtraction_level_1_best_time')) === null, 'ベストタイムは記録しない');
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
    await page.close();
  }

  // あそんだことはあるけれど、にがてがないレベルも押せない
  {
    const seed = {
      sub_coins_1: JSON.stringify([{ image: '/img/Lmaru.png', date: '1/2' }]),
      'tamadoro.stats.v1': JSON.stringify({ sub: { '5-2': { n: 3, miss: 0, ms: 6000, hp: 0 } } }),
    };
    const { page, errors } = await openPage(browser, 'index.html#/sub', seed);
    await page.click('#toggleWeakMode'); await page.waitForTimeout(200);
    ok(await page.$eval('#level1', e => e.disabled), 'にがてがない Lv1 は押せない');
    const before = await page.evaluate(() => History.getLog().length);
    await page.click('#level1', { force: true }); await page.waitForTimeout(900);
    ok(await page.isVisible('#openingScreen') && await page.evaluate(() => History.getLog().length) === before, '押しても問題がはじまらない');
    ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
    await page.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
