import { NextRequest, NextResponse } from 'next/server'
import { extractDominantColor } from '@/lib/color'

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url manquante' }, { status: 400 })

  const color = await extractDominantColor(url)
  if (!color) return NextResponse.json({ error: 'extraction échouée' }, { status: 500 })
  return NextResponse.json({ color })
}
