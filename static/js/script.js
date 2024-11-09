document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const content = document.getElementById('content');
    const loading = document.getElementById('loading');
    const themeToggle = document.getElementById('theme-toggle');
    const chatButton = document.getElementById('chat-button');
    const chatWidget = document.getElementById('chat-widget');
    const closeChat = document.getElementById('close-chat');
    const userInput = document.getElementById('user-input');
    const sendMessage = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const profileLink = document.getElementById('profile-link');
    const profileModal = document.getElementById('profile-modal');
    const closeModal = profileModal.querySelector('.close-modal');
    const logoutLink = document.getElementById('logout-link');

    // Show content and hide loading screen
    setTimeout(() => {
        loading.style.display = 'none';
        content.style.opacity = '1';
    }, 1000);

    // Navigation highlight
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= sectionTop - 60) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('light-mode')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    });

    // Chat functionality
    chatButton.addEventListener('click', () => {
        chatWidget.style.display = 'flex';
    });

    closeChat.addEventListener('click', () => {
        chatWidget.style.display = 'none';
    });

    function appendMessage(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendMessage.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (message) {
            appendMessage('user', message);
            userInput.value = '';

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message }),
                });

                const data = await response.json();
                if (response.ok) {
                    appendMessage('ai', data.response);
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                console.error('Error:', error);
                appendMessage('ai', 'Sorry, I encountered an error. Please try again.');
            }
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage.click();
        }
    });

    // Profile modal
    profileLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/profile');
            const data = await response.json();
            if (response.ok) {
                document.getElementById('profile-username').textContent = data.username;
                profileModal.style.display = 'block';
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    closeModal.addEventListener('click', () => {
        profileModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });

    // Logout functionality
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/logout');
            if (response.ok) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Career cards animation
    const careerCards = document.querySelectorAll('.career-card');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    careerCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        observer.observe(card);
    });
});