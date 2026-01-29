import Navbar from '~/components/navbar/navbar'
import { FrankDocProvider } from '~/providers/frankdoc-provider'
import AppContent from '~/components/app-content'

export default function AppLayout() {
  return (
    <FrankDocProvider>
      <div className="flex h-screen">
        <Navbar />
        <main className="grow overflow-auto">
          <AppContent />
        </main>
      </div>
    </FrankDocProvider>
  )
}
