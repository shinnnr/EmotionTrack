<?php
// Start session and set cookie params for better persistence
session_set_cookie_params(86400); // 1 day session
session_start();

header("Content-Type: application/json"); // Ensure JSON response
include 'db/db_connect.php'; // Ensure database connection

// Enable error reporting for debugging (Remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

$response = ["status" => "error", "message" => "Unknown error"]; // Default response

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Validate and sanitize input fields
    $email = isset($_POST["email"]) ? filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL) : "";
    $password = isset($_POST["password"]) ? trim($_POST["password"]) : "";

    if (empty($email) || empty($password)) {
        $response["message"] = "Email and password are required";
        echo json_encode($response);
        exit;
    }

    // Ensure database connection is established
    if (!$conn) {
        $response["message"] = "Database connection failed: " . mysqli_connect_error();
        echo json_encode($response);
        exit;
    }

    // Prepare statement to fetch user details
$stmt = $conn->prepare("SELECT id, firstname, password, role FROM users WHERE email = ?");

if (!$stmt) {
    $response["message"] = "SQL error: " . $conn->error;
    echo json_encode($response);
    exit;
}

$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

// Check if user exists
if ($stmt->num_rows > 0) {
    $stmt->bind_result($id, $firstname, $hashed_password, $role);
    $stmt->fetch();

    // Verify password
    if (password_verify($password, $hashed_password)) {
        session_regenerate_id(true); // Prevent session fixation
        $_SESSION["id"] = $id;
        $_SESSION["firstname"] = $firstname;
        $_SESSION["role"] = $role;

        $response = [
            "status" => "success",
            "message" => "Login successful",
            "firstname" => $firstname,
            "role" => $role // <-- include role in JSON response
        ];
    } else {
        $response["message"] = "Invalid password";
    }
} else {
    $response["message"] = "User not found";
}


    $stmt->close();
    $conn->close();
}

echo json_encode($response);
?>