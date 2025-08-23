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
        <form className="profile-form" method="POST" action="/profile-setup">
          <div className="profile-field">
            <label className="profile-label">表示名</label>
            <input 
              type="text" 
              name="display_name" 
              className="profile-input"
              required
              maxLength="20"
            />
          </div>
          
          <div className="profile-field">
            <label className="profile-label">年代</label>
            <select name="age_group" className="profile-select" required>
              <option value="">選択してください</option>
              <option value="10代">10代</option>
              <option value="20代">20代</option>
              <option value="30代">30代</option>
              <option value="40代">40代</option>
              <option value="50代">50代</option>
              <option value="60代">60代</option>
              <option value="70代以上">70代以上</option>
            </select>
          </div>
          
          <div className="profile-field">
            <label className="profile-label">性別</label>
            <select name="gender" className="profile-select" required>
              <option value="">選択してください</option>
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他/無回答">その他/無回答</option>
            </select>
          </div>
          
          <div className="profile-field">
            <label className="profile-label">都道府県</label>
            <select name="prefecture" className="profile-select" required>
              <option value="">選択してください</option>
              <option value="北海道">北海道</option>
              <option value="青森県">青森県</option>
              <option value="岩手県">岩手県</option>
              <option value="宮城県">宮城県</option>
              <option value="秋田県">秋田県</option>
              <option value="山形県">山形県</option>
              <option value="福島県">福島県</option>
              <option value="茨城県">茨城県</option>
              <option value="栃木県">栃木県</option>
              <option value="群馬県">群馬県</option>
              <option value="埼玉県">埼玉県</option>
              <option value="千葉県">千葉県</option>
              <option value="東京都">東京都</option>
              <option value="神奈川県">神奈川県</option>
              <option value="新潟県">新潟県</option>
              <option value="富山県">富山県</option>
              <option value="石川県">石川県</option>
              <option value="福井県">福井県</option>
              <option value="山梨県">山梨県</option>
              <option value="長野県">長野県</option>
              <option value="岐阜県">岐阜県</option>
              <option value="静岡県">静岡県</option>
              <option value="愛知県">愛知県</option>
              <option value="三重県">三重県</option>
              <option value="滋賀県">滋賀県</option>
              <option value="京都府">京都府</option>
              <option value="大阪府">大阪府</option>
              <option value="兵庫県">兵庫県</option>
              <option value="奈良県">奈良県</option>
              <option value="和歌山県">和歌山県</option>
              <option value="鳥取県">鳥取県</option>
              <option value="島根県">島根県</option>
              <option value="岡山県">岡山県</option>
              <option value="広島県">広島県</option>
              <option value="山口県">山口県</option>
              <option value="徳島県">徳島県</option>
              <option value="香川県">香川県</option>
              <option value="愛媛県">愛媛県</option>
              <option value="高知県">高知県</option>
              <option value="福岡県">福岡県</option>
              <option value="佐賀県">佐賀県</option>
              <option value="長崎県">長崎県</option>
              <option value="熊本県">熊本県</option>
              <option value="大分県">大分県</option>
              <option value="宮崎県">宮崎県</option>
              <option value="鹿児島県">鹿児島県</option>
              <option value="沖縄県">沖縄県</option>
              <option value="海外">海外</option>
            </select>
          </div>
          
          <div className="profile-field">
            <label className="profile-label">自己紹介</label>
            <textarea 
              name="self_introduction" 
              className="profile-textarea"
              placeholder="自己紹介をご入力ください（任意）"
              maxLength="500"
              rows="4"
            ></textarea>
          </div>
          
          <div className="profile-actions">
            <button type="submit" className="next-btn">
              次へ：ホラー好み設定
            </button>
          </div>
        </form>
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

// Profile setup form handler
app.post('/profile-setup', passwordProtection, async (c) => {
  const formData = await c.req.formData()
  const displayName = formData.get('display_name')?.toString().trim()
  const ageGroup = formData.get('age_group')?.toString()
  const gender = formData.get('gender')?.toString()
  const prefecture = formData.get('prefecture')?.toString()
  const selfIntroduction = formData.get('self_introduction')?.toString().trim() || ''
  
  // バリデーション
  if (!displayName || !ageGroup || !gender || !prefecture) {
    return c.render(
      <div className="authenticated-body">
        <AuthenticatedHeader />
        <div className="profile-setup-container">
          <h1 className="profile-title">基本プロフィール</h1>
          <div className="error-message">必須項目をすべて入力してください</div>
          <a href="/profile-setup" className="btn btn-primary">戻る</a>
        </div>
      </div>
    )
  }
  
  // プロフィール情報をユーザーデータに保存（簡易実装）
  const currentUser = getCookie(c, 'current_user')
  if (currentUser && users.has(currentUser)) {
    const user = users.get(currentUser)
    users.set(currentUser, {
      ...user,
      profile: {
        displayName,
        ageGroup,
        gender,
        prefecture,
        selfIntroduction
      }
    })
  }
  
  // ホラー好み設定ページに移動
  return c.redirect('/horror-preferences')
})

// Horror preferences setup page (placeholder)
app.get('/horror-preferences', passwordProtection, (c) => {
  return c.render(
    <div className="authenticated-body">
      <AuthenticatedHeader />
      <div className="profile-setup-container">
        <h1 className="profile-title">初回ホラー好み設定</h1>
        
        <div className="setup-message">
          <p>基本プロフィールの設定が完了しました！</p>
          <p>ホラー好み設定の詳細は後ほど実装予定です。</p>
        </div>
        
        <div className="temp-actions">
          <a href="/" className="btn btn-primary">ホームに戻る</a>
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
