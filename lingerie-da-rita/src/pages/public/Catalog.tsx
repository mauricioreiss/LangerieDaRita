import { useEffect, useState } from 'react'
import { Search, ShoppingBag, Plus, ImageOff, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatters'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCartStore } from '@/store/cartStore'
import { showToast } from '@/components/ui/Toast'
import type { Product } from '@/types/database'

export function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })

    setProducts(data || [])
    setIsLoading(false)
  }

  function handleAddToCart(product: Product) {
    addItem(product)
    showToast(`${product.name} adicionado ao carrinho!`, 'success')
  }

  const sizes = [...new Set(products.map(p => p.size))].sort()

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchesSize = !selectedSize || p.size === selectedSize
    return matchesSearch && matchesSize
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
        <Input
          placeholder="Buscar produtos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Size Filter */}
      {sizes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedSize('')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[36px] ${
              !selectedSize ? 'bg-primary text-white' : 'bg-white border border-border text-text-light'
            }`}
          >
            Todos
          </button>
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => setSelectedSize(selectedSize === size ? '' : size)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                selectedSize === size ? 'bg-primary text-white' : 'bg-white border border-border text-text-light'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12" />}
          title="Nenhum produto encontrado"
          description={search ? 'Tente buscar por outro termo' : 'Em breve teremos novidades!'}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(product => (
            <Card key={product.id} padding="sm" className="overflow-hidden">
              {/* Image */}
              <div className="aspect-square rounded-xl bg-surface overflow-hidden mb-2 -mx-1 -mt-1">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none'
                      ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
                  <ImageOff className="w-8 h-8 text-text-light" />
                </div>
              </div>

              {/* Info */}
              <div>
                <p className="font-semibold text-sm truncate">{product.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-text-light">Tam: {product.size}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="font-bold text-primary">{formatCurrency(product.sale_price)}</p>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
