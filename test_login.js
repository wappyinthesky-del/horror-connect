// Test login functionality
async function testLogin() {
  try {
    console.log('Testing login with admin password...');
    
    const response = await fetch('/welcome-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'password=19861225',
      credentials: 'same-origin'
    });
    
    console.log('Login response status:', response.status);
    console.log('Login response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('Login successful, checking cookies...');
      console.log('Document cookies after login:', document.cookie);
      
      // Check if redirect happened
      if (response.redirected) {
        console.log('Redirected to:', response.url);
      }
      
      // Force reload to apply authentication
      window.location.reload();
    } else {
      console.error('Login failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Run test
testLogin();