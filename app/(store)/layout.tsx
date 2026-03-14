import StoreHeader from '@/components/store/StoreHeader'
import Footer from '@/components/Footer'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
