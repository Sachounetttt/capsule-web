import sharp from 'sharp'

export function hexFromRgb(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())

    const { data } = await sharp(buffer)
      .resize(1, 1, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    return hexFromRgb(data[0], data[1], data[2])
  } catch {
    return null
  }
}
