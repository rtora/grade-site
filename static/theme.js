document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) {
        console.error('Theme toggle button not found');
        return;
    }

    const themeLabel = themeToggle.querySelector('.theme-label');
    const toggleIcon = themeToggle.querySelector('.toggle-icon');
    const html = document.documentElement;

    // Check saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.classList.toggle('dark', savedTheme === 'dark');
    updateThemeUI(savedTheme === 'dark');

    // Theme toggle click handler
    themeToggle.addEventListener('click', () => {
        const isDark = !html.classList.contains('dark');
        html.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeUI(isDark);
    });

    function updateThemeUI(isDark) {
        if (!themeLabel || !toggleIcon) return;
        themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
        toggleIcon.textContent = isDark ? '🌙' : '☀️';
    }

    // Mobile menu functionality
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuButton && navLinks) {
        mobileMenuButton.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Animate hamburger to X
            const spans = mobileMenuButton.querySelectorAll('span');
            spans.forEach(span => span.classList.toggle('active'));
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !mobileMenuButton.contains(e.target)) {
                navLinks.classList.remove('active');
                const spans = mobileMenuButton.querySelectorAll('span');
                spans.forEach(span => span.classList.remove('active'));
            }
        });
    }
});