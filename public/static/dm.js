// DM機能管理クラス
class DMManager {
  constructor() {
    this.conversations = []
    this.currentChatUserId = null
    this.identityVerified = false
    this.isInitialized = false
    this.initializeEventListeners()
  }

  // イベントリスナーの初期化
  initializeEventListeners() {
    // 本人認証案内画面
    const identityYesBtn = document.getElementById('dm-identity-yes-btn')
    const identityCancelBtn = document.getElementById('dm-identity-cancel-btn')
    
    if (identityYesBtn) {
      identityYesBtn.addEventListener('click', () => this.showIdentityModal())
    }
    
    if (identityCancelBtn) {
      identityCancelBtn.addEventListener('click', () => this.hideDMIdentityPrompt())
    }

    // トーク画面関連
    const backBtn = document.getElementById('back-to-dm-list-btn')
    const sendBtn = document.getElementById('chat-send-btn')
    const messageInput = document.getElementById('chat-message-input')
    
    if (backBtn) {
      backBtn.addEventListener('click', () => this.showConversationsList())
    }
    
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage())
    }
    
    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          this.sendMessage()
        }
      })
    }

    // プロフィールモーダル関連
    const profileClose = document.getElementById('profile-modal-close')
    const profileSendDMBtn = document.getElementById('profile-send-dm-btn')
    const profileModal = document.getElementById('profile-modal')
    
    if (profileClose) {
      profileClose.addEventListener('click', () => this.closeProfileModal())
    }
    
    if (profileSendDMBtn) {
      profileSendDMBtn.addEventListener('click', () => this.sendDMFromProfile())
    }
    
    if (profileModal) {
      profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
          this.closeProfileModal()
        }
      })
    }
  }

  // DM機能の初期化
  async initialize() {
    if (this.isInitialized) return
    
    try {
      // 本人認証状態確認
      await this.checkIdentityStatus()
      
      if (!this.identityVerified) {
        this.showDMIdentityPrompt()
      } else {
        await this.loadConversations()
        this.showConversationsList()
      }
      
      this.isInitialized = true
    } catch (error) {
      console.error('DM初期化エラー:', error)
      this.showError('DMの初期化に失敗しました')
    }
  }

  // 本人認証状態確認
  async checkIdentityStatus() {
    try {
      const response = await fetch('/api/identity-verification/status')
      if (response.ok) {
        const data = await response.json()
        this.identityVerified = data.verified
      }
    } catch (error) {
      console.error('本人認証状態確認エラー:', error)
    }
  }

  // DM一覧読み込み
  async loadConversations() {
    try {
      const response = await fetch('/api/dm/conversations')
      if (response.ok) {
        const data = await response.json()
        this.conversations = data.conversations || []
        this.renderConversations()
      } else {
        const data = await response.json()
        if (data.error === 'identity_verification_required') {
          this.showDMIdentityPrompt()
        } else {
          this.showError('DM一覧の読み込みに失敗しました')
        }
      }
    } catch (error) {
      console.error('DM一覧読み込みエラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // DM一覧表示
  renderConversations() {
    const container = document.getElementById('dm-conversations-container')
    if (!container) return

    if (this.conversations.length === 0) {
      container.innerHTML = '<div class="no-conversations">まだDMがありません</div>'
      return
    }

    container.innerHTML = this.conversations.map(conv => this.renderConversationItem(conv)).join('')
    this.attachConversationListeners()
  }

  // 個別DM項目表示
  renderConversationItem(conversation) {
    const avatarSrc = conversation.avatar || '/static/default-avatar.png'
    const unreadBadge = conversation.unreadCount > 0 ? 
      `<span class="unread-count">${conversation.unreadCount}</span>` : ''

    return `
      <div class="conversation-item" data-user-id="${conversation.userId}">
        <div class="conversation-avatar" data-user-id="${conversation.userId}">
          <img src="${avatarSrc}" alt="${this.escapeHtml(conversation.displayName)}" class="avatar-img" />
        </div>
        <div class="conversation-content" data-user-id="${conversation.userId}">
          <div class="conversation-header">
            <a href="/profile/${conversation.userId}" class="conversation-name-link">
              <span class="conversation-name">${this.escapeHtml(conversation.displayName)}</span>
            </a>
            ${unreadBadge}
          </div>
          <div class="conversation-last-message">${this.escapeHtml(conversation.lastMessage)}</div>
        </div>
        <div class="conversation-actions">
          <button class="conversation-delete-btn" data-user-id="${conversation.userId}" title="トーク削除">🗑️</button>
          <button class="conversation-block-btn" data-user-id="${conversation.userId}" title="ブロック">🚫</button>
        </div>
      </div>
    `
  }

  // DM一覧のイベントリスナー
  attachConversationListeners() {
    // 会話クリック（プロフィール画面以外）
    document.querySelectorAll('.conversation-content').forEach(item => {
      item.addEventListener('click', (e) => {
        const userId = e.currentTarget.dataset.userId
        this.openChat(userId)
      })
    })

    // アバタークリック（プロフィール画面）
    document.querySelectorAll('.conversation-avatar').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation()
        const userId = e.currentTarget.dataset.userId
        this.showProfile(userId)
      })
    })

    // 削除ボタン
    document.querySelectorAll('.conversation-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const userId = e.currentTarget.dataset.userId
        this.deleteConversation(userId)
      })
    })

    // ブロックボタン
    document.querySelectorAll('.conversation-block-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const userId = e.currentTarget.dataset.userId
        this.blockUser(userId)
      })
    })
  }

  // チャット画面を開く
  async openChat(userId) {
    try {
      this.currentChatUserId = userId
      const response = await fetch(`/api/dm/conversation/${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        this.renderChat(data)
        this.showChatView()
      } else {
        const data = await response.json()
        if (data.error === 'identity_verification_required') {
          this.showDMIdentityPrompt()
        } else {
          this.showError('チャットの読み込みに失敗しました')
        }
      }
    } catch (error) {
      console.error('チャット読み込みエラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // チャット画面表示
  renderChat(chatData) {
    const userAvatar = document.getElementById('chat-user-avatar')
    const userName = document.getElementById('chat-user-name')
    const messagesContainer = document.getElementById('chat-messages')

    if (userAvatar) {
      userAvatar.src = chatData.user.avatar || '/static/default-avatar.png'
    }

    if (userName) {
      userName.textContent = chatData.user.displayName
    }

    if (messagesContainer) {
      if (chatData.messages.length === 0) {
        messagesContainer.innerHTML = '<div class="no-messages">メッセージがありません</div>'
      } else {
        messagesContainer.innerHTML = chatData.messages.map(msg => this.renderMessage(msg)).join('')
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    }
  }

  // 個別メッセージ表示
  renderMessage(message) {
    const isOwnMessage = message.senderId === this.getCurrentUserId()
    const messageClass = isOwnMessage ? 'message-own' : 'message-other'
    const timestamp = new Date(message.timestamp).toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })

    return `
      <div class="message ${messageClass}">
        <div class="message-content">${this.escapeHtml(message.message)}</div>
        <div class="message-timestamp">${timestamp}</div>
      </div>
    `
  }

  // メッセージ送信
  async sendMessage() {
    if (!this.currentChatUserId) return

    const messageInput = document.getElementById('chat-message-input')
    if (!messageInput) return

    const message = messageInput.value.trim()
    if (!message) return

    try {
      const formData = new FormData()
      formData.append('message', message)

      const response = await fetch(`/api/dm/send/${this.currentChatUserId}`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        messageInput.value = ''
        // チャット画面を再読み込み
        this.openChat(this.currentChatUserId)
      } else {
        if (result.error === 'identity_verification_required') {
          this.showDMIdentityPrompt()
        } else {
          this.showError(result.error || 'メッセージ送信に失敗しました')
        }
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // トーク削除
  async deleteConversation(userId) {
    if (!confirm('このトークを削除しますか？')) return

    try {
      const response = await fetch(`/api/dm/conversation/${userId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess('トークを削除しました')
        this.loadConversations()
      } else {
        this.showError('トーク削除に失敗しました')
      }
    } catch (error) {
      console.error('トーク削除エラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // ユーザーブロック
  async blockUser(userId) {
    if (!confirm('このユーザーをブロックしますか？')) return

    try {
      const response = await fetch(`/api/dm/block/${userId}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess('ユーザーをブロックしました')
        this.loadConversations()
      } else {
        this.showError('ブロックに失敗しました')
      }
    } catch (error) {
      console.error('ブロックエラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // プロフィール表示
  async showProfile(userId) {
    try {
      const response = await fetch(`/api/profile/${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        this.renderProfile(data.profile)
        this.showProfileModal()
      } else {
        this.showError('プロフィールの読み込みに失敗しました')
      }
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // プロフィール表示
  renderProfile(profile) {
    const profileContent = document.getElementById('profile-content')
    if (!profileContent) return

    const horrorInfo = profile.horrorPreferences ? `
      <div class="profile-horror-info">
        <h4>ホラー好み</h4>
        <p><strong>媒体:</strong> ${profile.horrorPreferences.mediaTypes.join(', ') || 'なし'}</p>
        <p><strong>ジャンル:</strong> ${profile.horrorPreferences.genreTypes.slice(0, 5).join(', ') || 'なし'}</p>
      </div>
    ` : ''

    profileContent.innerHTML = `
      <div class="profile-info">
        <div class="profile-avatar">
          <img src="${profile.avatar || '/static/default-avatar.png'}" alt="アバター" />
        </div>
        <div class="profile-details">
          <h3>${this.escapeHtml(profile.displayName)}</h3>
          <p><strong>都道府県:</strong> ${this.escapeHtml(profile.prefecture)}</p>
          <p><strong>自己紹介:</strong> ${this.escapeHtml(profile.selfIntroduction || 'なし')}</p>
          ${horrorInfo}
        </div>
      </div>
    `

    // DMボタンのユーザーID設定
    const sendDMBtn = document.getElementById('profile-send-dm-btn')
    if (sendDMBtn) {
      sendDMBtn.dataset.userId = profile.userId
    }
  }

  // 画面表示制御
  showDMIdentityPrompt() {
    this.hideAllViews()
    const prompt = document.getElementById('dm-identity-prompt')
    if (prompt) prompt.style.display = 'block'
  }

  hideDMIdentityPrompt() {
    const prompt = document.getElementById('dm-identity-prompt')
    if (prompt) prompt.style.display = 'none'
  }

  showConversationsList() {
    this.hideAllViews()
    const list = document.getElementById('dm-conversations-list')
    if (list) list.style.display = 'block'
  }

  showChatView() {
    this.hideAllViews()
    const chat = document.getElementById('dm-chat-view')
    if (chat) chat.style.display = 'block'
  }

  showProfileModal() {
    const modal = document.getElementById('profile-modal')
    if (modal) modal.style.display = 'flex'
  }

  closeProfileModal() {
    const modal = document.getElementById('profile-modal')
    if (modal) modal.style.display = 'none'
  }

  hideAllViews() {
    this.hideDMIdentityPrompt()
    const list = document.getElementById('dm-conversations-list')
    const chat = document.getElementById('dm-chat-view')
    if (list) list.style.display = 'none'
    if (chat) chat.style.display = 'none'
  }

  // 既存の本人認証モーダルを表示
  showIdentityModal() {
    const modal = document.getElementById('identity-verification-modal')
    if (modal) {
      modal.style.display = 'flex'
    }
    this.hideDMIdentityPrompt()
  }

  // プロフィールからDM送信
  sendDMFromProfile() {
    const sendDMBtn = document.getElementById('profile-send-dm-btn')
    const userId = sendDMBtn?.dataset.userId
    
    if (userId) {
      this.closeProfileModal()
      this.openChat(userId)
    }
  }

  // 現在のユーザーID取得（簡易実装）
  getCurrentUserId() {
    return 'debug_user1' // 仮の実装
  }

  // HTMLエスケープ
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // メッセージ表示
  showError(message) {
    if (window.showMessage) {
      window.showMessage(message, 'error')
    } else {
      alert('エラー: ' + message)
    }
  }

  showSuccess(message) {
    if (window.showMessage) {
      window.showMessage(message, 'success')
    } else {
      alert(message)
    }
  }
}

// AppManagerと協調する初期化
function initDMManager() {
  if (window.registerManager) {
    window.registerManager('dm', DMManager)
  } else {
    // AppManagerが準備されるまで待機
    window.addEventListener('appManagerReady', () => {
      window.registerManager('dm', DMManager)
    })
  }
}

// DOMContentLoadedまたはAppManager準備完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDMManager)
} else {
  initDMManager()
}

// グローバルに公開（デバッグ用）
window.DMManager = DMManager