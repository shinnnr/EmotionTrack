<?php
session_start();
ob_start();

// Check if the user is logged in and is an admin
if (!isset($_SESSION['id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../index.php"); // Redirect back to main login if not admin
    exit();
}

include '../db/db_connect.php';

// Check for user_id in the URL
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
if (!$userId) {
    header("Location: index.php"); // Redirect back if no user ID is provided
    exit();
}

// Fetch the student's name
$user_sql = "SELECT firstname FROM users WHERE id = ?";
$stmt = $conn->prepare($user_sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$user_result = $stmt->get_result();
$user_data = $user_result->fetch_assoc();
$stmt->close();
$student_name = $user_data ? htmlspecialchars($user_data['firstname']) : 'Student ' . $userId;

// =========================================================================
// PHP API Endpoints for chat.php
// =========================================================================
function processMessageForEmbeds($message_text) {
    $youtube_pattern = '/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})(?:[^\s]*)/i';
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

    $mood_sql = "SELECT emotion FROM mood_logs WHERE id = ? ORDER BY log_date DESC LIMIT 1";
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
        $responses = [
            "Thank you for sharing your experience. We're here to help.",
            "I'm here to listen. What would you like to discuss today?",
            "Let's explore some strategies together. What's the best way I can support you right now?"
        ];
    }
    $responses = array_unique($responses);
    return $responses;
}

if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    $response = ['status' => 'error', 'message' => 'Invalid action'];
    ob_clean();
    $adminId = $_SESSION['id'];
    $userId = $_REQUEST['user_id'] ?? null;

    switch ($_GET['action']) {
        case 'getSuggestedResponses':
            if ($userId) { $response = getDetailedSuggestedResponses($conn, $userId); }
            else { $response = ['error' => 'User ID not provided.']; }
            break;
        case 'getChatHistory':
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
                
                usort($chat_history, function($a, $b) { return strtotime($a['timestamp']) - strtotime($b['timestamp']); });
                $response = $chat_history;
            } else { $response = ['error' => 'User ID not provided.']; }
            break;
            
        case 'getNewMessages':
            $lastTimestamp = $_GET['last_timestamp'] ?? '1970-01-01 00:00:00';
            if ($userId) {
                $sql = "(SELECT 'student' as sender_role, message_id, sender_user_id, message_text, timestamp FROM student_messages WHERE sender_user_id = ? AND timestamp > ?)
                        UNION ALL
                        (SELECT 'admin' as sender_role, advice_id AS message_id, user_id AS sender_user_id, advice AS message_text, timestamp FROM personalized_advice WHERE user_id = ? AND timestamp > ?)
                        ORDER BY timestamp ASC";
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
            } else { $response = ['error' => 'User ID not provided.']; }
            break;
            
        case 'getMoodLogs':
            if ($userId) {
                $mood_sql = "SELECT * FROM mood_logs WHERE id = ? ORDER BY log_date DESC";
                $stmt = $conn->prepare($mood_sql);
                $stmt->bind_param("i", $userId);
                $stmt->execute();
                $mood_result = $stmt->get_result();
                $logs = [];
                while ($row = $mood_result->fetch_assoc()) { $logs[] = $row; }
                $stmt->close();
                $response = $logs;
            } else { $response = ['error' => 'User ID not provided.']; }
            break;

        case 'getDass21Results':
            if ($userId) {
                $dass_sql = "SELECT * FROM dass21_results WHERE user_id = ? ORDER BY created_at DESC";
                $stmt = $conn->prepare($dass_sql);
                $stmt->bind_param("i", $userId);
                $stmt->execute();
                $dass_result = $stmt->get_result();
                $results = [];
                while ($row = $dass_result->fetch_assoc()) { $results[] = $row; }
                $stmt->close();
                $response = $results;
            } else { $response = ['error' => 'User ID not provided.']; }
            break;
            
        case 'sendMessage':
            $message = $_POST['message'] ?? null;
            if ($userId && $message) {
                $insert_sql = "INSERT INTO personalized_advice (user_id, advice) VALUES (?, ?)";
                $stmt = $conn->prepare($insert_sql);
                $stmt->bind_param("is", $userId, $message);
                if ($stmt->execute()) { $response = ['status' => 'success', 'message' => 'Message sent.']; }
                else { $response = ['status' => 'error', 'message' => 'Failed to insert message.']; }
                $stmt->close();
            } else { $response = ['status' => 'error', 'message' => 'Missing message or user ID.']; }
            break;

        case 'resetUnreadCount':
            if ($userId) {
                $stmt = $conn->prepare("UPDATE users SET unread_count = 0 WHERE id = ?");
                $stmt->bind_param("i", $userId);
                $ok = $stmt->execute();
                $stmt->close();
                $response = ['status' => $ok ? 'success' : 'error'];
            } else { $response = ['status' => 'error', 'message' => 'Missing user_id']; }
            break;
    }
    echo json_encode($response);
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Chat - <?php echo $student_name; ?></title>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="icon" type="image/png" href="../clsu-logo.png">
    <link rel="stylesheet" href="chat.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">

</head>
<body>
    <div class="chat-page-wrapper">
        <div class="chat-header-admin" id="chatHeaderAdmin">
            <div class="header-left">
                <a href="index.php" class="back-to-list-button">
                    <i class="fas fa-arrow-left"></i> Back to Students
                </a>
            </div>
            <div class="header-right">
                <h3 id="currentStudentName"><?php echo $student_name; ?></h3>
                <button class="view-logs" id="viewLogsButton"><i class="fas fa-chart-bar"></i> View Logs</button>
            </div>
        </div>

        <div class="chat-container" id="chatContainerAdmin">
            <p class="no-student-selected">Loading chat history...</p>
        </div>

        <div class="suggested-responses-area" id="suggestedResponsesArea">
            <p class="no-suggested-responses">Loading suggested responses...</p>
        </div>
        
        <div class="message-input-area-admin">
            <button id="toggleSuggestionsBtn" class="toggle-suggestions-button">
                <i class="fas fa-comment-dots"></i>
            </button>
            <textarea id="adminMessageInput" placeholder="Type your message..." rows="1"></textarea>
            <button id="sendMessageButton"><i class="fas fa-paper-plane"></i></button>
        </div>
    </div>

    <div class="modal" id="moodLogsModal">
        <div class="modal-content large-modal-content">
            <div class="modal-header-clsu">
                <h5 class="modal-title-clsu">Student Logs</h5>
                <div class="header-right-clsu">
                    
                </div>
                <span class="close-modal logs-modal-close">&times;</span>
            </div>
            <h3>Mood Logs for Student</h3>
            <table id="moodLogsTable" class="display">
                <thead>
                    <tr>
                        <th>Log #</th>
                        <th>Emotion</th>
                        <th>Sleep (hrs)</th>
                        <th>Energy</th>
                        <th>Triggers</th>
                        <th>Coping</th>
                        <th>Gratitude</th>
                        <th>Log Date</th>
                    </tr>
                </thead>
                <tbody id="moodLogsBody"></tbody>
            </table>
            <br>
            <h3>DASS21 Results</h3>
            <table id="dass21ResultsTable" class="display">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Depression</th>
                        <th>Anxiety</th>
                        <th>Stress</th>
                    </tr>
                </thead>
                <tbody id="dass21ResultsBody"></tbody>
            </table>
        </div>
    </div>
    
    <div class="modal" id="logoutModal">
        <div class="modal-content">
            <span class="close-modal logout-modal-close">&times;</span>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div class="modal-buttons">
                <button id="confirmLogout" class="modal-button primary-button">Yes, Logout</button>
                <button id="cancelLogout" class="modal-button secondary-button">Cancel</button>
            </div>
        </div>
    </div>
    
    <div class="message-box-container" id="messageBoxContainer"></div>

    <script>
        const userId = <?php echo json_encode($userId); ?>;
        const studentName = <?php echo json_encode($student_name); ?>;
        let moodLogsDataTable = null;
        let dass21ResultsDataTable = null;
        let pollingInterval = null; 
        let lastMessageTimestamp = null;
        
        function showMessageBox(type, message) {
            const container = document.getElementById('messageBoxContainer');
            if (!container) return;
            container.innerHTML = '';
            const messageBox = document.createElement('div');
            messageBox.classList.add('message-box', `message-box-${type}`);
            messageBox.innerHTML = `<p>${message}</p><span class="close-message-box">&times;</span>`;
            container.appendChild(messageBox);
            setTimeout(() => { messageBox.classList.add('show'); }, 50);
            setTimeout(() => {
                messageBox.classList.remove('show');
                messageBox.addEventListener('transitionend', () => { container.innerHTML = ''; }, { once: true });
            }, 5000);
            messageBox.querySelector('.close-message-box').addEventListener('click', () => {
                messageBox.classList.remove('show');
                messageBox.addEventListener('transitionend', () => { container.innerHTML = ''; }, { once: true });
            });
        }
        
        function renderMessage(message) {
            const senderClass = message.sender_role === 'admin' ? 'admin-message' : 'student-message';
            const timestampFormatted = new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const bubble = `<div class="message-bubble ${senderClass}"><div class="bubble-content"><p>${message.message_text}</p><span class="timestamp">${timestampFormatted}</span></div></div>`;
            $("#chatContainerAdmin").append(bubble);
            lastMessageTimestamp = message.timestamp;
        }
        
        function pollForNewMessages() {
            if (!userId) return;
            const url = `chat.php?action=getNewMessages&user_id=${userId}&last_timestamp=${lastMessageTimestamp}&_=${new Date().getTime()}`;
            $.ajax({
                url: url, method: 'GET', dataType: 'json',
                success: function (data) {
                    if (data && data.length > 0) {
                        data.forEach(renderMessage);
                        const chatContainer = $("#chatContainerAdmin");
                        chatContainer.scrollTop(chatContainer.prop("scrollHeight"));
                    }
                },
                error: function (xhr, status, error) { console.error("Polling error:", status, error); }
            });
        }
        
        function startPolling() {
            if (pollingInterval) clearInterval(pollingInterval);
            pollingInterval = setInterval(pollForNewMessages, 3000);
        }
        
        function stopPolling() {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        }
        
        function fetchSuggestedResponses(userId) {
            const area = $("#suggestedResponsesArea");
            area.empty().html('<p class="no-suggested-responses">Loading suggested responses...</p>');
            if (!userId) {
                area.html('<p class="no-suggested-responses">No student selected.</p>');
                return;
            }
            $.ajax({
                url: 'chat.php?action=getSuggestedResponses&user_id=' + userId,
                method: 'GET',
                dataType: 'json',
                success: function(responses) {
                    area.empty();
                    if (responses.length > 0) {
                        responses.forEach(response => {
                            const btn = `<button class="suggested-response-button">${response}</button>`;
                            area.append(btn);
                        });
                    } else {
                        area.html('<p class="no-suggested-responses">No new suggested responses based on student logs.</p>');
                    }
                },
                error: function(xhr, status, error) {
                    console.error("Failed to fetch suggested responses:", status, error);
                    area.html('<p class="no-suggested-responses" style="color: var(--color-warning-red);">Failed to load suggestions.</p>');
                }
            });
        }
        
        function fetchAndRenderChatHistory(userId) {
            $("#chatContainerAdmin").html('<p class="no-student-selected">Loading chat history...</p>');
            $.ajax({
                url: 'chat.php?action=getChatHistory&user_id=' + userId,
                method: 'GET',
                dataType: 'json',
                success: function(data) {
                    $("#chatContainerAdmin").empty();
                    if (data.length > 0) {
                        data.forEach(renderMessage);
                    } else {
                        $("#chatContainerAdmin").html('<p class="no-student-selected">No chat history found with this student.</p>');
                    }
                    const chatContainer = $("#chatContainerAdmin");
                    chatContainer.scrollTop(chatContainer.prop("scrollHeight"));
                },
                error: function() {
                    $("#chatContainerAdmin").html('<p class="no-student-selected" style="color: var(--color-warning-red);">Failed to load chat history.</p>');
                }
            });
        }

        $(document).ready(function() {
            if (userId) {
                fetchAndRenderChatHistory(userId);
                fetchSuggestedResponses(userId);
                startPolling();
            }

            $("#toggleSuggestionsBtn").click(function() {
                $("#suggestedResponsesArea").toggleClass("visible");
            });

            $("#sendMessageButton").click(function() {
                const message = $("#adminMessageInput").val().trim();
                if (message) {
                    $.ajax({
                        url: 'chat.php?action=sendMessage',
                        method: 'POST',
                        data: {
                            user_id: userId,
                            message: message
                        },
                        dataType: 'json',
                        success: function(response) {
                            if (response.status === 'success') {
                                $("#adminMessageInput").val('');
                                showMessageBox('success', 'Message sent!');
                                // Force a poll to get the new message immediately
                                pollForNewMessages();
                            } else {
                                showMessageBox('error', 'Failed to send message.');
                            }
                        },
                        error: function() {
                            showMessageBox('error', 'Failed to send message.');
                        }
                    });
                }
            });

            $("#adminMessageInput").on('keypress', function(e) {
                if (e.which === 13 && !e.shiftKey) {
                    e.preventDefault();
                    $("#sendMessageButton").click();
                }
            });

            $(document).on('click', '.suggested-response-button', function() {
                const responseText = $(this).text();
                $("#adminMessageInput").val(responseText).focus();
            });

            // Modal logic
            const moodLogsModal = document.getElementById('moodLogsModal');
            const viewLogsButton = document.getElementById('viewLogsButton');
            const closeLogsModal = document.querySelector('.logs-modal-close');
            
            viewLogsButton.onclick = function() {
                moodLogsModal.classList.add('is-active');
                $("#logsStudentNameModal").text(studentName);
                
                // Fetch and populate mood logs table
                $.ajax({
                    url: 'chat.php?action=getMoodLogs&user_id=' + userId,
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        const tbody = $("#moodLogsBody");
                        tbody.empty();
                        if (data.length > 0) {
                            data.forEach(log => {
                                const row = `<tr>
                                    <td>${log.log_id}</td>
                                    <td>${log.emotion}</td>
                                    <td>${log.sleep_hours}</td>
                                    <td>${log.energy_level}</td>
                                    <td>${log.triggers}</td>
                                    <td>${log.coping_mechanisms}</td>
                                    <td>${log.gratitude_entries}</td>
                                    <td>${log.log_date}</td>
                                </tr>`;
                                tbody.append(row);
                            });
                        } else {
                            tbody.html('<tr><td colspan="8">No mood logs found.</td></tr>');
                        }
                        if (moodLogsDataTable) { moodLogsDataTable.destroy(); }
                        moodLogsDataTable = $('#moodLogsTable').DataTable();
                    },
                    error: function() {
                        $("#moodLogsBody").html('<tr><td colspan="8" style="color: var(--color-warning-red);">Failed to load mood logs.</td></tr>');
                    }
                });
                
                // Fetch and populate DASS21 results table
                $.ajax({
                    url: 'chat.php?action=getDass21Results&user_id=' + userId,
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        const tbody = $("#dass21ResultsBody");
                        tbody.empty();
                        if (data.length > 0) {
                            data.forEach(result => {
                                const row = `<tr>
                                    <td>${result.created_at}</td>
                                    <td>${result.depression_severity} (${result.depression_score})</td>
                                    <td>${result.anxiety_severity} (${result.anxiety_score})</td>
                                    <td>${result.stress_severity} (${result.stress_score})</td>
                                </tr>`;
                                tbody.append(row);
                            });
                        } else {
                            tbody.html('<tr><td colspan="4">No DASS21 results found.</td></tr>');
                        }
                        if (dass21ResultsDataTable) { dass21ResultsDataTable.destroy(); }
                        dass21ResultsDataTable = $('#dass21ResultsTable').DataTable();
                    },
                    error: function() {
                        $("#dass21ResultsBody").html('<tr><td colspan="4" style="color: var(--color-warning-red);">Failed to load DASS21 results.</td></tr>');
                    }
                });
            }

            closeLogsModal.onclick = function() {
                moodLogsModal.classList.remove('is-active');
            }

            window.onclick = function(event) {
                if (event.target == moodLogsModal) {
                    moodLogsModal.classList.remove('is-active');
                }
            }

            // Logout Modal
            const logoutModal = document.getElementById('logoutModal');
            const logoutBtn = document.getElementById('logoutButton');
            const confirmLogoutBtn = document.getElementById('confirmLogout');
            const cancelLogoutBtn = document.getElementById('cancelLogout');
            const closeLogoutModal = document.querySelector('.logout-modal-close');

            if (logoutBtn) {
                logoutBtn.onclick = function() {
                    logoutModal.classList.add('is-active');
                }
            }
            if (closeLogoutModal) {
                closeLogoutModal.onclick = function() {
                    logoutModal.classList.remove('is-active');
                }
            }
            if (cancelLogoutBtn) {
                cancelLogoutBtn.onclick = function() {
                    logoutModal.classList.remove('is-active');
                }
            }
            if (confirmLogoutBtn) {
                confirmLogoutBtn.onclick = function() {
                    window.location.href = 'logout.php';
                }
            }
        });
    </script>
</body>
</html>