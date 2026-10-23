const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const SRC = path.join(__dirname, 'src');

const runBuild = () => {
    // 1. Przygotowanie czystego folderu DIST
    fs.rmSync(DIST, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
    fs.mkdirSync(DIST);

    // 2. Łączenie modułów i minifikacja JS
    console.log('📦 Bundling JS...');
    const jsBundle = path.join(DIST, 'app.min.js');
    execSync(`npx -y esbuild "${path.join(SRC, 'js/app.js')}" --bundle --minify --format=iife --outfile="${jsBundle}"`, { stdio: 'inherit' });
    const jsHash = crypto.createHash('md5').update(fs.readFileSync(jsBundle)).digest('hex').slice(0, 8);
    const jsDestFile = `app.${jsHash}.min.js`;
    fs.renameSync(jsBundle, path.join(DIST, jsDestFile));
    console.log(`✅ JS bundled to ${jsDestFile}`);

    // 3. Minifikacja CSS
    let cssDestFile = 'styles.min.css';
    let cssHash = 'default';
    try {
        console.log('🎨 Minifying CSS...');
        const cssContent = fs.readFileSync(path.join(SRC, 'css/styles.css'), 'utf-8');
        cssHash = crypto.createHash('md5').update(cssContent).digest('hex').slice(0, 8);
        cssDestFile = `styles.${cssHash}.min.css`;
        execSync(`npx -y esbuild "${path.join(SRC, 'css/styles.css')}" --minify --outfile="${path.join(DIST, cssDestFile)}"`, { stdio: 'inherit' });
        console.log(`✅ CSS minified to ${cssDestFile}`);
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

    // 5. Kopiowanie statycznych assetów oraz katalogu z ikonami
    const assetsToCopy = [
        'favicon.ico',
        'og-image.png',
        'manifest.json',
        'sitemap.xml'
    ];
    assetsToCopy.forEach(asset => {
        if (fs.existsSync(path.join(SRC, asset))) {
            fs.copyFileSync(path.join(SRC, asset), path.join(DIST, asset));
        }
    });

    const iconsSrcDir = path.join(SRC, 'icons');
    const iconsDistDir = path.join(DIST, 'icons');
    if (fs.existsSync(iconsSrcDir)) {
        if (!fs.existsSync(iconsDistDir)) {
            fs.mkdirSync(iconsDistDir, { recursive: true });
        }
        fs.readdirSync(iconsSrcDir).forEach(file => {
            fs.copyFileSync(path.join(iconsSrcDir, file), path.join(iconsDistDir, file));
        });
        console.log('✅ Icons folder copied to /dist/icons');
    }

    // 5a. Kopiowanie i modyfikacja Service Workera
    try {
        const swPath = path.join(SRC, 'sw.js');
        if (fs.existsSync(swPath)) {
            let swContent = fs.readFileSync(swPath, 'utf-8');
            
            // Zmiana CACHE_NAME na unikalną dla tej kompilacji
            swContent = swContent.replace(/const CACHE_NAME = '[\s\S]*?';/, `const CACHE_NAME = 'ezinf-${jsHash}-${cssHash}';`);

            // Zmiana listy assetów na wersje zminifikowane/zbuforowane z hashami
            const devAssetsBlock = /const ASSETS = \[[\s\S]*?\];/;
            const prodAssets = `const ASSETS = [
  './',
  './index.html',
  './${cssDestFile}',
  './${jsDestFile}',
  './data.json',
  './favicon.ico',
  './icons/logo.svg',
  './icons/favicon.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
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

        // Zmiana łączy CSS z hashem
        html = html.replace('<link rel="stylesheet" href="css/styles.css">', `<link rel="stylesheet" href="${cssDestFile}">`);

        html = html.replace('<script type="module" src="js/app.js"></script>', `<script defer src="${jsDestFile}"></script>`);

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
