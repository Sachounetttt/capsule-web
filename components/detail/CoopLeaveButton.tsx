'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface Props {
  capsuleId: string
}

export default function CoopLeaveButton({ capsuleId }: Props) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLeave() {
    setLoading(true)
    await fetch(`/api/shared-capsules/${capsuleId}/leave`, { method: 'DELETE' })
    router.push('/library')
  }

  if (confirm) {
    return (
      <div className="glass rounded-[16px] p-4 mb-3">
        <p className="text-sm text-center mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Retirer cette capsule de ta bibliothèque ?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleLeave}
            disabled={loading}
            className="flex-1 py-2 rounded-[10px] text-sm font-medium disabled:opacity-50"
            style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)', color: '#F87171' }}
          >
            Confirmer
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="flex-1 py-2 rounded-[10px] text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-3"
      style={{ color: 'rgba(248,113,113,0.8)' }}
    >
      <Trash2 size={16} />
      Retirer de ma bibliothèque
    </button>
  )
}
