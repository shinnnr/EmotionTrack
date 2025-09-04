<?php
session_start();
include 'db/db_connect.php'; // Ensure correct database connection path

// Check if user is logged in
if (!isset($_SESSION['id'])) {
    header("Location: index.php?login=1");
    exit;
}

$id = $_SESSION['id'];

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $newFirstname = trim($_POST['firstname']);
    $lastname = trim($_POST['lastname']);
    $age = intval($_POST['age']);
    $college = trim($_POST['college']);
    $course = trim($_POST['course']);
    $year = trim($_POST['year']);
    $newPassword = trim($_POST['newPassword']);
    $oldPassword = trim($_POST['oldPassword']);

    include 'db/db_connect.php'; // Ensure database connection

    // Fetch user data to verify old password
    $sql = "SELECT id, password FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $_SESSION['profile_update_error'] = "User not found.";
        header("Location: profile.php");
        exit;
    }

    $user = $result->fetch_assoc();
    $userId = $user['id'];
    $hashedPassword = $user['password'];

    // If user is updating password, verify old password
    if (!empty($newPassword) && !empty($oldPassword)) {
        if (!password_verify($oldPassword, $hashedPassword)) {
            $_SESSION['profile_update_error'] = "Old password is incorrect.";
            header("Location: profile.php");
            exit;
        }
        $newPasswordHashed = password_hash($newPassword, PASSWORD_DEFAULT);
    } else {
        $newPasswordHashed = $hashedPassword; // Keep existing password if not updating
    }

    // Update user details
    $updateSql = "UPDATE users SET firstname = ?, lastname = ?, age = ?, college = ?, course = ?, year = ?, password = ? WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("ssissssi", $newFirstname, $lastname, $age, $college, $course, $year, $newPasswordHashed, $userId);

    if ($updateStmt->execute()) {
        $_SESSION['profile_update_success'] = "Profile updated successfully!";
    } else {
        $_SESSION['profile_update_error'] = "Error updating profile.";
    }

    $updateStmt->close();
    $conn->close();

    // Redirect to profile page
    header("Location: profile.php");
    exit;
}
