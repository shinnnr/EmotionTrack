<?php
session_start();
include 'db/db_connect.php'; // Adjust path as necessary

header('Content-Type: application/json'); // Set header to JSON

if (!isset($_SESSION['id'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in."]);
    exit;
}

$user_id = $_SESSION['id'];
$last_timestamp = $_GET['last_timestamp'] ?? ''; // Get the last timestamp from client

$messages = [];

// Fetch personalized advice from admin
$sql_advice = "SELECT advice AS message_text, timestamp, 'admin' AS sender_type FROM personalized_advice WHERE user_id = ?";
if (!empty($last_timestamp)) {
    $sql_advice .= " AND timestamp > ?";
}

// Fetch student messages/replies
$sql_replies = "SELECT message_text, timestamp, 'student' AS sender_type FROM student_messages WHERE sender_user_id = ?";
if (!empty($last_timestamp)) {
    $sql_replies .= " AND timestamp > ?";
}

// Combine and execute queries
$all_messages_query = "
    ($sql_advice)
    UNION ALL
    ($sql_replies)
    ORDER BY timestamp ASC
";

$stmt = $conn->prepare($all_messages_query);

if ($stmt) {
    if (!empty($last_timestamp)) {
        // If last_timestamp is provided, bind it to both parts of the UNION
        $stmt->bind_param("isi", $user_id, $last_timestamp, $user_id); // two 'i' and one 's' (for timestamp)
    } else {
        // If no last_timestamp, just bind user_id twice
        $stmt->bind_param("ii", $user_id, $user_id);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    $stmt->close();
} else {
    error_log("Error preparing statement for fetch_messages: " . $conn->error);
    echo json_encode(["status" => "error", "message" => "Error fetching messages."]);
    $conn->close();
    exit;
}

$conn->close();

echo json_encode(["status" => "success", "messages" => $messages]);
?>