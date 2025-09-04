<?php
$servername = "localhost"; // Replace with your server name (e.g., "localhost" or IP)
$username = "root";        // Replace with your database username
$password = "";            // Replace with your database password
$dbname = "mindtrack_db";  // **CONFIRMED: Using 'mindtrack_db' as provided by user**

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    // If connection fails, output a JSON error message and exit
    // This prevents HTML errors from corrupting AJAX responses
    header('Content-Type: application/json');
    die(json_encode(['error' => "Database Connection Failed: " . $conn->connect_error]));
}

// No 'echo' or 'print' statements here!
// This file should only establish the connection.

