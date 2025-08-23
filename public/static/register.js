// Google Login simulation for HorrorConnect
function startGoogleLogin() {
  // シミュレート：実際のGoogle OAuth認証をここに実装
  // Google認証成功をシミュレートして直接SMS認証ページに遷移
  window.location.href = '/phone-verify';
}

// SMS認証コードの自動送信シミュレート
function simulateSMSCode() {
  const codeInput = document.querySelector('.code-input');
  if (codeInput) {
    // デモ用の認証コード（実際は6桁のランダムコード）
    const demoCode = '123456';
    codeInput.value = demoCode;
  }
}