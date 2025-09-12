// Main JavaScript for MindTrack Application
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    initializeFlashMessages();
    initializeTooltips();
    initializeScrollEffects();
    initializeFormValidation();
    initializeNotifications();
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
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

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

// Notification System
function initializeNotifications() {
    updateNotificationBadges();
    loadUserNotifications();
    
    // Poll for notifications every 30 seconds
    setInterval(updateNotificationBadges, 30000);
    
    // Poll for new notifications every 10 seconds when page is visible
    setInterval(function() {
        if (document.visibilityState === 'visible') {
            checkForNewNotifications();
        }
    }, 10000);
}

async function updateNotificationBadges() {
    try {
        const response = await fetch('/api/notifications/count');
        const data = await response.json();
        
        if (data.success) {
            const count = data.count;
            
            // Update student consultation badge
            const consultationBadge = document.getElementById('consultationNotificationBadge');
            if (consultationBadge) {
                if (count > 0) {
                    consultationBadge.textContent = count > 9 ? '9+' : count;
                    consultationBadge.style.display = 'flex';
                    consultationBadge.classList.remove('zero');
                } else {
                    consultationBadge.style.display = 'none';
                    consultationBadge.classList.add('zero');
                }
            }
            
            // Update admin messages badge  
            const adminBadge = document.getElementById('adminMessagesNotificationBadge');
            if (adminBadge) {
                if (count > 0) {
                    adminBadge.textContent = count > 9 ? '9+' : count;
                    adminBadge.style.display = 'flex';
                    adminBadge.classList.remove('zero');
                } else {
                    adminBadge.style.display = 'none';
                    adminBadge.classList.add('zero');
                }
            }
        }
    } catch (error) {
        console.error('Error updating notification badges:', error);
    }
}

async function loadUserNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    
    try {
        const response = await fetch('/api/notifications?per_page=5');
        const data = await response.json();
        
        if (data.success && data.notifications.length > 0) {
            document.getElementById('notificationsSection').style.display = 'block';
            
            notificationsList.innerHTML = data.notifications.map(notification => `
                <div class="notification-item ${notification.is_read ? '' : 'unread'} ${notification.priority}-priority p-3 mb-2 border rounded" 
                     onclick="markNotificationRead(${notification.id}, ${notification.related_message_id})">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1 fw-bold">${notification.title}</h6>
                            <p class="mb-1 text-muted small">${notification.message}</p>
                            <div class="notification-timestamp">${notification.created_at}</div>
                        </div>
                        ${!notification.is_read ? `<button class="btn btn-outline-primary btn-sm notification-read-btn" onclick="event.stopPropagation(); markNotificationRead(${notification.id})"><i class="fas fa-check"></i></button>` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function checkForNewNotifications() {
    try {
        const response = await fetch('/api/notifications/recent');
        const data = await response.json();
        
        if (data.success && data.notifications.length > 0) {
            // Show new notification alert
            const newCount = data.notifications.filter(n => !n.is_read).length;
            if (newCount > 0) {
                showNotificationAlert(`You have ${newCount} new notification${newCount > 1 ? 's' : ''}!`);
                updateNotificationBadges();
                loadUserNotifications();
            }
        }
    } catch (error) {
        console.error('Error checking for new notifications:', error);
    }
}

async function markNotificationRead(notificationId, messageId = null) {
    try {
        const formData = new FormData();
        formData.append('csrf_token', document.querySelector('[name=csrf_token]').value);
        
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            updateNotificationBadges();
            loadUserNotifications();
            
            // If there's a related message, optionally navigate to it
            if (messageId) {
                window.location.href = '/consultation';
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        const formData = new FormData();
        formData.append('csrf_token', document.querySelector('[name=csrf_token]').value);
        
        const response = await fetch('/api/notifications/mark-all-read', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showAlert('All notifications marked as read!', 'success');
            updateNotificationBadges();
            loadUserNotifications();
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

function showNotificationAlert(message) {
    showAlert(message, 'info');
}

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
    updateNotificationBadges,
    markNotificationRead,
    markAllNotificationsRead
};
