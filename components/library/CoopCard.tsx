'use client'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import StatusBadge from '@/components/ui/StatusBadge'
import type { MediaStatus, UserProfile } from '@/lib/types'

interface CoopCapsuleSummary {
  id: string
  title: string
  poster_url?: string
  my_status: MediaStatus
  members: { user_id: string; profile: UserProfile | null }[]
}

interface Props {
  item: CoopCapsuleSummary
  index: number
}

export default function CoopCard({ item, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Link href={`/shared/${item.id}`} className="glass rounded-[20px] flex gap-3 p-3 block">
        <div
          className="rounded-[10px] overflow-hidden relative flex-shrink-0"
          style={{ width: 112, height: 63, background: 'rgba(255,255,255,0.05)' }}
        >
          {item.poster_url ? (
            <Image src={item.poster_url} alt={item.title} fill className="object-cover" unoptimized />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg font-bold"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {item.title[0]}
            </div>
          )}
          <div className="absolute bottom-1 right-1 flex">
            {item.members.slice(0, 2).map((m, i) => (
              m.profile?.avatar_url ? (
                <Image
                  key={m.user_id}
                  src={m.profile.avatar_url}
                  alt={m.profile.display_name}
                  width={16}
                  height={16}
                  className="rounded-full border border-black"
                  style={{ marginLeft: i > 0 ? -4 : 0 }}
                />
              ) : (
                <div
                  key={m.user_id}
                  className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] font-bold"
                  style={{
                    background: 'rgba(139,92,246,0.8)',
                    marginLeft: i > 0 ? -4 : 0,
                  }}
                >
                  {m.profile?.display_name?.[0] ?? '?'}
                </div>
              )
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 py-1">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Jeu · Co-op
          </p>
          <h3 className="font-semibold text-sm leading-tight mb-2 truncate">{item.title}</h3>
          <StatusBadge status={item.my_status} />
        </div>
      </Link>
    </motion.div>
  )
}
