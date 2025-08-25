import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>HorrorConnect</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/static/style.min.css?v=5" />
        <link rel="stylesheet" href="/static/feed-styles-optimized.css?v=3" />
        <link rel="stylesheet" href="/static/feed-layout-override.css?v=3" />
        <link rel="stylesheet" href="/static/board.css?v=1" />
        <link rel="stylesheet" href="/static/event.css?v=1" />
        <link rel="stylesheet" href="/static/dm.css?v=1" />
      </head>
      <body>
        {children}
        <script src="/static/register.min.js?v=3"></script>
        <script src="/static/feed-optimized.js?v=3"></script>
        <script src="/static/match.js?v=3"></script>
        <script src="/static/board.js?v=1"></script>
        <script src="/static/event.js?v=1"></script>
        <script src="/static/dm.js?v=1"></script>
      </body>
    </html>
  )
})