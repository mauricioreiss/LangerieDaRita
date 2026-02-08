import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Search, Package, Plus, ImageOff, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { showToast } from '@/components/ui/Toast'
import { useOnline } from '@/hooks/useOnline'
import type { Product } from '@/types/database'

type Mode = 'search' | 'restock' | 'new' | 'edit'

interface RestockResult {
  previousStock: number
  newStock: number
  productName: string
}

export function ProductForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const isOnline = useOnline()

  const [mode, setMode] = useState<Mode>(isEditing ? 'edit' : 'search')
  const [searchCode, setSearchCode] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [restockQuantity, setRestockQuantity] = useState('')
  const [restockResult, setRestockResult] = useState<RestockResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Form state for new product / editing
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    size: '',
    cost_price: '',
    sale_price: '',
    image_url: '',
    stock_quantity: '1',
    min_stock_alert: '0',
  })

  useEffect(() => {
    if (isEditing) {
      fetchProduct()
    }
  }, [id])

  async function fetchProduct() {
    if (!id) return
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setForm({
        code: data.code,
        name: data.name,
        description: data.description || '',
        size: data.size,
        cost_price: data.cost_price.toString(),
        sale_price: data.sale_price.toString(),
        image_url: data.image_url || '',
        stock_quantity: data.stock_quantity.toString(),
        min_stock_alert: data.min_stock_alert.toString(),
      })
    }
  }

  async function handleSearchCode() {
    if (!searchCode.trim()) return

    setIsSearching(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('code', searchCode.trim())
      .single()

    setIsSearching(false)

    if (data) {
      setFoundProduct(data)
      setMode('restock')
    } else {
      setForm(prev => ({ ...prev, code: searchCode.trim() }))
      setMode('new')
    }
  }

  async function handleRestock() {
    if (!foundProduct || !restockQuantity) {
      showToast('Informe a quantidade', 'warning')
      return
    }

    const qty = parseInt(restockQuantity)
    if (qty <= 0) {
      showToast('Quantidade deve ser maior que zero', 'warning')
      return
    }

    setIsLoading(true)
    const previousStock = foundProduct.stock_quantity
    const newStock = previousStock + qty

    const { error } = await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
        is_available: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', foundProduct.id)

    setIsLoading(false)

    if (error) {
      showToast('Erro ao atualizar estoque', 'error')
      return
    }

    setRestockResult({ previousStock, newStock, productName: foundProduct.name })
    showToast('Estoque atualizado!', 'success')
  }

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name || !form.code || !form.size || !form.sale_price) {
      showToast('Preencha os campos obrigatórios', 'warning')
      return
    }

    setIsLoading(true)

    const productData = {
      code: form.code,
      name: form.name,
      description: form.description || null,
      size: form.size,
      cost_price: parseFloat(form.cost_price) || 0,
      sale_price: parseFloat(form.sale_price),
      image_url: form.image_url || null,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_stock_alert: parseInt(form.min_stock_alert) || 0,
      is_available: parseInt(form.stock_quantity) > 0,
    }

    let error
    if (isEditing) {
      ({ error } = await supabase
        .from('products')
        .update({ ...productData, updated_at: new Date().toISOString() })
        .eq('id', id!))
    } else {
      ({ error } = await supabase.from('products').insert(productData))
    }

    setIsLoading(false)

    if (error) {
      showToast('Erro ao salvar produto', 'error')
      console.error(error)
      return
    }

    showToast(isEditing ? 'Produto atualizado!' : 'Produto cadastrado!', 'success')
    navigate('/admin/estoque')
  }

  function resetSearch() {
    setMode('search')
    setSearchCode('')
    setFoundProduct(null)
    setRestockQuantity('')
    setRestockResult(null)
    setForm({
      code: '', name: '', description: '', size: '',
      cost_price: '', sale_price: '', image_url: '',
      stock_quantity: '1', min_stock_alert: '0',
    })
  }

  // Success screen after restock
  if (restockResult) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-xl font-bold text-success mb-2">Estoque Atualizado!</h2>
        <p className="text-lg font-semibold mb-1">{restockResult.productName}</p>
        <div className="bg-surface rounded-2xl p-4 text-center mb-6">
          <p className="text-sm text-text-light">Estoque anterior</p>
          <p className="text-2xl font-bold">{restockResult.previousStock} → {restockResult.newStock}</p>
          <p className="text-sm text-text-light">peças</p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <Button variant="secondary" onClick={resetSearch} className="flex-1">
            Nova Entrada
          </Button>
          <Button onClick={() => navigate('/admin/estoque')} className="flex-1">
            Ver Estoque
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => mode === 'search' || isEditing ? navigate('/admin/estoque') : resetSearch()}
          className="p-2 rounded-xl hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">
          {isEditing ? 'Editar Produto' : mode === 'restock' ? 'Reabastecer' : mode === 'new' ? 'Nova Peça' : 'Entrada de Produtos'}
        </h2>
      </div>

      {/* SEARCH MODE */}
      {mode === 'search' && (
        <Card padding="lg">
          <div className="text-center mb-4">
            <Package className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-sm text-text-light">
              Digite o código do produto para reabastecer ou cadastrar uma nova peça
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Código do produto (ex: 001)"
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchCode()}
              className="flex-1"
            />
            <Button
              onClick={handleSearchCode}
              isLoading={isSearching}
              icon={<Search className="w-5 h-5" />}
              disabled={!isOnline}
            >
              Buscar
            </Button>
          </div>
        </Card>
      )}

      {/* RESTOCK MODE */}
      {mode === 'restock' && foundProduct && (
        <>
          <Card>
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-xl bg-surface overflow-hidden flex-shrink-0">
                {foundProduct.image_url ? (
                  <img
                    src={foundProduct.image_url}
                    alt={foundProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-8 h-8 text-text-light" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold">{foundProduct.name}</p>
                <p className="text-sm text-text-light">Cód: {foundProduct.code} • Tam: {foundProduct.size}</p>
                <p className="text-primary font-bold mt-1">{formatCurrency(foundProduct.sale_price)}</p>
                <p className="text-xs text-text-light mt-0.5">
                  Estoque atual: <span className="font-bold text-text">{foundProduct.stock_quantity}</span> peças
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <p className="font-semibold text-sm mb-3 text-center">Quantas peças chegaram?</p>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 10"
              value={restockQuantity}
              onChange={e => setRestockQuantity(e.target.value)}
              className="text-center text-2xl font-bold mb-3"
            />
            <Button
              onClick={handleRestock}
              isLoading={isLoading}
              icon={<Plus className="w-5 h-5" />}
              className="w-full"
              size="lg"
              disabled={!isOnline}
            >
              Atualizar Estoque
            </Button>
          </Card>
        </>
      )}

      {/* NEW PRODUCT / EDIT MODE */}
      {(mode === 'new' || mode === 'edit') && (
        <form onSubmit={handleSubmitNew} className="space-y-4">
          {form.image_url && (
            <Card padding="sm">
              <img
                src={form.image_url}
                alt="Preview"
                className="w-full h-48 object-cover rounded-xl"
              />
            </Card>
          )}

          <Card>
            <p className="text-sm font-medium text-text-light mb-2">Link da Foto</p>
            <Input
              placeholder="https://exemplo.com/foto.jpg"
              value={form.image_url}
              onChange={e => updateField('image_url', e.target.value)}
            />
          </Card>

          <Card>
            <div className="space-y-3">
              <Input
                label="Código *"
                placeholder="Ex: 001"
                value={form.code}
                onChange={e => updateField('code', e.target.value)}
                disabled={isEditing}
              />
              <Input
                label="Nome *"
                placeholder="Ex: Conjunto Renda Preta"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
              />
              <Input
                label="Descrição"
                placeholder="Descrição do produto (opcional)"
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tamanho *"
                  placeholder="Ex: M"
                  value={form.size}
                  onChange={e => updateField('size', e.target.value)}
                />
                <Input
                  label="Quantidade Inicial"
                  type="number"
                  min="0"
                  placeholder="1"
                  value={form.stock_quantity}
                  onChange={e => updateField('stock_quantity', e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Custo (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.cost_price}
                  onChange={e => updateField('cost_price', e.target.value)}
                />
                <Input
                  label="Preço Venda (R$) *"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.sale_price}
                  onChange={e => updateField('sale_price', e.target.value)}
                />
              </div>
              {form.cost_price && form.sale_price && parseFloat(form.sale_price) > 0 && (
                <p className="text-xs text-success font-medium">
                  Margem: {((parseFloat(form.sale_price) - parseFloat(form.cost_price)) / parseFloat(form.sale_price) * 100).toFixed(0)}%
                </p>
              )}
              <Input
                label="Alerta estoque mínimo"
                type="number"
                min="0"
                placeholder="0 = sem alerta"
                value={form.min_stock_alert}
                onChange={e => updateField('min_stock_alert', e.target.value)}
              />
            </div>
          </Card>

          <Button
            type="submit"
            isLoading={isLoading}
            icon={<Save className="w-5 h-5" />}
            className="w-full"
            size="lg"
            disabled={!isOnline}
          >
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Nova Peça'}
          </Button>
        </form>
      )}
    </div>
  )
}
