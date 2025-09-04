// Profile Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeProfileActions();
    loadUserStats();
});

function initializeProfileActions() {
    // Set up modal event listeners
    setupModalEvents();
}

function setupModalEvents() {
    // Journal entries modal events
    const viewJournalBtn = document.querySelector('[onclick="viewJournalEntries()"]');
    if (viewJournalBtn) {
        viewJournalBtn.addEventListener('click', viewJournalEntries);
    }

    // Wellness insights modal events
    const viewInsightsBtn = document.querySelector('[onclick="viewWellnessInsights()"]');
    if (viewInsightsBtn) {
        viewInsightsBtn.addEventListener('click', viewWellnessInsights);
    }

    // DASS insights modal events
    const viewDASSBtn = document.querySelector('[onclick="viewDASSInsights()"]');
    if (viewDASSBtn) {
        viewDASSBtn.addEventListener('click', viewDASSInsights);
    }
}

async function viewJournalEntries() {
    const modal = MindTrack.showModal('journalModal');
    const content = document.getElementById('journalContent');
    
    // Show loading state
    content.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading journal entries...</span>
            </div>
            <p class="mt-2 text-muted">Loading your journal entries...</p>
        </div>
    `;

    try {
        const logs = await MindTrack.apiCall('/api/mood-logs');
        
        if (logs.length === 0) {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-book-open fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No journal entries yet</h5>
                    <p class="text-muted">Start logging your emotions to see them here!</p>
                    <a href="/emotion-log" class="btn btn-clsu-green">Log Your First Entry</a>
                </div>
            `;
            return;
        }

        // Group logs by date
        const groupedLogs = groupLogsByDate(logs);
        
        let html = '<div class="journal-entries">';
        
        for (const [date, entries] of Object.entries(groupedLogs)) {
            html += `
                <div class="journal-date-group mb-4">
                    <h6 class="fw-bold text-clsu-green border-bottom pb-2 mb-3">
                        <i class="fas fa-calendar-day me-2"></i>
                        ${formatJournalDate(date)}
                    </h6>
                    <div class="entries-grid">
            `;
            
            entries.forEach(log => {
                html += createJournalEntryCard(log);
            });
            
            html += '</div></div>';
        }
        
        html += '</div>';
        content.innerHTML = html;

        // Add click handlers for entry cards
        content.querySelectorAll('.journal-entry-card').forEach(card => {
            card.addEventListener('click', function() {
                const logId = this.dataset.logId;
                const log = logs.find(l => l.log_id == logId);
                if (log) {
                    showJournalEntryDetails(log);
                }
            });
        });

    } catch (error) {
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load journal entries. Please try again later.
            </div>
        `;
    }
}

async function viewWellnessInsights() {
    const modal = MindTrack.showModal('insightsModal');
    const content = document.getElementById('insightsContent');
    
    // Show loading state
    content.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-info" role="status">
                <span class="visually-hidden">Loading insights...</span>
            </div>
            <p class="mt-2 text-muted">Analyzing your wellness patterns...</p>
        </div>
    `;

    try {
        const [weeklyData, logs] = await Promise.all([
            MindTrack.apiCall('/api/weekly-insights'),
            MindTrack.apiCall('/api/mood-logs')
        ]);

        if (logs.length === 0) {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-chart-pie fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No data for insights</h5>
                    <p class="text-muted">Log some emotions first to see your wellness patterns!</p>
                    <a href="/emotion-log" class="btn btn-clsu-green">Start Logging</a>
                </div>
            `;
            return;
        }

        content.innerHTML = createWellnessInsightsContent(weeklyData, logs);
        
        // Initialize charts
        setTimeout(() => {
            createEmotionChart(logs);
            createSleepChart(logs);
            createTriggersChart(logs);
            createCopingChart(logs);
        }, 100);

    } catch (error) {
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load wellness insights. Please try again later.
            </div>
        `;
    }
}

async function viewDASSInsights() {
    const modal = MindTrack.showModal('dassModal');
    const content = document.getElementById('dassContent');
    
    // Show loading state
    content.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading assessment results...</span>
            </div>
            <p class="mt-2 text-muted">Loading your DASS-21 results...</p>
        </div>
    `;

    try {
        const response = await MindTrack.apiCall('/api/dass-insights');
        
        if (!response.success) {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-brain fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No DASS-21 results found</h5>
                    <p class="text-muted">Take the DASS-21 assessment to see your results here!</p>
                    <a href="/dass21-quiz" class="btn btn-clsu-green">Take Assessment</a>
                </div>
            `;
            return;
        }

        content.innerHTML = createDASSInsightsContent(response.data);

    } catch (error) {
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load DASS-21 results. Please try again later.
            </div>
        `;
    }
}

// Helper Functions
function groupLogsByDate(logs) {
    const groups = {};
    
    logs.forEach(log => {
        const date = new Date(log.log_date).toDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
    });
    
    return groups;
}

function formatJournalDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

function createJournalEntryCard(log) {
    const emotionIcon = getEmotionIcon(log.emotion);
    const timeString = new Date(log.log_date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div class="journal-entry-card card mb-3 cursor-pointer" data-log-id="${log.log_id}">
            <div class="card-body p-3">
                <div class="d-flex align-items-center mb-2">
                    <div class="emotion-badge me-3">
                        ${emotionIcon}
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold">${log.emotion}</h6>
                        <small class="text-muted">${timeString}</small>
                    </div>
                </div>
                <div class="entry-meta">
                    <small class="text-muted">
                        <i class="fas fa-bed me-1"></i>${log.sleep}h sleep
                        <i class="fas fa-battery-three-quarters ms-2 me-1"></i>${log.energy}/10 energy
                    </small>
                </div>
            </div>
        </div>
    `;
}

function showJournalEntryDetails(log) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-clsu-green text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-book me-2"></i>
                        Journal Entry Details
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    ${createJournalEntryDetailsContent(log)}
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

function createJournalEntryDetailsContent(log) {
    const emotionIcon = getEmotionIcon(log.emotion);
    
    return `
        <div class="journal-entry-details">
            <div class="entry-header text-center mb-4">
                <div class="emotion-display mb-3">
                    <div class="emotion-icon-large">${emotionIcon}</div>
                    <h3 class="fw-bold text-clsu-green">${log.emotion}</h3>
                </div>
                <p class="text-muted">
                    ${MindTrack.formatDate(log.log_date)}
                </p>
            </div>
            
            <div class="row g-4">
                <div class="col-md-6">
                    <div class="detail-card">
                        <h6 class="fw-bold text-clsu-green">
                            <i class="fas fa-bed me-2"></i>Sleep
                        </h6>
                        <p class="h5 mb-0">${log.sleep} hours</p>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="detail-card">
                        <h6 class="fw-bold text-clsu-green">
                            <i class="fas fa-battery-three-quarters me-2"></i>Energy Level
                        </h6>
                        <p class="h5 mb-0">${log.energy}/10</p>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="detail-card">
                        <h6 class="fw-bold text-clsu-green">
                            <i class="fas fa-exclamation-triangle me-2"></i>Main Trigger
                        </h6>
                        <p class="h5 mb-0">${log.triggers}</p>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="detail-card">
                        <h6 class="fw-bold text-clsu-green">
                            <i class="fas fa-heart me-2"></i>Coping Strategy
                        </h6>
                        <p class="h5 mb-0">${log.coping || 'Not specified'}</p>
                    </div>
                </div>
                
                ${log.gratitude ? `
                <div class="col-12">
                    <div class="detail-card">
                        <h6 class="fw-bold text-clsu-green">
                            <i class="fas fa-sun me-2"></i>Gratitude Note
                        </h6>
                        <p class="fst-italic">"${log.gratitude}"</p>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function createWellnessInsightsContent(weeklyData, logs) {
    return `
        <div class="wellness-insights">
            <div class="insights-intro mb-4">
                <p class="lead">
                    Here's a comprehensive analysis of your emotional well-being patterns. 
                    Use these insights to better understand your mental health journey.
                </p>
            </div>
            
            <div class="insights-summary row g-4 mb-5">
                <div class="col-md-3">
                    <div class="insight-card text-center">
                        <i class="fas fa-smile fa-2x text-primary mb-2"></i>
                        <h6 class="fw-bold">Most Common Emotion</h6>
                        <p class="h5 text-clsu-green">${weeklyData.emotion}</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="insight-card text-center">
                        <i class="fas fa-bed fa-2x text-info mb-2"></i>
                        <h6 class="fw-bold">Average Sleep</h6>
                        <p class="h5 text-clsu-green">${weeklyData.average_sleep} hours</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="insight-card text-center">
                        <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                        <h6 class="fw-bold">Main Trigger</h6>
                        <p class="h5 text-clsu-green">${weeklyData.trigger}</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="insight-card text-center">
                        <i class="fas fa-heart fa-2x text-success mb-2"></i>
                        <h6 class="fw-bold">Top Coping Strategy</h6>
                        <p class="h5 text-clsu-green">${weeklyData.coping}</p>
                    </div>
                </div>
            </div>
            
            <div class="charts-section">
                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="chart-card">
                            <h6 class="fw-bold mb-3">Emotion Distribution</h6>
                            <canvas id="emotionChart" width="400" height="300"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="chart-card">
                            <h6 class="fw-bold mb-3">Sleep Patterns</h6>
                            <canvas id="sleepChart" width="400" height="300"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="chart-card">
                            <h6 class="fw-bold mb-3">Common Triggers</h6>
                            <canvas id="triggersChart" width="400" height="300"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="chart-card">
                            <h6 class="fw-bold mb-3">Coping Strategies</h6>
                            <canvas id="copingChart" width="400" height="300"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="insights-advice mt-5">
                <div class="advice-card">
                    <h6 class="fw-bold text-clsu-green mb-3">
                        <i class="fas fa-lightbulb me-2"></i>
                        Personalized Recommendations
                    </h6>
                    <div class="advice-content">
                        <p><strong>Sleep:</strong> ${weeklyData.sleep_advice}</p>
                        <p><strong>Latest Gratitude:</strong> "${weeklyData.gratitude}"</p>
                        <p class="mb-0">
                            <small class="text-muted">
                                Remember, this tool is here to help you gain self-awareness. 
                                If you feel overwhelmed or need further support, the guidance office is here for you! 💚
                            </small>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createDASSInsightsContent(data) {
    return `
        <div class="dass-insights">
            <div class="dass-intro mb-4">
                <p class="lead">
                    This assessment provides a snapshot of your current emotional state. 
                    Please note that these results are for informational purposes and are not a substitute for professional diagnosis.
                </p>
            </div>
            
            <div class="dass-results row g-4 mb-4">
                <div class="col-md-4">
                    <div class="dass-result-card text-center">
                        <i class="fas fa-cloud-rain fa-3x text-primary mb-3"></i>
                        <h6 class="fw-bold">Depression</h6>
                        <div class="result-score mb-2">
                            <span class="h3 fw-bold">${data.depression_score}</span>
                        </div>
                        <span class="badge severity-${data.depression_severity.replace(' ', '')} fs-6">
                            ${data.depression_severity}
                        </span>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="dass-result-card text-center">
                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h6 class="fw-bold">Anxiety</h6>
                        <div class="result-score mb-2">
                            <span class="h3 fw-bold">${data.anxiety_score}</span>
                        </div>
                        <span class="badge severity-${data.anxiety_severity.replace(' ', '')} fs-6">
                            ${data.anxiety_severity}
                        </span>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="dass-result-card text-center">
                        <i class="fas fa-head-side-cough fa-3x text-danger mb-3"></i>
                        <h6 class="fw-bold">Stress</h6>
                        <div class="result-score mb-2">
                            <span class="h3 fw-bold">${data.stress_score}</span>
                        </div>
                        <span class="badge severity-${data.stress_severity.replace(' ', '')} fs-6">
                            ${data.stress_severity}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="dass-recommendations">
                <h6 class="fw-bold text-clsu-green mb-3">
                    <i class="fas fa-heart me-2"></i>
                    Personalized Recommendations & Next Steps
                </h6>
                <ul class="recommendations-list">
                    <li>Continue monitoring your mental health through regular mood logging</li>
                    <li>Practice self-care activities such as exercise, meditation, and adequate sleep</li>
                    <li>Connect with trusted friends, family, or support groups</li>
                    <li>Consider speaking with a guidance counselor if you need additional support</li>
                </ul>
                
                <div class="final-note mt-4 p-3 bg-light rounded">
                    <p class="mb-2">
                        <strong>Your well-being journey is a continuous process.</strong> 
                        We are committed to supporting you at every stage.
                    </p>
                    <p class="mb-0">
                        <strong class="text-clsu-green">
                            For further support or if you feel overwhelmed, please reach out to the Guidance Office. 
                            Your well-being is our priority. 💚
                        </strong>
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Chart Functions
function createEmotionChart(logs) {
    const ctx = document.getElementById('emotionChart');
    if (!ctx) return;

    const emotions = logs.map(log => log.emotion);
    const emotionCounts = {};
    
    emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(emotionCounts),
            datasets: [{
                data: Object.values(emotionCounts),
                backgroundColor: generateColors(Object.keys(emotionCounts).length),
                borderWidth: 2,
                borderColor: '#fff'
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

function createSleepChart(logs) {
    const ctx = document.getElementById('sleepChart');
    if (!ctx) return;

    const last14Days = logs.slice(0, 14).reverse();
    const dates = last14Days.map(log => new Date(log.log_date).toLocaleDateString());
    const sleepHours = last14Days.map(log => log.sleep);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Sleep Hours',
                data: sleepHours,
                borderColor: '#17a2b8',
                backgroundColor: 'rgba(23, 162, 184, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 12
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createTriggersChart(logs) {
    const ctx = document.getElementById('triggersChart');
    if (!ctx) return;

    const triggers = logs.map(log => log.triggers);
    const triggerCounts = {};
    
    triggers.forEach(trigger => {
        triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(triggerCounts),
            datasets: [{
                data: Object.values(triggerCounts),
                backgroundColor: '#ffc107',
                borderColor: '#ffb300',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createCopingChart(logs) {
    const ctx = document.getElementById('copingChart');
    if (!ctx) return;

    const copingStrategies = logs.map(log => log.coping).filter(c => c);
    const copingCounts = {};
    
    copingStrategies.forEach(coping => {
        copingCounts[coping] = (copingCounts[coping] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: Object.keys(copingCounts),
            datasets: [{
                data: Object.values(copingCounts),
                backgroundColor: generateColors(Object.keys(copingCounts).length, 0.6),
                borderColor: generateColors(Object.keys(copingCounts).length),
                borderWidth: 2
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

// Utility Functions
function getEmotionIcon(emotion) {
    const icons = {
        'Happy': '<i class="fas fa-smile text-success"></i>',
        'Sad': '<i class="fas fa-frown text-primary"></i>',
        'Angry': '<i class="fas fa-angry text-danger"></i>',
        'Anxious': '<i class="fas fa-exclamation-triangle text-warning"></i>',
        'Excited': '<i class="fas fa-star text-warning"></i>',
        'Tired': '<i class="fas fa-bed text-secondary"></i>',
        'Stressed': '<i class="fas fa-head-side-cough text-danger"></i>',
        'Peaceful': '<i class="fas fa-leaf text-success"></i>',
        'Grateful': '<i class="fas fa-heart text-danger"></i>',
        'Confused': '<i class="fas fa-question-circle text-info"></i>',
        'Proud': '<i class="fas fa-trophy text-warning"></i>',
        'Lonely': '<i class="fas fa-user-times text-secondary"></i>',
        'Joyful': '<i class="fas fa-laugh-beam text-success"></i>',
        'Overwhelmed': '<i class="fas fa-dizzy text-danger"></i>',
        'Content': '<i class="fas fa-check-circle text-success"></i>',
        'Frustrated': '<i class="fas fa-fist-raised text-danger"></i>',
        'Hopeful': '<i class="fas fa-sun text-warning"></i>',
        'Worried': '<i class="fas fa-cloud-rain text-primary"></i>',
        'Loved': '<i class="fas fa-heart-circle text-danger"></i>',
        'Disappointed': '<i class="fas fa-thumbs-down text-secondary"></i>'
    };
    
    return icons[emotion] || '<i class="fas fa-heart text-info"></i>';
}

function generateColors(count, alpha = 1) {
    const colors = [
        `rgba(255, 99, 132, ${alpha})`,
        `rgba(54, 162, 235, ${alpha})`,
        `rgba(255, 205, 86, ${alpha})`,
        `rgba(75, 192, 192, ${alpha})`,
        `rgba(153, 102, 255, ${alpha})`,
        `rgba(255, 159, 64, ${alpha})`,
        `rgba(199, 199, 199, ${alpha})`,
        `rgba(83, 102, 255, ${alpha})`,
        `rgba(255, 99, 255, ${alpha})`,
        `rgba(99, 255, 132, ${alpha})`
    ];
    
    return colors.slice(0, count);
}

async function loadUserStats() {
    // This could load additional user statistics
    // For now, we'll just ensure the page is ready
    console.log('Profile page loaded successfully');
}

// CSS for profile-specific styles
const profileStyles = `
    <style>
        .detail-card {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid var(--clsu-green);
            height: 100%;
        }
        
        .insight-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            height: 100%;
            transition: transform 0.3s ease;
        }
        
        .insight-card:hover {
            transform: translateY(-3px);
        }
        
        .chart-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            height: 400px;
        }
        
        .dass-result-card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            height: 100%;
        }
        
        .journal-entry-card {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .journal-entry-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .emotion-badge {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--clsu-gold);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
        }
        
        .emotion-icon-large {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .advice-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 2rem;
            border-radius: 12px;
            border-left: 4px solid var(--clsu-green);
        }
        
        .recommendations-list {
            padding-left: 1.5rem;
        }
        
        .recommendations-list li {
            margin-bottom: 0.5rem;
        }
    </style>
`;

// Add profile-specific styles to the document
document.head.insertAdjacentHTML('beforeend', profileStyles);
