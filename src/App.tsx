import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'

// Layouts
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AuthGuard } from '@/components/layout/AuthGuard'

// Admin Pages
import { Dashboard } from '@/pages/admin/Dashboard'
import { Stock } from '@/pages/admin/Stock'
import { ProductForm } from '@/pages/admin/ProductForm'
import { Sales } from '@/pages/admin/Sales'
import { NewSale } from '@/pages/admin/NewSale'
import { Financial } from '@/pages/admin/Financial'
import { Reports } from '@/pages/admin/Reports'
import { Settings } from '@/pages/admin/Settings'

// Public Pages
import { Catalog } from '@/pages/public/Catalog'
import { Cart } from '@/pages/public/Cart'
import { Checkout } from '@/pages/public/Checkout'

// Auth Pages
import { Login } from '@/pages/Login'

function App() {
  const initialize = useAuthStore(state => state.initialize)
  const fetchSettings = useSettingsStore(state => state.fetchSettings)

  useEffect(() => {
    initialize()
    fetchSettings()
  }, [initialize, fetchSettings])

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AuthGuard requireAdmin>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="estoque" element={<Stock />} />
          <Route path="estoque/novo" element={<ProductForm />} />
          <Route path="estoque/editar/:id" element={<ProductForm />} />
          <Route path="vendas" element={<Sales />} />
          <Route path="vendas/nova" element={<NewSale />} />
          <Route path="financeiro" element={<Financial />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="configuracoes" element={<Settings />} />
        </Route>

        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Catalog />} />
          <Route path="carrinho" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
