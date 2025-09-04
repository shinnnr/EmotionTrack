<?php
// In get_dass_insights.php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
// In get_dass_insights.php
include '../../db/db_connect.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo json_encode(['error' => 'User not logged in.']);
    exit;
}

$user_id = $_SESSION['id'];

// SQL to fetch the most recent DASS-21 entry for the logged-in user
$sql = "SELECT depression_score, anxiety_score, stress_score, depression_severity, anxiety_severity, stress_severity FROM dass21_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['error' => 'Database prepare failed.']);
    exit;
}

$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $data = $result->fetch_assoc();
    echo json_encode(['success' => true, 'data' => $data]);
} else {
    // No DASS-21 results found for the user
    echo json_encode(['success' => false, 'message' => 'No DASS-21 results found.']);
}

$stmt->close();
$conn->close();
?>