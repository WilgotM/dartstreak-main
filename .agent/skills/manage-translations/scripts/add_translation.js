import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');
const files = ['en.json', 'sv.json'];

const args = process.argv.slice(2);
if (args.length < 3) {
    console.log('Usage: node add_translation.js <key> <english_text> <swedish_text>');
    console.log('Example: node add_translation.js common.hello "Hello" "Hej"');
    process.exit(1);
}

const [keyPath, enText, svText] = args;
const texts = [enText, svText];

files.forEach((file, index) => {
    const filePath = path.join(localesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const keys = keyPath.split('.');
    let current = data;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = texts[index];

    // Sort keys alphabetically for consistency
    const sortedData = sortObject(data);

    fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n');
    console.log(`Updated ${file}`);
});

function sortObject(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return obj;
    }

    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
        sorted[key] = sortObject(obj[key]);
    });
    return sorted;
}
