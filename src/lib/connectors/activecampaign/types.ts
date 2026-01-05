// Types for ActiveCampaign API v3 responses

export interface ACApiResponse<T> {
  meta?: ACMeta
  [key: string]: T | ACMeta | undefined
}

export interface ACMeta {
  total?: number
  page_input?: {
    limit: number
    offset: number
  }
}

export interface ACCampaign {
  id: string
  type: string // "single", "recurring", "split", "responder", "reminder", "special", "activerss", "text"
  name: string
  status: number // 0=draft, 1=scheduled, 2=sending, 3=paused, 4=stopped, 5=completed
  public: string // "1" or "0"
  tracklinks: string // "all", "none", "mime", "html", "text"
  trackreads: string // "1" or "0"
  trackreadsanalytics: string // "1" or "0"
  send_amt: string // número de envios (string na API)
  total_amt: string // total de contatos (string na API)
  opens: string // total de aberturas (string na API)
  uniqueopens: string // aberturas únicas (string na API)
  linkclicks: string // total de cliques (string na API)
  uniquelinkclicks: string // cliques únicos (string na API)
  subscriberclicks: string // deprecated
  forwards: string // forwards
  uniqueforwards: string // unique forwards
  hardbounces: string // hard bounces
  softbounces: string // soft bounces
  unsubscribes: string // unsubscribes
  unsubreasons: string // unsub reasons
  updates: string // profile updates
  socialshares: string // social shares
  replies: string // replies
  uniquereplies: string // unique replies
  sdate?: string // data de envio (ISO)
  ldate?: string // última modificação
  lists?: string[] // IDs das listas
  p?: string[] // IDs de outras entidades relacionadas
}

export interface ACList {
  id: string
  name: string
  cdate: string
  p: string[] // IDs de outras entidades
  private: string // "1" or "0"
  userid: string
  subscriber_count?: string
}

export interface ACContact {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  cdate?: string // data de criação
  udate?: string // data de atualização
  // Outros campos podem existir, mas não são necessários para contar
}

export interface ACAutomation {
  id: string
  name: string
  status: string // "0" = inactive, "1" = active
  cdate: string // created date
  mdate: string // modified date
  entered: string // número de contatos que entraram (string na API)
  exited: string // número de contatos que saíram
}

export interface ACMessage {
  id: string
  campaignid?: string // ID da campanha associada
  contactid?: string // ID do contato
  cdate: string // data de criação/envio (ISO)
  
  // Status de interação
  opened_count?: string // número de aberturas
  clicked_count?: string // número de cliques
  link_clicked_count?: string // cliques em links
  
  // Flags de status (podem vir como "1"/"0" ou boolean)
  opened?: string | boolean // se foi aberto
  clicked?: string | boolean // se foi clicado
  bounced?: string | boolean // se teve bounce
  
  // Campos opcionais
  bounce_type?: string // tipo de bounce ("hard", "soft")
  user?: string // ID do usuário
  
  // Compatibilidade com API antiga
  sent?: string // data de envio (deprecated, use cdate)
}

// Rate limiting
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number // timestamp
}

