import sharp from 'sharp'
import { mkdir } from 'fs/promises'

await mkdir('public/icons', { recursive: true })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#7C3AED"/>
  <text x="50" y="68" font-family="system-ui,sans-serif" font-size="52" font-weight="bold" fill="white" text-anchor="middle">C</text>
</svg>`

const buf = Buffer.from(svg)
await sharp(buf).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(buf).resize(512, 512).png().toFile('public/icons/icon-512.png')
console.log('Icons generated')
