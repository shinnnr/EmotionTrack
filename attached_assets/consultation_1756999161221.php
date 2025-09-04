<?php
// consultation.php - page view (no AJAX logic here)
// Save as UTF-8 WITHOUT BOM

session_start();
if (!isset($_SESSION['id'])) {
    header("Location: ../login.php");
    exit();
}

$current_user_id = (int) $_SESSION['id'];
$user_firstname = isset($_SESSION['firstname']) ? (string)$_SESSION['firstname'] : 'Student';
$user_initials = strtoupper(substr($user_firstname, 0, 1));
if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(16));
$csrf_token = $_SESSION['csrf_token'];

// We intentionally do not run DB queries here; client fetches messages via API
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Your Consultation Chat</title>
    <link rel="stylesheet" href="consultation.css">
    <link rel="icon" type="image/png" href="sjc.png">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
    
    <!-- REMOVED: FontAwesome CDN -->
    <!-- ADDED: Local FontAwesome -->
    <link rel="stylesheet" href="fontawesome-local.css">
    
    <!-- REMOVED: jQuery CDN -->
    <!-- ADDED: Local jQuery -->
    <script src="jquery-local.js"></script>
    
    <script>
        window.CONSULT_CFG = {
            apiBase: "consultation_api.php",
            csrf: "<?php echo htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8'); ?>",
            lastTimestamp: "",
            userInitials: "<?php echo htmlspecialchars($user_initials, ENT_QUOTES, 'UTF-8'); ?>"
        };
    </script>
</head>
<body>
    <?php include 'sidebar.php'; // sidebar may output HTML for page ?>
    
    <img src="sjc.png" alt="City High Logo" class="sjc-logo">
    
    <div class="main-content">
        <div class="chat-wrapper">
            <div class="chat-header">
                <div class="counselor-info">
                    <div class="avatar" id="counselorAvatar">CH</div>
                    <div class="info-text"><div class="name">City High Counselor</div></div>
                </div>
                <div class="session-info"><span class="session-title">Consultation</span><span class="session-sub">Private & Secure</span></div>
            </div>

            <div class="chat-container" id="chatContainer">
                </div>

            <button id="jumpToLatest" class="jump-to-latest" style="display:none;"><i class="fa-solid fa-arrow-down"></i> New messages</button>

            <div class="typing-indicator" id="typingIndicator" aria-hidden="true" style="display:none;">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>

            <div class="quick-responses-area" id="quickResponsesArea">
                <button class="quick-response-button" data-message="How can I manage stress from school?">Manage School Stress</button>
                <button class="quick-response-button" data-message="I feel overwhelmed, what should I do?">Feeling Overwhelmed</button>
                <button class="quick-response-button" data-message="Can you give me some tips for better sleep?">Better Sleep Tips</button>
                <button class="quick-response-button" data-message="How do I cope with loneliness?">Coping with Loneliness</button>
            </div>

            <div class="message-input-area">
                <textarea id="studentMessageInput" placeholder="Type your message..." rows="1"></textarea>
                <button id="sendMessageButton"><i class="fas fa-paper-plane"></i> Send</button>
            </div>
        </div>
    </div>
    
    <script src="consultation.js"></script>
</body>
</html>