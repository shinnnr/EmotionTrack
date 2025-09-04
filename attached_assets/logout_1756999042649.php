<?php
session_start(); // Start the session at the very beginning

// Check if the admin is logged in (or if the admin session variables exist)
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    // Unset specific admin session variables
    unset($_SESSION['admin_logged_in']);
}

// Redirect to the login page
header("Location: login.php");
exit();
?>