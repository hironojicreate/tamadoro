// ドロップびんの物理のテスト
//   乱数と時計を固定して、びんを開く・タップする を動かし、次を確かめる
//   ・落ちてきたドロップが跳ねる（BOUNCE_ENABLED のとき）
//   ・ずっと動きつづけない（最後の操作のあと、5秒の上限より前に止まる）
//   ・ありえない位置で止まらない（びんの外・宙に浮いたまま・大きな重なり）
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8765/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

const SCENARIOS = [
  { name: '8こ：ひらく', n: 8, shakes: [] },
  { name: '50こ：ふたが3回ひらく', n: 50, shakes: [200, 420, 640] },
  { name: '90こ：れんだ', n: 90, shakes: [200, 210, 220, 230, 240, 250, 260, 270, 280, 290] },
  { name: '420こ：合体してから ふたがひらく', n: 420, shakes: [200, 330, 460, 590, 720, 900] },
];

async function run(browser, sc, seed, bounce) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/gstatic|googleapis|googletagmanager|jsdelivr/, r => r.abort());
  await page.addInitScript(({ n, seed }) => {
    let s = seed >>> 0;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let now = 0;
    performance.now = () => now;
    const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.__pump = () => { now += 1000 / 60; const cbs = q.splice(0); cbs.forEach(cb => cb(now)); };
    const colors = 'LMBARKPYCO';
    localStorage.setItem('tamadoro.log.v1', JSON.stringify(Array.from({ length: n }, (_, i) => ({ t: 1700000000000 + i * 60000, mode: 'add', level: 1, drop: `/img/${colors[i % 10]}maru.png` }))));
    localStorage.setItem('tamadoro.schema', '1');
  }, { n: sc.n, seed });
  await page.goto(BASE + '#/');
  await page.waitForTimeout(300);
  const r = await page.evaluate(({ shakes, bounce }) => {
    const J = DropJar;
    J.BOUNCE_ENABLED = bounce;
    location.hash = '#/records';
    return new Promise(resolve => setTimeout(() => {
      const { left, right, top, bottom } = J.inner;
      let bounces = 0;
      const orig = J.applyBounce.bind(J);
      J.applyBounce = (b, g) => { const v = orig(b, g); if (v) bounces++; return v; };
      let frame = 0, lastShake = 0;
      for (; frame < 3000; frame++) {
        if (shakes.includes(frame)) { J.shake(); lastShake = frame; }
        window.__pump();
        if (!J.running && !shakes.some(f => f > frame)) break;
      }
      const balls = J.balls.filter(b => !b.merging);
      let maxOverlap = 0, outside = 0, floating = 0;
      balls.forEach((a, i) => {
        if (a.x - a.r < left - 0.5 || a.x + a.r > right + 0.5 || a.y + a.r > bottom + 0.5 || a.y - a.r < top - 60) outside++;
        let supported = a.y + a.r >= bottom - 1;
        balls.forEach((b, j) => {
          if (i === j) return;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (j > i) maxOverlap = Math.max(maxOverlap, (a.r + b.r - d) / Math.min(a.r, b.r));
          if (d < a.r + b.r + 1 && b.y > a.y + 0.5) supported = true;
        });
        if (!supported) floating++;
      });
      resolve({ settleFrames: frame - lastShake, running: J.running, bounces, maxOverlap, outside, floating });
    }, 50));
  }, { shakes: sc.shakes, bounce });
  await page.close();
  return { ...r, errors };
}

(async () => {
  const browser = await chromium.launch();
  for (const sc of SCENARIOS) {
    for (const seed of [1, 2, 3]) {
      const r = await run(browser, sc, seed, true);
      const label = `${sc.name}（乱数${seed}）`;
      // 5秒（300コマ）の上限で止められたのではなく、自分で止まった
      ok(!r.running && r.settleFrames < 240, `${label}：止まる（${r.settleFrames}コマ）`);
      ok(r.outside === 0 && r.floating === 0, `${label}：びんの外・宙に浮いた玉がない（外${r.outside}・浮く${r.floating}）`);
      ok(r.maxOverlap < 0.5, `${label}：大きな重なりがない（${r.maxOverlap.toFixed(2)}）`);
      if (sc.n > 0) ok(r.bounces > 0, `${label}：跳ねる（${r.bounces}かい）`);
      ok(r.errors.length === 0, `${label}：エラーなし ${r.errors.join(' / ')}`);
    }
  }
  // BOUNCE_ENABLED = false のときは、跳ねない（以前の動き）
  const off = await run(browser, SCENARIOS[1], 1, false);
  ok(off.bounces === 0 && !off.running, `跳ね返りを切ると跳ねない（${off.bounces}かい）`);

  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
