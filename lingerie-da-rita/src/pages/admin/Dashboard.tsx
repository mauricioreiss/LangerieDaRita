import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign, AlertCircle, Plus, ShoppingBag,
  TrendingUp, TrendingDown, Clock, MessageCircle, Share2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateShort, generateWhatsAppLink } from '@/lib/formatters'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { showToast } from '@/components/ui/Toast'
import type { Installment, Customer, Sale } from '@/types/database'

interface PendingInstallment extends Installment {
  sale: Sale & { customer: Customer }
}

interface DashboardStats {
  totalReceivable: number
  totalReceivedMonth: number
  totalExpensesMonth: number
  profitMonth: number
}

export function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalReceivable: 0,
    totalReceivedMonth: 0,
    totalExpensesMonth: 0,
    profitMonth: 0,
  })
  const [upcomingInstallments, setUpcomingInstallments] = useState<PendingInstallment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      // Total a receber (parcelas pendentes)
      const { data: pendingInstallments } = await supabase
        .from('installments')
        .select('amount')
        .eq('is_paid', false)

      const totalReceivable = pendingInstallments?.reduce((sum, i) => sum + i.amount, 0) || 0

      // Total recebido no mês
      const { data: paidInstallments } = await supabase
        .from('installments')
        .select('amount')
        .eq('is_paid', true)
        .gte('paid_date', startOfMonth)
        .lte('paid_date', endOfMonth)

      const totalReceivedMonth = paidInstallments?.reduce((sum, i) => sum + i.amount, 0) || 0

      // Despesas do mês
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)

      const totalExpensesMonth = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

      // Custo dos produtos vendidos no mês
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('cost_price, quantity, sale_id')

      // Get sales from this month
      const { data: monthSales } = await supabase
        .from('sales')
        .select('id')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      const monthSaleIds = new Set(monthSales?.map(s => s.id) || [])
      const totalCostMonth = saleItems
        ?.filter(si => monthSaleIds.has(si.sale_id))
        .reduce((sum, si) => sum + si.cost_price * si.quantity, 0) || 0

      const profitMonth = totalReceivedMonth - totalCostMonth - totalExpensesMonth

      setStats({ totalReceivable, totalReceivedMonth, totalExpensesMonth, profitMonth })

      // Parcelas próximas (hoje + 3 dias)
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      const { data: upcoming } = await supabase
        .from('installments')
        .select(`
          *,
          sale:sales(*, customer:customers(*))
        `)
        .eq('is_paid', false)
        .lte('due_date', threeDaysFromNow.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(10)

      setUpcomingInstallments((upcoming as unknown as PendingInstallment[]) || [])
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSendReminder(installment: PendingInstallment) {
    const customer = installment.sale?.customer
    if (!customer?.phone) return

    const message = `Olá ${customer.name}! 😊\n\nPassando para lembrar da parcela ${installment.installment_number} no valor de ${formatCurrency(installment.amount)}, com vencimento em ${formatDateShort(installment.due_date)}.\n\nQualquer dúvida, estou à disposição!\n\n💕 Lingerie da Rita`

    window.open(generateWhatsAppLink(customer.phone, message), '_blank')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  async function handleShareStore() {
    const shareData = {
      title: 'Lingerie da Rita',
      text: 'Olá! Conheça a Lingerie da Rita 💕 Veja nosso catálogo:',
      url: window.location.origin,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
      showToast('Link copiado!', 'success')
    }
  }

  return (
    <div className="space-y-4">
      {/* Share Store Button */}
      <Button
        onClick={handleShareStore}
        icon={<Share2 className="w-5 h-5" />}
        variant="success"
        className="w-full"
        size="lg"
      >
        Mandar Link da Loja
      </Button>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => navigate('/admin/vendas/nova')}
          icon={<Plus className="w-5 h-5" />}
          className="flex-1"
          size="lg"
        >
          Nova Venda
        </Button>
        <Button
          onClick={() => navigate('/admin/estoque/novo')}
          icon={<ShoppingBag className="w-5 h-5" />}
          variant="secondary"
          className="flex-1"
          size="lg"
        >
          Novo Produto
        </Button>
      </div>

      {/* Stats Cards */}
      <Card className="bg-primary text-white border-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">A Receber</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalReceivable)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <p className="text-xs text-text-light">Recebido (mês)</p>
          </div>
          <p className="text-lg font-bold text-success">{formatCurrency(stats.totalReceivedMonth)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-danger" />
            <p className="text-xs text-text-light">Despesas (mês)</p>
          </div>
          <p className="text-lg font-bold text-danger">{formatCurrency(stats.totalExpensesMonth)}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-light">Lucro Estimado (mês)</p>
            <p className={`text-xl font-bold ${stats.profitMonth >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(stats.profitMonth)}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            stats.profitMonth >= 0 ? 'bg-success/10' : 'bg-danger/10'
          }`}>
            {stats.profitMonth >= 0 ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-danger" />
            )}
          </div>
        </div>
      </Card>

      {/* Upcoming Installments */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5 text-warning" />
          <h2 className="text-base font-bold">Cobranças Próximas</h2>
        </div>

        {upcomingInstallments.length === 0 ? (
          <Card>
            <p className="text-sm text-text-light text-center py-4">
              Nenhuma cobrança nos próximos 3 dias 🎉
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingInstallments.map(installment => {
              const isOverdue = new Date(installment.due_date) < new Date()
              return (
                <Card key={installment.id} className={isOverdue ? 'border-danger/30 bg-danger/5' : ''}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {installment.sale?.customer?.name || 'Cliente'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-text-light" />
                        <span className={`text-xs ${isOverdue ? 'text-danger font-semibold' : 'text-text-light'}`}>
                          {isOverdue ? 'Vencida' : ''} {formatDateShort(installment.due_date)}
                        </span>
                        <span className="text-xs text-text-light">
                          • Parcela {installment.installment_number}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{formatCurrency(installment.amount)}</p>
                      {installment.sale?.customer?.phone && (
                        <button
                          onClick={() => handleSendReminder(installment)}
                          className="p-2 bg-success/10 text-success rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Cobrar via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
