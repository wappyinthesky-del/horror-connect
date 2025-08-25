// フィードタブの機能実装
class FeedManager {
  constructor() {
    this.currentUser = null;
    this.posts = [];
    this.isLoading = false; // 重複読み込み防止フラグ
    this.autoUpdateTimer = null; // 自動更新タイマー
    this.init();
  }

  async init() {
    console.log('FeedManager: Starting initialization...');
    
    // 初期化状態フラグ
    this.initializationAttempted = false;
    
    // グローバルアクセス用
    window.feedManager = this;
    
    // 認証イベントリスナーを設定
    window.addEventListener('authenticationReady', (event) => {
      console.log('FeedManager: Received authenticationReady event', event.detail);
      if (event.detail.authenticated && !this.initializationAttempted) {
        this.initializeWithAuth();
      }
    });

    // 複数のタイミングで初期化を試行
    this.attemptInitializationMultiple();
  }
  
  // 複数のタイミングで初期化を試行
  async attemptInitializationMultiple() {
    console.log('FeedManager: Attempting initialization at multiple timings');
    
    // 即座に1回目の試行
    setTimeout(() => this.tryInitialization('immediate'), 100);
    
    // 500ms後に2回目の試行  
    setTimeout(() => this.tryInitialization('delayed-500ms'), 500);
    
    // 1秒後に3回目の試行
    setTimeout(() => this.tryInitialization('delayed-1s'), 1000);
    
    // 3秒後に最終試行
    setTimeout(() => this.tryInitialization('final-3s'), 3000);
  }
  
  // 初期化試行
  async tryInitialization(timing) {
    if (this.initializationAttempted) {
      console.log(`FeedManager: Skipping ${timing} - already initialized`);
      return;
    }
    
    console.log(`FeedManager: Trying initialization at ${timing}`);
    
    // 認証状態を確認
    const hasAuthCookie = document.cookie.includes('horror_auth=authenticated');
    console.log(`FeedManager: Auth cookie present (${timing}):`, hasAuthCookie);
    
    if (hasAuthCookie) {
      try {
        await this.initializeWithAuth();
        console.log(`FeedManager: Successfully initialized at ${timing}`);
      } catch (error) {
        console.error(`FeedManager: Initialization failed at ${timing}:`, error);
      }
    } else {
      console.log(`FeedManager: No auth at ${timing}, waiting...`);
    }
  }

  async initializeWithAuth() {
    if (this.initializationAttempted) {
      console.log('FeedManager: Initialization already attempted, skipping');
      return;
    }
    
    this.initializationAttempted = true;
    console.log('FeedManager: *** STARTING AUTHENTICATION INITIALIZATION ***');
    
    try {
      // DOM要素が利用可能になるまで待機
      console.log('FeedManager: Waiting for DOM elements...');
      await this.waitForDOM();
      console.log('FeedManager: DOM elements are ready');
      
      // DOM要素の取得
      this.postSubmitBtn = document.getElementById('post-submit-btn');
      this.postContentInput = document.getElementById('post-content');
      this.feedPostsContainer = document.getElementById('feed-posts');
      this.composerDisplayName = document.getElementById('composer-display-name');
      this.imageAttachBtn = document.getElementById('image-attach-btn');
      this.imageFileInput = document.getElementById('image-file-input');
      this.imagePreview = document.getElementById('image-preview');
      this.previewImg = document.getElementById('preview-img');
      this.removeImageBtn = document.getElementById('remove-image-btn');

      console.log('FeedManager: DOM elements acquired:', {
        postSubmitBtn: !!this.postSubmitBtn,
        postContentInput: !!this.postContentInput,
        feedPostsContainer: !!this.feedPostsContainer,
        composerDisplayName: !!this.composerDisplayName
      });

      // DOM要素の存在チェック
      if (!this.feedPostsContainer) {
        throw new Error('Feed posts container not found');
      }

      // 画像関連の状態管理
      this.selectedImage = null;
      this.compressedImageBlob = null;
      
      // 初期化済みフラグ
      this.initialized = true;

      // イベントリスナーの設定
      console.log('FeedManager: Setting up event listeners...');
      this.setupEventListeners();

      // タブ切り替え時の再読み込み設定
      console.log('FeedManager: Setting up tab switch listener...');
      this.setupTabSwitchListener();
      
      // 初期化済みフラグ
      this.initialized = true;
      console.log('FeedManager: Marked as initialized');
      
      // グローバルにアクセス可能にしてデバッグを支援
      window.feedManager = this;
      
      // 即座に初回読み込み実行
      console.log('FeedManager: Starting immediate feed load...');
      this.loadFeed();
      
      // タブ切り替え時と同じ確実な読み込み（500ms後に1回のみ）
      setTimeout(() => {
        if (!this.posts || this.posts.length === 0) {
          console.log('FeedManager: Ensuring feed load like tab switch...');
          this.loadFeed();
        }
      }, 500);
      
      // フォールバック読み込み
      setTimeout(() => {
        console.log('FeedManager: Fallback load attempt (2s delay)');
        if (!this.posts || this.posts.length === 0) {
          this.forceInitialization();
        }
      }, 2000);
      
      console.log('FeedManager: *** INITIALIZATION COMPLETED SUCCESSFULLY ***');
      
    } catch (error) {
      console.error('FeedManager: Initialization failed:', error);
      this.initializationAttempted = false; // 失敗時はリトライを許可
      throw error;
    }
  }
  
  // イベントリスナーの一括設定
  setupEventListeners() {
    if (this.postSubmitBtn) {
      this.postSubmitBtn.addEventListener('click', () => this.submitPost());
    }

    if (this.postContentInput) {
      this.postContentInput.addEventListener('input', () => this.updatePostButton());
    }

    if (this.imageAttachBtn) {
      this.imageAttachBtn.addEventListener('click', () => this.openImagePicker());
    }

    if (this.imageFileInput) {
      this.imageFileInput.addEventListener('change', (e) => this.handleImageSelection(e));
    }

    if (this.removeImageBtn) {
      this.removeImageBtn.addEventListener('click', () => this.removeImage());
    }
  }

  // タブ切り替え時のリスナー設定
  setupTabSwitchListener() {
    // フィードタブがアクティブになった時の処理
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-tab="feed"]')) {
        setTimeout(() => {
          if (!this.posts || this.posts.length === 0) {
            console.log('FeedManager: Reloading feed on tab switch');
            this.loadFeed();
          } else {
            // 投稿がある場合も表示を確実にする
            this.ensureFeedVisible();
          }
        }, 100);
      }
    });
  }

  // AppManager依存を削除し、独立動作に変更

  // DOM要素が利用可能になるまで待機
  async waitForDOM() {
    let attempts = 0;
    const maxAttempts = 100; // 10秒間待機（延長）
    
    while (attempts < maxAttempts) {
      const feedContainer = document.getElementById('feed-posts');
      const feedTab = document.getElementById('feed-tab');
      
      if (feedContainer && feedTab) {
        console.log('FeedManager: DOM elements found');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.warn('FeedManager: DOM elements not found after waiting');
  }

  // 投稿ボタンの状態更新
  updatePostButton() {
    const content = this.postContentInput.value.trim();
    if (this.postSubmitBtn) {
      this.postSubmitBtn.disabled = content.length === 0 || content.length > 500;
      this.postSubmitBtn.textContent = content.length > 500 ? '文字数オーバー' : '投稿';
    }
  }

  // 投稿送信
  async submitPost() {
    const content = this.postContentInput.value.trim();
    if (!content || content.length === 0) {
      alert('投稿内容を入力してください');
      return;
    }

    if (content.length > 500) {
      alert('投稿は500文字以内で入力してください');
      return;
    }

    try {
      this.postSubmitBtn.disabled = true;
      this.postSubmitBtn.textContent = '投稿中...';

      const formData = new FormData();
      formData.append('content', content);

      // 画像が選択されている場合は追加
      if (this.compressedImageBlob) {
        formData.append('image', this.compressedImageBlob, 'image.jpg');
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        this.postContentInput.value = '';
        this.removeImage(); // 画像をクリア
        this.updatePostButton();
        await this.loadFeed(); // フィードを再読み込み
      } else {
        alert(result.error || '投稿に失敗しました');
      }
    } catch (error) {
      console.error('投稿エラー:', error);
      alert('投稿に失敗しました');
    } finally {
      this.postSubmitBtn.disabled = false;
      this.postSubmitBtn.textContent = '投稿';
    }
  }

  // フィード読み込み（改良されたリトライ機能付き）
  async loadFeed(retryCount = 0) {
    // 重複読み込み防止
    if (this.isLoading) {
      console.log('FeedManager: Already loading, skipping duplicate request');
      return;
    }
    
    if (!this.initialized) {
      console.log('FeedManager: Not initialized yet, skipping loadFeed');
      return;
    }
    
    const maxRetries = 2; // リトライ回数を減らす
    this.isLoading = true; // 読み込み中フラグを設定
    
    try {
      console.log(`FeedManager: Loading feed (attempt ${retryCount + 1})`);
      
      // 認証状態の再確認
      const hasAuthCookie = document.cookie.includes('horror_auth=authenticated');
      if (!hasAuthCookie) {
        console.log('FeedManager: No authentication, skipping feed load');
        if (this.feedPostsContainer) {
          this.feedPostsContainer.innerHTML = '<div class="auth-required">ログインが必要です</div>';
        }
        this.isLoading = false;
        return;
      }
      
      // 初回読み込み時のみローディング表示
      if (retryCount === 0 && this.feedPostsContainer) {
        this.feedPostsContainer.innerHTML = '<div class="loading-placeholder">フィードを読み込み中...</div>';
      }
      
      const response = await fetch('/api/feed', {
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid response type: ${contentType}`);
      }
      
      const data = await response.json();
      console.log('FeedManager: Feed data received:', data);

      // データの処理
      if (data.currentUser) {
        this.currentUser = data.currentUser;
        if (this.composerDisplayName) {
          this.composerDisplayName.textContent = data.currentUser.displayName;
        }
      }

      this.posts = data.posts || [];
      console.log(`FeedManager: ${this.posts.length} posts loaded successfully`);
      
      // フィードレンダリング
      this.renderFeed();
      
      // 読み込み完了
      this.isLoading = false;
      console.log('FeedManager: Feed loading completed successfully');
      
      // DOMの即座な更新確認
      this.immediateUpdateCheck();
      
    } catch (error) {
      console.error(`フィード読み込みエラー (attempt ${retryCount + 1}):`, error);
      this.isLoading = false;
      
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * (retryCount + 1), 3000); // 線形バックオフに変更
        console.log(`FeedManager: Retrying in ${delay}ms...`);
        setTimeout(() => {
          this.loadFeed(retryCount + 1);
        }, delay);
      } else {
        if (this.feedPostsContainer) {
          this.feedPostsContainer.innerHTML = '<div class="error-message">フィードの読み込みに失敗しました。<br><button onclick="window.feedManager.loadFeed()">再試行</button></div>';
        }
      }
    }
  }
  
  // DOM即座更新チェック機能
  immediateUpdateCheck() {
    if (!this.feedPostsContainer) return;
    
    console.log('FeedManager: Immediate DOM update check');
    const postElements = this.feedPostsContainer.querySelectorAll('.feed-post');
    console.log(`FeedManager: Found ${postElements.length} posts in DOM`);
    
    if (postElements.length === 0 && this.posts.length > 0) {
      console.warn('FeedManager: Posts not visible, forcing immediate re-render');
      this.renderFeed();
      
      // 再チェック
      setTimeout(() => {
        const recheckElements = this.feedPostsContainer.querySelectorAll('.feed-post');
        if (recheckElements.length === 0) {
          console.error('FeedManager: Critical rendering issue detected');
          this.feedPostsContainer.innerHTML = `
            <div class="render-debug">
              <p>デバッグ情報:</p>
              <p>投稿数: ${this.posts.length}</p>
              <p>DOM要素数: ${recheckElements.length}</p>
              <button onclick="window.feedManager.forceReRender()">強制再描画</button>
            </div>
          `;
        } else {
          console.log('FeedManager: DOM rendering successful');
        }
      }, 100);
    }
  }
  
  // 強制再描画メソッド
  forceReRender() {
    console.log('FeedManager: Force re-render triggered');
    if (this.posts && this.posts.length > 0) {
      this.renderFeed();
    } else {
      console.log('FeedManager: No posts to render, reloading from API');
      this.loadFeed();
    }
  }
  
  // フィードの表示を確実にする
  ensureFeedVisible() {
    const feedTab = document.getElementById('feed-tab');
    const feedContainer = document.getElementById('feed-posts');
    
    if (!feedTab || !feedContainer) {
      console.warn('FeedManager: Feed DOM elements not found');
      return;
    }
    
    console.log('FeedManager: Checking feed visibility...');
    const isTabActive = feedTab?.classList.contains('active') || feedTab?.style.display !== 'none';
    console.log('- Feed tab active:', isTabActive);
    console.log('- Posts loaded:', this.posts?.length || 0);
    
    if (isTabActive && this.posts && this.posts.length > 0) {
      // DOMチェック - 既に投稿が表示されているかチェック
      const existingPosts = feedContainer.querySelectorAll('.feed-post');
      if (existingPosts.length === 0) {
        console.log('FeedManager: Posts not visible, rendering now');
        this.renderFeed();
      } else {
        console.log('FeedManager: Posts already visible in DOM');
      }
    }
  }
  
  // 強制初期化メソッド（デバッグ用）
  forceInitialization() {
    console.log('FeedManager: Force initialization triggered');
    
    // 現在の認証状態を強制チェック
    const hasAuthCookie = document.cookie.includes('horror_auth=authenticated');
    console.log('FeedManager: Force check - Auth cookie present:', hasAuthCookie);
    console.log('FeedManager: Force check - All cookies:', document.cookie);
    
    if (hasAuthCookie) {
      console.log('FeedManager: Auth detected, forcing feed load');
      if (!this.initialized && !this.initializationAttempted) {
        console.log('FeedManager: Attempting delayed initialization');
        this.initializeWithAuth();
      } else if (this.initialized) {
        console.log('FeedManager: Already initialized, forcing feed reload');
        this.loadFeed();
      }
    } else {
      console.warn('FeedManager: No auth cookie found during force initialization');
    }
  }

  // フィードレンダリング
  renderFeed() {
    if (!this.feedPostsContainer) {
      console.warn('FeedManager: Feed container not found for rendering');
      return;
    }

    console.log(`FeedManager: Rendering ${this.posts.length} posts`);

    if (this.posts.length === 0) {
      this.feedPostsContainer.innerHTML = '<div class="no-posts">まだ投稿がありません</div>';
      return;
    }

    // 投稿HTMLを生成
    const postsHtml = this.posts.map(post => this.renderPost(post)).join('');
    
    // DOM即座更新
    this.feedPostsContainer.innerHTML = postsHtml;
    
    // 描画確認
    const renderedPosts = this.feedPostsContainer.querySelectorAll('.feed-post');
    console.log(`FeedManager: ${renderedPosts.length} posts rendered in DOM`);

    // 投稿後のイベントリスナー設定
    this.setupPostEventListeners();
    
    // 自動更新スケジュール（30秒ごと）
    this.scheduleAutoUpdate();
  }
  
  // 自動更新スケジュール
  scheduleAutoUpdate() {
    // 既存のタイマーをクリア
    if (this.autoUpdateTimer) {
      clearTimeout(this.autoUpdateTimer);
    }
    
    // 30秒後に自動更新
    this.autoUpdateTimer = setTimeout(() => {
      if (this.initialized && !this.isLoading) {
        console.log('FeedManager: Auto-update triggered');
        this.loadFeed();
      }
    }, 30000); // 30秒
  }

  // 個別投稿のレンダリング
  renderPost(post) {
    const timeAgo = this.formatTimeAgo(post.timestamp);
    const isOwnPost = post.isOwnPost;
    const replyCount = post.replies ? post.replies.length : 0;
    const isBookmarked = post.bookmarkedBy && post.bookmarkedBy.includes(this.currentUser?.userid);
    
    // 画像がある場合の処理
    const imageHtml = post.image ? `
      <div class="post-image">
        <img src="data:${post.image.type};base64,${post.image.data}" 
             alt="投稿画像" 
             class="post-img" 
             loading="lazy" />
      </div>
    ` : '';

    return `
      <div class="feed-post" data-post-id="${post.id}">
        <div class="post-header">
          <div class="post-header-left">
            <div class="user-avatar">
              <div class="avatar-placeholder"></div>
            </div>
            <div class="post-meta">
              <a href="/profile/${post.userid}" class="post-author-link">
                <span class="post-author">${post.displayName}</span>
              </a>
              <span class="post-time">${timeAgo}</span>
            </div>
          </div>
        </div>
        <div class="post-content">${this.escapeHtml(post.content)}</div>
        ${imageHtml}
        <div class="post-actions">
          <button class="action-btn reply-btn" data-post-id="${post.id}" title="返信">
            <span class="reply-text">返信</span>
            ${replyCount > 0 ? `<span class="reply-count">${replyCount}</span>` : ''}
          </button>
          <button class="action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-post-id="${post.id}" title="ブックマーク">
            <span class="bookmark-star">${isBookmarked ? '★' : '☆'}</span>
          </button>
        </div>
        <div class="post-replies" id="replies-${post.id}" style="display: none;">
          <div class="reply-input-area">
            <textarea class="reply-input" placeholder="返信を入力..." maxlength="300" data-post-id="${post.id}"></textarea>
            <button class="reply-submit-btn" data-post-id="${post.id}">返信</button>
          </div>
          <div class="replies-list">
            ${post.replies ? post.replies.map(reply => this.renderReply(reply)).join('') : ''}
          </div>
        </div>
      </div>
    `;
  }

  // 返信のレンダリング  
  renderReply(reply) {
    const timeAgo = this.formatTimeAgo(reply.timestamp);
    return `
      <div class="reply-item">
        <div class="reply-header">
          <a href="/profile/${reply.userid}" class="reply-author-link">
            <span class="reply-author">${reply.displayName}</span>
          </a>
          <span class="reply-time">${timeAgo}</span>
        </div>
        <div class="reply-content">${this.escapeHtml(reply.content)}</div>
      </div>
    `;
  }

  // 投稿後のイベントリスナー設定
  setupPostEventListeners() {
    // 返信ボタン
    document.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const postId = e.currentTarget.getAttribute('data-post-id');
        this.toggleReplies(postId);
      });
    });

    // ブックマークボタン
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const postId = e.currentTarget.getAttribute('data-post-id');
        this.toggleBookmark(postId);
      });
    });

    // 返信送信ボタン
    document.querySelectorAll('.reply-submit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const postId = e.currentTarget.getAttribute('data-post-id');
        this.submitReply(postId);
      });
    });
  }

  // 返信エリアの表示/非表示切り替え
  toggleReplies(postId) {
    const repliesDiv = document.getElementById(`replies-${postId}`);
    if (repliesDiv) {
      repliesDiv.style.display = repliesDiv.style.display === 'none' ? 'block' : 'none';
    }
  }

  // 返信送信
  async submitReply(postId) {
    const replyInput = document.querySelector(`.reply-input[data-post-id="${postId}"]`);
    const submitBtn = document.querySelector(`.reply-submit-btn[data-post-id="${postId}"]`);
    
    if (!replyInput || !submitBtn) return;

    const content = replyInput.value.trim();
    if (!content) {
      alert('返信内容を入力してください');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      const formData = new FormData();
      formData.append('content', content);

      const response = await fetch(`/api/posts/${postId}/replies`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        replyInput.value = '';
        await this.loadFeed(); // フィードを再読み込みして返信を表示
      } else {
        alert(result.error || '返信に失敗しました');
      }
    } catch (error) {
      console.error('返信エラー:', error);
      alert('返信に失敗しました');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '返信';
    }
  }

  // ブックマークの切り替え
  async toggleBookmark(postId) {
    try {
      const response = await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        // ブックマークボタンの表示を更新
        const bookmarkBtn = document.querySelector(`.bookmark-btn[data-post-id="${postId}"]`);
        if (bookmarkBtn) {
          const icon = bookmarkBtn.querySelector('.bookmark-star');
          if (result.bookmarked) {
            bookmarkBtn.classList.add('bookmarked');
            if (icon) icon.textContent = '★';
          } else {
            bookmarkBtn.classList.remove('bookmarked');
            if (icon) icon.textContent = '☆';
          }
        }
      } else {
        alert(result.error || 'ブックマーク操作に失敗しました');
      }
    } catch (error) {
      console.error('ブックマークエラー:', error);
      alert('ブックマーク操作に失敗しました');
    }
  }

  // 時間表示のフォーマット
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return new Date(timestamp).toLocaleDateString('ja-JP');
  }

  // HTMLエスケープ
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 画像選択ダイアログを開く
  openImagePicker() {
    if (this.imageFileInput) {
      this.imageFileInput.click();
    }
  }

  // 画像選択時の処理
  async handleImageSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      alert('画像ファイルは10MB以下を選択してください');
      return;
    }

    try {
      // 画像を圧縮
      this.compressedImageBlob = await this.compressImage(file);
      
      // プレビューを表示
      const previewUrl = URL.createObjectURL(this.compressedImageBlob);
      if (this.previewImg) {
        this.previewImg.src = previewUrl;
      }
      if (this.imagePreview) {
        this.imagePreview.style.display = 'block';
      }

      this.selectedImage = file;
      console.log(`画像を圧縮しました: ${file.size} bytes → ${this.compressedImageBlob.size} bytes`);
    } catch (error) {
      console.error('画像処理エラー:', error);
      alert('画像の処理に失敗しました');
    }
  }

  // 画像圧縮機能
  async compressImage(file, quality = 0.7, maxWidth = 800, maxHeight = 600) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // アスペクト比を保持してリサイズ
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);

        // 圧縮したblobを取得
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('画像圧縮に失敗しました'));
          }
        }, 'image/jpeg', quality);
      };

      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = URL.createObjectURL(file);
    });
  }

  // 画像削除
  removeImage() {
    this.selectedImage = null;
    this.compressedImageBlob = null;
    
    if (this.imagePreview) {
      this.imagePreview.style.display = 'none';
    }
    if (this.previewImg) {
      URL.revokeObjectURL(this.previewImg.src);
      this.previewImg.src = '';
    }
    if (this.imageFileInput) {
      this.imageFileInput.value = '';
    }
  }
}

// グローバルにFeedManagerクラスを公開（AppManagerが参照できるように）
window.FeedManager = FeedManager

// AppManagerと協調する初期化（重複防止）
function initFeedManager() {
  if (window.feedManagerInitialized) {
    console.log('FeedManager already initialized, skipping')
    return
  }
  
  window.feedManagerInitialized = true
  
  if (window.registerManager) {
    window.registerManager('feed', FeedManager)
  } else {
    // AppManagerが準備されるまで待機
    window.addEventListener('appManagerReady', () => {
      window.registerManager('feed', FeedManager)
    })
  }
}

// DOMContentLoadedまたはAppManager準備完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFeedManager)
} else {
  initFeedManager()
}