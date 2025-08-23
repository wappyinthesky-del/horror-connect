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
          type="text" 
          name="userid" 
          placeholder="ユーザーID（または管理者の場合は空欄）" 
          className="form-input"
        />
        <input 
          type="password" 
          name="password" 
          placeholder="パスワードを入力してください" 
          className="form-input"
          required 
        />
        <button type="submit" className="login-btn">ログイン</button>
      </form>
      
      <div className="register-link">
        <p>アカウントをお持ちでない方は <a href="/register">こちら</a></p>
      </div>
    </div>
  )
})

// Login form handler (管理者パスワード + ユーザーログイン対応)
app.post('/login', async (c) => {
  const formData = await c.req.formData()
  const userid = formData.get('userid')?.toString()
  const password = formData.get('password')?.toString()
  
  // 管理者パスワードでのログイン（既存機能維持）
  if (!userid && password === '19861225') {
    setCookie(c, 'horror_auth', 'authenticated', {
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: false
    })
    setCookie(c, 'current_user', 'admin', {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      secure: false
    })
    return c.redirect('/')
  }
  
  // ユーザーログイン
  if (userid && password) {
    const user = users.get(userid)
    if (user && user.password === password) {
      setCookie(c, 'horror_auth', 'authenticated', {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: false
      })
      setCookie(c, 'current_user', userid, {
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        secure: false
      })
      return c.redirect('/')
    }
  }
  
  // ログイン失敗
  return c.render(
    <div className="login-container">
      <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
      
      <h1 className="title">HorrorConnect</h1>
      
      <div className="error-message">ユーザーIDまたはパスワードが間違っています</div>
      
      <form className="login-form" method="POST" action="/login">
        <input 
          type="text" 
          name="userid" 
          placeholder="ユーザーID（または管理者の場合は空欄）" 
          className="form-input"
        />
        <input 
          type="password" 
          name="password" 
          placeholder="パスワードを入力してください" 
          className="form-input"
          required 
        />
        <button type="submit" className="login-btn">ログイン</button>
      </form>
      
      <div className="register-link">
        <p>アカウントをお持ちでない方は <a href="/register">こちら</a></p>
      </div>
    </div>
  )
})

// Registration page
app.get('/register', (c) => {
  return c.render(
    <div className="register-container">
      <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
      
      <h1 className="title">会員登録</h1>
      
      <form className="register-form" method="POST" action="/register">
        <div className="form-group">
          <input 
            type="text" 
            name="userid" 
            placeholder="ユーザーIDを入力してください" 
            className="form-input"
            required 
            minLength="3"
            maxLength="20"
          />
        </div>
        
        <div className="form-group">
          <input 
            type="password" 
            name="password" 
            id="password"
            placeholder="パスワードを入力してください" 
            className="form-input"
            required 
            minLength="6"
          />
        </div>
        
        <div className="form-group">
          <input 
            type="password" 
            name="password_confirm" 
            id="password_confirm"
            placeholder="パスワード（確認用）を入力してください" 
            className="form-input"
            required 
            minLength="6"
          />
        </div>
        
        <div id="password-error" className="error-message" style="display: none;">
          パスワードが一致しません
        </div>
        
        <button type="submit" id="register-btn" className="register-btn" disabled>
          登録
        </button>
      </form>
      
      <div className="login-link">
        <p>既にアカウントをお持ちの方は <a href="/login">こちら</a></p>
      </div>
    </div>
  )
})

// Header component for authenticated pages
const AuthenticatedHeader = () => (
  <header className="fixed-header">
    <a href="/" className="header-logo">
      <div className="header-ghost"></div>
      <h1 className="header-title">HorrorConnect</h1>
    </a>
  </header>
)

// Simple in-memory user storage (本番環境では適切なデータベースを使用)
const users = new Map()

// Registration form handler
app.post('/register', async (c) => {
  const formData = await c.req.formData()
  const userid = formData.get('userid')?.toString().trim()
  const password = formData.get('password')?.toString()
  const passwordConfirm = formData.get('password_confirm')?.toString()
  
  // バリデーション
  if (!userid || !password || !passwordConfirm) {
    return c.render(
      <div className="register-container">
        <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
        <h1 className="title">会員登録</h1>
        <div className="error-message">すべての項目を入力してください</div>
        <a href="/register" className="btn btn-primary">戻る</a>
      </div>
    )
  }
  
  if (password !== passwordConfirm) {
    return c.render(
      <div className="register-container">
        <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
        <h1 className="title">会員登録</h1>
        <div className="error-message">パスワードが一致しません</div>
        <a href="/register" className="btn btn-primary">戻る</a>
      </div>
    )
  }
  
  if (users.has(userid)) {
    return c.render(
      <div className="register-container">
        <img src="/static/ghost.png" alt="HorrorConnect Ghost" className="ghost-image" />
        <h1 className="title">会員登録</h1>
        <div className="error-message">そのユーザーIDは既に使用されています</div>
        <a href="/register" className="btn btn-primary">戻る</a>
      </div>
    )
  }
  
  // ユーザー登録
  users.set(userid, {
    userid,
    password,
    createdAt: new Date().toISOString()
  })
  
  // 登録成功 - 自動ログイン
  setCookie(c, 'horror_auth', 'authenticated', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: false
  })
  setCookie(c, 'current_user', userid, {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    secure: false
  })
  
  return c.redirect('/profile-setup')
})

// Initial profile setup page
app.get('/profile-setup', passwordProtection, (c) => {
  return c.render(
    <div className="authenticated-body">
      <AuthenticatedHeader />
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
    </div>
  )
})

// Protected main page
app.get('/', passwordProtection, (c) => {
  return c.render(
    <div className="authenticated-body">
      <AuthenticatedHeader />
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
          
          {/* CTA Buttons - Update for authenticated users */}
          <div className="cta-buttons">
            <a href="/profile-setup" className="btn btn-primary">プロフィール設定</a>
            <a href="/logout" className="btn btn-secondary">ログアウト</a>
          </div>
        </div>
      </div>
    </div>
  )
})

// Logout handler
app.get('/logout', (c) => {
  // Clear authentication cookies
  setCookie(c, 'horror_auth', '', {
    maxAge: 0,
    httpOnly: true,
    secure: false
  })
  setCookie(c, 'current_user', '', {
    maxAge: 0,
    httpOnly: true,
    secure: false
  })
  
  return c.redirect('/login')
})

export default app
