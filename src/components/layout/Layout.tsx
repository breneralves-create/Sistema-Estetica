import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-screen bg-base">
      <Sidebar />
      <div className="flex flex-1 flex-col w-full md:pl-[240px] transition-all">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
