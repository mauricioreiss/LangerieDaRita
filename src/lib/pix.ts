/**
 * Gera o payload do Pix (BR Code) conforme padrão EMV
 * Referência: https://www.bcb.gov.br/estabilidadefinanceira/pix
 */

function padLeft(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

function computeCRC16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export interface PixPayload {
  /** Chave Pix (email, telefone, CPF ou chave aleatória) */
  pixKey: string
  /** Nome do recebedor */
  merchantName: string
  /** Cidade do recebedor */
  merchantCity: string
  /** Valor da transação (opcional) */
  amount?: number
  /** Identificador da transação (opcional, max 25 chars) */
  txId?: string
}

export function generatePixPayload(data: PixPayload): string {
  const {
    pixKey,
    merchantName,
    merchantCity,
    amount,
    txId = '***',
  } = data

  // Merchant Account Information (ID 26)
  const gui = padLeft('00', 'br.gov.bcb.pix')
  const key = padLeft('01', pixKey)
  const merchantAccountInfo = padLeft('26', gui + key)

  let payload = ''

  // Payload Format Indicator
  payload += padLeft('00', '01')
  // Merchant Account Information
  payload += merchantAccountInfo
  // Merchant Category Code
  payload += padLeft('52', '0000')
  // Transaction Currency (986 = BRL)
  payload += padLeft('53', '986')

  // Transaction Amount (if provided)
  if (amount && amount > 0) {
    payload += padLeft('54', amount.toFixed(2))
  }

  // Country Code
  payload += padLeft('58', 'BR')
  // Merchant Name (max 25 chars)
  payload += padLeft('59', merchantName.substring(0, 25))
  // Merchant City (max 15 chars)
  payload += padLeft('60', merchantCity.substring(0, 15))

  // Additional Data Field Template (ID 62)
  const txIdField = padLeft('05', txId.substring(0, 25))
  payload += padLeft('62', txIdField)

  // CRC16 placeholder (ID 63, length 04)
  payload += '6304'

  // Calculate CRC
  const crc = computeCRC16(payload)
  payload += crc

  return payload
}
