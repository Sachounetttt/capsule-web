'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import ShimmerCard from '@/components/ui/ShimmerCard'
import type { SearchResult } from '@/lib/types'

interface Props {
  results: SearchResult[]
  loading: boolean
  onSelect: (result: SearchResult) => void
}

export default function SearchResults({ results, loading, onSelect }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <ShimmerCard key={i} className="h-20" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {results.map((result, i) => (
        <motion.button
          key={`${result.title}-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
          onClick={() => onSelect(result)}
          className="glass rounded-[12px] flex gap-3 p-3 text-left w-full"
        >
          <div
            className="rounded-[8px] overflow-hidden relative shrink-0"
            style={{ width: 48, height: 64, background: 'rgba(255,255,255,0.05)' }}
          >
            {result.poster_url ? (
              <Image
                src={result.poster_url}
                alt={result.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-lg font-bold"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                {result.title[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 py-1">
            <p className="font-medium text-sm truncate">{result.title}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {result.year ?? ''}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
