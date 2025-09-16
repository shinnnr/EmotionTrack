// Consultation Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeDualChat();
    scrollToBottom('guidance');
    startRealtimePolling();
});

function initializeDualChat() {
    // Initialize both chat forms
    const guidanceForm = document.getElementById('guidanceMessageForm');
    const facultyForm = document.getElementById('facultyMessageForm');
    
    if (guidanceForm) {
        guidanceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendMessage('guidance_office');
        });
        
        setupTextareaHandlers('guidanceMessageText');
    }
    
    if (facultyForm) {
        facultyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendMessage('faculty_adviser');
        });
        
        setupTextareaHandlers('facultyMessageText');
    }
    
    // Initialize suggestion buttons
    initializeSuggestionButtons();
    
    // Setup tab change handlers
    const tabs = document.querySelectorAll('#consultationTabs button');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const targetId = e.target.getAttribute('data-bs-target');
            const chatType = targetId === '#guidance-chat' ? 'guidance' : 'faculty';
            scrollToBottom(chatType);
            markAsRead(chatType);
        });
    });
}

function setupTextareaHandlers(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    // Auto-resize textarea
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Send message on Enter key (but not Shift+Enter)
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const conversationType = textareaId.includes('guidance') ? 'guidance_office' : 'faculty_adviser';
            sendMessage(conversationType);
        }
    });
}

function initializeSuggestionButtons() {
    const suggestionButtons = document.querySelectorAll('.suggestion-btn');
    
    suggestionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const suggestionMessage = this.dataset.message;
            const target = this.dataset.target;
            
            const messageInput = target === 'guidance' ? 
                document.getElementById('guidanceMessageText') : 
                document.getElementById('facultyMessageText');
            
            if (messageInput.value.trim() === '') {
                messageInput.value = suggestionMessage;
                messageInput.style.height = 'auto';
                messageInput.style.height = (messageInput.scrollHeight) + 'px';
                messageInput.focus();
            } else {
                if (confirm('This will replace your current message. Continue?')) {
                    messageInput.value = suggestionMessage;
                    messageInput.style.height = 'auto';
                    messageInput.style.height = (messageInput.scrollHeight) + 'px';
                    messageInput.focus();
                }
            }
        });
    });
}

async function sendMessage(conversationType) {
    const isGuidance = conversationType === 'guidance_office';
    const messageInput = document.getElementById(isGuidance ? 'guidanceMessageText' : 'facultyMessageText');
    const messageText = messageInput.value.trim();
    
    if (!messageText) {
        alert('Please enter a message before sending.');
        return;
    }
    
    // Get the correct form and send button
    const form = isGuidance ? document.getElementById('guidanceMessageForm') : document.getElementById('facultyMessageForm');
    const sendButton = form.querySelector('.btn-send');
    const originalContent = sendButton.innerHTML;
    
    // Show loading state
    sendButton.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
    sendButton.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('message_text', messageText);
        formData.append('conversation_type', conversationType);
        formData.append('csrf_token', document.querySelector('[name=csrf_token]').value);
        
        const response = await fetch('/consultation', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            // Add message to chat immediately for better UX
            const chatType = isGuidance ? 'guidance' : 'faculty';
            addMessageToChat(messageText, 'student', chatType);
            
            // Clear input
            messageInput.value = '';
            messageInput.style.height = 'auto';
            
            // Show success message
            showNotification(`Message sent to ${isGuidance ? 'Guidance Office' : 'Faculty Adviser'} successfully!`, 'success');
            
            // Scroll to bottom
            scrollToBottom(chatType);
        } else {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message. Please try again.', 'error');
    } finally {
        // Restore button
        sendButton.innerHTML = originalContent;
        sendButton.disabled = false;
    }
}

function addMessageToChat(messageText, type, chatType, messageId = null) {
    const chatContainer = document.getElementById(chatType === 'guidance' ? 'guidanceMessages' : 'facultyMessages');
    const messageDiv = document.createElement('div');
    
    const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Set message ID if provided to prevent duplicates
    if (messageId) {
        messageDiv.setAttribute('data-message-id', messageId);
    }
    
    if (type === 'student') {
        messageDiv.className = 'message-bubble student-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${messageText}</div>
                <div class="message-time">${currentTime}</div>
            </div>
        `;
    } else {
        const avatarText = chatType === 'guidance' ? 'GC' : 'FA';
        const senderText = chatType === 'guidance' ? 'Guidance Counselor' : 'Faculty Adviser';
        
        messageDiv.className = 'message-bubble admin-message';
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <div class="avatar-sm">
                    <div class="avatar-title rounded-circle bg-clsu-green text-white">${avatarText}</div>
                </div>
            </div>
            <div class="message-content">
                <div class="message-sender">${senderText}</div>
                <div class="message-text">${messageText}</div>
                <div class="message-time">${currentTime}</div>
            </div>
        `;
    }
    
    // Remove empty chat message if it exists
    const emptyChat = chatContainer.querySelector('.empty-chat');
    if (emptyChat) {
        emptyChat.remove();
    }
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom(chatType);
}

function scrollToBottom(chatType) {
    const chatContainer = document.getElementById(chatType === 'guidance' ? 'guidanceChatContainer' : 'facultyChatContainer');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Real-time polling functions
function startRealtimePolling() {
    // Poll for new messages every 5 seconds
    setInterval(checkForNewMessages, 5000);
}

async function checkForNewMessages() {
    try {
        const response = await fetch('/consultation/poll-messages', {
            method: 'GET',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrf_token]')?.value || ''
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update guidance office messages
            if (data.guidance_office && data.guidance_office.length > 0) {
                updateChatMessages(data.guidance_office, 'guidance');
            }
            
            // Update faculty adviser messages
            if (data.faculty_adviser && data.faculty_adviser.length > 0) {
                updateChatMessages(data.faculty_adviser, 'faculty');
            }
            
            // Update unread counts
            updateUnreadCounts(data.unread_counts);
        }
    } catch (error) {
        console.error('Error polling for messages:', error);
    }
}

function updateChatMessages(messages, chatType) {
    const messagesContainer = document.getElementById(chatType === 'guidance' ? 'guidanceMessages' : 'facultyMessages');
    
    messages.forEach(message => {
        // Check if message already exists to avoid duplicates
        const existingMessage = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
        if (!existingMessage && message.admin_response) {
            // Add new admin response with message ID to prevent duplicates
            addMessageToChat(message.admin_response, 'admin', chatType, message.id);
            
            // Show notification if not on active tab
            const activeTab = document.querySelector('#consultationTabs .nav-link.active');
            const isActiveTab = (chatType === 'guidance' && activeTab.id === 'guidance-tab') ||
                              (chatType === 'faculty' && activeTab.id === 'faculty-tab');
            
            if (!isActiveTab) {
                showNotification(`New message from ${chatType === 'guidance' ? 'Guidance Office' : 'Faculty Adviser'}!`, 'info');
            }
        }
    });
}

function updateUnreadCounts(unreadCounts) {
    const guidanceUnread = document.getElementById('guidance-unread');
    const facultyUnread = document.getElementById('faculty-unread');
    
    if (unreadCounts.guidance_office > 0) {
        guidanceUnread.textContent = unreadCounts.guidance_office;
        guidanceUnread.style.display = 'inline';
    } else {
        guidanceUnread.style.display = 'none';
    }
    
    if (unreadCounts.faculty_adviser > 0) {
        facultyUnread.textContent = unreadCounts.faculty_adviser;
        facultyUnread.style.display = 'inline';
    } else {
        facultyUnread.style.display = 'none';
    }
}

function markAsRead(chatType) {
    // Mark messages as read when tab is opened
    fetch('/consultation/mark-read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrf_token]')?.value || ''
        },
        body: JSON.stringify({
            conversation_type: chatType === 'guidance' ? 'guidance_office' : 'faculty_adviser'
        })
    }).catch(error => {
        console.error('Error marking messages as read:', error);
    });
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 1060;
        max-width: 400px;
    `;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 150);
        }
    }, 3000);
}

function enhanceMessageTextarea(textarea) {
    // Auto-resize functionality
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });
    
    // Add helpful placeholder text
    const placeholders = [
        "I'm feeling overwhelmed with school work and need someone to talk to...",
        "I've been having trouble sleeping and it's affecting my daily life...",
        "I'm experiencing anxiety about upcoming exams...",
        "I need advice on how to manage stress better...",
        "I'm going through a difficult time and need support..."
    ];
    
    const randomPlaceholder = placeholders[Math.floor(Math.random() * placeholders.length)];
    textarea.placeholder = randomPlaceholder;
    
    // Rotate placeholder every 10 seconds when empty
    let placeholderInterval;
    
    textarea.addEventListener('focus', function() {
        if (this.value === '') {
            let index = 0;
            placeholderInterval = setInterval(() => {
                if (this.value === '') {
                    index = (index + 1) % placeholders.length;
                    this.placeholder = placeholders[index];
                }
            }, 10000);
        }
    });
    
    textarea.addEventListener('blur', function() {
        if (placeholderInterval) {
            clearInterval(placeholderInterval);
        }
    });
}

function setupFormValidation(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const messageTextarea = form.querySelector('textarea[name="message_text"]');
    
    form.addEventListener('submit', function(e) {
        const message = messageTextarea.value.trim();
        
        if (message.length < 10) {
            e.preventDefault();
            MindTrack.showAlert('Please write a message with at least 10 characters to help us understand your concern better.', 'warning');
            messageTextarea.focus();
            return;
        }
        
        if (message.length > 500) {
            e.preventDefault();
            MindTrack.showAlert('Please keep your message under 500 characters. You can send multiple messages if needed.', 'warning');
            messageTextarea.focus();
            return;
        }
        
        // Show loading state
        const hideLoading = MindTrack.showLoading(submitButton, 'Sending message...');
        
        // Add timeout to hide loading state if form submission takes too long
        setTimeout(() => {
            hideLoading();
        }, 10000);
    });
    
    // Real-time validation feedback
    messageTextarea.addEventListener('input', function() {
        const length = this.value.trim().length;
        
        if (length < 10) {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
        } else if (length <= 500) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
        }
    });
}

function addTypingIndicator(textarea) {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator mt-2';
    typingIndicator.style.display = 'none';
    typingIndicator.innerHTML = `
        <small class="text-muted">
            <i class="fas fa-pencil-alt me-1"></i>
            <span class="typing-text">Writing your message...</span>
            <span class="typing-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>
        </small>
    `;
    
    textarea.parentNode.appendChild(typingIndicator);
    
    let typingTimeout;
    
    textarea.addEventListener('input', function() {
        if (this.value.trim().length > 0) {
            typingIndicator.style.display = 'block';
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                typingIndicator.style.display = 'none';
            }, 2000);
        } else {
            typingIndicator.style.display = 'none';
        }
    });
    
    textarea.addEventListener('blur', function() {
        setTimeout(() => {
            typingIndicator.style.display = 'none';
        }, 1000);
    });
}

function addCharacterCounter(textarea) {
    const counter = document.createElement('div');
    counter.className = 'character-counter mt-2 text-end';
    counter.innerHTML = `
        <small class="text-muted">
            <span class="current-count">0</span>/<span class="max-count">500</span> characters
        </small>
    `;
    
    textarea.parentNode.appendChild(counter);
    
    const currentCount = counter.querySelector('.current-count');
    
    textarea.addEventListener('input', function() {
        const length = this.value.length;
        currentCount.textContent = length;
        
        if (length > 500) {
            counter.classList.add('text-danger');
            counter.classList.remove('text-muted');
        } else if (length > 400) {
            counter.classList.add('text-warning');
            counter.classList.remove('text-muted', 'text-danger');
        } else {
            counter.classList.add('text-muted');
            counter.classList.remove('text-warning', 'text-danger');
        }
    });
}

function setupMessageHistory() {
    const messageHistory = document.querySelector('.message-history');
    if (!messageHistory) return;
    
    // Add smooth scrolling to bottom when new messages appear
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                messageHistory.scrollTo({
                    top: messageHistory.scrollHeight,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    observer.observe(messageHistory, { childList: true });
    
    // Add click handlers for message items
    const messageItems = messageHistory.querySelectorAll('.message-item');
    messageItems.forEach(item => {
        item.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });
    });
    
    // Add animation for new messages
    messageItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.5s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function addQuickActions() {
    const form = document.querySelector('form[action*="consultation"]');
    if (!form) return;
    
    const quickActionsContainer = document.createElement('div');
    quickActionsContainer.className = 'quick-actions mb-3';
    quickActionsContainer.innerHTML = `
        <h6 class="fw-bold text-clsu-green mb-2">Quick Message Templates:</h6>
        <div class="quick-action-buttons d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline-primary btn-sm" data-template="stress">
                <i class="fas fa-head-side-cough me-1"></i>Stress & Anxiety
            </button>
            <button type="button" class="btn btn-outline-info btn-sm" data-template="academic">
                <i class="fas fa-graduation-cap me-1"></i>Academic Concerns
            </button>
            <button type="button" class="btn btn-outline-success btn-sm" data-template="social">
                <i class="fas fa-users me-1"></i>Social Issues
            </button>
            <button type="button" class="btn btn-outline-warning btn-sm" data-template="family">
                <i class="fas fa-home me-1"></i>Family Matters
            </button>
            <button type="button" class="btn btn-outline-danger btn-sm" data-template="crisis">
                <i class="fas fa-exclamation-triangle me-1"></i>Crisis Support
            </button>
        </div>
    `;
    
    form.insertBefore(quickActionsContainer, form.querySelector('.mb-4'));
    
    const templates = {
        stress: "I've been experiencing high levels of stress and anxiety lately. I'm finding it difficult to cope with daily activities and would appreciate some guidance on stress management techniques.",
        academic: "I'm struggling with academic pressures and need help managing my study schedule and exam anxiety. I feel overwhelmed with the workload and need strategies to improve my academic performance.",
        social: "I'm having difficulties with social interactions and relationships at school. I feel isolated and would like advice on how to build better connections with my peers.",
        family: "I'm experiencing some challenges at home that are affecting my well-being and school performance. I need someone to talk to about family-related stress and conflicts.",
        crisis: "I'm going through a very difficult time and need immediate support. I'm feeling overwhelmed and need professional guidance to help me through this situation."
    };
    
    const textarea = form.querySelector('textarea[name="message_text"]');
    const templateButtons = quickActionsContainer.querySelectorAll('[data-template]');
    
    templateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const template = this.dataset.template;
            const templateText = templates[template];
            
            if (textarea.value.trim() === '') {
                textarea.value = templateText;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
                textarea.focus();
                
                // Trigger validation
                textarea.dispatchEvent(new Event('input'));
                
                // Show confirmation
                MindTrack.showAlert('Template loaded! You can edit the message before sending.', 'info');
            } else {
                if (confirm('This will replace your current message. Continue?')) {
                    textarea.value = templateText;
                    textarea.style.height = 'auto';
                    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
                    textarea.focus();
                    textarea.dispatchEvent(new Event('input'));
                }
            }
        });
    });
}

function initializeMessagePolling() {
    // Check for new responses every 30 seconds
    let pollInterval;
    
    function startPolling() {
        pollInterval = setInterval(async () => {
            try {
                // This would typically check for new messages from the server
                // For now, we'll just update the timestamp
                const lastUpdate = document.querySelector('.last-update');
                if (lastUpdate) {
                    lastUpdate.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
                }
            } catch (error) {
                console.error('Error polling for messages:', error);
            }
        }, 30000);
    }
    
    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
    }
    
    // Start polling when page is visible
    if (document.visibilityState === 'visible') {
        startPolling();
    }
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            startPolling();
        } else {
            stopPolling();
        }
    });
    
    // Add last update indicator
    const messageHistory = document.querySelector('.message-history');
    if (messageHistory) {
        const lastUpdateIndicator = document.createElement('div');
        lastUpdateIndicator.className = 'last-update text-center mt-3';
        lastUpdateIndicator.innerHTML = `
            <small class="text-muted">
                <i class="fas fa-sync-alt me-1"></i>
                Last updated: ${new Date().toLocaleTimeString()}
            </small>
        `;
        messageHistory.parentNode.appendChild(lastUpdateIndicator);
    }
}

function initializeCrisisResources() {
    // Add emergency contact overlay
    const emergencyButton = document.createElement('button');
    emergencyButton.className = 'btn btn-danger position-fixed emergency-btn';
    emergencyButton.style.cssText = `
        bottom: 20px;
        left: 20px;
        z-index: 1050;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        font-size: 1.5rem;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
    `;
    emergencyButton.innerHTML = '<i class="fas fa-phone"></i>';
    emergencyButton.title = 'Emergency Support';
    
    document.body.appendChild(emergencyButton);
    
    emergencyButton.addEventListener('click', function() {
        showEmergencyModal();
    });
    
    // Pulse animation for visibility
    emergencyButton.style.animation = 'pulse 2s infinite';
    
    // Add CSS for pulse animation
    if (!document.querySelector('#emergency-styles')) {
        const style = document.createElement('style');
        style.id = 'emergency-styles';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .emergency-btn:hover {
                transform: scale(1.15) !important;
                animation: none !important;
            }
        `;
        document.head.appendChild(style);
    }
}

function showEmergencyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Emergency Support Resources
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <h6 class="fw-bold">
                            <i class="fas fa-heart me-2"></i>
                            You Are Not Alone
                        </h6>
                        <p class="mb-0">If you're experiencing a mental health crisis or having thoughts of self-harm, please reach out for immediate help. These resources are available 24/7.</p>
                    </div>
                    
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="emergency-contact-card">
                                <h6 class="fw-bold text-danger">
                                    <i class="fas fa-phone me-2"></i>
                                    Crisis Hotline
                                </h6>
                                <p class="h4 mb-1">988</p>
                                <p class="small text-muted">24/7 Crisis & Suicide Prevention</p>
                                <button class="btn btn-danger btn-sm" onclick="window.open('tel:988')">
                                    <i class="fas fa-phone me-1"></i>Call Now
                                </button>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="emergency-contact-card">
                                <h6 class="fw-bold text-info">
                                    <i class="fas fa-comment-alt me-2"></i>
                                    Crisis Text Line
                                </h6>
                                <p class="h5 mb-1">Text HOME to 741741</p>
                                <p class="small text-muted">24/7 Text-based Support</p>
                                <button class="btn btn-info btn-sm" onclick="window.open('sms:741741?body=HOME')">
                                    <i class="fas fa-sms me-1"></i>Text Now
                                </button>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="emergency-contact-card">
                                <h6 class="fw-bold text-success">
                                    <i class="fas fa-school me-2"></i>
                                    School Counselor
                                </h6>
                                <p class="h6 mb-1">(555) 123-4567</p>
                                <p class="small text-muted">During school hours</p>
                                <button class="btn btn-success btn-sm" onclick="window.open('tel:5551234567')">
                                    <i class="fas fa-phone me-1"></i>Call Office
                                </button>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="emergency-contact-card">
                                <h6 class="fw-bold text-warning">
                                    <i class="fas fa-hospital me-2"></i>
                                    Emergency Services
                                </h6>
                                <p class="h4 mb-1">911</p>
                                <p class="small text-muted">Life-threatening emergencies</p>
                                <button class="btn btn-warning btn-sm" onclick="window.open('tel:911')">
                                    <i class="fas fa-phone me-1"></i>Call 911
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4 p-3 bg-light rounded">
                        <h6 class="fw-bold text-clsu-green">Additional Resources:</h6>
                        <ul class="mb-0 small">
                            <li><strong>National Suicide Prevention Lifeline:</strong> 988 or 1-800-273-8255</li>
                            <li><strong>Crisis Text Line:</strong> Text HOME to 741741</li>
                            <li><strong>SAMHSA National Helpline:</strong> 1-800-662-4357</li>
                            <li><strong>Teen Line:</strong> 1-800-852-8336 (6-10 PM PST)</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="window.open('https://suicidepreventionlifeline.org/', '_blank')">
                        <i class="fas fa-external-link-alt me-1"></i>More Resources
                    </button>
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

// Add consultation-specific styles
const consultationStyles = `
    <style>
        .typing-indicator {
            opacity: 0;
            animation: fadeInOut 1.5s infinite;
        }
        
        @keyframes fadeInOut {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        
        .typing-dots span {
            animation: dot-blink 1.4s infinite;
        }
        
        .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes dot-blink {
            0%, 80%, 100% { opacity: 0; }
            40% { opacity: 1; }
        }
        
        .message-item {
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .message-item:hover {
            background: rgba(0, 88, 0, 0.05) !important;
        }
        
        .message-item.expanded {
            background: rgba(0, 88, 0, 0.1) !important;
        }
        
        .emergency-contact-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            height: 100%;
            text-align: center;
        }
        
        .emergency-contact-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .quick-action-buttons .btn {
            transition: all 0.3s ease;
        }
        
        .quick-action-buttons .btn:hover {
            transform: translateY(-1px);
        }
        
        .character-counter.text-danger {
            font-weight: bold;
        }
        
        @media (max-width: 768px) {
            .emergency-btn {
                bottom: 80px !important;
                width: 50px !important;
                height: 50px !important;
                font-size: 1.25rem !important;
            }
            
            .quick-action-buttons {
                flex-direction: column !important;
            }
            
            .quick-action-buttons .btn {
                width: 100%;
                margin-bottom: 0.5rem;
            }
        }
    </style>
`;

// Add consultation-specific styles to the document
document.head.insertAdjacentHTML('beforeend', consultationStyles);
