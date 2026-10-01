# Agost's Blog

[![Netlify Status](https://api.netlify.com/api/v1/badges/dff118e6-5e1c-4fa8-b77c-3dca271c89a2/deploy-status)](https://app.netlify.com/projects/agost-site/deploys)

A personal blog built with [Hugo](https://gohugo.io/) using the [nostyleplease](https://github.com/hanwenguo/hugo-theme-nostyleplease) theme.

## Development

### Prerequisites

- Hugo Extended v0.139.4 or later

### Local Development

```bash
hugo server
```

The site will be available at http://localhost:1313/

### Building

```bash
hugo --gc --minify
```

The built site will be in the `public/` directory.

## Math

Posts can use LaTeX with `$...$` and `$$...$$`. Hugo renders it to HTML and MathML
at build time with KaTeX, so no JavaScript runs in the browser. The pieces:

- `hugo.toml` enables goldmark's passthrough extension and defines the delimiters.
  Passthrough is what stops markdown from eating backslash escapes such as `\\`,
  `\{` and `\,` before KaTeX sees them.
- `layouts/_markup/render-passthrough.html` calls `transform.ToMath`. Invalid TeX
  fails the build.
- `static/katex/` holds the stylesheet and fonts, vendored so the site makes no
  third party requests. See below.

One caveat: inside a blockquote, keep a `$$...$$` block on a single line. Spanning
several lines pulls the `>` markers into the formula.

### Updating the vendored KaTeX

`static/katex/katex.min.css` and `static/katex/fonts/` are copied verbatim from the
[KaTeX npm package](https://www.npmjs.com/package/katex), currently **0.16.47**.
Only the `.woff2` fonts are kept — the stylesheet lists `woff2` first in every
`@font-face`, so browsers never request the `woff` or `ttf` variants.

Pick a version matching the KaTeX that Hugo embeds, or the stylesheet and the
generated markup can drift apart. Hugo pins it in `internal/warpc/js/package.json`
in its own repo; `v0.164.0` asks for `^0.16.21`, so any `0.16.x` will do.

```bash
npm pack katex@0.16.47
tar xzf katex-0.16.47.tgz
cp package/dist/katex.min.css static/katex/
cp package/dist/fonts/*.woff2 static/katex/fonts/
```

## License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png" /></a><br />Blog content is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/4.0/">Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License</a>.
