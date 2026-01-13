/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['*'],
    },
  },
  // Configuração de timeout para requisições
  // Next.js 15 usa esta config para routes e actions
  // https://nextjs.org/docs/app/api-reference/next-config-js/serverComponentsExternalPackages
  serverExternalPackages: ['prisma'],
}

module.exports = nextConfig

