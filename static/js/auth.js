document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');

    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.auth-form').style.display = 'none';
        document.querySelectorAll('.auth-form')[1].style.display = 'block';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.auth-form')[1].style.display = 'none';
        document.querySelector('.auth-form').style.display = 'block';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = '/';
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('Account created successfully. Please log in.');
                window.location.href = '/login';
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});