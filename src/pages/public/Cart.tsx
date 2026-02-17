import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export function Cart() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeItem, getTotal } = useCartStore()
  const total = getTotal()

  if (items.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">Carrinho</h2>
        </div>
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12" />}
          title="Carrinho vazio"
          description="Adicione produtos da nossa vitrine"
          action={
            <Button onClick={() => navigate('/')}>
              Ver Produtos
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Carrinho ({items.length})</h2>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.product.id} padding="sm">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-surface overflow-hidden flex-shrink-0">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-text-light" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-text-light">Tam: {item.product.size}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1 rounded-lg text-text-light hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-bold text-primary">
                    {formatCurrency(item.product.sale_price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Total & Checkout */}
      <Card className="sticky bottom-20">
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-light">Total</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
        </div>
        <Button
          onClick={() => navigate('/checkout')}
          className="w-full"
          size="lg"
        >
          Finalizar Pedido
        </Button>
      </Card>
    </div>
  )
}
