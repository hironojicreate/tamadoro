// びんをたおして、ドロップをテーブルにちらばらせる（js/drop-table.js）のテスト
//   ・ふたをタッチすると たおれる（びんの胴をタッチしたときは、これまでどおり）
//   ・びんは 左上のすみに、うしろに すきまをあけて たおれ、口が右下を むく。中に見えていた粒が いっしょに たおれて、口から出てくる
//   ・合体の とちゅうでも たおせる。そのときの中身（合体した玉 ＋ のこりの粒）が出てくる
//   ・粒は びんの中より大きく、テーブルを おおいつくさない数まで。画面の中で、ガラスに めりこまずに、自分で止まる
//   ・指でつまんで動かせる・はじくと すべる・何本の指でも
//   ・口からなら びんの中に入れられる（ガラスは すりぬけない）
//   ・「おかたづけ」：びんが おきあがって 定位置に もどってから、粒が 口の上の まんなかに あつまって 落ち、山になって つもり
//     （はじめは けわしい山、さいごは なだらかな山。つもったら 動かない）、ふたが しまる
//     そのあとの いつもの びんは、つもった ならびと まったく同じ。合体した玉も、合体の つづきも、たおす前のまま。ほかの画面へ行っても もどる
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
    let outside = 0, inGlass = 0, maxOverlap = 0;
    balls.forEach((b, i) => {
      if (b.x < b.r - 0.5 || b.x > T.W - b.r + 0.5 || b.y < b.r - 0.5 || b.y > T.H - b.r + 0.5) outside++;
      if (T.glassDepth(b) > 1.5) inGlass++;
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
      r: balls.length ? Math.min(...balls.filter(b => b.tier === 1 && !b.inside).map(b => b.r)) : 0, jarR: DropJar.baseR,
      inside: balls.filter(b => b.inside).length,
      outside, inGlass, maxOverlap,
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
  const visible = await page.evaluate(() => DropJar.balls.length);
  // たおす前の びんの中身（合体した玉と、合体の つづき）
  await page.evaluate(() => { window.__before = { balls: DropJar.balls.slice(), queue: DropJar.mergeQueue.length }; });
  const lid = await jarPoint(page, 'lid');
  await page.mouse.click(lid.x, lid.y);
  let st = await tableState(page);
  ok(st.open && st.overlayShown && st.jarHidden, `${name}：ふたをタッチすると たおれる`);
  await pump(page, 10);
  const tipping = await page.evaluate(() => ({ phase: DropTable.phase, n: DropTable.balls.length, rigid: DropTable.balls.every(b => b.rigid) }));
  ok(tipping.phase === 'tip' && tipping.n > 0 && tipping.n <= visible && tipping.rigid, `${name}：びんの中に見えていた粒が、びんと いっしょに たおれる（${tipping.n}こ）`);
  ok(await settle(page), `${name}：ちらばったあと、自分で止まる`);
  st = await tableState(page);
  ok(st.phase === 'play', `${name}：ぜんぶ出てくる（${st.phase}）`);
  ok(st.t100 === merges, `${name}：合体した玉は そのまま出てくる（100玉${st.t100}こ）`);
  const singles = n - merges * 100;
  ok(st.t1 > 0 && st.t1 <= singles && (!expectAll || st.t1 === singles), `${name}：のこりの粒が出てくる（${st.t1}こ／${singles}こ）`);
  ok(st.area <= st.screen * 0.3 + 1, `${name}：テーブルを おおいつくさない（${Math.round((st.area / st.screen) * 100)}%）`);
  ok(st.r > st.jarR, `${name}：びんの中より大きい（${st.r.toFixed(1)}px ＞ ${st.jarR.toFixed(1)}px）`);
  ok(st.outside === 0 && st.inGlass === 0, `${name}：画面の中にいて、ガラスに めりこんでいない（外${st.outside}・ガラス${st.inGlass}）`);
  ok(st.inside <= 3, `${name}：びんの中は ほとんど からっぽ（のこり${st.inside}こ）`);
  ok(st.maxOverlap < 0.5, `${name}：大きな重なりがない（${st.maxOverlap.toFixed(2)}）`);

  // びんの置き場所：左上のすみ（うしろに 粒が通れる すきま）、口は 右下を むく
  const place = await page.evaluate(() => {
    const T = DropTable, p = T.pose, e = T.extents(p.angle);
    const r = Math.max(...T.balls.filter(b => b.tier === 1).map(b => b.rTable));
    return { left: p.x + e.minX * p.scale, top: p.y + e.minY * p.scale, need: r * 2, mx: Math.sin(p.angle), my: -Math.cos(p.angle) };
  });
  ok(place.left >= place.need && place.top >= place.need, `${name}：びんの うしろに 粒が通れる すきま（左${Math.round(place.left)}px・上${Math.round(place.top)}px ≧ ${Math.round(place.need)}px）`);
  ok(place.mx > 0.3 && place.my > 0.3, `${name}：びんは 左上に たおれて、口が 右下を むく`);

  // 指でつまんで動かす（止めてから はなすと、そこに おかれる）。びんから はなれた粒を、右下へ
  const target = await page.evaluate(() => ({ x: DropTable.W * 0.7, y: DropTable.H * 0.75 }));
  const pick = await page.evaluate(t => {
    const T = DropTable;
    const far = T.balls.filter(b => !b.inside && !T.nearJar(b, 40) && Math.hypot(b.x - t.x, b.y - t.y) > 60);
    const b = far.reduce((m, x) => (Math.hypot(x.x - t.x, x.y - t.y) < Math.hypot(m.x - t.x, m.y - t.y) ? x : m));
    return { x: b.x, y: b.y };
  }, target);
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

  // 2本の指で、2つぶ いっしょに動かす（びんから はなれた所で）
  const multi = await page.evaluate(() => {
    const T = DropTable, c = T.canvas;
    const ta = { x: T.W * 0.35, y: T.H * 0.88 }, tb = { x: T.W * 0.85, y: T.H * 0.6 };
    const far = T.balls.filter(x => !x.inside && !T.nearJar(x, 40));
    const near = t => far.reduce((m, x) => (Math.hypot(x.x - t.x, x.y - t.y) < Math.hypot(m.x - t.x, m.y - t.y) ? x : m));
    const a = near(ta), b = near(tb);
    const send = (type, id, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 21, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    send('pointerdown', 21, a.x, a.y);
    send('pointerdown', 22, b.x, b.y);
    send('pointermove', 21, ta.x, ta.y);
    send('pointermove', 22, tb.x, tb.y);
    const r = { holds: T.holds.size, da: Math.hypot(a.x - ta.x, a.y - ta.y), db: Math.hypot(b.x - tb.x, b.y - tb.y) };
    send('pointerup', 21, ta.x, ta.y);
    send('pointerup', 22, tb.x, tb.y);
    r.after = T.holds.size;
    return r;
  });
  ok(multi.holds === 2 && multi.da < 2 && multi.db < 2 && multi.after === 0, `${name}：2本の指で いっしょに動かせる`);

  // 口からなら、びんの中へ入れられる（中では びんの粒の大きさに ちぢむ）
  const mouthPath = await page.evaluate(() => {
    const T = DropTable, s = DropJar.jar;
    const out = T.toWorld(T.pose, s.cx, s.rimTop - 60), inn = T.toWorld(T.pose, s.cx, (s.rimTop + s.bottom) / 2);
    const far = T.balls.filter(b => !b.inside && !T.nearJar(b, 20));
    const b = far.reduce((m, x) => (Math.hypot(x.x - out.x, x.y - out.y) < Math.hypot(m.x - out.x, m.y - out.y) ? x : m));
    return { from: { x: b.x, y: b.y }, out, inn };
  });
  await page.mouse.move(mouthPath.from.x, mouthPath.from.y);
  await page.mouse.down();
  await page.mouse.move(mouthPath.out.x, mouthPath.out.y, { steps: 20 });
  await page.mouse.move(mouthPath.inn.x, mouthPath.inn.y, { steps: 30 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await settle(page);
  const putIn = await page.evaluate(() => {
    const T = DropTable, b = T.balls[T.balls.length - 1];
    window.__putIn = b;
    const l = T.toLocal(b.x, b.y, true);
    return { inside: b.inside && DropJar.insideJar(l.x, l.y), small: b.r < b.rTable * 0.8 };
  });
  ok(putIn.inside && putIn.small, `${name}：口から びんの中へ入れられる（中では 小さくなる）`);

  // ガラスは すりぬけない（びんの よこから 中へ ひっぱっても、外に のこる）
  const wallPath = await page.evaluate(() => {
    const T = DropTable, s = DropJar.jar, mid = (s.rimTop + s.bottom) / 2;
    const sides = [T.toWorld(T.pose, s.cx - s.bw - 50, mid), T.toWorld(T.pose, s.cx + s.bw + 50, mid)];
    const side = sides.find(p => p.x > 20 && p.y > 20 && p.x < T.W - 20 && p.y < T.H - 20) || sides[0];
    const inn = T.toWorld(T.pose, s.cx, mid + 40);
    const far = T.balls.filter(b => !b.inside && !T.nearJar(b, 20));
    const b = far.reduce((m, x) => (Math.hypot(x.x - side.x, x.y - side.y) < Math.hypot(m.x - side.x, m.y - side.y) ? x : m));
    return { from: { x: b.x, y: b.y }, side, inn };
  });
  await page.mouse.move(wallPath.from.x, wallPath.from.y);
  await page.mouse.down();
  await page.mouse.move(wallPath.side.x, wallPath.side.y, { steps: 20 });
  await page.mouse.move(wallPath.inn.x, wallPath.inn.y, { steps: 30 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await settle(page);
  const blocked = await page.evaluate(() => {
    const T = DropTable, b = T.balls[T.balls.length - 1];
    const l = T.toLocal(b.x, b.y, true);
    return !b.inside && !DropJar.insideJar(l.x, l.y) && T.glassDepth(b) < 1.5;
  });
  ok(blocked, `${name}：ガラスは すりぬけない`);

  // おかたづけ：まず びんが おきあがって 定位置に もどる（そのあいだ、テーブルの粒は まだ動かない）
  await page.click('.drop-table-done');
  const rise = await page.evaluate(() => {
    const T = DropTable;
    const before = T.balls.filter(b => !b.inside).map(b => [b, b.x, b.y]);
    let still = true;
    for (let i = 0; i < 200 && T.phase === 'rise'; i++) {
      window.__pump(1);
      if (T.phase === 'rise') still = still && before.every(([b, x, y]) => b.x === x && b.y === y);
    }
    const r = DropJar.canvas.getBoundingClientRect();
    return { phase: T.phase, still, angle: T.pose.angle, dx: T.pose.x - (r.left + r.width / 2), dy: T.pose.y - (r.top + r.height / 2) };
  });
  const spawned = await page.evaluate(() => DropTable.balls.filter(b => b.stage === 'spawn').length);
  ok(merges === 0 || spawned === 0, `${name}：合体した玉は ほどけない（口の上から わいてくる粒が ない：${spawned}こ）`);
  ok(rise.phase === 'fill' && rise.still && rise.angle === 0 && Math.abs(rise.dx) < 1 && Math.abs(rise.dy) < 1,
    `${name}：おかたづけは、まず びんが おきあがって 定位置に もどる`);

  // 粒が 口の上の まんなかに あつまって 落ち、山になって つもる（はじめは けわしく、さいごは なだらか）。中に入れておいた粒も いっしょに
  const fill = await page.evaluate(() => {
    const T = DropTable, shape = DropJar.jar;
    // 山の けわしさ：まんなかの いちばん上と、すその いちばん上の 高さの差（びんの絵の大きさで）
    const steep = () => {
      const done = T.balls.filter(b => b.stage === 'done').map(b => b.slot.ball);
      const top = list => Math.min(...list.map(b => b.y));
      const mid = done.filter(b => Math.abs(b.x - shape.cx) < shape.bw * 0.25), side = done.filter(b => Math.abs(b.x - shape.cx) > shape.bw * 0.6);
      return mid.length && side.length ? top(side) - top(mid) : null;
    };
    let center = true, half = null, slowest = Infinity;
    for (let i = 0; i < 900 && T.phase === 'fill'; i++) {
      const prev = new Map(T.balls.map(b => [b, { x: b.x, y: b.y, stage: b.stage, v: b.lastV }]));
      window.__pump(1);
      // 口の上で 止まらない：とびはじめて 速くなってから 山に つくまで、速く動いている粒が 1こまで 速さが 半分より おそくならない（空中で 止まって見えない）
      T.balls.forEach(b => {
        const p = prev.get(b);
        if (!p) return;
        b.lastV = Math.hypot(b.x - p.x, b.y - p.y);
        const moving = b.stage === 'fly' || b.stage === 'fall'; // 山に ついたら（ころがりはじめたら）おわり
        if (b.fast && moving && p.v > 3) slowest = Math.min(slowest, b.lastV / p.v);
        if (b.stage === 'fly' && b.lastV > 3) b.fast = true;
      });
      T.balls.forEach(b => {
        if (b.stage === 'fall' && b.t === 1) {
          const l = T.toLocal(b.sx, b.sy, true);
          if (Math.abs(l.x - shape.cx) > shape.nw * 0.45 || l.y > shape.rimTop) center = false;
        }
      });
      const doneN = T.balls.filter(b => b.stage === 'done').length;
      if (half === null && doneN >= T.balls.length * 0.5) half = steep();
    }
    const end = steep();
    const p = T.pose;
    const atSlot = T.balls.every(b => { const w = T.toWorld(p, b.slot.ball.x, b.slot.ball.y); return b.stage === 'done' && Math.hypot(b.x - w.x, b.y - w.y) < 0.5; });
    const snap = T.balls.map(b => [b.x, b.y, b.angle]);
    window.__pump(5);
    const calm = T.balls.every((b, i) => b.x === snap[i][0] && b.y === snap[i][1] && b.angle === snap[i][2]);
    // いつもの びんの ならびとして おかしくない（かさならない・ガラスに かからない）
    const jb = DropJar.balls;
    let overlap = 0;
    jb.forEach((a, i) => jb.slice(i + 1).forEach(c => { if (Math.hypot(a.x - c.x, a.y - c.y) < a.r + c.r - 0.5) overlap++; }));
    const fits = jb.every(b => T.fitsInJar(b.x, b.y, b.r - 0.5));
    return { phase: T.phase, center, slowest, half, end, atSlot, calm, overlap, fits, n: T.balls.length, slots: jb.length, kept: !!window.__putIn.slot && T.balls.includes(window.__putIn) };
  });
  ok(fill.phase === 'lid' && fill.atSlot, `${name}：粒が びんに入って つもる`);
  ok(fill.center, `${name}：粒は 口の上の まんなかあたりに あつまって 落ちる`);
  ok(fill.slowest >= 0.5, `${name}：口の上で 止まらずに、そのまま 落ちる（いちばん 速さが おちた こまで ${fill.slowest.toFixed(2)}倍）`);
  ok(fill.half !== null && fill.end !== null && fill.end >= 0 && fill.half > fill.end,
    `${name}：まんなかに 山ができて、だんだん なだらかに なる（とちゅう ${fill.half && fill.half.toFixed(0)} → さいご ${fill.end && fill.end.toFixed(0)}）`);
  ok(fill.calm, `${name}：つもったら 動かない`);
  ok(fill.kept, `${name}：中に入れておいた粒も、いっしょに つもる`);
  ok(fill.n === fill.slots, `${name}：いつもの びんと 同じ数だけ つもる（${fill.n}こ）`);
  ok(fill.overlap === 0 && fill.fits, `${name}：つもった ならびは かさならず、ガラスに かからない`);

  // ふたが しまると、いつもの びん（つもった ならびと まったく同じ）
  const handoff = await page.evaluate(() => {
    const T = DropTable;
    const last = T.balls.map(b => ({ ball: b.slot.ball, src: b.src, x: b.slot.ball.x, y: b.slot.ball.y }));
    for (let i = 0; i < 200 && T.isOpen; i++) window.__pump(1);
    return {
      closed: !T.isOpen, lid: DropJar.lidY === 0 && DropJar.lidAngle === 0, quiet: !DropJar.running,
      same: last.every(l => DropJar.balls.includes(l.ball) && l.ball.src === l.src && l.ball.x === l.x && l.ball.y === l.y),
    };
  });
  ok(handoff.closed && handoff.lid, `${name}：さいごに ふたが しまる`);
  ok(handoff.same && handoff.quiet, `${name}：ふたが しまったあとの びんは、つもった ならびのまま（入れかわらない）`);
  const kept = await page.evaluate(() => {
    const B = window.__before, J = DropJar;
    return {
      same: J.balls.length === B.balls.length && J.balls.every(b => B.balls.includes(b)),
      t100: J.balls.filter(b => b.tier === 100).length, queue: J.mergeQueue.length, queueBefore: B.queue,
    };
  });
  ok(kept.same && kept.t100 === merges && kept.queue === kept.queueBefore,
    `${name}：おかたづけのあとも、たおす前の びんの中身のまま（100玉${kept.t100}こ・のこりの合体${kept.queue}回）`);
  // つづけて タップすると、合体の つづきから
  const body2 = await jarPoint(page, 'body');
  await page.mouse.click(body2.x, body2.y);
  await pump(page, 150);
  const next = await page.evaluate(() => ({ t100: DropJar.balls.filter(b => b.tier === 100).length, queue: DropJar.mergeQueue.length }));
  ok(next.t100 === merges + 1 && next.queue === kept.queue - 1, `${name}：タップすると、合体の つづきから（100玉${next.t100}こ）`);

  // もとの びんに もどる
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
