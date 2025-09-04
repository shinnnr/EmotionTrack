// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminDashboard();
    initializeMessageManagement();
    initializeDataExport();
    initializeAnalytics();
    initializeRealTimeUpdates();
});

function initializeAdminDashboard() {
    setupStatCards();
    initializeQuickActions();
    setupActivityFeed();
    initializeRiskAssessment();
}

function setupStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach((card, index) => {
        // Add animation delay for sequential appearance
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 150);
        
        // Add hover effect for interactive feedback
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
    });
    
    // Add click handlers for stat cards to show detailed views
    const userCard = document.querySelector('.stat-card:nth-child(1)');
    const logsCard = document.querySelector('.stat-card:nth-child(2)');
    const messagesCard = document.querySelector('.stat-card:nth-child(3)');
    const riskCard = document.querySelector('.stat-card:nth-child(4)');
    
    if (userCard) {
        userCard.addEventListener('click', () => showStudentManagement());
    }
    
    if (logsCard) {
        logsCard.addEventListener('click', () => showMoodLogsAnalysis());
    }
    
    if (messagesCard) {
        messagesCard.addEventListener('click', () => window.location.href = '/admin/messages');
    }
    
    if (riskCard) {
        riskCard.addEventListener('click', () => showRiskAssessmentDetails());
    }
}

function initializeQuickActions() {
    const quickActionButtons = document.querySelectorAll('.btn[onclick]');
    
    quickActionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Remove inline onclick and handle with JavaScript
            e.preventDefault();
            
            const action = this.textContent.trim();
            
            if (action.includes('Export')) {
                exportData();
            } else if (action.includes('Report')) {
                generateReport();
            } else if (action.includes('Analytics')) {
                viewAnalytics();
            }
        });
    });
}

function setupActivityFeed() {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;
    
    const activityItems = activityList.querySelectorAll('.activity-item');
    
    activityItems.forEach((item, index) => {
        // Add staggered animation
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.4s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, index * 100);
        
        // Add click handler for detailed view
        item.addEventListener('click', function() {
            const studentName = this.querySelector('h6').textContent;
            const emotion = this.querySelector('strong').textContent;
            showActivityDetails(studentName, emotion, this);
        });
        
        // Add hover effect
        item.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(0, 88, 0, 0.05)';
            this.style.transform = 'translateX(5px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
            this.style.transform = 'translateX(0)';
        });
    });
}

function initializeRiskAssessment() {
    const riskItems = document.querySelectorAll('.risk-item');
    
    riskItems.forEach((item, index) => {
        // Add priority indicator based on severity
        const severeBadges = item.querySelectorAll('.badge');
        let highRisk = false;
        
        severeBadges.forEach(badge => {
            if (badge.textContent.includes('Extremely Severe') || badge.textContent.includes('Severe')) {
                highRisk = true;
            }
        });
        
        if (highRisk) {
            item.style.borderLeftColor = '#dc3545';
            item.style.borderLeftWidth = '6px';
            item.classList.add('high-priority');
            
            // Add blinking effect for extremely severe cases
            if (item.textContent.includes('Extremely Severe')) {
                item.style.animation = 'urgent-blink 2s infinite';
            }
        }
        
        // Add click handler for detailed student view
        item.addEventListener('click', function() {
            const studentName = this.querySelector('h6').textContent;
            showStudentProfile(studentName);
        });
        
        // Staggered animation
        item.style.opacity = '0';
        item.style.transform = 'translateY(15px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.5s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 120);
    });
}

function initializeMessageManagement() {
    // Auto-refresh unread message count
    setInterval(updateUnreadMessageCount, 30000); // Check every 30 seconds
    
    // Add real-time notification for new messages
    setupMessageNotifications();
}

async function updateUnreadMessageCount() {
    try {
        const response = await fetch('/admin/api/unread-messages-count');
        const data = await response.json();
        
        const unreadCountElement = document.querySelector('.stat-card:nth-child(3) h3');
        if (unreadCountElement && data.count !== undefined) {
            const currentCount = parseInt(unreadCountElement.textContent);
            const newCount = data.count;
            
            if (newCount > currentCount) {
                // New message received
                showNewMessageNotification(newCount - currentCount);
                animateCounterUpdate(unreadCountElement, newCount);
            } else if (newCount !== currentCount) {
                animateCounterUpdate(unreadCountElement, newCount);
            }
        }
    } catch (error) {
        console.error('Error updating unread message count:', error);
    }
}

function animateCounterUpdate(element, newValue) {
    element.style.transform = 'scale(1.2)';
    element.style.color = '#dc3545';
    
    setTimeout(() => {
        element.textContent = newValue;
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 200);
}

function setupMessageNotifications() {
    // Create notification container if it doesn't exist
    let notificationContainer = document.querySelector('.admin-notifications');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'admin-notifications position-fixed';
        notificationContainer.style.cssText = `
            top: 80px;
            right: 20px;
            z-index: 1060;
            max-width: 350px;
        `;
        document.body.appendChild(notificationContainer);
    }
}

function showNewMessageNotification(count) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-warning alert-dismissible fade show shadow-sm';
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-envelope fa-lg me-3 text-warning"></i>
            <div>
                <h6 class="alert-heading mb-1">New Message${count > 1 ? 's' : ''} Received</h6>
                <p class="mb-0 small">${count} new student message${count > 1 ? 's' : ''} requiring attention</p>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const notificationContainer = document.querySelector('.admin-notifications');
    notificationContainer.appendChild(notification);
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 150);
        }
    }, 8000);
    
    // Add click handler to go to messages
    notification.addEventListener('click', function() {
        window.location.href = '/admin/messages';
    });
}

function initializeDataExport() {
    // Set up data export functionality
    window.exportData = async function() {
        const exportBtn = document.querySelector('.btn-outline-success');
        const hideLoading = MindTrack.showLoading(exportBtn, 'Exporting...');
        
        try {
            const exportOptions = await showExportOptionsModal();
            if (exportOptions) {
                await performDataExport(exportOptions);
                MindTrack.showAlert('Data exported successfully!', 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            MindTrack.showAlert('Export failed. Please try again.', 'danger');
        } finally {
            hideLoading();
        }
    };
}

function showExportOptionsModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-download me-2"></i>
                            Export Data Options
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="exportForm">
                            <div class="mb-3">
                                <label class="form-label fw-bold">Data Type</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="exportUsers" checked>
                                    <label class="form-check-label" for="exportUsers">Student Information</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="exportLogs" checked>
                                    <label class="form-check-label" for="exportLogs">Mood Logs</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="exportDASS" checked>
                                    <label class="form-check-label" for="exportDASS">DASS-21 Results</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="exportMessages">
                                    <label class="form-check-label" for="exportMessages">Consultation Messages</label>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-bold">Date Range</label>
                                <div class="row">
                                    <div class="col-6">
                                        <input type="date" class="form-control" id="startDate">
                                        <small class="form-text text-muted">Start Date</small>
                                    </div>
                                    <div class="col-6">
                                        <input type="date" class="form-control" id="endDate">
                                        <small class="form-text text-muted">End Date</small>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-bold">Export Format</label>
                                <select class="form-select" id="exportFormat">
                                    <option value="csv">CSV (Comma Separated Values)</option>
                                    <option value="excel">Excel (.xlsx)</option>
                                    <option value="json">JSON</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" id="confirmExport">
                            <i class="fas fa-download me-1"></i>Export Data
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        
        document.getElementById('confirmExport').addEventListener('click', () => {
            const formData = new FormData(document.getElementById('exportForm'));
            const options = {
                users: document.getElementById('exportUsers').checked,
                logs: document.getElementById('exportLogs').checked,
                dass: document.getElementById('exportDASS').checked,
                messages: document.getElementById('exportMessages').checked,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                format: document.getElementById('exportFormat').value
            };
            
            bootstrapModal.hide();
            resolve(options);
        });
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
            resolve(null);
        });
    });
}

async function performDataExport(options) {
    // Simulate export process
    const exportData = {
        ...options,
        timestamp: new Date().toISOString()
    };
    
    // In a real implementation, this would make an API call to the server
    console.log('Exporting data with options:', exportData);
    
    // Simulate file download
    const filename = `mindtrack_export_${new Date().toISOString().split('T')[0]}.${options.format}`;
    
    // Create a mock file for demonstration
    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function initializeAnalytics() {
    window.generateReport = async function() {
        const reportBtn = document.querySelector('.btn-outline-info');
        const hideLoading = MindTrack.showLoading(reportBtn, 'Generating...');
        
        try {
            await showReportGenerationModal();
        } catch (error) {
            console.error('Report generation error:', error);
            MindTrack.showAlert('Report generation failed. Please try again.', 'danger');
        } finally {
            hideLoading();
        }
    };
    
    window.viewAnalytics = async function() {
        const analyticsBtn = document.querySelector('.btn-outline-warning');
        const hideLoading = MindTrack.showLoading(analyticsBtn, 'Loading...');
        
        try {
            await showAnalyticsModal();
        } catch (error) {
            console.error('Analytics error:', error);
            MindTrack.showAlert('Failed to load analytics. Please try again.', 'danger');
        } finally {
            hideLoading();
        }
    };
}

function showReportGenerationModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-chart-bar me-2"></i>
                            Generate Wellness Report
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="report-options">
                            <div class="row g-4">
                                <div class="col-md-6">
                                    <div class="report-type-card" data-type="summary">
                                        <i class="fas fa-chart-pie fa-3x text-primary mb-3"></i>
                                        <h6 class="fw-bold">Summary Report</h6>
                                        <p class="small text-muted">Overall statistics and trends</p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="report-type-card" data-type="detailed">
                                        <i class="fas fa-chart-line fa-3x text-success mb-3"></i>
                                        <h6 class="fw-bold">Detailed Analysis</h6>
                                        <p class="small text-muted">In-depth student wellness analysis</p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="report-type-card" data-type="risk">
                                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                                        <h6 class="fw-bold">Risk Assessment</h6>
                                        <p class="small text-muted">Students requiring attention</p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="report-type-card" data-type="trends">
                                        <i class="fas fa-trending-up fa-3x text-info mb-3"></i>
                                        <h6 class="fw-bold">Trend Analysis</h6>
                                        <p class="small text-muted">Long-term patterns and insights</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Add click handlers for report types
        modal.querySelectorAll('.report-type-card').forEach(card => {
            card.addEventListener('click', function() {
                const reportType = this.dataset.type;
                generateSpecificReport(reportType);
                bootstrapModal.hide();
                resolve();
            });
        });
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
            resolve();
        });
    });
}

function generateSpecificReport(type) {
    MindTrack.showAlert(`Generating ${type} report... This may take a few moments.`, 'info');
    
    // Simulate report generation
    setTimeout(() => {
        MindTrack.showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} report generated successfully!`, 'success');
    }, 2000);
}

function showAnalyticsModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="fas fa-analytics me-2"></i>
                            Wellness Analytics Dashboard
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="analytics-dashboard">
                            <div class="row g-4 mb-4">
                                <div class="col-md-3">
                                    <div class="analytics-metric">
                                        <h6 class="text-muted">Average Mood Score</h6>
                                        <div class="h3 text-success">7.2/10</div>
                                        <small class="text-success">↑ 0.3 from last month</small>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="analytics-metric">
                                        <h6 class="text-muted">Active Students</h6>
                                        <div class="h3 text-primary">89%</div>
                                        <small class="text-primary">↑ 5% from last month</small>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="analytics-metric">
                                        <h6 class="text-muted">Response Rate</h6>
                                        <div class="h3 text-info">92%</div>
                                        <small class="text-info">↑ 2% from last month</small>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="analytics-metric">
                                        <h6 class="text-muted">Risk Cases</h6>
                                        <div class="h3 text-warning">12</div>
                                        <small class="text-danger">↑ 3 from last month</small>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row g-4">
                                <div class="col-md-6">
                                    <div class="analytics-chart">
                                        <h6 class="fw-bold mb-3">Emotion Trends</h6>
                                        <canvas id="emotionTrendsChart" width="400" height="250"></canvas>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="analytics-chart">
                                        <h6 class="fw-bold mb-3">DASS-21 Distribution</h6>
                                        <canvas id="dassDistributionChart" width="400" height="250"></canvas>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="analytics-chart">
                                        <h6 class="fw-bold mb-3">Daily Activity</h6>
                                        <canvas id="activityChart" width="400" height="250"></canvas>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="analytics-chart">
                                        <h6 class="fw-bold mb-3">Sleep Patterns</h6>
                                        <canvas id="sleepPatternsChart" width="400" height="250"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="window.print()">
                            <i class="fas fa-print me-1"></i>Print Analytics
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Initialize charts after modal is shown
        modal.addEventListener('shown.bs.modal', () => {
            initializeAnalyticsCharts();
        });
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
            resolve();
        });
    });
}

function initializeAnalyticsCharts() {
    // Emotion Trends Chart
    const emotionCtx = document.getElementById('emotionTrendsChart');
    if (emotionCtx) {
        new Chart(emotionCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Positive Emotions',
                    data: [65, 68, 70, 72, 75, 78],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Negative Emotions',
                    data: [35, 32, 30, 28, 25, 22],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // DASS Distribution Chart
    const dassCtx = document.getElementById('dassDistributionChart');
    if (dassCtx) {
        new Chart(dassCtx, {
            type: 'doughnut',
            data: {
                labels: ['Normal', 'Mild', 'Moderate', 'Severe', 'Extremely Severe'],
                datasets: [{
                    data: [60, 20, 12, 6, 2],
                    backgroundColor: [
                        '#28a745',
                        '#ffc107',
                        '#fd7e14',
                        '#dc3545',
                        '#6f42c1'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Activity Chart
    const activityCtx = document.getElementById('activityChart');
    if (activityCtx) {
        new Chart(activityCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Daily Logs',
                    data: [45, 52, 48, 61, 55, 38, 42],
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Sleep Patterns Chart
    const sleepCtx = document.getElementById('sleepPatternsChart');
    if (sleepCtx) {
        new Chart(sleepCtx, {
            type: 'radar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Average Sleep Hours',
                    data: [7.2, 6.8, 7.0, 6.5, 7.5, 8.2, 8.0],
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10
                    }
                }
            }
        });
    }
}

function initializeRealTimeUpdates() {
    // Set up real-time updates for the dashboard
    setInterval(refreshDashboardStats, 60000); // Update every minute
    
    // Setup WebSocket connection for real-time updates (if available)
    if ('WebSocket' in window) {
        setupWebSocketConnection();
    }
}

async function refreshDashboardStats() {
    try {
        // Update statistics without full page reload
        const response = await fetch('/admin/api/dashboard-stats');
        const stats = await response.json();
        
        updateStatCard('users', stats.total_users);
        updateStatCard('logs', stats.total_logs);
        updateStatCard('messages', stats.unread_messages);
        updateStatCard('risk', stats.high_risk_students);
        
    } catch (error) {
        console.error('Error refreshing dashboard stats:', error);
    }
}

function updateStatCard(type, newValue) {
    const selectors = {
        users: '.stat-card:nth-child(1) h3',
        logs: '.stat-card:nth-child(2) h3',
        messages: '.stat-card:nth-child(3) h3',
        risk: '.stat-card:nth-child(4) h3'
    };
    
    const element = document.querySelector(selectors[type]);
    if (element && element.textContent !== newValue.toString()) {
        animateCounterUpdate(element, newValue);
    }
}

function setupWebSocketConnection() {
    // WebSocket setup for real-time notifications
    // This would connect to a WebSocket server for live updates
    console.log('WebSocket connection would be established here for real-time updates');
}

// Utility functions for admin dashboard
function showStudentManagement() {
    MindTrack.showAlert('Student management interface would open here', 'info');
}

function showMoodLogsAnalysis() {
    MindTrack.showAlert('Detailed mood logs analysis would open here', 'info');
}

function showRiskAssessmentDetails() {
    MindTrack.showAlert('Risk assessment details would open here', 'info');
}

function showActivityDetails(studentName, emotion, element) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">Activity Details</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <h6 class="fw-bold">${studentName}</h6>
                    <p><strong>Emotion:</strong> ${emotion}</p>
                    <p><strong>Timestamp:</strong> ${element.querySelector('small').textContent}</p>
                    <p class="text-muted">Additional student details and wellness context would be displayed here.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary">View Full Profile</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

function showStudentProfile(studentName) {
    MindTrack.showAlert(`Student profile for ${studentName} would open here`, 'info');
}

// Add CSS for admin-specific styling
const adminStyles = `
    <style>
        @keyframes urgent-blink {
            0%, 50% { opacity: 1; }
            25%, 75% { opacity: 0.7; }
        }
        
        .high-priority {
            position: relative;
        }
        
        .high-priority::before {
            content: "🔴";
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 0.8rem;
        }
        
        .analytics-metric {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            text-align: center;
            height: 100%;
        }
        
        .analytics-chart {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            height: 350px;
        }
        
        .report-type-card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            border: 2px solid #e9ecef;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        
        .report-type-card:hover {
            border-color: var(--clsu-green);
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .admin-notifications .alert {
            margin-bottom: 10px;
            cursor: pointer;
        }
        
        .admin-notifications .alert:hover {
            transform: translateX(-5px);
        }
        
        @media (max-width: 768px) {
            .analytics-chart {
                height: 300px;
                padding: 1rem;
            }
            
            .analytics-metric {
                padding: 1rem;
            }
            
            .report-type-card {
                height: 160px;
                padding: 1.5rem;
            }
        }
    </style>
`;

// Add admin-specific styles to the document
document.head.insertAdjacentHTML('beforeend', adminStyles);
