# Somehow I Managed — book site

A static, pre-rendered site. No framework and nothing to install.

## Change words or links (no code)

- **content.json**: every word on the landing page, plus links (LinkedIn, Attenda), the quiz, the sign-up text and the audio list. Leave a link as `""` to hide its button.
- **book.json**: the full book. Edit any paragraph. `fieldNotes` show as callouts at the end of a chapter. A `pullQuotes` line shows large if it matches a paragraph exactly.
- **public/**: files copied as-is (og.png share image, favicon, headers). Put an author photo here (for example `public/alejandro.jpg`) and set `"photo": "/alejandro.jpg"` in content.json.

Then rebuild: `node build.mjs`

## Deploy (Netlify CLI)

Preview, from this folder:

```
node build.mjs && sh scripts/pull-legacy-assets.sh && npx netlify-cli deploy --dir=dist --site f15e1529-5684-4f0b-a5dd-8dd015f2ed97 --alias book-v2
```

Production is the same command with `--prod` in place of `--alias book-v2`.

`pull-legacy-assets.sh` copies the chapter audio, podcast cover and podcast feed from the current live deploy so the Listen buttons and podcast subscribers keep working.

## Sign-ups

Both forms use Netlify Forms (`readers-list` and `quiz-results`). In Netlify, turn on form detection once (Site configuration > Forms), then redeploy. Sign-ups appear under Forms; you can add an email notification or connect them to your email tool there.
