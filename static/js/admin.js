// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminDashboard();
    initializeMessageManagement();
    initializeDataExport();
    initializeAnalytics();
    initializeRealTimeUpdates();
});

// Student Profile Viewing Function
async function viewStudentProfile(userId) {
    try {
        const overlay = document.getElementById('studentProfileOverlay');
        const content = document.getElementById('studentProfileContent');
        
        // Show loading
        content.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading profile...</p>
            </div>
        `;
        
        // Show modal
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Fetch student profile data
        const response = await fetch(`/admin/api/student-profile/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        
        const data = await response.json();
        
        if (data.success) {
            content.innerHTML = generateProfileHTML(data.data);
        } else {
            throw new Error(data.error || 'Failed to load profile');
        }
        
    } catch (error) {
        console.error('Error loading student profile:', error);
        document.getElementById('studentProfileContent').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Profile</h5>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

// Student Navigation Modal Functions
let currentNavigationState = {
    strand: null,
    grade: null,
    section: null
};

async function openStudentNavigationModal() {
    try {
        const overlay = document.getElementById('studentNavigationOverlay');
        const content = document.getElementById('studentNavigationContent');
        
        // Reset state
        currentNavigationState = { strand: null, grade: null, section: null };
        
        // Show modal
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Check if user is main admin or faculty admin
        if (window.adminConfig && !window.adminConfig.isMainAdmin) {
            // Faculty admin - automatically show their section's students
            await loadFacultyAdminStudents();
        } else {
            // Main admin - show hierarchical browsing starting with strands
            await loadNavigationLevel('strands');
        }
        
    } catch (error) {
        console.error('Error opening student navigation modal:', error);
    }
}

function closeStudentNavigationModal() {
    const overlay = document.getElementById('studentNavigationOverlay');
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset state
    currentNavigationState = { strand: null, grade: null, section: null };
}

async function loadFacultyAdminStudents() {
    try {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const navigationGrid = document.getElementById('navigationGrid');
        const studentList = document.getElementById('studentList');
        const breadcrumb = document.getElementById('navigationBreadcrumb');
        const title = document.getElementById('navigationTitle');
        
        // Show loading
        loadingIndicator.style.display = 'block';
        navigationGrid.style.display = 'none';
        studentList.style.display = 'none';
        
        // For faculty admin, directly load all their accessible students
        const response = await fetch('/admin/api/students-by-hierarchy');
        if (!response.ok) throw new Error('Failed to fetch students');
        
        const data = await response.json();
        
        // Hide loading
        loadingIndicator.style.display = 'none';
        
        // Update title and breadcrumb for faculty admin view
        title.textContent = 'My Advisory Section Students';
        breadcrumb.innerHTML = '<li class="breadcrumb-item active">My Advisory Section</li>';
        
        if (data.type === 'students') {
            // Faculty admin has students assigned - show them directly
            displayStudentList(data.data);
        } else {
            // Faculty admin has no students or multiple sections - show hierarchy
            displayNavigationGrid(data.data, data.type);
        }
        
    } catch (error) {
        console.error('Error loading faculty admin students:', error);
        document.getElementById('loadingIndicator').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Students</h5>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

async function loadNavigationLevel(level, selectedValue = null) {
    try {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const navigationGrid = document.getElementById('navigationGrid');
        const studentList = document.getElementById('studentList');
        const breadcrumb = document.getElementById('navigationBreadcrumb');
        const title = document.getElementById('navigationTitle');
        
        // Show loading
        loadingIndicator.style.display = 'block';
        navigationGrid.style.display = 'none';
        studentList.style.display = 'none';
        
        // Update state based on level
        if (level === 'strands') {
            // Reset to root level
            currentNavigationState = { strand: null, grade: null, section: null };
        } else if (level === 'grades') {
            // Reset grade and section when selecting strand
            currentNavigationState.strand = selectedValue;
            currentNavigationState.grade = null;
            currentNavigationState.section = null;
        } else if (level === 'sections') {
            // Reset section when selecting grade
            currentNavigationState.grade = selectedValue;
            currentNavigationState.section = null;
        } else if (level === 'students') {
            currentNavigationState.section = selectedValue;
        }
        
        // Build API URL
        let apiUrl = '/admin/api/students-by-hierarchy?';
        if (currentNavigationState.strand) apiUrl += `strand=${encodeURIComponent(currentNavigationState.strand)}&`;
        if (currentNavigationState.grade) apiUrl += `grade=${encodeURIComponent(currentNavigationState.grade)}&`;
        if (currentNavigationState.section) apiUrl += `section=${encodeURIComponent(currentNavigationState.section)}&`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const data = await response.json();
        
        // Update breadcrumb and title
        updateBreadcrumb();
        updateTitle();
        
        // Hide loading
        loadingIndicator.style.display = 'none';
        
        if (data.type === 'students') {
            // Show student list
            displayStudentList(data.data);
        } else {
            // Show navigation grid
            displayNavigationGrid(data.data, data.type);
        }
        
    } catch (error) {
        console.error('Error loading navigation level:', error);
        document.getElementById('loadingIndicator').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Data</h5>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

function displayNavigationGrid(items, type) {
    const grid = document.getElementById('navigationGrid');
    const iconMap = {
        'strands': 'fas fa-graduation-cap',
        'grades': 'fas fa-layer-group',
        'sections': 'fas fa-users'
    };
    
    grid.innerHTML = '';
    grid.style.display = 'flex';
    
    items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6';
        
        col.innerHTML = `
            <div class="navigation-card" onclick="handleNavigationClick('${escapeHtml(type)}', '${escapeHtml(item)}')">
                <i class="${iconMap[type]}"></i>
                <h6>${escapeHtml(item)}</h6>
                <small>Click to continue</small>
            </div>
        `;
        
        grid.appendChild(col);
    });
}

function displayStudentList(students) {
    const studentList = document.getElementById('studentList');
    const tableBody = document.getElementById('studentTableBody');

    // Store original students data for search functionality
    studentList._originalStudents = students;

    tableBody.innerHTML = '';

    students.forEach(student => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.onclick = () => viewStudentProfile(parseInt(student.id));
        row.setAttribute('data-student-name', escapeHtml(student.full_name).toLowerCase());
        row.setAttribute('data-student-email', escapeHtml(student.email).toLowerCase());
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-sm me-3">
                        <div class="avatar-title rounded-circle bg-primary text-white">
                            ${escapeHtml(student.full_name).split(' ').map(n => n[0]).join('')}
                        </div>
                    </div>
                    <div>
                        <h6 class="mb-0">${escapeHtml(student.full_name)}</h6>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(student.email)}</td>
            <td>${escapeHtml(student.created_at)}</td>
            <td class="d-none d-lg-table-cell">
                <button class="btn btn-sm btn-success me-2" onclick="event.stopPropagation(); goToStudentChat(${parseInt(student.id)})">
                    <i class="fas fa-comments"></i> Chat
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); viewStudentProfile(${parseInt(student.id)})">
                    <i class="fas fa-user"></i> Profile
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    studentList.style.display = 'block';

    // Initialize search functionality
    initializeStudentSearch();
}

function initializeStudentSearch() {
    const searchInput = document.getElementById('studentSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const studentList = document.getElementById('studentList');

    if (!searchInput || !studentList) return;

    // Search input event listener
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const tableBody = document.getElementById('studentTableBody');
        const rows = tableBody.querySelectorAll('tr');

        if (!searchTerm) {
            // Show all rows if search is empty
            rows.forEach(row => {
                row.style.display = '';
            });
            return;
        }

        // Filter rows based on search term
        rows.forEach(row => {
            const studentName = row.getAttribute('data-student-name') || '';
            const studentEmail = row.getAttribute('data-student-email') || '';

            if (studentName.includes(searchTerm) || studentEmail.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Clear search button
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
    }
}

function initializeFacultyStudentSearch() {
    const searchInput = document.getElementById('facultyStudentSearchInput');
    const clearBtn = document.getElementById('facultyClearSearchBtn');

    if (!searchInput) return;

    // Search input event listener
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const tableBody = document.querySelector('.table tbody');
        const rows = tableBody.querySelectorAll('tr');

        if (!searchTerm) {
            // Show all rows if search is empty
            rows.forEach(row => {
                row.style.display = '';
            });
            return;
        }

        // Filter rows based on search term
        rows.forEach(row => {
            const studentName = row.getAttribute('data-student-name') || '';
            const studentEmail = row.getAttribute('data-student-email') || '';

            if (studentName.includes(searchTerm) || studentEmail.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Clear search button
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
    }
}

function initializeMyStudentSearch() {
    const searchInput = document.getElementById('myStudentSearchInput');
    const clearBtn = document.getElementById('myStudentClearSearchBtn');

    if (!searchInput) return;

    // Search input event listener
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const tableBody = document.querySelector('.table tbody');
        const rows = tableBody.querySelectorAll('tr');

        if (!searchTerm) {
            // Show all rows if search is empty
            rows.forEach(row => {
                row.style.display = '';
            });
            return;
        }

        // Filter rows based on search term
        rows.forEach(row => {
            const studentName = row.getAttribute('data-student-name') || '';
            const studentEmail = row.getAttribute('data-student-email') || '';

            if (studentName.includes(searchTerm) || studentEmail.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Clear search button
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
    }
}

function handleNavigationClick(type, value) {
    if (type === 'strands') {
        loadNavigationLevel('grades', value);
    } else if (type === 'grades') {
        loadNavigationLevel('sections', value);
    } else if (type === 'sections') {
        loadNavigationLevel('students', value);
    }
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('navigationBreadcrumb');
    let html = '<li class="breadcrumb-item"><a href="#" onclick="loadNavigationLevel(\'strands\')">Students</a></li>';
    
    if (currentNavigationState.strand) {
        html += `<li class="breadcrumb-item"><a href="#" onclick="loadNavigationLevel('grades', '${currentNavigationState.strand}')">${currentNavigationState.strand}</a></li>`;
    }
    
    if (currentNavigationState.grade) {
        html += `<li class="breadcrumb-item"><a href="#" onclick="loadNavigationLevel('sections', '${currentNavigationState.grade}')">Grade ${currentNavigationState.grade}</a></li>`;
    }
    
    if (currentNavigationState.section) {
        html += `<li class="breadcrumb-item active">${currentNavigationState.section}</li>`;
    }
    
    breadcrumb.innerHTML = html;
}

function updateTitle() {
    const title = document.getElementById('navigationTitle');
    
    if (currentNavigationState.section) {
        title.textContent = `Students in ${currentNavigationState.strand} - Grade ${currentNavigationState.grade} - ${currentNavigationState.section}`;
    } else if (currentNavigationState.grade) {
        title.textContent = `Sections in ${currentNavigationState.strand} - Grade ${currentNavigationState.grade}`;
    } else if (currentNavigationState.strand) {
        title.textContent = `Grade Levels in ${currentNavigationState.strand}`;
    } else {
        title.textContent = 'Browse Students by Strand';
    }
}

function goToStudentChat(studentId) {
    // Close the navigation modal first
    closeStudentNavigationModal();
    // Navigate to the chat page
    window.location.href = `/admin/student-chat/${studentId}`;
}

// Close student profile modal
function closeStudentProfileModal() {
    const overlay = document.getElementById('studentProfileOverlay');
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const overlay = document.getElementById('studentProfileOverlay');
    if (e.target === overlay) {
        closeStudentProfileModal();
    }
    
    const moodLogsOverlay = document.getElementById('moodLogsOverlay');
    if (e.target === moodLogsOverlay) {
        closeMoodLogsModal();
    }
    
    const highRiskOverlay = document.getElementById('highRiskOverlay');
    if (e.target === highRiskOverlay) {
        closeHighRiskModal();
    }
});

// HTML escape function to prevent XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function generateProfileHTML(data) {
    const student = data.student;
    const dass21Results = data.dass21_results;
    const moodLogs = data.mood_logs;
    const messages = data.recent_messages;
    
    return `
        <div class="student-profile">
            <!-- Student Basic Info -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card bg-light border-0">
                        <div class="card-body">
                            <h5 class="card-title fw-bold text-primary">
                                <i class="fas fa-user me-2"></i>${escapeHtml(student.full_name)}
                            </h5>
                            <div class="row">
                                <div class="col-md-6">
                                    <p class="mb-1"><strong>Email:</strong> ${escapeHtml(student.email)}</p>
                                    <p class="mb-1"><strong>Gender:</strong> ${escapeHtml(student.gender) || 'Not specified'}</p>
                                    <p class="mb-1"><strong>Strand:</strong> ${escapeHtml(student.strand) || 'Not specified'}</p>
                                </div>
                                <div class="col-md-6">
                                    <p class="mb-1"><strong>Grade Level:</strong> ${escapeHtml(student.grade_level) || 'Not specified'}</p>
                                    <p class="mb-1"><strong>Section:</strong> ${escapeHtml(student.section) || 'Not specified'}</p>
                                    <p class="mb-1"><strong>Joined:</strong> ${escapeHtml(student.created_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tabs for different sections -->
            <ul class="nav nav-tabs" id="profileTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="dass-tab" data-bs-toggle="tab" data-bs-target="#dass-content" type="button" role="tab">
                        <i class="fas fa-brain me-2"></i>DASS-21 Results (${dass21Results.length})
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="mood-tab" data-bs-toggle="tab" data-bs-target="#mood-content" type="button" role="tab">
                        <i class="fas fa-heart me-2"></i>Mood Logs (${moodLogs.length})
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="messages-tab" data-bs-toggle="tab" data-bs-target="#messages-content" type="button" role="tab">
                        <i class="fas fa-comments me-2"></i>Messages (${messages.length})
                    </button>
                </li>
            </ul>
            
            <!-- Tab content -->
            <div class="tab-content" id="profileTabContent">
                <!-- DASS-21 Results -->
                <div class="tab-pane fade show active" id="dass-content" role="tabpanel">
                    <div class="mt-3">
                        ${dass21Results.length ? dass21Results.map(result => `
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h6 class="fw-bold">${escapeHtml(result.created_at)}</h6>
                                            <div class="row">
                                                <div class="col-md-4">
                                                    <div class="mb-2">
                                                        <span class="badge bg-danger">Depression: ${escapeHtml(result.depression_score)}</span>
                                                        <br><small class="text-muted">${escapeHtml(result.depression_severity)}</small>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="mb-2">
                                                        <span class="badge bg-warning">Anxiety: ${escapeHtml(result.anxiety_score)}</span>
                                                        <br><small class="text-muted">${escapeHtml(result.anxiety_severity)}</small>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="mb-2">
                                                        <span class="badge bg-info">Stress: ${escapeHtml(result.stress_score)}</span>
                                                        <br><small class="text-muted">${escapeHtml(result.stress_severity)}</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<p class="mt-3 text-muted">No DASS-21 assessments completed yet.</p>'}
                    </div>
                </div>
                
                <!-- Mood Logs -->
                <div class="tab-pane fade" id="mood-content" role="tabpanel">
                    <div class="mt-3">
                        ${moodLogs.length ? moodLogs.map(log => `
                            <div class="card mb-2">
                                <div class="card-body py-3">
                                    <div class="row align-items-center">
                                        <div class="col-md-3">
                                            <strong>${escapeHtml(log.emotion)}</strong>
                                            <br><small class="text-muted">${escapeHtml(log.log_date)}</small>
                                        </div>
                                        <div class="col-md-2">
                                            <span class="badge bg-light text-dark">Sleep: ${escapeHtml(log.sleep)}h</span>
                                        </div>
                                        <div class="col-md-2">
                                            <span class="badge bg-light text-dark">Energy: ${escapeHtml(log.energy)}/10</span>
                                        </div>
                                        <div class="col-md-5">
                                            ${log.triggers ? `<small><strong>Triggers:</strong> ${escapeHtml(log.triggers)}</small><br>` : ''}
                                            ${log.coping ? `<small><strong>Coping:</strong> ${escapeHtml(log.coping)}</small>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<p class="mt-3 text-muted">No mood logs recorded yet.</p>'}
                    </div>
                </div>
                
                <!-- Messages -->
                <div class="tab-pane fade" id="messages-content" role="tabpanel">
                    <div class="mt-3">
                        ${messages.length ? messages.map(msg => `
                            <div class="card mb-2">
                                <div class="card-body">
                                    ${msg.message_text ? `
                                        <div class="mb-2">
                                            <strong>Student:</strong> ${escapeHtml(msg.message_text)}
                                        </div>
                                    ` : ''}
                                    ${msg.admin_response ? `
                                        <div class="text-primary">
                                            <strong>Admin Response:</strong> ${escapeHtml(msg.admin_response)}
                                        </div>
                                    ` : ''}
                                    <small class="text-muted">${escapeHtml(msg.created_at)}</small>
                                </div>
                            </div>
                        `).join('') : '<p class="mt-3 text-muted">No messages yet.</p>'}
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="mt-4 text-end">
                <button class="btn btn-primary me-2" onclick="openChat(${parseInt(student.id)})">
                    <i class="fas fa-comments me-1"></i>Send Message
                </button>
                <button class="btn btn-outline-success" onclick="getSuggestedResponses(${parseInt(student.id)})">
                    <i class="fas fa-lightbulb me-1"></i>Get Suggestions
                </button>
            </div>
        </div>
    `;
}

function openChat(userId) {
    window.location.href = `/admin/student-chat/${userId}`;
}

// Suggested Responses Function
async function getSuggestedResponses(userId) {
    try {
        // Remove any existing suggestions modal
        const existingSuggestionsModal = document.getElementById('suggestedResponsesOverlay');
        if (existingSuggestionsModal) {
            existingSuggestionsModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'suggestions-modal-overlay';
        modal.id = 'suggestedResponsesOverlay';
        modal.innerHTML = `
            <div class="suggestions-modal">
                <div class="suggestions-modal-header">
                    <h5 class="custom-modal-title">
                        <i class="fas fa-lightbulb me-2"></i>Suggested Responses
                    </h5>
                    <button type="button" class="custom-modal-close" onclick="closeSuggestionsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="suggestions-modal-body" id="suggestedResponsesContent">
                    <div class="text-center py-4">
                        <div class="spinner-border text-success" role="status">
                            <span class="visually-hidden">Loading suggestions...</span>
                        </div>
                        <p class="mt-2 text-muted">Analyzing student data...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Close on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeSuggestionsModal();
            }
        });
        
        // Fetch suggested responses
        const response = await fetch(`/admin/suggested-responses/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('suggestedResponsesContent').innerHTML = generateSuggestionsHTML(data.suggestions);
        } else {
            throw new Error(data.message || 'Failed to generate suggestions');
        }
        
    } catch (error) {
        console.error('Error loading suggested responses:', error);
        const content = document.getElementById('suggestedResponsesContent');
        if (content) {
            content.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h5 class="text-danger">Error Loading Suggestions</h5>
                    <p class="text-muted">${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }
}

// Close suggestions modal
function closeSuggestionsModal() {
    const modal = document.getElementById('suggestedResponsesOverlay');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
}

function generateSuggestionsHTML(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        return `
            <div class="text-center py-4">
                <i class="fas fa-info-circle fa-3x text-info mb-3"></i>
                <h5 class="text-info">No Specific Suggestions</h5>
                <p class="text-muted">No concerning patterns detected. Consider general wellness check-in responses.</p>
            </div>
        `;
    }
    
    // Group suggestions by category
    const grouped = suggestions.reduce((acc, suggestion) => {
        const category = suggestion.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(suggestion);
        return acc;
    }, {});
    
    return `
        <div class="suggestions-container">
            <div class="alert alert-info border-0 mb-4">
                <i class="fas fa-info-circle me-2"></i>
                <strong>How to use:</strong> Click on any suggestion to copy it to your clipboard, then paste it in your response.
            </div>
            
            ${Object.entries(grouped).map(([category, categoryMentions]) => `
                <div class="category-section mb-4">
                    <h6 class="fw-bold text-primary mb-3">
                        <i class="fas fa-tag me-2"></i>${escapeHtml(category)}
                    </h6>
                    <div class="suggestions-list">
                        ${categoryMentions.map((suggestion, index) => `
                            <div class="suggestion-card card mb-2 border-0 shadow-sm">
                                <div class="card-body p-3">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="flex-grow-1">
                                            <div class="suggestion-text mb-2">
                                                ${escapeHtml(suggestion.text)}
                                            </div>
                                            ${suggestion.reason ? `
                                                <small class="text-muted">
                                                    <i class="fas fa-info-circle me-1"></i>
                                                    Based on: ${escapeHtml(suggestion.reason)}
                                                </small>
                                            ` : ''}
                                        </div>
                                        <button class="btn btn-outline-primary btn-sm ms-3" 
                                                onclick="copySuggestion('${escapeHtml(suggestion.text).replace(/'/g, "\\'")}')">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function copySuggestion(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show success feedback
        const toast = document.createElement('div');
        toast.className = 'position-fixed bg-success text-white p-3 rounded shadow';
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 1070;';
        toast.innerHTML = `
            <i class="fas fa-check me-2"></i>Suggestion copied to clipboard!
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy suggestion. Please try again.');
    });
}

// Simple alert function for admin panel
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1060; max-width: 400px;';
    
    // Safely set message content using textContent
    alertDiv.textContent = message;
    
    // Create and append close button safely
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'alert');
    alertDiv.appendChild(closeButton);
    
    document.body.appendChild(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.classList.remove('show');
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 150);
        }
    }, 5023);
}

// Make functions available globally
window.viewStudentProfile = viewStudentProfile;
window.getSuggestedResponses = getSuggestedResponses;
window.showAlert = showAlert;
window.initializeFacultyStudentSearch = initializeFacultyStudentSearch;
window.initializeMyStudentSearch = initializeMyStudentSearch;

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
        
        // Remove click handler for activity details - no longer showing profiles from recent activity
        
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
        
        // View profile button click is handled by the button itself, not the whole card
        
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
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
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
        try {
            // Remove any existing export modals first
            const existingModals = document.querySelectorAll('.modal');
            existingModals.forEach(modal => {
                if (modal.innerHTML.includes('Export Data Options')) {
                    modal.remove();
                }
            });

            const exportOptions = await showExportOptionsModal();
            if (exportOptions) {
                await performDataExport(exportOptions);
                alert('Data exported successfully!');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed. Please try again.');
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
        
        document.getElementById('confirmExport').addEventListener('click', (e) => {
            e.preventDefault();
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
        }, { once: true });
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
            resolve(null);
        });
    });
}

async function performDataExport(options) {
    try {
        // Determine export types based on options
        const exportTypes = [];
        if (options.users) exportTypes.push('users');
        if (options.logs) exportTypes.push('mood_logs');
        if (options.dass) exportTypes.push('dass21');
        if (options.messages) exportTypes.push('messages');
        
        if (exportTypes.length === 0) {
            throw new Error('Please select at least one data type to export');
        }
        
        // Get CSRF token from meta tag or form
        let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!csrfToken) {
            // Try to get from hidden input
            const csrfInput = document.querySelector('input[name="csrf_token"]') || 
                             document.querySelector('[name="csrf_token"]');
            if (csrfInput) {
                csrfToken = csrfInput.value;
            }
        }
        
        // Prepare request data
        const requestData = {
            types: exportTypes,
            start_date: options.startDate,
            end_date: options.endDate,
            format: options.format || 'csv'
        };
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        // Add CSRF token if available
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        // Send POST request with export options
        const response = await fetch('/admin/api/export-data', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
            throw new Error(errorData.error || `Export failed with status: ${response.status}`);
        }
        
        // Check if response is JSON (error) or binary (file)
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Export failed');
        }
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'emotiontrack_export.csv';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match) filename = match[1];
        }
        
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        // Show success message
        showAlert('Data exported successfully!', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showAlert(`Export failed: ${error.message}`, 'danger');
        throw error;
    }
}

function initializeAnalytics() {
    window.generateReport = async function() {
        const reportBtn = document.querySelector('.btn-outline-info');
        let hideLoading = null;

        if (reportBtn && typeof showLoading === 'function') {
            hideLoading = showLoading(reportBtn, 'Generating...');
        }

        try {
            await showReportGenerationModal();
        } catch (error) {
            console.error('Report generation error:', error);
            showAlert('Report generation failed. Please try again.', 'danger');
        } finally {
            if (hideLoading && typeof hideLoading === 'function') {
                hideLoading();
            }
        }
    };
    
    window.viewAnalytics = async function() {
        const analyticsBtn = document.querySelector('.btn-outline-warning');
        let hideLoading = null;

        if (analyticsBtn && typeof showLoading === 'function') {
            hideLoading = showLoading(analyticsBtn, 'Loading...');
        }

        try {
            await showAnalyticsModal();
        } catch (error) {
            console.error('Analytics error:', error);
            showAlert('Failed to load analytics. Please try again.', 'danger');
        } finally {
            if (hideLoading && typeof hideLoading === 'function') {
                hideLoading();
            }
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

async function generateSpecificReport(type) {
    try {
        MindTrack.showAlert(`Generating ${type} report... This may take a few moments.`, 'info');
        
        // Generate and download CSV based on report type
        let csvData, filename;
        
        switch(type) {
            case 'summary':
                csvData = await generateSummaryCSV();
                filename = `emotion-track-summary-report-${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            case 'detailed':
                csvData = await generateDetailedAnalysisCSV();
                filename = `emotion-track-detailed-analysis-${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            case 'risk':
                csvData = await generateRiskAssessmentCSV();
                filename = `emotion-track-risk-assessment-${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            case 'trends':
                csvData = await generateTrendAnalysisCSV();
                filename = `emotion-track-trend-analysis-${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            default:
                throw new Error('Unknown report type');
        }
        
        // Create and download CSV
        downloadCSV(csvData, filename);
        MindTrack.showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`, 'success');
        
    } catch (error) {
        console.error('Report generation error:', error);
        MindTrack.showAlert('Failed to generate report. Please try again.', 'error');
    }
}

function showAnalyticsModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        
        // Check if user is main admin to show filtering controls
        const isMainAdmin = window.adminConfig && window.adminConfig.isMainAdmin;
        
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
                        ${isMainAdmin ? `
                        <div class="analytics-filters mb-4">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Filter by Strand</label>
                                    <select id="analyticsStrandFilter" class="form-select" onchange="updateAnalytics()">
                                        <option value="">All Strands</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Filter by Grade</label>
                                    <select id="analyticsGradeFilter" class="form-select" onchange="updateAnalytics()">
                                        <option value="">All Grades</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Filter by Section</label>
                                    <select id="analyticsSectionFilter" class="form-select" onchange="updateAnalytics()">
                                        <option value="">All Sections</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-outline-secondary w-100" onclick="clearAnalyticsFilters()">
                                        <i class="fas fa-times me-1"></i>Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        <div class="analytics-dashboard">
                            <div class="text-center p-4">
                                <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                                <p class="mt-2 text-muted">Loading analytics data...</p>
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
        modal.addEventListener('shown.bs.modal', async () => {
            await initializeAnalyticsCharts();
        });
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
            resolve();
        });
    });
}

async function initializeAnalyticsCharts() {
    try {
        // Show loading state
        document.querySelector('.analytics-dashboard').innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Loading analytics data...</div>';
        
        // For main admin, populate filter dropdowns first
        const isMainAdmin = window.adminConfig && window.adminConfig.isMainAdmin;
        if (isMainAdmin) {
            await populateFilterDropdowns();
        }
        
        // Load analytics with current filters
        await updateAnalyticsData();
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        document.querySelector('.analytics-dashboard').innerHTML = '<div class="alert alert-danger text-center">Failed to load analytics data. Please try again.</div>';
    }
}

async function updateAnalyticsData() {
    try {
        // Build API URL with filters for main admin
        let apiUrl = '/admin/api/analytics-data';
        const isMainAdmin = window.adminConfig && window.adminConfig.isMainAdmin;
        
        if (isMainAdmin) {
            const strandFilter = document.getElementById('analyticsStrandFilter')?.value;
            const gradeFilter = document.getElementById('analyticsGradeFilter')?.value;
            const sectionFilter = document.getElementById('analyticsSectionFilter')?.value;
            
            const params = new URLSearchParams();
            if (strandFilter) params.set('strand', strandFilter);
            if (gradeFilter) params.set('grade', gradeFilter);
            if (sectionFilter) params.set('section', sectionFilter);
            
            if (params.toString()) {
                apiUrl += '?' + params.toString();
            }
        }
        
        // Fetch analytics data from API
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const analyticsData = await response.json();
        
        // Update analytics dashboard content
        renderAnalyticsDashboard(analyticsData, isMainAdmin);
        
    } catch (error) {
        console.error('Error updating analytics data:', error);
        document.querySelector('.analytics-dashboard').innerHTML = '<div class="alert alert-danger text-center">Failed to load analytics data. Please try again.</div>';
    }
}

function renderAnalyticsDashboard(analyticsData, isMainAdmin) {
    const strandBreakdownChart = isMainAdmin && analyticsData.strand_breakdown && analyticsData.strand_breakdown.length > 0 ? `
        <div class="col-md-6">
            <div class="analytics-chart">
                <h6 class="fw-bold mb-3">Students by Strand</h6>
                <canvas id="strandBreakdownChart" width="400" height="250"></canvas>
            </div>
        </div>
    ` : '';
    
    document.querySelector('.analytics-dashboard').innerHTML = `
        <div class="row g-4 mb-4">
            <div class="col-md-3">
                <div class="analytics-metric">
                    <h6 class="text-muted">Total Mood Logs</h6>
                    <div class="h3 text-primary">${analyticsData.mood_distribution?.reduce((sum, item) => sum + item.count, 0) || 0}</div>
                    <small class="text-muted">All time</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="analytics-metric">
                    <h6 class="text-muted">Average Energy Level</h6>
                    <div class="h3 text-success">${analyticsData.average_energy ? analyticsData.average_energy.toFixed(1) + '/10' : 'N/A'}</div>
                    <small class="text-muted">Current average</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="analytics-metric">
                    <h6 class="text-muted">Total Students</h6>
                    <div class="h3 text-info">${analyticsData.total_users || 0}</div>
                    <small class="text-muted">Registered students</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="analytics-metric">
                    <h6 class="text-muted">High Risk Cases</h6>
                    <div class="h3 text-warning">${analyticsData.concerning_students || 0}</div>
                    <small class="text-muted">Severe DASS-21 scores</small>
                </div>
            </div>
        </div>
        
        <div class="row g-4">
            <div class="col-md-6">
                <div class="analytics-chart">
                    <h6 class="fw-bold mb-3">Mood Distribution</h6>
                    <canvas id="emotionTrendsChart" width="400" height="250"></canvas>
                </div>
            </div>
            <div class="col-md-6">
                <div class="analytics-chart">
                    <h6 class="fw-bold mb-3">DASS-21 Severity Distribution</h6>
                    <canvas id="dassDistributionChart" width="400" height="250"></canvas>
                </div>
            </div>
            ${strandBreakdownChart}
            <div class="col-md-${strandBreakdownChart ? '6' : '12'}">
                <div class="analytics-chart">
                    <h6 class="fw-bold mb-3">Weekly Activity</h6>
                    <canvas id="activityChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // Initialize charts with real data
    initializeChartsWithData(analyticsData);
}

function initializeChartsWithData(analyticsData) {
    // Mood Distribution Chart (previously Emotion Trends)
    const emotionCtx = document.getElementById('emotionTrendsChart');
    if (emotionCtx && analyticsData.mood_distribution) {
        const labels = analyticsData.mood_distribution.map(item => item.emotion);
        const data = analyticsData.mood_distribution.map(item => item.count);
        
        new Chart(emotionCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#28a745', '#17a2b8', '#ffc107', '#fd7e14', '#dc3545',
                        '#6f42c1', '#20c997', '#e83e8c', '#6c757d', '#007bff'
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
    
    // DASS Severity Distribution Chart
    const dassCtx = document.getElementById('dassDistributionChart');
    if (dassCtx && analyticsData.dass_severity) {
        const severityOrder = ['Normal', 'Mild', 'Moderate', 'Severe', 'Extremely Severe'];
        const labels = [];
        const data = [];
        
        severityOrder.forEach(severity => {
            const found = analyticsData.dass_severity.find(item => item.severity === severity);
            labels.push(severity);
            data.push(found ? found.count : 0);
        });
        
        new Chart(dassCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#28a745',  // Normal - Green
                        '#ffc107',  // Mild - Yellow
                        '#fd7e14',  // Moderate - Orange
                        '#dc3545',  // Severe - Red
                        '#6f42c1'   // Extremely Severe - Purple
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
    
    // Weekly Activity Chart
    const activityCtx = document.getElementById('activityChart');
    if (activityCtx && analyticsData.weekly_activity) {
        const labels = analyticsData.weekly_activity.map(item => item.week);
        const data = analyticsData.weekly_activity.map(item => item.count);
        
        new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weekly Mood Logs',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Strand Breakdown Chart (for main admin only)
    const strandCtx = document.getElementById('strandBreakdownChart');
    if (strandCtx && analyticsData.strand_breakdown) {
        const labels = analyticsData.strand_breakdown.map(item => item.strand);
        const data = analyticsData.strand_breakdown.map(item => item.count);
        
        new Chart(strandCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Students by Strand',
                    data: data,
                    backgroundColor: [
                        '#007bff', '#28a745', '#ffc107', '#dc3545', 
                        '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'
                    ]
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
}

async function populateFilterDropdowns() {
    try {
        // Fetch available strands for filtering
        const response = await fetch('/admin/api/students-by-hierarchy');
        if (!response.ok) return;

        const data = await response.json();

        if (data.type === 'strands') {
            // Populate strand dropdown
            const strandSelect = document.getElementById('analyticsStrandFilter');
            if (strandSelect) {
                // Clear existing options except the first one
                strandSelect.innerHTML = '<option value="">All Strands</option>';
                data.data.forEach(strand => {
                    const option = document.createElement('option');
                    option.value = strand;
                    option.textContent = strand;
                    strandSelect.appendChild(option);
                });
            }
        }

    } catch (error) {
        console.error('Error populating filter dropdowns:', error);
    }
}

async function updateGradeDropdown(selectedStrand, preserveGrade = null) {
    try {
        const gradeSelect = document.getElementById('analyticsGradeFilter');
        const sectionSelect = document.getElementById('analyticsSectionFilter');

        // Fetch grades - either for specific strand or all grades if no strand selected
        let apiUrl = '/admin/api/students-by-hierarchy?';
        if (selectedStrand) {
            apiUrl += `strand=${encodeURIComponent(selectedStrand)}`;
        } else {
            // For "All Strands", we need to get all grades - use a special endpoint or modify logic
            // Since the API doesn't have a direct endpoint for all grades, we'll populate with senior high school grades only
            // and let the section filtering handle the actual data
            if (gradeSelect) {
                const currentValue = preserveGrade || gradeSelect.value;
                gradeSelect.innerHTML = '<option value="">All Grades</option>';
                // Add senior high school grade levels only (11 and 12)
                const seniorHighGrades = ['11', '12'];
                seniorHighGrades.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade;
                    option.textContent = `Grade ${grade}`;
                    if (currentValue === grade) {
                        option.selected = true;
                    }
                    gradeSelect.appendChild(option);
                });
            }
            // Reset section dropdown
            if (sectionSelect) {
                sectionSelect.innerHTML = '<option value="">All Sections</option>';
            }
            return;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) return;

        const data = await response.json();

        if (data.type === 'grades') {
            // Populate grade dropdown
            if (gradeSelect) {
                const currentValue = preserveGrade || gradeSelect.value;
                gradeSelect.innerHTML = '<option value="">All Grades</option>';
                data.data.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade;
                    option.textContent = `Grade ${grade}`;
                    if (currentValue === grade && data.data.includes(grade)) {
                        option.selected = true;
                    }
                    gradeSelect.appendChild(option);
                });
            }
            // Reset section dropdown
            if (sectionSelect) {
                sectionSelect.innerHTML = '<option value="">All Sections</option>';
            }
        }

    } catch (error) {
        console.error('Error updating grade dropdown:', error);
    }
}

async function updateSectionDropdown(selectedStrand, selectedGrade, preserveSection = null) {
    try {
        const sectionSelect = document.getElementById('analyticsSectionFilter');

        if (!selectedGrade) {
            // Reset section dropdown if no grade selected
            if (sectionSelect) {
                sectionSelect.innerHTML = '<option value="">All Sections</option>';
            }
            return;
        }

        // Fetch sections for the selected grade (with or without strand)
        let apiUrl = `/admin/api/students-by-hierarchy?grade=${encodeURIComponent(selectedGrade)}`;
        if (selectedStrand) {
            apiUrl += `&strand=${encodeURIComponent(selectedStrand)}`;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) return;

        const data = await response.json();

        if (data.type === 'sections') {
            // Populate section dropdown
            if (sectionSelect) {
                const currentValue = preserveSection || sectionSelect.value;
                sectionSelect.innerHTML = '<option value="">All Sections</option>';
                data.data.forEach(section => {
                    const option = document.createElement('option');
                    option.value = section;
                    option.textContent = section;
                    if (currentValue === section && data.data.includes(section)) {
                        option.selected = true;
                    }
                    sectionSelect.appendChild(option);
                });
            }
        }

    } catch (error) {
        console.error('Error updating section dropdown:', error);
    }
}

// Store previous filter values to detect changes
let previousFilters = {
    strand: '',
    grade: '',
    section: ''
};

window.updateAnalytics = async function() {
    // Get current filter values
    const strandFilter = document.getElementById('analyticsStrandFilter')?.value || '';
    const gradeFilter = document.getElementById('analyticsGradeFilter')?.value || '';
    const sectionFilter = document.getElementById('analyticsSectionFilter')?.value || '';

    // Check what changed
    const strandChanged = previousFilters.strand !== strandFilter;
    const gradeChanged = previousFilters.grade !== gradeFilter;
    const sectionChanged = previousFilters.section !== sectionFilter;

    // Update cascading dropdowns only when relevant filters change
    if (strandChanged) {
        // Strand changed - update grade dropdown
        await updateGradeDropdown(strandFilter);
        // Reset section dropdown when strand changes
        const sectionSelect = document.getElementById('analyticsSectionFilter');
        if (sectionSelect) {
            sectionSelect.innerHTML = '<option value="">All Sections</option>';
        }
    }

    if (gradeChanged) {
        // Grade changed - update section dropdown (works with or without strand)
        await updateSectionDropdown(strandFilter, gradeFilter);
    }

    // Note: Section changes don't affect other dropdowns, just update data

    // Update stored previous values
    previousFilters = {
        strand: strandFilter,
        grade: gradeFilter,
        section: sectionFilter
    };

    // Update analytics data
    await updateAnalyticsData();
};

window.clearAnalyticsFilters = function() {
    // Clear all filter selections
    const strandFilter = document.getElementById('analyticsStrandFilter');
    const gradeFilter = document.getElementById('analyticsGradeFilter');
    const sectionFilter = document.getElementById('analyticsSectionFilter');

    if (strandFilter) strandFilter.value = '';
    if (gradeFilter) {
        gradeFilter.innerHTML = '<option value="">All Grades</option>';
    }
    if (sectionFilter) {
        sectionFilter.innerHTML = '<option value="">All Sections</option>';
    }

    // Reset previous filters tracking
    previousFilters = {
        strand: '',
        grade: '',
        section: ''
    };

    // Refresh analytics
    updateAnalytics();
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
        updateStatCard('risk', stats.concerning_students);
        
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
    // Student management interface functionality removed - using modal instead
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

// CSV generation utility functions
function downloadCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function generateSummaryCSV() {
    try {
        // Fetch analytics data from API
        const response = await fetch('/admin/api/analytics-data');
        const analyticsData = await response.json();
        
        // Prepare comprehensive summary data from real API data
        const headers = ['Metric', 'Value', 'Description'];
        const data = [
            ['Total Students', analyticsData.total_users?.toString() || '0', 'Total number of registered students'],
            ['Total Mood Logs', analyticsData.monthly_activity?.reduce((sum, item) => sum + item.count, 0)?.toString() || '0', 'Total number of emotion logs recorded'],
            ['Average Energy Level', analyticsData.average_energy?.toFixed(1) || '0.0', 'Average energy level across all students (1-10 scale)'],
            ['Most Common Emotion', analyticsData.mood_distribution?.[0]?.emotion || 'N/A', 'Most frequently logged emotion'],
            ['High Risk Students', analyticsData.concerning_students?.toString() || '0', 'Number of students requiring immediate attention'],
            ['DASS Assessments', analyticsData.dass_severity?.reduce((sum, item) => sum + item.count, 0)?.toString() || '0', 'Total number of DASS-21 assessments completed'],
            ['Last Data Update', new Date().toLocaleString(), 'Timestamp of report generation']
        ];
        
        return [headers, ...data].map(row => row.join(',')).join('\n');
    } catch (error) {
        console.error('Error generating summary CSV:', error);
        // Fallback to basic structure if API fails
        const headers = ['Metric', 'Value', 'Description'];
        const data = [
            ['Error', 'Data Unavailable', 'Unable to fetch current statistics'],
            ['Last Attempt', new Date().toLocaleString(), 'Timestamp of report generation']
        ];
        return [headers, ...data].map(row => row.join(',')).join('\n');
    }
}

async function generateDetailedAnalysisCSV() {
    try {
        // Fetch user data from API
        const response = await fetch('/admin/api/export-data?type=users');
        const csvData = await response.text();
        
        if (csvData && csvData.trim()) {
            return csvData;
        } else {
            // Fallback structure
            const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Gender', 'Strand', 'Grade Level', 'Section', 'Created At'];
            const data = [['No data available', '', '', '', '', '', '', '', '']];
            return [headers, ...data].map(row => row.join(',')).join('\n');
        }
    } catch (error) {
        console.error('Error generating detailed analysis CSV:', error);
        const headers = ['Error', 'Message', 'Timestamp'];
        const data = [['Data Unavailable', 'Unable to fetch student data', new Date().toLocaleString()]];
        return [headers, ...data].map(row => row.join(',')).join('\n');
    }
}

async function generateRiskAssessmentCSV() {
    try {
        // Fetch DASS-21 results from API
        const response = await fetch('/admin/api/export-data?type=dass21');
        const csvData = await response.text();
        
        if (csvData && csvData.trim()) {
            return csvData;
        } else {
            // Fallback structure
            const headers = ['ID', 'User Email', 'Depression Score', 'Anxiety Score', 'Stress Score', 'Depression Severity', 'Anxiety Severity', 'Stress Severity', 'Created At'];
            const data = [['No assessments found', '', '', '', '', '', '', '', '']];
            return [headers, ...data].map(row => row.join(',')).join('\n');
        }
    } catch (error) {
        console.error('Error generating risk assessment CSV:', error);
        const headers = ['Error', 'Message', 'Timestamp'];
        const data = [['Data Unavailable', 'Unable to fetch DASS-21 data', new Date().toLocaleString()]];
        return [headers, ...data].map(row => row.join(',')).join('\n');
    }
}

async function generateTrendAnalysisCSV() {
    try {
        // Fetch mood logs from API
        const response = await fetch('/admin/api/export-data?type=mood_logs');
        const csvData = await response.text();
        
        if (csvData && csvData.trim()) {
            return csvData;
        } else {
            // Fallback structure
            const headers = ['Log ID', 'User Email', 'Emotion', 'Sleep Hours', 'Energy Level', 'Triggers', 'Coping', 'Gratitude', 'Date'];
            const data = [['No mood logs found', '', '', '', '', '', '', '', '']];
            return [headers, ...data].map(row => row.join(',')).join('\n');
        }
    } catch (error) {
        console.error('Error generating trend analysis CSV:', error);
        const headers = ['Error', 'Message', 'Timestamp'];
        const data = [['Data Unavailable', 'Unable to fetch mood log data', new Date().toLocaleString()]];
        return [headers, ...data].map(row => row.join(',')).join('\n');
    }
}

// =========================
// Stat Card Click Handlers
// =========================

// Global pagination state for modals
let currentMoodLogsPage = 1;
let currentHighRiskPage = 1;

// Unread Messages Card - Redirect to messages page
function goToMessagesPage() {
    window.location.href = '/admin/messages';
}

// Mood Logs Modal Functions
async function openMoodLogsModal() {
    try {
        const overlay = document.getElementById('moodLogsOverlay');
        const content = document.getElementById('moodLogsContent');
        
        // Show loading
        content.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading recent mood logs...</p>
            </div>
        `;
        
        // Show modal
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Load initial page
        await loadMoodLogsPage(1);
        
    } catch (error) {
        console.error('Error opening mood logs modal:', error);
        document.getElementById('moodLogsContent').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Mood Logs</h5>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

function closeMoodLogsModal() {
    const overlay = document.getElementById('moodLogsOverlay');
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentMoodLogsPage = 1; // Reset pagination
}

async function loadMoodLogsPage(page) {
    try {
        const response = await fetch(`/admin/api/recent-mood-logs?page=${page}&per_page=10`);
        if (!response.ok) throw new Error('Failed to fetch mood logs');
        
        const data = await response.json();
        currentMoodLogsPage = page;
        
        if (data.success) {
            displayMoodLogsData(data.data, data.pagination);
        } else {
            throw new Error(data.error || 'Failed to load mood logs');
        }
        
    } catch (error) {
        console.error('Error loading mood logs page:', error);
        document.getElementById('moodLogsContent').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Data</h5>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

function displayMoodLogsData(logs, pagination) {
    const content = document.getElementById('moodLogsContent');
    
    let html = `
        <div class="mood-logs-list">
            ${logs.length > 0 ? 
                logs.map(log => `
                    <div class="activity-item d-flex align-items-center p-3 border-bottom">
                        <div class="activity-icon me-3">
                            <i class="fas fa-heart text-danger"></i>
                        </div>
                        <div class="activity-content flex-grow-1">
                            <h6 class="mb-1">${log.user_name}</h6>
                            <p class="mb-1">Logged emotion: <strong>${log.emotion}</strong></p>
                            <small class="text-muted">${log.log_date}</small>
                        </div>
                        <div class="activity-meta">
                            <span class="badge bg-light text-dark">Sleep: ${log.sleep}h</span>
                            <span class="badge bg-light text-dark">Energy: ${log.energy}/10</span>
                        </div>
                    </div>
                `).join('') :
                `<div class="text-center py-4">
                    <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No mood logs found</p>
                </div>`
            }
        </div>
    `;
    
    // Add pagination if needed
    if (pagination.pages > 1) {
        html += generatePaginationHTML(pagination, 'loadMoodLogsPage');
    }
    
    content.innerHTML = html;
}

// High Risk Students Modal Functions
async function openHighRiskModal() {
    try {
        const overlay = document.getElementById('highRiskOverlay');
        const content = document.getElementById('highRiskContent');
        
        // Show loading
        content.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading high risk students...</p>
            </div>
        `;
        
        // Show modal
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Load initial page
        await loadHighRiskPage(1);
        
    } catch (error) {
        console.error('Error opening high risk modal:', error);
        document.getElementById('highRiskContent').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading High Risk Students</h5>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

function closeHighRiskModal() {
    const overlay = document.getElementById('highRiskOverlay');
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentHighRiskPage = 1; // Reset pagination
}

async function loadHighRiskPage(page) {
    try {
        const response = await fetch(`/admin/api/high-risk-students?page=${page}&per_page=3`);
        if (!response.ok) throw new Error('Failed to fetch high risk students');
        
        const data = await response.json();
        currentHighRiskPage = page;
        
        if (data.success) {
            displayHighRiskData(data.data, data.pagination);
        } else {
            throw new Error(data.error || 'Failed to load high risk students');
        }
        
    } catch (error) {
        console.error('Error loading high risk page:', error);
        document.getElementById('highRiskContent').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Data</h5>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

function displayHighRiskData(students, pagination) {
    const content = document.getElementById('highRiskContent');
    
    let html = `
        <div class="risk-students-list">
            ${students.length > 0 ? 
                `<div class="row g-3">
                    ${students.map(student => `
                        <div class="col-12">
                            <div class="risk-item p-3 border rounded">
                                <div class="d-flex flex-column h-100">
                                    <div class="flex-grow-1">
                                        <h6 class="fw-bold mb-2">${student.full_name}</h6>
                                        <div class="risk-scores mb-2">
                                            ${student.depression_severity ? 
                                                `<span class="badge bg-danger mb-1">Depression: ${student.depression_severity}</span><br>` : ''}
                                            ${student.anxiety_severity ? 
                                                `<span class="badge bg-warning mb-1">Anxiety: ${student.anxiety_severity}</span><br>` : ''}
                                            ${student.stress_severity ? 
                                                `<span class="badge bg-info mb-1">Stress: ${student.stress_severity}</span><br>` : ''}
                                        </div>
                                        <small class="text-muted d-block">
                                            Assessed: ${student.assessment_date}
                                        </small>
                                    </div>
                                    <div class="mt-3">
                                        <button class="btn btn-outline-primary btn-sm me-2" onclick="viewStudentProfile(${student.user_id})">
                                            <i class="fas fa-user me-1"></i>View Profile
                                        </button>
                                        <button class="btn btn-outline-success btn-sm" onclick="goToStudentChat(${student.user_id})">
                                            <i class="fas fa-comments me-1"></i>Chat
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>` :
                `<div class="text-center py-4">
                    <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <p class="text-muted">No high risk students found</p>
                </div>`
            }
        </div>
    `;
    
    // Add pagination if needed
    if (pagination.pages > 1) {
        html += generatePaginationHTML(pagination, 'loadHighRiskPage');
    }
    
    content.innerHTML = html;
}

// Utility function to generate pagination HTML
function generatePaginationHTML(pagination, functionName) {
    let html = `
        <div class="d-flex justify-content-center mt-4">
            <nav aria-label="Page navigation">
                <ul class="pagination">
    `;
    
    // Previous button
    if (pagination.has_prev) {
        html += `<li class="page-item">
            <a class="page-link" href="#" onclick="${functionName}(${pagination.prev_num}); return false;">
                <i class="fas fa-chevron-left"></i> Previous
            </a>
        </li>`;
    } else {
        html += `<li class="page-item disabled">
            <span class="page-link"><i class="fas fa-chevron-left"></i> Previous</span>
        </li>`;
    }
    
    // Page numbers (show current and adjacent pages)
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.pages, pagination.page + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="${functionName}(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === pagination.page) {
            html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="${functionName}(${i}); return false;">${i}</a></li>`;
        }
    }
    
    if (endPage < pagination.pages) {
        if (endPage < pagination.pages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="${functionName}(${pagination.pages}); return false;">${pagination.pages}</a></li>`;
    }
    
    // Next button
    if (pagination.has_next) {
        html += `<li class="page-item">
            <a class="page-link" href="#" onclick="${functionName}(${pagination.next_num}); return false;">
                Next <i class="fas fa-chevron-right"></i>
            </a>
        </li>`;
    } else {
        html += `<li class="page-item disabled">
            <span class="page-link">Next <i class="fas fa-chevron-right"></i></span>
        </li>`;
    }
    
    html += `
                </ul>
            </nav>
        </div>
    `;
    
    return html;
}

// Dashboard Pagination Functions
async function loadRiskStudentsPage(page) {
    try {
        const riskListContainer = document.querySelector('.risk-list');
        const riskPagination = document.getElementById('riskPagination');
        
        // Show loading state
        riskListContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading high risk students...</p>
            </div>
        `;
        
        // Disable pagination controls
        if (riskPagination) {
            riskPagination.style.pointerEvents = 'none';
            riskPagination.style.opacity = '0.6';
        }
        
        // Fetch paginated data
        const response = await fetch(`/admin/api/high-risk-students?page=${page}&per_page=3`);
        if (!response.ok) throw new Error('Failed to fetch high risk students');
        
        const data = await response.json();
        
        if (data.success) {
            // Update content
            if (data.data && data.data.length > 0) {
                riskListContainer.innerHTML = `
                    <div class="row g-3">
                        ${data.data.map(student => `
                            <div class="col-md-6 col-lg-4">
                                <div class="risk-item p-3 border rounded h-100">
                                    <div class="d-flex flex-column h-100">
                                        <div class="flex-grow-1">
                                            <h6 class="fw-bold mb-2">${escapeHtml(student.full_name)}</h6>
                                            <div class="risk-scores mb-2">
                                                ${student.depression_severity ? 
                                                    `<span class="badge bg-danger mb-1">Depression: ${escapeHtml(student.depression_severity)}</span><br>` : ''}
                                                ${student.anxiety_severity ? 
                                                    `<span class="badge bg-warning mb-1">Anxiety: ${escapeHtml(student.anxiety_severity)}</span><br>` : ''}
                                                ${student.stress_severity ? 
                                                    `<span class="badge bg-info mb-1">Stress: ${escapeHtml(student.stress_severity)}</span><br>` : ''}
                                            </div>
                                            <small class="text-muted d-block">
                                                Assessed: ${escapeHtml(student.assessment_date)}
                                            </small>
                                        </div>
                                        <div class="mt-3">
                                            <button class="btn btn-outline-primary btn-sm w-100" onclick="viewStudentProfile(${parseInt(student.user_id)})">
                                                <i class="fas fa-user me-1"></i>View Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                riskListContainer.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                        <p class="text-muted">No high risk students</p>
                    </div>
                `;
            }
            
            // Update pagination controls
            updateRiskPaginationControls(data.pagination);
            
        } else {
            throw new Error(data.error || 'Failed to load high risk students');
        }
        
    } catch (error) {
        console.error('Error loading high risk students page:', error);
        document.querySelector('.risk-list').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Students</h5>
                <p class="text-muted">${error.message}</p>
                <button class="btn btn-primary btn-sm" onclick="loadRiskStudentsPage(1)">
                    <i class="fas fa-retry me-1"></i>Try Again
                </button>
            </div>
        `;
    } finally {
        // Re-enable pagination controls
        const riskPagination = document.getElementById('riskPagination');
        if (riskPagination) {
            riskPagination.style.pointerEvents = 'auto';
            riskPagination.style.opacity = '1';
        }
    }
}

async function loadRecentActivityPage(page) {
    try {
        const activityListContainer = document.querySelector('.activity-list');
        const activityPagination = document.getElementById('activityPagination');
        
        // Show loading state
        activityListContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading recent activity...</p>
            </div>
        `;
        
        // Disable pagination controls
        if (activityPagination) {
            activityPagination.style.pointerEvents = 'none';
            activityPagination.style.opacity = '0.6';
        }
        
        // Fetch paginated data
        const response = await fetch(`/admin/api/recent-mood-logs?page=${page}&per_page=10`);
        if (!response.ok) throw new Error('Failed to fetch recent activity');
        
        const data = await response.json();
        
        if (data.success) {
            // Update content
            if (data.data && data.data.length > 0) {
                activityListContainer.innerHTML = data.data.map(log => `
                    <div class="activity-item d-flex align-items-center p-3 border-bottom">
                        <div class="activity-icon me-3">
                            <i class="fas fa-heart text-danger"></i>
                        </div>
                        <div class="activity-content flex-grow-1">
                            <h6 class="mb-1">${escapeHtml(log.user_name)}</h6>
                            <p class="mb-1">Logged emotion: <strong>${escapeHtml(log.emotion)}</strong></p>
                            <small class="text-muted">${escapeHtml(log.log_date)}</small>
                        </div>
                        <div class="activity-meta">
                            <span class="badge bg-light text-dark">Sleep: ${escapeHtml(log.sleep)}h</span>
                            <span class="badge bg-light text-dark">Energy: ${escapeHtml(log.energy)}/10</span>
                        </div>
                    </div>
                `).join('');
            } else {
                activityListContainer.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No recent activity</p>
                    </div>
                `;
            }
            
            // Update pagination controls
            updateActivityPaginationControls(data.pagination);
            
        } else {
            throw new Error(data.error || 'Failed to load recent activity');
        }
        
    } catch (error) {
        console.error('Error loading recent activity page:', error);
        document.querySelector('.activity-list').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error Loading Activity</h5>
                <p class="text-muted">${error.message}</p>
                <button class="btn btn-primary btn-sm" onclick="loadRecentActivityPage(1)">
                    <i class="fas fa-retry me-1"></i>Try Again
                </button>
            </div>
        `;
    } finally {
        // Re-enable pagination controls
        const activityPagination = document.getElementById('activityPagination');
        if (activityPagination) {
            activityPagination.style.pointerEvents = 'auto';
            activityPagination.style.opacity = '1';
        }
    }
}

// Helper functions to update pagination controls
function updateRiskPaginationControls(pagination) {
    const riskPagination = document.getElementById('riskPagination');
    if (!riskPagination || pagination.pages <= 1) return;
    
    let html = '';
    
    // Previous button
    if (pagination.has_prev) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="loadRiskStudentsPage(${pagination.prev_num})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link"><i class="fas fa-chevron-left"></i></span>
            </li>
        `;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
            html += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            html += `
                <li class="page-item">
                    <button class="page-link" onclick="loadRiskStudentsPage(${i})">${i}</button>
                </li>
            `;
        }
    }
    
    // Next button
    if (pagination.has_next) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="loadRiskStudentsPage(${pagination.next_num})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link"><i class="fas fa-chevron-right"></i></span>
            </li>
        `;
    }
    
    riskPagination.innerHTML = html;
}

function updateActivityPaginationControls(pagination) {
    const activityPagination = document.getElementById('activityPagination');
    if (!activityPagination || pagination.pages <= 1) return;
    
    let html = '';
    
    // Previous button
    if (pagination.has_prev) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="loadRecentActivityPage(${pagination.prev_num})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link"><i class="fas fa-chevron-left"></i></span>
            </li>
        `;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
            html += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            html += `
                <li class="page-item">
                    <button class="page-link" onclick="loadRecentActivityPage(${i})">${i}</button>
                </li>
            `;
        }
    }
    
    // Next button
    if (pagination.has_next) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="loadRecentActivityPage(${pagination.next_num})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link"><i class="fas fa-chevron-right"></i></span>
            </li>
        `;
    }
    
    activityPagination.innerHTML = html;
}
