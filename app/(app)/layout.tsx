import BottomNav from '@/components/nav/BottomNav'
import ProfileAvatar from '@/components/nav/ProfileAvatar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ paddingBottom: '6rem' }}>
      <ProfileAvatar />
      {children}
      <BottomNav />
    </div>
  )
}
