// メモリ効率重視の掲示板管理クラス
class BoardManager {
  constructor() {
    this.boards = []
    this.currentBoard = null
    this.currentBoardId = null
    this.isInDetailView = false
    this.showingOldPosts = true
    this.compressedImage = null
    this.postCompressedImage = null
    // AppManagerが準備されるまで初期化を遅延
    this.initialized = false
  }

  async init() {
    if (this.initialized) return
    
    try {
      // DOM要素の取得（使用時のみ）
      this.initEventListeners()
      await this.loadBoards()
      this.initialized = true
      
      if (window.appManager) {
        window.appManager.log('BoardManager initialized successfully')
      }
    } catch (error) {
      if (window.appManager) {
        window.appManager.logError('BoardManager initialization failed', error)
      } else {
        console.error('BoardManager initialization failed:', error)
      }
    }
  }

  initEventListeners() {
    // 掲示板作成関連
    const createBtn = document.getElementById('board-create-btn')
    const titleInput = document.getElementById('board-title-input')
    const contentInput = document.getElementById('board-content-input')
    const imageBtn = document.getElementById('board-image-btn')
    const imageInput = document.getElementById('board-image-input')
    const removeImageBtn = document.getElementById('board-remove-image')

    if (createBtn) createBtn.addEventListener('click', () => this.createBoard())
    if (titleInput) titleInput.addEventListener('input', () => this.updateCreateButton())
    if (contentInput) contentInput.addEventListener('input', () => this.updateCreateButton())
    if (imageBtn) imageBtn.addEventListener('click', () => imageInput?.click())
    if (imageInput) imageInput.addEventListener('change', e => this.handleImageSelection(e, 'board'))
    if (removeImageBtn) removeImageBtn.addEventListener('click', () => this.removeImage('board'))

    // 戻るボタン
    const backBtn = document.getElementById('back-to-list-btn')
    if (backBtn) backBtn.addEventListener('click', () => this.backToList())

    // 投稿関連
    const postSubmitBtn = document.getElementById('board-post-submit-btn')
    const postImageBtn = document.getElementById('board-post-image-btn')
    const postImageInput = document.getElementById('board-post-image-input')
    const postRemoveImageBtn = document.getElementById('board-post-remove-image')

    if (postSubmitBtn) postSubmitBtn.addEventListener('click', () => this.submitPost())
    if (postImageBtn) postImageBtn.addEventListener('click', () => postImageInput?.click())
    if (postImageInput) postImageInput.addEventListener('change', e => this.handleImageSelection(e, 'post'))
    if (postRemoveImageBtn) postRemoveImageBtn.addEventListener('click', () => this.removeImage('post'))

    // 折りたたみトグル
    const toggleBtn = document.getElementById('toggle-old-posts-btn')
    if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleOldPosts())
  }

  // 掲示板一覧読み込み（メモリ効率重視）
  async loadBoards() {
    try {
      const response = await fetch('/api/boards')
      const data = await response.json()
      
      // 必要最小限のデータのみ保持
      this.boards = data.boards.map(board => ({
        id: board.id,
        title: board.title,
        postCount: board.postCount
      }))
      
      this.renderBoardsList()
    } catch (error) {
      console.error('掲示板読み込みエラー:', error)
      this.showError('掲示板の読み込みに失敗しました')
    }
  }

  // 掲示板一覧表示
  renderBoardsList() {
    const container = document.getElementById('boards-list')
    if (!container) return

    if (this.boards.length === 0) {
      container.innerHTML = '<div class="no-boards">まだ掲示板がありません</div>'
      return
    }

    // メモリ効率を考慮したレンダリング
    const html = this.boards.map(board => 
      `<div class="board-item" data-board-id="${board.id}">
         <div class="board-title">${this.escapeHtml(board.title)}</div>
         <div class="board-info">${board.postCount}件の投稿</div>
       </div>`
    ).join('')
    
    container.innerHTML = html

    // イベントリスナー（必要最小限）
    container.querySelectorAll('.board-item').forEach(item => {
      item.addEventListener('click', e => {
        const boardId = e.currentTarget.getAttribute('data-board-id')
        if (boardId) this.openBoard(boardId)
      })
    })
  }

  // 掲示板作成
  async createBoard() {
    const titleInput = document.getElementById('board-title-input')
    const contentInput = document.getElementById('board-content-input')
    const createBtn = document.getElementById('board-create-btn')
    
    const title = titleInput?.value.trim()
    const content = contentInput?.value.trim()
    
    if (!title || !content) {
      alert('タイトルと内容を入力してください')
      return
    }

    try {
      createBtn.disabled = true
      createBtn.textContent = '作成中...'

      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      
      if (this.compressedImage) {
        formData.append('image', this.compressedImage, 'image.jpg')
      }

      const response = await fetch('/api/boards', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      if (result.success) {
        titleInput.value = ''
        contentInput.value = ''
        this.removeImage('board')
        await this.loadBoards()
      } else {
        alert(result.error || '掲示板作成に失敗しました')
      }
    } catch (error) {
      console.error('掲示板作成エラー:', error)
      alert('掲示板作成に失敗しました')
    } finally {
      createBtn.disabled = false
      createBtn.textContent = '掲示板作成'
    }
  }

  // 個別掲示板を開く
  async openBoard(boardId) {
    try {
      const response = await fetch(`/api/boards/${boardId}`)
      const data = await response.json()
      
      if (data.error) {
        alert('掲示板が見つかりません')
        return
      }

      this.currentBoard = data.board
      this.currentBoardId = boardId
      this.isInDetailView = true
      this.showingOldPosts = true

      this.showDetailView()
      this.renderBoardPosts()
    } catch (error) {
      console.error('掲示板読み込みエラー:', error)
      alert('掲示板の読み込みに失敗しました')
    }
  }

  // 詳細ビュー表示（ナビゲーション非表示）
  showDetailView() {
    const listView = document.getElementById('board-list-view')
    const detailView = document.getElementById('board-detail-view')
    const bottomNav = document.querySelector('.bottom-nav')
    const postInput = document.getElementById('board-post-input')
    const titleElement = document.getElementById('board-detail-title')

    if (listView) listView.style.display = 'none'
    if (detailView) detailView.style.display = 'block'
    if (bottomNav) bottomNav.style.display = 'none'
    if (postInput) postInput.style.display = 'block'
    if (titleElement && this.currentBoard) {
      titleElement.textContent = this.currentBoard.title
    }
  }

  // 一覧に戻る
  backToList() {
    const listView = document.getElementById('board-list-view')
    const detailView = document.getElementById('board-detail-view')
    const bottomNav = document.querySelector('.bottom-nav')
    const postInput = document.getElementById('board-post-input')

    if (listView) listView.style.display = 'block'
    if (detailView) detailView.style.display = 'none'
    if (bottomNav) bottomNav.style.display = 'flex'
    if (postInput) postInput.style.display = 'none'

    this.isInDetailView = false
    this.currentBoard = null
    this.currentBoardId = null
  }

  // 投稿表示（50件制限対応）
  renderBoardPosts() {
    const container = document.getElementById('board-posts')
    const toggleContainer = document.getElementById('collapse-toggle')
    
    if (!container || !this.currentBoard) return

    const posts = this.currentBoard.posts
    const shouldShowToggle = posts.length > 50

    // 表示する投稿を決定
    let displayPosts
    if (shouldShowToggle && !this.showingOldPosts) {
      displayPosts = posts.slice(-50) // 最新50件
    } else {
      displayPosts = posts // 全件
    }

    const html = displayPosts.map(post => this.renderPost(post)).join('')
    container.innerHTML = html

    // ブックマークボタンのイベントリスナーを設定
    this.setupBookmarkEventListeners()

    // 折りたたみボタンの表示/非表示
    if (toggleContainer) {
      if (shouldShowToggle) {
        toggleContainer.style.display = 'block'
        const btn = document.getElementById('toggle-old-posts-btn')
        if (btn) {
          btn.textContent = this.showingOldPosts ? 
            `古い${posts.length - 50}件の投稿を非表示` : 
            `古い${posts.length - 50}件の投稿を表示`
        }
      } else {
        toggleContainer.style.display = 'none'
      }
    }
  }

  // ブックマークボタンのイベントリスナー設定
  setupBookmarkEventListeners() {
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const postId = e.currentTarget.getAttribute('data-post-id')
        const boardId = e.currentTarget.getAttribute('data-board-id')
        this.toggleBookmark(boardId, postId)
      })
    })
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
  async toggleBookmark(boardId, postId) {
    try {
      const response = await fetch(`/api/boards/${boardId}/posts/${postId}/bookmark`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        // UI を更新
        const btn = document.querySelector(`[data-post-id="${postId}"].bookmark-btn`)
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
        this.showMessage(result.message, 'success')
      } else {
        this.showMessage(result.error || 'ブックマーク操作に失敗しました', 'error')
      }
    } catch (error) {
      console.error('ブックマーク操作エラー:', error)
      this.showMessage('ネットワークエラーが発生しました', 'error')
    }
  }

  // メッセージ表示（簡易実装）
  showMessage(message, type = 'info') {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.board-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    // 新しいメッセージを作成
    const messageDiv = document.createElement('div')
    messageDiv.className = `board-message ${type}`
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

  // 投稿レンダリング
  renderPost(post) {
    const timeAgo = this.formatTimeAgo(post.timestamp)
    const imageHtml = post.image ? 
      `<div class="post-image">
         <img src="data:${post.image.type};base64,${post.image.data}" 
              alt="投稿画像" class="post-img" loading="lazy" />
       </div>` : ''
    
    // ブックマーク状態チェック（bookmarkedBy配列が存在しない場合は空配列として扱う）
    const isBookmarked = post.bookmarkedBy && post.bookmarkedBy.includes(this.getCurrentUserId())

    return `
      <div class="board-post-item" data-post-id="${post.id}">
        <div class="post-header">
          <div class="post-header-left">
            <a href="/profile/${post.userid}" class="post-author-link">
              <span class="post-author">${post.displayName}</span>
            </a>
            <span class="post-time">${timeAgo}</span>
          </div>
          <div class="post-actions">
            <button class="action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" 
                    data-post-id="${post.id}" 
                    data-board-id="${this.currentBoardId}" 
                    title="ブックマーク">
              <span class="bookmark-icon">${isBookmarked ? '★' : '☆'}</span>
            </button>
          </div>
        </div>
        <div class="post-content">${this.escapeHtml(post.content)}</div>
        ${imageHtml}
      </div>
    `
  }

  // 投稿送信
  async submitPost() {
    const contentInput = document.getElementById('board-post-content')
    const submitBtn = document.getElementById('board-post-submit-btn')
    
    const content = contentInput?.value.trim()
    if (!content) {
      alert('投稿内容を入力してください')
      return
    }

    try {
      submitBtn.disabled = true
      submitBtn.textContent = '投稿中...'

      const formData = new FormData()
      formData.append('content', content)
      
      if (this.postCompressedImage) {
        formData.append('image', this.postCompressedImage, 'image.jpg')
      }

      const response = await fetch(`/api/boards/${this.currentBoardId}/posts`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      if (result.success) {
        contentInput.value = ''
        this.removeImage('post')
        // 掲示板データを再取得して表示更新
        await this.openBoard(this.currentBoardId)
      } else {
        alert(result.error || '投稿に失敗しました')
      }
    } catch (error) {
      console.error('投稿エラー:', error)
      alert('投稿に失敗しました')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = '投稿'
    }
  }

  // 古い投稿の表示/非表示切り替え
  toggleOldPosts() {
    this.showingOldPosts = !this.showingOldPosts
    this.renderBoardPosts()
  }

  // 画像選択処理
  async handleImageSelection(event, type) {
    const file = event.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('画像ファイルは10MB以下を選択してください')
      return
    }

    try {
      const compressedBlob = await this.compressImage(file)
      const previewUrl = URL.createObjectURL(compressedBlob)
      
      if (type === 'board') {
        this.compressedImage = compressedBlob
        const preview = document.getElementById('board-image-preview')
        const img = document.getElementById('board-preview-img')
        if (preview && img) {
          img.src = previewUrl
          preview.style.display = 'block'
        }
      } else {
        this.postCompressedImage = compressedBlob
        const preview = document.getElementById('board-post-image-preview')
        const img = document.getElementById('board-post-preview-img')
        if (preview && img) {
          img.src = previewUrl
          preview.style.display = 'block'
        }
      }
    } catch (error) {
      console.error('画像処理エラー:', error)
      alert('画像の処理に失敗しました')
    }
  }

  // 画像圧縮（メモリ効率重視）
  async compressImage(file, quality = 0.7, maxWidth = 800, maxHeight = 600) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(blob => {
          if (blob) resolve(blob)
          else reject(new Error('画像圧縮に失敗しました'))
        }, 'image/jpeg', quality)
      }

      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
      img.src = URL.createObjectURL(file)
    })
  }

  // 画像削除
  removeImage(type) {
    if (type === 'board') {
      this.compressedImage = null
      const preview = document.getElementById('board-image-preview')
      const img = document.getElementById('board-preview-img')
      if (preview && img) {
        preview.style.display = 'none'
        URL.revokeObjectURL(img.src)
        img.src = ''
      }
    } else {
      this.postCompressedImage = null
      const preview = document.getElementById('board-post-image-preview')
      const img = document.getElementById('board-post-preview-img')
      if (preview && img) {
        preview.style.display = 'none'
        URL.revokeObjectURL(img.src)
        img.src = ''
      }
    }
  }

  // ボタン状態更新
  updateCreateButton() {
    const titleInput = document.getElementById('board-title-input')
    const contentInput = document.getElementById('board-content-input')
    const createBtn = document.getElementById('board-create-btn')
    
    const title = titleInput?.value.trim()
    const content = contentInput?.value.trim()
    
    if (createBtn) {
      createBtn.disabled = !title || !content
    }
  }

  // エラー表示
  showError(message) {
    const container = document.getElementById('boards-list')
    if (container) {
      container.innerHTML = `<div class="error-message">${message}</div>`
    }
  }

  // 時間フォーマット
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

  // HTMLエスケープ
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// AppManagerと協調する初期化
function initBoardManager() {
  if (window.registerManager) {
    window.registerManager('board', BoardManager)
  } else {
    // AppManagerが準備されるまで待機
    window.addEventListener('appManagerReady', () => {
      window.registerManager('board', BoardManager)
    })
  }
}

// DOMContentLoadedまたはAppManager準備完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBoardManager)
} else {
  initBoardManager()
}