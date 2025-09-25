/**
 * Auto-logout functionality for EmotionTrack
 * Automatically logs out users after 5 minutes of inactivity
 */

class AutoLogout {
    constructor() {
        this.timeout = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.warningTimeout = 4 * 60 * 1000; // Show warning at 4 minutes
        this.logoutTimer = null;
        this.warningTimer = null;
        this.isWarningShown = false;
        this.logoutUrl = '/logout';
        
        // Events that reset the timer
        this.resetEvents = [
            'mousedown', 'mousemove', 'keypress', 'scroll', 
            'touchstart', 'click', 'focus', 'blur'
        ];
        
        this.init();
    }
    
    init() {
        // Only initialize if user is authenticated
        if (this.isUserAuthenticated()) {
            this.setupEventListeners();
            this.resetTimer();
            console.log('Auto-logout initialized: 5 minutes inactivity timeout');
        }
    }
    
    isUserAuthenticated() {
        // Check if user is authenticated by looking for elements that only exist when logged in
        return document.querySelector('#sidebar') || 
               document.querySelector('#adminSidebar') || 
               document.body.classList.contains('authenticated');
    }
    
    setupEventListeners() {
        // Add event listeners for user activity
        this.resetEvents.forEach(event => {
            document.addEventListener(event, () => this.resetTimer(), true);
        });
        
        // Add visibility change listener to handle tab switching
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.resetTimer();
            }
        });
        
        // Listen for beforeunload to clear timers
        window.addEventListener('beforeunload', () => this.clearTimers());
    }
    
    resetTimer() {
        // Clear existing timers
        this.clearTimers();
        this.isWarningShown = false;
        
        // Set warning timer (4 minutes)
        this.warningTimer = setTimeout(() => this.showWarning(), this.warningTimeout);
        
        // Set logout timer (5 minutes)
        this.logoutTimer = setTimeout(() => this.performLogout(), this.timeout);
    }
    
    showWarning() {
        if (this.isWarningShown) return;
        
        this.isWarningShown = true;
        const remainingTime = (this.timeout - this.warningTimeout) / 1000; // 60 seconds
        
        // Create and show warning modal/alert
        this.createWarningModal(remainingTime);
    }
    
    createWarningModal(remainingTime) {
        // Remove existing warning modal if present
        const existingModal = document.getElementById('autoLogoutWarning');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create warning modal
        const modalHtml = `
            <div class="modal fade" id="autoLogoutWarning" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-warning">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                Session Timeout Warning
                            </h5>
                        </div>
                        <div class="modal-body text-center">
                            <p class="mb-3">You will be automatically logged out due to inactivity in:</p>
                            <h3 class="text-danger mb-3">
                                <span id="warningCountdown">${remainingTime}</span> seconds
                            </h3>
                            <p class="text-muted">Click "Stay Logged In" to continue your session.</p>
                        </div>
                        <div class="modal-footer justify-content-center">
                            <button type="button" class="btn btn-success" id="stayLoggedInBtn">
                                <i class="fas fa-clock me-2"></i>Stay Logged In
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Initialize Bootstrap modal
        const modal = new bootstrap.Modal(document.getElementById('autoLogoutWarning'));
        modal.show();
        
        // Setup countdown
        this.startCountdown(remainingTime);
        
        // Setup stay logged in button
        document.getElementById('stayLoggedInBtn').addEventListener('click', () => {
            modal.hide();
            this.resetTimer();
            document.getElementById('autoLogoutWarning').remove();
        });
    }
    
    startCountdown(seconds) {
        const countdownElement = document.getElementById('warningCountdown');
        let remaining = seconds;
        
        const countdown = setInterval(() => {
            remaining--;
            if (countdownElement) {
                countdownElement.textContent = remaining;
            }
            
            if (remaining <= 0) {
                clearInterval(countdown);
            }
        }, 1000);
    }
    
    performLogout() {
        // Clear any existing warning
        const warningModal = document.getElementById('autoLogoutWarning');
        if (warningModal) {
            warningModal.remove();
        }
        
        // Show logout message
        alert('You have been automatically logged out due to inactivity. Please log in again to continue.');
        
        // Redirect to logout URL
        window.location.href = this.logoutUrl;
    }
    
    clearTimers() {
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
            this.logoutTimer = null;
        }
        
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }
    
    // Public method to manually reset timer (can be called from other scripts)
    resetInactivityTimer() {
        this.resetTimer();
    }
    
    // Public method to destroy the auto-logout instance
    destroy() {
        this.clearTimers();
        
        // Remove event listeners
        this.resetEvents.forEach(event => {
            document.removeEventListener(event, () => this.resetTimer(), true);
        });
        
        document.removeEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.resetTimer();
            }
        });
        
        window.removeEventListener('beforeunload', () => this.clearTimers());
        
        // Remove warning modal if present
        const warningModal = document.getElementById('autoLogoutWarning');
        if (warningModal) {
            warningModal.remove();
        }
    }
}

// Initialize auto-logout when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if user is authenticated
    if (document.querySelector('#sidebar') || document.querySelector('#adminSidebar')) {
        window.autoLogout = new AutoLogout();
    }
});

// Export for potential manual control
window.AutoLogout = AutoLogout;