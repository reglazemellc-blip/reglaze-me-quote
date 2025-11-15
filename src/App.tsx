import { Link, Route, Routes, useLocation } from "react-router-dom"

import Dashboard from "@pages/Dashboard"
import Clients from "@pages/Clients"
import ClientDetail from "@pages/ClientDetail"

import QuotesBoard from "@pages/QuotesBoard"
import QuoteDetail from "@pages/QuoteDetail"
import QuoteEditor from "@pages/QuoteEditor"

import Catalog from "@pages/Catalog"
import SettingsPage from "@pages/SettingsPage"

import Header from "@components/Header"
import OfflineToast from "@components/OfflineToast"
import GoldToast from "@components/GoldToast"

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-full bg-background page-enter">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes location={location}>

          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Clients */}
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />

          {/* Quotes */}
          <Route path="/quotes" element={<QuotesBoard />} />
          <Route path="/quotes/new" element={<QuoteEditor mode="create" />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/quotes/:id/edit" element={<QuoteEditor mode="edit" />} />

          {/* Catalog + Settings */}
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <OfflineToast />
      <GoldToast />

      <footer className="text-center text-xs text-gray-500 py-6">
        Copyright ReGlaze Me LLC
      </footer>
    </div>
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
