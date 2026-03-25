function switchTab(tab) {
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('registerForm').classList.toggle('active', tab === 'register');
    document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    btn.disabled = true;
    btn.textContent = 'Logging in…';
    try {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        setToken(data.token);
        setUser(data.user);
        showToast(`Welcome back, ${data.user.name}! 🎉`, 'success');
        setTimeout(() => {
            window.location.href = data.user.role === 'admin' ? 'admin.html' : 'events.html';
        }, 800);
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Sign In →';
    }
}

function toggleAdminKey() {
    const checked = document.getElementById('regAdminCheck').checked;
    const group = document.getElementById('secretKeyGroup');
    group.classList.toggle('visible', checked);
    if (!checked) document.getElementById('regSecretKey').value = '';
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    const isAdmin = document.getElementById('regAdminCheck').checked;
    const adminKey = document.getElementById('regSecretKey').value.trim();

    if (password !== confirm) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    if (isAdmin && !adminKey) {
        showToast('Please enter the admin secret key.', 'error');
        return;
    }

    const body = { name, email, password };
    if (isAdmin) body.adminKey = adminKey;

    btn.disabled = true;
    btn.textContent = 'Creating account…';
    try {
        await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        showToast(isAdmin ? 'Admin account created! Please login.' : 'Account created! Please login.', 'success');
        switchTab('login');
        document.getElementById('loginEmail').value = email;
        btn.disabled = false;
        btn.textContent = 'Create Account →';
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account →';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (user) {
        window.location.href = user.role === 'admin' ? 'admin.html' : 'events.html';
    }
});

