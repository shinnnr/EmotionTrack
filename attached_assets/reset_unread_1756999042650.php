<?php
// reset_unread.php
session_start();
require 'db_connect.php'; // adjust path if needed

if (isset($_POST['student_id'])) {
    $sid = intval($_POST['student_id']);
    $stmt = $conn->prepare("UPDATE users SET unread_messages = 0 WHERE id = ?");
    $stmt->bind_param("i", $sid);
    $stmt->execute();
    echo "ok";
}
?>
