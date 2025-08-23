import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>HorrorConnect - ホラー好きのためのWebアプリ</title>
        <meta name="description" content="ホラー映画、ホラー小説、ホラーゲーム好きが集まるWebアプリ" />
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body>
        {children}
        <script src="/static/register.js"></script>
      </body>
    </html>
  )
})
