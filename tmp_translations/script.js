const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const files = fs.readdirSync(localesPath).filter(f => f.endsWith('.json'));

const enData = JSON.parse(fs.readFileSync(path.join(localesPath, 'en.json')));
const redZoneEn = enData.trainingRedZone;

console.log(JSON.stringify(redZoneEn, null, 2));
