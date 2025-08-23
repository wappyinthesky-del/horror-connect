console.log('HorrorConnect Registration system loaded');

// パスワード一致確認のバリデーション
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password_confirm');
    const registerBtn = document.getElementById('register-btn');
    const passwordError = document.getElementById('password-error');
    
    if (!passwordInput || !passwordConfirmInput || !registerBtn) {
        return; // 登録ページ以外では実行しない
    }
    
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
});