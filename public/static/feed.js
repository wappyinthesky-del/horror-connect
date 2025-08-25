// フィードタブの機能実装
class FeedManager {
  constructor() {
    this.currentUser = null;
    this.posts = [];
    this.init();
  }

  async init() {
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

    // 画像関連の状態管理
    this.selectedImage = null;
    this.compressedImageBlob = null;

    // イベントリスナーの設定
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

    // 初期データの読み込み
    await this.loadFeed();
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

  // フィード読み込み
  async loadFeed() {
    try {
      const response = await fetch('/api/feed');
      const data = await response.json();

      if (data.currentUser) {
        this.currentUser = data.currentUser;
        if (this.composerDisplayName) {
          this.composerDisplayName.textContent = data.currentUser.displayName;
        }
      }

      this.posts = data.posts || [];
      this.renderFeed();
    } catch (error) {
      console.error('フィード読み込みエラー:', error);
      if (this.feedPostsContainer) {
        this.feedPostsContainer.innerHTML = '<div class="error-message">フィードの読み込みに失敗しました</div>';
      }
    }
  }

  // フィードレンダリング
  renderFeed() {
    if (!this.feedPostsContainer) return;

    if (this.posts.length === 0) {
      this.feedPostsContainer.innerHTML = '<div class="no-posts">まだ投稿がありません</div>';
      return;
    }

    const postsHtml = this.posts.map(post => this.renderPost(post)).join('');
    this.feedPostsContainer.innerHTML = postsHtml;

    // 投稿後のイベントリスナー設定
    this.setupPostEventListeners();
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
              <span class="post-author">${post.displayName}</span>
              <span class="post-time">${timeAgo}</span>
            </div>
          </div>
          <div class="post-actions">
            <button class="action-btn reply-btn" data-post-id="${post.id}" title="返信">
              <span class="reply-text">返信</span>
              ${replyCount > 0 ? `<span class="reply-count">${replyCount}</span>` : ''}
            </button>
            <button class="action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-post-id="${post.id}" title="ブックマーク">
              <span class="bookmark-icon">${isBookmarked ? '★' : '☆'}</span>
            </button>
          </div>
        </div>
        <div class="post-content">${this.escapeHtml(post.content)}</div>
        ${imageHtml}
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
          <span class="reply-author">${reply.displayName}</span>
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
          const icon = bookmarkBtn.querySelector('.bookmark-icon');
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

// フィードタブがアクティブになったときに初期化
document.addEventListener('DOMContentLoaded', function() {
  let feedManager = null;

  // タブ切り替え時の処理
  function initFeedIfActive() {
    const feedTab = document.getElementById('feed-tab');
    if (feedTab && feedTab.classList.contains('active') && !feedManager) {
      feedManager = new FeedManager();
    }
  }

  // 初期チェック
  initFeedIfActive();

  // タブクリック時のイベントリスナー
  document.querySelectorAll('.nav-item').forEach(navItem => {
    navItem.addEventListener('click', function() {
      setTimeout(() => {
        initFeedIfActive();
      }, 100); // DOM更新を待つ
    });
  });
});