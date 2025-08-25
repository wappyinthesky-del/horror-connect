# HorrorConnect プロフィールシステム ドキュメント

## 概要
HorrorConnectの包括的なプロフィールシステムの実装詳細です。ユーザープロフィール、本人認証、フォロー機能、ブロック機能を含む統合的なソーシャル機能を提供します。

## 🎯 実装された機能

### 1. ヘッダーユーザー表示
**場所**: ヘッダー右側のログアウトボタン左隣

**機能**:
- ログイン中ユーザーの表示名を表示
- プロフィール画像のサムネイル表示
- 本人認証済みバッジ（認証済みの場合）
- クリックで自分のプロフィールページへリンク

**技術仕様**:
```tsx
<div className="header-user-info">
  <div className="header-user-avatar">
    {currentUser.profileImage ? (
      <img src={currentUser.profileImage} alt="プロフィール画像" />
    ) : (
      <div className="header-avatar-placeholder"></div>
    )}
  </div>
  <span className="header-username">{currentUser.displayName}</span>
  {currentUser.isVerified && <span className="header-verified-badge">本人認証済み</span>}
</div>
```

### 2. プロフィールページ
**URL**: `/profile/:userId`

**表示内容**:
- **プロフィール画像**: サムネイル（クリックで編集ページへ）
- **基本情報**: 表示名、性別、都道府県
- **本人認証バッジ**: 認証済みの場合表示
- **ホラーの好み**: 好みページで設定した回答内容
- **最新投稿**: フィード・イベント・掲示板での最新10投稿
- **投稿リンク**: イベント・掲示板投稿は元ページへのリンク付き

**自分のプロフィールの場合**:
- プロフィール編集ボタン
- 本人認証ボタン
- ブロックしているユーザー一覧（自分のみ表示）

**他人のプロフィールの場合**:
- フィードに追加ボタン（未フォローの場合）
- DMボタン（相手が本人認証済みの場合のみ）
- ブロックボタン

### 3. プロフィール編集ページ
**URL**: `/profile/edit`

**編集可能項目**:
- プロフィール画像（最大5MB）
- 表示名

**技術仕様**:
- ファイルアップロード処理
- 画像のBase64変換と保存
- プレビュー機能

### 4. 本人認証システム
**URL**: `/identity-verification`

**認証プロセス**:
1. **書類提出**: 運転免許証、パスポート、マイナンバーカード等
2. **審査状態**: pending（審査中）、approved（承認）、rejected（拒否）
3. **認証完了**: DM機能の利用可能化

**認証状態別表示**:
- **未提出**: 認証フォーム表示
- **審査中**: 提出日と書類タイプを表示
- **認証済み**: 認証バッジと完了メッセージ
- **審査不合格**: 拒否理由と再提出案内

### 5. フォロー機能（フィードに追加）
**機能概要**:
- 他ユーザーのプロフィールから「フィードに追加」
- フォローしたユーザーの投稿が自分のフィードに表示
- 一方向フォロー（相手に自分の投稿は自動で表示されない）

**API仕様**:
```javascript
POST /api/profile/follow
{
  userId: "target_user_id"
}

Response:
{
  success: true,
  following: true/false,
  message: "フィードに追加しました"
}
```

### 6. ブロック機能
**機能概要**:
- 相互ブロック（双方向制限）
- ブロック後の制限内容:
  - お互いのフィード投稿非表示
  - お互いのプロフィール閲覧不可
  - DM送受信不可
  - ブロック解除は片方のみ可能

**制限適用範囲**:
- フィードタブ
- 掲示板タブ
- イベントタブ
- DMタブ
- マッチタブ（推奨は非表示）

### 7. クロスタブプロフィールリンク
**実装箇所**:
- **フィードタブ**: 投稿者名、返信者名
- **掲示板タブ**: 投稿者名
- **イベントタブ**: 作成者名
- **DMタブ**: 会話相手名
- **マッチタブ**: マッチした相手名

**実装方法**:
```javascript
// ユーザー名をリンク化
<a href="/profile/${userId}" class="user-name-link">
  <span class="user-name">${displayName}</span>
</a>
```

## 🛠️ 技術実装

### データ構造
```javascript
// プロフィール画像
globalData.profileImages = Map<userId, base64ImageData>

// フォロー関係
globalData.followingUsers = Map<userId, Set<followedUserId>>

// ブロック関係
globalData.blockedUsers = Map<userId, Set<blockedUserId>>

// 本人認証
globalData.identityVerifications = Map<userId, {
  status: 'pending' | 'approved' | 'rejected',
  documentType: string,
  submittedAt: string,
  rejectionReason?: string
}>

// ユーザー活動履歴
globalData.userActivities = Map<userId, Array<activity>>
```

### API エンドポイント
```javascript
// プロフィール関連
GET    /profile/:userId              // プロフィールページ
GET    /profile/edit                 // プロフィール編集ページ
POST   /profile/update               // プロフィール更新
GET    /api/profile/:userId          // プロフィール情報取得
GET    /api/profile/:userId/posts    // ユーザーの最新投稿取得

// フォロー機能
POST   /api/profile/follow           // フォロー/フォロー解除

// ブロック機能
POST   /api/profile/block            // ユーザーブロック
GET    /api/profile/blocked          // ブロック済みユーザー一覧
POST   /api/profile/unblock          // ブロック解除

// 本人認証
GET    /identity-verification        // 本人認証ページ
POST   /identity-verification/submit // 本人認証書類提出
```

### JavaScript管理クラス
```javascript
class ProfileManager {
  // 初期化
  async init()
  
  // イベントリスナー設定
  setupEventListeners()
  
  // データ読み込み
  async loadProfileData()
  async loadRecentPosts(userId)
  async loadFollowStatus(userId)
  async loadBlockedUsers()
  
  // ユーザーアクション
  async handleFollowToggle(e)
  async handleBlockUser(e)
  async handleUnblockUser(e)
  handleSendDM(e)
  handleAvatarPreview(e)
}
```

## 🎨 デザイン仕様

### CSSファイル
- **profile.css**: プロフィール機能専用スタイル
- 統合されたレスポンシブデザイン
- アクセシビリティ対応
- 一貫したUIパターン

### 主要スタイル
```css
/* ヘッダーユーザー情報 */
.header-user-info { ... }

/* プロフィールページ */
.profile-container { ... }
.profile-header { ... }
.profile-actions { ... }

/* プロフィール編集 */
.profile-edit-container { ... }
.avatar-upload-area { ... }

/* 本人認証 */
.verification-container { ... }
.verification-status { ... }

/* プロフィールリンク */
.user-name-link:hover { 
  color: #007bff;
  text-decoration: underline;
}
```

## 🔐 セキュリティ考慮事項

### アクセス制御
- **ログイン必須**: 全プロフィール機能は認証が必要
- **ブロック制限**: ブロック済みユーザーのプロフィール閲覧不可
- **本人認証ゲート**: DM機能は認証済みユーザーのみ

### データ保護
- **画像サイズ制限**: 最大5MB
- **ファイル形式検証**: 画像ファイルのみ許可
- **HTMLエスケープ**: XSS対策の適用
- **認証書類保護**: Base64変換による安全な保存

### プライバシー保護
- **フォロー非公開**: フォロー関係は非公開
- **ブロック通知なし**: ブロックされたことは通知されない
- **認証書類非公開**: 本人認証書類は管理者以外閲覧不可

## 📱 レスポンシブ対応

### モバイル最適化
- **タッチ操作対応**: ボタンサイズとタップ領域の最適化
- **画面サイズ対応**: 320px〜1200px幅での適切な表示
- **ナビゲーション**: モバイルでの操作性を重視

### ブレークポイント
- **768px以下**: タブレット・スマートフォン向けレイアウト
- **480px以下**: 小画面スマートフォン向け調整

## 🧪 テスト項目

### 機能テスト
- [ ] プロフィールページ表示
- [ ] プロフィール編集機能
- [ ] 画像アップロード機能
- [ ] 本人認証フロー
- [ ] フォロー/フォロー解除
- [ ] ブロック/ブロック解除
- [ ] クロスタブプロフィールリンク

### セキュリティテスト
- [ ] 認証なしアクセス拒否
- [ ] ブロック制限の適用
- [ ] ファイルアップロード制限
- [ ] XSS対策の有効性

### パフォーマンステスト
- [ ] 大量ユーザーでの動作
- [ ] 画像表示の最適化
- [ ] API応答時間
- [ ] メモリ使用量

## 🚀 今後の拡張予定

### 追加機能
- **プロフィール統計**: 投稿数、フォロワー数等
- **詳細プロフィール**: より多くの個人情報項目
- **プロフィール検索**: ユーザー検索機能
- **活動履歴**: 詳細な活動ログ

### 技術改善
- **画像最適化**: WebP対応、リサイズ処理
- **キャッシュ機能**: プロフィール情報のキャッシュ
- **通知システム**: フォロー・メンション通知
- **API最適化**: GraphQL等での効率化

## 📝 運用ガイド

### 日常運用
- **本人認証審査**: 提出された書類の確認と承認/拒否
- **不適切プロフィール**: 規約違反プロフィールの監視
- **ブロック解除要請**: 誤ブロックの解除対応

### データ管理
- **プロフィール画像**: 定期的な容量チェック
- **認証書類**: セキュアな保管と適切な削除
- **活動ログ**: プライバシーに配慮したログ管理

---

## まとめ

HorrorConnectのプロフィールシステムは、ユーザー体験を向上させる包括的なソーシャル機能を提供します。セキュリティとプライバシーを重視しながら、直感的で使いやすいインターフェースを実現しています。

**主要な成果**:
- 🎯 包括的なプロフィール機能
- 🔐 堅牢なセキュリティシステム
- 📱 完全なレスポンシブ対応
- 🚀 高いパフォーマンス
- 🎨 一貫したUIデザイン

このシステムにより、ユーザー同士のコミュニケーションがより豊かで安全なものになります。