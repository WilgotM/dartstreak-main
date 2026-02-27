import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');
const availableFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage (All languages): node add_translation.js <key> \'<json_object>\'');
    console.log('Example: node add_translation.js common.greet \'{"en": "Hello", "sv": "Hej", "da": "Hej", "de": "Hallo", "es": "Hola", "fr": "Salut", "nl": "Hoi", "no": "Hei"}\'');
    console.log('\nUsage (Legacy EN/SV): node add_translation.js <key> <english_text> <swedish_text>');
    process.exit(1);
}

const keyPath = args[0];
let translations = {};

if (args.length === 2) {
    // Try to parse second arg as JSON
    try {
        translations = JSON.parse(args[1]);
    } catch (e) {
        console.error('Error: Failed to parse JSON object. Ensure it is valid JSON and wrapped in single quotes.');
        process.exit(1);
    }
} else if (args.length === 3) {
    // Legacy support for EN and SV
    translations = {
        en: args[1],
        sv: args[2]
    };
    console.warn('Warning: Only English and Swedish provided. Other languages will NOT be updated.');
}

availableFiles.forEach((file) => {
    const lang = file.replace('.json', '');
    const text = translations[lang];
    
    if (text === undefined) {
        if (args.length === 3 && (lang !== 'en' && lang !== 'sv')) {
            // Skip for legacy mode if not en/sv
            return;
        }
        console.warn(`Warning: No translation provided for ${lang}. Skipping.`);
        return;
    }

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

    current[keys[keys.length - 1]] = text;

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
