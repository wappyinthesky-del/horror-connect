import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>HorrorConnect</title>
        <link rel="stylesheet" href="/static/style.css" />
      </head>
      <body>
        {children}
        <script src="/static/register.js"></script>
      </body>
    </html>
  )
})