import { router } from './routes'
import { connectMongo } from './libs/db'

const port = Number(Bun.env.PORT ?? 9000)
await connectMongo()

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)
    const method = req.method.toUpperCase()
    const matched = router.match(method, url.pathname)

    if (matched) {
      return matched.handler(req, matched.params, url.searchParams)
    }
    return Response.json({ message: 'Not Found' }, { status: 404 })
  }
})

console.log(`Server is running on http://localhost:${port}`)

// to do
