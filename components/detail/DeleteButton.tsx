'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteButton({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/media/${itemId}`, { method: 'DELETE' })
    router.push('/library')
  }

  if (confirm) {
    return (
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setConfirm(false)}
          className="flex-1 py-3 rounded-[12px] text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
        >
          Annuler
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 py-3 rounded-[12px] text-sm font-medium"
          style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)', color: '#F87171' }}
        >
          {loading ? '...' : 'Confirmer'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full py-3 rounded-[12px] text-sm font-medium flex items-center justify-center gap-2 mb-4"
      style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}
    >
      <Trash2 size={16} />
      Supprimer
    </button>
  )
}
