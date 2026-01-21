/**
 * Realistic dart player names for bots
 * These names are inspired by the style of professional dart players
 * but are entirely fictional to avoid using real player names.
 */

// First names commonly found in darts culture (British, Dutch, Belgian, German, etc.)
const FIRST_NAMES = [
    // British-style
    "Phil", "Gary", "James", "Michael", "Peter", "John", "Wayne", "Adrian",
    "Steve", "Keith", "Martin", "Raymond", "Dennis", "Eric", "Kevin", "Terry",
    "Dave", "Colin", "Andrew", "Simon", "Glen", "Darren", "Dean", "Mark",
    "Paul", "Barry", "Tony", "Ian", "Chris", "Rob", "Mick", "Stu",
    // Dutch-style
    "Jan", "Dirk", "Jelle", "Vincent", "Benito", "Danny", "Raymond", "Michael",
    "Geert", "Jeffrey", "Wesley", "Niels", "Martijn", "Maik", "Derk",
    // German-style
    "Max", "Gabriel", "Florian", "Martin", "Tomas", "René", "Mensur",
    // Welsh/Scottish
    "Gerwyn", "Jonny", "Ritchie", "Ross", "Peter", "Alan",
    // Belgian
    "Dimitri", "Kim", "Mike",
    // Other
    "Fallon", "Devon", "Damon", "Nathan", "Joe", "Luke", "Ryan", "Callan",
    "Josh", "Bradley", "Cameron", "Keane"
];

// Last names commonly found in darts culture
const LAST_NAMES = [
    // British-style
    "Taylor", "Anderson", "Wright", "Smith", "Wilson", "Price", "Wade", "Lewis",
    "Lloyd", "White", "Chisnall", "Cross", "Brown", "King", "Wallace", "Newton",
    "Hughes", "Webster", "Jones", "Evans", "Roberts", "Morgan", "Owen", "Davis",
    "Jenkins", "Thomas", "Edwards", "Clark", "Walker", "Turner", "Hall", "Wood",
    "Harris", "Martin", "Jackson", "Thompson", "Robinson", "Lee", "Green", "Mills",
    "Baker", "Hill", "Moore", "Adams", "Murray", "Palmer", "Cooper", "Ward",
    "Barnes", "Bennett", "Fox", "Cook", "Bell", "Brooks", "Ford", "Cole",
    // Dutch-style
    "van Gerwen", "van der Voort", "van Barneveld", "van Duijvenbode", "de Zwaan",
    "van den Bergh", "Klaasen", "Huybrechts", "Wattimena", "Noppert", "Dekker",
    "Veenstra", "van Peer", "Razma", "Borland", "Heta", "Whitlock", "Dolan",
    // German-style
    "Hopp", "Schindler", "Clemens", "Kurz", "Suljovic",
    // Other interesting surnames
    "Bunting", "Aspinall", "Clayton", "Cullen", "Searle", "Gurney", "Rock",
    "Dobey", "Humphries", "Littler", "Soutar", "Ratajski", "Krcmar"
];

// Nicknames (like "The Power", "Mighty Mike", etc.)
const NICKNAMES = [
    "The Arrow", "The Hammer", "The Ace", "The Bullet", "The Wizard",
    "The Machine", "The Cobra", "The Hawk", "The Hunter", "The Dart",
    "The Legend", "The Master", "The Pro", "The Boss", "The Chief",
    "The Fury", "The Flash", "The Thunder", "The Storm", "The Tiger",
    "The Rocket", "The Sniper", "The Captain", "The Major", "The General",
    "The Phoenix", "The Viking", "The Gladiator", "The Warrior", "The Champion",
    "Mighty", "Big", "Rapid", "The Iceman", "The Flying",
    "The Special One", "The Bull", "The Prince", "The Duke", "The Count",
    "Lucky", "Deadly", "Silky", "Smokin'", "The Demolition Man",
    "The Dreammaker", "The Natural", "The Magician", "The Assassin", "The Sensation",
    "Rocky", "The Asset", "The Gentle", "The Artist", "Cool Hand",
    "The Silverback", "The Titan", "The Giant", "The Machine Gun", "The Cannon",
    "Heavy", "Lightning", "Golden", "Diamond", "Iron",
    "Steel", "Bronze", "Silver", "Platinum", "The Viper",
    "The Wolf", "The Lion", "The Bear", "The Shark", "The Eagle",
    "The Falcon", "The Panther", "The Scorpion", "The Dragon", "The Phantom"
];

// Locations for regional flavor
const LOCATIONS = [
    "Bristol", "Manchester", "London", "Yorkshire", "Essex", "Glasgow",
    "Liverpool", "Birmingham", "Nottingham", "Newcastle", "Cardiff", "Belfast",
    "Dublin", "Cambridge", "Oxford", "Dover", "Brighton", "Plymouth",
    "Cornwall", "Stoke", "Blackpool", "Leeds", "Sheffield", "Leicester"
];

/**
 * Generates a unique bot name that sounds like a professional dart player
 * @param usedNames - Array of names already in use to avoid duplicates
 * @returns A unique dart player style name
 */
export function generateBotName(usedNames: string[] = []): string {
    const usedSet = new Set(usedNames.map(n => n.toLowerCase()));

    // Try to generate a unique name with increasing creativity
    for (let attempt = 0; attempt < 100; attempt++) {
        let name: string;

        // Different name generation strategies
        const strategy = Math.random();

        if (strategy < 0.5) {
            // Most common: First + Last name
            const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
            const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
            name = `${firstName} ${lastName}`;
        } else if (strategy < 0.75) {
            // First + "Nickname" + Last
            const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
            const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
            const nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
            // Clean up nickname formatting
            const cleanNickname = nickname.startsWith("The ") || nickname.endsWith("'")
                ? `"${nickname}"`
                : `"${nickname}"`;
            name = `${firstName} ${cleanNickname} ${lastName}`;
        } else if (strategy < 0.9) {
            // Nickname + First name (like "Mighty Mike")
            const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
            const nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
            // Only use single-word nicknames for this pattern
            if (!nickname.startsWith("The ") && !nickname.includes(" ")) {
                name = `${nickname} ${firstName}`;
            } else {
                const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
                name = `${firstName} ${lastName}`;
            }
        } else {
            // Location-based nickname
            const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
            const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
            const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

            // Occasionally add location-based flair
            if (Math.random() < 0.5) {
                name = `${firstName} "${location}" ${lastName}`;
            } else {
                name = `${firstName} ${lastName}`;
            }
        }

        if (!usedSet.has(name.toLowerCase())) {
            return name;
        }
    }

    // Fallback: generate a numbered name
    const num = Math.floor(Math.random() * 9999);
    return `Darter #${num}`;
}

/**
 * Pre-generated list of 150+ unique dart player names for quick access
 * These are static to ensure variety across the application
 */
export const STATIC_BOT_NAMES: string[] = [
    // Classic first + last combinations
    "Phil Stevens", "Gary Mitchell", "James Porter", "Michael Reed", "Peter Brooks",
    "John Freeman", "Wayne Douglas", "Adrian Stone", "Steve Chapman", "Keith Marshall",
    "Martin Spencer", "Raymond Scott", "Dennis Howard", "Eric Hunter", "Kevin Hardy",
    "Terry Blake", "Dave Morton", "Colin Barrett", "Andrew Walsh", "Simon Perry",
    "Glen Foster", "Darren Grant", "Dean Curtis", "Mark Sullivan", "Paul Griffin",
    "Barry Coleman", "Tony Russell", "Ian Henderson", "Chris Powell", "Rob Harper",

    // Dutch-style names
    "Jan van Dijk", "Dirk Vermeer", "Jelle Bakker", "Vincent de Jong", "Danny Visser",
    "Raymond Jansen", "Michael Smit", "Geert Mulder", "Jeffrey Bos", "Wesley Meijer",
    "Niels Dekker", "Martijn Peters", "Maik Brouwer", "Derk Kuiper", "Marco de Vries",

    // With nicknames
    "Phil \"The Arrow\" Thompson", "Gary \"The Hammer\" Wilson", "James \"The Ace\" Brown",
    "Michael \"The Bullet\" King", "Peter \"The Wizard\" Adams", "John \"The Machine\" Cooper",
    "Wayne \"The Cobra\" Bell", "Adrian \"The Hawk\" Wood", "Steve \"The Hunter\" Fox",
    "Keith \"The Master\" Cole", "Martin \"The Pro\" West", "Raymond \"The Boss\" Shaw",
    "Dennis \"The Chief\" Lane", "Eric \"The Fury\" Day", "Kevin \"The Flash\" Long",

    // More standard names
    "Terry Maxwell", "Dave Thornton", "Colin Campbell", "Andrew Pearson", "Simon Crawford",
    "Glen Patterson", "Darren Simpson", "Dean Gardner", "Mark Hamilton", "Paul Robertson",
    "Barry Fleming", "Tony Armstrong", "Ian Mackenzie", "Chris Wilkinson", "Rob Patterson",

    // Nickname-first style
    "Mighty Max", "Big Barry", "Rapid Ryan", "Lucky Luke", "Deadly Dave",
    "Silky Steve", "Iron Ian", "Golden Glen", "Diamond Dean", "Rocky Rob",

    // German-style names
    "Max Hoffmann", "Gabriel Fischer", "Florian Weber", "Martin Becker", "Tomas Schmidt",
    "René Wagner", "Klaus Richter", "Stefan Müller", "Franz Zimmermann", "Hans Keller",

    // Welsh/Scottish style
    "Gerwyn Griffith", "Jonny MacDonald", "Ritchie Davies", "Ross Campbell", "Alan Stewart",
    "Owen Williams", "Rhys Pritchard", "Dylan Hughes", "Gareth Lloyd", "Evan Thomas",

    // More with nicknames
    "Terry \"The Thunder\" Banks", "Dave \"The Storm\" Knight", "Colin \"The Tiger\" Nash",
    "Andrew \"The Rocket\" Hicks", "Simon \"The Sniper\" Gibbs", "Glen \"The Captain\" Marsh",
    "Darren \"The Major\" Norton", "Dean \"The General\" Watts", "Mark \"The Phoenix\" Chambers",
    "Paul \"The Viking\" Dixon",

    // Belgian-style
    "Dimitri Hermans", "Kim Goossens", "Mike Peeters", "Wesley Maes", "Kevin Janssens",

    // Additional variety
    "Barry \"The Gladiator\" Myers", "Tony \"The Warrior\" Pope", "Ian \"The Champion\" Steele",
    "Chris \"The Iceman\" Lynch", "Rob \"The Flying\" Tucker", "Mick \"The Bull\" Reeves",
    "Stuart \"The Prince\" Carr", "Graham \"The Duke\" Pearce", "Neil \"The Count\" Holland",

    // More first + last
    "Jason Nicholson", "Lee Hancock", "Craig Dawson", "Nick Fitzgerald", "Tom O'Connor",
    "Ben Gallagher", "Sam Brennan", "Luke Murphy", "Ryan McCarthy", "Josh O'Brien",
    "Bradley Kennedy", "Cameron Walsh", "Keane Doyle", "Nathan Quinn", "Joe Fitzgerald",
    "Devon Kavanagh", "Damon Lynch", "Callan Burke", "Josh Murray", "Luke Byrne",

    // International flair
    "Benito Santos", "Vincent DeLuca", "Danny Romano", "Fallon Sherrock-style", "Mensur Suljovic-style",

    // More nicknames inline
    "Phil \"The Legend\" Armstrong", "Gary \"The Natural\" Cunningham", "James \"The Magician\" Elliott",
    "Michael \"The Assassin\" Fitzgerald", "Peter \"The Sensation\" Gordon", "John \"The Asset\" Harrison",
    "Wayne \"The Gentle\" Irving", "Adrian \"The Artist\" Jenkins", "Steve \"Cool Hand\" Kelly",
    "Keith \"The Silverback\" Lambert",

    // Final batch of variety
    "Martin \"The Titan\" Mitchell", "Raymond \"The Giant\" Newman", "Dennis \"The Cannon\" Oliver",
    "Eric \"Heavy\" Palmer", "Kevin \"Lightning\" Quinn", "Terry \"Golden\" Roberts",
    "Dave \"Diamond\" Stevens", "Colin \"Iron\" Turner", "Andrew \"Steel\" Underwood",
    "Simon \"Bronze\" Vincent", "Glen \"Silver\" Watson", "Darren \"Platinum\" Xavier",

    // Animal nicknames
    "Dean \"The Viper\" Young", "Mark \"The Wolf\" Abbott", "Paul \"The Lion\" Bailey",
    "Barry \"The Bear\" Carson", "Tony \"The Shark\" Davidson", "Ian \"The Eagle\" Edwards",
    "Chris \"The Falcon\" Fisher", "Rob \"The Panther\" Gibson", "Mick \"The Scorpion\" Harris",
    "Stuart \"The Dragon\" Ingram", "Graham \"The Phantom\" Johnson"
];

/**
 * Gets a random name from the static list that hasn't been used
 * Falls back to generating a new name if all static names are used
 */
export function getRandomBotName(usedNames: string[] = []): string {
    const usedSet = new Set(usedNames.map(n => n.toLowerCase()));

    // Shuffle and find an unused name from static list
    const shuffled = [...STATIC_BOT_NAMES].sort(() => Math.random() - 0.5);

    for (const name of shuffled) {
        if (!usedSet.has(name.toLowerCase())) {
            return name;
        }
    }

    // All static names used, generate a new one
    return generateBotName(usedNames);
}

/**
 * Gets multiple unique bot names
 */
export function getMultipleBotNames(count: number, existingNames: string[] = []): string[] {
    const names: string[] = [];
    const usedNames = [...existingNames];

    for (let i = 0; i < count; i++) {
        const name = getRandomBotName(usedNames);
        names.push(name);
        usedNames.push(name);
    }

    return names;
}
