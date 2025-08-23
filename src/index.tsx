import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(
    <div className="welcome-container">
      {/* Ghost Logo */}
      <div className="ghost-logo">
        <div className="ghost-eyes">
          <div className="eye"></div>
          <div className="eye"></div>
        </div>
      </div>

      {/* Main Title */}
      <h1 className="title">HorrorConnect</h1>
      
      {/* Subtitle */}
      <p className="subtitle">
        ホラー好きのためのマッチングアプリ
      </p>
      
      {/* Description */}
      <p className="description">
        ホラー映画、ホラー小説、ホラーゲームが好きな人同士で繋がろう。<br />
        同じ恐怖体験を共有できる特別な仲間を見つけませんか？
      </p>
      
      {/* CTA Buttons */}
      <div className="cta-buttons">
        <a href="/register" className="btn btn-primary">会員登録</a>
        <a href="/login" className="btn btn-secondary">ログイン</a>
      </div>
      
      {/* Features */}
      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">👻</div>
          <h3 className="feature-title">ホラー専門</h3>
          <p className="feature-description">
            ホラー好きだけが集まるコミュニティで、理解し合える仲間を見つけよう
          </p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">🎬</div>
          <h3 className="feature-title">趣味でマッチング</h3>
          <p className="feature-description">
            好きなホラー作品やジャンルから、相性の良い人を見つけられます
          </p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">🔮</div>
          <h3 className="feature-title">安全な出会い</h3>
          <p className="feature-description">
            プロフィール認証システムで安心・安全な出会いをサポート
          </p>
        </div>
      </div>
    </div>
  )
})

export default app
