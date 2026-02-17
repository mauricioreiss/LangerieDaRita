import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Copy, CheckCircle, QrCode, Calendar, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { addMonths, differenceInDays } from 'date-fns'
import { formatCurrency } from '@/lib/formatters'
import { generatePixPayload } from '@/lib/pix'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/cartStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { showToast } from '@/components/ui/Toast'
import { useOnline } from '@/hooks/useOnline'

export function Checkout() {
  const navigate = useNavigate()
  const isOnline = useOnline()
  const { items, getTotal, clearCart } = useCartStore()
  const { getSetting, isLoaded, fetchSettings } = useSettingsStore()

  const pixKey = getSetting('pix_key')
  const whatsappNumber = getSetting('whatsapp_number')
  const merchantName = getSetting('merchant_name', 'LINGERIE DA RITA')
  const merchantCity = getSetting('merchant_city', 'SAO PAULO')

  useEffect(() => {
    if (!isLoaded) fetchSettings()
  }, [isLoaded, fetchSettings])

  const [name, setName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'installment'>('pix')
  const [installmentCount, setInstallmentCount] = useState('1')
  const [phone, setPhone] = useState('')
  const [pixCopied, setPixCopied] = useState(false)
  const [payloadCopied, setPayloadCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const total = getTotal()
  const purchaseDate = useMemo(() => new Date(), [])
  const maxDate = useMemo(() => {
    const d = new Date(purchaseDate)
    d.setDate(d.getDate() + 90)
    return d
  }, [purchaseDate])

  // Custom installment dates
  const [customDates, setCustomDates] = useState<Record<number, string>>({})

  const defaultDates = useMemo(() => {
    const count = parseInt(installmentCount)
    return Array.from({ length: count }, (_, i) => {
      const date = addMonths(purchaseDate, i)
      return date.toISOString().split('T')[0]
    })
  }, [installmentCount])

  function getInstallmentDate(index: number): string {
    return customDates[index] || defaultDates[index]
  }

  function handleDateChange(index: number, dateStr: string) {
    // Parse as local date to avoid timezone offset issues
    const [y, m, d] = dateStr.split('-').map(Number)
    const selectedDate = new Date(y, m - 1, d)
    const today = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), purchaseDate.getDate())
    const daysDiff = differenceInDays(selectedDate, today)

    if (daysDiff > 90) {
      showToast('O prazo máximo é 90 dias a partir da data da compra', 'warning')
      return
    }
    if (daysDiff < 0) {
      showToast('A data não pode ser anterior à compra', 'warning')
      return
    }

    setCustomDates(prev => ({ ...prev, [index]: dateStr }))
  }

  // Pix payload
  const pixPayload = useMemo(() => {
    return generatePixPayload({
      pixKey: pixKey,
      merchantName: merchantName,
      merchantCity: merchantCity,
      amount: total,
      txId: 'LOJA' + Date.now().toString().slice(-8),
    })
  }, [total, pixKey, merchantName, merchantCity])

  function handleCopyPayload() {
    navigator.clipboard.writeText(pixPayload).then(() => {
      setPayloadCopied(true)
      showToast('Pix Copia e Cola copiado!', 'success')
      setTimeout(() => setPayloadCopied(false), 3000)
    })
  }

  function handleCopyKey() {
    navigator.clipboard.writeText(pixKey).then(() => {
      setPixCopied(true)
      showToast('Chave Pix copiada!', 'success')
      setTimeout(() => setPixCopied(false), 3000)
    })
  }

  function generateOrderMessage(): string {
    let message = `🛍️ *Novo Pedido - Lingerie da Rita*\n\n`
    message += `👤 *Cliente:* ${name}\n`
    message += `💳 *Pagamento:* ${paymentMethod === 'pix' ? 'Pix' : `${installmentCount}x`}\n\n`
    message += `📦 *Itens:*\n`

    items.forEach(item => {
      message += `• ${item.product.name} (${item.product.size}) x${item.quantity} - ${formatCurrency(item.product.sale_price * item.quantity)}\n`
    })

    message += `\n💰 *Total: ${formatCurrency(total)}*`

    if (paymentMethod === 'installment') {
      const count = parseInt(installmentCount)
      const installmentAmount = total / count
      message += `\n\n📅 *Parcelas:*`
      for (let i = 0; i < count; i++) {
        const dateStr = getInstallmentDate(i)
        const [y, m, d] = dateStr.split('-')
        message += `\n  ${i + 1}x - ${formatCurrency(installmentAmount)} (${d}/${m}/${y})`
      }
    }

    return message
  }

  async function handleSendWhatsApp() {
    if (!name.trim()) {
      showToast('Digite seu nome', 'warning')
      return
    }
    if (!phone.trim()) {
      showToast('Digite seu telefone', 'warning')
      return
    }

    setIsSaving(true)

    try {
      // Register sale in the database
      const count = paymentMethod === 'installment' ? parseInt(installmentCount) : 1
      const installmentAmount = total / count
      const now = new Date()

      const orderItems = items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }))

      const orderInstallments = Array.from({ length: count }, (_, i) => ({
        installment_number: i + 1,
        amount: Math.round(installmentAmount * 100) / 100,
        due_date: paymentMethod === 'pix' ? now.toISOString().split('T')[0] : getInstallmentDate(i),
      }))

      const paymentMethodValue = paymentMethod === 'pix'
        ? 'pix'
        : `installment_${installmentCount}x`

      const { error } = await (supabase.rpc as Function)('create_public_order', {
        p_customer_name: name.trim(),
        p_customer_phone: phone.trim(),
        p_items: orderItems,
        p_payment_method: paymentMethodValue,
        p_installments: orderInstallments,
        p_total_amount: total,
      })

      if (error) {
        console.error('Order error:', error)
        showToast('Erro ao registrar pedido. Tente novamente.', 'error')
        setIsSaving(false)
        return
      }
    } catch (err) {
      console.error('Order exception:', err)
      showToast('Erro ao registrar pedido. Tente novamente.', 'error')
      setIsSaving(false)
      return
    }

    // Send to WhatsApp
    const message = generateOrderMessage()
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
    showToast('Pedido registrado e enviado!', 'success')
    clearCart()
    setIsSaving(false)
    navigate('/catalogo')
  }

  if (items.length === 0) {
    navigate('/catalogo')
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/carrinho')}
          className="p-2 rounded-xl hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Finalizar Pedido</h2>
      </div>

      {/* Order Summary */}
      <Card>
        <p className="font-semibold text-sm mb-2">Resumo do Pedido</p>
        {items.map(item => (
          <div key={item.product.id} className="flex justify-between py-1.5 text-sm">
            <span className="text-text-light">
              {item.product.name} x{item.quantity}
            </span>
            <span className="font-medium">
              {formatCurrency(item.product.sale_price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="border-t border-border mt-2 pt-2 flex justify-between">
          <span className="font-bold">Total</span>
          <span className="font-bold text-primary text-lg">{formatCurrency(total)}</span>
        </div>
      </Card>

      {/* Customer Info */}
      <Card>
        <div className="space-y-3">
          <Input
            label="Seu Nome *"
            placeholder="Como você se chama?"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Input
            label="Seu Telefone (WhatsApp) *"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>
      </Card>

      {/* Payment Method */}
      <Card>
        <p className="font-semibold text-sm mb-3">Forma de Pagamento</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setPaymentMethod('pix')}
            className={`p-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${
              paymentMethod === 'pix'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-light'
            }`}
          >
            Pix
          </button>
          <button
            onClick={() => setPaymentMethod('installment')}
            className={`p-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${
              paymentMethod === 'installment'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-light'
            }`}
          >
            Parcelado
          </button>
        </div>

        {paymentMethod === 'pix' && (
          <div className="space-y-3">
            {/* QR Code */}
            <div className="bg-white border border-border rounded-2xl p-4 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Escaneie o QR Code</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-border">
                <QRCodeSVG
                  value={pixPayload}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-text-light mt-2">
                Valor: <span className="font-bold text-text">{formatCurrency(total)}</span>
              </p>
            </div>

            {/* Copy Buttons */}
            <Button
              onClick={handleCopyPayload}
              variant={payloadCopied ? 'success' : 'primary'}
              icon={payloadCopied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              className="w-full"
              size="lg"
            >
              {payloadCopied ? 'Copiado!' : 'Copiar Pix Copia e Cola'}
            </Button>

            <div className="bg-surface rounded-xl p-3">
              <p className="text-xs text-text-light mb-2">Chave Pix (manual):</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono font-medium flex-1 truncate">{pixKey}</p>
                <button
                  onClick={handleCopyKey}
                  className="p-2 rounded-lg bg-white border border-border min-h-[36px]"
                >
                  {pixCopied ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'installment' && (
          <div className="space-y-3">
            {/* Installment count */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3'].map(n => {
                const amount = total / parseInt(n)
                return (
                  <button
                    key={n}
                    onClick={() => {
                      setInstallmentCount(n)
                      setCustomDates({})
                    }}
                    className={`p-3 rounded-xl text-center border transition-colors min-h-[44px] ${
                      installmentCount === n
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <p className="text-sm font-bold">{n}x</p>
                    <p className="text-xs text-text-light">{formatCurrency(amount)}</p>
                  </button>
                )
              })}
            </div>

            {/* Editable dates */}
            <div className="space-y-2">
              <p className="text-xs text-text-light flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Toque na data para alterar (max. 90 dias)
              </p>
              {Array.from({ length: parseInt(installmentCount) }, (_, i) => {
                const amount = total / parseInt(installmentCount)
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
                      value={getInstallmentDate(i)}
                      min={purchaseDate.toISOString().split('T')[0]}
                      max={maxDate.toISOString().split('T')[0]}
                      onChange={e => handleDateChange(i, e.target.value)}
                      className="text-sm border border-border rounded-lg px-2 py-1.5 min-h-[36px] focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Send to WhatsApp */}
      <Button
        onClick={handleSendWhatsApp}
        icon={isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        className="w-full bg-[#25D366] hover:bg-[#1DA851] active:bg-[#128C3E]"
        size="lg"
        disabled={!isOnline || isSaving}
      >
        {isSaving ? 'Registrando pedido...' : 'Enviar Pedido no WhatsApp'}
      </Button>
    </div>
  )
}
