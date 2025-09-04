<?php
session_start();
include '../db/db_connect.php'; // Adjust path as necessary

header('Content-Type: application/json'); // Set header to JSON

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Check if user is logged in
    if (!isset($_SESSION['id'])) {
        echo json_encode(["status" => "error", "message" => "User not logged in."]);
        exit;
    }

    $sender_user_id = $_SESSION['id'];
    $message_text = trim($_POST['message_text'] ?? '');

    // Basic validation
    if (empty($message_text)) {
        echo json_encode(["status" => "error", "message" => "Message cannot be empty."]);
        exit;
    }

    if (strlen($message_text) > 500) { // Set a reasonable limit for messages
        echo json_encode(["status" => "error", "message" => "Message cannot exceed 500 characters."]);
        exit;
    }

    // Prepare and execute the SQL statement to insert the student's message
    $sql = "INSERT INTO student_messages (sender_user_id, message_text) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);

    if ($stmt) {
        $stmt->bind_param("is", $sender_user_id, $message_text); // 'i' for integer, 's' for string
        if ($stmt->execute()) {
            // Get the current timestamp from the database or PHP
            // Using NOW() from SQL for consistency with DB storage
            $timestamp_query = "SELECT NOW() AS 'current_time'";
            $timestamp_result = $conn->query($timestamp_query);
            $db_timestamp = $timestamp_result->fetch_assoc()['current_time'];

            echo json_encode(["status" => "success", "message" => "Message sent successfully!", "timestamp" => $db_timestamp]);
        } else {
            error_log("Error executing statement for student message: " . $stmt->error);
            echo json_encode(["status" => "error", "message" => "Error: Could not send message. Please try again."]);
        }
        $stmt->close();
    } else {
        error_log("Error preparing statement for student message: " . $conn->error);
        echo json_encode(["status" => "error", "message" => "Error: Could not prepare statement. Please try again."]);
    }

    $conn->close();
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request method."]);
}
?>