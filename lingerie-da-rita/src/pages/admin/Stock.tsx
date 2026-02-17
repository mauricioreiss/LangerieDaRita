import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Package, Edit2, ImageOff, Archive, RotateCcw, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { showToast } from '@/components/ui/Toast'
import { useOnline } from '@/hooks/useOnline'
import type { Product } from '@/types/database'

export function Stock() {
  const navigate = useNavigate()
  const isOnline = useOnline()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<Product | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [showArchived])

  async function fetchProducts() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_archived', showArchived)
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Erro ao carregar produtos', 'error')
      setIsLoading(false)
      return
    }
    setProducts(data || [])
    setIsLoading(false)
  }

  async function handleArchive(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({ is_archived: true, is_available: false })
      .eq('id', product.id)

    if (error) {
      showToast('Erro ao arquivar produto', 'error')
      return
    }

    showToast('Produto arquivado', 'success')
    setDeleteModal(null)
    fetchProducts()
  }

  async function handleRestore(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({ is_archived: false, is_available: product.stock_quantity > 0 })
      .eq('id', product.id)

    if (error) {
      showToast('Erro ao restaurar produto', 'error')
      return
    }

    showToast('Produto restaurado', 'success')
    fetchProducts()
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.size.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Estoque</h2>
        <Button
          onClick={() => navigate('/admin/estoque/novo')}
          icon={<Plus className="w-5 h-5" />}
          size="sm"
          disabled={!isOnline}
        >
          Novo
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
          <Input
            placeholder="Buscar por nome, código ou tamanho..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            showArchived
              ? 'bg-primary text-white'
              : 'bg-surface text-text-light hover:bg-surface/80'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          {showArchived ? 'Arquivados' : 'Ver Arquivados'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title={showArchived ? 'Nenhum produto arquivado' : 'Nenhum produto'}
          description={search ? 'Nenhum resultado encontrado' : showArchived ? 'Nenhum produto foi arquivado' : 'Cadastre seu primeiro produto'}
          action={
            !search && !showArchived && (
              <Button onClick={() => navigate('/admin/estoque/novo')} icon={<Plus className="w-5 h-5" />}>
                Cadastrar Produto
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(product => (
            <Card key={product.id} padding="sm">
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-16 h-16 rounded-xl bg-surface flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-6 h-6 text-text-light" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="text-xs text-text-light">
                        Cód: {product.code} • Tam: {product.size}
                      </p>
                    </div>
                    <p className="font-bold text-primary text-sm ml-2">
                      {formatCurrency(product.sale_price)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        product.stock_quantity === 0
                          ? 'bg-danger'
                          : product.min_stock_alert > 0 && product.stock_quantity <= product.min_stock_alert
                            ? 'bg-warning'
                            : 'bg-success'
                      }`} />
                      <span className="text-xs text-text-light">
                        {product.stock_quantity === 0 ? 'Esgotado' : `${product.stock_quantity} un.`}
                      </span>
                      {product.min_stock_alert > 0 && product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_alert && (
                        <span className="flex items-center gap-0.5 text-xs text-warning font-medium ml-1">
                          <AlertTriangle className="w-3 h-3" />
                          Baixo
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {showArchived ? (
                        <button
                          onClick={() => handleRestore(product)}
                          disabled={!isOnline}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restaurar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => navigate(`/admin/estoque/editar/${product.id}`)}
                            disabled={!isOnline}
                            className="p-1.5 rounded-lg hover:bg-surface text-text-light disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal(product)}
                            disabled={!isOnline}
                            className="p-1.5 rounded-lg hover:bg-danger/10 text-danger disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Arquivar Produto"
      >
        <p className="text-sm text-text-light mb-4">
          Tem certeza que deseja arquivar <strong>{deleteModal?.name}</strong>? O produto será removido do catálogo e poderá ser restaurado depois.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal(null)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteModal && handleArchive(deleteModal)}
            className="flex-1"
            disabled={!isOnline}
          >
            Arquivar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
