<?php
session_start();
ob_start();

if (!isset($_SESSION['id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
    exit();
}

include '../db/db_connect.php';

function processMessageForEmbeds($message_text)
{
    $youtube_pattern = '/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-Z0-9_-]{11})(?:[^\s]*)/i';
    $parts = [];
    $last_match_end = 0;
    preg_match_all($youtube_pattern, $message_text, $matches, PREG_OFFSET_CAPTURE);
    foreach ($matches[0] as $index => $full_match_info) {
        $full_url = $full_match_info[0];
        $match_start = $full_match_info[1];
        $video_id = $matches[1][$index][0];
        if ($match_start > $last_match_end) {
            $parts[] = htmlspecialchars(substr($message_text, $last_match_end, $match_start - $last_match_end));
        }
        $parts[] = '<div class="youtube-embed-container"><iframe src="https://www.youtube.com/embed/' . htmlspecialchars($video_id) . '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
        $last_match_end = $match_start + strlen($full_url);
    }
    if ($last_match_end < strlen($message_text)) {
        $parts[] = htmlspecialchars(substr($message_text, $last_match_end));
    }
    return implode('', $parts);
}

function getDetailedSuggestedResponses($conn, $userId) {
    $responses = [];
    $dass_sql = "SELECT depression_severity, anxiety_severity, stress_severity FROM dass21_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1";
    $stmt = $conn->prepare($dass_sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $dass_result = $stmt->get_result();
    $dass_data = $dass_result->fetch_assoc();
    $stmt->close();
    
    // BUG FIX: Changed `id` to `user_id` to correctly fetch mood logs for the user.
    $mood_sql = "SELECT emotion FROM mood_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 1";
    $stmt = $conn->prepare($mood_sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $mood_result = $stmt->get_result();
    $mood_data = $mood_result->fetch_assoc();
    $stmt->close();
    
    if ($dass_data) {
        if ($dass_data['depression_severity'] === 'Extremely Severe' || $dass_data['depression_severity'] === 'Severe') {
            $responses[] = "I noticed your last DASS21 assessment indicated a high level of depression. I want you to know I'm here to support you. Have you considered talking to a professional counselor or therapist?";
            $responses[] = "Your well-being is our top priority. The recent DASS21 results are concerning, and I'd like to discuss them with you. Would you be open to exploring some professional resources available to you?";
        }
        if ($dass_data['anxiety_severity'] === 'Extremely Severe' || $dass_data['anxiety_severity'] === 'Severe') {
            $responses[] = "I see your anxiety scores are elevated. I want to reassure you that there are effective strategies for managing anxiety. Would you be interested in learning about some breathing exercises or grounding techniques?";
            $responses[] = "Dealing with high anxiety can be exhausting. I'm here to help you navigate this. Perhaps we can talk about the triggers and how to build a toolkit of coping mechanisms.";
        }
        if ($dass_data['stress_severity'] === 'Extremely Severe' || $dass_data['stress_severity'] === 'Severe') {
            $responses[] = "The stress you're experiencing seems very high based on your logs. Let's discuss some time management or relaxation techniques that could help you feel more in control.";
            $responses[] = "It's important to address this level of stress before it affects your health. Would you like me to share some resources on stress reduction or talk about what is contributing to this feeling?";
        }
    }
    if ($mood_data) {
        $recent_emotion = strtolower($mood_data['emotion']);
        if (in_array($recent_emotion, ['sad', 'lonely', 'tired'])) {
            $responses[] = "It sounds like you've been feeling quite " . htmlspecialchars($recent_emotion) . " recently. I want to check in on you. What's on your mind?";
        }
        if (in_array($recent_emotion, ['angry', 'stressed', 'frustrated'])) {
            $responses[] = "I noticed your recent mood log indicates you're feeling " . htmlspecialchars($recent_emotion) . ". It's okay to feel this way. How can I help you process these emotions?";
        }
        if (in_array($recent_emotion, ['joyful', 'hopeful', 'proud'])) {
            $responses[] = "It's wonderful to see you're feeling " . htmlspecialchars($recent_emotion) . "! That's a great sign. What's one thing that contributed to that feeling?";
        }
    }
    $last_message_sql = "SELECT message_text FROM student_messages WHERE sender_user_id = ? ORDER BY timestamp DESC LIMIT 1";
    $stmt = $conn->prepare($last_message_sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $last_message_result = $stmt->get_result();
    $last_message = $last_message_result->fetch_assoc();
    $stmt->close();
    $last_message_content = $last_message ? $last_message['message_text'] : '';
    if (stripos($last_message_content, 'help') !== false || stripos($last_message_content, 'struggling') !== false || stripos($last_message_content, 'overwhelmed') !== false) {
        $responses[] = "Thank you for reaching out. It sounds like you're going through a lot right now. I'm here to listen and provide support. What's the most pressing issue on your mind?";
    }
    if (empty($responses)) {
        $responses = ["Thank you for sharing your experience. We're here to help.", "I'm here to listen. What would you like to discuss today?", "Let's explore some strategies together. What's the best way I can support you right now?"];
    }
    $responses = array_unique($responses);
    return $responses;
}

if (!isset($_GET['action'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid action.']);
    exit();
}

header('Content-Type: application/json');
$response = ['status' => 'error', 'message' => 'Invalid action'];
$adminId = $_SESSION['id'];

switch ($_GET['action']) {
    case 'getSuggestedResponses':
        $userId = $_GET['user_id'] ?? null;
        if ($userId) {
            $response = getDetailedSuggestedResponses($conn, $userId);
        } else {
            $response = ['error' => 'User ID not provided.'];
        }
        break;

    case 'getChatHistory':
        $userId = $_GET['user_id'] ?? null;
        if ($userId) {
            $student_chat_sql = "SELECT message_id, sender_user_id, message_text, timestamp FROM student_messages WHERE sender_user_id = ? ORDER BY timestamp ASC";
            $stmt_student = $conn->prepare($student_chat_sql);
            $stmt_student->bind_param("i", $userId);
            $stmt_student->execute();
            $student_chat_result = $stmt_student->get_result();
            $chat_history = [];
            while ($row = $student_chat_result->fetch_assoc()) {
                $row['sender_role'] = 'student';
                $row['message_text'] = processMessageForEmbeds($row['message_text']);
                $chat_history[] = $row;
            }
            $stmt_student->close();
            $admin_chat_sql = "SELECT advice_id AS message_id, user_id AS sender_user_id, advice AS message_text, timestamp FROM personalized_advice WHERE user_id = ? ORDER BY timestamp ASC";
            $stmt_admin = $conn->prepare($admin_chat_sql);
            $stmt_admin->bind_param("i", $userId);
            $stmt_admin->execute();
            $admin_chat_result = $stmt_admin->get_result();
            while ($row = $admin_chat_result->fetch_assoc()) {
                $row['sender_role'] = 'admin';
                $row['message_text'] = processMessageForEmbeds($row['message_text']);
                $chat_history[] = $row;
            }
            $stmt_admin->close();
            usort($chat_history, function($a, $b) {
                return strtotime($a['timestamp']) - strtotime($b['timestamp']);
            });
            $response = $chat_history;
        } else {
            $response = ['error' => 'User ID not provided.'];
        }
        break;

    case 'getNewMessages':
        $userId = $_GET['user_id'] ?? null;
        $lastTimestamp = $_GET['last_timestamp'] ?? '1970-01-01 00:00:00';
        if ($userId) {
            $sql = "(SELECT 'student' as sender_role, message_id, sender_user_id, message_text, timestamp FROM student_messages WHERE sender_user_id = ? AND timestamp > ?) UNION ALL (SELECT 'admin' as sender_role, advice_id AS message_id, user_id AS sender_user_id, advice AS message_text, timestamp FROM personalized_advice WHERE user_id = ? AND timestamp > ?) ORDER BY timestamp ASC";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("isis", $userId, $lastTimestamp, $userId, $lastTimestamp);
            $stmt->execute();
            $result = $stmt->get_result();
            $new_messages = [];
            while ($row = $result->fetch_assoc()) {
                $row['message_text'] = processMessageForEmbeds($row['message_text']);
                $new_messages[] = $row;
            }
            $stmt->close();
            $response = $new_messages;
        } else {
            $response = ['error' => 'User ID not provided.'];
        }
        break;

    case 'getMoodLogs':
        $userId = $_GET['user_id'] ?? null;
        if ($userId) {
            // BUG FIX: Changed `id` to `user_id` to correctly fetch mood logs for the user.
            $mood_sql = "SELECT * FROM mood_logs WHERE user_id = ? ORDER BY log_date DESC";
            $stmt = $conn->prepare($mood_sql);
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $mood_result = $stmt->get_result();
            $logs = [];
            while ($row = $mood_result->fetch_assoc()) {
                $logs[] = $row;
            }
            $stmt->close();
            $response = $logs;
        } else {
            $response = ['error' => 'User ID not provided.'];
        }
        break;

    case 'getDass21Results':
        $userId = $_GET['user_id'] ?? null;
        if ($userId) {
            $dass_sql = "SELECT * FROM dass21_results WHERE user_id = ? ORDER BY created_at DESC";
            $stmt = $conn->prepare($dass_sql);
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $dass_result = $stmt->get_result();
            $results = [];
            while ($row = $dass_result->fetch_assoc()) {
                $results[] = $row;
            }
            $stmt->close();
            $response = $results;
        } else {
            $response = ['error' => 'User ID not provided.'];
        }
        break;

    case 'sendMessage':
        $userId = $_POST['user_id'] ?? null;
        $message = $_POST['message'] ?? null;
        if ($userId && $message) {
            $insert_sql = "INSERT INTO personalized_advice (user_id, advice) VALUES (?, ?)";
            $stmt = $conn->prepare($insert_sql);
            $stmt->bind_param("is", $userId, $message);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Message sent.'];
            } else {
                $response = ['status' => 'error', 'message' => 'Failed to insert message.'];
            }
            $stmt->close();
        } else {
            $response = ['status' => 'error', 'message' => 'Missing message or user ID.'];
        }
        break;

    case 'fetchUnreadCounts':
        $map = [];
        $res = $conn->query("SELECT id, unread_count FROM users WHERE role != 'admin'");
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $map[(int)$row['id']] = (int)$row['unread_count'];
            }
        }
        $response = $map;
        break;

    case 'resetUnreadCount':
        $userId = isset($_REQUEST['user_id']) ? (int)$_REQUEST['user_id'] : 0;
        if ($userId > 0) {
            $stmt = $conn->prepare("UPDATE users SET unread_count = 0 WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $ok = $stmt->execute();
            $stmt->close();
            $response = ['status' => $ok ? 'success' : 'error'];
        } else {
            $response = ['status' => 'error', 'message' => 'Missing user_id'];
        }
        break;

    case 'getHighRiskStudents':
        $high_risk_sql = "SELECT id, firstname, risk_score, strand, section FROM users WHERE role != 'admin' AND risk_score > 10 ORDER BY strand ASC, section ASC, risk_score DESC, id ASC";
        $high_risk_result = $conn->query($high_risk_sql);
        $high_risk_students = [];
        if ($high_risk_result) {
            while ($row = $high_risk_result->fetch_assoc()) {
                $high_risk_students[] = $row;
            }
        }
        $response = $high_risk_students;
        break;

    default:
        http_response_code(400);
        $response = ['status' => 'error', 'message' => 'Invalid action.'];
        break;
}

ob_clean();
echo json_encode($response);
exit();
?>
