// プロフィール機能管理クラス
class ProfileManager {
  constructor() {
    this.initialized = false
    this.initWithAuth()
  }

  async initWithAuth() {
    // 認証イベントを待つ
    window.addEventListener('authenticationReady', (event) => {
      if (event.detail.authenticated) {
        this.initializeWithAuth()
      }
    })

    // 既に認証されている場合は直接初期化
    const hasAuthCookie = document.cookie.includes('horror_auth=authenticated')
    if (hasAuthCookie) {
      setTimeout(() => this.initializeWithAuth(), 100)
    } else {
      console.log('ProfileManager: Waiting for authentication')
    }
  }

  async initializeWithAuth() {
    if (this.initialized) return
    
    try {
      console.log('ProfileManager: Initializing with authentication')
      this.setupEventListeners()
      // プロフィールデータは後で読み込む（モーダル表示時）
      this.initialized = true
      
      if (window.appManager) {
        window.appManager.log('ProfileManager initialized successfully')
      }
    } catch (error) {
      if (window.appManager) {
        window.appManager.logError('ProfileManager initialization failed', error)
      } else {
        console.error('ProfileManager initialization failed:', error)
      }
    }
  }

  async init() {
    // 後方互換性のため
    return this.initializeWithAuth()
  }

  setupEventListeners() {
    // フォローボタン
    const followBtn = document.querySelector('.follow-btn')
    if (followBtn) {
      followBtn.addEventListener('click', (e) => this.handleFollowToggle(e))
    }

    // ブロックボタン
    const blockBtn = document.querySelector('.block-btn')
    if (blockBtn) {
      blockBtn.addEventListener('click', (e) => this.handleBlockUser(e))
    }

    // DMボタン
    const dmBtn = document.querySelector('.dm-btn')
    if (dmBtn) {
      dmBtn.addEventListener('click', (e) => this.handleSendDM(e))
    }

    // ブロック解除ボタン
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('unblock-btn')) {
        this.handleUnblockUser(e)
      }
    })

    // プロフィール編集のファイル選択
    const avatarInput = document.querySelector('.avatar-input')
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => this.handleAvatarPreview(e))
    }
  }

  async loadProfileData() {
    const currentPath = window.location.pathname
    
    // プロフィールページの場合
    if (currentPath.startsWith('/profile/')) {
      const userId = currentPath.split('/')[2]
      await this.loadRecentPosts(userId)
      await this.loadFollowStatus(userId)
      await this.loadBlockedUsers()
    }
  }

  async loadRecentPosts(userId) {
    const postsContainer = document.getElementById('profile-recent-posts')
    if (!postsContainer) return

    try {
      const response = await fetch(`/api/profile/${userId}/posts`)
      const data = await response.json()

      if (data.posts && data.posts.length > 0) {
        const postsHtml = data.posts.map(post => this.renderRecentPost(post)).join('')
        postsContainer.innerHTML = postsHtml
      } else {
        postsContainer.innerHTML = '<div class="no-posts">まだ投稿がありません</div>'
      }
    } catch (error) {
      console.error('Recent posts load error:', error)
      postsContainer.innerHTML = '<div class="error-message">投稿の読み込みに失敗しました</div>'
    }
  }

  renderRecentPost(post) {
    const timeAgo = this.formatTimeAgo(post.timestamp)
    const typeLabel = {
      feed: 'フィード',
      board: '掲示板',
      event: 'イベント'
    }[post.type] || post.type

    return `
      <div class="recent-post-item">
        <div class="recent-post-header">
          <span class="recent-post-type ${post.type}">${typeLabel}</span>
          <span class="recent-post-time">${timeAgo}</span>
        </div>
        <div class="recent-post-content">${this.escapeHtml(post.content)}</div>
        ${post.link ? `
          <a href="${post.link}" class="recent-post-link">
            ${post.boardTitle ? `${post.boardTitle}を見る` : 
              post.eventTitle ? `${post.eventTitle}を見る` : '詳細を見る'}
          </a>
        ` : ''}
      </div>
    `
  }

  async loadFollowStatus(userId) {
    const followBtn = document.querySelector('.follow-btn')
    if (!followBtn) return

    const otherProfileActions = document.querySelector('.other-profile-actions')
    if (!otherProfileActions) return

    const targetUserId = otherProfileActions.getAttribute('data-user-id')
    if (!targetUserId) return

    // 既にフォローしているかチェック
    try {
      const response = await fetch('/api/feed')
      const data = await response.json()
      
      // フォロー中のユーザーリストがAPIレスポンスに含まれる場合はそれを使用
      // 簡易版として、ボタンを表示
      followBtn.style.display = 'inline-block'
      
    } catch (error) {
      console.error('Follow status check error:', error)
    }
  }

  async loadBlockedUsers() {
    const blockedContainer = document.getElementById('blocked-users-list')
    if (!blockedContainer) return

    try {
      const response = await fetch('/api/profile/blocked')
      const data = await response.json()

      if (data.blockedUsers && data.blockedUsers.length > 0) {
        const blockedHtml = data.blockedUsers.map(user => `
          <div class="blocked-user-item">
            <span class="blocked-user-name">${this.escapeHtml(user.displayName)}</span>
            <button class="unblock-btn" data-user-id="${user.userId}">ブロック解除</button>
          </div>
        `).join('')
        
        blockedContainer.innerHTML = blockedHtml
      } else {
        blockedContainer.innerHTML = '<div class="no-blocked">ブロックしているユーザーはいません</div>'
      }
    } catch (error) {
      console.error('Blocked users load error:', error)
      blockedContainer.innerHTML = '<div class="error-message">ブロックユーザーの読み込みに失敗しました</div>'
    }
  }

  async handleFollowToggle(e) {
    e.preventDefault()
    
    const otherProfileActions = document.querySelector('.other-profile-actions')
    const targetUserId = otherProfileActions?.getAttribute('data-user-id')
    
    if (!targetUserId) return

    const followBtn = e.target
    const originalText = followBtn.textContent

    try {
      followBtn.disabled = true
      followBtn.textContent = '処理中...'

      const formData = new FormData()
      formData.append('userId', targetUserId)

      const response = await fetch('/api/profile/follow', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        if (result.following) {
          followBtn.textContent = 'フィードから除外'
          followBtn.classList.add('following')
        } else {
          followBtn.textContent = 'フィードに追加'
          followBtn.classList.remove('following')
        }
        
        this.showMessage(result.message, 'success')
      } else {
        this.showMessage(result.error || 'フォロー操作に失敗しました', 'error')
        followBtn.textContent = originalText
      }
    } catch (error) {
      console.error('Follow toggle error:', error)
      this.showMessage('フォロー操作に失敗しました', 'error')
      followBtn.textContent = originalText
    } finally {
      followBtn.disabled = false
    }
  }

  async handleBlockUser(e) {
    e.preventDefault()
    
    if (!confirm('このユーザーをブロックしますか？\nブロックすると、お互いの投稿やプロフィールが見えなくなり、DMも送れなくなります。')) {
      return
    }

    const otherProfileActions = document.querySelector('.other-profile-actions')
    const targetUserId = otherProfileActions?.getAttribute('data-user-id')
    
    if (!targetUserId) return

    const blockBtn = e.target

    try {
      blockBtn.disabled = true
      blockBtn.textContent = '処理中...'

      const formData = new FormData()
      formData.append('userId', targetUserId)

      const response = await fetch('/api/profile/block', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        this.showMessage(result.message, 'success')
        // プロフィールページから離脱
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      } else {
        this.showMessage(result.error || 'ブロック操作に失敗しました', 'error')
        blockBtn.disabled = false
        blockBtn.textContent = 'ブロック'
      }
    } catch (error) {
      console.error('Block user error:', error)
      this.showMessage('ブロック操作に失敗しました', 'error')
      blockBtn.disabled = false
      blockBtn.textContent = 'ブロック'
    }
  }

  async handleUnblockUser(e) {
    e.preventDefault()
    
    const targetUserId = e.target.getAttribute('data-user-id')
    if (!targetUserId) return

    if (!confirm('このユーザーのブロックを解除しますか？')) {
      return
    }

    try {
      e.target.disabled = true
      e.target.textContent = '処理中...'

      const formData = new FormData()
      formData.append('userId', targetUserId)

      const response = await fetch('/api/profile/unblock', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        this.showMessage(result.message, 'success')
        // ブロックユーザーリストを再読み込み
        await this.loadBlockedUsers()
      } else {
        this.showMessage(result.error || 'ブロック解除に失敗しました', 'error')
        e.target.disabled = false
        e.target.textContent = 'ブロック解除'
      }
    } catch (error) {
      console.error('Unblock user error:', error)
      this.showMessage('ブロック解除に失敗しました', 'error')
      e.target.disabled = false
      e.target.textContent = 'ブロック解除'
    }
  }

  handleSendDM(e) {
    e.preventDefault()
    
    const otherProfileActions = document.querySelector('.other-profile-actions')
    const targetUserId = otherProfileActions?.getAttribute('data-user-id')
    
    if (!targetUserId) return

    // DMタブに移動してユーザーを選択
    const dmTab = document.querySelector('[data-tab="dm"]')
    if (dmTab) {
      dmTab.click()
      
      // DMマネージャーが初期化されるのを待つ
      setTimeout(() => {
        if (window.dmManager) {
          window.dmManager.openConversation(targetUserId)
        }
      }, 500)
    }
  }

  handleAvatarPreview(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('画像ファイルは5MB以下を選択してください')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const currentAvatar = document.querySelector('.current-avatar-img')
      const currentPlaceholder = document.querySelector('.current-avatar-placeholder')
      
      if (currentAvatar) {
        currentAvatar.src = event.target.result
      } else if (currentPlaceholder) {
        const img = document.createElement('img')
        img.src = event.target.result
        img.className = 'current-avatar-img'
        currentPlaceholder.parentNode.replaceChild(img, currentPlaceholder)
      }
    }
    
    reader.readAsDataURL(file)
  }

  // ユーティリティ関数
  formatTimeAgo(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'たった今'
    if (minutes < 60) return `${minutes}分前`
    if (hours < 24) return `${hours}時間前`
    if (days < 7) return `${days}日前`
    
    return new Date(timestamp).toLocaleDateString('ja-JP')
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  showMessage(message, type = 'info') {
    if (window.showMessage) {
      window.showMessage(message, type)
    } else {
      alert(message)
    }
  }
}

// AppManagerと協調する初期化
function initProfileManager() {
  if (window.registerManager) {
    window.registerManager('profile', ProfileManager)
  } else {
    // AppManagerが準備されるまで待機
    window.addEventListener('appManagerReady', () => {
      window.registerManager('profile', ProfileManager)
    })
  }
}

// 即座に初期化（プロフィールページは独立ページのため）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initProfileManager()
    // プロフィールページでは即座に初期化
    if (window.location.pathname.startsWith('/profile/')) {
      new ProfileManager().init()
    }
  })
} else {
  initProfileManager()
  if (window.location.pathname.startsWith('/profile/')) {
    new ProfileManager().init()
  }
}

// グローバルに公開（他機能との連携用）
window.ProfileManager = ProfileManager