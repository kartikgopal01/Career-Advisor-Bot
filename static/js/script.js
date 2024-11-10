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

    // Chat functionality
    chatButton.addEventListener('click', () => {
        chatWidget.style.display = 'flex';
    });

    closeChat.addEventListener('click', () => {
        chatWidget.style.display = 'none';
    });

    // Modify the existing appendMessage function to handle formatting
function appendMessage(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    // Format the message content
    const formattedMessage = formatChatMessage(message);
    messageDiv.innerHTML = formattedMessage;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatChatMessage(message) {
    // Replace asterisk-based bullet points with proper HTML list formatting
    return message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Handle bold text
                 .replace(/\*(.*?)\*/g, '<em>$1</em>')  // Handle italic text
                 .replace(/^\* (.*?)$/gm, '<li>$1</li>') // Handle bullet points
                 .replace(/((?:\n<li>.*?<\/li>\n)+)/g, '<ul>$1</ul>') // Wrap lists in ul tags
                 .replace(/\n/g, '<br>'); // Handle line breaks
}

// Add CSS to style the formatted messages
const style = document.createElement('style');
style.textContent = `
    .ai-message ul {
        margin: 5px 0 5px 20px;
        padding-left: 15px;
    }
    
    .ai-message li {
        margin: 5px 0;
        list-style-type: disc;
    }
    
    .ai-message strong {
        font-weight: bold;
    }
    
    .ai-message em {
        font-style: italic;
    }
`;
document.head.appendChild(style);

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
// Modified script.js profile-related code
async function fetchProfile() {
    try {
        const response = await fetch('/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'  // Important for cookies
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update profile modal with data
        document.getElementById('profile-username').textContent = data.username;
        document.getElementById('profile-join-date').textContent = `Member since: ${data.join_date}`;
        document.getElementById('total-chats').textContent = data.total_chats;
        document.getElementById('careers-explored-count').textContent = data.careers_explored.length;
        
        // Update careers explored list
        const careersList = document.getElementById('explored-careers-list');
        careersList.innerHTML = '';
        data.careers_explored.forEach(career => {
            const li = document.createElement('li');
            li.textContent = career;
            careersList.appendChild(li);
        });
        
        // Update chat history
        const chatHistoryList = document.getElementById('chat-history-list');
        chatHistoryList.innerHTML = '';
        data.chat_history.forEach(chat => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="chat-history-item">
                    <span class="timestamp">${new Date(chat.timestamp).toLocaleString()}</span>
                    <div class="message-pair">
                        <div class="user-message">${chat.user_message}</div>
                        <div class="ai-message">${chat.assistant_response}</div>
                    </div>
                </div>
            `;
            chatHistoryList.appendChild(li);
        });
        
        // Show the modal
        const profileModal = document.getElementById('profile-modal');
        profileModal.style.display = 'block';
        
    } catch (error) {
        console.error('Error fetching profile:', error);
        alert('Failed to load profile. Please try again.');
    }
}

// Add event listener for closing the profile modal
document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('profile-modal').style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('profile-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
// Add this to your existing JavaScript file

// Load particles.js
document.addEventListener('DOMContentLoaded', function() {
    // Load particles.js script
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/particles.js/2.0.0/particles.min.js';
    script.onload = initParticles;
    document.head.appendChild(script);
});

function initParticles() {
    particlesJS('particles-js', {
        particles: {
            number: {
                value: 80,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: '#00bcd4'
            },
            shape: {
                type: 'circle'
            },
            opacity: {
                value: 0.5,
                random: false
            },
            size: {
                value: 3,
                random: true
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#00bcd4',
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 6,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: {
                    enable: true,
                    mode: 'repulse'
                },
                resize: true
            }
        },
        retina_detect: true
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
  
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  
    themeToggle.addEventListener('click', () => {
      const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
      setTheme(newTheme);
    });
  
    function setTheme(theme) {
      if (theme === 'dark') {
        body.classList.add('dark-mode');
      } else {
        body.classList.remove('dark-mode');
      }
      localStorage.setItem('theme', theme);
      updateThemeIcon();
    }
  
    function updateThemeIcon() {
      const icon = themeToggle.querySelector('i');
      if (body.classList.contains('dark-mode')) {
        icon.classList.replace('fa-sun', 'fa-moon');
      } else {
        icon.classList.replace('fa-moon', 'fa-sun');
      }
    }
  
    // Animate career cards on scroll
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
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(card);
    });
  });
  