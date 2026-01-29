import { Outlet } from 'react-router'
import Navbar from '~/components/navbar/navbar'
import { FrankDocProvider } from '~/providers/frankdoc-provider'

export default function AppLayout() {
  return (
    <FrankDocProvider>
      <div className="flex h-screen">
        <Navbar />
        <main className="grow overflow-auto">
          <Outlet />
        </main>
      </div>
    </FrankDocProvider>
  )
}
