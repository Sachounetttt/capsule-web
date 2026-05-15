import BottomNav from '@/components/nav/BottomNav'
import ProfileAvatar from '@/components/nav/ProfileAvatar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <ProfileAvatar />
      {children}
      <BottomNav />
    </div>
  )
}
