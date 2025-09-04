<?php
session_start(); // Start the session at the very beginning

// Check if the student is logged in (assuming 'id' is used for student login status)
if (isset($_SESSION['id'])) {

    unset($_SESSION['id']);   // Unset all session variables associated with the current session
    unset($_SESSION['firstname']);
}

// Redirect to the homepage or login page
header("Location: index.php");
exit();
?>