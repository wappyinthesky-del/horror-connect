// ブックマーク管理クラス
class BookmarkManager {
  constructor() {
    this.bookmarks = []
    this.filteredBookmarks = []
    this.currentFilter = 'all'
    this.isInitialized = false
    this.initEventListeners()
  }

  // イベントリスナーの初期化
  initEventListeners() {
    // フィルターボタン
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filterType = e.target.getAttribute('data-type')
        this.applyFilter(filterType)
      })
    })
  }

  // ブックマークタブが表示されたときの初期化
  async initialize() {
    if (this.isInitialized) {
      // 既に初期化済みの場合は再読み込みのみ
      await this.loadBookmarks()
      return
    }

    try {
      await this.loadBookmarks()
      this.isInitialized = true
    } catch (error) {
      console.error('ブックマーク初期化エラー:', error)
      this.showError('ブックマークの読み込みに失敗しました')
    }
  }

  // ブックマーク一覧読み込み
  async loadBookmarks() {
    try {
      const response = await fetch('/api/bookmarks')
      const result = await response.json()

      if (response.ok && result.bookmarks) {
        this.bookmarks = result.bookmarks
        this.applyFilter(this.currentFilter)
      } else {
        this.showError('ブックマークデータの読み込みに失敗しました')
      }
    } catch (error) {
      console.error('ブックマーク読み込みエラー:', error)
      this.showError('ネットワークエラーが発生しました')
    }
  }

  // フィルター適用
  applyFilter(filterType) {
    this.currentFilter = filterType

    // フィルターボタンのアクティブ状態更新
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active')
      if (btn.getAttribute('data-type') === filterType) {
        btn.classList.add('active')
      }
    })

    // フィルタリング
    if (filterType === 'all') {
      this.filteredBookmarks = [...this.bookmarks]
    } else {
      this.filteredBookmarks = this.bookmarks.filter(bookmark => bookmark.type === filterType)
    }

    this.renderBookmarks()
  }

  // ブックマーク表示
  renderBookmarks() {
    const container = document.getElementById('bookmarks-list')
    if (!container) return

    if (this.filteredBookmarks.length === 0) {
      container.innerHTML = '<div class="no-bookmarks">ブックマークされた投稿がありません</div>'
      return
    }

    const html = this.filteredBookmarks.map(bookmark => this.renderBookmarkItem(bookmark)).join('')
    container.innerHTML = html

    // リンクのイベントリスナーを設定
    this.attachLinkListeners()
  }

  // 個別ブックマーク表示
  renderBookmarkItem(bookmark) {
    const timeAgo = this.formatTimeAgo(bookmark.timestamp)
    const typeLabel = this.getTypeLabel(bookmark.type)
    const typeBadge = `<span class="bookmark-type-badge ${bookmark.type}">${typeLabel}</span>`

    // 画像表示
    const imageHtml = bookmark.image ? `
      <div class="bookmark-image">
        <img src="data:${bookmark.image.type};base64,${bookmark.image.data}" 
             alt="投稿画像" class="bookmark-img" loading="lazy" />
      </div>
    ` : ''

    // タイプ別の追加情報
    let additionalInfo = ''
    if (bookmark.type === 'event') {
      const eventDate = new Date(bookmark.eventDate).toLocaleDateString('ja-JP')
      const status = bookmark.isClosed ? '募集終了' : '募集中'
      additionalInfo = `
        <div class="bookmark-event-info">
          <span class="event-date">📅 ${eventDate}</span>
          <span class="event-capacity">👥 ${bookmark.participants}/${bookmark.capacity}人</span>
          <span class="event-status ${bookmark.isClosed ? 'closed' : 'open'}">${status}</span>
        </div>
      `
    } else if (bookmark.type === 'board') {
      additionalInfo = `
        <div class="bookmark-board-info">
          <span class="board-title">📋 ${this.escapeHtml(bookmark.boardTitle)}</span>
        </div>
      `
    }

    return `
      <div class="bookmark-item" data-bookmark-id="${bookmark.id}" data-type="${bookmark.type}">
        <div class="bookmark-header">
          <div class="bookmark-meta">
            ${typeBadge}
            <span class="bookmark-author">${this.escapeHtml(bookmark.author)}</span>
            <span class="bookmark-time">${timeAgo}</span>
          </div>
          <div class="bookmark-actions">
            <button class="bookmark-link-btn" data-bookmark-id="${bookmark.id}" title="元の投稿を表示">
              🔗
            </button>
          </div>
        </div>
        <div class="bookmark-content">
          <div class="bookmark-text">${this.escapeHtml(bookmark.content)}</div>
          ${imageHtml}
          ${additionalInfo}
          ${bookmark.referenceLink ? `
            <div class="bookmark-reference-link">
              <a href="${this.escapeHtml(bookmark.referenceLink)}" target="_blank" rel="noopener noreferrer" class="reference-link">
                🔗 参考リンク
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }

  // リンクイベントリスナー設定
  attachLinkListeners() {
    document.querySelectorAll('.bookmark-link-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bookmarkId = e.target.getAttribute('data-bookmark-id')
        this.navigateToOriginal(bookmarkId)
      })
    })
  }

  // 元投稿への移動
  navigateToOriginal(bookmarkId) {
    const bookmark = this.bookmarks.find(b => b.id === bookmarkId)
    if (!bookmark) {
      this.showError('ブックマークが見つかりません')
      return
    }

    try {
      if (bookmark.type === 'feed') {
        // フィードタブに切り替え
        this.switchToTab('feed')
      } else if (bookmark.type === 'event') {
        // イベントタブに切り替え
        this.switchToTab('event')
      } else if (bookmark.type === 'board') {
        // 掲示板タブに切り替えて詳細表示
        this.switchToTab('board')
        // 掲示板詳細表示のトリガー
        setTimeout(() => {
          if (window.boardManager) {
            window.boardManager.showBoardDetail(bookmark.boardId)
          }
        }, 200)
      }
    } catch (error) {
      console.error('ページ移動エラー:', error)
      this.showError('ページの移動に失敗しました')
    }
  }

  // タブ切り替え
  switchToTab(tabName) {
    // タブボタンをクリックしてタブを切り替え
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`)
    if (tabButton) {
      tabButton.click()
    }
  }

  // タイプラベル取得
  getTypeLabel(type) {
    const labels = {
      feed: 'フィード',
      event: 'イベント',
      board: '掲示板'
    }
    return labels[type] || type
  }

  // 時間表示フォーマット
  formatTimeAgo(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'たった今'
    if (minutes < 60) return `${minutes}分前`
    if (hours < 24) return `${hours}時間前`
    if (days < 30) return `${days}日前`
    
    return new Date(timestamp).toLocaleDateString('ja-JP')
  }

  // HTML エスケープ
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // エラー表示
  showError(message) {
    const container = document.getElementById('bookmarks-list')
    if (container) {
      container.innerHTML = `<div class="error-message">${this.escapeHtml(message)}</div>`
    }
  }

  // 成功メッセージ表示
  showSuccess(message) {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.bookmark-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    // 新しいメッセージを作成
    const messageDiv = document.createElement('div')
    messageDiv.className = 'bookmark-message success'
    messageDiv.textContent = message
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
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

    // 3秒後にフェードアウト
    setTimeout(() => {
      messageDiv.style.opacity = '0'
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv)
        }
      }, 300)
    }, 3000)
  }
}

// ブックマークタブがアクティブになった時にBookmarkManagerを初期化
document.addEventListener('DOMContentLoaded', () => {
  let bookmarkManager = null

  // タブ切り替えの監視
  const bookmarkTab = document.querySelector('[data-tab="bookmark"]')
  if (bookmarkTab) {
    bookmarkTab.addEventListener('click', () => {
      setTimeout(() => {
        if (!bookmarkManager) {
          bookmarkManager = new BookmarkManager()
        }
        bookmarkManager.initialize()
      }, 100)
    })
  }
})

// グローバルに公開（デバッグ用・他の機能との連携用）
window.BookmarkManager = BookmarkManager