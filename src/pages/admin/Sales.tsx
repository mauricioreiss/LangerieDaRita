import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ShoppingBag, CheckCircle, Clock, XCircle, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, generateWhatsAppLink, formatDateShort } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { showToast } from '@/components/ui/Toast'
import type { Sale, Customer, Installment } from '@/types/database'

interface SaleWithDetails extends Sale {
  customer: Customer
  installments: Installment[]
}

const statusConfig = {
  paid: { label: 'Pago', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  partial: { label: 'Parcial', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  pending: { label: 'Pendente', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  cancelled: { label: 'Cancelada', icon: XCircle, color: 'text-danger', bg: 'bg-danger/10' },
}

const paymentLabels: Record<string, string> = {
  pix: 'Pix',
  installment_1x: '1x',
  installment_2x: '2x',
  installment_3x: '3x',
}

export function Sales() {
  const navigate = useNavigate()
  const [sales, setSales] = useState<SaleWithDetails[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null)

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        installments(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Erro ao carregar vendas', 'error')
      return
    }
    setSales((data as unknown as SaleWithDetails[]) || [])
    setIsLoading(false)
  }

  async function handleMarkPaid(installment: Installment) {
    const { error } = await supabase
      .from('installments')
      .update({ is_paid: true, paid_date: new Date().toISOString().split('T')[0] })
      .eq('id', installment.id)

    if (error) {
      showToast('Erro ao marcar como pago', 'error')
      return
    }

    // Check if all installments for this sale are paid
    if (selectedSale) {
      const allPaid = selectedSale.installments.every(
        i => i.id === installment.id || i.is_paid
      )

      await supabase
        .from('sales')
        .update({ status: allPaid ? 'paid' : 'partial' })
        .eq('id', selectedSale.id)
    }

    showToast('Parcela marcada como paga!', 'success')
    fetchSales()
    setSelectedSale(null)
  }

  function handleSendReminder(sale: SaleWithDetails, installment: Installment) {
    if (!sale.customer?.phone) return

    const message = `Olá ${sale.customer.name}! 😊\n\nPassando para lembrar da parcela ${installment.installment_number} no valor de ${formatCurrency(installment.amount)}, com vencimento em ${formatDateShort(installment.due_date)}.\n\nQualquer dúvida, estou à disposição!\n\n💕 Lingerie da Rita`

    window.open(generateWhatsAppLink(sale.customer.phone, message), '_blank')
  }

  const filtered = sales.filter(s =>
    s.customer?.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Vendas</h2>
        <Button
          onClick={() => navigate('/admin/vendas/nova')}
          icon={<Plus className="w-5 h-5" />}
          size="sm"
        >
          Nova Venda
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
        <Input
          placeholder="Buscar por cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12" />}
          title="Nenhuma venda"
          description={search ? 'Nenhum resultado encontrado' : 'Registre sua primeira venda'}
          action={
            !search && (
              <Button onClick={() => navigate('/admin/vendas/nova')} icon={<Plus className="w-5 h-5" />}>
                Nova Venda
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(sale => {
            const status = statusConfig[sale.status]
            const StatusIcon = status.icon
            return (
              <Card
                key={sale.id}
                padding="sm"
                className="cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => setSelectedSale(sale)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{sale.customer?.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-light">{formatDate(sale.created_at)}</span>
                      <span className="text-xs text-text-light">•</span>
                      <span className="text-xs text-text-light">{paymentLabels[sale.payment_method]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <p className="font-bold text-sm">{formatCurrency(sale.total_amount)}</p>
                    <div className={`p-1 rounded-lg ${status.bg}`}>
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Sale Detail Modal */}
      <Modal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title="Detalhes da Venda"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-light">Cliente</p>
              <p className="font-semibold">{selectedSale.customer?.name}</p>
              {selectedSale.customer?.phone && (
                <p className="text-sm text-text-light">{selectedSale.customer.phone}</p>
              )}
            </div>

            <div className="flex justify-between">
              <div>
                <p className="text-sm text-text-light">Total</p>
                <p className="font-bold text-lg">{formatCurrency(selectedSale.total_amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-light">Pagamento</p>
                <p className="font-medium">{paymentLabels[selectedSale.payment_method]}</p>
              </div>
            </div>

            {selectedSale.installments.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text mb-2">Parcelas</p>
                <div className="space-y-2">
                  {selectedSale.installments
                    .sort((a, b) => a.installment_number - b.installment_number)
                    .map(installment => (
                    <div
                      key={installment.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        installment.is_paid ? 'bg-success/5 border-success/20' : 'border-border'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          Parcela {installment.installment_number}
                        </p>
                        <p className="text-xs text-text-light">
                          Vence: {formatDateShort(installment.due_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{formatCurrency(installment.amount)}</p>
                        {installment.is_paid ? (
                          <span className="text-xs text-success font-medium px-2 py-1 bg-success/10 rounded-lg">
                            Pago
                          </span>
                        ) : (
                          <div className="flex gap-1">
                            {selectedSale.customer?.phone && (
                              <button
                                onClick={() => handleSendReminder(selectedSale, installment)}
                                className="p-1.5 rounded-lg bg-success/10 text-success"
                                title="Cobrar via WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleMarkPaid(installment)}
                              className="p-1.5 rounded-lg bg-primary/10 text-primary"
                              title="Marcar como pago"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSale.notes && (
              <div>
                <p className="text-sm text-text-light">Observações</p>
                <p className="text-sm">{selectedSale.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
