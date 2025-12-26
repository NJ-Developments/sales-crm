// ===== Mobile Navigation Toggle =====
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// ===== Navbar Scroll Effect =====
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Form Submission =====
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    // Show success message (replace with actual form submission)
    alert('Thanks for reaching out! We\'ll get back to you within 24 hours.');
    
    // Reset form
    this.reset();
    
    // Log data for development (remove in production)
    console.log('Form submitted:', data);
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.service-card, .process-step, .contact-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Add animation class styles
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// ===== Scroll Progress Bar =====
const scrollProgress = document.querySelector('.scroll-progress');
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    scrollProgress.style.width = scrollPercent + '%';
});

// ===== Cursor Glow Effect =====
const cursorGlow = document.querySelector('.cursor-glow');
if (cursorGlow && window.innerWidth > 768) {
    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
        cursorGlow.classList.add('active');
    });
    
    document.addEventListener('mouseleave', () => {
        cursorGlow.classList.remove('active');
    });
}

// ===== Section Header Reveal Animation =====
const sectionHeaders = document.querySelectorAll('.section-header');
const headerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.3 });

sectionHeaders.forEach(header => headerObserver.observe(header));

// ===== Active Navigation Link =====
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===== Typing Effect for Hero =====
const heroText = document.querySelector('.hero h1 .gradient-text');
if (heroText) {
    const words = ['Digital Experiences', 'Custom Platforms', 'Online Success'];
    let wordIndex = 0;
    
    // Add cursor element
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    heroText.parentNode.insertBefore(cursor, heroText.nextSibling);
    
    function typeWord(word, callback) {
        let i = 0;
        heroText.textContent = '';
        const typing = setInterval(() => {
            if (i < word.length) {
                heroText.textContent += word.charAt(i);
                i++;
            } else {
                clearInterval(typing);
                setTimeout(callback, 2000);
            }
        }, 100);
    }
    
    function deleteWord(callback) {
        const text = heroText.textContent;
        let i = text.length;
        const deleting = setInterval(() => {
            if (i > 0) {
                heroText.textContent = text.substring(0, i - 1);
                i--;
            } else {
                clearInterval(deleting);
                callback();
            }
        }, 50);
    }
    
    function cycleWords() {
        deleteWord(() => {
            wordIndex = (wordIndex + 1) % words.length;
            typeWord(words[wordIndex], cycleWords);
        });
    }
    
    // Start cycling after initial delay
    setTimeout(cycleWords, 3000);
}

// ===== Parallax Effect for Floating Cards =====
const floatingCards = document.querySelectorAll('.floating-card');
if (window.innerWidth > 768) {
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        floatingCards.forEach((card, index) => {
            const speed = 0.1 + (index * 0.05);
            card.style.transform = `translateY(${scrollY * speed}px)`;
        });
    });
}

// ===== Number Counter Animation =====
function animateCounter(element, target, suffix = '') {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + suffix;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + suffix;
        }
    }, 30);
}

// ===== Console Welcome Message =====
console.log('%c NJ Developments ', 'background: linear-gradient(135deg, #6366f1 0%, #22d3ee 100%); color: white; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 8px;');
console.log('Welcome to NJ Developments! 🚀');
console.log('Contact us: javflores.ct@gmail.com | 860-987-7606');

// ===== Hidden CRM Access (Click footer logo 5 times quickly) =====
const footerLogo = document.getElementById('footer-logo-secret');
if (footerLogo) {
    let clickCount = 0;
    let clickTimer = null;
    
    footerLogo.addEventListener('click', (e) => {
        e.preventDefault();
        clickCount++;
        
        // Reset timer on each click
        if (clickTimer) clearTimeout(clickTimer);
        
        // Reset click count after 2 seconds of no clicks
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 2000);
        
        // After 5 quick clicks, redirect to CRM
        if (clickCount >= 5) {
            clickCount = 0;
            window.location.href = '/crm';
        }
    });
}