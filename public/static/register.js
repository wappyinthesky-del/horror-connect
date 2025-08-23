// Google Login simulation for HorrorConnect
function startGoogleLogin() {
  // シミュレート：実際のGoogle OAuth認証をここに実装
  // 現在は簡略化してSMS認証ページに直接遷移
  
  const userConfirm = confirm('Googleログインをシミュレートします。\n認証後、SMS認証に進みますか？');
  
  if (userConfirm) {
    // Google認証成功をシミュレート
    window.location.href = '/phone-verify';
  }
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