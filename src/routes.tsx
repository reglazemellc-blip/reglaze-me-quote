import { createBrowserRouter } from 'react-router-dom'
import Dashboard from '@pages/Dashboard'
import Clients from '@pages/Clients'
import ClientDetail from '@pages/ClientDetail'
import QuoteEditor from '@pages/QuoteEditor'
import Catalog from '@pages/Catalog'
import SettingsPage from '@pages/SettingsPage'

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/clients', element: <Clients /> },
  { path: '/clients/:id', element: <ClientDetail /> },
  { path: '/quotes/new', element: <QuoteEditor mode="create" /> },
  { path: '/quotes/:id', element: <QuoteEditor mode="edit" /> },
  { path: '/catalog', element: <Catalog /> },
  { path: '/settings', element: <SettingsPage /> },
])

