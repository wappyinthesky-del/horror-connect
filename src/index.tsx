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
    return c.redirect('/welcome')
  }
}

// Registration page
app.get('/register', (c) => {
  return c.render(
    <div className="page-with-header">
      <AppHeader showLogout={false} />
      <div className="register-container">
        <h1 className="title">初回登録</h1>
        
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
          <p>既にアカウントをお持ちの方は <a href="/welcome">こちら</a></p>
        </div>
      </div>
    </div>
  )
})

// Optimized header component with user profile
const AppHeader = ({ showLogout = false, currentUser = null }) => {
  const href = showLogout ? "/" : "/welcome"
  return (
    <header className="fixed-header">
      <a href={href} className="header-logo">
        <div className="header-ghost"></div>
        <h1 className="header-title">{APP_TITLE}</h1>
      </a>
      <div className="header-actions">
        {showLogout && currentUser && (
          <a href={`/profile/${currentUser.userid}`} className="header-profile-link">
            <div className="header-user-info">
              <div className="header-user-avatar">
                {currentUser.profileImage ? (
                  <img src={currentUser.profileImage} alt="プロフィール画像" className="header-avatar-img" />
                ) : (
                  <div className="header-avatar-placeholder"></div>
                )}
              </div>
              <span className="header-username">{currentUser.displayName}</span>
              {currentUser.isVerified && <span className="header-verified-badge">本人認証済み</span>}
            </div>
          </a>
        )}
        {showLogout && <a href="/logout" className="header-logout">Logout</a>}
      </div>
    </header>
  )
}

// Constants to reduce memory usage
const MESSAGES = {
  LOGIN_ERROR: 'IDまたはパスワードが間違っています',
  REQUIRED_FIELDS: 'すべての項目を入力してください',
  PASSWORD_MISMATCH: 'パスワードが一致しません',
  USER_EXISTS: 'そのユーザーIDは既に使用されています',
  REQUIRED_PROFILE: '必須項目をすべて入力してください'
}

const APP_TITLE = 'HorrorConnect'
const MAIN_DESCRIPTION = '同じホラーの趣味を持つ仲間と繋がろう。あなたの好みに合った人とマッチして、イベント情報や怖い話を共有しよう。'

// メモリ効率的な永続化対応ストレージ
const users = new Map()
const globalData: any = { 
  dms: new Map(), // DM効率化: Map<dmId, dmData>
  posts: [], 
  boards: new Map(),
  events: new Map(),
  identityVerifications: new Map(),
  blockedUsers: new Map(), // ブロック機能: Map<userId, Set<blockedUserId>>
  deletedConversations: new Map(), // 削除されたトーク: Map<userId, Set<otherUserId>>
  followingUsers: new Map(), // フォロー機能: Map<userId, Set<followedUserId>>
  profileImages: new Map() // プロフィール画像: Map<userId, imageData>
}

// 軽量データ永続化システム（メモリ効率重視）
const STORAGE_FILE = '/tmp/horror_users.json'
const MAX_BACKUP_SIZE = 100 * 1024 // 100KB制限

// データ保存（非同期、メモリ効率重視）
const saveUserData = async () => {
  try {
    if (users.size === 0) return // 空の場合は保存しない
    
    const userData = Array.from(users.entries()).map(([userid, data]) => {
      // 重要なデータのみ保存してサイズ削減
      return {
        userid,
        password: data.password,
        displayName: data.displayName,
        profile: data.profile ? {
          displayName: data.profile.displayName,
          birthDate: data.profile.birthDate,
          gender: data.profile.gender,
          prefecture: data.profile.prefecture,
          // 重いデータは除外
          horrorGenres: Array.isArray(data.profile.horrorGenres) ? data.profile.horrorGenres.slice(0, 5) : [],
          experience: data.profile.experience,
          bio: data.profile.bio ? data.profile.bio.substring(0, 200) : '', // 200文字制限
        } : null,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin || new Date().toISOString()
      }
    })
    
    const jsonData = JSON.stringify(userData)
    if (jsonData.length > MAX_BACKUP_SIZE) {
      console.log('Warning: User data exceeds size limit, skipping save')
      return
    }
    
    // Cloudflare Workers環境では使用不可 - 開発環境でのみ動作
    // await writeFile(STORAGE_FILE, jsonData)
  } catch (error) {
    console.error('Failed to save user data:', error)
  }
}

// データ読み込み（起動時のみ）
const loadUserData = async () => {
  try {
    // Cloudflare Workers環境では使用不可 - 開発環境でのみ動作
    // const data = await readFile(STORAGE_FILE, 'utf8')
    // const userData = JSON.parse(data)
    
    // userData.forEach(user => {
    //   users.set(user.userid, {
    //     ...user,
    //     createdAt: new Date(user.createdAt || Date.now())
    //   })
    // })
    // console.log(`Loaded ${userData.length} users from storage`)
  } catch (error) {
    // ファイルが存在しない場合は初期化
    console.log('No existing user data found, initializing with debug users')
    initializeDebugUsers()
  }
}

// デバッグ用のユーザー初期化機能（PM2再起動対応）
// 既存コードへの影響を最小限に抑制した一時的対処法
const initializeDebugUsers = () => {
  // デバッグ環境でのみテストユーザーを自動作成
  const debugUsers = [
    {
      userid: 'debug_user1',
      password: 'password123',
      displayName: 'テストユーザー1',
      birthDate: '19900101',
      profile: {
        displayName: 'テストユーザー1',
        birthDate: '19900101',
        gender: '女性',
        prefecture: '東京都',
        horrorGenres: ['ホラー映画', 'ホラー小説'],
        experience: '初心者',
        bio: 'ホラー映画が大好きです！'
      }
    },
    {
      userid: 'debug_user2', 
      password: 'password456',
      displayName: 'テストユーザー2',
      birthDate: '19851215',
      profile: {
        displayName: 'テストユーザー2',
        birthDate: '19851215',
        gender: '男性',
        prefecture: '大阪府',
        horrorGenres: ['心霊現象', 'ホラーゲーム'],
        experience: '上級者',
        bio: '心霊スポット巡りが趣味です。'
      }
    },
    {
      userid: 'debug_user3',
      password: 'password789',
      displayName: 'ホラーファン太郎',
      birthDate: '19950301',
      profile: {
        displayName: 'ホラーファン太郎',
        birthDate: '19950301',
        gender: '男性',
        prefecture: '神奈川県',
        horrorGenres: ['ホラー映画', 'ホラー小説'],
        experience: '中級者',
        bio: 'ホラー全般が大好きです！一緒に怖い話をしませんか？'
      }
    }
  ]
  
  debugUsers.forEach((user, index) => {
    // 最初の2ユーザーは古い登録、3番目は新しい登録（NEWラベル表示）
    const createdAt = index === 2 ? new Date().toISOString() : new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    
    // 最初のユーザーは本人認証済みに設定（テスト用）
    const isFirstUser = index === 0
    
    users.set(user.userid, {
      userid: user.userid,
      password: user.password,
      displayName: user.displayName,
      createdAt,
      identityVerified: isFirstUser, // debug_user1は本人認証済み
      identityVerificationStatus: isFirstUser ? 'approved' : 'none',
      profile: {
        displayName: user.displayName,
        birthDate: user.birthDate,
        ...user.profile
      }
    })
  })
  
  console.log(`[DEBUG] ${debugUsers.length}人のデバッグユーザーを初期化しました`)
}

// データ整合性チェック機能
const checkDataIntegrity = async () => {
  console.log(`[SYSTEM] データ整合性チェック開始`)
  console.log(`[SYSTEM] ユーザー数: ${users.size}, 投稿数: ${posts.size}`)
  
  // 永続化データの読み込み試行
  await loadUserData()
  
  // ユーザーが存在しない場合は再初期化
  if (users.size === 0) {
    console.log(`[WARNING] ユーザーデータが消失しています。緊急再初期化を実行します。`)
    initializeDebugUsers()
  }
  
  // 投稿が存在しない場合は再初期化
  if (posts.size === 0) {
    console.log(`[WARNING] 投稿データが消失しています。緊急再初期化を実行します。`)
    initializeDebugPosts()
  }
  
  // デバッグユーザーのプロフィール完整性チェック
  for (const [userid, user] of users.entries()) {
    if (!user.profile || !user.profile.displayName) {
      console.log(`[WARNING] ユーザー ${userid} のプロフィールが不完全です。`)
    }
  }
}

// アプリケーション起動時にデバッグユーザーを初期化
initializeDebugUsers()

// 投稿データの管理（インメモリ）
const posts = new Map()
let postIdCounter = 1

// デバッグ用の初期投稿データ
const initializeDebugPosts = () => {
  const debugPosts = [
    {
      userid: 'debug_user1',
      content: '今夜、一人で深夜のコンビニに行ったら、誰もいないのにレジから音楽が聞こえてきて...😰',
      timestamp: Date.now() - 3600000 // 1時間前
    },
    {
      userid: 'debug_user2', 
      content: '新しいホラー映画「呪われた館」を見てきました！最後のシーンで思わず叫んでしまった😱みんなも見た？',
      timestamp: Date.now() - 7200000 // 2時間前
    },
    {
      userid: 'debug_user1',
      content: '夜中に怖い話を聞いていたら、外から子供の笑い声が...でも近所に子供はいないはず🫣',
      timestamp: Date.now() - 10800000 // 3時間前
    }
  ]
  
  debugPosts.forEach(post => {
    const postId = `post_${postIdCounter++}`
    posts.set(postId, {
      id: postId,
      userid: post.userid,
      content: post.content,
      timestamp: post.timestamp,
      createdAt: new Date(post.timestamp).toISOString(),
      replies: [],
      bookmarkedBy: []
    })
  })
  
  console.log(`[DEBUG] ${debugPosts.length}件のデバッグ投稿を初期化しました`)
}

// デバッグ投稿を初期化
initializeDebugPosts()

// 初回データ整合性チェック（起動時のみ）
checkDataIntegrity().catch(err => console.error('Data integrity check failed:', err))

// 定期的なデータ保存（メモリ効率重視・30分間隔）
let autoSaveTimer: NodeJS.Timeout | null = null
const startAutoSave = () => {
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  
  autoSaveTimer = setInterval(() => {
    if (users.size > 0) {
      saveUserData().catch(err => console.error('Auto-save failed:', err))
    }
  }, 30 * 60 * 1000) // 30分ごと
}

// 自動保存開始
startAutoSave()

// アプリケーション終了時のクリーンアップ
process.on('SIGTERM', () => {
  console.log('SIGTERM received, saving data before shutdown...')
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  saveUserData().then(() => process.exit(0)).catch(() => process.exit(1))
})

process.on('SIGINT', () => {
  console.log('SIGINT received, saving data before shutdown...')
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  saveUserData().then(() => process.exit(0)).catch(() => process.exit(1))
})

// マッチング度計算ロジック
const calculateMatchingScore = (user1: any, user2: any) => {
  if (!user1.horrorPreferences || !user2.horrorPreferences) {
    return 0 // ホラー好み設定がない場合は0%
  }
  
  const pref1 = user1.horrorPreferences
  const pref2 = user2.horrorPreferences
  
  let totalWeights = 0
  let matchingPoints = 0
  
  // メディアタイプの一致度 (重み: 30%)
  if (pref1.mediaTypes && pref2.mediaTypes && 
      pref1.mediaTypes.length > 0 && pref2.mediaTypes.length > 0) {
    const commonMedia = pref1.mediaTypes.filter((type: string) => 
      pref2.mediaTypes.includes(type)
    )
    const mediaScore = commonMedia.length / Math.max(pref1.mediaTypes.length, pref2.mediaTypes.length)
    matchingPoints += mediaScore * 30
    totalWeights += 30
  }
  
  // ジャンルタイプの一致度 (重み: 40%)
  if (pref1.genreTypes && pref2.genreTypes && 
      pref1.genreTypes.length > 0 && pref2.genreTypes.length > 0) {
    const commonGenres = pref1.genreTypes.filter((genre: string) => 
      pref2.genreTypes.includes(genre)
    )
    const genreScore = commonGenres.length / Math.max(pref1.genreTypes.length, pref2.genreTypes.length)
    matchingPoints += genreScore * 40
    totalWeights += 40
  }
  
  // 心霊信念の一致度 (重み: 10%)
  if (pref1.ghostBelief && pref2.ghostBelief) {
    if (pref1.ghostBelief === pref2.ghostBelief) {
      matchingPoints += 10
    }
    totalWeights += 10
  }
  
  // 怖い話信念の一致度 (重み: 10%)
  if (pref1.storyBelief && pref2.storyBelief) {
    if (pref1.storyBelief === pref2.storyBelief) {
      matchingPoints += 10
    }
    totalWeights += 10
  }
  
  // 超常現象活動の一致度 (重み: 10%)
  if (pref1.paranormalActivity && pref2.paranormalActivity) {
    if (pref1.paranormalActivity === pref2.paranormalActivity) {
      matchingPoints += 10
    }
    totalWeights += 10
  }
  
  // NGタイプはマイナス要素として考慮
  if (pref1.ngTypes && pref2.genreTypes) {
    const negativeMatches = pref1.ngTypes.filter((ngType: string) => 
      pref2.genreTypes.includes(ngType)
    )
    matchingPoints -= negativeMatches.length * 15 // NGタイプ一致で15%減点
  }
  
  if (pref2.ngTypes && pref1.genreTypes) {
    const negativeMatches = pref2.ngTypes.filter((ngType: string) => 
      pref1.genreTypes.includes(ngType)
    )
    matchingPoints -= negativeMatches.length * 15 // NGタイプ一致で15%減点
  }
  
  if (totalWeights === 0) return 0
  
  const finalScore = Math.max(0, Math.min(100, (matchingPoints / totalWeights) * 100))
  return Math.round(finalScore)
}

// 一致した項目を取得する関数
const getMatchingItems = (user1: any, user2: any) => {
  if (!user1.horrorPreferences || !user2.horrorPreferences) {
    return []
  }
  
  const pref1 = user1.horrorPreferences
  const pref2 = user2.horrorPreferences
  const matchingItems: string[] = []
  
  // メディアタイプの一致
  if (pref1.mediaTypes && pref2.mediaTypes) {
    const commonMedia = pref1.mediaTypes.filter((type: string) => 
      pref2.mediaTypes.includes(type)
    )
    matchingItems.push(...commonMedia)
  }
  
  // ジャンルタイプの一致
  if (pref1.genreTypes && pref2.genreTypes) {
    const commonGenres = pref1.genreTypes.filter((genre: string) => 
      pref2.genreTypes.includes(genre)
    )
    matchingItems.push(...commonGenres)
  }
  
  // 信念系の一致
  if (pref1.ghostBelief && pref2.ghostBelief && pref1.ghostBelief === pref2.ghostBelief) {
    matchingItems.push(`心霊信念: ${pref1.ghostBelief}`)
  }
  
  if (pref1.storyBelief && pref2.storyBelief && pref1.storyBelief === pref2.storyBelief) {
    matchingItems.push(`怖い話信念: ${pref1.storyBelief}`)
  }
  
  if (pref1.paranormalActivity && pref2.paranormalActivity && pref1.paranormalActivity === pref2.paranormalActivity) {
    matchingItems.push(`超常現象活動: ${pref1.paranormalActivity}`)
  }
  
  return matchingItems
}

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
        <h1 className="title">会員登録</h1>
        <div className="error-message">{MESSAGES.REQUIRED_FIELDS}</div>
        <a href="/register" className="btn btn-primary">戻る</a>
      </div>
    )
  }
  
  if (password !== passwordConfirm) {
    return c.render(
      <div className="register-container">
        <h1 className="title">会員登録</h1>
        <div className="error-message">{MESSAGES.PASSWORD_MISMATCH}</div>
        <a href="/register" className="btn btn-primary">戻る</a>
      </div>
    )
  }
  
  if (users.has(userid)) {
    return c.render(
      <div className="register-container">
        <h1 className="title">会員登録</h1>
        <div className="error-message">{MESSAGES.USER_EXISTS}</div>
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
  
  // データ永続化（非同期実行でレスポンス遅延なし）
  saveUserData().catch(err => console.error('Save failed:', err))
  
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
      <AppHeader showLogout={true} />
      <div className="profile-setup-container">
        <h2 className="profile-setup-title">基本プロフィール設定</h2>
        <form id="profile-form" className="profile-form" method="POST" action="/profile-setup">
          <div className="profile-field">
            <input 
              type="text" 
              name="display_name" 
              className="profile-input"
              placeholder="表示名を入力してください"
              required
              maxLength="20"
            />
          </div>
          
          <div className="profile-field">
            <input 
              type="text" 
              id="birth-date-input"
              name="birth_date" 
              className="profile-input" 
              placeholder="生年月日。2000年1月1日生まれなら:20000101"
              required 
              maxLength="8"
              pattern="[0-9]{8}"
              title="8桁の数字で入力してください（例：20000101）"
            />
            <span className="field-note">*非公開。年齢確認とパスワード再設定時に利用。</span>
          </div>
          
          <div className="profile-field">
            <select name="gender" className="profile-select" required>
              <option value="">性別を選択してください</option>
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他/無回答">その他/無回答</option>
            </select>
          </div>
          
          <div className="profile-field">
            <select name="prefecture" className="profile-select" required>
              <option value="">都道府県を選択してください</option>
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
            <textarea 
              name="self_introduction" 
              className="profile-textarea"
              placeholder="自己紹介をご入力ください（任意）"
              maxLength="500"
              rows="4"
            ></textarea>
          </div>
          
          <div className="profile-actions">
            <button id="next-btn" type="submit" className="next-btn">
              次へ：ホラー好み設定
            </button>
          </div>
        </form>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `function validateBirthDate(d){if(!d||d.length!==8||!/^\\d{8}$/.test(d))return'生年月日は8桁の数字で入力してください';const y=parseInt(d.substring(0,4)),m=parseInt(d.substring(4,6)),day=parseInt(d.substring(6,8));if(y<1920)return'生年月日の年は1920年以降で入力してください';if(m<1||m>12)return'生年月日の月は01から12の間で入力してください';const dm=new Date(y,m,0).getDate();if(day<1||day>dm)return y+'年'+m+'月の日は01から'+String(dm).padStart(2,'0')+'の間で入力してください';const id=new Date(y,m-1,day),td=new Date(),age=td.getFullYear()-id.getFullYear(),md=td.getMonth()-id.getMonth(),dd=td.getDate()-id.getDate(),aa=md<0||(md===0&&dd<0)?age-1:age;return aa<18?'18歳以上の方のみご利用いただけます':null}document.addEventListener('DOMContentLoaded',function(){const bi=document.getElementById('birth-date-input'),nb=document.getElementById('next-btn'),f=document.getElementById('profile-form');let ee=null;function se(m){ee&&ee.remove();ee=document.createElement('div');ee.className='birth-date-error';ee.textContent=m;ee.style.color='#d32f2f';ee.style.fontSize='0.75rem';ee.style.marginTop='4px';ee.style.textAlign='left';bi.parentNode.appendChild(ee)}function he(){ee&&(ee.remove(),ee=null)}function ubs(){const e=validateBirthDate(bi.value);e?(se(e),nb.disabled=true,nb.style.opacity='0.5',nb.style.cursor='not-allowed'):(he(),nb.disabled=false,nb.style.opacity='1',nb.style.cursor='pointer')}bi.addEventListener('input',ubs);bi.addEventListener('blur',ubs);f.addEventListener('submit',function(e){const er=validateBirthDate(bi.value);er&&(e.preventDefault(),se(er),nb.disabled=true,nb.style.opacity='0.5',nb.style.cursor='not-allowed')});ubs()});`
      }} />
    </div>
  )
})

// Welcome page (no password protection)
app.get('/welcome', (c) => {
  return c.render(
    <div className="page-with-header">
      <AppHeader showLogout={false} />
      <div className="welcome-page">
        {/* Main Title */}
        <h1 className="main-title">
          ホラー好きのための<br />Webアプリ
        </h1>
        
        {/* Description Text */}
        <p className="description-text">
          同じホラーの趣味を持つ仲間と繋がろう。あなたの好みに合った人とマッチして、イベント情報や怖い話を共有しよう。
        </p>
        
        {/* Login Form */}
        <form className="welcome-login-form" method="POST" action="/welcome-login">
          <div className="welcome-input-group">
            <input 
              type="text" 
              name="userid" 
              placeholder="ユーザーID" 
              className="welcome-input"
              required
            />
          </div>
          <div className="welcome-input-group">
            <input 
              type="password" 
              name="password" 
              placeholder="パスワード" 
              className="welcome-input"
              required
            />
          </div>
          <button type="submit" className="welcome-login-btn">ログイン</button>
        </form>
        
        {/* Register Button */}
        <div className="welcome-register">
          <a href="/register" className="welcome-register-btn">初回登録</a>
        </div>
      </div>
    </div>
  )
})

// Welcome page login handler
app.post('/welcome-login', async (c) => {
  const formData = await c.req.formData()
  const userid = formData.get('userid')?.toString()
  const password = formData.get('password')?.toString()
  
  // 管理者パスワードでのログイン
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
  
  // ユーザーログイン認証
  if (userid && password) {
    const user = users.get(userid)
    if (user && user.password === password) {
      // 最終ログイン時刻を更新
      user.lastLogin = new Date().toISOString()
      users.set(userid, user)
      
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
      
      // ログイン成功時にデータ保存（非同期）
      saveUserData().catch(err => console.error('Save failed:', err))
      
      return c.redirect('/')
    }
  }
  
  // ログイン失敗時はウェルカムページにエラーメッセージ付きで戻る
  return c.render(
    <div className="page-with-header">
      <AppHeader showLogout={false} />
      <div className="welcome-page">
        {/* Main Title */}
        <h1 className="main-title">
          ホラー好きのための<br />Webアプリ
        </h1>
        
        {/* Description Text */}
        <p className="description-text">
          同じホラーの趣味を持つ仲間と繋がろう。あなたの好みに合った人とマッチして、イベント情報や怖い話を共有しよう。
        </p>
        
        {/* Error Message */}
        <div className="welcome-error-message">IDまたはパスワードが間違っています</div>
        
        {/* Login Form */}
        <form className="welcome-login-form" method="POST" action="/welcome-login">
          <div className="welcome-input-group">
            <input 
              type="text" 
              name="userid" 
              placeholder="ユーザーID" 
              className="welcome-input"
              required
            />
          </div>
          <div className="welcome-input-group">
            <input 
              type="password" 
              name="password" 
              placeholder="パスワード" 
              className="welcome-input"
              required
            />
          </div>
          <button type="submit" className="welcome-login-btn">ログイン</button>
        </form>
        
        {/* Register Button */}
        <div className="welcome-register">
          <a href="/register" className="welcome-register-btn">初回登録</a>
        </div>
      </div>
    </div>
  )
})





// Protected main page
app.get('/', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  
  return c.render(
    <div className="authenticated-body">
      <AppHeader showLogout={true} currentUser={currentUser} />
      <div className="main-container">
        
        {/* Tab Content Areas */}
        <div className="tab-content">
          
          {/* フィードタブ */}
          <div id="feed-tab" className="tab-panel active">
            <div className="tab-header">
              <h2 className="tab-title">フィード</h2>
            </div>
            <div className="content-area">
              
              {/* 自分の投稿作成欄 */}
              <div className="post-composer">
                <div className="composer-header">
                  <div className="user-avatar">
                    <div className="avatar-placeholder"></div>
                  </div>
                  <div className="user-info">
                    <span className="display-name" id="composer-display-name">Loading...</span>
                  </div>
                  <div className="composer-actions">
                    <button type="button" id="image-attach-btn" className="image-attach-btn" title="画像を添付">
                      📷
                    </button>
                    <button type="button" id="post-submit-btn" className="post-submit-btn">投稿</button>
                  </div>
                </div>
                <div className="composer-input-area">
                  <textarea 
                    id="post-content" 
                    className="post-input" 
                    placeholder="いまのこと。怖かったこと。"
                    maxLength="500"
                    rows="2"
                  ></textarea>
                  <input 
                    type="file" 
                    id="image-file-input" 
                    accept="image/*" 
                    style="display: none;"
                  />
                  <div id="image-preview" className="image-preview" style="display: none;">
                    <img id="preview-img" className="preview-img" />
                    <button type="button" id="remove-image-btn" className="remove-image-btn">×</button>
                  </div>
                </div>
              </div>
              
              {/* フィード投稿リスト */}
              <div id="feed-posts" className="feed-posts">
                {/* 投稿は動的に生成 */}
                <div className="loading-placeholder">
                  <p>フィードを読み込み中...</p>
                </div>
              </div>
              
            </div>
          </div>
          
          {/* マチタブ */}
          <div id="match-tab" className="tab-panel">
            <div className="tab-header">
              <h2 className="tab-title">マッチした人</h2>
            </div>
            <div className="content-area" id="match-content">
              <div className="loading-placeholder">
                マッチデータを読み込み中...
              </div>
            </div>
          </div>
          
          {/* イベタブ */}
          <div id="event-tab" className="tab-panel">
            <div className="tab-header">
              <h2 className="tab-title">リアルイベント</h2>
            </div>
            <div className="content-area" id="event-content">
              
              {/* 新しいイベントを作成 */}
              <div className="event-creator">
                <h3 className="creator-title">新しいイベントを作成</h3>
                <div className="creator-form">
                  <div className="input-group">
                    <label className="input-label">イベント日</label>
                    <input type="date" id="event-date-input" className="event-date-input" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">内容</label>
                    <textarea id="event-content-input" className="event-content-input" placeholder="イベントの詳細を入力してください..." maxLength="1000" required></textarea>
                  </div>
                  <div className="input-group">
                    <label className="input-label">募集人数</label>
                    <input type="number" id="event-capacity-input" className="event-capacity-input" placeholder="募集人数" min="1" max="100" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">参考リンク(任意)</label>
                    <input type="url" id="event-reference-link-input" className="event-reference-link-input" placeholder="https://example.com (任意)" />
                  </div>
                  <div className="creator-actions">
                    <button id="event-create-btn" className="event-create-btn">イベント作成</button>
                  </div>
                </div>
              </div>
              
              {/* イベント一覧 */}
              <div id="events-list" className="events-list">
                <div className="loading-placeholder">イベントを読み込み中...</div>
              </div>
              
            </div>
          </div>
          
          {/* 本人認証画面（モーダル） */}
          <div id="identity-verification-modal" className="identity-modal" style="display: none;">
            <div className="identity-modal-content">
              <div className="identity-modal-header">
                <h3 className="identity-modal-title">本人認証が必要です</h3>
                <button id="identity-modal-close" className="identity-modal-close">&times;</button>
              </div>
              <div className="identity-modal-body">
                <p className="identity-explanation">
                  リアルイベント機能をご利用いただくには、本人認証が必要です。<br/>
                  本人確認書類（運転免許証、マイナンバーカード、パスポートなど）の写真をアップロードしてください。
                </p>
                <div className="identity-upload-area">
                  <input type="file" id="identity-document-input" accept="image/*" style="display: none;" />
                  <div id="identity-upload-zone" className="identity-upload-zone">
                    <div className="identity-upload-icon">📷</div>
                    <p className="identity-upload-text">本人確認書類の写真をアップロード</p>
                    <p className="identity-upload-note">JPG, PNG形式 (最大5MB)</p>
                  </div>
                  <div id="identity-preview-area" className="identity-preview-area" style="display: none;">
                    <img id="identity-preview-image" className="identity-preview-image" alt="本人確認書類プレビュー" />
                    <button id="identity-remove-image" className="identity-remove-image">削除</button>
                  </div>
                </div>
                <div className="identity-modal-actions">
                  <button id="identity-submit-btn" className="identity-submit-btn" disabled>本人認証を申請</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* 掲示板タブ */}
          <div id="board-tab" className="tab-panel">
            <div className="tab-header">
              <h2 className="tab-title">掲示板</h2>
            </div>
            <div className="content-area" id="board-content">
              {/* 掲示板一覧表示 */}
              <div id="board-list-view">
                {/* 新規掲示板作成欄 */}
                <div className="board-creator">
                  <h3 className="creator-title">新しい掲示板を作成</h3>
                  <div className="creator-form">
                    <input type="text" id="board-title-input" className="board-title-input" placeholder="掲示板のタイトルを入力..." maxLength="100" />
                    <textarea id="board-content-input" className="board-content-input" placeholder="最初の投稿内容を入力..." maxLength="1000"></textarea>
                    <div className="creator-actions">
                      <input type="file" id="board-image-input" accept="image/*" style="display: none;" />
                      <button id="board-image-btn" className="image-attach-btn">📷</button>
                      <div id="board-image-preview" className="image-preview" style="display: none;">
                        <img id="board-preview-img" className="preview-img" alt="プレビュー" />
                        <button id="board-remove-image" className="remove-image-btn">&times;</button>
                      </div>
                      <button id="board-create-btn" className="board-create-btn">掲示板作成</button>
                    </div>
                  </div>
                </div>
                
                {/* 掲示板一覧 */}
                <div id="boards-list" className="boards-list">
                  <div className="loading-placeholder">掲示板を読み込み中...</div>
                </div>
              </div>
              
              {/* 個別掲示板表示 */}
              <div id="board-detail-view" style="display: none;">
                <div className="board-detail-header">
                  <button id="back-to-list-btn" className="back-btn">← 掲示板一覧に戻る</button>
                  <h3 id="board-detail-title" className="board-detail-title"></h3>
                </div>
                <div id="board-posts" className="board-posts">
                  <div className="loading-placeholder">投稿を読み込み中...</div>
                </div>
                <div id="collapse-toggle" className="collapse-toggle" style="display: none;">
                  <button id="toggle-old-posts-btn" className="toggle-btn">古い投稿を表示/非表示</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* DMタブ */}
          <div id="dm-tab" className="tab-panel">
            <div className="tab-header">
              <h2 className="tab-title">DM</h2>
            </div>
            <div className="content-area" id="dm-content">
              
              {/* 本人認証案内画面 */}
              <div id="dm-identity-prompt" className="dm-identity-prompt" style="display: none;">
                <div className="identity-prompt-content">
                  <h3 className="identity-prompt-title">このサービスの利用には本人認証が必要です</h3>
                  <p className="identity-prompt-text">
                    DMサービスを安全にご利用いただくために、本人認証が必要です。<br/>
                    本人認証を行いますか？
                  </p>
                  <div className="identity-prompt-actions">
                    <button id="dm-identity-yes-btn" className="identity-yes-btn">本人認証を行う</button>
                    <button id="dm-identity-cancel-btn" className="identity-cancel-btn">キャンセル</button>
                  </div>
                </div>
              </div>

              {/* DM一覧画面 */}
              <div id="dm-conversations-list" className="dm-conversations-list" style="display: none;">
                <div id="dm-conversations-container" className="dm-conversations-container">
                  <div className="loading-placeholder">DM履歴を読み込み中...</div>
                </div>
              </div>

              {/* トーク画面 */}
              <div id="dm-chat-view" className="dm-chat-view" style="display: none;">
                <div className="chat-header">
                  <button id="back-to-dm-list-btn" className="back-btn">← DM一覧に戻る</button>
                  <div className="chat-user-info">
                    <img id="chat-user-avatar" className="chat-user-avatar" alt="ユーザーアバター" />
                    <span id="chat-user-name" className="chat-user-name"></span>
                  </div>
                </div>
                <div id="chat-messages" className="chat-messages">
                  <div className="loading-placeholder">メッセージを読み込み中...</div>
                </div>
                <div className="chat-input-area">
                  <div className="chat-input-container">
                    <textarea id="chat-message-input" className="chat-message-input" placeholder="メッセージを入力..." maxLength="500"></textarea>
                    <button id="chat-send-btn" className="chat-send-btn">送信</button>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          {/* プロフィール画面（モーダル） */}
          <div id="profile-modal" className="profile-modal" style="display: none;">
            <div className="profile-modal-content">
              <div className="profile-modal-header">
                <h3 className="profile-modal-title">プロフィール</h3>
                <button id="profile-modal-close" className="profile-modal-close">&times;</button>
              </div>
              <div className="profile-modal-body">
                <div id="profile-content" className="profile-content">
                  <div className="loading-placeholder">プロフィールを読み込み中...</div>
                </div>
                <div className="profile-actions">
                  <button id="profile-send-dm-btn" className="profile-send-dm-btn">DMを送る</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* ブックマークタブ */}
          <div id="bookmark-tab" className="tab-panel">
            <div className="tab-header">
              <h2 className="tab-title">ブックマーク</h2>
            </div>
            <div className="content-area" id="bookmark-content">
              
              {/* カテゴリフィルター */}
              <div className="bookmark-filters">
                <button id="bookmark-filter-all" className="filter-btn active" data-type="all">すべて</button>
                <button id="bookmark-filter-feed" className="filter-btn" data-type="feed">フィード</button>
                <button id="bookmark-filter-event" className="filter-btn" data-type="event">イベント</button>
                <button id="bookmark-filter-board" className="filter-btn" data-type="board">掲示板</button>
              </div>
              
              {/* ブックマーク一覧 */}
              <div id="bookmarks-list" className="bookmarks-list">
                <div className="loading-placeholder">ブックマークを読み込み中...</div>
              </div>
              
            </div>
          </div>
          
        </div>
        
        {/* Board Post Input (shown only in board detail view) */}
        <div id="board-post-input" className="board-post-input" style="display: none;">
          <div className="board-input-container">
            <textarea id="board-post-content" className="board-post-textarea" placeholder="この掲示板に投稿..." maxLength="1000"></textarea>
            <div className="board-input-actions">
              <input type="file" id="board-post-image-input" accept="image/*" style="display: none;" />
              <button id="board-post-image-btn" className="image-attach-btn">📷</button>
              <div id="board-post-image-preview" className="image-preview" style="display: none;">
                <img id="board-post-preview-img" className="preview-img" alt="プレビュー" />
                <button id="board-post-remove-image" className="remove-image-btn">&times;</button>
              </div>
              <button id="board-post-submit-btn" className="board-post-submit-btn">投稿</button>
            </div>
          </div>
        </div>
        
        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          <div className="nav-item active" data-tab="feed">
            <div className="nav-icon feed-icon"></div>
          </div>
          
          <div className="nav-item" data-tab="match">
            <div className="nav-icon match-icon"></div>
          </div>
          
          <div className="nav-item" data-tab="event">
            <div className="nav-icon event-icon"></div>
          </div>
          
          <div className="nav-item" data-tab="board">
            <div className="nav-icon board-icon"></div>
          </div>
          
          <div className="nav-item" data-tab="dm">
            <div className="nav-icon dm-icon"></div>
          </div>
          
          <div className="nav-item" data-tab="bookmark">
            <div className="nav-icon bookmark-icon"></div>
          </div>
        </nav>
        
      </div>
    </div>
  )
})

// Profile setup form handler
app.post('/profile-setup', passwordProtection, async (c) => {
  const formData = await c.req.formData()
  const displayName = formData.get('display_name')?.toString().trim()
  const birthDate = formData.get('birth_date')?.toString().trim()
  const gender = formData.get('gender')?.toString()
  const prefecture = formData.get('prefecture')?.toString()
  const selfIntroduction = formData.get('self_introduction')?.toString().trim() || ''
  
  // 生年月日バリデーション関数
  const validateBirthDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
      return '生年月日は8桁の数字で入力してください'
    }
    
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6))
    const day = parseInt(dateStr.substring(6, 8))
    
    // 年の範囲チェック（1920年以降）
    if (year < 1920) {
      return '生年月日の年は1920年以降で入力してください'
    }
    
    // 月の範囲チェック
    if (month < 1 || month > 12) {
      return '生年月日の月は01から12の間で入力してください'
    }
    
    // 日の範囲チェック
    const daysInMonth = new Date(year, month, 0).getDate()
    if (day < 1 || day > daysInMonth) {
      return `${year}年${month}月の日は01から${daysInMonth.toString().padStart(2, '0')}の間で入力してください`
    }
    
    // 18歳未満チェック
    const inputDate = new Date(year, month - 1, day)
    const today = new Date()
    const age = today.getFullYear() - inputDate.getFullYear()
    const monthDiff = today.getMonth() - inputDate.getMonth()
    const dayDiff = today.getDate() - inputDate.getDate()
    
    // 正確な年齢計算（誕生日を迎えているかチェック）
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
    
    if (actualAge < 18) {
      return '18歳以上の方のみご利用いただけます'
    }
    
    return null // エラーなし
  }
  
  // 基本バリデーション
  if (!displayName || !birthDate || !gender || !prefecture) {
    return c.render(
      <div className="authenticated-body">
        <AppHeader showLogout={true} />
        <div className="profile-setup-container">
          <h1 className="profile-title">基本プロフィール</h1>
          <div className="error-message">必須項目をすべて入力してください</div>
          <a href="/profile-setup" className="btn btn-primary">戻る</a>
        </div>
      </div>
    )
  }
  
  // 生年月日バリデーション
  const birthDateError = validateBirthDate(birthDate)
  if (birthDateError) {
    return c.render(
      <div className="authenticated-body">
        <AppHeader showLogout={true} />
        <div className="profile-setup-container">
          <h1 className="profile-title">基本プロフィール</h1>
          <div className="error-message">{birthDateError}</div>
          <a href="/profile-setup" className="btn btn-primary">戻る</a>
        </div>
      </div>
    )
  }
  
  // 残りのバリデーション
  if (!displayName || !birthDate || !gender || !prefecture) {
    return c.render(
      <div className="authenticated-body">
        <AppHeader showLogout={true} />
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
        birthDate,
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
      <AppHeader showLogout={true} />
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
            
            <div className="media-option" data-value="各種ゲーム">
              <input type="checkbox" name="media_types" value="各種ゲーム" id="media_game" className="media-checkbox" />
              <label htmlFor="media_game" className="media-label">各種ゲーム</label>
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
            
            <div className="genre-option" data-value="魔女">
              <input type="checkbox" name="genre_types" value="魔女" id="genre_witch" className="genre-checkbox" />
              <label htmlFor="genre_witch" className="genre-label">魔女</label>
            </div>
            
            <div className="genre-option" data-value="モンスター/クリーチャー">
              <input type="checkbox" name="genre_types" value="モンスター/クリーチャー" id="genre_monster" className="genre-checkbox" />
              <label htmlFor="genre_monster" className="genre-label">モンスター/クリーチャー</label>
            </div>
            
            <div className="genre-option" data-value="宇宙人/レプティリアン">
              <input type="checkbox" name="genre_types" value="宇宙人/レプティリアン" id="genre_alien" className="genre-checkbox" />
              <label htmlFor="genre_alien" className="genre-label">宇宙人/レプティリアン</label>
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
            
            <div className="genre-option" data-value="ファウンドフッテージ">
              <input type="checkbox" name="genre_types" value="ファウンドフッテージ" id="genre_found_footage" className="genre-checkbox" />
              <label htmlFor="genre_found_footage" className="genre-label">ファウンドフッテージ</label>
            </div>
            
            <div className="genre-option" data-value="モキュメンタリー">
              <input type="checkbox" name="genre_types" value="モキュメンタリー" id="genre_mockumentary" className="genre-checkbox" />
              <label htmlFor="genre_mockumentary" className="genre-label">モキュメンタリー</label>
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
            
            <div className="genre-option" data-value="人形/人形者">
              <input type="checkbox" name="genre_types" value="人形/人形者" id="genre_doll" className="genre-checkbox" />
              <label htmlFor="genre_doll" className="genre-label">人形/人形者</label>
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
            
            <div className="ng-option" data-value="モキュメンタリー">
              <input type="checkbox" name="ng_types" value="モキュメンタリー" id="ng_mockumentary" className="ng-checkbox" />
              <label htmlFor="ng_mockumentary" className="ng-label">モキュメンタリー</label>
            </div>
            
            <div className="ng-option" data-value="スラッシャー/スプラッタ/Gore">
              <input type="checkbox" name="ng_types" value="スラッシャー/スプラッタ/Gore" id="ng_slasher" className="ng-checkbox" />
              <label htmlFor="ng_slasher" className="ng-label">スラッシャー/スプラッタ/Gore</label>
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
            
            <div className="ng-option" data-value="人形/人形者">
              <input type="checkbox" name="ng_types" value="人形/人形者" id="ng_doll" className="ng-checkbox" />
              <label htmlFor="ng_doll" className="ng-label">人形/人形者</label>
            </div>
          </div>
          
          <h2 className="belief-title">幽霊・怪奇現象を信じる？</h2>
          
          <div className="belief-grid">
            <div className="belief-option">
              <input type="radio" name="ghost_belief" value="信じる" id="ghost_believe" className="belief-radio" />
              <label htmlFor="ghost_believe" className="belief-label">信じる</label>
            </div>
            
            <div className="belief-option">
              <input type="radio" name="ghost_belief" value="信じない" id="ghost_not_believe" className="belief-radio" />
              <label htmlFor="ghost_not_believe" className="belief-label">信じない</label>
            </div>
            
            <div className="belief-option">
              <input type="radio" name="ghost_belief" value="分からない" id="ghost_unknown" className="belief-radio" />
              <label htmlFor="ghost_unknown" className="belief-label">分からない</label>
            </div>
          </div>
          
          <h2 className="story-title">怪談は実話だと思う？</h2>
          
          <div className="story-grid">
            <div className="story-option">
              <input type="radio" name="story_belief" value="一部は実話" id="story_partial" className="story-radio" />
              <label htmlFor="story_partial" className="story-label">一部は実話</label>
            </div>
            
            <div className="story-option">
              <input type="radio" name="story_belief" value="フィクション" id="story_fiction" className="story-radio" />
              <label htmlFor="story_fiction" className="story-label">フィクション</label>
            </div>
            
            <div className="story-option">
              <input type="radio" name="story_belief" value="分からない" id="story_unknown" className="story-radio" />
              <label htmlFor="story_unknown" className="story-label">分からない</label>
            </div>
          </div>
          
          <h2 className="paranormal-title">お化けを見る為ならちょっと不謹慎なことをしてみたい？(例:心霊スポットで肝試し、自己責任系の呪術等)</h2>
          
          <div className="paranormal-grid">
            <div className="paranormal-option">
              <input type="radio" name="paranormal_activity" value="はい" id="paranormal_yes" className="paranormal-radio" />
              <label htmlFor="paranormal_yes" className="paranormal-label">はい</label>
            </div>
            
            <div className="paranormal-option">
              <input type="radio" name="paranormal_activity" value="いいえ" id="paranormal_no" className="paranormal-radio" />
              <label htmlFor="paranormal_no" className="paranormal-label">いいえ</label>
            </div>
            
            <div className="paranormal-option">
              <input type="radio" name="paranormal_activity" value="どちらとも言えない/無回答" id="paranormal_neutral" className="paranormal-radio" />
              <label htmlFor="paranormal_neutral" className="paranormal-label">どちらとも言えない/無回答</label>
            </div>
          </div>
          
          <div className="media-actions">
            <button type="submit" className="next-btn">
              はじめる
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
  const ghostBelief = formData.get('ghost_belief')?.toString() || ''
  const storyBelief = formData.get('story_belief')?.toString() || ''
  const paranormalActivity = formData.get('paranormal_activity')?.toString() || ''
  
  // プロフィール情報にホラー好み設定を保存
  const currentUser = getCookie(c, 'current_user')
  if (currentUser && users.has(currentUser)) {
    const user = users.get(currentUser)
    users.set(currentUser, {
      ...user,
      horrorPreferences: {
        mediaTypes: mediaTypes || [],
        genreTypes: genreTypes || [],
        ngTypes: ngTypes || [],
        ghostBelief: ghostBelief,
        storyBelief: storyBelief,
        paranormalActivity: paranormalActivity
      }
    })
  }
  
  // メインページに移動
  return c.redirect('/')
})

// Profile page
app.get('/profile/:userId', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const targetUserId = c.req.param('userId')
  const currentUser = users.get(currentUserId)
  const targetUser = users.get(targetUserId)
  
  // 本人認証状態を確認
  const targetVerification = globalData.identityVerifications.get(targetUserId)
  if (targetUser && targetVerification && targetVerification.status === 'approved') {
    targetUser.isVerified = true
  }
  
  if (!targetUser || !targetUser.profile) {
    return c.redirect('/')
  }
  
  // ブロックチェック
  const blockedByTarget = globalData.blockedUsers.get(targetUserId) || new Set()
  const blockedByCurrent = globalData.blockedUsers.get(currentUserId) || new Set()
  
  if (blockedByTarget.has(currentUserId) || blockedByCurrent.has(targetUserId)) {
    return c.redirect('/')
  }
  
  const isOwnProfile = currentUserId === targetUserId
  
  return c.render(
    <div className="authenticated-body">
      <AppHeader showLogout={true} currentUser={currentUser} />
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {globalData.profileImages.get(targetUserId) ? (
              <img src={globalData.profileImages.get(targetUserId)} alt="プロフィール画像" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-placeholder"></div>
            )}
            {isOwnProfile && (
              <button className="edit-avatar-btn" onclick="window.location.href='/profile/edit'">編集</button>
            )}
          </div>
          
          <div className="profile-info">
            <h1 className="profile-name">
              {targetUser.displayName || targetUser.profile.displayName}
              {targetUser.isVerified && <span className="verified-badge">本人認証済み</span>}
            </h1>
            
            <div className="profile-details">
              <div className="profile-detail-item">
                <span className="detail-label">性別:</span>
                <span className="detail-value">{targetUser.profile.gender || '未設定'}</span>
              </div>
              <div className="profile-detail-item">
                <span className="detail-label">都道府県:</span>
                <span className="detail-value">{targetUser.profile.prefecture || '未設定'}</span>
              </div>
            </div>
            
            {targetUser.profile.selfIntroduction && (
              <div className="profile-introduction">
                <h3>自己紹介</h3>
                <p>{targetUser.profile.selfIntroduction}</p>
              </div>
            )}
          </div>
          
          <div className="profile-actions">
            {isOwnProfile ? (
              <div className="own-profile-actions">
                <button className="btn btn-primary" onclick="window.location.href='/profile/edit'">プロフィール編集</button>
                <button className="btn btn-secondary" onclick="window.location.href='/identity-verification'">本人認証</button>
              </div>
            ) : (
              <div className="other-profile-actions" data-user-id={targetUserId}>
                <button className="btn btn-primary follow-btn" style={{ display: 'none' }}>フィードに追加</button>
                {targetUser.isVerified && (
                  <button className="btn btn-secondary dm-btn">DM送信</button>
                )}
                <button className="btn btn-danger block-btn">ブロック</button>
              </div>
            )}
          </div>
        </div>
        
        {/* ホラーの好み */}
        {targetUser.horrorPreferences && (
          <div className="profile-section">
            <h3>ホラーの好み</h3>
            <div className="horror-preferences">
              {targetUser.horrorPreferences.mediaTypes?.length > 0 && (
                <div className="preference-group">
                  <span className="preference-label">メディアタイプ:</span>
                  <div className="preference-tags">
                    {targetUser.horrorPreferences.mediaTypes.map((type, index) => (
                      <span key={index} className="preference-tag">{type}</span>
                    ))}
                  </div>
                </div>
              )}
              {targetUser.horrorPreferences.genreTypes?.length > 0 && (
                <div className="preference-group">
                  <span className="preference-label">ジャンル:</span>
                  <div className="preference-tags">
                    {targetUser.horrorPreferences.genreTypes.map((type, index) => (
                      <span key={index} className="preference-tag">{type}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 最新の投稿 */}
        <div className="profile-section">
          <h3>最新の投稿</h3>
          <div id="profile-recent-posts" className="recent-posts-container">
            {/* JavaScript で動的に読み込み */}
          </div>
        </div>
        
        {/* 自分のプロフィールの場合のみ表示 */}
        {isOwnProfile && (
          <div className="profile-section">
            <h3>ブロック管理</h3>
            <div id="blocked-users-list" className="blocked-users-container">
              {/* JavaScript で動的に読み込み */}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

// Profile edit page
app.get('/profile/edit', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  
  return c.render(
    <div className="authenticated-body">
      <AppHeader showLogout={true} currentUser={currentUser} />
      <div className="profile-edit-container">
        <h1>プロフィール編集</h1>
        
        <form className="profile-edit-form" method="POST" action="/profile/update" enctype="multipart/form-data">
          <div className="form-section">
            <h3>プロフィール画像</h3>
            <div className="avatar-upload-area">
              <div className="current-avatar">
                {globalData.profileImages.get(currentUserId) ? (
                  <img src={globalData.profileImages.get(currentUserId)} alt="現在のプロフィール画像" className="current-avatar-img" />
                ) : (
                  <div className="current-avatar-placeholder"></div>
                )}
              </div>
              <input type="file" name="profileImage" accept="image/*" className="avatar-input" />
              <button type="button" className="btn btn-secondary" onclick="document.querySelector('.avatar-input').click()">画像を選択</button>
            </div>
          </div>
          
          <div className="form-section">
            <h3>基本情報</h3>
            <div className="form-group">
              <label className="form-label">表示名</label>
              <input type="text" name="displayName" className="form-control" value={currentUser?.displayName || ''} required />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">保存</button>
            <a href={`/profile/${currentUserId}`} className="btn btn-secondary">キャンセル</a>
          </div>
        </form>
      </div>
    </div>
  )
})

// Identity verification page
app.get('/identity-verification', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  const verification = globalData.identityVerifications.get(currentUserId)
  
  return c.render(
    <div className="authenticated-body">
      <AppHeader showLogout={true} currentUser={currentUser} />
      <div className="verification-container">
        <h1>本人認証</h1>
        
        {verification ? (
          <div className="verification-status">
            {verification.status === 'pending' && (
              <div className="status-pending">
                <h3>審査中</h3>
                <p>提出された書類を審査中です。審査完了まで今しばらくお待ちください。</p>
                <div className="submitted-info">
                  <p><strong>提出日:</strong> {new Date(verification.submittedAt).toLocaleDateString('ja-JP')}</p>
                  <p><strong>書類:</strong> {verification.documentType}</p>
                </div>
              </div>
            )}
            
            {verification.status === 'approved' && (
              <div className="status-approved">
                <h3>認証済み</h3>
                <p>本人認証が完了しています。</p>
                <div className="verification-badge">
                  <span className="verified-icon">✓</span>
                  認証済みユーザー
                </div>
              </div>
            )}
            
            {verification.status === 'rejected' && (
              <div className="status-rejected">
                <h3>審査不合格</h3>
                <p>提出された書類では本人認証を完了できませんでした。</p>
                {verification.rejectionReason && (
                  <p><strong>理由:</strong> {verification.rejectionReason}</p>
                )}
                <p>再度、正しい本人確認書類を提出してください。</p>
              </div>
            )}
          </div>
        ) : (
          <div className="verification-form-container">
            <div className="verification-info">
              <h3>本人認証について</h3>
              <ul>
                <li>本人認証を行うことで、DM機能を使用できるようになります</li>
                <li>運転免許証、パスポート、マイナンバーカードなどの公的身分証明書が必要です</li>
                <li>提出された画像は認証のみに使用され、第三者に公開されることはありません</li>
                <li>審査には2-3営業日程度かかります</li>
              </ul>
            </div>
            
            <form className="verification-form" method="POST" action="/identity-verification/submit" enctype="multipart/form-data">
              <div className="form-group">
                <label className="form-label">本人確認書類の種類</label>
                <select name="documentType" className="form-control" required>
                  <option value="">選択してください</option>
                  <option value="drivers_license">運転免許証</option>
                  <option value="passport">パスポート</option>
                  <option value="mynumber_card">マイナンバーカード</option>
                  <option value="residence_card">在留カード</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">本人確認書類の画像</label>
                <input type="file" name="documentImage" accept="image/*" className="form-control" required />
                <small className="form-text">JPEGまたはPNG形式、最大5MBまで</small>
              </div>
              
              <div className="form-group">
                <label className="checkbox-container">
                  <input type="checkbox" name="agreement" required />
                  <span className="checkmark"></span>
                  個人情報の取り扱いに同意します
                </label>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">本人確認書類を提出</button>
                <a href={`/profile/${currentUserId}`} className="btn btn-secondary">戻る</a>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
})

// Identity verification submission
app.post('/identity-verification/submit', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const formData = await c.req.formData()
  
  const documentType = formData.get('documentType')?.toString()
  const documentImage = formData.get('documentImage') as File
  const agreement = formData.get('agreement')
  
  if (!documentType || !documentImage || !agreement) {
    return c.redirect('/identity-verification?error=required_fields')
  }
  
  if (documentImage.size > 5 * 1024 * 1024) {
    return c.redirect('/identity-verification?error=file_too_large')
  }
  
  try {
    // 画像をBase64に変換して保存
    const buffer = await documentImage.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    const imageData = `data:${documentImage.type};base64,${base64}`
    
    // 本人認証データを保存
    globalData.identityVerifications.set(currentUserId, {
      status: 'pending',
      documentType: documentType,
      documentImage: imageData,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null
    })
    
    return c.redirect('/identity-verification?success=submitted')
  } catch (error) {
    console.error('Identity verification submission error:', error)
    return c.redirect('/identity-verification?error=upload_failed')
  }
})

// Profile update handler
app.post('/profile/update', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const formData = await c.req.formData()
  
  const displayName = formData.get('displayName')?.toString().trim()
  const profileImage = formData.get('profileImage') as File
  
  if (!displayName) {
    return c.redirect('/profile/edit?error=required')
  }
  
  const currentUser = users.get(currentUserId)
  if (!currentUser) {
    return c.redirect('/logout')
  }
  
  // 表示名更新
  users.set(currentUserId, {
    ...currentUser,
    displayName: displayName
  })
  
  // プロフィール画像処理
  if (profileImage && profileImage.size > 0) {
    if (profileImage.size > 5 * 1024 * 1024) { // 5MB制限
      return c.redirect('/profile/edit?error=file_too_large')
    }
    
    try {
      // 画像をBase64に変換して保存
      const buffer = await profileImage.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      const imageUrl = `data:${profileImage.type};base64,${base64}`
      
      globalData.profileImages.set(currentUserId, imageUrl)
    } catch (error) {
      console.error('Profile image upload error:', error)
      return c.redirect('/profile/edit?error=upload_failed')
    }
  }
  
  return c.redirect(`/profile/${currentUserId}`)
})

// Follow user API
app.post('/api/profile/follow', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const formData = await c.req.formData()
  const targetUserId = formData.get('userId')?.toString()
  
  if (!targetUserId || !users.has(targetUserId)) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  if (currentUserId === targetUserId) {
    return c.json({ error: 'Cannot follow yourself' }, 400)
  }
  
  // ブロックチェック
  const blockedByCurrent = globalData.blockedUsers.get(currentUserId) || new Set()
  const blockedByTarget = globalData.blockedUsers.get(targetUserId) || new Set()
  
  if (blockedByCurrent.has(targetUserId) || blockedByTarget.has(currentUserId)) {
    return c.json({ error: 'Cannot follow blocked user' }, 403)
  }
  
  let followingSet = globalData.followingUsers.get(currentUserId)
  if (!followingSet) {
    followingSet = new Set()
    globalData.followingUsers.set(currentUserId, followingSet)
  }
  
  const isFollowing = followingSet.has(targetUserId)
  
  if (isFollowing) {
    followingSet.delete(targetUserId)
    return c.json({ success: true, following: false, message: 'フィードから除外しました' })
  } else {
    followingSet.add(targetUserId)
    return c.json({ success: true, following: true, message: 'フィードに追加しました' })
  }
})

// Block user API
app.post('/api/profile/block', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const formData = await c.req.formData()
  const targetUserId = formData.get('userId')?.toString()
  
  if (!targetUserId || !users.has(targetUserId)) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  if (currentUserId === targetUserId) {
    return c.json({ error: 'Cannot block yourself' }, 400)
  }
  
  let blockedSet = globalData.blockedUsers.get(currentUserId)
  if (!blockedSet) {
    blockedSet = new Set()
    globalData.blockedUsers.set(currentUserId, blockedSet)
  }
  
  blockedSet.add(targetUserId)
  
  // フォロー関係も削除
  const followingSet = globalData.followingUsers.get(currentUserId)
  if (followingSet) {
    followingSet.delete(targetUserId)
  }
  
  return c.json({ success: true, message: 'ユーザーをブロックしました' })
})

// Get recent posts for profile API
app.get('/api/profile/:userId/posts', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const targetUserId = c.req.param('userId')
  
  if (!users.has(targetUserId)) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  // ブロックチェック
  const blockedByCurrent = globalData.blockedUsers.get(currentUserId) || new Set()
  const blockedByTarget = globalData.blockedUsers.get(targetUserId) || new Set()
  
  if (blockedByCurrent.has(targetUserId) || blockedByTarget.has(currentUserId)) {
    return c.json({ error: 'User is blocked' }, 403)
  }
  
  const recentPosts = []
  
  // フィード投稿
  const feedPosts = globalData.posts.filter(post => post.userid === targetUserId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map(post => ({
      type: 'feed',
      id: post.id,
      content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      timestamp: post.timestamp,
      link: null
    }))
  
  // 掲示板投稿
  const boardPosts = []
  for (const [boardId, board] of globalData.boards) {
    const userPosts = board.posts.filter(post => post.userid === targetUserId)
      .map(post => ({
        type: 'board',
        id: post.id,
        content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        timestamp: post.timestamp,
        link: `/board/${boardId}`,
        boardTitle: board.title
      }))
    boardPosts.push(...userPosts)
  }
  
  // イベント投稿
  const eventPosts = []
  for (const [eventId, event] of globalData.events) {
    if (event.createdBy === targetUserId) {
      eventPosts.push({
        type: 'event',
        id: eventId,
        content: event.title + ' - ' + event.description.substring(0, 80),
        timestamp: new Date(event.createdAt).getTime(),
        link: `/event/${eventId}`,
        eventTitle: event.title
      })
    }
  }
  
  // 全投稿をマージして最新10件を取得
  const allPosts = [...feedPosts, ...boardPosts, ...eventPosts]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
  
  return c.json({ posts: allPosts })
})

// Get blocked users list API
app.get('/api/profile/blocked', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const blockedSet = globalData.blockedUsers.get(currentUserId) || new Set()
  
  const blockedUsers = Array.from(blockedSet).map(userId => {
    const user = users.get(userId)
    return user ? {
      userId: userId,
      displayName: user.displayName || user.profile?.displayName || 'Unknown User'
    } : null
  }).filter(user => user !== null)
  
  return c.json({ blockedUsers })
})

// Unblock user API
app.post('/api/profile/unblock', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const formData = await c.req.formData()
  const targetUserId = formData.get('userId')?.toString()
  
  if (!targetUserId) {
    return c.json({ error: 'User ID required' }, 400)
  }
  
  const blockedSet = globalData.blockedUsers.get(currentUserId)
  if (!blockedSet || !blockedSet.has(targetUserId)) {
    return c.json({ error: 'User is not blocked' }, 400)
  }
  
  blockedSet.delete(targetUserId)
  
  return c.json({ success: true, message: 'ブロックを解除しました' })
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
  
  return c.redirect('/welcome')
})

// [本番環境では無効化] デバッグ用ユーザー管理機能（開発環境でのみ使用）
// PM2再起動対応の一時的対処法
// app.get('/debug/users', (c) => {
//   // 簡単な認証（本番では削除推奨）
//   const debugPassword = c.req.query('debug_key')
//   if (debugPassword !== 'horror_debug_2024') {
//     return c.text('Unauthorized', 401)
//   }
//   
//   const userList = Array.from(users.entries()).map(([userid, userData]) => ({
//     userid,
//     createdAt: userData.createdAt,
//     hasProfile: !!userData.profile,
//     displayName: userData.profile?.displayName || 'Not set'
//   }))
//   
//   return c.json({
//     message: 'Debug user status (PM2 restart safe)',
//     totalUsers: users.size,
//     users: userList,
//     lastInitialized: new Date().toISOString()
//   })
// })

// [本番環境では無効化] デバッグ用ユーザー再初期化エンドポイント
// app.post('/debug/reinit-users', async (c) => {
//   const debugPassword = c.req.query('debug_key')
//   if (debugPassword !== 'horror_debug_2024') {
//     return c.text('Unauthorized', 401)
//   }
//   
//   // 再初期化実行
//   initializeDebugUsers()
//   
//   return c.json({
//     message: 'Debug users reinitialized successfully',
//     totalUsers: users.size,
//     timestamp: new Date().toISOString()
//   })
// })

// [本番環境では無効化] 緊急データ復旧エンドポイント
// app.post('/debug/emergency-recovery', async (c) => {
//   const debugPassword = c.req.query('debug_key')
//   if (debugPassword !== 'horror_debug_2024') {
//     return c.text('Unauthorized', 401)
//   }
//   
//   console.log(`[RECOVERY] 緊急データ復旧を実行します`)
//   
//   // 全データを強制再初期化
//   users.clear()
//   posts.clear()
//   postIdCounter = 1
//   
//   initializeDebugUsers()
//   initializeDebugPosts()
//   
//   return c.json({
//     message: 'Emergency recovery completed successfully',
//     totalUsers: users.size,
//     totalPosts: posts.size,
//     recoveryTime: new Date().toISOString()
//   })
// })

// [本番環境では無効化] データ状態監視エンドポイント
// app.get('/debug/system-status', (c) => {
//   const debugPassword = c.req.query('debug_key')
//   if (debugPassword !== 'horror_debug_2024') {
//     return c.text('Unauthorized', 401)
//   }
//   
//   const usersList = Array.from(users.entries()).map(([userid, userData]) => ({
//     userid,
//     hasProfile: !!userData.profile,
//     displayName: userData.profile?.displayName || 'Not set',
//     hasHorrorPreferences: !!userData.horrorPreferences
//   }))
//   
//   const postsList = Array.from(posts.entries()).map(([postId, postData]) => ({
//     postId,
//     userid: postData.userid,
//     hasContent: !!postData.content,
//     timestamp: postData.timestamp,
//     replyCount: (postData.replies || []).length
//   }))
//   
//   return c.json({
//     systemStatus: 'running',
//     dataIntegrity: {
//       usersCount: users.size,
//       postsCount: posts.size,
//       lastCheck: new Date().toISOString()
//     },
//     users: usersList,
//     posts: postsList,
//     memoryUsage: {
//       usersMapSize: users.size,
//       postsMapSize: posts.size
//     }
//   })
// })

// フィード投稿作成API
app.post('/api/posts', passwordProtection, async (c) => {
  const currentUser = getCookie(c, 'current_user')
  if (!currentUser || !users.has(currentUser)) {
    return c.json({ error: 'User not found' }, 401)
  }
  
  const formData = await c.req.formData()
  const content = formData.get('content')?.toString().trim()
  const imageFile = formData.get('image') as File | null
  
  if (!content || content.length === 0) {
    return c.json({ error: '投稿内容を入力してください' }, 400)
  }
  
  if (content.length > 500) {
    return c.json({ error: '投稿は500文字以内で入力してください' }, 400)
  }
  
  // 画像処理（簡易実装 - 実際のアプリではCloudflare R2などを使用）
  let imageData = null
  if (imageFile && imageFile.size > 0) {
    // ファイルタイプチェック
    if (!imageFile.type.startsWith('image/')) {
      return c.json({ error: '画像ファイルのみアップロード可能です' }, 400)
    }
    
    // ファイルサイズチェック（5MB制限） 
    if (imageFile.size > 5 * 1024 * 1024) {
      return c.json({ error: '画像ファイルは5MB以下にしてください' }, 400)
    }
    
    // 画像データを保存（実際の本番環境では外部ストレージに保存）
    const arrayBuffer = await imageFile.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    imageData = {
      type: imageFile.type,
      size: imageFile.size,
      data: base64,
      name: imageFile.name || 'image.jpg'
    }
  }
  
  // 新しい投稿を作成
  const postId = `post_${postIdCounter++}`
  const newPost = {
    id: postId,
    userid: currentUser,
    content: content,
    image: imageData,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
    replies: [],
    bookmarkedBy: []
  }
  
  posts.set(postId, newPost)
  
  return c.json({
    success: true,
    post: newPost,
    message: imageData ? '画像付きで投稿しました' : '投稿しました'
  })
})

// フィード取得API
app.get('/api/feed', passwordProtection, (c) => {
  const currentUser = getCookie(c, 'current_user')
  
  // データ整合性チェック・自動復旧
  if (users.size === 0) {
    console.log(`[EMERGENCY] ユーザーデータ消失検出 - 緊急復旧実行`)
    initializeDebugUsers()
  }
  if (posts.size === 0) {
    console.log(`[EMERGENCY] 投稿データ消失検出 - 緊急復旧実行`)
    initializeDebugPosts()
  }
  
  if (!currentUser || !users.has(currentUser)) {
    // ユーザーが見つからない場合、デバッグユーザーとして再初期化を提案
    return c.json({ 
      error: 'User not found', 
      suggestion: 'デバッグユーザーでログインしてください',
      debugUsers: ['debug_user1', 'debug_user2']
    }, 401)
  }
  
  const user = users.get(currentUser)
  const feedPosts: any[] = []
  
  // 表示対象のユーザーIDを決定
  const allowedUserIds = new Set([currentUser]) // 自分の投稿は必ず表示
  
  // マッチング度50%以上のユーザーを取得
  for (const [userid, otherUser] of users.entries()) {
    if (userid === currentUser) continue
    
    const matchingScore = calculateMatchPercentage(user.profile, otherUser.profile)
    if (matchingScore >= 50) {
      allowedUserIds.add(userid)
    }
  }
  
  // フォローしたユーザーも追加
  const followingSet = globalData.followingUsers.get(currentUser)
  if (followingSet) {
    for (const followedUserId of followingSet) {
      // ブロックされていない場合のみ追加
      const blockedByCurrent = globalData.blockedUsers.get(currentUser) || new Set()
      const blockedByTarget = globalData.blockedUsers.get(followedUserId) || new Set()
      
      if (!blockedByCurrent.has(followedUserId) && !blockedByTarget.has(currentUser)) {
        allowedUserIds.add(followedUserId)
      }
    }
  }
  
  // ブロックされたユーザーを除外
  const blockedByCurrentUser = globalData.blockedUsers.get(currentUser) || new Set()
  for (const blockedUserId of blockedByCurrentUser) {
    allowedUserIds.delete(blockedUserId)
  }
  
  // 対象ユーザーの投稿を取得
  for (const [postId, post] of posts.entries()) {
    if (allowedUserIds.has(post.userid)) {
      const postUser = users.get(post.userid)
      // より堅牢なdisplayName取得ロジック
      let displayName = post.userid // デフォルトフォールバック
      
      if (postUser) {
        // 1. profile.displayName をチェック
        if (postUser.profile?.displayName) {
          displayName = postUser.profile.displayName
        }
        // 2. 直接のdisplayNameプロパティをチェック  
        else if (postUser.displayName) {
          displayName = postUser.displayName
        }
        // 3. useridをフォールバックとして使用
      }
      
      // デバッグ情報を出力
      if (displayName === post.userid) {
        console.log(`[DEBUG] ユーザー ${post.userid} の表示名が見つかりません:`, {
          postUser: postUser ? {
            userid: postUser.userid,
            hasProfile: !!postUser.profile,
            profileDisplayName: postUser.profile?.displayName,
            directDisplayName: postUser.displayName
          } : null
        })
      }
      
      feedPosts.push({
        ...post,
        displayName: displayName,
        isOwnPost: post.userid === currentUser
      })
    }
  }
  
  // タイムスタンプ順でソート（新しい順）
  feedPosts.sort((a, b) => b.timestamp - a.timestamp)
  
  return c.json({
    posts: feedPosts,
    totalPosts: feedPosts.length,
    currentUser: {
      userid: currentUser,
      displayName: user?.profile?.displayName || currentUser
    }
  })
})

// 投稿への返信API
app.post('/api/posts/:postId/replies', passwordProtection, async (c) => {
  const currentUser = getCookie(c, 'current_user')
  if (!currentUser || !users.has(currentUser)) {
    return c.json({ error: 'User not found' }, 401)
  }
  
  const postId = c.req.param('postId')
  if (!posts.has(postId)) {
    return c.json({ error: 'Post not found' }, 404)
  }
  
  const formData = await c.req.formData()
  const content = formData.get('content')?.toString().trim()
  
  if (!content || content.length === 0) {
    return c.json({ error: '返信内容を入力してください' }, 400)
  }
  
  if (content.length > 300) {
    return c.json({ error: '返信は300文字以内で入力してください' }, 400)
  }
  
  const post = posts.get(postId)
  const reply = {
    id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userid: currentUser,
    content: content,
    timestamp: Date.now(),
    createdAt: new Date().toISOString()
  }
  
  post.replies.push(reply)
  posts.set(postId, post)
  
  const user = users.get(currentUser)
  return c.json({
    success: true,
    reply: {
      ...reply,
      displayName: user?.profile?.displayName || currentUser
    }
  })
})

// ブックマーク追加/削除API
app.post('/api/posts/:postId/bookmark', passwordProtection, async (c) => {
  const currentUser = getCookie(c, 'current_user')
  if (!currentUser || !users.has(currentUser)) {
    return c.json({ error: 'User not found' }, 401)
  }
  
  const postId = c.req.param('postId')
  if (!posts.has(postId)) {
    return c.json({ error: 'Post not found' }, 404)
  }
  
  const post = posts.get(postId)
  const bookmarkIndex = post.bookmarkedBy.indexOf(currentUser)
  
  if (bookmarkIndex === -1) {
    // ブックマーク追加
    post.bookmarkedBy.push(currentUser)
    posts.set(postId, post)
    return c.json({ success: true, bookmarked: true, message: 'ブックマークに追加しました' })
  } else {
    // ブックマーク削除
    post.bookmarkedBy.splice(bookmarkIndex, 1)
    posts.set(postId, post)
    return c.json({ success: true, bookmarked: false, message: 'ブックマークを削除しました' })
  }
})

// 掲示板投稿ブックマーク追加/削除API
app.post('/api/boards/:boardId/posts/:postId/bookmark', passwordProtection, async (c) => {
  const currentUser = getCookie(c, 'current_user')
  if (!currentUser || !users.has(currentUser)) {
    return c.json({ error: 'User not found' }, 401)
  }
  
  const boardId = c.req.param('boardId')
  const postId = c.req.param('postId')
  
  if (!globalData.boards.has(boardId)) {
    return c.json({ error: 'Board not found' }, 404)
  }
  
  const board = globalData.boards.get(boardId)
  const post = board.posts.find(p => p.id === postId)
  
  if (!post) {
    return c.json({ error: 'Post not found' }, 404)
  }
  
  // bookmarkedBy配列がない場合は初期化
  if (!post.bookmarkedBy) {
    post.bookmarkedBy = []
  }
  
  const bookmarkIndex = post.bookmarkedBy.indexOf(currentUser)
  
  if (bookmarkIndex === -1) {
    // ブックマーク追加
    post.bookmarkedBy.push(currentUser)
    globalData.boards.set(boardId, board)
    return c.json({ success: true, bookmarked: true, message: 'ブックマークに追加しました' })
  } else {
    // ブックマーク削除
    post.bookmarkedBy.splice(bookmarkIndex, 1)
    globalData.boards.set(boardId, board)
    return c.json({ success: true, bookmarked: false, message: 'ブックマークを削除しました' })
  }
})

// マッチング計算アルゴリズム
const calculateMatchPercentage = (user1Profile: any, user2Profile: any) => {
  if (!user1Profile || !user2Profile) return 0
  
  // ホラージャンルのマッチング
  const user1Genres = user1Profile.horrorGenres || []
  const user2Genres = user2Profile.horrorGenres || []
  
  if (user1Genres.length === 0 || user2Genres.length === 0) return 0
  
  // 共通ジャンル数を計算
  const commonGenres = user1Genres.filter((genre: string) => user2Genres.includes(genre))
  const totalGenres = new Set([...user1Genres, ...user2Genres]).size
  
  // ジャンルマッチ率 (70%の重み)
  const genreMatchRate = (commonGenres.length / Math.max(user1Genres.length, user2Genres.length)) * 0.7
  
  // 経験レベルマッチング (30%の重み)
  let experienceMatchRate = 0
  const exp1 = user1Profile.experience || ''
  const exp2 = user2Profile.experience || ''
  
  if (exp1 === exp2) {
    experienceMatchRate = 0.3 // 完全一致
  } else if ((exp1 === '初心者' && exp2 === '中級者') || 
             (exp1 === '中級者' && exp2 === '初心者') ||
             (exp1 === '中級者' && exp2 === '上級者') ||
             (exp1 === '上級者' && exp2 === '中級者')) {
    experienceMatchRate = 0.15 // 隣接レベル
  }
  
  return Math.round((genreMatchRate + experienceMatchRate) * 100)
}

// マッチングAPI
app.get('/api/matches', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  
  if (!currentUser || !currentUser.profile) {
    return c.json({ matches: [] })
  }
  
  const matches: any[] = []
  const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
  
  users.forEach((user, userId) => {
    if (userId === currentUserId || !user.profile) return
    
    const matchPercentage = calculateMatchPercentage(currentUser.profile, user.profile)
    
    if (matchPercentage >= 50) {
      const isNew = new Date(user.createdAt).getTime() > oneMonthAgo
      
      matches.push({
        userId,
        displayName: user.displayName || user.profile.displayName || 'Unknown',
        prefecture: user.profile.prefecture || '未設定',
        matchPercentage,
        isNew,
        avatar: user.profile.avatar || null
      })
    }
  })
  
  // マッチ率の高い順にソート
  matches.sort((a, b) => b.matchPercentage - a.matchPercentage)
  
  return c.json({ matches })
})

// [削除済み] 古いDM送信API - /api/dm/send/:userId に統合

// DM一覧取得API（ブロック・削除機能対応）
app.get('/api/dm/conversations', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  
  // 本人認証チェック
  if (!checkIdentityVerification(currentUserId)) {
    return c.json({ error: 'identity_verification_required', message: '本人認証が必要です' })
  }
  
  if (!globalData.dms) {
    return c.json({ conversations: [] })
  }
  
  const conversationMap = new Map()
  const blockedSet = globalData.blockedUsers.get(currentUserId) || new Set()
  const deletedSet = globalData.deletedConversations.get(currentUserId) || new Set()
  
  // Map効率化: forEach を for...of に変更
  for (const [dmId, dm] of globalData.dms) {
    if (dm.senderId === currentUserId || dm.recipientId === currentUserId) {
      const otherUserId = dm.senderId === currentUserId ? dm.recipientId : dm.senderId
      const otherUser = users.get(otherUserId)
      
      // ブロックされたユーザーまたは削除されたトークは除外
      if (blockedSet.has(otherUserId) || deletedSet.has(otherUserId)) {
        continue
      }
      
      if (otherUser) {
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            userId: otherUserId,
            displayName: otherUser.displayName || otherUser.profile?.displayName || 'Unknown',
            avatar: otherUser.profile?.avatar || null, 
            lastMessage: dm.message,
            lastTimestamp: dm.timestamp,
            unreadCount: 0
          })
        } else {
          const conv = conversationMap.get(otherUserId)
          if (dm.timestamp > conv.lastTimestamp) {
            conv.lastMessage = dm.message
            conv.lastTimestamp = dm.timestamp
          }
        }
        
        // 未読カウント
        if (dm.recipientId === currentUserId && !dm.read) {
          conversationMap.get(otherUserId).unreadCount++
        }
      }
    }
  }
  
  const conversations = Array.from(conversationMap.values())
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
  
  return c.json({ conversations })
})

// 個別DM会話取得API
app.get('/api/dm/conversation/:userId', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const targetUserId = c.req.param('userId')
  
  // 本人認証チェック
  if (!checkIdentityVerification(currentUserId)) {
    return c.json({ error: 'identity_verification_required', message: '本人認証が必要です' })
  }
  
  const targetUser = users.get(targetUserId)
  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  const blockedSet = globalData.blockedUsers.get(currentUserId) || new Set()
  if (blockedSet.has(targetUserId)) {
    return c.json({ error: 'User is blocked' }, 403)
  }
  
  // 会話のメッセージを取得（Map効率化）
  const messages = []
  for (const [dmId, dm] of globalData.dms) {
    if ((dm.senderId === currentUserId && dm.recipientId === targetUserId) ||
        (dm.senderId === targetUserId && dm.recipientId === currentUserId)) {
      messages.push(dm)
      // 未読メッセージを既読に変更（同時実行で効率化）
      if (dm.senderId === targetUserId && dm.recipientId === currentUserId && !dm.read) {
        dm.read = true
      }
    }
  }
  messages.sort((a: any, b: any) => a.timestamp - b.timestamp)
  
  return c.json({
    user: {
      userId: targetUserId,
      displayName: targetUser.displayName || targetUser.profile?.displayName || 'Unknown',
      avatar: targetUser.profile?.avatar || null
    },
    messages: messages.map((dm: any) => ({
      id: dm.id,
      senderId: dm.senderId,
      message: dm.message,
      timestamp: dm.timestamp,
      read: dm.read
    }))
  })
})

// DM送信API（本人認証対応）
app.post('/api/dm/send/:userId', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const recipientId = c.req.param('userId')
  
  // 本人認証チェック
  if (!checkIdentityVerification(currentUserId)) {
    return c.json({ success: false, error: 'identity_verification_required', message: '本人認証が必要です' })
  }
  
  const formData = await c.req.formData()
  const message = formData.get('message')?.toString().trim()
  
  if (!message || !users.has(recipientId)) {
    return c.json({ success: false, error: 'Invalid recipient or message' })
  }
  
  const blockedSet = globalData.blockedUsers.get(currentUserId) || new Set()
  if (blockedSet.has(recipientId)) {
    return c.json({ success: false, error: 'User is blocked' })
  }
  
  // 相手にブロックされていないかチェック
  const recipientBlockedSet = globalData.blockedUsers.get(recipientId) || new Set()
  if (recipientBlockedSet.has(currentUserId)) {
    return c.json({ success: false, error: 'You are blocked by this user' })
  }
  
  if (!globalData.dms) globalData.dms = []
  
  const dmId = `dm_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const dm = {
    id: dmId,
    senderId: currentUserId,
    recipientId,
    message,
    timestamp: Date.now(),
    read: false
  }
  
  globalData.dms.set(dmId, dm)
  
  return c.json({ success: true, dmId })
})

// トーク削除API
app.delete('/api/dm/conversation/:userId', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const targetUserId = c.req.param('userId')
  
  if (!globalData.deletedConversations.has(currentUserId)) {
    globalData.deletedConversations.set(currentUserId, new Set())
  }
  
  globalData.deletedConversations.get(currentUserId).add(targetUserId)
  
  return c.json({ success: true, message: 'トークを削除しました' })
})

// ブロック機能API
app.post('/api/dm/block/:userId', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const targetUserId = c.req.param('userId')
  
  if (!users.has(targetUserId)) {
    return c.json({ success: false, error: 'User not found' }, 404)
  }
  
  if (!globalData.blockedUsers.has(currentUserId)) {
    globalData.blockedUsers.set(currentUserId, new Set())
  }
  
  globalData.blockedUsers.get(currentUserId).add(targetUserId)
  
  return c.json({ success: true, message: 'ユーザーをブロックしました' })
})

// ブロック解除API
app.delete('/api/dm/block/:userId', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const targetUserId = c.req.param('userId')
  
  const blockedSet = globalData.blockedUsers.get(currentUserId)
  if (blockedSet) {
    blockedSet.delete(targetUserId)
  }
  
  return c.json({ success: true, message: 'ブロックを解除しました' })
})

// プロフィール取得API
app.get('/api/profile/:userId', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const targetUserId = c.req.param('userId')
  
  const targetUser = users.get(targetUserId)
  if (!targetUser || !targetUser.profile) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  const blockedSet = globalData.blockedUsers.get(currentUserId) || new Set()
  if (blockedSet.has(targetUserId)) {
    return c.json({ error: 'User is blocked' }, 403)
  }
  
  // 本人認証状態チェック
  const verification = globalData.identityVerifications.get(targetUserId)
  const isVerified = verification && verification.status === 'approved'
  
  // プロフィール情報（プライベート情報は除外）
  const profileData = {
    userId: targetUserId,
    displayName: targetUser.displayName || targetUser.profile.displayName,
    prefecture: targetUser.profile.prefecture,
    selfIntroduction: targetUser.profile.selfIntroduction || '',
    avatar: targetUser.profile.avatar || null,
    isVerified: isVerified,
    // ホラー好み情報（一部公開）
    horrorPreferences: targetUser.horrorPreferences ? {
      mediaTypes: targetUser.horrorPreferences.mediaTypes || [],
      genreTypes: targetUser.horrorPreferences.genreTypes || []
    } : null
  }
  
  return c.json({ profile: profileData })
})

// 掲示板一覧取得API
app.get('/api/boards', passwordProtection, (c) => {
  const boards = Array.from(globalData.boards.values()).map(board => ({
    id: board.id,
    title: board.title,
    postCount: board.posts.length,
    createdAt: board.createdAt
  })).sort((a, b) => b.createdAt - a.createdAt)
  
  return c.json({ boards })
})

// 掲示板作成API
app.post('/api/boards', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  
  if (!currentUser) {
    return c.json({ success: false, error: 'User not found' }, 401)
  }
  
  const formData = await c.req.formData()
  const title = formData.get('title')?.toString().trim()
  const content = formData.get('content')?.toString().trim()
  const imageFile = formData.get('image') as File | null
  
  if (!title || !content) {
    return c.json({ success: false, error: 'タイトルと内容は必須です' })
  }
  
  const boardId = `board_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  // 画像処理（既存のロジックを流用）
  let imageData = null
  if (imageFile && imageFile.size > 0) {
    try {
      const arrayBuffer = await imageFile.arrayBuffer()
      const base64Data = Buffer.from(arrayBuffer).toString('base64')
      imageData = {
        type: imageFile.type,
        data: base64Data,
        size: imageFile.size
      }
    } catch (error) {
      console.error('画像処理エラー:', error)
    }
  }
  
  // 初期投稿
  const initialPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId: currentUserId,
    displayName: currentUser.displayName || currentUser.profile?.displayName || currentUserId,
    content,
    image: imageData,
    timestamp: Date.now(),
    createdAt: new Date().toISOString()
  }
  
  // 掲示板作成
  const board = {
    id: boardId,
    title,
    creatorId: currentUserId,
    creatorName: currentUser.displayName || currentUser.profile?.displayName || currentUserId,
    posts: [initialPost],
    createdAt: Date.now()
  }
  
  globalData.boards.set(boardId, board)
  
  return c.json({ success: true, board: { id: boardId, title, postCount: 1 } })
})

// 個別掲示板取得API
app.get('/api/boards/:boardId', passwordProtection, (c) => {
  const boardId = c.req.param('boardId')
  const board = globalData.boards.get(boardId)
  
  if (!board) {
    return c.json({ error: 'Board not found' }, 404)
  }
  
  return c.json({ board })
})

// 掲示板投稿API
app.post('/api/boards/:boardId/posts', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  const boardId = c.req.param('boardId')
  
  if (!currentUser) {
    return c.json({ success: false, error: 'User not found' }, 401)
  }
  
  const board = globalData.boards.get(boardId)
  if (!board) {
    return c.json({ success: false, error: 'Board not found' }, 404)
  }
  
  const formData = await c.req.formData()
  const content = formData.get('content')?.toString().trim()
  const imageFile = formData.get('image') as File | null
  
  if (!content) {
    return c.json({ success: false, error: '投稿内容は必須です' })
  }
  
  // 画像処理
  let imageData = null
  if (imageFile && imageFile.size > 0) {
    try {
      const arrayBuffer = await imageFile.arrayBuffer()
      const base64Data = Buffer.from(arrayBuffer).toString('base64')
      imageData = {
        type: imageFile.type,
        data: base64Data,
        size: imageFile.size
      }
    } catch (error) {
      console.error('画像処理エラー:', error)
    }
  }
  
  const newPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId: currentUserId,
    displayName: currentUser.displayName || currentUser.profile?.displayName || currentUserId,
    content,
    image: imageData,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
    bookmarkedBy: [] // ブックマーク機能追加
  }
  
  board.posts.push(newPost)
  globalData.boards.set(boardId, board)
  
  return c.json({ success: true, post: newPost })
})

// 本人認証チェック関数
const checkIdentityVerification = (userId: string) => {
  const user = users.get(userId)
  return user && user.identityVerified === true
}

// 本人認証申請API
app.post('/api/identity-verification', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  
  if (!currentUser) {
    return c.json({ success: false, error: 'User not found' }, 401)
  }
  
  const formData = await c.req.formData()
  const documentImage = formData.get('document') as File | null
  
  if (!documentImage || documentImage.size === 0) {
    return c.json({ success: false, error: '本人確認書類の画像をアップロードしてください' })
  }
  
  // 画像処理
  try {
    const arrayBuffer = await documentImage.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')
    
    const verificationId = `verification_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // 本人認証データを保存
    globalData.identityVerifications.set(verificationId, {
      id: verificationId,
      userId: currentUserId,
      documentImage: {
        type: documentImage.type,
        data: base64Data,
        size: documentImage.size,
        name: documentImage.name
      },
      status: 'pending', // pending, approved, rejected
      submittedAt: Date.now(),
      submittedAtISO: new Date().toISOString()
    })
    
    // ユーザーに申請中フラグを設定
    currentUser.identityVerificationStatus = 'pending'
    users.set(currentUserId, currentUser)
    
    return c.json({ success: true, verificationId, message: '本人認証申請を受け付けました。審査にお時間をいただく場合があります。' })
  } catch (error) {
    console.error('本人認証申請エラー:', error)
    return c.json({ success: false, error: '画像の処理中にエラーが発生しました' })
  }
})

// 本人認証状態確認API
app.get('/api/identity-verification/status', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  
  if (!currentUser) {
    return c.json({ error: 'User not found' }, 401)
  }
  
  return c.json({
    verified: currentUser.identityVerified === true,
    status: currentUser.identityVerificationStatus || 'none' // none, pending, approved, rejected
  })
})

// イベント一覧取得API
app.get('/api/events', passwordProtection, (c) => {
  const currentTime = Date.now()
  
  // 過去のイベントを削除（終了したイベントはメモリ節約のため削除）
  for (const [eventId, event] of globalData.events.entries()) {
    const eventDate = new Date(event.eventDate).getTime()
    const oneDayAfterEvent = eventDate + (24 * 60 * 60 * 1000) // イベント日から24時間後
    
    if (currentTime > oneDayAfterEvent) {
      globalData.events.delete(eventId)
    }
  }
  
  const events = Array.from(globalData.events.values())
    .sort((a, b) => b.createdAt - a.createdAt) // 新しい順
  
  return c.json({ events })
})

// イベント作成API
app.post('/api/events', passwordProtection, async (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const currentUser = users.get(currentUserId)
  
  if (!currentUser) {
    return c.json({ success: false, error: 'User not found' }, 401)
  }
  
  // 本人認証チェック
  if (!checkIdentityVerification(currentUserId)) {
    return c.json({ success: false, error: 'identity_verification_required', message: '本人認証が必要です' })
  }
  
  const formData = await c.req.formData()
  const eventDate = formData.get('eventDate')?.toString()
  const content = formData.get('content')?.toString().trim()
  const capacity = parseInt(formData.get('capacity')?.toString() || '0')
  const referenceLink = formData.get('referenceLink')?.toString().trim() || ''
  
  if (!eventDate || !content || !capacity || capacity < 1) {
    return c.json({ success: false, error: 'すべての項目を正しく入力してください' })
  }
  
  // イベント日の妥当性チェック
  const eventDateTime = new Date(eventDate).getTime()
  const now = Date.now()
  
  if (eventDateTime <= now) {
    return c.json({ success: false, error: '過去の日付はイベント日として設定できません' })
  }
  
  const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  const newEvent = {
    id: eventId,
    creatorId: currentUserId,
    creatorName: currentUser.displayName || currentUser.profile?.displayName || currentUserId,
    eventDate,
    content,
    capacity,
    referenceLink: referenceLink || null, // 参考リンク（任意）
    participants: [currentUserId], // 作成者は自動参加
    isClosed: false,
    createdAt: Date.now(),
    createdAtISO: new Date().toISOString(),
    bookmarkedBy: [] // ブックマーク機能追加
  }
  
  globalData.events.set(eventId, newEvent)
  
  return c.json({ success: true, event: newEvent })
})

// イベント募集終了API
app.post('/api/events/:eventId/close', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const eventId = c.req.param('eventId')
  const event = globalData.events.get(eventId)
  
  if (!event) {
    return c.json({ success: false, error: 'イベントが見つかりません' }, 404)
  }
  
  if (event.creatorId !== currentUserId) {
    return c.json({ success: false, error: 'イベント作成者のみが募集終了できます' }, 403)
  }
  
  event.isClosed = true
  globalData.events.set(eventId, event)
  
  return c.json({ success: true, message: 'イベントの募集を終了しました' })
})

// イベント参加API
app.post('/api/events/:eventId/join', passwordProtection, (c) => {
  const currentUserId = getCookie(c, 'current_user')
  const eventId = c.req.param('eventId')
  const event = globalData.events.get(eventId)
  
  if (!event) {
    return c.json({ success: false, error: 'イベントが見つかりません' }, 404)
  }
  
  // 本人認証チェック
  if (!checkIdentityVerification(currentUserId)) {
    return c.json({ success: false, error: 'identity_verification_required', message: '本人認証が必要です' })
  }
  
  if (event.isClosed) {
    return c.json({ success: false, error: 'このイベントは募集を終了しています' })
  }
  
  if (event.participants.includes(currentUserId)) {
    return c.json({ success: false, error: 'すでに参加済みです' })
  }
  
  if (event.participants.length >= event.capacity) {
    return c.json({ success: false, error: '定員に達しています' })
  }
  
  event.participants.push(currentUserId)
  globalData.events.set(eventId, event)
  
  return c.json({ success: true, message: 'イベントに参加しました' })
})

// イベントブックマーク追加/削除API
app.post('/api/events/:eventId/bookmark', passwordProtection, async (c) => {
  const currentUser = getCookie(c, 'current_user')
  if (!currentUser || !users.has(currentUser)) {
    return c.json({ error: 'User not found' }, 401)
  }
  
  const eventId = c.req.param('eventId')
  
  if (!globalData.events.has(eventId)) {
    return c.json({ error: 'Event not found' }, 404)
  }
  
  const event = globalData.events.get(eventId)
  
  // bookmarkedBy配列がない場合は初期化
  if (!event.bookmarkedBy) {
    event.bookmarkedBy = []
  }
  
  const bookmarkIndex = event.bookmarkedBy.indexOf(currentUser)
  
  if (bookmarkIndex === -1) {
    // ブックマーク追加
    event.bookmarkedBy.push(currentUser)
    globalData.events.set(eventId, event)
    return c.json({ success: true, bookmarked: true, message: 'イベントをブックマークに追加しました' })
  } else {
    // ブックマーク削除
    event.bookmarkedBy.splice(bookmarkIndex, 1)
    globalData.events.set(eventId, event)
    return c.json({ success: true, bookmarked: false, message: 'イベントのブックマークを削除しました' })
  }
})

// ブックマーク統合一覧取得API
app.get('/api/bookmarks', passwordProtection, (c) => {
  const currentUser = getCookie(c, 'current_user')
  if (!currentUser || !users.has(currentUser)) {
    return c.json({ error: 'User not found' }, 401)
  }

  const bookmarks = []

  // フィード投稿のブックマーク
  for (const post of posts.values()) {
    if (post.bookmarkedBy && post.bookmarkedBy.includes(currentUser)) {
      bookmarks.push({
        id: `feed_${post.id}`,
        type: 'feed',
        originalId: post.id,
        title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
        author: post.displayName,
        timestamp: post.timestamp,
        image: post.image,
        content: post.content,
        originalData: post
      })
    }
  }

  // イベントのブックマーク
  for (const event of globalData.events.values()) {
    if (event.bookmarkedBy && event.bookmarkedBy.includes(currentUser)) {
      const eventDate = new Date(event.eventDate)
      bookmarks.push({
        id: `event_${event.id}`,
        type: 'event',
        originalId: event.id,
        title: event.content.substring(0, 50) + (event.content.length > 50 ? '...' : ''),
        author: event.creatorName,
        timestamp: event.createdAt,
        eventDate: event.eventDate,
        capacity: event.capacity,
        participants: event.participants.length,
        isClosed: event.isClosed,
        content: event.content,
        referenceLink: event.referenceLink,
        originalData: event
      })
    }
  }

  // 掲示板投稿のブックマーク
  for (const board of globalData.boards.values()) {
    for (const post of board.posts) {
      if (post.bookmarkedBy && post.bookmarkedBy.includes(currentUser)) {
        bookmarks.push({
          id: `board_${board.id}_${post.id}`,
          type: 'board',
          originalId: post.id,
          boardId: board.id,
          boardTitle: board.title,
          title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
          author: post.displayName,
          timestamp: post.timestamp,
          image: post.image,
          content: post.content,
          originalData: post
        })
      }
    }
  }

  // 時系列でソート（新しい順）
  bookmarks.sort((a, b) => b.timestamp - a.timestamp)

  return c.json({ bookmarks })
})

export default app
