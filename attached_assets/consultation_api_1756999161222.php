<?php
// consultation_api.php
ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

session_start();
header("Content-Type: application/json");

// Check for valid session first
if (!isset($_SESSION['id']) || !isset($_SESSION['role'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

require_once "../db/db_connect.php";

$action = $_GET['action'] ?? '';
$user_id = (int)$_SESSION['id'];
$user_role = $_SESSION['role'];
$csrf_token = $_SESSION['csrf_token'] ?? '';

/**
 * Fetches and sorts messages from both student_messages and personalized_advice tables.
 *
 * @param mysqli $conn The database connection.
 * @param int $user_id The ID of the current user.
 * @param string $lastTs The timestamp of the last message received, for polling.
 * @return array A status and messages array.
 */
function fetchAndSortMessages($conn, $user_id, $lastTs) {
    try {
        $messages = [];
        
        // This unified query fetches both student and admin messages and sorts them by timestamp.
        $sql = "
            SELECT id, text, timestamp, sender_type FROM (
                (SELECT 
                    message_id AS id, 
                    message_text AS text, 
                    timestamp, 
                    'student' AS sender_type
                FROM student_messages
                WHERE sender_user_id = ? AND timestamp > ?)
                UNION ALL
                (SELECT 
                    advice_id AS id, 
                    advice AS text, 
                    timestamp, 
                    'admin' AS sender_type
                FROM personalized_advice
                WHERE user_id = ? AND timestamp > ?)
            ) AS combined_messages
            ORDER BY timestamp ASC
        ";
        
        // If lastTs is empty, fetch all messages from the beginning
        if (empty($lastTs)) {
            $sql = "
                SELECT id, text, timestamp, sender_type FROM (
                    (SELECT 
                        message_id AS id, 
                        message_text AS text, 
                        timestamp, 
                        'student' AS sender_type
                    FROM student_messages
                    WHERE sender_user_id = ?)
                    UNION ALL
                    (SELECT 
                        advice_id AS id, 
                        advice AS text, 
                        timestamp, 
                        'admin' AS sender_type
                    FROM personalized_advice
                    WHERE user_id = ?)
                ) AS combined_messages
                ORDER BY timestamp ASC
            ";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $user_id, $user_id);
        } else {
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("isis", $user_id, $lastTs, $user_id, $lastTs);
        }

        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $messages[] = $row;
        }
        $stmt->close();

        return ["status" => "success", "messages" => $messages];

    } catch (Exception $e) {
        error_log("DB error in fetchAndSortMessages: " . $e->getMessage());
        return ["status" => "error", "message" => "DB error: " . $e->getMessage()];
    }
}


switch ($action) {
    case 'fetch_messages':
        $lastTs = $_GET['last_timestamp'] ?? '';
        $response = fetchAndSortMessages($conn, $user_id, $lastTs);
        echo json_encode($response);
        break;

    // New action for long polling
    case 'poll_messages':
        $lastTs = $_GET['last_timestamp'] ?? '0';
        $timeout = 25; // seconds
        $startTime = time();

        while ((time() - $startTime) < $timeout) {
            $response = fetchAndSortMessages($conn, $user_id, $lastTs);
            if (!empty($response['messages'])) {
                echo json_encode($response);
                exit; // Exit loop and script once new messages are found
            }
            usleep(500000); // Wait for 0.5 seconds before re-checking
        }
        
        // Timeout, send an empty response
        echo json_encode(["status" => "success", "messages" => []]);
        break;

        case 'send_message':
        $message_text = trim($_POST['message_text'] ?? '');
        $post_csrf = $_POST['csrf_token'] ?? '';

        if ($message_text === '') {
            echo json_encode(["status" => "error", "message" => "Empty message"]);
            exit;
        }
        
        if ($post_csrf !== $csrf_token) {
            echo json_encode(["status" => "error", "message" => "CSRF token mismatch."]);
            exit;
        }

        try {
            $conn->begin_transaction();
            
            $stmt = $conn->prepare("
                INSERT INTO student_messages (sender_user_id, message_text)
                VALUES (?, ?)
            ");
            $stmt->bind_param("is", $user_id, $message_text);
            
            if ($stmt->execute()) {
                $inserted_id = $stmt->insert_id;
                $stmt->close();
                
                // Fetch the exact timestamp from the database
                $stmt = $conn->prepare("
                    SELECT timestamp FROM student_messages WHERE message_id = ?
                ");
                $stmt->bind_param("i", $inserted_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $row = $res->fetch_assoc();
                $inserted_timestamp = $row['timestamp'];
                $stmt->close();
                
                // 🔵 Update unread_count for this student (admin will see this)
                $stmt = $conn->prepare("UPDATE users SET unread_count = unread_count + 1 WHERE id = ?");
                $stmt->bind_param("i", $user_id);
                $stmt->execute();
                $stmt->close();

                $conn->commit();

                echo json_encode([
                    "status"      => "success",
                    "id"          => $inserted_id,
                    "text"        => $message_text,
                    "timestamp"   => $inserted_timestamp,
                    "sender_type" => "student"
                ]);
            } else {
                $conn->rollback();
                echo json_encode(["status" => "error", "message" => "Insert failed"]);
            }
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(["status" => "error", "message" => "DB error: " . $e->getMessage()]);
        }
        break;

    // 🔵 Admin fetches all students’ unread counts
    case 'fetch_unread_counts':
        if ($user_role !== 'admin') {
            echo json_encode(["status" => "error", "message" => "Unauthorized"]);
            exit;
        }
        $result = $conn->query("SELECT id, unread_count FROM users WHERE role = 'student'");
        $unreadData = [];
        while ($row = $result->fetch_assoc()) {
            $unreadData[$row['id']] = (int)$row['unread_count'];
        }
        echo json_encode(["status" => "success", "unread_counts" => $unreadData]);
        break;

    // 🔵 Reset unread_count when admin opens a chat
    case 'reset_unread':
        if ($user_role !== 'admin') {
            echo json_encode(["status" => "error", "message" => "Unauthorized"]);
            exit;
        }
        $student_id = (int)($_POST['student_id'] ?? 0);
        if ($student_id > 0) {
            $stmt = $conn->prepare("UPDATE users SET unread_count = 0 WHERE id = ?");
            $stmt->bind_param("i", $student_id);
            $stmt->execute();
            $stmt->close();
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Invalid student_id"]);
        }
        break;


    default:
        echo json_encode(["status" => "error", "message" => "Invalid action"]);
        break;
}
?>