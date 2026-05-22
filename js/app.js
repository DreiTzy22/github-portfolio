const sections = ['home', 'about', 'skills', 'projects', 'contact'];

// Dynamically fetch and load all sections
async function loadSections() {
    const promises = sections.map(async (name) => {
        try {
            const response = await fetch(`./sections/${name}.html`);
            if (!response.ok) throw new Error(`Failed to load ${name} section`);
            const html = await response.text();
            document.getElementById(name).innerHTML = html;
        } catch (error) {
            console.error(error);
            document.getElementById(name).innerHTML = `
                <div class="section-card">
                    <p style="color:var(--accent); font-weight:600;">Error loading section: ${name}</p>
                </div>`;
        }
    });

    await Promise.all(promises);
    
    // Once all templates are loaded, initialize script handlers
    initializePortfolio();
}

// Page load initialization
function initializePortfolio() {
    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // Load saved avatar photo from localStorage if custom one exists
    const savedProfile = localStorage.getItem('profileImage');
    if (savedProfile) {
        updateAvatarDisplays(savedProfile);
    }

    // Load saved project images
    for (let i = 1; i <= 4; i++) {
        const savedProj = localStorage.getItem('project_' + i);
        if (savedProj) {
            try {
                const urls = JSON.parse(savedProj);
                renderProjectImages(i, urls);
            } catch (e) {
                localStorage.removeItem('project_' + i);
            }
        }
    }
}

// Set page navigation routing
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
    }

    // Update nav status
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    const targetLink = document.getElementById('nav-' + pageId);
    if (targetLink) {
        targetLink.classList.add('active');
    }

    // Collapse mobile menu
    const navMenu = document.getElementById('navMenu');
    if (navMenu && navMenu.classList.contains('show')) {
        navMenu.classList.remove('show');
    }

    // Scroll to top on transition
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toggle Mobile menu
function toggleMenu() {
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.toggle('show');
}

// Theme Manager
function toggleTheme() {
    const body = document.documentElement;
    const currentTheme = body.getAttribute('data-theme');
    const targetTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    setTheme(targetTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');

    if (theme === 'light') {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }
}

// Display standard avatar fallback
function showAvatarFallback() {
    const container = document.getElementById('profileDisplay');
    if (container) {
        container.innerHTML = `<span class="avatar-fallback">👤</span>`;
    }
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) navAvatar.style.display = 'none';
}

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// API Photo uploads
function uploadProfilePhoto(event) {
    if (!isLocal) {
        showToast('Image uploads are disabled on static GitHub Pages hosting. Run the project locally to use this feature.', 'error');
        return;
    }
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    // Display loading feedback
    const container = document.getElementById('profileDisplay');
    const oldHtml = container.innerHTML;
    container.innerHTML = `<div style="color:var(--accent); font-weight:600; font-size:0.9rem;">Uploading...</div>`;

    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
    })
    .then(data => {
        if (data.url) {
            localStorage.setItem('profileImage', data.url);
            updateAvatarDisplays(data.url);
            showToast('Profile image updated successfully!', 'success');
        } else {
            throw new Error('Url not received');
        }
    })
    .catch(err => {
        container.innerHTML = oldHtml;
        showToast('Failed to upload image. Please try again.', 'error');
    });
}

function updateAvatarDisplays(url) {
    const display = document.getElementById('profileDisplay');
    if (display) {
        display.innerHTML = `<img id="mainProfilePic" src="${url}" alt="Dean Andrei Roberts Tavas" onerror="showAvatarFallback()">`;
    }
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) {
        navAvatar.src = url;
        navAvatar.style.display = 'block';
    }
}

// Project image uploads
function uploadProjectImage(event, id) {
    if (!isLocal) {
        showToast('Project photo uploads are disabled on static GitHub Pages hosting. Run the project locally to use this feature.', 'error');
        return;
    }
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Upload images sequentially
    let promises = files.map(file => {
        const formData = new FormData();
        formData.append('image', file);
        return fetch('/api/upload', {
            method: 'POST',
            body: formData
        }).then(res => {
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        });
    });

    Promise.all(promises)
    .then(results => {
        const urls = results.map(r => r.url);
        // Save to localstorage for persistence
        let saved = JSON.parse(localStorage.getItem('project_' + id) || '[]');
        saved = saved.concat(urls);
        localStorage.setItem('project_' + id, JSON.stringify(saved));
        
        renderProjectImages(id, saved);
        showToast(`Added ${urls.length} image(s) successfully!`, 'success');
    })
    .catch(err => {
        showToast('Failed to upload project images.', 'error');
    });
}

function renderProjectImages(id, urls) {
    const wrapper = document.getElementById('projectWrapper' + id);
    if (!wrapper) return;
    wrapper.innerHTML = '';

    if (!urls || urls.length === 0) return;

    urls.forEach((url, index) => {
        const div = document.createElement('div');
        div.style.position = 'relative';
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.flexShrink = '0';
        
        const img = document.createElement('img');
        img.src = url;
        img.className = 'project-img-slide';
        img.alt = `Project View ${index + 1}`;
        div.appendChild(img);

        // Delete button overlay
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '❌';
        delBtn.style.position = 'absolute';
        delBtn.style.top = '10px';
        delBtn.style.right = '10px';
        delBtn.style.background = 'rgba(239, 68, 68, 0.9)';
        delBtn.style.border = 'none';
        delBtn.style.color = 'white';
        delBtn.style.borderRadius = '50%';
        delBtn.style.width = '24px';
        delBtn.style.height = '24px';
        delBtn.style.fontSize = '10px';
        delBtn.style.cursor = 'pointer';
        delBtn.style.zIndex = '5';
        
        delBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeProjectImage(id, index);
        };

        div.appendChild(delBtn);
        wrapper.appendChild(div);
    });

    // Setup slider scroll snap if multiple images are loaded
    if (urls.length > 1) {
        wrapper.style.overflowX = 'auto';
        wrapper.style.scrollSnapType = 'x mandatory';
        Array.from(wrapper.children).forEach(c => {
            c.style.scrollSnapAlign = 'start';
        });
    } else {
        wrapper.style.overflowX = 'hidden';
    }
}

function removeProjectImage(id, index) {
    let saved = JSON.parse(localStorage.getItem('project_' + id) || '[]');
    saved.splice(index, 1);
    localStorage.setItem('project_' + id, JSON.stringify(saved));
    renderProjectImages(id, saved);
    showToast('Project image removed.', 'success');
}

// Toast Popup Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'success' : ''}`;
    
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);

    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4000);
}

// Bind functions to the window object to support inline HTML event listeners
window.showPage = showPage;
window.toggleMenu = toggleMenu;
window.toggleTheme = toggleTheme;
window.uploadProfilePhoto = uploadProfilePhoto;
window.uploadProjectImage = uploadProjectImage;
window.showAvatarFallback = showAvatarFallback;

// Start fetching and loading section templates on DOM load
window.addEventListener('DOMContentLoaded', () => {
    loadSections();
});
