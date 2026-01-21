---
name: Manage Translations
description: Automates the process of adding and managing translations across multiple locale files (en.json, sv.json).
---

# Manage Translations

This skill helps you keep `en.json` and `sv.json` in sync by providing a script to add keys to both files simultaneously.

## Usage

To add a new translation key, run the following command from the project root:

```bash
node .agent/skills/manage-translations/scripts/add_translation.js <key> "<english_text>" "<swedish_text>"
```

### Examples

#### Add a simple key
```bash
node .agent/skills/manage-translations/scripts/add_translation.js common.welcome "Welcome" "Välkommen"
```

#### Add a nested key
```bash
node .agent/skills/manage-translations/scripts/add_translation.js auth.login.title "Login to your account" "Logga in på ditt konto"
```

## Best Practices
- **Use meaningful keys**: Keys should be descriptive and follow the existing naming convention (e.g., `component.element.action`).
- **Check for existing keys**: Before adding a new key, search `en.json` or `sv.json` to see if a similar key already exists.
- **Keep it organized**: The script automatically sorts keys alphabetically to maintain a clean structure.
- **Update Legal Pages**: If you add keys for new data collection or significant features, remember to update `src/pages/Legal.tsx` as noted in `AGENTS.md`.
