import { useEffect, useState } from 'react'
import { BarChart3, Trophy, AlertTriangle, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatters'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import type { Product } from '@/types/database'

interface TopProduct {
  product: Product
  totalSold: number
  totalRevenue: number
}

interface LowStockProduct {
  product: Product
  avgMonthlySales: number
}

export function Reports() {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([])
  const [totalSalesCount, setTotalSalesCount] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchReportData()
  }, [period])

  async function fetchReportData() {
    setIsLoading(true)

    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - parseInt(period))
    const startDate = daysAgo.toISOString()

    try {
      // Get all products
      const { data: products } = await supabase.from('products').select('*')
      const productMap = new Map(products?.map(p => [p.id, p]))

      // Get sale items in period
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .gte('created_at', startDate)

      const saleIds = sales?.map(s => s.id) || []
      setTotalSalesCount(saleIds.length)

      let saleItems: { product_id: string; quantity: number; unit_price: number }[] = []
      if (saleIds.length > 0) {
        const { data } = await supabase
          .from('sale_items')
          .select('product_id, quantity, unit_price')
          .in('sale_id', saleIds)
        saleItems = data || []
      }

      // Calculate top products
      const productSales = new Map<string, { totalSold: number; totalRevenue: number }>()
      for (const item of saleItems) {
        const existing = productSales.get(item.product_id) || { totalSold: 0, totalRevenue: 0 }
        existing.totalSold += item.quantity
        existing.totalRevenue += item.unit_price * item.quantity
        productSales.set(item.product_id, existing)
      }

      const top = Array.from(productSales.entries())
        .map(([productId, stats]) => ({
          product: productMap.get(productId)!,
          ...stats,
        }))
        .filter(t => t.product)
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5)

      setTopProducts(top)

      // Low stock suggestions
      const daysInPeriod = parseInt(period)
      const lowStockItems = (products || [])
        .map(product => {
          const sales = productSales.get(product.id)
          const totalSold = sales?.totalSold || 0
          const avgMonthlySales = (totalSold / daysInPeriod) * 30
          return { product, avgMonthlySales }
        })
        .filter(item => item.product.stock_quantity <= Math.ceil(item.avgMonthlySales) && item.avgMonthlySales > 0)
        .sort((a, b) => b.avgMonthlySales - a.avgMonthlySales)

      setLowStock(lowStockItems)

      // Total customers
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
      setTotalCustomers(count || 0)
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Relatórios</h2>
      </div>

      <Select
        options={[
          { value: '7', label: 'Últimos 7 dias' },
          { value: '30', label: 'Últimos 30 dias' },
          { value: '90', label: 'Últimos 90 dias' },
          { value: '365', label: 'Último ano' },
        ]}
        value={period}
        onChange={e => setPeriod(e.target.value)}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs text-text-light">Vendas</p>
          </div>
          <p className="text-xl font-bold">{totalSalesCount}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-xs text-text-light">Clientes</p>
          </div>
          <p className="text-xl font-bold">{totalCustomers}</p>
        </Card>
      </div>

      {/* Top Products */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-warning" />
          <h3 className="font-bold">Mais Vendidos</h3>
        </div>
        {topProducts.length === 0 ? (
          <Card>
            <p className="text-sm text-text-light text-center py-4">Sem dados no período</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {topProducts.map((item, index) => (
              <Card key={item.product.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-surface text-text-light'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.product.name}</p>
                    <p className="text-xs text-text-light">{item.totalSold} vendidos</p>
                  </div>
                  <p className="font-bold text-sm text-success">{formatCurrency(item.totalRevenue)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-bold">Sugestão de Reposição</h3>
          </div>
          <div className="space-y-2">
            {lowStock.map(item => (
              <Card key={item.product.id} padding="sm" className="border-warning/30 bg-warning/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{item.product.name}</p>
                    <p className="text-xs text-text-light">
                      Estoque: {item.product.stock_quantity} • Média mensal: {Math.ceil(item.avgMonthlySales)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-1 rounded-lg">
                    Repor
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
