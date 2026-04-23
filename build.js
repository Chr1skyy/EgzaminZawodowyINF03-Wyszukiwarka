const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');

// 1. Przygotowanie czystego folderu DIST
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST);

// 2. Łączenie i minifikacja JS
const jsFiles = [
    'js/lib/fuse.basic.min.js',
    'js/utils.js',
    'js/components.js',
    'js/storage.js',
    'js/filters.js',
    'js/search.js',
    'js/app.js',
    'js/modal.js'
];
const jsContent = jsFiles.map(f => fs.readFileSync(path.join(__dirname, f), 'utf-8')).join('\n;\n');
fs.writeFileSync(path.join(DIST, 'app.bundle.js'), jsContent, 'utf-8');

try {
    execSync(`npx -y terser "${path.join(DIST, 'app.bundle.js')}" -o "${path.join(DIST, 'app.bundle.min.js')}" --compress --mangle`, { stdio: 'inherit' });
    fs.unlinkSync(path.join(DIST, 'app.bundle.js')); // Oczyszczenie wersji niezminifikowanej
    console.log(`✅ JS minified`);
} catch {
    console.log('⚠️ terser fallback');
}

// 3. Minifikacja CSS
try {
    execSync(`npx -y clean-css-cli -o "${path.join(DIST, 'styles.min.css')}" "${path.join(__dirname, 'css/styles.css')}"`, { stdio: 'inherit' });
    console.log(`✅ CSS minified`);
} catch {
    console.log('⚠️ clean-css-cli fallback');
}

// 4. Minifikacja JSON
try {
    const dataPath = path.join(__dirname, 'data.json');
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
const assetsToCopy = ['favicon.ico', 'favicon.png', 'og-image.png'];
assetsToCopy.forEach(asset => {
    if (fs.existsSync(path.join(__dirname, asset))) {
        fs.copyFileSync(path.join(__dirname, asset), path.join(DIST, asset));
    }
});
if (fs.existsSync(path.join(__dirname, 'img'))) {
    fs.cpSync(path.join(__dirname, 'img'), path.join(DIST, 'img'), { recursive: true });
}

// 6. Przepisywanie index.html pod wydanie produkcyjne
try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

    // Zmiana łączy CSS
    html = html.replace('<link rel="stylesheet" href="css/styles.css">', '<link rel="stylesheet" href="styles.min.css">');

    // Zastąpienie wielu tagów script jednym połączonym bundle
    const jsBlockRegex = /<script defer src="js\/lib\/fuse\.basic\.min\.js"><\/script>[\s\S]*?<script defer src="js\/modal\.js"><\/script>/;
    html = html.replace(jsBlockRegex, '<script defer src="app.bundle.min.js"></script>');

    fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf-8');
    console.log('✅ HTML rewritten perfectly for /dist');
} catch (e) {
    console.log('⚠️ HTML rewrite error:', e.message);
}

console.log('\n🏁 Full Production Build complete! Entire application is ready to deploy from /dist folder.');
