import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://cheapfollower.shop'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/payments/',
          '/login',
          '/signup',
          '/*.json',
          '/*?*', // Block URL parameters to avoid duplicate content
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
