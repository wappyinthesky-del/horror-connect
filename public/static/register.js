console.log('HorrorConnect Registration system loaded');

// パスワード一致確認のバリデーション
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password_confirm');
    const registerBtn = document.getElementById('register-btn');
    const passwordError = document.getElementById('password-error');
    
    // 登録ページのバリデーション
    if (passwordInput && passwordConfirmInput && registerBtn) {
        function validatePasswords() {
            const password = passwordInput.value;
            const passwordConfirm = passwordConfirmInput.value;
            
            // パスワードが入力されていない場合はボタンを無効化
            if (!password || !passwordConfirm) {
                registerBtn.disabled = true;
                passwordError.style.display = 'none';
                return;
            }
            
            // パスワードが一致しない場合
            if (password !== passwordConfirm) {
                registerBtn.disabled = true;
                passwordError.style.display = 'block';
                passwordError.textContent = 'パスワードが一致しません';
            } else {
                registerBtn.disabled = false;
                passwordError.style.display = 'none';
            }
        }
        
        // パスワード入力時のイベントリスナー
        passwordInput.addEventListener('input', validatePasswords);
        passwordConfirmInput.addEventListener('input', validatePasswords);
        
        // ページ読み込み時の初期チェック
        validatePasswords();
    }
    
    // ホラー媒体選択のインタラクション
    const mediaLabels = document.querySelectorAll('.media-label');
    if (mediaLabels.length > 0) {
        mediaLabels.forEach(label => {
            label.addEventListener('click', function(e) {
                // デフォルトの動作を一時停止
                e.preventDefault();
                
                // 対応するチェックボックスを取得
                const checkbox = document.getElementById(this.getAttribute('for'));
                if (checkbox) {
                    // チェック状態を切り替え
                    checkbox.checked = !checkbox.checked;
                }
            });
        });
    }
    
    // ホラージャンル選択のインタラクション
    const genreLabels = document.querySelectorAll('.genre-label');
    if (genreLabels.length > 0) {
        genreLabels.forEach(label => {
            label.addEventListener('click', function(e) {
                // デフォルトの動作を一時停止
                e.preventDefault();
                
                // 対応するチェックボックスを取得
                const checkbox = document.getElementById(this.getAttribute('for'));
                if (checkbox) {
                    // チェック状態を切り替え
                    checkbox.checked = !checkbox.checked;
                }
            });
        });
    }
});