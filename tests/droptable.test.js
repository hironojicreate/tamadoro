// びんをたおして、ドロップをテーブルにちらばらせる（js/drop-table.js）のテスト
//   ・ふたをタッチすると たおれる（びんの胴をタッチしたときは、これまでどおり）
//   ・合体の とちゅうでも たおせる。そのときの中身（合体した玉 ＋ のこりの粒）が出てくる
//   ・粒は びんの中より大きく、テーブルを おおいつくさない数まで。画面の中・びんの外で、自分で止まる
//   ・指でつまんで動かせる・はじくと すべる・何本の指でも
//   ・「おかたづけ」や ほかの画面へ行くと、びんにもどる
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

async function openRecords(browser, n, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
  await page.addInitScript(n => {
    let s = 7;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let now = 0;
    performance.now = () => now;
    const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.__pump = k => { for (let i = 0; i < k; i++) { now += 1000 / 60; const cbs = q.splice(0); cbs.forEach(cb => cb(now)); } };
    const colors = 'LMBARKPYCO';
    localStorage.setItem('tamadoro.log.v1', JSON.stringify(Array.from({ length: n }, (_, i) => ({ t: 1700000000000 + i * 60000, mode: 'add', level: 1, drop: `/img/${colors[i % 10]}maru.png` }))));
    localStorage.setItem('tamadoro.schema', '1');
  }, n);
  await page.goto(BASE + '#/records');
  await page.waitForTimeout(400);
  await pump(page, 400);
  return { page, errors };
}

const pump = (page, k) => page.evaluate(k => window.__pump(k), k);

// テーブルが止まるまで すすめる
async function settle(page) {
  for (let i = 0; i < 30; i++) {
    await pump(page, 60);
    if (!(await page.evaluate(() => DropTable.running))) return true;
  }
  return false;
}

// びんの ふた・胴 の画面の場所
async function jarPoint(page, part) {
  return page.evaluate(part => {
    const r = DropJar.canvas.getBoundingClientRect();
    const k = r.height / DropJar.canvas.height;
    return { x: r.left + r.width / 2, y: r.top + (part === 'lid' ? 25 : 250) * k };
  }, part);
}

// テーブルのようす
function tableState(page) {
  return page.evaluate(() => {
    const T = DropTable;
    const balls = T.balls;
    let outside = 0, inJar = 0, maxOverlap = 0;
    const p = T.pose, c = Math.cos(p.angle), s = Math.sin(p.angle);
    balls.forEach((b, i) => {
      if (b.x < b.r - 0.5 || b.x > T.W - b.r + 0.5 || b.y < b.r - 0.5 || b.y > T.H - b.r + 0.5) outside++;
      const dx = b.x - p.x, dy = b.y - p.y;
      const lx = (dx * c + dy * s) / p.scale + T.cw / 2, ly = (-dx * s + dy * c) / p.scale + T.ch / 2;
      const m = (b.r / p.scale) - 2;
      if (lx > T.box.l - m && lx < T.box.r + m && ly > T.box.t - m && ly < T.box.b + m) inJar++;
      for (let j = i + 1; j < balls.length; j++) {
        const o = balls[j];
        const d = Math.hypot(b.x - o.x, b.y - o.y);
        maxOverlap = Math.max(maxOverlap, (b.r + o.r - d) / Math.min(b.r, o.r));
      }
    });
    return {
      open: T.isOpen, phase: T.phase, running: T.running,
      t1: balls.filter(b => b.tier === 1).length, t100: balls.filter(b => b.tier === 100).length,
      area: balls.reduce((sum, b) => sum + Math.PI * b.r * b.r, 0), screen: T.W * T.H,
      r: balls.length ? Math.min(...balls.filter(b => b.tier === 1).map(b => b.r)) : 0, jarR: DropJar.baseR,
      outside, inJar, maxOverlap,
      overlayShown: !document.getElementById('dropTable').hidden,
      jarHidden: DropJar.canvas.style.visibility === 'hidden',
    };
  });
}

async function scenario(browser, { name, n, viewport, merges, expectAll }) {
  const { page, errors } = await openRecords(browser, n, viewport);

  // 胴をタッチ → これまでどおり（合体）。テーブルは出ない
  for (let i = 0; i < merges; i++) {
    const body = await jarPoint(page, 'body');
    await page.mouse.click(body.x, body.y);
    await pump(page, 150);
  }
  ok(!(await page.evaluate(() => DropTable.isOpen)), `${name}：びんの胴をタッチしても たおれない`);
  ok(await page.evaluate(() => DropJar.balls.filter(b => b.tier === 100).length) === merges, `${name}：胴をタッチすると合体する（100玉${merges}こ）`);

  // ふたをタッチ → たおれて ちらばる
  const lid = await jarPoint(page, 'lid');
  await page.mouse.click(lid.x, lid.y);
  let st = await tableState(page);
  ok(st.open && st.overlayShown && st.jarHidden, `${name}：ふたをタッチすると たおれる`);
  ok(await settle(page), `${name}：ちらばったあと、自分で止まる`);
  st = await tableState(page);
  ok(st.phase === 'play', `${name}：ぜんぶ出てくる（${st.phase}）`);
  ok(st.t100 === merges, `${name}：合体した玉は そのまま出てくる（100玉${st.t100}こ）`);
  const singles = n - merges * 100;
  ok(st.t1 > 0 && st.t1 <= singles && (!expectAll || st.t1 === singles), `${name}：のこりの粒が出てくる（${st.t1}こ／${singles}こ）`);
  ok(st.area <= st.screen * 0.3 + 1, `${name}：テーブルを おおいつくさない（${Math.round((st.area / st.screen) * 100)}%）`);
  ok(st.r > st.jarR, `${name}：びんの中より大きい（${st.r.toFixed(1)}px ＞ ${st.jarR.toFixed(1)}px）`);
  ok(st.outside === 0 && st.inJar === 0, `${name}：画面の中・びんの外にいる（外${st.outside}・びんの中${st.inJar}）`);
  ok(st.maxOverlap < 0.5, `${name}：大きな重なりがない（${st.maxOverlap.toFixed(2)}）`);

  // 指でつまんで動かす（止めてから はなすと、そこに おかれる）
  const pick = await page.evaluate(() => { const b = DropTable.balls[0]; return { x: b.x, y: b.y }; });
  const target = await page.evaluate(() => ({ x: DropTable.W * 0.6, y: DropTable.H * 0.3 }));
  await page.mouse.move(pick.x, pick.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await pump(page, 2);
  const held = await page.evaluate(() => { const b = DropTable.balls[DropTable.balls.length - 1]; return { x: b.x, y: b.y, held: b.held }; });
  ok(held.held && Math.hypot(held.x - target.x, held.y - target.y) < 2, `${name}：指でつまんで動かせる`);
  await page.waitForTimeout(150);
  await page.mouse.up();
  await settle(page);
  const placed = await page.evaluate(() => { const b = DropTable.balls[DropTable.balls.length - 1]; return { x: b.x, y: b.y }; });
  ok(Math.hypot(placed.x - target.x, placed.y - target.y) < 30, `${name}：止めてから はなすと、そこに おかれる（${Math.round(Math.hypot(placed.x - target.x, placed.y - target.y))}px）`);

  // はじくと すべる（こみあっているところでは、まわりの粒を おしのけて、そちらが動く）
  const flickFrom = await page.evaluate(() => { const b = DropTable.balls[DropTable.balls.length - 1]; return { x: b.x, y: b.y }; });
  const before = await page.evaluate(() => DropTable.balls.map(b => [b.x, b.y]));
  await page.mouse.move(flickFrom.x, flickFrom.y);
  await page.mouse.down();
  await page.mouse.move(flickFrom.x - 30, flickFrom.y + 20, { steps: 3 });
  await page.mouse.up();
  const speed = await page.evaluate(() => { const b = DropTable.balls[DropTable.balls.length - 1]; return Math.hypot(b.vx, b.vy); });
  await settle(page);
  const moved = await page.evaluate(before => DropTable.balls.reduce((sum, b, i) => sum + Math.hypot(b.x - before[i][0], b.y - before[i][1]), 0), before);
  ok(speed > 5 && moved > 100, `${name}：はじくと すべる（はなした速さ ${speed.toFixed(1)}・動いた きょり ${Math.round(moved)}px）`);

  // 2本の指で、2つぶ いっしょに動かす
  const multi = await page.evaluate(() => {
    const T = DropTable, c = T.canvas;
    const a = T.balls[1], b = T.balls[2];
    const send = (type, id, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 21, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    send('pointerdown', 21, a.x, a.y);
    send('pointerdown', 22, b.x, b.y);
    const ta = { x: T.W * 0.3, y: T.H * 0.5 }, tb = { x: T.W * 0.7, y: T.H * 0.6 };
    send('pointermove', 21, ta.x, ta.y);
    send('pointermove', 22, tb.x, tb.y);
    const r = { holds: T.holds.size, da: Math.hypot(a.x - ta.x, a.y - ta.y), db: Math.hypot(b.x - tb.x, b.y - tb.y) };
    send('pointerup', 21, ta.x, ta.y);
    send('pointerup', 22, tb.x, tb.y);
    r.after = T.holds.size;
    return r;
  });
  ok(multi.holds === 2 && multi.da < 2 && multi.db < 2 && multi.after === 0, `${name}：2本の指で いっしょに動かせる`);

  // おかたづけ → びんに もどる
  await page.click('.drop-table-done');
  for (let i = 0; i < 20 && (await page.evaluate(() => DropTable.isOpen)); i++) await pump(page, 30);
  st = await tableState(page);
  ok(!st.open && !st.overlayShown && !st.jarHidden, `${name}：おかたづけで びんにもどる`);
  ok(await page.evaluate(() => DropJar.balls.length > 0 && document.documentElement.style.overflow === ''), `${name}：びんに中身がもどり、ページが また スクロールできる`);

  // もういちど たおして、ほかの画面へ行く → とじる。もどってくると びんに入っている
  await page.mouse.click(lid.x, lid.y);
  await pump(page, 80);
  ok(await page.evaluate(() => DropTable.isOpen), `${name}：もういちど たおせる`);
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(200);
  st = await tableState(page);
  ok(!st.open && !st.overlayShown && !st.jarHidden, `${name}：ほかの画面へ行くと とじる`);
  await page.evaluate(() => { location.hash = '#/records'; });
  await page.waitForTimeout(300);
  await pump(page, 60);
  ok(await page.evaluate(() => !DropTable.isOpen && DropJar.balls.length > 0), `${name}：もどってくると びんに入っている`);

  ok(errors.length === 0, `${name}：エラーなし ${errors.join(' / ')}`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  await scenario(browser, { name: 'パソコン 600こ（100玉2こ合体してから）', n: 600, viewport: { width: 1280, height: 720 }, merges: 2, expectAll: true });
  await scenario(browser, { name: 'スマホ 600こ', n: 600, viewport: { width: 390, height: 844 }, merges: 0 });
  await scenario(browser, { name: 'スマホ 3589こ（おおいつくさない数まで）', n: 3589, viewport: { width: 390, height: 844 }, merges: 0 });
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
