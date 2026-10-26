// ver.6 の修正のテスト
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
  await page.addInitScript(() => {
    if (sessionStorage.seeded) return; sessionStorage.seeded = 1;
    for (let l = 1; l <= 10; l++) localStorage.setItem(`sub_coins_${l}`, JSON.stringify(Array(5).fill({ image: '/img/Lmaru.png' })));
    localStorage.setItem('tamadoro.schema', '1'); // （レベルを解放するためのドロップは、記録には取りこまない）
  });
  const answer = () => page.evaluate(() => problemState.answer);
  const type = async n => { if (n >= 10) { await page.keyboard.press(String(Math.floor(n / 10))); await page.keyboard.press(String(n % 10)); } else await page.keyboard.press(String(n)); };

  await page.goto(BASE); await page.waitForTimeout(300);
  ok(await page.$eval('#homeScreen footer', e => e.textContent.replace(/\s+/g, ' ').trim()) === '© 2024-2026 Rela All rights reserved. Ver.6.3.5', 'フッターの表記');

  // たしざん Lv1 をクリア → ご褒美のあとはキーを受けつけない → もういちどで受けつける
  await page.evaluate(() => { location.hash = '#/add'; }); await page.waitForTimeout(300);
  await page.click('button#level1'); await page.waitForTimeout(900);
  // 答えの数字は「？」の下でかくれている
  ok(await page.$eval('#c2 .digit', e => getComputedStyle(e).visibility) === 'hidden', '答えの数字は、正解するまでかくれている');
  for (let i = 0; i < 6; i++) { await type(await answer()); await page.waitForTimeout(850); }
  ok(await page.$eval('#completionModal', e => e.style.display) === 'flex', 'クリア');
  await page.waitForTimeout(1200);
  const reward = await page.$eval('.reward-coin:last-of-type', e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  ok(reward.w === 50 && reward.h === 50, `右上のご褒美ドロップは ふつうの大きさ（${reward.w}×${reward.h}）`);
  const coinsBefore = (await page.$$('.coin')).length;
  const logBefore = await page.evaluate(() => History.getLog().length);
  for (let d = 0; d <= 9; d++) { await page.keyboard.press(String(d)); await page.waitForTimeout(30); }
  await page.waitForTimeout(900);
  ok((await page.$$('.coin')).length === coinsBefore && await page.evaluate(() => History.getLog().length) === logBefore && !(await page.evaluate(() => problemState.keypadEnabled)), 'ご褒美のあとは、キーをおしても何もおきない');
  await page.evaluate(() => retryLevel()); await page.waitForTimeout(900);
  ok(await page.evaluate(() => problemState.keypadEnabled), 'もういちどちょうせんで、キーを受けつける');
  const a = await answer(); await type(a); await page.waitForTimeout(300);
  ok(await page.$eval('#c2 .digit', e => getComputedStyle(e).visibility) === 'visible', '正解すると答えの数字が見える');
  await page.evaluate(() => returnToLevelSelection()); await page.waitForTimeout(400);

  // 数字が枠の中におさまる（上下が切れない）
  await page.click('button#level1'); await page.waitForTimeout(900);
  const fit = await page.evaluate(() => {
    const box = document.getElementById('a2').getBoundingClientRect();
    const g = document.querySelector('#a2 .glyph path').getBoundingClientRect();
    const half = 10.5 / 130 * box.height / 2;
    return g.top - half >= box.top - 0.5 && g.bottom + half <= box.bottom + 0.5;
  });
  ok(fit, '数字の上下が枠からはみ出さない');
  await page.evaluate(() => returnToLevelSelection()); await page.waitForTimeout(300);

  // とても長くかかった問題は「無効」
  await page.evaluate(() => { location.hash = '#/sub'; }); await page.waitForTimeout(300);
  await page.click('button#level2'); await page.waitForTimeout(900);
  const slow = await page.evaluate(() => ({ ...problemState.currentProblem }));
  await page.evaluate(() => { problemState.problemStartedAt -= 60000; }); // 1分 手をとめた
  await type(await answer()); await page.waitForTimeout(850);
  ok(!(await page.evaluate(k => k in History.getStats('sub'), `${slow.a}-${slow.b}`)), '1分かかった問題は、にがての記録に入れない');
  let n = await page.evaluate(() => problemState.patterns.length);
  for (let i = 1; i < n; i++) { await type(await answer()); await page.waitForTimeout(850); }
  const last = await page.evaluate(() => History.getLog().slice(-1)[0]);
  ok(last.cleared && last.paused === true, 'その回は「とちゅうで手をとめた回」として記録');

  // きろく画面
  await page.evaluate(() => returnToLevelSelection()); await page.waitForTimeout(300);
  await page.click('#goToRecords'); await page.waitForTimeout(1500);
  const rows = await page.$$eval('#levelRecords tr', l => l.map(r => r.querySelector('th') && r.querySelector('th').textContent));
  ok(rows.length === 1 && rows[0] === 'Lv2もんだい', `ちょうせんしたレベルだけ出る（${rows}）`);
  ok((await page.$$('#levelRecords .spark-dot')).length === 0, 'とちゅうで手をとめた回は、タイムのグラフに入れない');
  ok(await page.$$eval('.weak-grid tr', l => l.length) === 19, 'ひきざんのにがてマップ（1～18 ＋ 見出し）');
  ok(await page.$$eval('.weak-grid td:not(.empty):not(.none)', l => l.length) >= 1, 'ひきざんのにがてマップに記録が入る');
  await page.click('#recordsTabs button:nth-child(3)'); await page.waitForTimeout(400);
  ok(await page.$eval('#levelRecords', e => e.textContent.includes('まだ きろくが ないよ')), 'まだやっていないモードは「まだ きろくが ないよ」');

  // ドロップびんは止まる
  await page.waitForFunction(() => !DropJar.running, null, { timeout: 8000 });
  await page.click('#dropJar'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => DropJar.running), 'タップするとゆれる');
  await page.waitForFunction(() => !DropJar.running, null, { timeout: 5000 }).then(() => ok(true, 'タップのあと、数秒で止まる')).catch(() => ok(false, 'タップのあと、数秒で止まる'));

  // 百マス：クリアのあとはキーを受けつけない
  await page.evaluate(() => { location.hash = '#/hundredgrid'; }); await page.waitForTimeout(300);
  await page.click('button#level1'); await page.waitForTimeout(900);
  const cells = await page.evaluate(() => currentTotalRows * currentTotalCols);
  for (let i = 0; i < cells; i++) { await type(await answer()); await page.waitForTimeout(50); }
  await page.waitForTimeout(300);
  ok(!(await page.evaluate(() => problemState.keypadEnabled)), '百マス：クリアのあとはキーを受けつけない');
  await page.evaluate(() => retryLevel()); await page.waitForTimeout(300);
  ok(await page.evaluate(() => problemState.keypadEnabled), '百マス：もういちどで受けつける');

  ok(errors.length === 0, 'エラーなし ' + errors.join(' / '));
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
