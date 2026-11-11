// Génère les icônes PNG de la PWA à partir de public/icon.svg (utilise Playwright/Chromium).
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { readFileSync } from 'node:fs'
const svg = readFileSync('public/icon.svg', 'utf8')
const targets = [
  ['icon-192.png', 192, 1], ['icon-512.png', 512, 1],
  ['apple-touch-icon.png', 180, 1], ['icon-maskable-512.png', 512, 0.8],
]
const browser = await chromium.launch()
for (const [file, size, scale] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  const inner = Math.round(size * scale), off = Math.round((size - inner) / 2)
  await page.setContent(`<body style="margin:0;background:#B84A25"><div style="position:absolute;left:${off}px;top:${off}px;width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`)
  await page.screenshot({ path: `public/${file}` })
  await page.close()
}
await browser.close()
