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
            Googleアカウントでログインし、SMS認証で登録を完了してください。
          </p>
        </div>
        
        <div className="google-login-section">
          <button className="google-login-btn" onclick="startGoogleLogin()">
            <span className="google-icon">G</span>
            Googleでログイン
          </button>
        </div>
      </div>
    </div>
  )
})

// Phone verification page
app.get('/phone-verify', (c) => {
  return c.render(
    <div className="register-container">
      <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
      
      <h1 className="title">SMS認証</h1>
      
      <form className="phone-form" method="POST" action="/phone-verify">
        <div className="form-group">
          <label className="form-label">携帯電話番号</label>
          <input 
            type="tel" 
            name="phone" 
            placeholder="090-1234-5678" 
            className="phone-input"
            required 
          />
        </div>
        
        <button type="submit" className="verify-btn">認証コードを送信</button>
      </form>
      
      <div id="sms-verify-section" style="display: none;">
        <form className="sms-form" method="POST" action="/sms-verify">
          <div className="form-group">
            <label className="form-label">認証コード</label>
            <input 
              type="text" 
              name="code" 
              placeholder="6桁の認証コード" 
              className="code-input"
              maxlength="6"
              required 
            />
          </div>
          <button type="submit" className="complete-btn">認証完了</button>
        </form>
      </div>
    </div>
  )
})

// Phone verification handler
app.post('/phone-verify', async (c) => {
  const formData = await c.req.formData()
  const phone = formData.get('phone')
  
  // シミュレート：実際のSMS送信処理をここに実装
  // const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
  
  return c.render(
    <div className="register-container">
      <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
      
      <h1 className="title">SMS認証</h1>
      
      <div className="success-message">
        {phone} に認証コードを送信しました
      </div>
      
      <form className="sms-form" method="POST" action="/sms-verify">
        <input type="hidden" name="phone" value={phone as string} />
        <div className="form-group">
          <label className="form-label">認証コード</label>
          <input 
            type="text" 
            name="code" 
            placeholder="6桁の認証コード" 
            className="code-input"
            maxlength="6"
            required 
          />
        </div>
        <button type="submit" className="complete-btn">認証完了</button>
      </form>
    </div>
  )
})

// SMS verification handler
app.post('/sms-verify', async (c) => {
  const formData = await c.req.formData()
  const phone = formData.get('phone')
  const code = formData.get('code')
  
  // シミュレート：実際の認証コード検証をここに実装
  if (code && code.toString().length === 6) {
    // 会員登録完了 - セッションに保存
    setCookie(c, 'horror_auth', 'authenticated', {
      maxAge: 60 * 60 * 24 * 30, // 30 days for auto-login
      httpOnly: true,
      secure: false
    })
    setCookie(c, 'user_phone', phone as string, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: false
    })
    
    return c.redirect('/profile-setup')
  } else {
    return c.render(
      <div className="register-container">
        <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
        
        <h1 className="title">SMS認証</h1>
        
        <div className="error-message">認証コードが正しくありません</div>
        
        <form className="sms-form" method="POST" action="/sms-verify">
          <input type="hidden" name="phone" value={phone as string} />
          <div className="form-group">
            <label className="form-label">認証コード</label>
            <input 
              type="text" 
              name="code" 
              placeholder="6桁の認証コード" 
              className="code-input"
              maxlength="6"
              required 
            />
          </div>
          <button type="submit" className="complete-btn">認証完了</button>
        </form>
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
