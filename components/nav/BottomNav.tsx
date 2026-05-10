'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, BookOpen, Plus, X, Clapperboard, Tv, Gamepad2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MediaType } from '@/lib/types'

const tabs = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/library', icon: BookOpen, label: 'Bibliothèque' },
]

const mediaTypes: { type: MediaType; label: string; icon: React.ElementType }[] = [
  { type: 'movie', label: 'Film', icon: Clapperboard },
  { type: 'tvshow', label: 'Série', icon: Tv },
  { type: 'game', label: 'Jeu', icon: Gamepad2 },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSelect(type: MediaType) {
    setOpen(false)
    router.push(`/add?type=${type}`)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-3 pb-2">
            {[...mediaTypes].reverse().map((item, i) => (
              <motion.button
                key={item.type}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{
                  delay: (mediaTypes.length - 1 - i) * 0.05,
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
                onClick={() => handleSelect(item.type)}
                className="flex items-center gap-3 px-5 py-2.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                }}
              >
                <item.icon size={16} />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 glass border-t"
        style={{ borderColor: 'rgba(255,255,255,0.1)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
          {tabs.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center gap-1 px-6"
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 rounded-full"
                    style={{ height: 2, background: 'var(--color-purple)' }}
                  />
                )}
                <tab.icon
                  size={22}
                  style={{ color: active ? 'var(--color-purple)' : 'rgba(255,255,255,0.4)' }}
                />
                <span
                  className="text-xs"
                  style={{ color: active ? 'var(--color-purple)' : 'rgba(255,255,255,0.4)' }}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setOpen(o => !o)}
            className="flex flex-col items-center gap-1"
            aria-label={open ? 'Fermer' : 'Ajouter un média'}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200"
              style={open
                ? { background: 'white', boxShadow: '0 4px 20px rgba(255,255,255,0.15)' }
                : { background: 'var(--color-purple)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }
              }
            >
              {open
                ? <X size={22} color="black" />
                : <Plus size={24} color="white" />
              }
            </div>
          </button>
        </div>
      </nav>
    </>
  )
}
