// アプリケーション統合管理システム
class AppManager {
  constructor() {
    this.managers = {}
    this.isInitialized = false
    this.isAuthenticated = false
    this.activeTab = null
    this.apiRequestQueue = new Set()
    this.isDestroying = false
    this.debugMode = false
    this.authCheckInterval = null
    
    // パフォーマンス監視
    this.performanceMetrics = {
      initTime: 0,
      apiCalls: 0,
      errors: 0,
      tabSwitches: 0
    }
    
    this.init()
  }

  // Cookie デバッグ機能
  debugCookies() {
    this.log('=== Cookie Debug Info ===')
    this.log('Document cookies:', document.cookie)
    this.log('Current URL:', window.location.href)
    this.log('Auth cookie present:', document.cookie.includes('horror_auth'))
    this.log('Current user cookie present:', document.cookie.includes('current_user'))
    
    // 個別のCookie値を確認
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {})
    
    this.log('Horror auth value:', cookies.horror_auth)
    this.log('Current user value:', cookies.current_user)
    this.log('All parsed cookies:', cookies)
  }

  // 自動ログイン試行（一時的に無効化）
  async attemptAutoLogin() {
    this.log('Auto login disabled for debugging')
    this.debugCookies()
    return false
  }

  // 認証状態をチェックしてから初期化
  async checkAuthenticationAndInitialize() {
    try {
      this.log('Checking authentication state...')
      
      // まずCookieをチェック
      const hasAuthCookie = document.cookie.includes('horror_auth=authenticated')
      this.log('Auth cookie present:', hasAuthCookie)
      
      if (!hasAuthCookie) {
        this.log('User not authenticated - disabling API calls')
        this.isAuthenticated = false
        this.clearSessionState() // セッション状態をクリア
        return
      }
      
      // 認証されている場合のみAPIを呼び出し
      this.log('User authenticated - proceeding with API initialization')
      this.isAuthenticated = true
      
      // フィードタブがアクティブな場合はFeedManagerを初期化
      if (this.activeTab === 'feed') {
        this.log('🎯 Feed tab is active, initializing FeedManager immediately...')
        setTimeout(() => {
          this.initializeFeedManager()
        }, 200) // DOM準備完了後に初期化
      }
      
      // 少し遅延してから他のマネージャーに認証状態を通知（DOM準備完了後）
      setTimeout(() => {
        this.log('📢 Dispatching delayed authenticationReady event')
        window.dispatchEvent(new CustomEvent('authenticationReady', { 
          detail: { authenticated: true } 
        }))
      }, 100)
      
    } catch (error) {
      this.log('Authentication check failed:', error)
      this.clearSessionState() // エラー時もセッション状態をクリア
    }
  }

  // 認証状態の監視を設定
  setupAuthenticationMonitoring() {
    // 初期状態を確認
    const initialAuthCookie = document.cookie.includes('horror_auth=authenticated')
    this.log(`Initial auth state: cookie=${initialAuthCookie}, isAuthenticated=${this.isAuthenticated}`)
    
    // 定期的な認証チェック（5秒間隔）
    this.authCheckInterval = setInterval(() => {
      const hasAuthCookie = document.cookie.includes('horror_auth=authenticated')
      
      if (hasAuthCookie && !this.isAuthenticated) {
        this.log('🔄 Authentication state changed - user logged in')
        this.isAuthenticated = true
        
        // フィードタブがアクティブな場合はFeedManagerを初期化
        if (this.activeTab === 'feed') {
          this.log('🎯 Feed tab is active, initializing FeedManager after login...')
          this.initializeFeedManager()
        }
        
        // 認証イベントを発行
        this.log('📢 Dispatching authenticationReady event')
        window.dispatchEvent(new CustomEvent('authenticationReady', { 
          detail: { authenticated: true } 
        }))
      } else if (!hasAuthCookie && this.isAuthenticated) {
        this.log('🔄 Authentication state changed - user logged out')
        this.isAuthenticated = false
        this.clearSessionState()
      }
    }, 5000)
    
    this.log('🔍 Authentication monitoring started (5-second intervals)')
  }

  // セッション状態のクリーンアップ
  clearSessionState() {
    try {
      // localStorage内のセッション関連データをクリア
      localStorage.removeItem('horror_user_session')
      localStorage.removeItem('horror_last_activity')
      localStorage.removeItem('horror_temp_data')
      
      // API リクエストキューをクリア
      this.apiRequestQueue.clear()
      
      // マネージャーをリセット
      Object.keys(this.managers).forEach(key => {
        if (this.managers[key] && typeof this.managers[key].reset === 'function') {
          this.managers[key].reset()
        }
      })
      
      this.log('Session state cleared')
    } catch (error) {
      this.log('Session state clear failed:', error)
    }
  }

  // 強制的にセッションを終了
  forceLogout() {
    try {
      // Cookieを削除
      document.cookie = 'horror_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'current_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      
      // セッション状態をクリア
      this.clearSessionState()
      
      // ページをリロードしてwelcomeページに戻る
      window.location.href = '/welcome'
      
      this.log('Force logout completed')
    } catch (error) {
      this.log('Force logout failed:', error)
    }
  }

  // デバッグ用自動ログイン機能（無効化）
  async debugAutoLogin() {
    this.debugCookies()
    this.log('Auto login disabled to prevent infinite loops')
    return false
  }

  // 初回ユーザーチェック
  checkFirstTimeUser() {
    const urlParams = new URLSearchParams(window.location.search)
    const targetTab = urlParams.get('tab')
    const isFirstTime = urlParams.get('first_time')
    
    if (targetTab === 'match' && isFirstTime === 'true') {
      this.log('🎉 First-time user detected - will redirect to match tab')
      
      // 認証確認後にマッチタブに切り替える
      setTimeout(() => {
        if (this.isAuthenticated) {
          this.log('🎯 Switching to match tab for first-time user')
          this.switchToTab('match')
          
          // ウェルカムメッセージを表示
          setTimeout(() => {
            this.showFirstTimeWelcomeMessage()
          }, 500)
          
          // URL パラメータをクリーンアップ
          const newUrl = window.location.pathname
          window.history.replaceState({}, document.title, newUrl)
        }
      }, 2000) // 認証とマネージャー初期化完了を待つ
    }
  }
  
  // 初回ユーザー向けウェルカムメッセージ表示
  showFirstTimeWelcomeMessage() {
    const matchContent = document.getElementById('match-content')
    if (matchContent) {
      // 既存のウェルカムメッセージを削除
      const existingMsg = matchContent.querySelector('.welcome-message')
      if (existingMsg) {
        existingMsg.remove()
      }
      
      // 新しいウェルカムメッセージを作成
      const welcomeMsg = document.createElement('div')
      welcomeMsg.className = 'welcome-message'
      welcomeMsg.style.cssText = 'background: #f0f8ff; border: 1px solid #87ceeb; padding: 16px; margin-bottom: 16px; border-radius: 8px; color: #000080;'
      welcomeMsg.innerHTML = `
        <h3 style="margin: 0 0 8px 0; color: #000080;">🎉 登録完了おめでとうございます！</h3>
        <p style="margin: 0;">同じホラーの趣味を持つ仲間を見つけましょう。下記はあなたと相性の良いユーザーです。</p>
      `
      
      matchContent.insertBefore(welcomeMsg, matchContent.firstChild)
      this.log('📢 First-time welcome message displayed')
    }
  }

  // 初期化
  init() {
    if (this.isInitialized) {
      this.log('AppManager already initialized')
      return
    }

    const startTime = performance.now()
    
    // 初期Cookieチェック
    this.debugCookies()
    
    // 初回ユーザー向けリダイレクトチェック
    this.checkFirstTimeUser()
    
    // 自動ログイン無効化（無限ループ防止）
    this.log('Auto login disabled during initialization to prevent loops')
    
    try {
      // 既存のイベントリスナーをクリア
      this.clearExistingListeners()
      
      // タブシステム初期化
      this.initializeTabSystem()
      
      // マネージャー登録システム設定
      this.setupManagerRegistry()
      
      // マネージャー登録システム設定
      this.setupManagerRegistry()
      
      // 各機能の遅延初期化設定
      this.setupLazyInitialization()
      
      // グローバルエラーハンドラー設定
      this.setupGlobalErrorHandlers()
      
      // パフォーマンス監視設定
      this.setupPerformanceMonitoring()
      
      this.performanceMetrics.initTime = performance.now() - startTime
      this.isInitialized = true
      
      this.log(`AppManager initialized in ${this.performanceMetrics.initTime.toFixed(2)}ms`)
      
      // 認証状態をチェックしてから各機能を初期化
      this.checkAuthenticationAndInitialize()
      
      // Cookie変更監視を設定（ログイン状態の動的変更に対応）
      this.setupAuthenticationMonitoring()
      
      // 他のスクリプトへの準備完了通知
      window.dispatchEvent(new CustomEvent('appManagerReady'))
      
    } catch (error) {
      this.handleError('AppManager initialization failed', error)
    }
  }

  // 既存のイベントリスナーをクリア
  clearExistingListeners() {
    // 既存のタブイベントリスナーを削除
    document.querySelectorAll('[data-tab]').forEach(tab => {
      const newTab = tab.cloneNode(true)
      tab.parentNode.replaceChild(newTab, tab)
    })
  }

  // タブシステム初期化
  initializeTabSystem() {
    const tabs = document.querySelectorAll('[data-tab]')
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault()
        const tabName = tab.getAttribute('data-tab')
        this.switchToTab(tabName)
      })
    })
    
    // 初期タブ設定（初回ログイン時はマッチタブ）
    const urlParams = new URLSearchParams(window.location.search)
    const isFirstLogin = urlParams.get('first_login') === 'true'
    
    if (isFirstLogin && !this.activeTab) {
      // 初回ログイン時はマッチタブにランディング
      this.switchToTab('match')
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      // 通常時はフィードタブ
      const feedTab = document.querySelector('[data-tab="feed"]')
      if (feedTab && !this.activeTab) {
        this.switchToTab('feed')
      }
    }
  }

  // タブ切り替え
  async switchToTab(tabName) {
    if (this.isDestroying) return
    
    try {
      this.performanceMetrics.tabSwitches++
      
      // 前のタブのクリーンアップ
      if (this.activeTab && this.activeTab !== tabName) {
        await this.cleanupTab(this.activeTab)
      }
      
      // タブUI更新
      this.updateTabUI(tabName)
      
      // タブ固有の初期化
      await this.initializeTab(tabName)
      
      this.activeTab = tabName
      this.log(`Switched to tab: ${tabName}`)
      
    } catch (error) {
      this.handleError(`Failed to switch to tab: ${tabName}`, error)
    }
  }

  // タブUI更新
  updateTabUI(tabName) {
    // タブボタンの更新
    document.querySelectorAll('[data-tab]').forEach(tab => {
      tab.classList.remove('active')
    })
    
    const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`)
    if (activeTabBtn) {
      activeTabBtn.classList.add('active')
    }
    
    // タブパネルの更新
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.style.display = 'none'
    })
    
    const activePanel = document.getElementById(`${tabName}-tab`)
    if (activePanel) {
      activePanel.style.display = 'block'
    }
  }

  // タブ固有の初期化
  async initializeTab(tabName) {
    this.log(`🚀 Initializing tab: ${tabName}`)
    
    switch (tabName) {
      case 'feed':
        this.log('📝 Feed tab selected - checking authentication state...')
        if (this.isAuthenticated) {
          this.log('🔑 User is authenticated, initializing FeedManager...')
          await this.initializeFeedManager()
        } else {
          this.log('🚫 User not authenticated, FeedManager will be initialized after login')
        }
        break
      case 'match':
        this.log('💘 Initializing MatchManager...')
        await this.initializeMatchManager()
        break
      case 'event':
        this.log('📅 Initializing EventManager...')
        await this.initializeEventManager()
        break
      case 'board':
        this.log('📋 Initializing BoardManager...')
        await this.initializeBoardManager()
        break
      case 'dm':
        this.log('💬 Initializing DMManager...')
        await this.initializeDMManager()
        break
      case 'bookmark':
        this.log('🔖 Initializing BookmarkManager...')
        await this.initializeBookmarkManager()
        break
      default:
        this.log(`❌ Unknown tab: ${tabName}`)
    }
    
    this.log(`✅ Tab ${tabName} initialization completed`)
  }

  // フィードマネージャー初期化
  async initializeFeedManager() {
    this.log(`🔍 FeedManager initialization check: managers.feed=${!!this.managers.feed}, window.FeedManager=${!!window.FeedManager}`)
    
    if (!this.managers.feed && window.FeedManager) {
      try {
        this.log('🚀 Creating new FeedManager instance...')
        this.managers.feed = new window.FeedManager()
        
        // グローバル参照も設定（デバッグ用）
        window.feedManager = this.managers.feed
        
        // FeedManagerは自分で初期化とフィード読み込みを行う
        this.log('✅ FeedManager instance created successfully')
        
      } catch (error) {
        console.error('FeedManager initialization failed:', error)
        const feedContainer = document.getElementById('feed-posts')
        if (feedContainer) {
          feedContainer.innerHTML = '<div class="error-message">フィードの読み込みに失敗しました。ページを再読み込みしてください。</div>'
        }
        // エラーを再スローしない（タブ切り替え全体を失敗させないため）
      }
    } else if (this.managers.feed) {
      this.log('♻️ FeedManager already exists, reusing')
      // 既存のFeedManagerが存在する場合は、フィード表示を確認
      if (this.managers.feed.ensureFeedVisible) {
        setTimeout(() => {
          this.managers.feed.ensureFeedVisible()
        }, 100)
      }
    } else {
      this.log('❌ FeedManager not available: waiting for script to load...')
      // FeedManagerクラスが利用可能になるまで待機
      const maxWait = 50 // 5秒間待機
      let attempts = 0
      
      const waitForFeedManager = () => {
        attempts++
        if (window.FeedManager) {
          this.log('✅ FeedManager class became available, initializing...')
          this.initializeFeedManager() // 再帰的に初期化を試行
        } else if (attempts < maxWait) {
          setTimeout(waitForFeedManager, 100) // 100ms後に再試行
        } else {
          this.log('❌ FeedManager class not available after waiting')
          const feedContainer = document.getElementById('feed-posts')
          if (feedContainer) {
            feedContainer.innerHTML = '<div class="error-message">フィードの読み込みに失敗しました。ページを再読み込みしてください。</div>'
          }
        }
      }
      
      setTimeout(waitForFeedManager, 100) // 100ms後に開始
    }
  }

  // マッチマネージャー初期化
  async initializeMatchManager() {
    if (!this.managers.match && window.MatchManager) {
      try {
        this.managers.match = new window.MatchManager()
        await this.managers.match.init()
      } catch (error) {
        console.error('MatchManager initialization failed:', error)
        const matchContent = document.getElementById('match-content')
        if (matchContent) {
          matchContent.innerHTML = '<div class="error-message">マッチデータの読み込みに失敗しました。ページを再読み込みしてください。</div>'
        }
        // エラーを再スローしない（タブ切り替え全体を失敗させないため）
      }
    }
  }

  // イベントマネージャー初期化
  async initializeEventManager() {
    if (!this.managers.event && window.EventManager) {
      try {
        this.managers.event = new window.EventManager()
        // EventManagerはコンストラクタで init() を呼ぶので、追加初期化は不要
      } catch (error) {
        console.error('EventManager initialization failed:', error)
        const eventContent = document.getElementById('event-content')
        if (eventContent) {
          eventContent.innerHTML = '<div class="error-message">イベント機能の読み込みに失敗しました。ページを再読み込みしてください。</div>'
        }
        // エラーを再スローしない（タブ切り替え全体を失敗させないため）
      }
    }
  }

  // ボードマネージャー初期化
  async initializeBoardManager() {
    if (!this.managers.board && window.BoardManager) {
      try {
        this.managers.board = new window.BoardManager()
        // BoardManagerはコンストラクタで init() を呼ぶので、追加初期化は不要
      } catch (error) {
        console.error('BoardManager initialization failed:', error)
        const boardContent = document.getElementById('board-content')
        if (boardContent) {
          boardContent.innerHTML = '<div class="error-message">掲示板機能の読み込みに失敗しました。ページを再読み込みしてください。</div>'
        }
        // エラーを再スローしない（タブ切り替え全体を失敗させないため）
      }
    }
  }

  // DMマネージャー初期化
  async initializeDMManager() {
    if (!this.managers.dm && window.DMManager) {
      try {
        this.managers.dm = new window.DMManager()
        // DMManagerはコンストラクタで init() を呼ぶので、追加で initialize() を呼び出す
        if (this.managers.dm.initialize) {
          await this.managers.dm.initialize()
        }
      } catch (error) {
        console.error('DMManager initialization failed:', error)
        const dmContent = document.getElementById('dm-content')
        if (dmContent) {
          dmContent.innerHTML = '<div class="error-message">DM機能の読み込みに失敗しました。ページを再読み込みしてください。</div>'
        }
        // エラーを再スローしない（タブ切り替え全体を失敗させないため）
      }
    }
  }

  // ブックマークマネージャー初期化
  async initializeBookmarkManager() {
    if (!this.managers.bookmark && window.BookmarkManager) {
      try {
        this.managers.bookmark = new window.BookmarkManager()
        // BookmarkManagerはタブ表示時に initialize() を呼ぶ
        if (this.managers.bookmark.initialize) {
          await this.managers.bookmark.initialize()
        }
      } catch (error) {
        console.error('BookmarkManager initialization failed:', error)
        const bookmarkContent = document.getElementById('bookmark-content')
        if (bookmarkContent) {
          bookmarkContent.innerHTML = '<div class="error-message">ブックマーク機能の読み込みに失敗しました。ページを再読み込みしてください。</div>'
        }
        // エラーを再スローしない（タブ切り替え全体を失敗させないため）
      }
    }
  }

  // タブクリーンアップ
  async cleanupTab(tabName) {
    // 特定のタブで必要なクリーンアップ処理
    if (this.managers[tabName] && this.managers[tabName].cleanup) {
      await this.managers[tabName].cleanup()
    }
  }

  // マネージャー登録システム設定
  setupManagerRegistry() {
    // グローバルマネージャー登録関数
    window.registerManager = (name, managerClass) => {
      this.log(`Registering manager: ${name}`)
      
      // タブ対応マネージャーの場合
      if (document.querySelector(`[data-tab="${name}"]`)) {
        const tab = document.querySelector(`[data-tab="${name}"]`)
        if (tab && !tab.hasAttribute('data-listener-registered')) {
          tab.addEventListener('click', async () => {
            if (!this.managers[name]) {
              this.log(`Lazy initializing manager: ${name}`)
              try {
                this.managers[name] = new managerClass()
                if (this.managers[name].init) {
                  await this.managers[name].init()
                }
              } catch (error) {
                this.logError(`Failed to initialize ${name} manager`, error)
              }
            }
            this.switchTab(name)
          })
          tab.setAttribute('data-listener-registered', 'true')
        }
      } else {
        // 即座に初期化が必要なマネージャー
        try {
          this.managers[name] = new managerClass()
          if (this.managers[name].init) {
            this.managers[name].init()
          }
        } catch (error) {
          this.logError(`Failed to initialize ${name} manager`, error)
        }
      }
    }
  }

  // 遅延初期化設定
  setupLazyInitialization() {
    // マネージャー登録システムが処理するため簡素化
    this.log('Lazy initialization setup completed via manager registry')
  }

  // グローバルエラーハンドラー
  setupGlobalErrorHandlers() {
    // JavaScript エラー
    window.addEventListener('error', (event) => {
      this.handleError('Global JavaScript Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      })
    })

    // Promise リジェクション
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason)
      event.preventDefault() // コンソールエラーを防ぐ
    })

    // リソース読み込みエラー
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError('Resource Load Error', new Error(`Failed to load: ${event.target.src || event.target.href}`))
      }
    }, true)

    // ネットワークエラー監視
    if ('navigator' in window && 'onLine' in navigator) {
      window.addEventListener('offline', () => {
        this.handleError('Network Error', new Error('Application went offline'))
        this.showUserMessage('インターネット接続が切断されました', 'warning')
      })

      window.addEventListener('online', () => {
        this.log('Network restored')
        this.showUserMessage('インターネット接続が復旧しました', 'success')
      })
    }
  }

  // パフォーマンス監視
  setupPerformanceMonitoring() {
    // メモリ使用量監視
    this.startMemoryMonitoring()
    
    // API呼び出し監視（制限付き）
    const originalFetch = window.fetch
    const requestCounts = new Map()
    const MAX_REQUESTS_PER_MINUTE = 30
    
    window.fetch = async (...args) => {
      // 緊急停止チェック - 破壊フラグがあれば全リクエストを停止
      if (this.isDestroying) {
        this.log(`🚫 EMERGENCY STOP: Blocking all requests due to destruction state`)
        throw new Error('AppManager is being destroyed - all requests blocked')
      }

      // リクエスト制限チェック
      const url = args[0]
      const now = Date.now()
      const minute = Math.floor(now / 60000)
      const key = `${url}_${minute}`
      
      const count = requestCounts.get(key) || 0
      if (count >= MAX_REQUESTS_PER_MINUTE) {
        this.log(`⚠️ Rate limit exceeded for ${url}, blocking request`)
        throw new Error(`Rate limit exceeded for ${url}`)
      }
      requestCounts.set(key, count + 1)

      // 同時実行リクエスト数チェック
      if (this.apiRequestQueue.size >= 5) {
        this.log(`⚠️ Too many concurrent requests (${this.apiRequestQueue.size}), blocking ${url}`)
        throw new Error(`Too many concurrent requests`)
      }
      
      // 古いカウンターを削除
      for (const [k, v] of requestCounts.entries()) {
        const keyMinute = parseInt(k.split('_').pop())
        if (minute - keyMinute > 2) {
          requestCounts.delete(k)
        }
      }
      
      this.performanceMetrics.apiCalls++
      
      const requestId = Math.random().toString(36).substring(7)
      this.apiRequestQueue.add(requestId)
      
      const startTime = performance.now()
      
      // Ensure credentials are always included for same-origin requests
      if (args.length >= 2 && typeof args[1] === 'object') {
        args[1].credentials = args[1].credentials || 'same-origin'
      } else if (args.length === 1) {
        args[1] = { credentials: 'same-origin' }
      }
      
      this.log(`Making API request to: ${args[0]} with credentials: ${args[1]?.credentials}`)
      this.log(`Request headers:`, args[1]?.headers || 'none')
      
      try {
        const response = await originalFetch.apply(window, args)
        
        // レスポンスの詳細ログ
        this.log(`Response status: ${response.status} for ${args[0]}`)
        this.log(`Response headers:`, [...response.headers.entries()])
        
        // レスポンスの内容タイプを確認
        const contentType = response.headers.get('content-type')
        this.log(`Content-Type: ${contentType} for ${args[0]}`)
        
        // HTMLレスポンスの場合は警告のみ（リトライ無効化）
        if (contentType && contentType.includes('text/html')) {
          this.log(`⚠️ WARNING: API ${args[0]} returned HTML instead of JSON - likely authentication redirect`)
          // リトライ機能を無効化してループを防止
        }
        
        const duration = performance.now() - startTime
        
        // 遅いリクエストの警告（閾値を上げて頻度を下げる）
        if (duration > 10000) {
          this.log(`Slow API request detected: ${args[0]} took ${duration.toFixed(2)}ms`)
        }
        
        return response
      } catch (error) {
        this.handleError('API Request Failed', error, { url: args[0] })
        throw error
      } finally {
        this.apiRequestQueue.delete(requestId)
      }
    }
    
    // パフォーマンス統計の定期収集（間隔を延長してメモリ負荷を軽減）
    this.performanceTimer = setInterval(() => {
      this.collectPerformanceStats()
    }, 60000) // 1分ごとに変更
  }

  // メモリ監視（最適化版）
  startMemoryMonitoring() {
    if (performance.memory) {
      this.memoryTimer = setInterval(() => {
        const memory = performance.memory
        const memoryInfo = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        }
        
        // メモリ使用量が75%を超えた場合の警告（閾値を下げて早期対応）
        if (memoryInfo.used / memoryInfo.limit > 0.75) {
          this.log(`High memory usage detected: ${memoryInfo.used}MB / ${memoryInfo.limit}MB`)
          this.attemptMemoryCleanup()
        }
      }, 30000) // 30秒ごとに変更（負荷軽減）
    }
  }

  // メモリクリーンアップ
  attemptMemoryCleanup() {
    // 非アクティブなタブのマネージャーをクリーンアップ
    Object.keys(this.managers).forEach(tabName => {
      if (tabName !== this.activeTab && this.managers[tabName]) {
        if (this.managers[tabName].cleanup) {
          this.managers[tabName].cleanup()
        }
        // 完全にクリーンアップ（再初期化が必要）
        if (tabName !== 'feed') { // フィードは常にアクティブ
          this.managers[tabName] = null
        }
      }
    })
    
    // ガベージコレクションを促す
    if (window.gc) {
      window.gc()
    }
    
    this.log('Memory cleanup attempted')
  }

  // パフォーマンス統計収集（最適化版）
  collectPerformanceStats() {
    const stats = {
      timestamp: Date.now(),
      initTime: this.performanceMetrics.initTime,
      apiCalls: this.performanceMetrics.apiCalls,
      errors: this.performanceMetrics.errors,
      tabSwitches: this.performanceMetrics.tabSwitches,
      activeManagers: Object.keys(this.managers).filter(key => this.managers[key] !== null).length,
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null
    }
    
    if (this.debugMode) {
      console.log('📊 Performance Stats:', stats)
    }
    
    // 統計をローカルストレージに保存（履歴件数を削減してメモリ節約）
    try {
      const perfHistory = JSON.parse(localStorage.getItem('horror_perf_history') || '[]')
      perfHistory.push(stats)
      // 最新20件のみ保持（50→20に削減）
      if (perfHistory.length > 20) {
        perfHistory.splice(0, perfHistory.length - 20)
      }
      localStorage.setItem('horror_perf_history', JSON.stringify(perfHistory))
    } catch (error) {
      // ローカルストレージエラーは無視
    }
  }

  // アプリ終了時のクリーンアップ
  destroy() {
    // タイマーのクリアでメモリリーク防止
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer)
      this.performanceTimer = null
    }
    
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer)
      this.memoryTimer = null
    }
    
    // マネージャーのクリーンアップ
    Object.keys(this.managers).forEach(key => {
      if (this.managers[key] && typeof this.managers[key].destroy === 'function') {
        this.managers[key].destroy()
      }
    })
    
    this.managers = {}
    this.apiRequestQueue.clear()
  }

  // エラーハンドリング
  handleError(message, error, additionalInfo = {}) {
    this.performanceMetrics.errors++
    
    const errorInfo = {
      message,
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      activeTab: this.activeTab,
      managersLoaded: Object.keys(this.managers).filter(key => this.managers[key] !== null),
      ...additionalInfo
    }
    
    console.error(`[AppManager] ${message}:`, error)
    
    // 開発環境での詳細ログ
    if (this.debugMode || window.location.hostname === 'localhost') {
      console.group('🚨 AppManager Error Report')
      console.error('Message:', message)
      console.error('Error:', error)
      console.table(errorInfo)
      console.groupEnd()
    }
    
    // 自動回復を試行
    this.attemptRecovery(message, error)
    
    // ユーザー向けエラー表示
    const userMessage = this.getUserFriendlyErrorMessage(message, error)
    this.showUserError(userMessage)
  }

  // エラー自動回復システム
  attemptRecovery(message, error) {
    if (message.includes('API') || message.includes('fetch')) {
      // API エラーの場合、リトライ機能
      setTimeout(() => {
        this.log('Attempting API recovery...')
        if (this.activeTab && this.managers[this.activeTab]) {
          const manager = this.managers[this.activeTab]
          if (manager.reload || manager.refresh || manager.loadData) {
            try {
              (manager.reload || manager.refresh || manager.loadData).call(manager)
              this.log(`Recovery attempted for ${this.activeTab} manager`)
            } catch (recoveryError) {
              console.error('Recovery failed:', recoveryError)
            }
          }
        }
      }, 2000)
    }
  }

  // ユーザーフレンドリーなエラーメッセージ
  getUserFriendlyErrorMessage(message, error) {
    const errorString = String(error?.message || error).toLowerCase()
    const messageString = message.toLowerCase()
    
    if (messageString.includes('network') || errorString.includes('fetch') || errorString.includes('network')) {
      return 'ネットワーク接続に問題があります。インターネット接続を確認してください。'
    }
    
    if (messageString.includes('api') || errorString.includes('api')) {
      return 'サーバーとの通信に失敗しました。しばらくしてからお試しください。'
    }
    
    if (messageString.includes('resource') || messageString.includes('load')) {
      return 'ファイルの読み込みに失敗しました。ページをリロードしてください。'
    }
    
    if (messageString.includes('manager') && messageString.includes('initialization')) {
      return 'アプリケーションの初期化に失敗しました。ページをリロードしてください。'
    }
    
    return 'エラーが発生しました。問題が続く場合はページをリロードしてください。'
  }

  // ユーザー向けエラー表示
  showUserError(message) {
    // 既存のエラーメッセージを削除
    const existingError = document.querySelector('.app-error-message')
    if (existingError) {
      existingError.remove()
    }

    const errorDiv = document.createElement('div')
    errorDiv.className = 'app-error-message'
    errorDiv.textContent = message
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #dc3545;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 90vw;
      text-align: center;
    `

    document.body.appendChild(errorDiv)

    // 10秒後に自動削除
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv)
      }
    }, 10000)
  }

  // タブ間ナビゲーション（他の機能から呼び出し用）
  navigateToTab(tabName, options = {}) {
    if (!this.isInitialized) {
      this.log('AppManager not initialized yet')
      return false
    }

    this.switchToTab(tabName)
    
    // 追加オプション処理
    if (options.boardId && tabName === 'board' && this.managers.board) {
      setTimeout(() => {
        this.managers.board.showBoardDetail(options.boardId)
      }, 200)
    }
    
    return true
  }

  // API呼び出し重複防止
  async makeApiCall(url, options = {}) {
    const key = `${options.method || 'GET'}_${url}`
    
    if (this.apiRequestQueue.has(key)) {
      this.log(`Duplicate API call prevented: ${key}`)
      return null
    }

    this.apiRequestQueue.add(key)
    
    try {
      const response = await fetch(url, options)
      this.apiRequestQueue.delete(key)
      return response
    } catch (error) {
      this.apiRequestQueue.delete(key)
      throw error
    }
  }

  // デバッグ情報取得
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      activeTab: this.activeTab,
      managers: Object.keys(this.managers),
      performanceMetrics: { ...this.performanceMetrics },
      pendingRequests: this.apiRequestQueue.size
    }
  }

  // ログ出力
  log(message) {
    // 常にログを出力（エラー診断のため）
    console.log(`[AppManager] ${message}`)
  }

  // クリーンアップ
  destroy() {
    this.isDestroying = true
    
    // 各マネージャーのクリーンアップ
    Object.values(this.managers).forEach(manager => {
      if (manager && manager.destroy) {
        manager.destroy()
      }
    })
    
    this.managers = {}
    this.isInitialized = false
    this.log('AppManager destroyed')
  }
}

// グローバル初期化
let appManager = null

document.addEventListener('DOMContentLoaded', () => {
  // 既存のインスタンスがあれば破棄
  if (appManager) {
    appManager.destroy()
  }
  
  // 新しいインスタンス作成
  appManager = new AppManager()
  
  // グローバルに公開
  window.appManager = appManager
})

// ページアンロード時のクリーンアップ
window.addEventListener('beforeunload', () => {
  if (appManager) {
    appManager.destroy()
  }
})

// グローバルナビゲーション関数（他の機能から使用）
window.navigateToTab = (tabName, options = {}) => {
  if (appManager) {
    return appManager.navigateToTab(tabName, options)
  }
  return false
}