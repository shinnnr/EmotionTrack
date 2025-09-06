// Emotion Logging JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeEmotionSelection();
    initializeFormValidation();
});

let selectedEmotions = [];

function initializeEmotionSelection() {
    const emotionItems = document.querySelectorAll('.emotion-item');
    const emotionsInput = document.querySelector('input[name="emotions"]');
    const selectedEmotionsContainer = document.getElementById('selectedEmotions');
    const selectedList = selectedEmotionsContainer.querySelector('.selected-list');

    emotionItems.forEach(item => {
        item.addEventListener('click', function() {
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
        });
    });

    function updateSelectedEmotions() {
        if (selectedEmotions.length > 0) {
            selectedEmotionsContainer.style.display = 'block';
            selectedList.innerHTML = selectedEmotions.map(emotion => `
                <span class="badge bg-clsu-green me-2 mb-2 p-2">
                    ${getEmotionIcon(emotion)} ${emotion}
                    <button type="button" class="btn-close btn-close-white ms-2" onclick="removeEmotion('${emotion}')"></button>
                </span>
            `).join('');
        } else {
            selectedEmotionsContainer.style.display = 'none';
        }
    }

    function updateHiddenInput() {
        emotionsInput.value = JSON.stringify(selectedEmotions);
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
    };
}

function initializeFormValidation() {
    const form = document.getElementById('emotionForm');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function(e) {
        // Validate emotions selection
        if (selectedEmotions.length === 0) {
            e.preventDefault();
            MindTrack.showAlert('Please select at least one emotion.', 'warning');
            
            // Scroll to emotions section
            document.querySelector('.emotion-grid').scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            return;
        }

        // Validate sleep hours
        const sleepInput = form.querySelector('input[name="sleep"]');
        const sleepValue = parseFloat(sleepInput.value);
        
        if (!sleepValue || sleepValue < 0 || sleepValue > 24) {
            e.preventDefault();
            MindTrack.showAlert('Please enter a valid number of sleep hours (0-24).', 'warning');
            sleepInput.focus();
            return;
        }

        // Validate energy level
        const energyInput = form.querySelector('input[name="energy"]');
        const energyValue = parseInt(energyInput.value);
        
        if (!energyValue || energyValue < 1 || energyValue > 10) {
            e.preventDefault();
            MindTrack.showAlert('Please enter a valid energy level (1-10).', 'warning');
            energyInput.focus();
            return;
        }

        // Show loading state
        const hideLoading = MindTrack.showLoading(submitButton, 'Saving your mood log...');
        
        // Form will submit normally, but we can add a timeout to hide loading if needed
        setTimeout(() => {
            hideLoading();
        }, 10000); // 10 second timeout
    });

    // Real-time validation for numeric inputs
    const sleepInput = form.querySelector('input[name="sleep"]');
    const energyInput = form.querySelector('input[name="energy"]');

    sleepInput.addEventListener('input', function() {
        const value = parseFloat(this.value);
        const feedback = this.nextElementSibling;
        
        if (value < 0 || value > 24) {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
        } else if (value >= 0 && value <= 24) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        }
    });

    energyInput.addEventListener('input', function() {
        const value = parseInt(this.value);
        
        if (value < 1 || value > 10) {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
        } else if (value >= 1 && value <= 10) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        }
    });

    // Auto-resize gratitude textarea
    const gratitudeTextarea = form.querySelector('textarea[name="gratitude"]');
    if (gratitudeTextarea) {
        gratitudeTextarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }
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

    sleepInput.addEventListener('input', MindTrack.debounce(updateHints, 500));
    energyInput.addEventListener('input', MindTrack.debounce(updateHints, 500));
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
        }
    </style>
`;

// Add emotion log specific styles to the document
document.head.insertAdjacentHTML('beforeend', emotionLogStyles);
