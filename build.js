const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const SRC = path.join(__dirname, 'src');

const isWindows = process.platform === 'win32';

const sleep = (ms) => {
    if (isWindows) {
        execSync(`powershell Start-Sleep -Milliseconds ${ms}`);
    } else {
        execSync(`sleep ${ms / 1000}`);
    }
};

const runBuild = () => {
    // 1. Przygotowanie czystego folderu DIST
    if (fs.existsSync(DIST)) {
        try {
            fs.rmSync(DIST, { recursive: true, force: true });
        } catch (e) {
            console.log('⚠️ Could not remove DIST, trying to rename it...');
            if (isWindows) {
                const tempDist = path.join(__dirname, 'dist_old_' + Date.now());
                try {
                    fs.renameSync(DIST, tempDist);
                } catch (renameErr) {
                    console.log('⚠️ Could not rename DIST, it might be locked by another process.');
                }
            }
        }
        if (isWindows) sleep(300);
    }

    // Próba utworzenia lub wyczyszczenia folderu DIST
    if (!fs.existsSync(DIST)) {
        for (let i = 0; i < 3; i++) {
            try {
                fs.mkdirSync(DIST);
                break;
            } catch (e) {
                if (i === 2) {
                    console.error('❌ FATAL: Could not create DIST folder. Please close any programs using it.');
                    throw e;
                }
                if (isWindows) sleep(300);
            }
        }
    }

    // 2. Łączenie i minifikacja JS
    const jsFiles = [
        'js/utils.js',
        'js/components.js',
        'js/storage.js',
        'js/filters.js',
        'js/search.js',
        'js/app.js',
        'js/modal.js'
    ];
    console.log('📦 Bundling JS...');
    const jsContent = jsFiles.map(f => fs.readFileSync(path.join(SRC, f), 'utf-8')).join('\n;\n');
    fs.writeFileSync(path.join(DIST, 'app.bundle.js'), jsContent, 'utf-8');

    try {
        execSync(`npx -y esbuild "${path.join(DIST, 'app.bundle.js')}" --minify --outfile="${path.join(DIST, 'app.bundle.min.js')}"`, { stdio: 'inherit' });
        fs.unlinkSync(path.join(DIST, 'app.bundle.js')); // Oczyszczenie wersji niezminifikowanej
        console.log(`✅ JS minified`);
    } catch (e) {
        console.log('⚠️ esbuild JS error:', e.message);
    }

    // 3. Minifikacja CSS
    try {
        console.log('🎨 Minifying CSS...');
        execSync(`npx -y esbuild "${path.join(SRC, 'css/styles.css')}" --minify --outfile="${path.join(DIST, 'styles.min.css')}"`, { stdio: 'inherit' });
        console.log(`✅ CSS minified via esbuild`);
    } catch (e) {
        console.log('⚠️ esbuild CSS error:', e.message);
    }

    // 4. Minifikacja JSON
    try {
        const dataPath = path.join(SRC, 'data.json');
        if (fs.existsSync(dataPath)) {
            const rawData = fs.readFileSync(dataPath, 'utf-8');
            const minifiedJson = JSON.stringify(JSON.parse(rawData));
            fs.writeFileSync(path.join(DIST, 'data.json'), minifiedJson, 'utf-8');
            console.log(`✅ JSON minified`);
        }
    } catch (e) {
        console.log('⚠️ JSON minify error:', e.message);
    }

    // 5. Kopiowanie statycznych assetów (favicon itp.)
    const assetsToCopy = ['favicon.ico', 'favicon.png', 'og-image.png', 'manifest.json', 'sitemap.xml', 'robots.txt'];
    assetsToCopy.forEach(asset => {
        if (fs.existsSync(path.join(SRC, asset))) {
            fs.copyFileSync(path.join(SRC, asset), path.join(DIST, asset));
        }
    });

    // 5a. Kopiowanie i modyfikacja Service Workera
    try {
        const swPath = path.join(SRC, 'sw.js');
        if (fs.existsSync(swPath)) {
            let swContent = fs.readFileSync(swPath, 'utf-8');
            
            // Zmiana listy assetów na wersje zminifikowane/zbuforowane
            const devAssetsBlock = /const ASSETS = \[[\s\S]*?\];/;
            const prodAssets = `const ASSETS = [
  './',
  './index.html',
  './styles.min.css',
  './app.bundle.min.js',
  './data.json',
  './favicon.png',
  './manifest.json'
];`;
            swContent = swContent.replace(devAssetsBlock, prodAssets);
            
            fs.writeFileSync(path.join(DIST, 'sw.js'), swContent, 'utf-8');
            console.log('✅ Service Worker optimized for production');
        }
    } catch (e) {
        console.log('⚠️ Service Worker build error:', e.message);
    }

    // 5b. Kopiowanie CNAME (jeśli istnieje)
    if (fs.existsSync(path.join(__dirname, 'CNAME'))) {
        fs.copyFileSync(path.join(__dirname, 'CNAME'), path.join(DIST, 'CNAME'));
    }

    // 6. Przepisywanie index.html pod wydanie produkcyjne
    try {
        let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');

        // Zmiana łączy CSS
        html = html.replace('<link rel="stylesheet" href="css/styles.css">', '<link rel="stylesheet" href="styles.min.css">');

        // Zastąpienie wielu tagów script jednym połączonym bundle
        const jsBlockRegex = /<script defer src="js\/utils\.js"><\/script>[\s\S]*?<script defer src="js\/modal\.js"><\/script>/;
        html = html.replace(jsBlockRegex, '<script defer src="app.bundle.min.js"></script>');

        fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf-8');
        console.log('✅ HTML rewritten perfectly for /dist');
    } catch (e) {
        console.log('⚠️ HTML rewrite error:', e.message);
    }

    console.log('\n🏁 Full Production Build complete! Entire application is ready to deploy from /dist folder.');
};

try {
    runBuild();
} catch (e) {
    console.error('CRITICAL BUILD ERROR:');
    console.error(e);
    process.exit(1);
}
