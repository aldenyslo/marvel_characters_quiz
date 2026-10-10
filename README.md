# Marvel Character Quiz

A React + TypeScript quiz that reads its character archive from `public/data/marvel-characters.json`. The archive is not fetched automatically; use the importer when you are ready.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Setup

1. Add your Comic Vine API key to `.env` as `COMICVINE_API_KEY=your_key`.
2. Run `npm run fetch:characters` to fetch characters published by Marvel Comics. The script resolves the publisher ID, follows Comic Vine's 100-result pagination, and writes the raw archive to `data/raw/marvel-characters.json`.
3. Run `npm run parse:characters` to build the quiz archive at `public/data/marvel-characters.json`.
4. Run `npm run dev` to start the quiz.

The API key is only read by the Node.js import script and is never included in the browser bundle. Keep `.env` private. See the [Comic Vine API documentation](https://comicvine.gamespot.com/api/documentation) for endpoint and usage details.

## Character aliases

To accept extra answers for a character, add an entry to the `characterAliases` map in `scripts/parse-marvel-characters.mjs`:

```js
const characterAliases = new Map([
  ["Spider-Man", ["Friendly Neighborhood Spider-Man", "Spidey"]],
])
```

Aliases are matched with the same name normalization as character names. Running `npm run parse:characters` writes the configured aliases to the public archive; `npm run fetch:characters` only updates the raw archive.

## Commands

- `npm run dev`: start the development server.
- `npm run build`: type-check and build for production.
- `npm run lint`: lint the project.
- `npm run fetch:characters`: replace the raw archive with Comic Vine data.
- `npm run parse:characters`: build the quiz archive from the raw archive.

## Deploying to Netlify

The repository includes a Netlify configuration. In Netlify, create a new site
by importing this Git repository; Netlify will run `npm run build` and publish
the `dist` directory. The configuration also routes unmatched paths to the
single-page app.

The deployed quiz uses the character archive committed under `public/data`, so
the Comic Vine API key is not needed to build or deploy the site. Keep the key
in your local `.env` file only when refreshing the archive.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
