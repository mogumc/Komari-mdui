<p align="center">
  <img src="preview.webp" alt="Komari MDUI Preview" width="100%" />
</p>

# Komari MDUI

A clean Material Design 3 theme for [Komari](https://github.com/komari-monitor/komari), built with Vue 3 + Vite + [MDUI](https://www.mdui.org/).

## Features

- Pure white Material Design 3 style
- Real-time server monitoring via RPC2 WebSocket
- Node cards with CPU / Memory / Swap / Disk progress bars (color-coded)
- Instance detail page with SVG charts and ping heatmap
- Theme settings: background image, sort order, online-first

## Theme Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `backgroundImage` | string | `""` | Background image URL, leave empty for plain background |
| `sortBy` | select | `原顺序` | Default sort: `原顺序` / `名字` / `分类` |
| `onlineFirst` | switch | `true` | Show online nodes first |

## Preview

<img src="preview\main.png" alt="Komari MDUI Preview" width="100%" />

<img src="preview\instance.png" alt="Komari MDUI Preview" width="100%" />

## Development

```bash
npm install
npm run dev
```

Vite dev server proxies `/api` to `localhost:8080`.

## Build

```bash
npm run build
```

Output goes to `dist/`, deploy as a Komari managed theme.

## License

MIT
