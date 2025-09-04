<?php
session_start();
include '../db/db_connect.php'; // Ensure correct database connection path

// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo "<p>Please <a href='home.php?login=1'>log in</a> to view your profile.</p>";
    exit;
}

$id = $_SESSION['id'];

// Fetch user details from the database
$sql = "SELECT id, firstname, lastname, email, gender, strand, grade_level, section FROM users WHERE id = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    // Log the error for debugging, don't expose sensitive details to the user
    error_log("Prepare failed for profile.php user fetch: (" . $conn->errno . ") " . $conn->error);
    die("<p class='error-message'>An error occurred while fetching your profile. Please try again later.</p>");
}
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
$user = ($result->num_rows > 0) ? $result->fetch_assoc() : null;
$stmt->close();

if (!$user) {
    // User data not found in DB, even if session ID exists.
    // This could indicate a data inconsistency or deleted user.
    echo "<p class='error-message'>User not found. Please log in again.</p>";
    session_destroy(); // Destroy session if user data isn't found
    exit;
}

// Close the main database connection as all data needed for this page render has been fetched
$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Profile & Wellness Insights</title>
    <link rel="stylesheet" href="profile.css">
    <link rel="icon" type="image/png" href="sjc.png">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <?php include 'sidebar.php'; // IMPORTANT: Ensure this path is correct for your sidebar file ?>
    <img src="sjc.png" alt="City High Logo" class="sjc-logo">

    <div class="profile-container">
        <h2>Your Profile & Wellness Insights</h2>
        <div class="profile-details">
            <p><strong>Name:</strong>
                <?= htmlspecialchars($user['firstname']) . " " . htmlspecialchars($user['lastname']) ?></p>
            <p><strong>Email:</strong> <?= htmlspecialchars($user['email']) ?></p>
            <p><strong>Gender:</strong> <?= htmlspecialchars($user['gender']) ?></p>
            <p><strong>Strand:</strong> <?= htmlspecialchars($user['strand']) ?></p>
            <p><strong>Grade Level:</strong> <?= htmlspecialchars($user['grade_level']) ?></p>
            <p><strong>Section:</strong> <?= htmlspecialchars($user['section']) ?></p>
        </div>

        <div class="profile-actions">
            <button class="log-btn" id="viewLogsBtn">📜 View My Journal Entries</button>
            <button class="insights-btn" id="viewInsightsBtn">📊 View Wellness Insights</button>
            <button class="dass-insights-btn" id="viewDASSInsightsBtn">🧠 View DASS-21 Assessment</button>
        </div>
    </div>

    <div id="emotionLogModal" class="modal">
        <div class="modal-content">
            <span class="close" data-modal="emotionLogModal">&times;</span>
            <h2>My Emotional Journal</h2>
            <div id="logHistoryContent">
                <p class="info-message">Loading logs...</p>
            </div>
        </div>
    </div>

    <div id="logDetailsModal" class="modal">
        <div class="modal-content">
            <span class="close" data-modal="logDetailsModal">&times;</span>
            <h2>Journal Entry Details</h2>
            <div id="logDetailsContent" class="log-details-content"></div>
        </div>
    </div>

    <div id="insightsModal" class="modal">
        <div class="modal-content">
            <span class="close" data-modal="insightsModal">&times;</span>
            <h2>My Emotional Insights</h2>
            <div id="insightsContent" class="insights-content">
                <p class="intro-insight">
                    Here's a summary of patterns observed in your emotional journey. Use these insights to better understand your emotional landscape.
                </p>

                <div class="insights-section">
                    <h3>Emotional Distribution</h3>
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
                    <h3>Common Stressors & Triggers</h3>
                    <p id="triggerSummaryText"></p>
                    <div class="chart-container">
                        <canvas id="triggerChart"></canvas>
                    </div>
                </div>

                <div class="insights-section">
                    <h3>Coping Strategies</h3>
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

            </div>
        </div>
    </div>

    <div id="dassInsightsModal" class="modal">
    <div class="modal-content">
        <span class="close" data-modal="dassInsightsModal">&times;</span>
        <h2><span class="dass-title-icon">🧠</span> My DASS-21 Assessment</h2>
        <div id="dassInsightsContent" class="insights-content">
            <p class="intro-insight">
                Hello,
                <strong class="student-name"></strong>! This assessment provides a
                snapshot of your current state. Please note that these results are for informational purposes and are not a substitute for a professional diagnosis.
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
                <h4>Interpretation of Results:</h4>
                <p id="overallSummaryText"></p>
            </div>

            <div class="recommendations">
                <h4>Personalized Recommendations & Next Steps:</h4>
                <ul id="recommendationsList">
                    </ul>
            </div>

            <p class="final-note">
                Your well-being journey is a continuous process. We are committed to supporting you at every stage.
                <br>
                <br>
                <strong class="guidance-office-note">For further support or if you feel overwhelmed, please reach out to the Guidance Office. Your well-being is our priority. 💚</strong>
            </p>
        </div>
    </div>
</div>

    <script src="profile.js"></script>
</body>
</html>
