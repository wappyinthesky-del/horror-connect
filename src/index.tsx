import { Hono } from 'hono'
import { renderer } from './renderer'
import { getCookie, setCookie } from 'hono/cookie'

const app = new Hono()

app.use(renderer)

// Password protection middleware
const passwordProtection = async (c: any, next: any) => {
  const isAuthenticated = getCookie(c, 'horror_auth')
  if (isAuthenticated === 'authenticated') {
    await next()
  } else {
    return c.redirect('/login')
  }
}

// Login page
app.get('/login', (c) => {
  return c.render(
    <div className="login-container">
      <div className="ghost-logo-static">
        <div className="ghost-eyes">
          <div className="eye"></div>
          <div className="eye"></div>
        </div>
      </div>
      
      <h1 className="title">HorrorConnect</h1>
      
      <form className="login-form" method="POST" action="/login">
        <input 
          type="password" 
          name="password" 
          placeholder="パスワードを入力してください" 
          className="password-input"
          required 
        />
        <button type="submit" className="login-btn">ログイン</button>
      </form>
    </div>
  )
})

// Login form handler
app.post('/login', async (c) => {
  const formData = await c.req.formData()
  const password = formData.get('password')
  
  if (password === '19861225') {
    setCookie(c, 'horror_auth', 'authenticated', {
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: false // Set to true in production with HTTPS
    })
    return c.redirect('/')
  } else {
    return c.render(
      <div className="login-container">
        <div className="ghost-logo-static">
          <div className="ghost-eyes">
            <div className="eye"></div>
            <div className="eye"></div>
          </div>
        </div>
        
        <h1 className="title">HorrorConnect</h1>
        
        <div className="error-message">パスワードが間違っています</div>
        
        <form className="login-form" method="POST" action="/login">
          <input 
            type="password" 
            name="password" 
            placeholder="パスワードを入力してください" 
            className="password-input"
            required 
          />
          <button type="submit" className="login-btn">ログイン</button>
        </form>
      </div>
    )
  }
})

// Protected main page
app.get('/', passwordProtection, (c) => {
  return c.render(
    <div className="welcome-container">
      <div className="content-card">
        {/* Ghost Logo */}
        <div className="ghost-logo">
          <div className="ghost-eyes">
            <div className="eye"></div>
            <div className="eye"></div>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="main-title">
          ホラー好きのための<br />Webアプリ
        </h1>
        
        {/* App Name */}
        <h2 className="app-name">HorrorConnect</h2>
        
        {/* Description Text */}
        <p className="description-text">
          同じホラーの趣味を持つ仲間と繋がろう。<br />
          あなたの好みに合った人と出会って、<br />
          一緒にホラーイベントに参加したり、<br />
          怖い話を共有しよう。
        </p>
        
        {/* CTA Buttons */}
        <div className="cta-buttons">
          <a href="/register" className="btn btn-primary">会員登録</a>
          <a href="/login" className="btn btn-secondary">ログイン</a>
        </div>
      </div>
    </div>
  )
})

export default app
