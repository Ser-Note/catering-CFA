document.getElementById('changeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const msg = document.getElementById('msg');
  msg.textContent = '';

  try {
    const res = await fetch('/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, currentPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      msg.style.color = 'green';
      msg.textContent = 'Password changed successfully. Redirecting to login...';
      setTimeout(() => { window.location.href = '/login'; }, 1200);
    } else {
      msg.style.color = 'red';
      msg.textContent = data.error || 'Failed to change password';
    }
  } catch (err) {
    console.error(err);
    msg.style.color = 'red';
    msg.textContent = 'Network error';
  }
});