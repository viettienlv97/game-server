type Handler = (
  req: Request,
  params: Record<string, string>,
  query: URLSearchParams
) => Response | Promise<Response>

interface Route {
  method: string
  pattern: string
  handler: Handler
}

export class Router {
  private routes: Route[] = []

  on(method: string, pattern: string, handler: Handler) {
    this.routes.push({ method, pattern, handler })
  }

  match(
    method: string,
    pathname: string
  ): { handler: Handler; params: Record<string, string> } | null {
    for (const r of this.routes) {
      if (r.method !== method) continue

      const routeParts = r.pattern.split('/').filter(Boolean)
      const pathParts = pathname.split('/').filter(Boolean)
      if (routeParts.length !== pathParts.length) continue

      const params: Record<string, string> = {}
      let matched = true

      for (let i = 0; i < routeParts.length; i++) {
        const routePart = routeParts[i]
        const pathPart = pathParts[i]

        if (routePart && routePart.startsWith(':')) {
          const key = routePart.slice(1)
          params[key] = pathPart ? decodeURIComponent(pathPart) : ''
        } else if (routePart !== pathPart) {
          matched = false
          break
        }
      }

      if (matched) return { handler: r.handler, params }
    }
    return null
  }
}
