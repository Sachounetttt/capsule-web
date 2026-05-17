'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import type { MediaStatus } from '@/lib/types'

interface Props {
  capsuleId: string
  currentStatus: MediaStatus
}

export default function CoopStatusActions({ capsuleId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function updateStatus(newStatus: MediaStatus) {
    setLoading(true)
    await fetch(`/api/shared-capsules/${capsuleId}/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setStatus(newStatus)
    setLoading(false)
    router.refresh()
  }

  if (status === 'completed') {
    return (
      <div
        className="glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-3"
        style={{ color: '#4ADE80' }}
      >
        <CheckCircle size={16} />
        Terminé
      </div>
    )
  }

  if (status === 'dropped' || status === 'abandoned') {
    return (
      <div
        className="glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-3"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <XCircle size={16} />
        Abandonné
      </div>
    )
  }

  return (
    <div className="flex gap-2 mb-3">
      <button
        onClick={() => updateStatus('completed')}
        disabled={loading}
        className="flex-1 glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
        style={{ color: '#4ADE80' }}
      >
        <CheckCircle size={16} />
        J&apos;ai terminé
      </button>
      <button
        onClick={() => updateStatus('dropped')}
        disabled={loading}
        className="glass rounded-[16px] py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <XCircle size={16} />
        Abandonner
      </button>
    </div>
  )
}
