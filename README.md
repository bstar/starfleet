# STAR/FLEET

One page for the STAR family of terminal applications:
[STAR/AMP](https://github.com/bstar/staramp), a music player;
[STAR/CORD](https://github.com/bstar/starcord), a Discord client;
[STAR/FOLD](https://github.com/bstar/starfold), a file manager; and
[STAR/KIT](https://github.com/bstar/starkit), the foundation crate they share.

It is published at <https://bstar.github.io/starfleet/>.

The page is a static `index.html`, a stylesheet and one small script, drawn
as an eighty-column NFO in the sixteen CGA colours and the IBM VGA font. It
reads each repository's newest tag, CI state and last push from the GitHub
API when it loads, unauthenticated, and keeps an hour's cache in the browser;
with the API out of reach it shows the values that were current when the
page was last edited.

## Running it locally

```sh
python3 -m http.server 8000
```

then open <http://localhost:8000/>. Serve it rather than opening the file:
the font does not load over `file://` in every browser.

## Editing it

- The page is eighty character cells wide. Every `<pre>` must keep each line
  at or under eighty columns, and the mock screens are thirty-eight.
- Everything rendered must be a CP437 character, or the VGA font falls back
  and the columns drift. No curly quotes, em dashes or `©`.
- Colours are the sixteen `--c0`..`--c15` custom properties and nothing else.
- Sizes are multiples of the cell (`--cell`, `--cw`) so the bitmap stays
  crisp; the page doubles to 32px on wide screens and never scales by 1.5.

## Licence

MIT, except the font in `fonts/`, which is CC BY-SA 4.0; see
[fonts/README.md](fonts/README.md).
