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
      <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
      
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
        <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
        
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

// Registration page
app.get('/register', (c) => {
  return c.render(
    <div className="register-container">
      <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
      
      <h1 className="title">会員登録</h1>
      
      <div className="register-steps">
        <div className="step-info">
          <p className="step-description">
            Googleアカウントでログインして登録を完了してください。
          </p>
        </div>
        
        <div className="google-login-section">
          <a href="/auth/google" className="google-login-btn">
            <span className="google-icon">G</span>
            Googleでログイン
          </a>
        </div>
      </div>
    </div>
  )
})

// Google OAuth redirect
app.get('/auth/google', (c) => {
  // Google OAuth 2.0 認証URL
  const googleClientId = 'demo-client-id' // 実際の環境では環境変数から取得
  const redirectUri = encodeURIComponent('https://3000-itxt8e1lemvt4494ldvyl-6532622b.e2b.dev/auth/google/callback')
  const scope = encodeURIComponent('openid profile email')
  
  const googleAuthUrl = `https://accounts.google.com/oauth/authorize?` +
    `client_id=${googleClientId}&` +
    `redirect_uri=${redirectUri}&` +
    `scope=${scope}&` +
    `response_type=code&` +
    `access_type=offline`
  
  return c.redirect(googleAuthUrl)
})

// Google OAuth callback (シミュレート用)
app.get('/auth/google/callback', async (c) => {
  // 実際の実装では、認証コードを使ってアクセストークンを取得し、
  // ユーザー情報を取得します。ここではシミュレートします。
  
  const code = c.req.query('code')
  
  if (code) {
    // Google認証成功をシミュレート
    // 実際の実装では、ここでユーザー情報を取得してデータベースに保存
    const mockUserInfo = {
      id: 'google_12345',
      email: 'user@example.com',
      name: 'サンプルユーザー'
    }
    
    // 会員登録完了 - セッションに保存
    setCookie(c, 'horror_auth', 'authenticated', {
      maxAge: 60 * 60 * 24 * 30, // 30 days for auto-login
      httpOnly: true,
      secure: false
    })
    setCookie(c, 'google_user', JSON.stringify(mockUserInfo), {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: false
    })
    
    return c.redirect('/profile-setup')
  } else {
    // 認証失敗
    return c.render(
      <div className="register-container">
        <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
        
        <h1 className="title">認証エラー</h1>
        
        <div className="error-message">
          Google認証に失敗しました。もう一度お試しください。
        </div>
        
        <div className="temp-actions">
          <a href="/register" className="btn btn-primary">会員登録に戻る</a>
        </div>
      </div>
    )
  }
})

// Initial profile setup page
app.get('/profile-setup', passwordProtection, (c) => {
  return c.render(
    <div className="profile-setup-container">
      <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
      
      <h1 className="title">初回プロフィール設定</h1>
      
      <div className="setup-message">
        <p>会員登録が完了しました！</p>
        <p>プロフィール設定の詳細は後ほど実装予定です。</p>
      </div>
      
      <div className="temp-actions">
        <a href="/" className="btn btn-primary">ホームに戻る</a>
      </div>
    </div>
  )
})

// Protected main page
app.get('/', passwordProtection, (c) => {
  return c.render(
    <div className="welcome-container">
      <div className="content-card">
        {/* Ghost Logo */}
        <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />

        {/* Main Title */}
        <h1 className="main-title">
          ホラー好きのための<br />Webアプリ
        </h1>
        
        {/* App Name */}
        <h2 className="app-name">HorrorConnect</h2>
        
        {/* Description Text */}
        <p className="description-text">
          同じホラーの趣味を持つ仲間と繋がろう。あなたの好みに合った人と出会って、一緒にホラーイベントに参加したり、怖い話を共有しよう。
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
