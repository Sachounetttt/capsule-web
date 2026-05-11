'use client'
import { motion, AnimatePresence } from 'framer-motion'
import type { MediaStatus } from '@/lib/types'

const labels: Record<MediaStatus, string> = {
  completed: 'Terminé',
  inProgress: 'En cours',
  dropped: 'Abandonné',
  abandoned: 'Dropped',
}

const colors: Record<MediaStatus, string> = {
  completed: '#4ADE80',
  inProgress: '#A78BFA',
  dropped: '#F87171',
  abandoned: '#6B7280',
}

export default function StatusBadge({ status }: { status: MediaStatus }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
        style={{
          background: `${colors[status]}20`,
          color: colors[status],
          border: `1px solid ${colors[status]}40`,
        }}
      >
        {labels[status]}
      </motion.span>
    </AnimatePresence>
  )
}
