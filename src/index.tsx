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

// Horror preferences setup page
app.get('/horror-preferences', passwordProtection, (c) => {
  return c.render(
    <div className="authenticated-body">
      <AuthenticatedHeader />
      <div className="horror-preferences-container">
        <h2 className="media-title">好きなホラー媒体(複数回答)</h2>
        
        <form className="media-selection-form" method="POST" action="/horror-preferences">
          <div className="media-grid">
            <div className="media-option" data-value="映画">
              <input type="checkbox" name="media_types" value="映画" id="media_movie" className="media-checkbox" />
              <label htmlFor="media_movie" className="media-label">映画</label>
            </div>
            
            <div className="media-option" data-value="動画">
              <input type="checkbox" name="media_types" value="動画" id="media_video" className="media-checkbox" />
              <label htmlFor="media_video" className="media-label">動画</label>
            </div>
            
            <div className="media-option" data-value="音声">
              <input type="checkbox" name="media_types" value="音声" id="media_audio" className="media-checkbox" />
              <label htmlFor="media_audio" className="media-label">音声</label>
            </div>
            
            <div className="media-option" data-value="書籍">
              <input type="checkbox" name="media_types" value="書籍" id="media_book" className="media-checkbox" />
              <label htmlFor="media_book" className="media-label">書籍</label>
            </div>
            
            <div className="media-option" data-value="漫画">
              <input type="checkbox" name="media_types" value="漫画" id="media_manga" className="media-checkbox" />
              <label htmlFor="media_manga" className="media-label">漫画</label>
            </div>
            
            <div className="media-option" data-value="ネット/SNS投稿">
              <input type="checkbox" name="media_types" value="ネット/SNS投稿" id="media_sns" className="media-checkbox" />
              <label htmlFor="media_sns" className="media-label">ネット/SNS投稿</label>
            </div>
            
            <div className="media-option" data-value="ゲーム">
              <input type="checkbox" name="media_types" value="ゲーム" id="media_game" className="media-checkbox" />
              <label htmlFor="media_game" className="media-label">ゲーム</label>
            </div>
            
            <div className="media-option" data-value="ARG">
              <input type="checkbox" name="media_types" value="ARG" id="media_arg" className="media-checkbox" />
              <label htmlFor="media_arg" className="media-label">ARG</label>
            </div>
            
            <div className="media-option" data-value="TRPG">
              <input type="checkbox" name="media_types" value="TRPG" id="media_trpg" className="media-checkbox" />
              <label htmlFor="media_trpg" className="media-label">TRPG</label>
            </div>
            
            <div className="media-option" data-value="体感型イベント">
              <input type="checkbox" name="media_types" value="体感型イベント" id="media_event" className="media-checkbox" />
              <label htmlFor="media_event" className="media-label">体感型イベント</label>
            </div>
            
            <div className="media-option" data-value="実体験">
              <input type="checkbox" name="media_types" value="実体験" id="media_experience" className="media-checkbox" />
              <label htmlFor="media_experience" className="media-label">実体験</label>
            </div>
          </div>
          
          <h2 className="genre-title">好きなホラージャンル(複数回答)</h2>
          
          <div className="genre-grid">
            <div className="genre-option" data-value="怪談">
              <input type="checkbox" name="genre_types" value="怪談" id="genre_kaidan" className="genre-checkbox" />
              <label htmlFor="genre_kaidan" className="genre-label">怪談</label>
            </div>
            
            <div className="genre-option" data-value="怪談師">
              <input type="checkbox" name="genre_types" value="怪談師" id="genre_kaidanshi" className="genre-checkbox" />
              <label htmlFor="genre_kaidanshi" className="genre-label">怪談師</label>
            </div>
            
            <div className="genre-option" data-value="怪談朗読">
              <input type="checkbox" name="genre_types" value="怪談朗読" id="genre_kaidan_reading" className="genre-checkbox" />
              <label htmlFor="genre_kaidan_reading" className="genre-label">怪談朗読</label>
            </div>
            
            <div className="genre-option" data-value="ゆっくり怪談朗読">
              <input type="checkbox" name="genre_types" value="ゆっくり怪談朗読" id="genre_yukkuri_kaidan" className="genre-checkbox" />
              <label htmlFor="genre_yukkuri_kaidan" className="genre-label">ゆっくり怪談朗読</label>
            </div>
            
            <div className="genre-option" data-value="都市伝説">
              <input type="checkbox" name="genre_types" value="都市伝説" id="genre_urban_legend" className="genre-checkbox" />
              <label htmlFor="genre_urban_legend" className="genre-label">都市伝説</label>
            </div>
            
            <div className="genre-option" data-value="民話/伝承">
              <input type="checkbox" name="genre_types" value="民話/伝承" id="genre_folklore" className="genre-checkbox" />
              <label htmlFor="genre_folklore" className="genre-label">民話/伝承</label>
            </div>
            
            <div className="genre-option" data-value="呪物">
              <input type="checkbox" name="genre_types" value="呪物" id="genre_cursed_object" className="genre-checkbox" />
              <label htmlFor="genre_cursed_object" className="genre-label">呪物</label>
            </div>
            
            <div className="genre-option" data-value="幽霊">
              <input type="checkbox" name="genre_types" value="幽霊" id="genre_ghost" className="genre-checkbox" />
              <label htmlFor="genre_ghost" className="genre-label">幽霊</label>
            </div>
            
            <div className="genre-option" data-value="悪魔">
              <input type="checkbox" name="genre_types" value="悪魔" id="genre_demon" className="genre-checkbox" />
              <label htmlFor="genre_demon" className="genre-label">悪魔</label>
            </div>
            
            <div className="genre-option" data-value="妖怪">
              <input type="checkbox" name="genre_types" value="妖怪" id="genre_yokai" className="genre-checkbox" />
              <label htmlFor="genre_yokai" className="genre-label">妖怪</label>
            </div>
            
            <div className="genre-option" data-value="UMA">
              <input type="checkbox" name="genre_types" value="UMA" id="genre_uma" className="genre-checkbox" />
              <label htmlFor="genre_uma" className="genre-label">UMA</label>
            </div>
            
            <div className="genre-option" data-value="宇宙人/レプティリアン">
              <input type="checkbox" name="genre_types" value="宇宙人/レプティリアン" id="genre_alien" className="genre-checkbox" />
              <label htmlFor="genre_alien" className="genre-label">宇宙人/レプティリアン</label>
            </div>
            
            <div className="genre-option" data-value="モンスター/クリーチャー">
              <input type="checkbox" name="genre_types" value="モンスター/クリーチャー" id="genre_monster" className="genre-checkbox" />
              <label htmlFor="genre_monster" className="genre-label">モンスター/クリーチャー</label>
            </div>
            
            <div className="genre-option" data-value="魔女">
              <input type="checkbox" name="genre_types" value="魔女" id="genre_witch" className="genre-checkbox" />
              <label htmlFor="genre_witch" className="genre-label">魔女</label>
            </div>
            
            <div className="genre-option" data-value="ピエロ">
              <input type="checkbox" name="genre_types" value="ピエロ" id="genre_clown" className="genre-checkbox" />
              <label htmlFor="genre_clown" className="genre-label">ピエロ</label>
            </div>
            
            <div className="genre-option" data-value="カルト">
              <input type="checkbox" name="genre_types" value="カルト" id="genre_cult" className="genre-checkbox" />
              <label htmlFor="genre_cult" className="genre-label">カルト</label>
            </div>
            
            <div className="genre-option" data-value="異世界">
              <input type="checkbox" name="genre_types" value="異世界" id="genre_otherworld" className="genre-checkbox" />
              <label htmlFor="genre_otherworld" className="genre-label">異世界</label>
            </div>
            
            <div className="genre-option" data-value="不思議">
              <input type="checkbox" name="genre_types" value="不思議" id="genre_mystery" className="genre-checkbox" />
              <label htmlFor="genre_mystery" className="genre-label">不思議</label>
            </div>
            
            <div className="genre-option" data-value="人怖">
              <input type="checkbox" name="genre_types" value="人怖" id="genre_human_horror" className="genre-checkbox" />
              <label htmlFor="genre_human_horror" className="genre-label">人怖</label>
            </div>
            
            <div className="genre-option" data-value="洒落怖">
              <input type="checkbox" name="genre_types" value="洒落怖" id="genre_share_kowai" className="genre-checkbox" />
              <label htmlFor="genre_share_kowai" className="genre-label">洒落怖</label>
            </div>
            
            <div className="genre-option" data-value="意味怖">
              <input type="checkbox" name="genre_types" value="意味怖" id="genre_imi_kowai" className="genre-checkbox" />
              <label htmlFor="genre_imi_kowai" className="genre-label">意味怖</label>
            </div>
            
            <div className="genre-option" data-value="SCP">
              <input type="checkbox" name="genre_types" value="SCP" id="genre_scp" className="genre-checkbox" />
              <label htmlFor="genre_scp" className="genre-label">SCP</label>
            </div>
            
            <div className="genre-option" data-value="ジャンプスケア">
              <input type="checkbox" name="genre_types" value="ジャンプスケア" id="genre_jump_scare" className="genre-checkbox" />
              <label htmlFor="genre_jump_scare" className="genre-label">ジャンプスケア</label>
            </div>
            
            <div className="genre-option" data-value="パニックスリラー">
              <input type="checkbox" name="genre_types" value="パニックスリラー" id="genre_panic_thriller" className="genre-checkbox" />
              <label htmlFor="genre_panic_thriller" className="genre-label">パニックスリラー</label>
            </div>
            
            <div className="genre-option" data-value="アナログホラー">
              <input type="checkbox" name="genre_types" value="アナログホラー" id="genre_analog_horror" className="genre-checkbox" />
              <label htmlFor="genre_analog_horror" className="genre-label">アナログホラー</label>
            </div>
            
            <div className="genre-option" data-value="サイコホラー">
              <input type="checkbox" name="genre_types" value="サイコホラー" id="genre_psycho_horror" className="genre-checkbox" />
              <label htmlFor="genre_psycho_horror" className="genre-label">サイコホラー</label>
            </div>
            
            <div className="genre-option" data-value="サスペンスホラー">
              <input type="checkbox" name="genre_types" value="サスペンスホラー" id="genre_suspense_horror" className="genre-checkbox" />
              <label htmlFor="genre_suspense_horror" className="genre-label">サスペンスホラー</label>
            </div>
            
            <div className="genre-option" data-value="コズミックホラー">
              <input type="checkbox" name="genre_types" value="コズミックホラー" id="genre_cosmic_horror" className="genre-checkbox" />
              <label htmlFor="genre_cosmic_horror" className="genre-label">コズミックホラー</label>
            </div>
            
            <div className="genre-option" data-value="ゴシックホラー">
              <input type="checkbox" name="genre_types" value="ゴシックホラー" id="genre_gothic_horror" className="genre-checkbox" />
              <label htmlFor="genre_gothic_horror" className="genre-label">ゴシックホラー</label>
            </div>
            
            <div className="genre-option" data-value="フォークホラー">
              <input type="checkbox" name="genre_types" value="フォークホラー" id="genre_folk_horror" className="genre-checkbox" />
              <label htmlFor="genre_folk_horror" className="genre-label">フォークホラー</label>
            </div>
            
            <div className="genre-option" data-value="SFホラー">
              <input type="checkbox" name="genre_types" value="SFホラー" id="genre_sf_horror" className="genre-checkbox" />
              <label htmlFor="genre_sf_horror" className="genre-label">SFホラー</label>
            </div>
            
            <div className="genre-option" data-value="ホラーコメディ">
              <input type="checkbox" name="genre_types" value="ホラーコメディ" id="genre_horror_comedy" className="genre-checkbox" />
              <label htmlFor="genre_horror_comedy" className="genre-label">ホラーコメディ</label>
            </div>
            
            <div className="genre-option" data-value="スラッシャー/スプラッタ/Gore">
              <input type="checkbox" name="genre_types" value="スラッシャー/スプラッタ/Gore" id="genre_slasher" className="genre-checkbox" />
              <label htmlFor="genre_slasher" className="genre-label">スラッシャー/スプラッタ/Gore</label>
            </div>
            
            <div className="genre-option" data-value="モキュメンタリー">
              <input type="checkbox" name="genre_types" value="モキュメンタリー" id="genre_mockumentary" className="genre-checkbox" />
              <label htmlFor="genre_mockumentary" className="genre-label">モキュメンタリー</label>
            </div>
            
            <div className="genre-option" data-value="ファウンドフッテージ">
              <input type="checkbox" name="genre_types" value="ファウンドフッテージ" id="genre_found_footage" className="genre-checkbox" />
              <label htmlFor="genre_found_footage" className="genre-label">ファウンドフッテージ</label>
            </div>
            
            <div className="genre-option" data-value="ARG">
              <input type="checkbox" name="genre_types" value="ARG" id="genre_arg_game" className="genre-checkbox" />
              <label htmlFor="genre_arg_game" className="genre-label">ARG</label>
            </div>
            
            <div className="genre-option" data-value="TRPG">
              <input type="checkbox" name="genre_types" value="TRPG" id="genre_trpg_game" className="genre-checkbox" />
              <label htmlFor="genre_trpg_game" className="genre-label">TRPG</label>
            </div>
            
            <div className="genre-option" data-value="バックルーム">
              <input type="checkbox" name="genre_types" value="バックルーム" id="genre_backrooms" className="genre-checkbox" />
              <label htmlFor="genre_backrooms" className="genre-label">バックルーム</label>
            </div>
            
            <div className="genre-option" data-value="リミナルスペース">
              <input type="checkbox" name="genre_types" value="リミナルスペース" id="genre_liminal_space" className="genre-checkbox" />
              <label htmlFor="genre_liminal_space" className="genre-label">リミナルスペース</label>
            </div>
            
            <div className="genre-option" data-value="クリーピーパスタ">
              <input type="checkbox" name="genre_types" value="クリーピーパスタ" id="genre_creepypasta" className="genre-checkbox" />
              <label htmlFor="genre_creepypasta" className="genre-label">クリーピーパスタ</label>
            </div>
            
            <div className="genre-option" data-value="儀式/呪術">
              <input type="checkbox" name="genre_types" value="儀式/呪術" id="genre_ritual" className="genre-checkbox" />
              <label htmlFor="genre_ritual" className="genre-label">儀式/呪術</label>
            </div>
            
            <div className="genre-option" data-value="事故物件">
              <input type="checkbox" name="genre_types" value="事故物件" id="genre_stigmatized_property" className="genre-checkbox" />
              <label htmlFor="genre_stigmatized_property" className="genre-label">事故物件</label>
            </div>
            
            <div className="genre-option" data-value="特殊清掃">
              <input type="checkbox" name="genre_types" value="特殊清掃" id="genre_crime_scene_cleanup" className="genre-checkbox" />
              <label htmlFor="genre_crime_scene_cleanup" className="genre-label">特殊清掃</label>
            </div>
            
            <div className="genre-option" data-value="ゾンビ">
              <input type="checkbox" name="genre_types" value="ゾンビ" id="genre_zombie" className="genre-checkbox" />
              <label htmlFor="genre_zombie" className="genre-label">ゾンビ</label>
            </div>
            
            <div className="genre-option" data-value="お化け屋敷">
              <input type="checkbox" name="genre_types" value="お化け屋敷" id="genre_haunted_house" className="genre-checkbox" />
              <label htmlFor="genre_haunted_house" className="genre-label">お化け屋敷</label>
            </div>
            
            <div className="genre-option" data-value="心霊写真">
              <input type="checkbox" name="genre_types" value="心霊写真" id="genre_spirit_photo" className="genre-checkbox" />
              <label htmlFor="genre_spirit_photo" className="genre-label">心霊写真</label>
            </div>
            
            <div className="genre-option" data-value="心霊映像">
              <input type="checkbox" name="genre_types" value="心霊映像" id="genre_spirit_video" className="genre-checkbox" />
              <label htmlFor="genre_spirit_video" className="genre-label">心霊映像</label>
            </div>
            
            <div className="genre-option" data-value="心霊スポット">
              <input type="checkbox" name="genre_types" value="心霊スポット" id="genre_haunted_spot" className="genre-checkbox" />
              <label htmlFor="genre_haunted_spot" className="genre-label">心霊スポット</label>
            </div>
            
            <div className="genre-option" data-value="未来人/予言">
              <input type="checkbox" name="genre_types" value="未来人/予言" id="genre_future_prophecy" className="genre-checkbox" />
              <label htmlFor="genre_future_prophecy" className="genre-label">未来人/予言</label>
            </div>
            
            <div className="genre-option" data-value="未解決事件">
              <input type="checkbox" name="genre_types" value="未解決事件" id="genre_unsolved_case" className="genre-checkbox" />
              <label htmlFor="genre_unsolved_case" className="genre-label">未解決事件</label>
            </div>
            
            <div className="genre-option" data-value="行方不明">
              <input type="checkbox" name="genre_types" value="行方不明" id="genre_missing_person" className="genre-checkbox" />
              <label htmlFor="genre_missing_person" className="genre-label">行方不明</label>
            </div>
            
            <div className="genre-option" data-value="殺人事件">
              <input type="checkbox" name="genre_types" value="殺人事件" id="genre_murder_case" className="genre-checkbox" />
              <label htmlFor="genre_murder_case" className="genre-label">殺人事件</label>
            </div>
            
            <div className="genre-option" data-value="幽体離脱">
              <input type="checkbox" name="genre_types" value="幽体離脱" id="genre_astral_projection" className="genre-checkbox" />
              <label htmlFor="genre_astral_projection" className="genre-label">幽体離脱</label>
            </div>
            
            <div className="genre-option" data-value="明晰夢">
              <input type="checkbox" name="genre_types" value="明晰夢" id="genre_lucid_dream" className="genre-checkbox" />
              <label htmlFor="genre_lucid_dream" className="genre-label">明晰夢</label>
            </div>
            
            <div className="genre-option" data-value="密室">
              <input type="checkbox" name="genre_types" value="密室" id="genre_locked_room" className="genre-checkbox" />
              <label htmlFor="genre_locked_room" className="genre-label">密室</label>
            </div>
          </div>
          
          <h2 className="ng-title">NGなホラージャンル(複数回答)</h2>
          
          <div className="ng-grid">
            <div className="ng-option" data-value="拷問">
              <input type="checkbox" name="ng_types" value="拷問" id="ng_torture" className="ng-checkbox" />
              <label htmlFor="ng_torture" className="ng-label">拷問</label>
            </div>
            
            <div className="ng-option" data-value="虐待">
              <input type="checkbox" name="ng_types" value="虐待" id="ng_abuse" className="ng-checkbox" />
              <label htmlFor="ng_abuse" className="ng-label">虐待</label>
            </div>
            
            <div className="ng-option" data-value="エロ">
              <input type="checkbox" name="ng_types" value="エロ" id="ng_ero" className="ng-checkbox" />
              <label htmlFor="ng_ero" className="ng-label">エロ</label>
            </div>
            
            <div className="ng-option" data-value="子供の死">
              <input type="checkbox" name="ng_types" value="子供の死" id="ng_child_death" className="ng-checkbox" />
              <label htmlFor="ng_child_death" className="ng-label">子供の死</label>
            </div>
            
            <div className="ng-option" data-value="動物の死">
              <input type="checkbox" name="ng_types" value="動物の死" id="ng_animal_death" className="ng-checkbox" />
              <label htmlFor="ng_animal_death" className="ng-label">動物の死</label>
            </div>
            
            <div className="ng-option" data-value="怪談">
              <input type="checkbox" name="ng_types" value="怪談" id="ng_kaidan" className="ng-checkbox" />
              <label htmlFor="ng_kaidan" className="ng-label">怪談</label>
            </div>
            
            <div className="ng-option" data-value="怪談師">
              <input type="checkbox" name="ng_types" value="怪談師" id="ng_kaidanshi" className="ng-checkbox" />
              <label htmlFor="ng_kaidanshi" className="ng-label">怪談師</label>
            </div>
            
            <div className="ng-option" data-value="怪談朗読">
              <input type="checkbox" name="ng_types" value="怪談朗読" id="ng_kaidan_reading" className="ng-checkbox" />
              <label htmlFor="ng_kaidan_reading" className="ng-label">怪談朗読</label>
            </div>
            
            <div className="ng-option" data-value="ゆっくり怪談朗読">
              <input type="checkbox" name="ng_types" value="ゆっくり怪談朗読" id="ng_yukkuri_kaidan" className="ng-checkbox" />
              <label htmlFor="ng_yukkuri_kaidan" className="ng-label">ゆっくり怪談朗読</label>
            </div>
            
            <div className="ng-option" data-value="都市伝説">
              <input type="checkbox" name="ng_types" value="都市伝説" id="ng_urban_legend" className="ng-checkbox" />
              <label htmlFor="ng_urban_legend" className="ng-label">都市伝説</label>
            </div>
            
            <div className="ng-option" data-value="民話/伝承">
              <input type="checkbox" name="ng_types" value="民話/伝承" id="ng_folklore" className="ng-checkbox" />
              <label htmlFor="ng_folklore" className="ng-label">民話/伝承</label>
            </div>
            
            <div className="ng-option" data-value="呪物">
              <input type="checkbox" name="ng_types" value="呪物" id="ng_cursed_object" className="ng-checkbox" />
              <label htmlFor="ng_cursed_object" className="ng-label">呪物</label>
            </div>
            
            <div className="ng-option" data-value="幽霊">
              <input type="checkbox" name="ng_types" value="幽霊" id="ng_ghost" className="ng-checkbox" />
              <label htmlFor="ng_ghost" className="ng-label">幽霊</label>
            </div>
            
            <div className="ng-option" data-value="悪魔">
              <input type="checkbox" name="ng_types" value="悪魔" id="ng_demon" className="ng-checkbox" />
              <label htmlFor="ng_demon" className="ng-label">悪魔</label>
            </div>
            
            <div className="ng-option" data-value="妖怪">
              <input type="checkbox" name="ng_types" value="妖怪" id="ng_yokai" className="ng-checkbox" />
              <label htmlFor="ng_yokai" className="ng-label">妖怪</label>
            </div>
            
            <div className="ng-option" data-value="UMA">
              <input type="checkbox" name="ng_types" value="UMA" id="ng_uma" className="ng-checkbox" />
              <label htmlFor="ng_uma" className="ng-label">UMA</label>
            </div>
            
            <div className="ng-option" data-value="宇宙人/レプティリアン">
              <input type="checkbox" name="ng_types" value="宇宙人/レプティリアン" id="ng_alien" className="ng-checkbox" />
              <label htmlFor="ng_alien" className="ng-label">宇宙人/レプティリアン</label>
            </div>
            
            <div className="ng-option" data-value="モンスター/クリーチャー">
              <input type="checkbox" name="ng_types" value="モンスター/クリーチャー" id="ng_monster" className="ng-checkbox" />
              <label htmlFor="ng_monster" className="ng-label">モンスター/クリーチャー</label>
            </div>
            
            <div className="ng-option" data-value="魔女">
              <input type="checkbox" name="ng_types" value="魔女" id="ng_witch" className="ng-checkbox" />
              <label htmlFor="ng_witch" className="ng-label">魔女</label>
            </div>
            
            <div className="ng-option" data-value="ピエロ">
              <input type="checkbox" name="ng_types" value="ピエロ" id="ng_clown" className="ng-checkbox" />
              <label htmlFor="ng_clown" className="ng-label">ピエロ</label>
            </div>
            
            <div className="ng-option" data-value="カルト">
              <input type="checkbox" name="ng_types" value="カルト" id="ng_cult" className="ng-checkbox" />
              <label htmlFor="ng_cult" className="ng-label">カルト</label>
            </div>
            
            <div className="ng-option" data-value="異世界">
              <input type="checkbox" name="ng_types" value="異世界" id="ng_otherworld" className="ng-checkbox" />
              <label htmlFor="ng_otherworld" className="ng-label">異世界</label>
            </div>
            
            <div className="ng-option" data-value="不思議">
              <input type="checkbox" name="ng_types" value="不思議" id="ng_mystery" className="ng-checkbox" />
              <label htmlFor="ng_mystery" className="ng-label">不思議</label>
            </div>
            
            <div className="ng-option" data-value="人怖">
              <input type="checkbox" name="ng_types" value="人怖" id="ng_human_horror" className="ng-checkbox" />
              <label htmlFor="ng_human_horror" className="ng-label">人怖</label>
            </div>
            
            <div className="ng-option" data-value="洒落怖">
              <input type="checkbox" name="ng_types" value="洒落怖" id="ng_share_kowai" className="ng-checkbox" />
              <label htmlFor="ng_share_kowai" className="ng-label">洒落怖</label>
            </div>
            
            <div className="ng-option" data-value="意味怖">
              <input type="checkbox" name="ng_types" value="意味怖" id="ng_imi_kowai" className="ng-checkbox" />
              <label htmlFor="ng_imi_kowai" className="ng-label">意味怖</label>
            </div>
            
            <div className="ng-option" data-value="SCP">
              <input type="checkbox" name="ng_types" value="SCP" id="ng_scp" className="ng-checkbox" />
              <label htmlFor="ng_scp" className="ng-label">SCP</label>
            </div>
            
            <div className="ng-option" data-value="ジャンプスケア">
              <input type="checkbox" name="ng_types" value="ジャンプスケア" id="ng_jump_scare" className="ng-checkbox" />
              <label htmlFor="ng_jump_scare" className="ng-label">ジャンプスケア</label>
            </div>
            
            <div className="ng-option" data-value="パニックスリラー">
              <input type="checkbox" name="ng_types" value="パニックスリラー" id="ng_panic_thriller" className="ng-checkbox" />
              <label htmlFor="ng_panic_thriller" className="ng-label">パニックスリラー</label>
            </div>
            
            <div className="ng-option" data-value="アナログホラー">
              <input type="checkbox" name="ng_types" value="アナログホラー" id="ng_analog_horror" className="ng-checkbox" />
              <label htmlFor="ng_analog_horror" className="ng-label">アナログホラー</label>
            </div>
            
            <div className="ng-option" data-value="サイコホラー">
              <input type="checkbox" name="ng_types" value="サイコホラー" id="ng_psycho_horror" className="ng-checkbox" />
              <label htmlFor="ng_psycho_horror" className="ng-label">サイコホラー</label>
            </div>
            
            <div className="ng-option" data-value="サスペンスホラー">
              <input type="checkbox" name="ng_types" value="サスペンスホラー" id="ng_suspense_horror" className="ng-checkbox" />
              <label htmlFor="ng_suspense_horror" className="ng-label">サスペンスホラー</label>
            </div>
            
            <div className="ng-option" data-value="コズミックホラー">
              <input type="checkbox" name="ng_types" value="コズミックホラー" id="ng_cosmic_horror" className="ng-checkbox" />
              <label htmlFor="ng_cosmic_horror" className="ng-label">コズミックホラー</label>
            </div>
            
            <div className="ng-option" data-value="ゴシックホラー">
              <input type="checkbox" name="ng_types" value="ゴシックホラー" id="ng_gothic_horror" className="ng-checkbox" />
              <label htmlFor="ng_gothic_horror" className="ng-label">ゴシックホラー</label>
            </div>
            
            <div className="ng-option" data-value="フォークホラー">
              <input type="checkbox" name="ng_types" value="フォークホラー" id="ng_folk_horror" className="ng-checkbox" />
              <label htmlFor="ng_folk_horror" className="ng-label">フォークホラー</label>
            </div>
            
            <div className="ng-option" data-value="SFホラー">
              <input type="checkbox" name="ng_types" value="SFホラー" id="ng_sf_horror" className="ng-checkbox" />
              <label htmlFor="ng_sf_horror" className="ng-label">SFホラー</label>
            </div>
            
            <div className="ng-option" data-value="ホラーコメディ">
              <input type="checkbox" name="ng_types" value="ホラーコメディ" id="ng_horror_comedy" className="ng-checkbox" />
              <label htmlFor="ng_horror_comedy" className="ng-label">ホラーコメディ</label>
            </div>
            
            <div className="ng-option" data-value="スラッシャー/スプラッタ/Gore">
              <input type="checkbox" name="ng_types" value="スラッシャー/スプラッタ/Gore" id="ng_slasher" className="ng-checkbox" />
              <label htmlFor="ng_slasher" className="ng-label">スラッシャー/スプラッタ/Gore</label>
            </div>
            
            <div className="ng-option" data-value="モキュメンタリー">
              <input type="checkbox" name="ng_types" value="モキュメンタリー" id="ng_mockumentary" className="ng-checkbox" />
              <label htmlFor="ng_mockumentary" className="ng-label">モキュメンタリー</label>
            </div>
            
            <div className="ng-option" data-value="ファウンドフッテージ">
              <input type="checkbox" name="ng_types" value="ファウンドフッテージ" id="ng_found_footage" className="ng-checkbox" />
              <label htmlFor="ng_found_footage" className="ng-label">ファウンドフッテージ</label>
            </div>
            
            <div className="ng-option" data-value="ARG">
              <input type="checkbox" name="ng_types" value="ARG" id="ng_arg_game" className="ng-checkbox" />
              <label htmlFor="ng_arg_game" className="ng-label">ARG</label>
            </div>
            
            <div className="ng-option" data-value="TRPG">
              <input type="checkbox" name="ng_types" value="TRPG" id="ng_trpg_game" className="ng-checkbox" />
              <label htmlFor="ng_trpg_game" className="ng-label">TRPG</label>
            </div>
            
            <div className="ng-option" data-value="バックルーム">
              <input type="checkbox" name="ng_types" value="バックルーム" id="ng_backrooms" className="ng-checkbox" />
              <label htmlFor="ng_backrooms" className="ng-label">バックルーム</label>
            </div>
            
            <div className="ng-option" data-value="リミナルスペース">
              <input type="checkbox" name="ng_types" value="リミナルスペース" id="ng_liminal_space" className="ng-checkbox" />
              <label htmlFor="ng_liminal_space" className="ng-label">リミナルスペース</label>
            </div>
            
            <div className="ng-option" data-value="クリーピーパスタ">
              <input type="checkbox" name="ng_types" value="クリーピーパスタ" id="ng_creepypasta" className="ng-checkbox" />
              <label htmlFor="ng_creepypasta" className="ng-label">クリーピーパスタ</label>
            </div>
            
            <div className="ng-option" data-value="儀式/呪術">
              <input type="checkbox" name="ng_types" value="儀式/呪術" id="ng_ritual" className="ng-checkbox" />
              <label htmlFor="ng_ritual" className="ng-label">儀式/呪術</label>
            </div>
            
            <div className="ng-option" data-value="事故物件">
              <input type="checkbox" name="ng_types" value="事故物件" id="ng_stigmatized_property" className="ng-checkbox" />
              <label htmlFor="ng_stigmatized_property" className="ng-label">事故物件</label>
            </div>
            
            <div className="ng-option" data-value="特殊清掃">
              <input type="checkbox" name="ng_types" value="特殊清掃" id="ng_crime_scene_cleanup" className="ng-checkbox" />
              <label htmlFor="ng_crime_scene_cleanup" className="ng-label">特殊清掃</label>
            </div>
            
            <div className="ng-option" data-value="ゾンビ">
              <input type="checkbox" name="ng_types" value="ゾンビ" id="ng_zombie" className="ng-checkbox" />
              <label htmlFor="ng_zombie" className="ng-label">ゾンビ</label>
            </div>
            
            <div className="ng-option" data-value="お化け屋敷">
              <input type="checkbox" name="ng_types" value="お化け屋敷" id="ng_haunted_house" className="ng-checkbox" />
              <label htmlFor="ng_haunted_house" className="ng-label">お化け屋敷</label>
            </div>
            
            <div className="ng-option" data-value="心霊写真">
              <input type="checkbox" name="ng_types" value="心霊写真" id="ng_spirit_photo" className="ng-checkbox" />
              <label htmlFor="ng_spirit_photo" className="ng-label">心霊写真</label>
            </div>
            
            <div className="ng-option" data-value="心霊映像">
              <input type="checkbox" name="ng_types" value="心霊映像" id="ng_spirit_video" className="ng-checkbox" />
              <label htmlFor="ng_spirit_video" className="ng-label">心霊映像</label>
            </div>
            
            <div className="ng-option" data-value="心霊スポット">
              <input type="checkbox" name="ng_types" value="心霊スポット" id="ng_haunted_spot" className="ng-checkbox" />
              <label htmlFor="ng_haunted_spot" className="ng-label">心霊スポット</label>
            </div>
            
            <div className="ng-option" data-value="未来人/予言">
              <input type="checkbox" name="ng_types" value="未来人/予言" id="ng_future_prophecy" className="ng-checkbox" />
              <label htmlFor="ng_future_prophecy" className="ng-label">未来人/予言</label>
            </div>
            
            <div className="ng-option" data-value="未解決事件">
              <input type="checkbox" name="ng_types" value="未解決事件" id="ng_unsolved_case" className="ng-checkbox" />
              <label htmlFor="ng_unsolved_case" className="ng-label">未解決事件</label>
            </div>
            
            <div className="ng-option" data-value="行方不明">
              <input type="checkbox" name="ng_types" value="行方不明" id="ng_missing_person" className="ng-checkbox" />
              <label htmlFor="ng_missing_person" className="ng-label">行方不明</label>
            </div>
            
            <div className="ng-option" data-value="殺人事件">
              <input type="checkbox" name="ng_types" value="殺人事件" id="ng_murder_case" className="ng-checkbox" />
              <label htmlFor="ng_murder_case" className="ng-label">殺人事件</label>
            </div>
            
            <div className="ng-option" data-value="幽体離脱">
              <input type="checkbox" name="ng_types" value="幽体離脱" id="ng_astral_projection" className="ng-checkbox" />
              <label htmlFor="ng_astral_projection" className="ng-label">幽体離脱</label>
            </div>
            
            <div className="ng-option" data-value="明晰夢">
              <input type="checkbox" name="ng_types" value="明晰夢" id="ng_lucid_dream" className="ng-checkbox" />
              <label htmlFor="ng_lucid_dream" className="ng-label">明晰夢</label>
            </div>
            
            <div className="ng-option" data-value="密室">
              <input type="checkbox" name="ng_types" value="密室" id="ng_locked_room" className="ng-checkbox" />
              <label htmlFor="ng_locked_room" className="ng-label">密室</label>
            </div>
          </div>
          
          <div className="media-actions">
            <button type="submit" className="next-btn">
              次へ
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})

// Horror preferences form handler
app.post('/horror-preferences', passwordProtection, async (c) => {
  const formData = await c.req.formData()
  const mediaTypes = formData.getAll('media_types') as string[]
  const genreTypes = formData.getAll('genre_types') as string[]
  const ngTypes = formData.getAll('ng_types') as string[]
  
  // プロフィール情報にホラー媒体、ジャンル、NGジャンルの好みを保存
  const currentUser = getCookie(c, 'current_user')
  if (currentUser && users.has(currentUser)) {
    const user = users.get(currentUser)
    users.set(currentUser, {
      ...user,
      horrorPreferences: {
        mediaTypes: mediaTypes || [],
        genreTypes: genreTypes || [],
        ngTypes: ngTypes || []
      }
    })
  }
  
  // 次のページに移動（今後実装予定）
  return c.redirect('/')
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
