document.addEventListener("DOMContentLoaded", function () {
    // Retrieve userId from the global appConfig set in profile.php
    const userId = window.appConfig.userId;

    if (!userId) {
        console.error("User ID not found in window.appConfig.userId. Cannot load dashboard data.");
        // Optionally, redirect to login or display an error message on the page
        return;
    }

    // --- Chart Instances ---
    let emotionTrendChart;
    let emotionDistributionChart;
    let triggerCopingChart;
    let sleepEmotionChart;

    const emotionColors = {
        'Ecstatic': '#28a745', // Very Positive Green
        'Joyful': '#28a745',
        'Excited': '#87CEEB', // Lighter Blue
        'Happy': '#87CEEB',
        'Hopeful': '#ADD8E6', // Light Blue
        'Optimistic': '#ADD8E6',
        'Content': '#90EE90', // Light Green
        'Calm': '#D3D3D3', // Light Gray (Neutral)
        'Neutral': '#D3D3D3',
        'Indifferent': '#D3D3D3',
        'Sad': '#FFD700', // Gold (Slightly negative, warning)
        'Anxious': '#FFA500', // Orange (Moderate negative)
        'Frustrated': '#FFA500',
        'Angry': '#dc3545', // Red (Very negative)
        'Fearful': '#dc3545',
        'Despair': '#8B0000', // Dark Red
        'Hopeless': '#8B0000',
        'Overwhelmed': '#FF4500', // Orange-Red
        'Distraught': '#FF4500',
        'Tired': '#6c757d', // Grey
        'Stressed': '#ffc107', // Yellow-Orange
        'Confused': '#6f42c1', // Purple
        'Loved': '#fd7e14', // Orange
        'Grateful': '#20c997', // Teal
        'Proud': '#17a2b8', // Info Blue
        'Well': '#28a745', // Green
        'Confident': '#007bff', // Blue
        'Guilty': '#6c757d', // Dark Grey
        'Dizzy': '#343a40', // Very Dark Grey
        'Insecure': '#e83e8c', // Pink
        'Disappointed': '#6610f2', // Indigo
        'Inspired': '#f8f9fa', // Light, almost white
        'Nervous': '#ffc107' // Yellow-Orange
    };

    // Fallback if an emotion is not defined in emotionColors
    const defaultEmotionColor = '#cccccc';

    // --- Utility Function to Map Emotion to a Numerical Value ---
    // This should strictly match the logic in getEmotionValue() in your PHP API files
    function getEmotionValue(emotion) {
        switch (emotion) {
            case 'Ecstatic':
            case 'Joyful':
                return 5; // Very Positive
            case 'Excited':
            case 'Happy':
            case 'Hopeful':
            case 'Optimistic':
            case 'Content':
                return 4; // Positive
            case 'Calm':
            case 'Neutral':
            case 'Indifferent':
            case 'Well': // Assuming 'Well' is neutral/positive
                return 3; // Neutral
            case 'Sad':
            case 'Anxious':
            case 'Frustrated':
            case 'Tired':
            case 'Stressed':
            case 'Confused':
            case 'Guilty':
            case 'Dizzy':
            case 'Insecure':
            case 'Disappointed':
            case 'Nervous':
                return 2; // Negative
            case 'Angry':
            case 'Fearful':
            case 'Despair':
            case 'Hopeless':
            case 'Overwhelmed':
            case 'Distraught':
                return 1; // Very Negative
            default:
                return 3; // Default to neutral if emotion is unlisted
        }
    }


    // --- 1. Emotion Trend Over Time Chart ---
    async function fetchEmotionTrendData(range) {
        try {
            const response = await fetch(`api/get_emotion_trends.php?id=${userId}&range=${range}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                console.error("API Error:", data.error);
                return { labels: [], datasets: [] };
            }

            const labels = data.map(item => item.log_date);
            const emotionValues = data.map(item => item.emotion_value);

            return { labels, emotionValues };
        } catch (error) {
            console.error("Error fetching emotion trend data:", error);
            return { labels: [], emotionValues: [] };
        }
    }

    function renderEmotionTrendChart(labels, data) {
        const ctx = document.getElementById('emotionTrendChart').getContext('2d');
        if (emotionTrendChart) {
            emotionTrendChart.destroy(); // Destroy previous chart instance
        }
        emotionTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Emotion Value',
                    data: data,
                    borderColor: '#4CAF50', // Green line
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM d, yyyy',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        min: 1, // Corresponds to Very Negative
                        max: 5, // Corresponds to Very Positive
                        ticks: {
                            stepSize: 1,
                            callback: function (value) {
                                switch (value) {
                                    case 1: return 'Very Negative';
                                    case 2: return 'Negative';
                                    case 3: return 'Neutral';
                                    case 4: return 'Positive';
                                    case 5: return 'Very Positive';
                                    default: return '';
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Emotion Valence'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw;
                                let emotionText;
                                switch (Math.round(value)) { // Round to nearest integer for display
                                    case 1: emotionText = 'Very Negative'; break;
                                    case 2: emotionText = 'Negative'; break;
                                    case 3: emotionText = 'Neutral'; break;
                                    case 4: emotionText = 'Positive'; break;
                                    case 5: emotionText = 'Very Positive'; break;
                                    default: emotionText = '';
                                }
                                return `Average: ${value.toFixed(2)} (${emotionText})`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 2. Emotion Distribution Chart ---
    async function fetchEmotionDistributionData(range) {
        try {
            const response = await fetch(`api/get_emotion_distribution.php?id=${userId}&range=${range}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                console.error("API Error:", data.error);
                return { labels: [], datasets: [] };
            }

            const labels = data.map(item => item.emotion);
            const counts = data.map(item => item.count);
            const backgroundColors = labels.map(emotion => emotionColors[emotion] || defaultEmotionColor);

            return { labels, counts, backgroundColors };
        } catch (error) {
            console.error("Error fetching emotion distribution data:", error);
            return { labels: [], counts: [], backgroundColors: [] };
        }
    }

    function renderEmotionDistributionChart(labels, data, backgroundColors) {
        const ctx = document.getElementById('emotionDistributionChart').getContext('2d');
        if (emotionDistributionChart) {
            emotionDistributionChart.destroy(); // Destroy previous chart instance
        }
        emotionDistributionChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 3. Top Triggers & Coping Strategies Chart ---
    async function fetchTriggerCopingData() { // No range for this one based on previous discussions
        try {
            const response = await fetch(`api/get_trigger_coping_data.php?id=${userId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                console.error("API Error:", data.error);
                return { triggers: [], coping: [] };
            }
            return data; // Contains { triggers: [], coping_mechanisms: [] }
        } catch (error) {
            console.error("Error fetching trigger/coping data:", error);
            return { triggers: [], coping_mechanisms: [] };
        }
    }

    function renderTriggerCopingChart(data, chartType) {
        const ctx = document.getElementById('triggerCopingChart').getContext('2d');
        if (triggerCopingChart) {
            triggerCopingChart.destroy(); // Destroy previous chart instance
        }

        let labels = [];
        let counts = [];
        let chartTitle = '';
        let backgroundColor = '';

        if (chartType === 'triggers') {
            labels = data.triggers.map(item => item.triggers);
            counts = data.triggers.map(item => item.count);
            chartTitle = 'Top 5 Triggers';
            backgroundColor = '#FF6384'; // Red
        } else { // coping
            labels = data.coping_mechanisms.map(item => item.coping);
            counts = data.coping_mechanisms.map(item => item.count);
            chartTitle = 'Top 5 Coping Strategies';
            backgroundColor = '#36A2EB'; // Blue
        }

        triggerCopingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: chartTitle,
                    data: counts,
                    backgroundColor: backgroundColor,
                    borderColor: backgroundColor,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Make it a horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: chartType === 'triggers' ? 'Triggers' : 'Coping Strategies'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Hide dataset label as title is in chartTitle
                    }
                }
            }
        });
    }

    // --- 4. Sleep & Emotion Connection Chart ---
    async function fetchSleepEmotionData(range) {
        try {
            const response = await fetch(`api/get_sleep_gratitude_data.php?id=${userId}&range=${range}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                console.error("API Error:", data.error);
                return { dates: [], sleepHours: [], emotionValues: [] };
            }

            const dates = data.map(item => item.log_date);
            const sleepHours = data.map(item => item.sleep_hours);
            const emotionValues = data.map(item => item.emotion_value);

            return { dates, sleepHours, emotionValues };
        } catch (error) {
            console.error("Error fetching sleep/emotion data:", error);
            return { dates: [], sleepHours: [], emotionValues: [] };
        }
    }

    function renderSleepEmotionChart(dates, sleepHours, emotionValues) {
        const ctx = document.getElementById('sleepEmotionChart').getContext('2d');
        if (sleepEmotionChart) {
            sleepEmotionChart.destroy(); // Destroy previous chart instance
        }
        sleepEmotionChart = new Chart(ctx, {
            type: 'line', // Can be 'scatter' if preferred for correlation
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Hours of Sleep',
                        data: sleepHours,
                        borderColor: '#007bff', // Blue
                        backgroundColor: 'rgba(0, 123, 255, 0.2)',
                        yAxisID: 'y',
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Average Emotion Value',
                        data: emotionValues,
                        borderColor: '#28a745', // Green
                        backgroundColor: 'rgba(40, 167, 69, 0.2)',
                        yAxisID: 'y1',
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM d, yyyy',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Hours of Sleep'
                        },
                        beginAtZero: true,
                        min: 0,
                        max: 24 // Max sleep hours
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Emotion Valence'
                        },
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            callback: function (value) {
                                switch (value) {
                                    case 1: return 'Very Negative';
                                    case 2: return 'Negative';
                                    case 3: return 'Neutral';
                                    case 4: return 'Positive';
                                    case 5: return 'Very Positive';
                                    default: return '';
                                }
                            }
                        },
                        grid: {
                            drawOnChartArea: false // only draw grid lines for the first y-axis
                        }
                    }
                }
            }
        });
    }

    // --- Dashboard Overview Data (Optional, but good to include) ---
    async function fetchDashboardOverviewData() {
        try {
            // This API endpoint would need to be created (e.g., api/get_dashboard_overview.php)
            // It would return total logs, average mood, most common emotion.
            // For now, we'll simulate or leave it empty if no such API exists yet.
            // Example if you create api/get_dashboard_overview.php:
            // const response = await fetch(`api/get_dashboard_overview.php?id=${userId}`);
            // if (!response.ok) throw new Error('Failed to fetch overview');
            // const data = await response.json();

            // document.getElementById('totalLogs').textContent = data.totalLogs || 'N/A';
            // document.getElementById('averageMood').textContent = data.averageMood ? data.averageMood.toFixed(2) : 'N/A';
            // document.getElementById('mostCommonEmotion').textContent = data.mostCommonEmotion || 'N/A';

            // For now, let's just make placeholders
            document.getElementById('totalLogs').textContent = '—';
            document.getElementById('averageMood').textContent = '—';
            document.getElementById('mostCommonEmotion').textContent = '—';

        } catch (error) {
            console.error("Error fetching dashboard overview data:", error);
            document.getElementById('totalLogs').textContent = 'Error';
            document.getElementById('averageMood').textContent = 'Error';
            document.getElementById('mostCommonEmotion').textContent = 'Error';
        }
    }


    // --- Initial Chart Loads and Event Listeners ---
    async function initializeCharts() {
        // Initial load for Emotion Trend (default to 30 days or 7 days if you prefer)
        const trendData = await fetchEmotionTrendData('7');
        renderEmotionTrendChart(trendData.labels, trendData.emotionValues);

        // Initial load for Emotion Distribution (default to 30 days)
        const distData = await fetchEmotionDistributionData('30');
        renderEmotionDistributionChart(distData.labels, distData.counts, distData.backgroundColors);

        // Initial load for Triggers & Coping (default to triggers)
        const tcData = await fetchTriggerCopingData();
        renderTriggerCopingChart(tcData, 'triggers');

        // Initial load for Sleep & Emotion (default to 30 days)
        const sleepData = await fetchSleepEmotionData('30');
        renderSleepEmotionChart(sleepData.dates, sleepData.sleepHours, sleepData.emotionValues);

        // Fetch dashboard overview data
        // fetchDashboardOverviewData(); // Uncomment if you implement this API
    }

    // Call to initialize all charts on page load
    initializeCharts();

    // Event Listeners for Chart Controls
    document.querySelectorAll('.chart-controls button').forEach(button => {
        button.addEventListener('click', async function () {
            const parentSection = this.closest('.chart-section');
            const buttonsInGroup = parentSection.querySelectorAll('.chart-controls button');

            buttonsInGroup.forEach(btn => btn.classList.remove('active-range', 'active-type'));
            this.classList.add(this.hasAttribute('data-time-range') ? 'active-range' : 'active-type');

            if (this.closest('.dashboard-section').querySelector('#emotionTrendChart')) {
                const range = this.getAttribute('data-time-range');
                const data = await fetchEmotionTrendData(range);
                renderEmotionTrendChart(data.labels, data.data);
            } else if (this.closest('.dashboard-section').querySelector('#emotionDistributionChart')) {
                const range = this.getAttribute('data-time-range');
                const data = await fetchEmotionDistributionData(range);
                renderEmotionDistributionChart(data.labels, data.counts, data.backgroundColors);
            } else if (this.closest('.dashboard-section').querySelector('#triggerCopingChart')) {
                const chartType = this.getAttribute('data-chart-type');
                const data = await fetchTriggerCopingData(); // Always refetch all data for this chart
                renderTriggerCopingChart(data, chartType);
            } else if (this.closest('.dashboard-section').querySelector('#sleepEmotionChart')) {
                const range = this.getAttribute('data-time-range');
                const data = await fetchSleepEmotionData(range);
                renderSleepEmotionChart(data.dates, data.sleepHours, data.emotionValues);
            }
        });
    });

});