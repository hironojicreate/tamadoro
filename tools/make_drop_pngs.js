// 小さいドロップの画像（img/drops/small/*.png）を、img/drops/*.svg からつくるスクリプト
//
//   node tools/make_drop_pngs.js
//
// レベル選択の画面（かけざんでは 150 こ）や、きろくのカレンダーのように、
// 小さいドロップをたくさん並べるところでは、この PNG を使う（js/modes/index.js の dropSrc）。
// SVG はぼかしの影やグラデーションが多く、たくさん並べると描くのが重いため。
// img/drops/*.svg を直したら、このスクリプトをもう一度実行して PNG もつくりなおす。
// （Playwright を使う。tests/ で npm install したあとなら動く）
const fs = require('fs');
const path = require('path');
let chromium;
try {
    ({ chromium } = require('playwright'));
} catch (e) {
    ({ chromium } = require(path.join(__dirname, '../tests/node_modules/playwright')));
}

const SIZE = 80;  // 25px ほどで出すドロップを、3倍の画面でもきれいに見せる大きさ
const DROPS_DIR = path.join(__dirname, '../img/drops');
const OUT_DIR = path.join(DROPS_DIR, 'small');

(async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
    const letters = fs.readdirSync(DROPS_DIR).filter(f => f.endsWith('.svg')).map(f => f.replace('.svg', ''));
    for (const letter of letters) {
        const svg = fs.readFileSync(path.join(DROPS_DIR, `${letter}.svg`)).toString('base64');
        await page.setContent(`<body style="margin:0"><img id="drop" width="${SIZE}" height="${SIZE}" src="data:image/svg+xml;base64,${svg}"></body>`);
        await page.locator('#drop').screenshot({ path: path.join(OUT_DIR, `${letter}.png`), omitBackground: true });
        console.log(`img/drops/small/${letter}.png`);
    }
    await browser.close();
})();
