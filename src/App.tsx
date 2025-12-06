import { Link, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Dashboard from "@pages/Dashboard";
import QuotePrint from "@pages/QuotePrint";

import Clients from "@pages/Clients";
import ClientDetail from "@pages/ClientDetail";
import ClientNew from "@pages/ClientNew";

import QuotesBoard from "@pages/QuotesBoard";
import QuoteDetail from "@pages/QuoteDetail";
import QuoteEditor from "@pages/QuoteEditor";

import Catalog from "@pages/Catalog";
import SettingsPage from "@pages/SettingsPage";
import InvoicesPage from "@pages/InvoicesPage";
import InvoiceDetail from "@pages/InvoiceDetail";
import ContractsPage from "@pages/ContractsPage";
import ContractDetail from "@pages/ContractDetail";

import ServicesList from "@pages/services/ServicesList";
import ServiceForm from "@pages/services/ServiceForm";

import RemindersPage from "@pages/RemindersPage";
import TestUI from "@pages/TestUI";

import Header from "@components/Header";
import OfflineToast from "@components/OfflineToast";
import GoldToast from "@components/GoldToast";

import { useConfigStore } from "@store/useConfigStore";

export default function App() {
  const location = useLocation();
  const { init: initConfig, loading: configLoading, config } = useConfigStore();

  // Initialize config on app mount
  useEffect(() => {
    initConfig();
  }, [initConfig]);

  // Show loading state while config initializes
  if (configLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-[var(--color-primary)] text-lg">Loading...</div>
      </div>
    );
  }

  return (
  <>
    {/* Header stays global, above page transitions */}
    <Header />

   

    {/* Page transition wrapper */}
    <div className="min-h-full bg-background page-enter">
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes location={location}>
  {/* Dashboard */}
  <Route path="/" element={<Dashboard />} />

  {/* Clients */}
  <Route path="/clients" element={<Clients />} />
  <Route path="/clients/new" element={<ClientNew />} />
  <Route path="/clients/:id" element={<ClientDetail />} />

  {/* Quotes */}
<Route path="/quotes" element={<QuotesBoard />} />
<Route path="/quotes/new" element={<QuoteEditor mode="create" />} />
<Route path="/quotes/:id" element={<QuoteDetail />} />
<Route path="/quotes/:id/edit" element={<QuoteEditor />} />


  {/* Invoices */}
  <Route path="/invoices" element={<InvoicesPage />} />
  <Route path="/invoices/:id" element={<InvoiceDetail />} />

  {/* Contracts */}
  <Route path="/contracts" element={<ContractsPage />} />
  <Route path="/contracts/:id" element={<ContractDetail />} />

  {/* Services / Catalog */}
  <Route path="/services" element={<ServicesList />} />
  <Route path="/services/new" element={<ServiceForm />} />
  <Route path="/services/:id" element={<ServiceForm />} />

  {/* Settings */}
<Route path="/settings" element={<SettingsPage />} />


  {/* Catalog */}
  <Route path="/catalog" element={<Catalog />} />

  {/* Reminders */}
  <Route path="/reminders" element={<RemindersPage />} />

  {/* PDF View */}
  <Route path="/print" element={<QuotePrint />} />

  {/* Test UI */}
  <Route path="/test" element={<TestUI />} />

  {/* Not Found */}
  <Route path="*" element={<NotFound />} />
</Routes>

      </main>
    </div>
  </>
);

}

function NotFound() {
  return (
    <div className="card p-8 text-center">
      <p className="text-gray-300">Page not found.</p>
      <Link to="/" className="btn-outline-gold mt-4 px-4 py-2 inline-block">
        Go Home
      </Link>
    </div>
  );
}
