import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, UserPlus, Plus, Minus, Trash2, Calendar, AlertTriangle } from 'lucide-react'
import { addMonths, differenceInDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateShort } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { showToast } from '@/components/ui/Toast'
import { useOnline } from '@/hooks/useOnline'
import type { Product, Customer } from '@/types/database'

interface SaleCartItem {
  product: Product
  quantity: number
}

export function NewSale() {
  const navigate = useNavigate()
  const isOnline = useOnline()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [items, setItems] = useState<SaleCartItem[]>([])
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [customDueDates, setCustomDueDates] = useState<Record<number, string>>({})

  const purchaseDate = new Date()
  const maxDate = new Date(purchaseDate)
  maxDate.setDate(maxDate.getDate() + 90)

  function getDefaultDueDate(index: number): string {
    return addMonths(purchaseDate, index).toISOString().split('T')[0]
  }

  function getDueDate(index: number): string {
    return customDueDates[index] || getDefaultDueDate(index)
  }

  function handleDueDateChange(index: number, dateStr: string) {
    const selected = new Date(dateStr)
    const daysDiff = differenceInDays(selected, purchaseDate)
    if (daysDiff > 90) {
      showToast('O prazo máximo é 90 dias a partir da data da compra', 'warning')
      return
    }
    if (daysDiff < 0) {
      showToast('A data não pode ser anterior à compra', 'warning')
      return
    }
    setCustomDueDates(prev => ({ ...prev, [index]: dateStr }))
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [customersRes, productsRes] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('products').select('*').eq('is_available', true).order('name'),
    ])
    setCustomers(customersRes.data || [])
    setProducts(productsRes.data || [])
  }

  function addProduct(product: Product) {
    const existing = items.find(i => i.product.id === product.id)
    if (existing) {
      setItems(items.map(i =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setItems([...items, { product, quantity: 1 }])
    }
  }

  function updateItemQuantity(productId: string, delta: number) {
    setItems(items.map(i => {
      if (i.product.id === productId) {
        const newQty = i.quantity + delta
        return newQty > 0 ? { ...i, quantity: newQty } : i
      }
      return i
    }).filter(i => i.quantity > 0))
  }

  function removeItem(productId: string) {
    setItems(items.filter(i => i.product.id !== productId))
  }

  const total = items.reduce((sum, i) => sum + i.product.sale_price * i.quantity, 0)

  async function handleCreateCustomer() {
    if (!newCustomerName || !newCustomerPhone) {
      showToast('Preencha nome e telefone', 'warning')
      return
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({ name: newCustomerName, phone: newCustomerPhone })
      .select()
      .single()

    if (error) {
      showToast('Erro ao criar cliente', 'error')
      return
    }

    setCustomers([...customers, data])
    setSelectedCustomerId(data.id)
    setShowNewCustomer(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    showToast('Cliente cadastrado!', 'success')
  }

  async function handleSubmit() {
    if (!selectedCustomerId) {
      showToast('Selecione um cliente', 'warning')
      return
    }
    if (items.length === 0) {
      showToast('Adicione pelo menos um produto', 'warning')
      return
    }

    setIsLoading(true)

    try {
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: selectedCustomerId,
          total_amount: total,
          payment_method: paymentMethod as 'pix' | 'installment_1x' | 'installment_2x' | 'installment_3x',
          status: paymentMethod === 'pix' ? 'paid' : 'pending',
          notes: notes || null,
        })
        .select()
        .single()

      if (saleError || !sale) throw saleError

      // Create sale items
      const saleItems = items.map(i => ({
        sale_id: sale.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.sale_price,
        cost_price: i.product.cost_price,
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Update stock
      for (const item of items) {
        await supabase
          .from('products')
          .update({
            stock_quantity: Math.max(0, item.product.stock_quantity - item.quantity),
            is_available: item.product.stock_quantity - item.quantity > 0,
          })
          .eq('id', item.product.id)
      }

      // Create installments (using custom dates if set)
      const numInstallments = paymentMethod === 'pix' ? 1
        : paymentMethod === 'installment_1x' ? 1
        : paymentMethod === 'installment_2x' ? 2
        : 3

      const installmentAmount = total / numInstallments
      const now = new Date()

      const installments = Array.from({ length: numInstallments }, (_, i) => ({
        sale_id: sale.id,
        installment_number: i + 1,
        amount: Math.round(installmentAmount * 100) / 100,
        due_date: getDueDate(i),
        is_paid: paymentMethod === 'pix',
        paid_date: paymentMethod === 'pix' ? now.toISOString().split('T')[0] : null,
      }))

      const { error: installError } = await supabase
        .from('installments')
        .insert(installments)

      if (installError) throw installError

      // If pix, mark sale as paid
      if (paymentMethod === 'pix') {
        await supabase
          .from('sales')
          .update({ status: 'paid' })
          .eq('id', sale.id)
      }

      showToast('Venda realizada com sucesso!', 'success')
      navigate('/admin')
    } catch (error) {
      console.error(error)
      showToast('Erro ao registrar venda', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Nova Venda</h2>
      </div>

      {/* Customer Selection */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">Cliente</p>
          <button
            onClick={() => setShowNewCustomer(true)}
            className="flex items-center gap-1 text-primary text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Novo
          </button>
        </div>
        <Select
          options={[
            { value: '', label: 'Selecione um cliente' },
            ...customers.map(c => ({ value: c.id, label: `${c.name} - ${c.phone}` })),
          ]}
          value={selectedCustomerId}
          onChange={e => setSelectedCustomerId(e.target.value)}
        />
      </Card>

      {/* Product Selection */}
      <Card>
        <p className="font-semibold text-sm mb-3">Produtos</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {products.map(product => (
            <div
              key={product.id}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-surface cursor-pointer"
              onClick={() => addProduct(product)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-text-light">Tam: {product.size} • Estoque: {product.stock_quantity}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <p className="text-sm font-bold text-primary">{formatCurrency(product.sale_price)}</p>
                <Plus className="w-4 h-4 text-primary" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cart Items */}
      {items.length > 0 && (
        <Card>
          <p className="font-semibold text-sm mb-3">Itens da Venda</p>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.product.id} className="flex items-center justify-between p-2 bg-surface rounded-xl">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-text-light">{formatCurrency(item.product.sale_price)} cada</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => updateItemQuantity(item.product.id, -1)}
                    className="p-1 rounded-lg bg-white border border-border"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateItemQuantity(item.product.id, 1)}
                    className="p-1 rounded-lg bg-white border border-border"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1 rounded-lg text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-border">
              <p className="font-semibold">Total</p>
              <p className="font-bold text-primary text-lg">{formatCurrency(total)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Payment Method */}
      <Card>
        <p className="font-semibold text-sm mb-3">Forma de Pagamento</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'pix', label: 'Pix' },
            { value: 'installment_1x', label: '1x' },
            { value: 'installment_2x', label: '2x' },
            { value: 'installment_3x', label: '3x' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setPaymentMethod(opt.value)
                setCustomDueDates({})
              }}
              className={`p-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${
                paymentMethod === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-light hover:bg-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Installment Dates (editable) */}
      {paymentMethod.startsWith('installment_') && paymentMethod !== 'installment_1x' && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm">Datas das Parcelas</p>
          </div>
          <p className="text-xs text-text-light mb-3">Toque na data para alterar (máx. 90 dias)</p>
          <div className="space-y-2">
            {Array.from({
              length: paymentMethod === 'installment_2x' ? 2 : 3
            }, (_, i) => {
              const amount = total / (paymentMethod === 'installment_2x' ? 2 : 3)
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border border-border"
                >
                  <div>
                    <p className="text-sm font-medium">Parcela {i + 1}</p>
                    <p className="text-xs font-bold text-primary">{formatCurrency(amount)}</p>
                  </div>
                  <input
                    type="date"
                    value={getDueDate(i)}
                    min={purchaseDate.toISOString().split('T')[0]}
                    max={maxDate.toISOString().split('T')[0]}
                    onChange={e => handleDueDateChange(i, e.target.value)}
                    className="text-sm border border-border rounded-lg px-2 py-1.5 min-h-[36px] focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Stock warnings */}
      {items.some(i => i.quantity > i.product.stock_quantity) && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <p className="text-sm text-warning font-medium">
              Atenção: Alguns itens excedem o estoque disponível. A venda será registrada mesmo assim.
            </p>
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <Input
          label="Observações (opcional)"
          placeholder="Alguma observação sobre a venda..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </Card>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        isLoading={isLoading}
        icon={<Save className="w-5 h-5" />}
        className="w-full"
        size="lg"
        disabled={!selectedCustomerId || items.length === 0 || !isOnline}
      >
        Registrar Venda • {formatCurrency(total)}
      </Button>

      {/* New Customer Modal */}
      <Modal
        isOpen={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        title="Novo Cliente"
      >
        <div className="space-y-3">
          <Input
            label="Nome *"
            placeholder="Nome da cliente"
            value={newCustomerName}
            onChange={e => setNewCustomerName(e.target.value)}
          />
          <Input
            label="Telefone (WhatsApp) *"
            placeholder="(11) 99999-9999"
            value={newCustomerPhone}
            onChange={e => setNewCustomerPhone(e.target.value)}
          />
          <Button onClick={handleCreateCustomer} className="w-full">
            Cadastrar Cliente
          </Button>
        </div>
      </Modal>
    </div>
  )
}
