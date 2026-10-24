// タマドロのテストをまとめて実行する
//   アプリのフォルダをかんたんなサーバーで配信して、*.test.js を順番に動かす
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8765;
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
});

// テストのファイルを1つ動かす（サーバーが返事できるよう、終わるのを非同期で待つ）
function runTest(file) {
    return new Promise(resolve => {
        const child = spawn(process.execPath, [path.join(__dirname, file)], {
            stdio: 'inherit',
            env: { ...process.env, BASE_URL: `http://localhost:${PORT}/` },
        });
        child.on('exit', code => resolve(code === 0));
    });
}

server.listen(PORT, async () => {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
    let failed = 0;
    for (const file of files) {
        console.log(`\n=== ${file}`);
        if (!(await runTest(file))) failed++;
    }
    server.close();
    console.log(failed ? `\n${failed} ファイルで失敗` : '\nすべて成功');
    process.exit(failed ? 1 : 0);
});
