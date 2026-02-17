import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Key, Phone, Store, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { showToast } from '@/components/ui/Toast'
import { useSettingsStore } from '@/store/settingsStore'

interface SettingField {
  key: string
  label: string
  placeholder: string
  icon: React.ReactNode
  helpText: string
}

const SETTING_FIELDS: SettingField[] = [
  {
    key: 'pix_key',
    label: 'Chave Pix',
    placeholder: 'CPF, email, telefone ou chave aleatória',
    icon: <Key className="w-4 h-4" />,
    helpText: 'Sua chave Pix para receber pagamentos',
  },
  {
    key: 'whatsapp_number',
    label: 'Número WhatsApp',
    placeholder: '5511999999999',
    icon: <Phone className="w-4 h-4" />,
    helpText: 'Número com código do país (55) + DDD + número',
  },
  {
    key: 'merchant_name',
    label: 'Nome do Comerciante (Pix)',
    placeholder: 'LINGERIE DA RITA',
    icon: <Store className="w-4 h-4" />,
    helpText: 'Nome que aparece no QR Code Pix',
  },
  {
    key: 'merchant_city',
    label: 'Cidade (Pix)',
    placeholder: 'SAO PAULO',
    icon: <MapPin className="w-4 h-4" />,
    helpText: 'Cidade que aparece no QR Code Pix',
  },
]

export function Settings() {
  const navigate = useNavigate()
  const { settings, fetchSettings } = useSettingsStore()
  const [values, setValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    await fetchSettings()
    setIsFetching(false)
  }

  useEffect(() => {
    setValues({ ...settings })
  }, [settings])

  async function handleSave() {
    setIsLoading(true)
    try {
      for (const field of SETTING_FIELDS) {
        const newValue = values[field.key] ?? ''
        if (newValue !== (settings[field.key] || '')) {
          const { error } = await supabase
            .from('app_settings')
            .update({ value: newValue, updated_at: new Date().toISOString() })
            .eq('key', field.key)

          if (error) throw error
        }
      }

      await fetchSettings()
      showToast('Configurações salvas!', 'success')
    } catch (error) {
      console.error(error)
      showToast('Erro ao salvar configurações', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
        ))}
      </div>
    )
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
        <h2 className="text-xl font-bold">Configurações</h2>
      </div>

      <Card>
        <p className="text-sm text-text-light mb-4">
          Configure os dados do seu negócio. Essas informações serão usadas no checkout e nos pagamentos Pix.
        </p>
        <div className="space-y-4">
          {SETTING_FIELDS.map(field => (
            <div key={field.key}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary">{field.icon}</span>
                <label className="text-sm font-medium">{field.label}</label>
              </div>
              <Input
                placeholder={field.placeholder}
                value={values[field.key] || ''}
                onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
              />
              <p className="text-xs text-text-light mt-1">{field.helpText}</p>
            </div>
          ))}
        </div>
      </Card>

      <Button
        onClick={handleSave}
        isLoading={isLoading}
        icon={<Save className="w-5 h-5" />}
        className="w-full"
        size="lg"
      >
        Salvar Configurações
      </Button>
    </div>
  )
}
