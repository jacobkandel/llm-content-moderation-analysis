const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '../web/app');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('layout.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const layoutFiles = walkDir(appDir);

layoutFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Ensure Alternates/Canonical exists
    if (content.includes('export const metadata: Metadata = {') && !content.includes('alternates: {')) {
        const routePath = file.replace(appDir, '').replace('/layout.tsx', '');
        const canonicalPath = routePath === '' ? '/' : routePath;
        
        content = content.replace(
            /export const metadata: Metadata = {/,
            `export const metadata: Metadata = {\n    alternates: {\n        canonical: '${canonicalPath}',\n    },`
        );
        changed = true;
    }

    // 2. Add specific OG Images
    const ogImageMap = {
        '/analysis/summary': '/assets/summary.png',
        '/analysis/significance': '/assets/significance.png',
        '/analysis/clusters': '/assets/clusters.png'
    };

    for (const [route, image] of Object.entries(ogImageMap)) {
        if (file.includes(route) && content.includes('openGraph: {') && !content.includes('images:')) {
            content = content.replace(
                /openGraph: {([^}]*)}/s,
                (match, p1) => {
                    return `openGraph: {${p1}        images: ['${image}'],\n    }`;
                }
            );
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});
