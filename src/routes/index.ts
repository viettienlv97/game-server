enum Routes {
  Root = '/',
  Login = '/login',
  Register = '/register',
  Profile = '/profile'
}

export const routes = {
  [Routes.Root]: (req: Bun.BunRequest) => {
    console.log(req)
    return Response.json({
      message: 'Hello, Bun!',
      data: ''
    })
  },
  [Routes.Login]: (req: Bun.BunRequest) =>
    Response.json({
      message: 'Login route',
      data: ''
    }),
  [Routes.Register]: (req: Bun.BunRequest) => {
    return Response.json({
      message: 'Register route',
      data: ''
    })
  }
}
