<?php
session_start();
include '../db/db_connect.php';

if (!isset($_GET['log_id']) || !isset($_SESSION['id'])) {
    // Return a structured error message for AJAX consumption
    echo "<p class='error-message'>Invalid request or user not logged in.</p>";
    exit;
}

$user_id = $_SESSION['id'];
$log_id = (int)$_GET['log_id']; // Ensure integer type for log_id

$sql = "SELECT emotion, sleep, energy, triggers, coping, gratitude, log_date
        FROM mood_logs WHERE log_id = ? AND id = ?";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    // Log the error for debugging, don't expose to user
    error_log("Prepare failed for get_log_details: (" . $conn->errno . ") " . $conn->error);
    echo "<p class='error-message'>Error fetching details. Please try again.</p>";
    exit;
}

$stmt->bind_param("ii", $log_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $log = $result->fetch_assoc();
    // Using paragraph tags for better styling and semantic HTML
    echo "<p><strong>Emotion:</strong> " . htmlspecialchars($log['emotion']) . "</p>";
    echo "<p><strong>Sleep (hours):</strong> " . htmlspecialchars($log['sleep']) . "</p>";
    echo "<p><strong>Energy:</strong> " . htmlspecialchars($log['energy']) . "</p>";
    echo "<p><strong>Triggers:</strong> " . htmlspecialchars($log['triggers']) . "</p>";
    echo "<p><strong>Coping Mechanism:</strong> " . htmlspecialchars($log['coping']) . "</p>";
    // Use nl2br to preserve line breaks in gratitude, but styling in CSS will make it look like separate paragraphs
    echo "<p><strong>Gratitude:</strong> " . nl2br(htmlspecialchars($log['gratitude'])) . "</p>";
    echo "<p><strong>Date:</strong> " . htmlspecialchars($log['log_date']) . "</p>";
} else {
    echo "<p class='info-message'>No details found for this log entry or you don't have permission to view it.</p>";
}

$stmt->close();
$conn->close();
?>