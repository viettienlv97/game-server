import { router } from './routes'
import { connectMongo } from './libs/db'
import { cors } from './middlewares/cors'

const port = Number(Bun.env.PORT ?? 9000)
await connectMongo()

Bun.serve({
  port,
  async fetch(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      const corsResponse = cors(req)
      return corsResponse instanceof Response
        ? corsResponse
        : new Response(null, { status: 204, headers: corsResponse })
    }

    const url = new URL(req.url)
    const method = req.method.toUpperCase()
    const matched = router.match(method, url.pathname)

    // Get CORS headers
    const corsHeaders = cors(req)
    const headers = corsHeaders instanceof Response ? {} : corsHeaders

    if (matched) {
      const response = await matched.handler(
        req,
        matched.params,
        url.searchParams
      )
      // Apply CORS headers to response
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, String(value))
      })
      return response
    }

    return Response.json(
      { message: 'Not Found' },
      {
        status: 404,
        headers
      }
    )
  }
})

console.log(`Server is running on http://localhost:${port}`)

// to do
