class MatchManager {
  constructor() {
    this.matches = []
    this.initialized = false
  }

  async init() {
    if (this.initialized) return
    
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
      // 認証されていない場合は初期化しない
      console.log('MatchManager: Waiting for authentication')
    }
  }

  async initializeWithAuth() {
    // 重複初期化を防ぐ（ただし認証後の再初期化は許可）
    if (this.initialized) {
      console.log('MatchManager: Already initialized, reloading data')
      await this.loadMatches() // データの再読み込みは許可
      return
    }
    
    try {
      console.log('MatchManager: Initializing with authentication')
      this.matchContent = document.getElementById('match-content')
      await this.loadMatches()
      this.initialized = true
      
      if (window.appManager) {
        window.appManager.log('MatchManager initialized successfully')
      }
    } catch (error) {
      if (window.appManager) {
        window.appManager.logError('MatchManager initialization failed', error)
      } else {
        console.error('MatchManager initialization failed:', error)
      }
    }
  }

  async loadMatches() {
    try {
      const response = await fetch('/api/matches')
      const data = await response.json()
      this.matches = data.matches || []
      this.renderMatches()
    } catch (error) {
      console.error('マッチデータ読み込みエラー:', error)
      if (this.matchContent) {
        this.matchContent.innerHTML = '<div class="error-message">マッチデータの読み込みに失敗しました</div>'
      }
    }
  }

  renderMatches() {
    if (!this.matchContent) return

    if (this.matches.length === 0) {
      this.matchContent.innerHTML = '<div class="no-matches-message">マッチした人はいません</div>'
      return
    }

    const matchesHtml = this.matches.map(match => this.renderMatch(match)).join('')
    this.matchContent.innerHTML = `<div class="matches-list">${matchesHtml}</div>`
    this.setupMatchEventListeners()
  }

  renderMatch(match) {
    const newLabel = match.isNew ? '<span class="new-label">NEW</span>' : ''
    return `
      <div class="match-item" data-user-id="${match.userid}">
        <div class="match-avatar">
          <div class="avatar-placeholder"></div>
        </div>
        <div class="match-info">
          <a href="/profile/${match.userid}" class="match-name-link">
            <div class="match-name">${match.displayName}${newLabel}</div>
          </a>
          <div class="match-location">${match.prefecture || 'Unknown'}</div>
          <div class="match-rate">${match.matchingScore}%</div>
        </div>
        <div class="match-actions">
          <button class="dm-btn" data-user-id="${match.userid}" title="DMを送る">💬</button>
        </div>
      </div>
    `
  }

  setupMatchEventListeners() {
    document.querySelectorAll('.dm-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const userId = e.currentTarget.getAttribute('data-user-id')
        this.openDMModal(userId)
      })
    })
  }

  openDMModal(userId) {
    const match = this.matches.find(m => m.userid === userId)
    if (!match) return

    const modal = document.createElement('div')
    modal.className = 'dm-modal'
    modal.innerHTML = `
      <div class="dm-modal-content">
        <div class="dm-modal-header">
          <h3>${match.displayName}さんにDMを送信</h3>
          <button class="dm-modal-close">&times;</button>
        </div>
        <div class="dm-modal-body">
          <textarea class="dm-input" placeholder="メッセージを入力してください..." maxlength="500"></textarea>
        </div>
        <div class="dm-modal-footer">
          <button class="dm-send-btn">送信</button>
          <button class="dm-cancel-btn">キャンセル</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)

    const closeModal = () => document.body.removeChild(modal)
    modal.querySelector('.dm-modal-close').addEventListener('click', closeModal)
    modal.querySelector('.dm-cancel-btn').addEventListener('click', closeModal)
    modal.querySelector('.dm-send-btn').addEventListener('click', () => this.sendDM(userId, modal))
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal()
    })
  }

  async sendDM(userId, modal) {
    const input = modal.querySelector('.dm-input')
    const message = input.value.trim()
    if (!message) {
      alert('メッセージを入力してください')
      return
    }

    const sendBtn = modal.querySelector('.dm-send-btn')
    try {
      sendBtn.disabled = true
      sendBtn.textContent = '送信中...'

      const formData = new FormData()
      formData.append('message', message)

      const response = await fetch(`/api/dm/send/${userId}`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        document.body.removeChild(modal)
        alert('DMを送信しました！')
        this.notifyDMSent()
      } else {
        alert(result.error || 'DM送信に失敗しました')
      }
    } catch (error) {
      console.error('DM送信エラー:', error)
      alert('DM送信に失敗しました')
    } finally {
      sendBtn.disabled = false
      sendBtn.textContent = '送信'
    }
  }

  notifyDMSent() {
    const dmTab = document.querySelector('[data-tab="dm"]')
    if (dmTab) {
      dmTab.classList.add('has-notification')
    }
  }
}

// グローバルにMatchManagerクラスを公開（AppManagerが参照できるように）
window.MatchManager = MatchManager

// AppManagerと協調する初期化
function initMatchManager() {
  if (window.registerManager) {
    window.registerManager('match', MatchManager)
  } else {
    // AppManagerが準備されるまで待機
    window.addEventListener('appManagerReady', () => {
      window.registerManager('match', MatchManager)
    })
  }
}

// DOMContentLoadedまたはAppManager準備完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMatchManager)
} else {
  initMatchManager()
}