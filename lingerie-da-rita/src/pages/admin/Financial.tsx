import { useEffect, useState } from 'react'
import { Plus, DollarSign, TrendingUp, TrendingDown, Fuel, ShoppingBag, Gift, MoreHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { showToast } from '@/components/ui/Toast'
import type { Expense } from '@/types/database'

interface FinancialSummary {
  totalRevenue: number
  totalCost: number
  totalExpenses: number
  netProfit: number
}

const categoryIcons: Record<string, typeof Fuel> = {
  fuel: Fuel,
  bags: ShoppingBag,
  gifts: Gift,
  other: MoreHorizontal,
}

const categoryLabels: Record<string, string> = {
  fuel: 'Gasolina',
  bags: 'Sacolas',
  gifts: 'Brindes',
  other: 'Outros',
}

export function Financial() {
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0, totalCost: 0, totalExpenses: 0, netProfit: 0,
  })
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
  })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetchFinancialData()
  }, [selectedMonth])

  async function fetchFinancialData() {
    setIsLoading(true)
    const [year, month] = selectedMonth.split('-').map(Number)
    const startOfMonth = new Date(year, month - 1, 1).toISOString()
    const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

    try {
      // Revenue (paid installments this month)
      const { data: paidInstallments } = await supabase
        .from('installments')
        .select('amount')
        .eq('is_paid', true)
        .gte('paid_date', startOfMonth.split('T')[0])
        .lte('paid_date', endOfMonth.split('T')[0])

      const totalRevenue = paidInstallments?.reduce((s, i) => s + i.amount, 0) || 0

      // Cost of goods sold
      const { data: monthSales } = await supabase
        .from('sales')
        .select('id')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      const saleIds = monthSales?.map(s => s.id) || []
      let totalCost = 0

      if (saleIds.length > 0) {
        const { data: saleItems } = await supabase
          .from('sale_items')
          .select('cost_price, quantity')
          .in('sale_id', saleIds)

        totalCost = saleItems?.reduce((s, i) => s + i.cost_price * i.quantity, 0) || 0
      }

      // Expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startOfMonth.split('T')[0])
        .lte('date', endOfMonth.split('T')[0])
        .order('date', { ascending: false })

      const totalExpenses = expensesData?.reduce((s, e) => s + e.amount, 0) || 0

      setSummary({
        totalRevenue,
        totalCost,
        totalExpenses,
        netProfit: totalRevenue - totalCost - totalExpenses,
      })
      setExpenses(expensesData || [])
    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddExpense() {
    if (!expenseForm.description || !expenseForm.amount) {
      showToast('Preencha todos os campos', 'warning')
      return
    }

    const { error } = await supabase.from('expenses').insert({
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      category: expenseForm.category as Expense['category'],
      date: expenseForm.date,
    })

    if (error) {
      showToast('Erro ao adicionar despesa', 'error')
      return
    }

    showToast('Despesa registrada!', 'success')
    setShowAddExpense(false)
    setExpenseForm({ description: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0] })
    fetchFinancialData()
  }

  async function handleDeleteExpense(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) {
      showToast('Erro ao excluir despesa', 'error')
      return
    }
    showToast('Despesa excluída', 'success')
    fetchFinancialData()
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Financeiro</h2>
        <Button
          onClick={() => setShowAddExpense(true)}
          icon={<Plus className="w-5 h-5" />}
          size="sm"
        >
          Despesa
        </Button>
      </div>

      <Select
        options={months}
        value={selectedMonth}
        onChange={e => setSelectedMonth(e.target.value)}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-success" />
                <p className="text-xs text-text-light">Receita</p>
              </div>
              <p className="text-lg font-bold text-success">{formatCurrency(summary.totalRevenue)}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-text-light" />
                <p className="text-xs text-text-light">Custo Produtos</p>
              </div>
              <p className="text-lg font-bold">{formatCurrency(summary.totalCost)}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-danger" />
                <p className="text-xs text-text-light">Despesas</p>
              </div>
              <p className="text-lg font-bold text-danger">{formatCurrency(summary.totalExpenses)}</p>
            </Card>
            <Card className={summary.netProfit >= 0 ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}>
              <p className="text-xs text-text-light mb-1">Lucro Líquido</p>
              <p className={`text-lg font-bold ${summary.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(summary.netProfit)}
              </p>
            </Card>
          </div>

          {/* Expenses List */}
          <div>
            <h3 className="font-bold text-sm mb-2">Despesas do Mês</h3>
            {expenses.length === 0 ? (
              <Card>
                <p className="text-sm text-text-light text-center py-4">Nenhuma despesa registrada</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {expenses.map(expense => {
                  const Icon = categoryIcons[expense.category] || MoreHorizontal
                  return (
                    <Card key={expense.id} padding="sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-danger/10 rounded-xl flex items-center justify-center">
                            <Icon className="w-4 h-4 text-danger" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{expense.description}</p>
                            <p className="text-xs text-text-light">
                              {categoryLabels[expense.category]} • {formatDate(expense.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-danger">-{formatCurrency(expense.amount)}</p>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1 rounded-lg hover:bg-danger/10 text-text-light hover:text-danger"
                          >
                            <span className="text-xs">×</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        title="Nova Despesa"
      >
        <div className="space-y-3">
          <Input
            label="Descrição *"
            placeholder="Ex: Gasolina para entregas"
            value={expenseForm.description}
            onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
          />
          <Input
            label="Valor (R$) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={expenseForm.amount}
            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
          />
          <Select
            label="Categoria"
            options={[
              { value: 'fuel', label: 'Gasolina' },
              { value: 'bags', label: 'Sacolas' },
              { value: 'gifts', label: 'Brindes' },
              { value: 'other', label: 'Outros' },
            ]}
            value={expenseForm.category}
            onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
          />
          <Input
            label="Data"
            type="date"
            value={expenseForm.date}
            onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
          />
          <Button onClick={handleAddExpense} className="w-full">
            Registrar Despesa
          </Button>
        </div>
      </Modal>
    </div>
  )
}
