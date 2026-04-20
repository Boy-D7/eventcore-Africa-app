export type UserRole = 'fan' | 'agent' | 'gate_staff' | 'admin'

export type TicketStatus = 'valid' | 'scanned' | 'cancelled'

export type PaymentProvider = 'airtel' | 'tnm' | 'cash'

export type TicketType = 'general' | 'vip'

export type EventStatus = 'draft' | 'active' | 'cancelled' | 'completed'

export type TransactionStatus = 'pending' | 'completed' | 'failed'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone: string
  created_at: string
}

export interface Event {
  id: string
  title: string
  venue: string
  event_date: string
  description: string
  image_url: string
  general_price: number
  vip_price: number
  total_capacity: number
  tickets_sold: number
  status: EventStatus
  created_by: string
  created_at: string
}

export interface Ticket {
  id: string
  event_id: string
  user_id: string
  ticket_type: TicketType
  qr_code: string
  qr_image: string
  status: TicketStatus
  amount_paid: number
  purchased_at: string
  scanned_at: string | null
  scanned_by: string | null
  event?: Event
  profile?: Profile
}

export interface Transaction {
  id: string
  ticket_id: string
  user_id: string
  event_id: string
  amount: number
  currency: 'MWK'
  provider: PaymentProvider
  provider_ref: string | null
  phone_number: string
  status: TransactionStatus
  created_at: string
}

export interface ScanLog {
  id: string
  ticket_id: string
  scanned_by: string
  gate: string
  scanned_at: string
  result: 'valid' | 'duplicate' | 'invalid'
  ticket?: Ticket
}