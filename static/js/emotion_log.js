// Emotion Logging JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeEmotionSelection();
    initializeFormValidation();
    // Set up comprehensive form monitoring
    setupFormMonitoring();
    updateSaveButtonState();
});

let selectedEmotions = [];

// Global variables and functions for emotion selection
let emotionsInput;
let selectedEmotionsContainer;
let selectedList;

function updateSelectedEmotions() {
    if (selectedEmotions.length > 0) {
        selectedEmotionsContainer.style.display = 'block';
        // Clear existing content safely
        selectedList.innerHTML = '';
        
        // Create badges using safe DOM methods
        selectedEmotions.forEach(emotion => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-clsu-green me-2 mb-2 p-2';
            
            // Create icon span safely
            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = getEmotionIcon(emotion); // getEmotionIcon returns controlled HTML
            
            // Create text node safely 
            const emotionText = document.createTextNode(' ' + emotion);
            
            // Create remove button safely
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-close btn-close-white ms-2';
            removeBtn.setAttribute('data-emotion', emotion);
            removeBtn.addEventListener('click', function() {
                removeEmotion(this.getAttribute('data-emotion'));
            });
            
            // Assemble the badge safely
            badge.appendChild(iconSpan);
            badge.appendChild(emotionText);
            badge.appendChild(removeBtn);
            
            selectedList.appendChild(badge);
        });
    } else {
        selectedEmotionsContainer.style.display = 'none';
    }
}

function updateHiddenInput() {
    if (emotionsInput) {
        emotionsInput.value = JSON.stringify(selectedEmotions);
    }
}

// Global function to remove emotions from badges
window.removeEmotion = function(emotion) {
    const emotionItem = document.querySelector(`[data-emotion="${emotion}"]`);
    if (emotionItem) {
        emotionItem.classList.remove('selected');
    }
    selectedEmotions = selectedEmotions.filter(e => e !== emotion);
    updateSelectedEmotions();
    updateHiddenInput();
    updateSaveButtonState();
};

function initializeEmotionSelection() {
    const emotionItems = document.querySelectorAll('.emotion-item');
    emotionsInput = document.querySelector('input[name="emotions"]');
    selectedEmotionsContainer = document.getElementById('selectedEmotions');
    
    if (selectedEmotionsContainer) {
        selectedList = selectedEmotionsContainer.querySelector('.selected-list');
    }

    emotionItems.forEach((item, index) => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const emotion = this.dataset.emotion;
            
            if (this.classList.contains('selected')) {
                // Remove emotion
                this.classList.remove('selected');
                selectedEmotions = selectedEmotions.filter(e => e !== emotion);
            } else {
                // Add emotion (no limit)
                this.classList.add('selected');
                selectedEmotions.push(emotion);
            }

            updateSelectedEmotions();
            updateHiddenInput();
            updateSaveButtonState();
        });
    });
}

function initializeFormValidation() {
    const form = document.getElementById('emotionForm');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function(e) {
        // Validate emotions selection
        if (selectedEmotions.length === 0) {
            e.preventDefault();
            alert('Please select at least one emotion.');
            
            // Scroll to emotions section
            document.querySelector('.emotion-grid').scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            return;
        }

// Form validation - no DASS-21 integration needed

        // Validate sleep hours
        const sleepInput = form.querySelector('input[name="sleep"]');
        const sleepValue = parseFloat(sleepInput.value);
        
        if (!sleepValue || sleepValue < 0 || sleepValue > 24) {
            e.preventDefault();
            alert('Please enter a valid number of sleep hours (0-24).');
            sleepInput.focus();
            return;
        }

        // Validate energy level
        const energyInput = form.querySelector('input[name="energy"]');
        const energyValue = parseInt(energyInput.value);
        
        if (!energyValue || energyValue < 1 || energyValue > 10) {
            e.preventDefault();
            alert('Please enter a valid energy level (1-10).');
            energyInput.focus();
            return;
        }

// No DASS-21 data to add - form submits normally

        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving your mood log...';
        
        // Form will submit normally, but we can add a timeout to re-enable if needed
        setTimeout(() => {
            if (submitButton.disabled) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-save me-2"></i>Save My Mood Log';
            }
        }, 10000); // 10 second timeout
    });

    // Real-time validation for numeric inputs
    const sleepInput = form.querySelector('input[name="sleep"]');
    const energyInput = form.querySelector('input[name="energy"]');

    sleepInput.addEventListener('input', function() {
        const value = parseFloat(this.value);
        
        if (value < 0 || value > 24 || isNaN(value)) {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
        } else if (value >= 0 && value <= 24) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        }
        updateSaveButtonState();
    });
    
    sleepInput.addEventListener('change', updateSaveButtonState);
    sleepInput.addEventListener('blur', updateSaveButtonState);

    energyInput.addEventListener('input', function() {
        const value = parseInt(this.value);
        
        if (value < 1 || value > 10 || isNaN(value)) {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
        } else if (value >= 1 && value <= 10) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        }
        updateSaveButtonState();
    });
    
    energyInput.addEventListener('change', updateSaveButtonState);
    energyInput.addEventListener('blur', updateSaveButtonState);

    // Auto-resize gratitude textarea
    const gratitudeTextarea = form.querySelector('textarea[name="gratitude"]');
    if (gratitudeTextarea) {
        gratitudeTextarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }
    
    // Add comprehensive event listeners for all form fields
    const triggersSelect = form.querySelector('select[name="triggers"]');
    const copingSelect = form.querySelector('select[name="coping"]');
    
    // Add multiple event types to catch all possible changes
    if (triggersSelect) {
        triggersSelect.addEventListener('change', updateSaveButtonState);
        triggersSelect.addEventListener('input', updateSaveButtonState);
    }
    
    if (copingSelect) {
        copingSelect.addEventListener('change', updateSaveButtonState);
        copingSelect.addEventListener('input', updateSaveButtonState);
    }
    
    // Also listen to textarea changes in case they affect validation
    if (gratitudeTextarea) {
        gratitudeTextarea.addEventListener('input', updateSaveButtonState);
        gratitudeTextarea.addEventListener('change', updateSaveButtonState);
    }
    
    // Call updateSaveButtonState after a short delay to handle any pre-filled values
    setTimeout(updateSaveButtonState, 100);
}

// Comprehensive form monitoring to fix save button validation
function setupFormMonitoring() {
    const form = document.getElementById('emotionForm');
    if (!form) return;
    
    // Get all form elements that affect validation
    const sleepInput = form.querySelector('input[name="sleep"]');
    const energyInput = form.querySelector('input[name="energy"]');
    const triggersSelect = form.querySelector('select[name="triggers"]');
    const copingSelect = form.querySelector('select[name="coping"]');
    const gratitudeTextarea = form.querySelector('textarea[name="gratitude"]');
    
    // Add multiple event types to ensure we catch all changes
    const eventTypes = ['input', 'change', 'blur', 'keyup', 'paste'];
    
    function addComprehensiveListeners(element, description) {
        if (!element) return;
        
        eventTypes.forEach(eventType => {
            element.addEventListener(eventType, function() {
                console.log(`${description} ${eventType} event triggered`);
                // Small delay to ensure the value has been updated
                setTimeout(updateSaveButtonState, 10);
            });
        });
    }
    
    // Apply listeners to all relevant form fields
    addComprehensiveListeners(sleepInput, 'Sleep input');
    addComprehensiveListeners(energyInput, 'Energy input');
    addComprehensiveListeners(triggersSelect, 'Triggers select');
    addComprehensiveListeners(copingSelect, 'Coping select');
    addComprehensiveListeners(gratitudeTextarea, 'Gratitude textarea');
    
    // Also monitor any changes to the form as a whole
    form.addEventListener('input', function(e) {
        console.log('Form input event:', e.target.name, e.target.value);
        setTimeout(updateSaveButtonState, 10);
    });
    
    form.addEventListener('change', function(e) {
        console.log('Form change event:', e.target.name, e.target.value);
        setTimeout(updateSaveButtonState, 10);
    });
    
    console.log('Form monitoring setup complete');
}

function getEmotionIcon(emotion) {
    const icons = {
        // Positive Emotions
        'Happy': '<i class="fas fa-smile"></i>',
        'Joyful': '<i class="fas fa-laugh-beam"></i>',
        'Excited': '<i class="fas fa-star"></i>',
        'Grateful': '<i class="fas fa-heart"></i>',
        'Proud': '<i class="fas fa-trophy"></i>',
        'Content': '<i class="fas fa-check-circle"></i>',
        'Loved': '<i class="fas fa-heart-circle"></i>',
        'Hopeful': '<i class="fas fa-sun"></i>',
        
        // Neutral Emotions
        'Calm': '<i class="fas fa-leaf"></i>',
        'Peaceful': '<i class="fas fa-dove"></i>',
        'Tired': '<i class="fas fa-bed"></i>',
        'Confused': '<i class="fas fa-question-circle"></i>',
        'Curious': '<i class="fas fa-search"></i>',
        'Surprised': '<i class="fas fa-surprise"></i>',
        
        // Challenging Emotions
        'Sad': '<i class="fas fa-frown"></i>',
        'Anxious': '<i class="fas fa-exclamation-triangle"></i>',
        'Stressed': '<i class="fas fa-head-side-cough"></i>',
        'Angry': '<i class="fas fa-angry"></i>',
        'Frustrated': '<i class="fas fa-fist-raised"></i>',
        'Overwhelmed': '<i class="fas fa-dizzy"></i>',
        'Lonely': '<i class="fas fa-user-times"></i>',
        'Disappointed': '<i class="fas fa-thumbs-down"></i>',
        'Worried': '<i class="fas fa-cloud-rain"></i>',
        'Insecure': '<i class="fas fa-user-shield"></i>',
        'Guilty': '<i class="fas fa-hand-paper"></i>'
    };
    
    return icons[emotion] || '<i class="fas fa-heart"></i>';
}

// Emotion suggestion system
function initializeEmotionSuggestions() {
    const emotionCategories = {
        positive: ['Happy', 'Joyful', 'Excited', 'Grateful', 'Proud', 'Content', 'Loved', 'Hopeful'],
        neutral: ['Calm', 'Peaceful', 'Tired', 'Confused', 'Curious', 'Surprised'],
        challenging: ['Sad', 'Anxious', 'Stressed', 'Angry', 'Frustrated', 'Overwhelmed', 'Lonely', 'Disappointed', 'Worried', 'Insecure', 'Guilty']
    };

    // Add quick selection buttons
    const emotionGrid = document.getElementById('emotionGrid');
    const quickSelectContainer = document.createElement('div');
    quickSelectContainer.className = 'quick-select-container mb-4';
    quickSelectContainer.innerHTML = `
        <h6 class="fw-bold text-clsu-green mb-3">Quick Select:</h6>
        <div class="quick-select-buttons">
            <button type="button" class="btn btn-outline-success btn-sm me-2 mb-2" onclick="selectEmotionCategory('positive')">
                <i class="fas fa-smile me-1"></i>Positive Emotions
            </button>
            <button type="button" class="btn btn-outline-warning btn-sm me-2 mb-2" onclick="selectEmotionCategory('neutral')">
                <i class="fas fa-meh me-1"></i>Neutral Emotions
            </button>
            <button type="button" class="btn btn-outline-danger btn-sm me-2 mb-2" onclick="selectEmotionCategory('challenging')">
                <i class="fas fa-frown me-1"></i>Challenging Emotions
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm mb-2" onclick="clearAllEmotions()">
                <i class="fas fa-times me-1"></i>Clear All
            </button>
        </div>
    `;

    emotionGrid.parentNode.insertBefore(quickSelectContainer, emotionGrid);

    // Global functions for quick selection
    window.selectEmotionCategory = function(category) {
        const emotions = emotionCategories[category];
        if (!emotions) return;

        // Clear current selection
        clearAllEmotions();

        // Select up to 3 random emotions from the category
        const shuffled = emotions.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        selected.forEach(emotion => {
            const emotionItem = document.querySelector(`[data-emotion="${emotion}"]`);
            if (emotionItem && !emotionItem.classList.contains('selected')) {
                emotionItem.click();
            }
        });
    };

    window.clearAllEmotions = function() {
        const selectedItems = document.querySelectorAll('.emotion-item.selected');
        selectedItems.forEach(item => item.click());
    };
}

// Context-aware emotion suggestions
function suggestEmotionsBasedOnTime() {
    const hour = new Date().getHours();
    let suggestions = [];

    if (hour >= 6 && hour < 12) {
        // Morning suggestions
        suggestions = ['Hopeful', 'Excited', 'Grateful', 'Energetic'];
    } else if (hour >= 12 && hour < 18) {
        // Afternoon suggestions
        suggestions = ['Focused', 'Content', 'Stressed', 'Productive'];
    } else if (hour >= 18 && hour < 22) {
        // Evening suggestions
        suggestions = ['Relaxed', 'Grateful', 'Tired', 'Peaceful'];
    } else {
        // Night suggestions
        suggestions = ['Tired', 'Peaceful', 'Worried', 'Calm'];
    }

    return suggestions;
}

// Energy and sleep correlation hints
function initializeCorrelationHints() {
    const sleepInput = document.querySelector('input[name="sleep"]');
    const energyInput = document.querySelector('input[name="energy"]');

    function updateHints() {
        const sleep = parseFloat(sleepInput.value) || 0;
        const energy = parseInt(energyInput.value) || 0;

        // Show hints based on sleep-energy correlation
        const hintContainer = document.querySelector('.correlation-hints') || createHintContainer();
        
        if (sleep < 6 && energy > 7) {
            showHint(hintContainer, 'Interesting! You have high energy despite limited sleep. Consider if caffeine or excitement is influencing your energy levels.', 'info');
        } else if (sleep > 9 && energy < 4) {
            showHint(hintContainer, 'You\'ve had plenty of sleep but low energy. This might indicate stress, poor sleep quality, or other factors affecting your rest.', 'warning');
        } else if (sleep >= 7 && sleep <= 9 && energy >= 6) {
            showHint(hintContainer, 'Great! Your sleep and energy levels suggest a healthy balance.', 'success');
        }
    }

    function createHintContainer() {
        const container = document.createElement('div');
        container.className = 'correlation-hints mt-3';
        energyInput.parentNode.appendChild(container);
        return container;
    }

    function showHint(container, message, type) {
        container.innerHTML = `
            <div class="alert alert-${type} alert-sm">
                <i class="fas fa-lightbulb me-2"></i>
                ${message}
            </div>
        `;
    }

    sleepInput.addEventListener('input', debounce(updateHints, 500));
    energyInput.addEventListener('input', debounce(updateHints, 500));
}

// Progressive enhancement for better UX
function enhanceFormExperience() {
    // Add progress indicator
    const form = document.getElementById('emotionForm');
    const progressBar = document.createElement('div');
    progressBar.className = 'progress mb-4';
    progressBar.innerHTML = `
        <div class="progress-bar bg-clsu-green" role="progressbar" style="width: 0%"></div>
    `;
    
    form.insertBefore(progressBar, form.firstChild);
    
    // Update progress as user fills form
    const requiredFields = form.querySelectorAll('input[required], select[required]');
    const progressBarFill = progressBar.querySelector('.progress-bar');
    
    function updateProgress() {
        let completed = 0;
        const totalSteps = requiredFields.length + 1; // +1 for emotions
        
        // Check emotions
        if (selectedEmotions.length > 0) completed++;
        
        // Check other required fields
        requiredFields.forEach(field => {
            if (field.value.trim() !== '') completed++;
        });
        
        const percentage = (completed / totalSteps) * 100;
        progressBarFill.style.width = percentage + '%';
        progressBarFill.textContent = Math.round(percentage) + '%';
    }
    
    // Add listeners to update progress
    requiredFields.forEach(field => {
        field.addEventListener('input', updateProgress);
        field.addEventListener('change', updateProgress);
    });
    
    // Update progress when emotions change
    const originalUpdateSelectedEmotions = window.updateSelectedEmotions;
    if (typeof originalUpdateSelectedEmotions === 'function') {
        window.updateSelectedEmotions = function() {
            originalUpdateSelectedEmotions();
            updateProgress();
        };
    }
}

// Initialize additional features
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeEmotionSuggestions();
        initializeCorrelationHints();
        enhanceFormExperience();
    }, 100);
});

// Add custom styles for emotion logging
const emotionLogStyles = `
    <style>
        .correlation-hints .alert-sm {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
        }
        
        .quick-select-buttons .btn {
            transition: all 0.3s ease;
        }
        
        .quick-select-buttons .btn:hover {
            transform: translateY(-1px);
        }
        
        .progress {
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-bar {
            transition: width 0.6s ease;
            font-size: 0.75rem;
            line-height: 8px;
        }
        
        .emotion-item {
            user-select: none;
            position: relative;
            overflow: hidden;
        }
        
        .emotion-item::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(0, 88, 0, 0.1);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.3s ease;
        }
        
        .emotion-item:hover::before {
            width: 100%;
            height: 100%;
        }
        
        .emotion-item.selected::before {
            width: 100%;
            height: 100%;
            background: rgba(0, 88, 0, 0.2);
        }
        
        .dass21-question {
            background: white;
            transition: all 0.3s ease;
        }
        
        .dass21-question:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .rating-option {
            cursor: pointer;
            padding: 0.5rem 1rem;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            background: white;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 50px;
        }
        
        .rating-option:hover {
            border-color: var(--clsu-gold);
            background: #fff8e1;
        }
        
        .rating-option input[type="radio"] {
            display: none;
        }
        
        .rating-option input[type="radio"]:checked + .rating-label {
            color: white;
        }
        
        .rating-option:has(input[type="radio"]:checked) {
            border-color: var(--clsu-green);
            background: var(--clsu-green);
            color: white;
        }
        
        .rating-label {
            font-weight: 600;
            font-size: 1rem;
        }
        
        .progress-text {
            position: absolute;
            width: 100%;
            text-align: center;
            line-height: 1.5rem;
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
        }
        
        @media (max-width: 768px) {
            .emotion-item {
                min-height: 80px;
                padding: 0.75rem;
            }
            
            .emotion-item i {
                font-size: 1.25rem;
            }
            
            .emotion-item span {
                font-size: 0.8rem;
            }
            
            .rating-options {
                justify-content: center;
            }
            
            .rating-option {
                min-width: 45px;
                padding: 0.4rem 0.8rem;
            }
        }
    </style>
`;

// Add custom emotion functionality
document.addEventListener('DOMContentLoaded', function() {
    const customEmotionInput = document.getElementById('customEmotion');
    const addCustomEmotionBtn = document.getElementById('addCustomEmotion');
    
    if (customEmotionInput && addCustomEmotionBtn) {
        addCustomEmotionBtn.addEventListener('click', function() {
            const customEmotion = customEmotionInput.value.trim();
            // Validate input: only allow alphanumeric characters, spaces, and basic punctuation
            if (customEmotion && /^[a-zA-Z0-9\s\-',.!?]+$/.test(customEmotion) && !selectedEmotions.includes(customEmotion) && customEmotion.length <= 50) {
                selectedEmotions.push(customEmotion);
                customEmotionInput.value = '';
                updateSelectedEmotions();
                updateHiddenInput();
                updateSaveButtonState();
            } else if (customEmotion && (!/^[a-zA-Z0-9\s\-',.!?]+$/.test(customEmotion) || customEmotion.length > 50)) {
                alert('Please enter a valid emotion using only letters, numbers, spaces, and basic punctuation (max 50 characters).');
            }
        });
        
        customEmotionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const customEmotion = customEmotionInput.value.trim();
                // Apply same validation as click handler
                if (customEmotion && /^[a-zA-Z0-9\s\-',.!?]+$/.test(customEmotion) && !selectedEmotions.includes(customEmotion) && customEmotion.length <= 50) {
                    selectedEmotions.push(customEmotion);
                    customEmotionInput.value = '';
                    updateSelectedEmotions();
                    updateHiddenInput();
                    updateSaveButtonState();
                } else if (customEmotion && (!/^[a-zA-Z0-9\s\-',.!?]+$/.test(customEmotion) || customEmotion.length > 50)) {
                    alert('Please enter a valid emotion using only letters, numbers, spaces, and basic punctuation (max 50 characters).');
                }
            }
        });
    }
});

// Simple debounce function
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

// Add emotion log specific styles to the document
document.head.insertAdjacentHTML('beforeend', emotionLogStyles);

// Daily Tips Modal functionality
function closeDailyTipsModal() {
    const modal = document.getElementById('dailyTipsModal');
    const backdrop = document.querySelector('.modal-backdrop');
    if (modal) {
        modal.style.display = 'none';
    }
    if (backdrop) {
        backdrop.style.display = 'none';
    }
    // Re-enable scrolling
    document.body.classList.remove('modal-open');
    // Redirect to home after closing modal
    window.location.href = '/home';
}

// Initialize modal when page loads (for tips display)
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('dailyTipsModal');
    if (modal) {
        // Disable scrolling when modal is shown
        document.body.classList.add('modal-open');
    }
});





function updateSaveButtonState() {
    const submitButton = document.getElementById('saveMoodLogBtn');
    const completionMessage = document.getElementById('completionMessage');
    const form = document.getElementById('emotionForm');

    if (!submitButton || !completionMessage || !form) {
        console.warn('Missing elements for save button validation');
        return;
    }

    // Check if DASS-21 assessment is available
    const dassAlert = document.querySelector('.alert.alert-info');
    if (dassAlert && dassAlert.textContent.includes('Mental Wellness Assessment Available')) {
        submitButton.disabled = true;
        submitButton.classList.add('btn-secondary');
        submitButton.classList.remove('btn-clsu-green');
        completionMessage.textContent = 'Please take the DASS-21 Assessment first.';
        completionMessage.classList.add('text-muted');
        completionMessage.classList.remove('text-success');
        return;
    }

    // Check if all required fields are filled
    const sleepInput = form.querySelector('input[name="sleep"]');
    const energyInput = form.querySelector('input[name="energy"]');
    const triggersInput = form.querySelector('select[name="triggers"]');
    
    // Emotion validation - this should be first and most important
    const hasEmotions = selectedEmotions && selectedEmotions.length > 0;
    
    // Other field validations - get current values
    const sleepValue = sleepInput ? parseFloat(sleepInput.value) : NaN;
    const hasSleep = sleepInput && sleepInput.value.trim() !== '' && !isNaN(sleepValue) && sleepValue >= 0 && sleepValue <= 24;
    
    const energyValue = energyInput ? parseInt(energyInput.value) : NaN;
    const hasEnergy = energyInput && energyInput.value.trim() !== '' && !isNaN(energyValue) && energyValue >= 1 && energyValue <= 10;
    
    const hasTriggers = triggersInput && triggersInput.value && triggersInput.value !== '' && triggersInput.value !== null;
    
    // Debug logging to track validation state
    console.log('Validation check:', {
        hasEmotions,
        hasSleep,
        hasEnergy,
        hasTriggers,
        sleepValue: sleepInput?.value,
        energyValue: energyInput?.value,
        triggersValue: triggersInput?.value,
        selectedEmotions: selectedEmotions.length
    });
    
    // Priority-based messaging and validation
    if (!hasEmotions) {
        // First priority: select emotions
        submitButton.disabled = true;
        submitButton.classList.add('btn-secondary');
        submitButton.classList.remove('btn-clsu-green');
        completionMessage.textContent = 'Please select at least one emotion to continue.';
        completionMessage.classList.add('text-muted');
        completionMessage.classList.remove('text-success');
        console.log('Save button disabled: No emotions selected');
    } else if (hasEmotions && (!hasSleep || !hasEnergy || !hasTriggers)) {
        // Second priority: fill other required fields
        submitButton.disabled = true;
        submitButton.classList.add('btn-secondary');
        submitButton.classList.remove('btn-clsu-green');
        
        let missingFields = [];
        if (!hasSleep) missingFields.push('sleep hours');
        if (!hasEnergy) missingFields.push('energy level');
        if (!hasTriggers) missingFields.push('main trigger');
        
        completionMessage.textContent = `Great! Now please fill in: ${missingFields.join(', ')}.`;
        completionMessage.classList.add('text-muted');
        completionMessage.classList.remove('text-success');
        console.log('Save button disabled: Missing fields:', missingFields);
    } else {
        // All fields completed
        submitButton.disabled = false;
        submitButton.classList.remove('btn-secondary');
        submitButton.classList.add('btn-clsu-green');
        completionMessage.textContent = 'Perfect! Ready to save your mood log.';
        completionMessage.classList.add('text-success');
        completionMessage.classList.remove('text-muted');
        console.log('Save button ENABLED: All fields complete');
    }
}
