'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '@/components/ui/GlassCard'

interface Props {
  label: string
  value: number
  icon: React.ReactNode
}

export default function StatCard({ label, value, icon }: Props) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 800
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      setDisplayed(Math.round(progress * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])

  return (
    <GlassCard className="flex flex-col gap-2 p-4 flex-1">
      <div style={{ color: 'rgba(255,255,255,0.4)' }}>{icon}</div>
      <motion.span
        className="text-3xl font-bold tracking-tight"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {displayed}
      </motion.span>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
    </GlassCard>
  )
}
