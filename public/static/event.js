// リアルイベント管理クラス
class EventManager {
  constructor() {
    this.events = []
    this.identityVerified = false
    this.identityStatus = 'none'
    this.initializeEventListeners()
    this.loadEvents()
    this.checkIdentityStatus()
  }

  // イベントリスナーの初期化
  initializeEventListeners() {
    // イベント作成ボタン
    const createBtn = document.getElementById('event-create-btn')
    if (createBtn) {
      createBtn.addEventListener('click', () => this.createEvent())
    }

    // 本人認証モーダル関連
    const modalClose = document.getElementById('identity-modal-close')
    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeIdentityModal())
    }

    const uploadZone = document.getElementById('identity-upload-zone')
    const documentInput = document.getElementById('identity-document-input')
    if (uploadZone && documentInput) {
      uploadZone.addEventListener('click', () => documentInput.click())
      documentInput.addEventListener('change', (e) => this.handleDocumentUpload(e))
    }

    const removeImage = document.getElementById('identity-remove-image')
    if (removeImage) {
      removeImage.addEventListener('click', () => this.removeDocumentImage())
    }

    const submitBtn = document.getElementById('identity-submit-btn')
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitIdentityVerification())
    }

    // モーダル外クリックで閉じる
    const modal = document.getElementById('identity-verification-modal')
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeIdentityModal()
        }
      })
    }
  }

  // 本人認証状態確認
  async checkIdentityStatus() {
    try {
      const response = await fetch('/api/identity-verification/status')
      if (response.ok) {
        const data = await response.json()
        this.identityVerified = data.verified
        this.identityStatus = data.status
        console.log('本人認証状態:', data)
      }
    } catch (error) {
      console.error('本人認証状態確認エラー:', error)
    }
  }

  // イベント一覧読み込み
  async loadEvents() {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        this.events = data.events
        this.renderEvents()
      } else {
        this.showError('イベントデータの読み込みに失敗しました')
      }
    } catch (error) {
      console.error('イベント読み込みエラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // イベント作成
  async createEvent() {
    const dateInput = document.getElementById('event-date-input')
    const contentInput = document.getElementById('event-content-input')
    const capacityInput = document.getElementById('event-capacity-input')
    const referenceLinkInput = document.getElementById('event-reference-link-input')

    if (!dateInput || !contentInput || !capacityInput) {
      this.showError('入力フォームが見つかりません')
      return
    }

    const eventDate = dateInput.value
    const content = contentInput.value.trim()
    const capacity = parseInt(capacityInput.value)
    const referenceLink = referenceLinkInput ? referenceLinkInput.value.trim() : ''

    if (!eventDate || !content || !capacity || capacity < 1) {
      this.showError('すべての項目を正しく入力してください')
      return
    }

    // 本人認証チェック
    if (!this.identityVerified) {
      this.showIdentityModal()
      return
    }

    try {
      const formData = new FormData()
      formData.append('eventDate', eventDate)
      formData.append('content', content)
      formData.append('capacity', capacity.toString())
      if (referenceLink) {
        formData.append('referenceLink', referenceLink)
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess('イベントを作成しました')
        this.clearCreateForm()
        this.loadEvents() // リフレッシュ
      } else {
        if (result.error === 'identity_verification_required') {
          this.showIdentityModal()
        } else {
          this.showError(result.error || 'イベント作成に失敗しました')
        }
      }
    } catch (error) {
      console.error('イベント作成エラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // イベント一覧表示
  renderEvents() {
    const container = document.getElementById('events-list')
    if (!container) return

    if (this.events.length === 0) {
      container.innerHTML = '<div class="no-events">まだイベントがありません</div>'
      return
    }

    container.innerHTML = this.events.map(event => this.renderEventItem(event)).join('')

    // イベントアクションのリスナーを追加
    this.attachEventListeners()
  }

  // 個別イベント表示
  renderEventItem(event) {
    const eventDate = new Date(event.eventDate)
    const isCreator = event.creatorId === this.getCurrentUserId()
    const isParticipant = event.participants.includes(this.getCurrentUserId())
    const isFull = event.participants.length >= event.capacity
    
    // ブックマーク状態チェック（bookmarkedBy配列が存在しない場合は空配列として扱う）
    const isBookmarked = event.bookmarkedBy && event.bookmarkedBy.includes(this.getCurrentUserId())

    return `
      <div class="event-item" data-event-id="${event.id}">
        <div class="event-header">
          <div class="event-meta">
            <a href="/profile/${event.creatorId}" class="event-creator-link">
              <span class="event-creator">${this.escapeHtml(event.creatorName)}</span>
            </a>
            <span class="event-date">${eventDate.toLocaleDateString('ja-JP')}</span>
            ${event.isClosed ? '<span class="event-status closed">募集終了</span>' : ''}
          </div>
          <div class="event-actions">
            <button class="action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" 
                    data-event-id="${event.id}" 
                    title="ブックマーク">
              <span class="bookmark-icon">${isBookmarked ? '★' : '☆'}</span>
            </button>
            ${isCreator && !event.isClosed ? `
              <button class="event-close-btn" data-event-id="${event.id}">募集終了</button>
            ` : ''}
          </div>
        </div>
        <div class="event-content">
          ${this.escapeHtml(event.content)}
          ${event.referenceLink ? `
            <div class="event-reference-link">
              <a href="${this.escapeHtml(event.referenceLink)}" target="_blank" rel="noopener noreferrer" class="reference-link">
                🔗 参考リンク
              </a>
            </div>
          ` : ''}
        </div>
        <div class="event-footer">
          <div class="event-capacity">
            参加者: ${event.participants.length}/${event.capacity}人
          </div>
          ${!event.isClosed && !isParticipant && !isFull ? `
            <button class="event-join-btn" data-event-id="${event.id}">参加する</button>
          ` : ''}
          ${isParticipant ? '<span class="participated">参加済み</span>' : ''}
          ${isFull && !isParticipant ? '<span class="event-full">満員</span>' : ''}
        </div>
      </div>
    `
  }

  // イベントアクションのリスナーを追加
  attachEventListeners() {
    // 募集終了ボタン
    document.querySelectorAll('.event-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventId = e.target.dataset.eventId
        this.closeEventRecruitment(eventId)
      })
    })

    // 参加ボタン
    document.querySelectorAll('.event-join-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventId = e.target.dataset.eventId
        this.joinEvent(eventId)
      })
    })

    // ブックマークボタン
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const eventId = e.currentTarget.getAttribute('data-event-id')
        this.toggleBookmark(eventId)
      })
    })
  }

  // イベント募集終了
  async closeEventRecruitment(eventId) {
    if (!confirm('イベントの募集を終了しますか？')) return

    try {
      const response = await fetch(`/api/events/${eventId}/close`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess('募集を終了しました')
        this.loadEvents()
      } else {
        this.showError(result.error || '募集終了に失敗しました')
      }
    } catch (error) {
      console.error('募集終了エラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // イベント参加
  async joinEvent(eventId) {
    // 本人認証チェック
    if (!this.identityVerified) {
      this.showIdentityModal()
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/join`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess('イベントに参加しました')
        this.loadEvents()
      } else {
        if (result.error === 'identity_verification_required') {
          this.showIdentityModal()
        } else {
          this.showError(result.error || 'イベント参加に失敗しました')
        }
      }
    } catch (error) {
      console.error('イベント参加エラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // 本人認証モーダル表示
  showIdentityModal() {
    const modal = document.getElementById('identity-verification-modal')
    if (modal) {
      modal.style.display = 'flex'
    }
  }

  // 本人認証モーダル閉じる
  closeIdentityModal() {
    const modal = document.getElementById('identity-verification-modal')
    if (modal) {
      modal.style.display = 'none'
    }
  }

  // 本人確認書類アップロード処理
  handleDocumentUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      this.showError('画像ファイルを選択してください')
      return
    }

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      this.showError('ファイルサイズは5MB以下にしてください')
      return
    }

    // プレビュー表示
    const reader = new FileReader()
    reader.onload = (e) => {
      const uploadZone = document.getElementById('identity-upload-zone')
      const previewArea = document.getElementById('identity-preview-area')
      const previewImage = document.getElementById('identity-preview-image')
      const submitBtn = document.getElementById('identity-submit-btn')

      if (uploadZone && previewArea && previewImage) {
        uploadZone.style.display = 'none'
        previewArea.style.display = 'block'
        previewImage.src = e.target.result
        
        if (submitBtn) {
          submitBtn.disabled = false
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // 本人確認書類削除
  removeDocumentImage() {
    const uploadZone = document.getElementById('identity-upload-zone')
    const previewArea = document.getElementById('identity-preview-area')
    const documentInput = document.getElementById('identity-document-input')
    const submitBtn = document.getElementById('identity-submit-btn')

    if (uploadZone && previewArea) {
      uploadZone.style.display = 'flex'
      previewArea.style.display = 'none'
    }

    if (documentInput) {
      documentInput.value = ''
    }

    if (submitBtn) {
      submitBtn.disabled = true
    }
  }

  // 本人認証申請
  async submitIdentityVerification() {
    const documentInput = document.getElementById('identity-document-input')
    if (!documentInput || !documentInput.files[0]) {
      this.showError('本人確認書類をアップロードしてください')
      return
    }

    try {
      const formData = new FormData()
      formData.append('document', documentInput.files[0])

      const response = await fetch('/api/identity-verification', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess(result.message || '本人認証申請を送信しました')
        this.closeIdentityModal()
        this.identityStatus = 'pending'
      } else {
        this.showError(result.error || '本人認証申請に失敗しました')
      }
    } catch (error) {
      console.error('本人認証申請エラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // フォームクリア
  clearCreateForm() {
    const dateInput = document.getElementById('event-date-input')
    const contentInput = document.getElementById('event-content-input')
    const capacityInput = document.getElementById('event-capacity-input')
    const referenceLinkInput = document.getElementById('event-reference-link-input')

    if (dateInput) dateInput.value = ''
    if (contentInput) contentInput.value = ''
    if (capacityInput) capacityInput.value = ''
    if (referenceLinkInput) referenceLinkInput.value = ''
  }

  // 現在のユーザーID取得（簡易実装）
  getCurrentUserId() {
    // クッキーからユーザーIDを取得する簡易実装
    // 実際の本番環境では適切なセッション管理を使用
    return 'debug_user1' // 仮の実装
  }

  // HTMLエスケープ
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // エラーメッセージ表示
  showError(message) {
    // 既存のメッセージ表示システムを使用
    if (window.showMessage) {
      window.showMessage(message, 'error')
    } else {
      alert('エラー: ' + message)
    }
  }

  // 現在のユーザーID取得
  getCurrentUserId() {
    // クッキーから現在のユーザーIDを取得
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=')
      if (key === 'current_user') {
        return decodeURIComponent(value)
      }
    }
    return null
  }

  // ブックマーク切り替え
  async toggleBookmark(eventId) {
    try {
      const response = await fetch(`/api/events/${eventId}/bookmark`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        // UI を更新
        const btn = document.querySelector(`[data-event-id="${eventId}"].bookmark-btn`)
        if (btn) {
          const icon = btn.querySelector('.bookmark-icon')
          if (result.bookmarked) {
            btn.classList.add('bookmarked')
            icon.textContent = '★'
          } else {
            btn.classList.remove('bookmarked')
            icon.textContent = '☆'
          }
        }

        // 成功メッセージを短時間表示
        this.showEventMessage(result.message, 'success')
      } else {
        this.showEventMessage(result.error || 'ブックマーク操作に失敗しました', 'error')
      }
    } catch (error) {
      console.error('ブックマーク操作エラー:', error)
      this.showEventMessage('ネットワークエラーが発生しました', 'error')
    }
  }

  // イベント用メッセージ表示
  showEventMessage(message, type = 'info') {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.event-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    // 新しいメッセージを作成
    const messageDiv = document.createElement('div')
    messageDiv.className = `event-message ${type}`
    messageDiv.textContent = message
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
      border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
      padding: 10px 15px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s ease;
    `

    document.body.appendChild(messageDiv)

    // フェードイン
    setTimeout(() => {
      messageDiv.style.opacity = '1'
    }, 10)

    // 3秒後にフェードアウトして削除
    setTimeout(() => {
      messageDiv.style.opacity = '0'
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv)
        }
      }, 300)
    }, 3000)
  }

  // 成功メッセージ表示
  showSuccess(message) {
    // 既存のメッセージ表示システムを使用
    if (window.showMessage) {
      window.showMessage(message, 'success')
    } else {
      alert(message)
    }
  }
}

// AppManagerと協調する初期化
function initEventManager() {
  if (window.registerManager) {
    window.registerManager('event', EventManager)
  } else {
    // AppManagerが準備されるまで待機
    window.addEventListener('appManagerReady', () => {
      window.registerManager('event', EventManager)
    })
  }
}

// DOMContentLoadedまたはAppManager準備完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventManager)
} else {
  initEventManager()
}

// グローバルに公開（デバッグ用）
window.EventManager = EventManager