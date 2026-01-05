import { sleep } from '@/lib/utils'
import type { ACApiResponse, RateLimitInfo } from './types'

export interface ACClientConfig {
  baseUrl: string // https://account.api-us1.com
  apiKey: string
}

export class ActiveCampaignClient {
  private baseUrl: string
  private apiKey: string
  private rateLimitInfo: RateLimitInfo | null = null

  constructor(config: ACClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // remove trailing slash
    this.apiKey = config.apiKey
  }

  // Getters públicos para APIs que precisam acessar credenciais (ex: API v1)
  getBaseUrl(): string {
    return this.baseUrl
  }

  getApiKey(): string {
    return this.apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ACApiResponse<T>> {
    const url = `${this.baseUrl}/api/3${endpoint}`
    
    const headers = {
      'Api-Token': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    let attempt = 0
    const maxAttempts = 3

    while (attempt < maxAttempts) {
      try {
        // Rate limiting: aguardar se necessário
        if (this.rateLimitInfo && this.rateLimitInfo.remaining < 2) {
          const waitTime = Math.max(1000, this.rateLimitInfo.reset - Date.now())
          console.log(`⏳ Rate limit baixo, aguardando ${waitTime}ms...`)
          await sleep(waitTime)
        }

        const response = await fetch(url, {
          ...options,
          headers,
        })

        // Atualizar info de rate limit
        const remaining = response.headers.get('X-RateLimit-Remaining')
        const reset = response.headers.get('X-RateLimit-Reset')
        if (remaining && reset) {
          this.rateLimitInfo = {
            limit: 5,
            remaining: parseInt(remaining, 10),
            reset: parseInt(reset, 10) * 1000, // converter para ms
          }
        }

        if (!response.ok) {
          // Rate limit hit
          if (response.status === 429) {
            attempt++
            const backoff = Math.pow(2, attempt) * 1000
            console.log(`⚠️  429 Rate Limit, retry ${attempt}/${maxAttempts} após ${backoff}ms`)
            await sleep(backoff)
            continue
          }

          // Outros erros
          const errorText = await response.text()
          throw new Error(
            `ActiveCampaign API error: ${response.status} ${response.statusText} - ${errorText}`
          )
        }

        const data = await response.json()
        return data as ACApiResponse<T>
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error
        }
        attempt++
        const backoff = Math.pow(2, attempt) * 1000
        console.log(`⚠️  Erro na requisição, retry ${attempt}/${maxAttempts} após ${backoff}ms`)
        await sleep(backoff)
      }
    }

    throw new Error('Max retry attempts reached')
  }

  async get<T>(endpoint: string): Promise<ACApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, body: unknown): Promise<ACApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Pagina automaticamente através de todos os resultados
   */
  async *paginate<T>(
    endpoint: string,
    limit: number = 100
  ): AsyncGenerator<T[], void, unknown> {
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const separator = endpoint.includes('?') ? '&' : '?'
      const url = `${endpoint}${separator}limit=${limit}&offset=${offset}`
      
      const response = await this.get<T[]>(url)
      
      // A resposta tem a chave do recurso (ex: "campaigns", "lists")
      // e também pode ter "meta"
      const resourceKey = Object.keys(response).find(k => k !== 'meta')
      if (!resourceKey) {
        break
      }

      const items = response[resourceKey] as T[]
      if (!items || items.length === 0) {
        break
      }

      yield items

      // Checar se há mais resultados
      const meta = response.meta
      if (meta && meta.total !== undefined) {
        hasMore = offset + items.length < meta.total
      } else {
        // Se não tiver meta, continuar enquanto tiver resultados completos
        hasMore = items.length === limit
      }

      offset += limit
    }
  }
}

