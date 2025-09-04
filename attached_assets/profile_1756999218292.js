document.addEventListener('DOMContentLoaded', function() {
    // Register the Chart.js Data Labels plugin globally, if you plan to use it (was in original JS)
    // Chart.register(ChartDataLabels); // Ensure you've loaded this CDN if you want it:
                                     // <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>


    const viewLogsBtn = document.getElementById('viewLogsBtn');
    const viewInsightsBtn = document.getElementById('viewInsightsBtn');

    const emotionLogModal = document.getElementById('emotionLogModal');
    const logDetailsModal = document.getElementById('logDetailsModal');
    const insightsModal = document.getElementById('insightsModal');

    // Select all elements that have the class 'close' and are inside a 'modal'
    const closeButtons = document.querySelectorAll('.modal .close');

    const logHistoryContent = document.getElementById('logHistoryContent');
    const logDetailsContent = document.getElementById('logDetailsContent');
    const insightsContentArea = document.getElementById('insightsContent'); // Use the direct ID for insights content


    let currentChartInstances = {}; // To store Chart.js instances for destruction


    // --- Modal Control Functions ---
    function openModal(modalElement) {
        modalElement.classList.add('is-active');
        document.body.classList.add('modal-open');
    }

    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('is-active');
        });
        document.body.classList.remove('modal-open');
        // Destroy existing charts when modals are closed to prevent memory leaks and conflicts
        destroyCharts();
    }

    function destroyCharts() {
        for (const chartId in currentChartInstances) {
            if (currentChartInstances[chartId]) {
                currentChartInstances[chartId].destroy();
                currentChartInstances[chartId] = null;
            }
        }
    }


    // --- Event Listeners for Buttons ---
    if (viewLogsBtn) {
        viewLogsBtn.addEventListener('click', function() {
            openModal(emotionLogModal);
            loadEmotionLogs(1); // Load first page of logs
        });
    }

    if (viewInsightsBtn) {
        viewInsightsBtn.addEventListener('click', function() {
            openModal(insightsModal);
            loadInsights();
        });
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Close modal when clicking outside of modal content
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal.is-active').forEach(modal => {
            if (event.target === modal) {
                closeAllModals();
            }
        });
    });


    // --- Load Emotion Logs Function ---
    function loadEmotionLogs(page) {
        logHistoryContent.innerHTML = '<p class="info-message">Loading logs...</p>';
        // The userId is available globally in profile.php, but it's good practice
        // to pass it explicitly in AJAX or use an HTML data attribute
        // For now, it's not strictly needed as PHP handles session internally for get_logs.php
        fetch(`get_logs.php?page=${page}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.text(); // Get text as it directly outputs HTML
            })
            .then(html => {
                logHistoryContent.innerHTML = html;
                // Add event listeners to newly loaded pagination buttons
                logHistoryContent.querySelectorAll('.pagination-link').forEach(button => {
                    button.addEventListener('click', function(event) {
                        event.preventDefault(); // Prevent default link behavior if any
                        const newPage = this.dataset.page;
                        loadEmotionLogs(newPage);
                    });
                });
            })
            .catch(error => {
                console.error('Error loading emotion logs:', error);
                logHistoryContent.innerHTML = '<p class="error-message">Failed to load logs. Please try again.</p>';
            });
    }

    // --- Show Log Details Function (Global, so it can be called from onclick attribute) ---
    window.showLogDetails = function(logId) {
        openModal(logDetailsModal);
        logDetailsContent.innerHTML = '<p class="info-message">Loading details...</p>';
        fetch(`get_log_details.php?log_id=${logId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.text(); // Get text as it directly outputs HTML
            })
            .then(html => {
                logDetailsContent.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading log details:', error);
                logDetailsContent.innerHTML = '<p class="error-message">Failed to load details. Please try again.</p>';
            });
    };

    // --- Load Psychological Insights Function (This is where the main "fix" occurred in previous step) ---
    function loadInsights() {
        // Clear previous chart instances and content
        destroyCharts();
        insightsContentArea.innerHTML = '<p class="info-message">Generating insights...</p>';

        fetch('get_insights.php')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json(); // Expect JSON response
            })
            .then(data => {
                console.log("Insights Data:", data); // Debug: check the full data structure

                // Check for general error or insufficient data
                if (data.error || data.total_logs === 0) {
                     insightsContentArea.innerHTML = `
                         <p class="error-message">${data.error || 'No sufficient log data yet to generate detailed insights. Keep logging your mood daily to see your emotional patterns emerge!'}</p>
                         <p class="info-message">Here's a quick summary based on what we have:</p>
                         <div class="insights-summary-text">
                             <p><strong>Most Common Emotion:</strong> ${data.most_common_emotion || 'No data'}</p>
                             <p><strong>Average Sleep:</strong> ${data.average_sleep_all_time !== null ? data.average_sleep_all_time + ' hours' : 'No data'}</p>
                             <p><strong>Most Frequent Trigger:</strong> ${data.most_frequent_trigger || 'No data'}</p>
                             <p><strong>Most Frequent Coping:</strong> ${data.most_frequent_coping || 'No data'}</p>
                         </div>
                     `;
                     return; // Stop execution if no data or error
                   }

                // Re-populate the insights content with the dynamic data
                // This structure should match the HTML elements defined in profile.php for insightsModal
                insightsContentArea.innerHTML = `
                     <p class="intro-insight">
                         Here's a summary of patterns observed in your mood logs. Use these insights to better understand your emotional landscape.
                     </p>

                     <div class="insights-section">
                         <h3>Emotion Distribution</h3>
                         <p id="emotionSummaryText"></p>
                         <div class="chart-container">
                             <canvas id="emotionChart"></canvas>
                         </div>
                     </div>

                     <div class="insights-section">
                         <h3>Sleep Patterns</h3>
                         <p id="sleepSummaryText"></p>
                         <div class="chart-container">
                             <canvas id="sleepChart"></canvas>
                         </div>
                     </div>

                     <div class="insights-section">
                         <h3>Common Triggers</h3>
                         <p id="triggerSummaryText"></p>
                         <div class="chart-container">
                             <canvas id="triggerChart"></canvas>
                         </div>
                     </div>

                     <div class="insights-section">
                         <h3>Coping Mechanisms</h3>
                         <p id="copingSummaryText"></p>
                         <div class="chart-container">
                             <canvas id="copingChart"></canvas>
                         </div>
                     </div>

                     <div class="insights-section">
                         <h3>Overall Summary</h3>
                         <div class="insights-summary-text">
                             <p id="overallSummaryText"></p>
                         </div>
                     </div>

                     <p class="final-thoughts">
                         Remember, this tool is here to help you gain self-awareness. If you feel overwhelmed or need further support, the Senior Highs' Guidance Office is here for you! 💚
                     </p>
                     <p class="gratitude-note">Latest gratitude entry: <span id="latestGratitudeEntry"></span></p>
                 `;

                // Populate summary texts using innerHTML because PHP now outputs <strong> tags
                document.getElementById('emotionSummaryText').innerHTML = data.psychological_summary.emotion_summary;
                document.getElementById('sleepSummaryText').innerHTML = data.psychological_summary.sleep_summary;
                document.getElementById('triggerSummaryText').innerHTML = data.psychological_summary.trigger_summary;
                document.getElementById('copingSummaryText').innerHTML = data.psychological_summary.coping_summary;
                document.getElementById('overallSummaryText').innerHTML = data.psychological_summary.overall_summary;
                document.getElementById('latestGratitudeEntry').textContent = data.latest_gratitude; // Use textContent for raw text

                // --- Render Charts using Chart.js ---
                // Helper to get consistent background colors for charts
                function getChartColors(count, type = 'pastel') {
                    const colors = {
                        pastel: [
                            '#FFC107', '#28A745', '#007BFF', '#6C757D', '#DC3545', '#17A2B8', '#FD7E14', '#E83E8C', '#6F42C1', '#20C997',
                            '#FFE0B2', '#C8E6C9', '#BBDEFB', '#E0E0E0', '#FFCDD2', '#B2EBF2', '#FFECB3', '#F8BBD0', '#D1C4E9', '#B2DFDB'
                        ],
                        vibrant: [
                            '#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#FF5722', '#00BCD4', '#8BC34A', '#E91E63', '#607D8B', '#795548',
                            '#F44336', '#03A9F4', '#FFC107', '#673AB7', '#009688', '#CDDC39', '#FFEB3B', '#9E9E9E', '#7B1FA2', '#00796B'
                        ]
                    };
                    const selectedColors = colors[type];
                    return Array.from({ length: count }, (_, i) => selectedColors[i % selectedColors.length]);
                }


                // Emotion Chart (Pie Chart)
                if (data.emotion_distribution.labels.length > 0) {
                    const emotionCtx = document.getElementById('emotionChart').getContext('2d');
                    const backgroundColors = getChartColors(data.emotion_distribution.labels.length, 'pastel');

                    currentChartInstances.emotionChart = new Chart(emotionCtx, {
                        type: 'pie',
                        data: {
                            labels: data.emotion_distribution.labels,
                            datasets: [{
                                data: data.emotion_distribution.values,
                                backgroundColor: backgroundColors,
                                borderColor: '#fff',
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'right',
                                    labels: {
                                        font: {
                                            size: 14,
                                            family: 'Poppins'
                                        }
                                    }
                                },
                                title: {
                                    display: false,
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            let label = context.label || '';
                                            if (label) {
                                                label += ': ';
                                            }
                                            if (context.parsed !== null) {
                                                label += context.parsed + '%';
                                            }
                                            return label;
                                        }
                                    }
                                }
                            }
                        }
                    });
                } else {
                    document.getElementById('emotionChart').parentElement.innerHTML = '<p class="info-message">Not enough emotion data to display a chart yet.</p>';
                }


                // Sleep Chart (Line Chart for last 7 days)
                if (data.sleep_data.labels.length > 0) {
                    const sleepCtx = document.getElementById('sleepChart').getContext('2d');
                    const borderColors = getChartColors(1, 'vibrant')[0];

                    currentChartInstances.sleepChart = new Chart(sleepCtx, {
                        type: 'line',
                        data: {
                            labels: data.sleep_data.labels,
                            datasets: [{
                                label: 'Hours of Sleep',
                                data: data.sleep_data.values,
                                borderColor: borderColors,
                                backgroundColor: 'rgba(0, 123, 255, 0.2)', // Light blue fill
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: borderColors,
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 5,
                                pointHoverRadius: 7
                            },
                            {
                                label: 'Average Sleep',
                                data: Array(data.sleep_data.labels.length).fill(data.average_sleep_all_time),
                                borderColor: 'rgba(255, 99, 132, 0.7)',
                                borderDash: [5, 5],
                                fill: false,
                                pointRadius: 0,
                                pointHoverRadius: 0,
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Hours',
                                        font: { family: 'Poppins', size: 14 }
                                    },
                                    ticks: {
                                        stepSize: 1
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Last 7 Logged Days',
                                        font: { family: 'Poppins', size: 14 }
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                    labels: {
                                        font: {
                                            size: 14,
                                            family: 'Poppins'
                                        }
                                    }
                                },
                                title: {
                                    display: false,
                                }
                            }
                        }
                    });
                } else {
                    document.getElementById('sleepChart').parentElement.innerHTML = '<p class="info-message">Not enough sleep data to display a chart yet.</p>';
                }


                // Trigger Chart (Bar Chart)
                if (data.trigger_distribution.labels.length > 0) {
                    const triggerCtx = document.getElementById('triggerChart').getContext('2d');
                    const backgroundColors = getChartColors(data.trigger_distribution.labels.length, 'vibrant');

                    currentChartInstances.triggerChart = new Chart(triggerCtx, {
                        type: 'bar',
                        data: {
                            labels: data.trigger_distribution.labels,
                            datasets: [{
                                label: 'Occurrences',
                                data: data.trigger_distribution.values,
                                backgroundColor: backgroundColors,
                                borderColor: backgroundColors.map(color => color.replace('0.2)', '1)')), // Darker border
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y', // Make it a horizontal bar chart
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Count',
                                        font: { family: 'Poppins', size: 14 }
                                    },
                                    ticks: {
                                        precision: 0
                                    }
                                },
                                y: {
                                    title: {
                                        display: false,
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                },
                                title: {
                                    display: false,
                                }
                            }
                        }
                    });
                } else {
                    document.getElementById('triggerChart').parentElement.innerHTML = '<p class="info-message">Not enough trigger data to display a chart yet.</p>';
                }


                // Coping Chart (Bar Chart)
                if (data.coping_distribution.labels.length > 0) {
                    const copingCtx = document.getElementById('copingChart').getContext('2d');
                    const backgroundColors = getChartColors(data.coping_distribution.labels.length, 'vibrant');

                    currentChartInstances.copingChart = new Chart(copingCtx, {
                        type: 'bar',
                        data: {
                            labels: data.coping_distribution.labels,
                            datasets: [{
                                label: 'Occurrences',
                                data: data.coping_distribution.values,
                                backgroundColor: backgroundColors,
                                borderColor: backgroundColors.map(color => color.replace('0.2)', '1)')), // Darker border
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y', // Make it a horizontal bar chart
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Count',
                                        font: { family: 'Poppins', size: 14 }
                                    },
                                    ticks: {
                                        precision: 0
                                    }
                                },
                                y: {
                                    title: {
                                        display: false,
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                },
                                title: {
                                    display: false,
                                }
                            }
                        }
                    });
                } else {
                    document.getElementById('copingChart').parentElement.innerHTML = '<p class="info-message">Not enough coping mechanism data to display a chart yet.</p>';
                }

            })
            .catch(error => {
                console.error('Error loading insights:', error);
                insightsContentArea.innerHTML = '<p class="error-message">Failed to load insights. Please try again later.</p>';
            });
    }

    // --- DASS-21 Button and Modal Code ---
    // Get a reference to the new DASS-21 button and modal
    const viewDASSInsightsBtn = document.getElementById('viewDASSInsightsBtn');
    const dassInsightsModal = document.getElementById('dassInsightsModal');
    const dassInsightsContent = document.getElementById('dassInsightsContent');

    // Event listener for the DASS-21 button
    if (viewDASSInsightsBtn) {
        viewDASSInsightsBtn.addEventListener('click', () => {
            // Use the standardized function to open the modal
            openModal(dassInsightsModal); 

            // Show a loading message
            dassInsightsContent.innerHTML = '<p class="info-message">Loading DASS-21 insights...</p>';

            // Fetch DASS-21 data from the new PHP endpoint
            fetch('dass-21/get_dass_insights.php')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Now, load the full content and then render the data
                        dassInsightsContent.innerHTML = `
                             <p class="intro-insight">
                                 Hello, <strong class="student-name"></strong>! This evaluation provides a snapshot of your emotional state. Please remember it is not a diagnosis.
                             </p>
                             <div class="dass-results-container">
                                 <div class="dass-section" id="depressionSection">
                                     <h3>Depression</h3>
                                     <div class="dass-score-display">
                                         <p>Score: <span class="dass-score" id="depressionScore">--</span></p>
                                         <span class="dass-severity" id="depressionSeverity">--</span>
                                     </div>
                                 </div>
                                 <div class="dass-section" id="anxietySection">
                                     <h3>Anxiety</h3>
                                     <div class="dass-score-display">
                                         <p>Score: <span class="dass-score" id="anxietyScore">--</span></p>
                                         <span class="dass-severity" id="anxietySeverity">--</span>
                                     </div>
                                 </div>
                                 <div class="dass-section" id="stressSection">
                                     <h3>Stress</h3>
                                     <div class="dass-score-display">
                                         <p>Score: <span class="dass-score" id="stressScore">--</span></p>
                                         <span class="dass-severity" id="stressSeverity">--</span>
                                     </div>
                                 </div>
                             </div>
                             <div class="dass-overall-summary">
                                 <h4>What This Means:</h4>
                                 <p id="overallSummaryText"></p>
                             </div>
                             <div class="recommendations">
                                 <h4>Personalized Recommendations:</h4>
                                 <ul id="recommendationsList"></ul>
                             </div>
                             <p class="final-note">
                                 Your emotional journey is a continuous process. These results are a testament to your resilience. We are here to support you at every stage.
                                 <br>
                                 <br>
                                 <strong class="guidance-office-note">If you or a friend ever feel overwhelmed, please reach out to the Guidance Office. You are not alone! 💚</strong>
                             </p>
                         `;
                        // Now, call the rendering function
                        renderDASSInsights(data.data);
                    } else {
                        dassInsightsContent.innerHTML = `<p class="error-message">${data.message}</p>`;
                    }
                })
                .catch(error => {
                    console.error('Error fetching DASS-21 insights:', error);
                    dassInsightsContent.innerHTML = `<p class="error-message">An error occurred. Please try again later.</p>`;
                });
        });
    }

    // Add event listeners to all close buttons
    document.querySelectorAll('.modal .delete, .modal-close').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Function to render the DASS-21 insights
    function renderDASSInsights(dassData) {
        // Get HTML elements to populate (they now exist!)
        const depressionScoreEl = document.getElementById('depressionScore');
        const anxietyScoreEl = document.getElementById('anxietyScore');
        const stressScoreEl = document.getElementById('stressScore');
        const depressionSeverityEl = document.getElementById('depressionSeverity');
        const anxietySeverityEl = document.getElementById('anxietySeverity');
        const stressSeverityEl = document.getElementById('stressSeverity');
        const overallSummaryEl = document.getElementById('overallSummaryText');
        const recommendationsListEl = document.getElementById('recommendationsList');

        // Populate scores and severities
        if (depressionScoreEl) depressionScoreEl.textContent = dassData.depression_score;
        if (anxietyScoreEl) anxietyScoreEl.textContent = dassData.anxiety_score;
        if (stressScoreEl) stressScoreEl.textContent = dassData.stress_score;
        if (depressionSeverityEl) {
            depressionSeverityEl.textContent = dassData.depression_severity;
            depressionSeverityEl.className = `dass-severity severity-${dassData.depression_severity.replace(/\s+/g, '-')}`;
        }
        if (anxietySeverityEl) {
            anxietySeverityEl.textContent = dassData.anxiety_severity;
            anxietySeverityEl.className = `dass-severity severity-${dassData.anxiety_severity.replace(/\s+/g, '-')}`;
        }
        if (stressSeverityEl) {
            stressSeverityEl.textContent = dassData.stress_severity;
            stressSeverityEl.className = `dass-severity severity-${dassData.stress_severity.replace(/\s+/g, '-')}`;
        }

        // Generate and display overall summary and recommendations
        const summary = generateSummary(dassData);
        if (overallSummaryEl) overallSummaryEl.textContent = summary.overallText;
        
        if (recommendationsListEl) {
            recommendationsListEl.innerHTML = ''; // Clear previous items
            summary.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationsListEl.appendChild(li);
            });
        }
    }

    function generateSummary(dassData) {
        let summary = {
            overallText: "",
            recommendations: []
        };

        const severityOrder = ["Normal", "Mild", "Moderate", "Severe", "Extremely Severe"];

        // Determine the highest severity level
        let highestSeverity = "Normal";
        if (severityOrder.indexOf(dassData.depression_severity) > severityOrder.indexOf(highestSeverity)) {
            highestSeverity = dassData.depression_severity;
        }
        if (severityOrder.indexOf(dassData.anxiety_severity) > severityOrder.indexOf(highestSeverity)) {
            highestSeverity = dassData.anxiety_severity;
        }
        if (severityOrder.indexOf(dassData.stress_severity) > severityOrder.indexOf(highestSeverity)) {
            highestSeverity = dassData.stress_severity;
        }

        switch (highestSeverity) {
            case "Normal":
                summary.overallText = "Your scores suggest you're currently in a stable emotional state. This is a great time to focus on maintaining a healthy lifestyle and continue your self-care practices.";
                summary.recommendations = [
                    "Continue to practice mindfulness and gratitude journaling.",
                    "Maintain a healthy sleep schedule and balanced diet.",
                    "Engage in hobbies and social activities that bring you joy."
                ];
                break;
            case "Mild":
                summary.overallText = "Your scores indicate a mild level of emotional distress. This is a good time to be proactive and address these feelings before they become more significant.";
                summary.recommendations = [
                    "Pay closer attention to your mood triggers and daily habits.",
                    "Consider talking to a trusted friend, family member, or teacher.",
                    "Incorporate more stress-reduction techniques like deep breathing or light exercise."
                ];
                break;
            case "Moderate":
                summary.overallText = "Your scores show a moderate level of emotional distress. This may be impacting your daily life, and it's important to take these feelings seriously.";
                summary.recommendations = [
                    "Schedule a meeting with the Guidance Office to discuss your results and feelings.",
                    "Prioritize self-care, including adequate sleep and nutrition.",
                    "Practice grounding techniques when you feel overwhelmed."
                ];
                break;
            case "Severe":
                summary.overallText = "Your scores suggest a severe level of emotional distress. This may be causing significant difficulty in your daily functioning. It is crucial to seek support.";
                summary.recommendations = [
                    "It is highly recommended that you speak with a Guidance Counselor as soon as possible.",
                    "Focus on basic needs like sleep and eating, and avoid isolating yourself.",
                    "Try to connect with someone you trust and let them know how you're feeling."
                ];
                break;
            case "Extremely Severe":
                summary.overallText = "Your scores indicate an extremely severe level of emotional distress. This suggests you are in significant need of immediate support.";
                summary.recommendations = [
                    "Please reach out to the Guidance Office or a crisis hotline immediately. They are trained to help.",
                    "Inform a trusted adult—a parent, guardian, or teacher—of your results and how you are feeling.",
                    "Do not try to manage these feelings alone. Professional help is available and can make a big difference."
                ];
                break;
        }

        return summary;
    }

}); // End DOMContentLoaded