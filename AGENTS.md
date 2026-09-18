# Notes for assistants

This is the only assistant-facing notes file in the repository. Do not add a
tool-specific notes file or directory beside it.

## What this is

A single static page presenting four sibling repositories as STAR/FLEET. No
build step, no framework, no package manager: `index.html`, `style.css`,
`fleet.js`, one vendored font and a few images, deployed by
`.github/workflows/pages.yml` to GitHub Pages.

## Rules the page lives by

- Eighty columns. `.screen` is `calc(var(--cw) * 80)` wide; every `<pre>`
  line fits in it. Mock screens (`pre.mock`) are exactly thirty-eight wide,
  frame included. Check with a script that strips tags and measures lines
  before committing art.
- CP437 only, in art and prose alike. `·` (U+00B7), `»`, `≡`, `░▒▓█`, the
  single and double box set and `▌` are in; `›`, `—`, `…`, `©` and curly
  quotes are not, and any of them puts a fallback glyph into the VGA font.
- Sixteen colours. `.c0`..`.c15` / `.b0`..`.b15` spans; the CGA hex values
  are in `:root`. The only colours outside the palette are inside the app
  icons in `img/`.
- Cell units, not `ch`. Chrome computes `ch` as 15.9998px at the 2x size and
  a centred column then starts on a fraction of a pixel. `--cw` is half a
  `rem`, and `.screen` snaps its left margin with `round()` where supported.
- The font is 16px; the footer's `[ 2x ]` switch makes it 32px, never anything
  in between.
- Display names in prose are STAR/AMP, STAR/CORD, STAR/FOLD, STAR/KIT and
  STAR/FLEET; repositories, binaries and URLs are lowercase.
- No Star Trek: no quotes, no arrowhead, no "boldly". The name is a pun on
  the family name and stays its own thing.
- Plain prose, British spelling where the siblings use it ("licence",
  "colour", "civilised"), no emoji, no superlatives. The disclaimers in the
  STAR/AMP and STAR/CORD blocks are quoted from those READMEs and stay.

## The data

`fleet.js` fills `[data-repo][data-field]` slots. Per repository it calls
`/releases/latest` (404 today; remembered for a day), `/tags` (newest by
semver), the repository itself (`pushed_at`) and the `ci.yml` runs on
`main`. Sixteen requests on a cold load, none within the hour after. The
unauthenticated limit is sixty an hour per address; never add a token. When
the API says no, the static text in the HTML stands, so keep that text true
when you edit the page: the roster, each block's status lines, and the "as
of" date under the roster.

CI on the sibling repositories has so far only run on dependabot branches,
so the CI column reads `[ -- ]` (no run on `main`) rather than a verdict.

## Commits

Present tense, plain prose, no conventional-commits prefix, no trailers of
any kind.
