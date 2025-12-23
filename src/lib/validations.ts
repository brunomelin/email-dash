import { z } from 'zod'

/**
 * Schema de validação para contas do ActiveCampaign
 */
export const accountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  baseUrl: z
    .string()
    .url('URL inválida')
    .refine(
      (url) => url.includes('activecampaign.com') || url.includes('api-us'),
      'Deve ser uma URL do ActiveCampaign (ex: https://account.api-us1.com)'
    ),
  apiKey: z.string().min(10, 'API Key inválida').max(200, 'API Key muito longa'),
  isActive: z.boolean().default(true),
})

export type AccountFormData = z.infer<typeof accountSchema>

/**
 * Schema para atualização (campos opcionais)
 */
export const accountUpdateSchema = accountSchema.partial().extend({
  id: z.string().cuid(),
})

export type AccountUpdateData = z.infer<typeof accountUpdateSchema>

