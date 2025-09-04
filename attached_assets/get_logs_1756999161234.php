<?php
session_start(); // Ensure session is started for $_SESSION['id']
include '../db/db_connect.php';

// Get session ID from AJAX request or fallback to PHP session
// Validate user ID to prevent direct manipulation if possible
$user_id = isset($_GET['session_id']) ? (int) $_GET['session_id'] : (isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0);

if ($user_id === 0) {
    echo '<p class="error-message">Error: User not identified. Please log in.</p>';
    exit;
}

// Pagination setup
$logs_per_page = 5;
$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$page = max($page, 1); // Ensure page is at least 1
$offset = ($page - 1) * $logs_per_page;

// Fetch logs for the logged-in user
$logs_query = "SELECT log_id, emotion, log_date FROM mood_logs WHERE id = ? ORDER BY log_date DESC LIMIT ? OFFSET ?";
$stmt = $conn->prepare($logs_query);

if (!$stmt) {
    error_log("Prepare failed for get_logs: (" . $conn->errno . ") " . $conn->error);
    echo '<p class="error-message">Error fetching logs. Please try again.</p>';
    $conn->close();
    exit;
}

$stmt->bind_param("iii", $user_id, $logs_per_page, $offset);
$stmt->execute();
$logs_result = $stmt->get_result();
$logs = $logs_result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// Output logs dynamically
if (!empty($logs)) {
    echo '<ul>';
    foreach ($logs as $log) {
        // Adding a class for individual log styling
        echo '<li class="emotion-log-item">';
        echo '<span class="log-info"><strong>' . htmlspecialchars($log['emotion']) . '</strong> - <span class="log-date">' . htmlspecialchars($log['log_date']) . '</span></span>';
        echo '<button class="view-details-btn" onclick="showLogDetails(' . $log['log_id'] . ')">View Details</button>';
        echo '</li>';
    }
    echo '</ul>';

    // Get total log count (needs a new statement as previous one is closed)
    $total_query = "SELECT COUNT(*) FROM mood_logs WHERE id = ?";
    $stmt_total = $conn->prepare($total_query);
    if (!$stmt_total) {
        error_log("Prepare failed for total logs count: (" . $conn->errno . ") " . $conn->error);
        echo '<p class="error-message">Error calculating total logs.</p>';
    } else {
        $stmt_total->bind_param("i", $user_id);
        $stmt_total->execute();
        $stmt_total->bind_result($total_logs);
        $stmt_total->fetch();
        $stmt_total->close();

        $total_pages = ceil($total_logs / $logs_per_page);

        // Pagination controls
        echo '<div class="pagination">';
        if ($page > 1) {
            echo '<button class="pagination-link" data-page="' . ($page - 1) . '">Previous</button>';
        }
        echo '<span>Page ' . $page . ' of ' . $total_pages . '</span>';
        if ($page < $total_pages) {
            echo '<button class="pagination-link" data-page="' . ($page + 1) . '">Next</button>';
        }
        echo '</div>';
    }
} else {
    echo '<p class="info-message">No emotion logs found. Start tracking your emotions!</p>';
}

$conn->close();
?>