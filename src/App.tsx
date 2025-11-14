import { Link, Route, Routes, useLocation } from "react-router-dom"
import Dashboard from "@pages/Dashboard"
import Clients from "@pages/Clients"
import ClientDetail from "@pages/ClientDetail"
import QuoteEditor from "@pages/QuoteEditor"
import Catalog from "@pages/Catalog"
import SettingsPage from "@pages/SettingsPage"
import QuotesBoard from "@pages/QuotesBoard"
import Header from "@components/Header"
import OfflineToast from "@components/OfflineToast"
import GoldToast from "@components/GoldToast"

// Import your test component
import TestFirestore from './TestFirestore'

export default function App() {
  const location = useLocation()

  return (
    <>
      {/* Firestore test (temporary) */}
      <TestFirestore />

      <div className="min-h-full bg-background page-enter">
        <Header />

        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/quotes" element={<QuotesBoard />} />
            <Route path="/quotes/new" element={<QuoteEditor mode="create" />} />
            <Route path="/quotes/:id" element={<QuoteEditor mode="edit" />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <OfflineToast />
        <GoldToast />

        <footer className="text-center text-xs text-gray-500 py-6">
          Copyright ReGlaze Me LLC
        </footer>
      </div>
    </>
  )
}

function NotFound() {
  return (
    <div className="card p-8 text-center">
      <p className="text-gray-700">Page not found.</p>
      <Link to="/" className="btn btn-outline mt-4">Go Home</Link>
    </div>
  )
}
