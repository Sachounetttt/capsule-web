'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Download, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsSheet() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleExport() {
    const a = document.createElement('a')
    a.href = '/api/export'
    a.download = ''
    a.click()
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.replace('/login')
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="glass rounded-full flex items-center justify-center"
        style={{ width: 36, height: 36 }}
      >
        <Settings size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 glass z-50"
              style={{ borderRadius: '28px 28px 0 0', padding: '24px 24px 48px' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Réglages</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="glass rounded-full flex items-center justify-center"
                  style={{ width: 32, height: 32 }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleExport}
                  className="glass rounded-[12px] px-4 py-3 flex items-center gap-3 text-sm font-medium"
                >
                  <Download size={18} style={{ color: 'var(--color-purple)' }} />
                  Exporter en JSON
                </button>

                <button
                  onClick={handleLogout}
                  className="glass rounded-[12px] px-4 py-3 flex items-center gap-3 text-sm font-medium"
                  style={{ color: '#F87171' }}
                >
                  <LogOut size={18} />
                  Se déconnecter
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
