// アプリケーション統合管理システム
class AppManager {
  constructor() {
    this.managers = {}
    this.isInitialized = false
    this.activeTab = null
    this.apiRequestQueue = new Set()
    this.isDestroying = false
    this.debugMode = false
    
    // パフォーマンス監視
    this.performanceMetrics = {
      initTime: 0,
      apiCalls: 0,
      errors: 0,
      tabSwitches: 0
    }
    
    this.init()
  }

  // 初期化
  init() {
    if (this.isInitialized) {
      this.log('AppManager already initialized')
      return
    }

    const startTime = performance.now()
    
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
    
    // 初期タブ設定
    const feedTab = document.querySelector('[data-tab="feed"]')
    if (feedTab && !this.activeTab) {
      this.switchToTab('feed')
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
    switch (tabName) {
      case 'feed':
        await this.initializeFeedManager()
        break
      case 'match':
        await this.initializeMatchManager()
        break
      case 'event':
        await this.initializeEventManager()
        break
      case 'board':
        await this.initializeBoardManager()
        break
      case 'dm':
        await this.initializeDMManager()
        break
      case 'bookmark':
        await this.initializeBookmarkManager()
        break
      default:
        this.log(`Unknown tab: ${tabName}`)
    }
  }

  // フィードマネージャー初期化
  async initializeFeedManager() {
    if (!this.managers.feed && window.FeedManager) {
      this.managers.feed = new window.FeedManager()
      await this.managers.feed.loadFeed()
    }
  }

  // マッチマネージャー初期化
  async initializeMatchManager() {
    if (!this.managers.match && window.MatchManager) {
      this.managers.match = new window.MatchManager()
    }
  }

  // イベントマネージャー初期化
  async initializeEventManager() {
    if (!this.managers.event && window.EventManager) {
      this.managers.event = new window.EventManager()
    }
  }

  // ボードマネージャー初期化
  async initializeBoardManager() {
    if (!this.managers.board && window.BoardManager) {
      this.managers.board = new window.BoardManager()
    }
  }

  // DMマネージャー初期化
  async initializeDMManager() {
    if (!this.managers.dm && window.DMManager) {
      this.managers.dm = new window.DMManager()
      await this.managers.dm.initialize()
    }
  }

  // ブックマークマネージャー初期化
  async initializeBookmarkManager() {
    if (!this.managers.bookmark && window.BookmarkManager) {
      this.managers.bookmark = new window.BookmarkManager()
      await this.managers.bookmark.initialize()
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
    
    // API呼び出し監視
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      this.performanceMetrics.apiCalls++
      
      const requestId = Math.random().toString(36).substring(7)
      this.apiRequestQueue.add(requestId)
      
      const startTime = performance.now()
      
      try {
        const response = await originalFetch.apply(this, args)
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
      
      try {
        const response = await originalFetch(...args)
        this.apiRequestQueue.delete(requestId)
        return response
      } catch (error) {
        this.apiRequestQueue.delete(requestId)
        this.performanceMetrics.errors++
        throw error
      }
    }
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
    if (this.debugMode) {
      console.log(`[AppManager] ${message}`)
    }
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