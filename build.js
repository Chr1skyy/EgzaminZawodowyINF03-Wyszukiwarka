const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const SRC = path.join(__dirname, 'src');
const ESBUILD = 'npx -y esbuild@0.28.2';

const runBuild = () => {
    // 1. Przygotowanie czystego folderu DIST
    fs.rmSync(DIST, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
    fs.mkdirSync(DIST);

    // 2. Łączenie modułów i minifikacja JS
    console.log('📦 Bundling JS...');
    const jsBundle = path.join(DIST, 'app.min.js');
    execSync(`${ESBUILD} "${path.join(SRC, 'js/app.js')}" --bundle --minify --format=iife --outfile="${jsBundle}"`, { stdio: 'inherit' });
    const jsHash = crypto.createHash('md5').update(fs.readFileSync(jsBundle)).digest('hex').slice(0, 8);
    const jsDestFile = `app.${jsHash}.min.js`;
    fs.renameSync(jsBundle, path.join(DIST, jsDestFile));
    console.log(`✅ JS bundled to ${jsDestFile}`);

    // 3. Minifikacja CSS
    console.log('🎨 Minifying CSS...');
    const cssContent = fs.readFileSync(path.join(SRC, 'css/styles.css'), 'utf-8');
    const cssHash = crypto.createHash('md5').update(cssContent).digest('hex').slice(0, 8);
    const cssDestFile = `styles.${cssHash}.min.css`;
    execSync(`${ESBUILD} "${path.join(SRC, 'css/styles.css')}" --minify --outfile="${path.join(DIST, cssDestFile)}"`, { stdio: 'inherit' });
    console.log(`✅ CSS minified to ${cssDestFile}`);

    // 4. Minifikacja JSON
    const rawData = fs.readFileSync(path.join(SRC, 'data.json'), 'utf-8');
    fs.writeFileSync(path.join(DIST, 'data.json'), JSON.stringify(JSON.parse(rawData)), 'utf-8');
    console.log(`✅ JSON minified`);

    // 5. Kopiowanie statycznych assetów oraz katalogu z ikonami
    const assetsToCopy = [
        'favicon.ico',
        'og-image.png',
        'manifest.json',
        'sitemap.xml',
        'sw.js'
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

    // 5a. Kopiowanie CNAME (jeśli istnieje)
    if (fs.existsSync(path.join(__dirname, 'CNAME'))) {
        fs.copyFileSync(path.join(__dirname, 'CNAME'), path.join(DIST, 'CNAME'));
    }

    // 6. Przepisywanie index.html pod wydanie produkcyjne
    const replaceOnce = (html, from, to) => {
        if (!html.includes(from)) {
            throw new Error(`index.html: nie znaleziono "${from}"`);
        }
        return html.replace(from, to);
    };
    let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
    html = replaceOnce(html, '<link rel="stylesheet" href="css/styles.css">', `<link rel="stylesheet" href="${cssDestFile}">`);
    html = replaceOnce(html, '<script type="module" src="js/app.js"></script>', `<script defer src="${jsDestFile}"></script>`);
    fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf-8');
    console.log('✅ HTML rewritten perfectly for /dist');

    console.log('\n🏁 Full Production Build complete! Entire application is ready to deploy from /dist folder.');
};

try {
    runBuild();
} catch (e) {
    console.error('CRITICAL BUILD ERROR:');
    console.error(e);
    process.exit(1);
}
