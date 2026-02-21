const fs = require('fs');
const path = require('path');

const dir = 'd:/нейро/AntiGraviti/Proje/MiniApp/frontend/src';

function processDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
        const fullPath = path.join(currentDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            if (file === 'api.js') continue;

            let changed = false;

            if (content.includes('fetch(')) {
                content = content.replace(/\bfetch\(/g, 'fetchWithAuth(');
                changed = true;
            }

            if (changed && content.includes('{ API_BASE }')) {
                content = content.replace('{ API_BASE }', '{ API_BASE, fetchWithAuth }');
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    }
}

processDir(dir);
