---
name: Manage Translations
description: Automates the process of adding and managing translations across multiple locale files (en.json, sv.json).
---

# Manage Translations

This skill helps you keep all 8 locale files in sync by providing a script to add keys to all files simultaneously.

## Usage

To add a new translation key for all languages, run the following command from the project root:

```bash
node .agent/skills/manage-translations/scripts/add_translation.js <key> '<json_object>'
```

### Examples

#### Add a key for all 8 languages (Recommended)

```bash
node .agent/skills/manage-translations/scripts/add_translation.js common.welcome '{"en": "Welcome", "sv": "Välkommen", "da": "Velkommen", "de": "Willkommen", "es": "Bienvenido", "fr": "Bienvenue", "nl": "Welkom", "no": "Velkommen"}'
```

#### Legacy/Partial (Only updates en.json and sv.json)

```bash
node .agent/skills/manage-translations/scripts/add_translation.js common.welcome "Welcome" "Välkommen"
```

## Supported Locales

- English (`en.json`)
- Swedish (`sv.json`)
- Danish (`da.json`)
- German (`de.json`)
- Spanish (`es.json`)
- French (`fr.json`)
- Dutch (`nl.json`)
- Norwegian (`no.json`)

## Best Practices

- **Use meaningful keys**: Keys should be descriptive and follow the existing naming convention (e.g., `component.element.action`).
- **Check for existing keys**: Before adding a new key, search locale files to see if a similar key already exists.
- **Keep it organized**: The script automatically sorts keys alphabetically to maintain a clean structure.
- **Update Legal Pages**: If you add keys for new data collection or significant features, remember to update `src/pages/Legal.tsx` as noted in `AGENTS.md`.
