import { serve } from 'bun'
import { routes } from './src/routes'

const fakeData = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
]

const server = serve({
  port: 3000,
  routes

  // fetch(req) {
  //   return Response.json({
  //     message: 'Hello, Bun!',
  //     data: fakeData
  //   })
  // }
})

console.log(`Server running at http://localhost:${server.port}/`)
