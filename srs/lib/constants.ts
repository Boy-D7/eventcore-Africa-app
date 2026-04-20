export const ROLES = {
  FAN:        'fan',
  AGENT:      'agent',
  GATE_STAFF: 'gate_staff',
  ADMIN:      'admin',
} as const

export const TICKET_STATUS = {
  VALID:     'valid',
  SCANNED:   'scanned',
  CANCELLED: 'cancelled',
} as const

export const PAYMENT_PROVIDERS = {
  AIRTEL: 'airtel',
  TNM:    'tnm',
  CASH:   'cash',
} as const

export const TICKET_TYPES = {
  GENERAL: 'general',
  VIP:     'vip',
} as const

// Bible: ticket prices in MWK
export const TICKET_PRICES = {
  general: 3500,
  vip:     7000,
} as const

// Bible: Dedza Stadium
export const DEDZA_STADIUM = {
  name:     'Dedza Stadium',
  city:     'Dedza',
  country:  'Malawi',
  capacity: 15000,
} as const

// Bible: USSD code
export const USSD_CODE = '*495#'

// Bible: payment methods
export const PAYMENT_METHODS = [
  { id: 'stk',  label: '📱 Self (STK)',    description: 'Pay with Airtel/TNM' },
  { id: 'agent', label: '🏢 Booth Agent',  description: 'Pay at booth' },
  { id: 'ussd', label: `📞 USSD ${USSD_CODE}`, description: 'Dial to pay' },
] as const

export const EVENT_STATUS = {
  DRAFT:     'draft',
  ACTIVE:    'active',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const