<?php
session_start();
ob_start();

// Check if the user is logged in and is an admin
if (!isset($_SESSION['id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../index.php"); // Redirect back to main login if not admin
    exit();
}

include '../db/db_connect.php'; // Adjust path as necessary, assuming db_connect.php is in 'db' folder relative to admin.php

// Function to Calculate Student Risk Score
function calculateRiskScore($conn, $userId) {
    $severity_scores = [
        'Normal' => 0, 'Mild' => 1, 'Moderate' => 2.5,
        'Severe' => 5, 'Extremely Severe' => 10
    ];
    $dass_sql = "SELECT depression_severity, anxiety_severity, stress_severity FROM dass21_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1";
    $stmt = $conn->prepare($dass_sql);
    if (!$stmt) { error_log("Failed to prepare DASS21 query: " . $conn->error); return 0; }
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $dass_result = $stmt->get_result();
    $dass_data = $dass_result->fetch_assoc();
    $stmt->close();

    $risk_score = 0;
    if ($dass_data) {
        $risk_score += $severity_scores[$dass_data['depression_severity']] ?? 0;
        $risk_score += $severity_scores[$dass_data['anxiety_severity']] ?? 0;
        $risk_score += $severity_scores[$dass_data['stress_severity']] ?? 0;
    }

    $mood_sql = "SELECT COUNT(*) as negative_moods_count FROM mood_logs WHERE id = ? AND log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND emotion IN ('Sad', 'Angry', 'Stressed', 'Hopeless', 'Anxious')";
    $stmt = $conn->prepare($mood_sql);
    if (!$stmt) { error_log("Failed to prepare mood logs query: " . $conn->error); return $risk_score; }
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $mood_result = $stmt->get_result();
    $mood_data = $mood_result->fetch_assoc();
    $stmt->close();
    if ($mood_data && $mood_data['negative_moods_count'] > 0) {
        $risk_score += $mood_data['negative_moods_count'] * 0.5;
    }

    $update_sql = "UPDATE users SET risk_score = ? WHERE id = ?";
    $stmt = $conn->prepare($update_sql);
    if (!$stmt) { error_log("Failed to prepare update query: " . $conn->error); return $risk_score; }
    $stmt->bind_param("di", $risk_score, $userId);
    $stmt->execute();
    $stmt->close();
    return $risk_score;
}

// =========================================================================
// Integrated API Logic for AJAX Requests (High-Risk and Unread)
// =========================================================================
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    $response = ['status' => 'error', 'message' => 'Invalid action'];
    ob_clean();
    switch ($_GET['action']) {
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
    }
    echo json_encode($response);
    exit();
}

// Recalculate and fetch students based on risk score
$user_sql = "SELECT id, firstname FROM users WHERE role != 'admin'";
$user_result = $conn->query($user_sql);

if ($user_result->num_rows > 0) {
    $user_result->data_seek(0);
    while ($user = $user_result->fetch_assoc()) {
        calculateRiskScore($conn, $user['id']);
    }
}

$student_list_sql = "SELECT id, firstname, risk_score, strand, section, unread_count FROM users WHERE role != 'admin' ORDER BY strand ASC, section ASC, risk_score DESC, id ASC";
$student_list_result = $conn->query($student_list_sql);

$grouped_students = [];
if ($student_list_result && $student_list_result->num_rows > 0) {
    while ($user = $student_list_result->fetch_assoc()) {
        $strand = $user['strand'] ?? 'Unassigned Strand';
        $section = $user['section'] ?? 'Unassigned Section';
        if (!isset($grouped_students[$strand])) { $grouped_students[$strand] = []; }
        if (!isset($grouped_students[$strand][$section])) { $grouped_students[$strand][$section] = []; }
        $grouped_students[$strand][$section][] = $user;
    }
}

$has_high_risk_sql = "SELECT COUNT(*) as count FROM users WHERE role != 'admin' AND risk_score > 10";
$has_high_risk_result = $conn->query($has_high_risk_sql);
$has_high_risk = false;
if ($has_high_risk_result && $has_high_risk_result->fetch_assoc()['count'] > 0) {
    $has_high_risk = true;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Messenger View</title>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="index.css">
    <link rel="icon" type="image/png" href="../clsu-logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">

    <style>
        /* Messenger-like small blue circle badge */
        .unread-badge {
          background-color: #1877f2; /* Messenger blue */
          color: white;
          font-size: 12px;
          font-weight: bold;
          border-radius: 50%;
          padding: 2px 6px;
          margin-left: 6px;
          display: inline-block;
          min-width: 18px;
          text-align: center;
        }

        .student-item { cursor:pointer; padding:6px 8px; display:flex; justify-content:space-between; align-items:center; }
        .student-item.active { background:#eef6ff; }
    </style>
</head>
<body>
    <header class="main-header">
        <div class="header-left">
            <img src="sjc.png" alt="City High Logo" class="sjc-logo">
            <h1 class="header-title">Student Directory</h1>
        </div>
        <div class="header-right">
            <a href="javascript:void(0);" class="logout-button" id="logoutConfirmButton">
                <i class="fas fa-sign-out-alt"></i> Logout
            </a>
        </div>
    </header>

    <div class="admin-wrapper">
        <div class="student-list-panel">
            <h2>Student List</h2>
            <div class="student-search">
                <input type="text" id="studentSearchInput" placeholder="Search students...">
            </div>

            <?php if ($has_high_risk): ?>
                <div class="high-risk-alert-box">
                    <button id="highRiskStudentsButton" class="high-risk-button">
                        <i class="fas fa-exclamation-triangle"></i> View High-Risk Students
                    </button>
                </div>
            <?php endif; ?>
            
            <ul id="studentList" class="strand-list">
                <?php if (count($grouped_students) > 0): ?>
                    <?php foreach ($grouped_students as $strand_name => $sections): ?>
                        <li class="strand-item">
                            <button class="strand-button"><i class="fas fa-chevron-right"></i> <?php echo htmlspecialchars($strand_name); ?></button>
                            <ul class="section-list">
                                <?php foreach ($sections as $section_name => $students): ?>
                                    <li class="section-item">
                                        <button class="section-button"><i class="fas fa-chevron-right"></i> <?php echo htmlspecialchars($section_name); ?></button>
                                        <ul class="students-in-section">
                                            <?php foreach ($students as $user): ?>
                                                <?php
                                                    $student_name = !empty($user['firstname']) ? htmlspecialchars($user['firstname']) : 'Student ' . $user['id'];
                                                    $unread = (int)($user['unread_count'] ?? 0);
                                                ?>
                                                <li class="student-item" data-user-id="<?php echo $user['id']; ?>" data-username="<?php echo $student_name; ?>">
                                                    <span class="student-name"><?php echo $student_name; ?></span>
                                                    <div class="right-meta">
                                                        <?php if ($user['risk_score'] > 10): ?>
                                                            <span class="high-risk-badge">High Risk</span>
                                                        <?php endif; ?>
                                                        <span class="unread-badge" style="<?php echo $unread > 0 ? '' : 'display:none;'; ?>"><?php echo $unread > 0 ? $unread : ''; ?></span>
                                                    </div>
                                                </li>
                                            <?php endforeach; ?>
                                        </ul>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        </li>
                    <?php endforeach; ?>
                <?php else: ?>
                    <li class="no-students">No students found.</li>
                <?php endif; ?>
            </ul>
        </div>
    </div>

    <div class="modal" id="highRiskModal">
        <div class="modal-content large-modal-content">
            <span class="close-modal high-risk-modal-close">&times;</span>
            <h3>High-Risk Students</h3>
            <div id="highRiskListContainer">
                <p>Loading...</p>
            </div>
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

    <script>
        $(document).ready(function () {
            // Unread badge logic
            function refreshUnreadBadges() {
                $.ajax({
                    url: 'index.php?action=fetchUnreadCounts',
                    method: 'GET',
                    dataType: 'json',
                    success: function(map) {
                        $(".student-item").each(function() {
                            const uid = $(this).data('userId');
                            const count = map[uid] ? parseInt(map[uid], 10) : 0;
                            const badge = $(this).find('.unread-badge');
                            if (count > 0) {
                                badge.text(count).show();
                            } else {
                                badge.text('').hide();
                            }
                        });
                    }
                });
            }
            refreshUnreadBadges();
            setInterval(refreshUnreadBadges, 5000);

            // Student list click handler - Redirects to new chat page
            $(document).on('click', '.student-item', function () {
                const userId = $(this).data('userId');
                window.location.href = `chat.php?user_id=${userId}`;
            });
            
            // High-risk modal logic
            function loadHighRiskStudentsModal() {
                const container = $("#highRiskListContainer");
                container.html("<p style='text-align: center;'><i class='fas fa-spinner fa-spin'></i> Loading...</p>");
                $.ajax({
                    url: 'index.php?action=getHighRiskStudents',
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        container.empty();
                        if (data.length > 0) {
                            const grouped = {};
                            data.forEach(student => {
                                const strand = student.strand || 'Unassigned Strand';
                                const section = student.section || 'Unassigned Section';
                                if (!grouped[strand]) { grouped[strand] = {}; }
                                if (!grouped[strand][section]) { grouped[strand][section] = []; }
                                grouped[strand][section].push(student);
                            });

                            let html = '';
                            for (const strand in grouped) {
                                html += `<div class="modal-strand-group"><h4>${strand}</h4><ul class="modal-section-list">`;
                                for (const section in grouped[strand]) {
                                    html += `<li class="modal-section-item"><strong>${section}</strong><ul class="modal-student-list">`;
                                    grouped[strand][section].forEach(student => {
                                        const studentName = student.firstname || 'Student ' + student.id;
                                        html += `<li class="modal-student-item" data-user-id="${student.id}" data-username="${studentName}">
                                                    <span class="modal-student-name">${studentName}</span>
                                                    <span class="modal-risk-score">(Score: ${parseFloat(student.risk_score).toFixed(2)})</span>
                                                </li>`;
                                    });
                                    html += `</ul></li>`;
                                }
                                html += `</ul></div>`;
                            }
                            container.html(html);
                            
                            $('.modal-student-item').on('click', function() {
                                const userId = $(this).data('userId');
                                window.location.href = `chat.php?user_id=${userId}`;
                            });

                        } else {
                            container.html("<p style='text-align: center;'>No high-risk students found at this time.</p>");
                        }
                    },
                    error: function() {
                        container.html("<p style='text-align: center; color: red;'>Failed to load high-risk students.</p>");
                    }
                });
                $("#highRiskModal").addClass("is-active");
            }

            $('#highRiskStudentsButton').on('click', loadHighRiskStudentsModal);
            $('.high-risk-modal-close').on('click', function() { $("#highRiskModal").removeClass("is-active"); });

            // Logout modal logic
            $('#logoutConfirmButton').on('click', function(e) {
                e.preventDefault();
                $('#logoutModal').addClass('is-active');
            });
            $('#confirmLogout').on('click', function() { window.location.href = '../logout.php'; });
            $('#cancelLogout, .logout-modal-close').on('click', function() { $('#logoutModal').removeClass('is-active'); });

            // Search and toggle logic
            $('#studentSearchInput').on('keyup', function () {
                const searchTerm = $(this).val().toLowerCase();
                $('.student-item').each(function () {
                    const studentName = $(this).data('username').toLowerCase();
                    $(this).toggle(studentName.includes(searchTerm));
                });
                $('.strand-item, .section-item').each(function () {
                    const hasVisibleStudents = $(this).find('.student-item:visible').length > 0;
                    $(this).toggle(hasVisibleStudents);
                });
            });
            $(document).on('click', '.strand-button', function() {
                $(this).parent().find('.section-list').first().slideToggle();
                $(this).find('.fas').toggleClass('fa-chevron-right fa-chevron-down');
            });
            $(document).on('click', '.section-button', function() {
                $(this).parent().find('.students-in-section').first().slideToggle();
                $(this).find('.fas').toggleClass('fa-chevron-right fa-chevron-down');
            });
        });
    </script>
</body>
</html>