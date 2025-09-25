// Main JavaScript for MindTrack Application
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    initializeFlashMessages();
    initializeTooltips();
    initializeScrollEffects();
    initializeFormValidation();
});

// Sidebar Management
function initializeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const body = document.body;

    if (!sidebar || !sidebarToggle) return;

    // Toggle sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('show');
        if (sidebarOverlay) {
            sidebarOverlay.classList.toggle('show');
        }
        body.classList.toggle('sidebar-open');
    }

    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('show');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
        }
        body.classList.remove('sidebar-open');
    }

    // Event listeners
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('show')) {
            closeSidebar();
        }
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (window.innerWidth > 1200) {
                closeSidebar();
            }
        }, 250);
    });

    // Active link highlighting
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href)) {
            link.classList.add('active');
        }
    });
}

// Flash Messages Management
function initializeFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-messages .alert');
    
    flashMessages.forEach(message => {
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (message && message.parentNode) {
                message.style.opacity = '0';
                message.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.parentNode.removeChild(message);
                    }
                }, 300);
            }
        }, 5000);
    });
}

// Initialize Bootstrap Tooltips
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipElements.forEach(element => {
        new bootstrap.Tooltip(element);
    });
}

// Scroll Effects
function initializeScrollEffects() {
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            // Skip if href is just "#" or empty
            if (!targetId || targetId === '#' || targetId.length <= 1) {
                return;
            }
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Fade in elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elementsToObserve = document.querySelectorAll('.card, .welcome-header, .page-header');
    elementsToObserve.forEach(element => {
        observer.observe(element);
    });
}

// Form Validation Enhancement
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
                
                // Find first invalid field and focus it
                const firstInvalidField = form.querySelector(':invalid');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                    firstInvalidField.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }
            
            form.classList.add('was-validated');
        });

        // Real-time validation feedback
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.checkValidity()) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                } else {
                    this.classList.remove('is-valid');
                    this.classList.add('is-invalid');
                }
            });

            input.addEventListener('input', function() {
                if (this.classList.contains('is-invalid') && this.checkValidity()) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                }
            });
        });
    });
}

// Utility Functions
function showAlert(message, type = 'info') {
    const alertContainer = document.querySelector('.flash-messages');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    
    // Safely set message content using textContent
    alert.textContent = message;
    
    // Create and append close button safely
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'alert');
    alert.appendChild(closeButton);

    alertContainer.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.opacity = '0';
            alert.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 300);
        }
    }, 5000);
}

function showLoading(element, text = 'Loading...') {
    if (!element) return;

    const originalContent = element.innerHTML;
    element.innerHTML = `
        <span class="loading-spinner me-2"></span>
        ${text}
    `;
    element.disabled = true;

    return function hideLoading() {
        element.innerHTML = originalContent;
        element.disabled = false;
    };
}

function formatDate(date) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('en-US', options);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        return bootstrapModal;
    }
    return null;
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    }
}

// API Helper Functions
async function apiCall(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, mergedOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('API call failed:', error);
        showAlert('An error occurred. Please try again later.', 'danger');
        throw error;
    }
}

// Logout Confirmation
function confirmLogout() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Logout</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to logout?</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmLogoutBtn">Logout</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        document.getElementById('confirmLogoutBtn').addEventListener('click', () => {
            bootstrapModal.hide();
            resolve(true);
        });

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

// Safe DOM rendering utilities to prevent XSS
const SafeDOM = {
    // Escape HTML entities to prevent XSS
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // Safely set text content (automatically escaped)
    setText(element, text) {
        element.textContent = text;
    },

    // Safely set HTML content with automatic escaping
    setContent(element, content) {
        element.textContent = content;
    },

    // For trusted HTML content only - use with extreme caution
    setTrustedHTML(element, html) {
        console.warn('SafeDOM.setTrustedHTML: Only use with verified safe HTML content');
        element.innerHTML = html;
    },

    // Create element with safe text content
    createElement(tagName, textContent = null, className = null) {
        const element = document.createElement(tagName);
        if (textContent !== null) {
            element.textContent = textContent;
        }
        if (className) {
            element.className = className;
        }
        return element;
    },

    // Build safe alert/notification elements
    createAlert(message, type = 'info', dismissible = true) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}${dismissible ? ' alert-dismissible fade show' : ''}`;
        
        // Safely set message content
        alert.textContent = message;
        
        // Add close button if dismissible
        if (dismissible) {
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'btn-close';
            closeButton.setAttribute('data-bs-dismiss', 'alert');
            alert.appendChild(closeButton);
        }
        
        return alert;
    }
};

// Export functions for use in other modules
window.MindTrack = {
    showAlert,
    showLoading,
    formatDate,
    debounce,
    showModal,
    hideModal,
    apiCall,
    confirmLogout,
    SafeDOM
};
