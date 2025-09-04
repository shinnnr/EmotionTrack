<?php
header("Content-Type: application/json");

// Include database connection
include 'db/db_connect.php';

$response = ["status" => "error", "message" => "Unknown error occurred."];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Corrected required fields to match the HTML form's 'name' attributes
    $required_fields = ['first_name', 'last_name', 'email', 'password', 'birthday', 'strand', 'grade', 'section'];

    foreach ($required_fields as $field) {
        if (!isset($_POST[$field]) || empty(trim($_POST[$field]))) {
            $response["message"] = ucfirst(str_replace('_', ' ', $field)) . " is required"; // Nicer message
            echo json_encode($response);
            exit;
        }
    }

    // Assigning POST data to variables, using the correct field names
    $firstname = trim($_POST["first_name"]); // Corrected
    $lastname = trim($_POST["last_name"]);   // Corrected
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $password = password_hash(trim($_POST["password"]), PASSWORD_DEFAULT);
    $birthday = trim($_POST["birthday"]);
    $strand = trim($_POST["strand"]);     // Corrected to match HTML
    $grade = trim($_POST["grade"]);       // Corrected to match HTML
    $section = trim($_POST["section"]);   // Corrected to match HTML
    $role = 'student';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response["message"] = "Invalid email format";
        echo json_encode($response);
        exit;
    }

    // Check if database connection is established
    if (!isset($conn) || $conn->connect_error) { // Added connect_error check
        $response["message"] = "Database connection failed: " . (isset($conn) ? $conn->connect_error : "No connection object");
        echo json_encode($response);
        exit;
    }

    // Check if email already exists
    $check_stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    if (!$check_stmt) {
        $response["message"] = "Prepare failed: (" . $conn->errno . ") " . $conn->error;
        echo json_encode($response);
        $conn->close();
        exit;
    }
    $check_stmt->bind_param("s", $email);
    $check_stmt->execute();
    $check_stmt->store_result();

    if ($check_stmt->num_rows > 0) {
        $response["message"] = "Email already exists";
        echo json_encode($response);
        $check_stmt->close();
        $conn->close();
        exit;
    }
    $check_stmt->close();

    $stmt = $conn->prepare("INSERT INTO users (firstname, lastname, email, password, birthday, strand, grade_level, section, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        $response["message"] = "Prepare failed: (" . $conn->errno . ") " . $conn->error;
        echo json_encode($response);
        $conn->close();
        exit;
    }
    $stmt->bind_param("sssssssss", $firstname, $lastname, $email, $password, $birthday, $strand, $grade, $section, $role);

    if ($stmt->execute()) {
        $response = ["status" => "success", "message" => "Signup Successful! Welcome, " . $firstname . "!"];
    } else {
        $response["message"] = "Error Signing Up: " . $stmt->error; // Added stmt->error for debugging
    }

    $stmt->close();
    $conn->close();
} else {
    $response["message"] = "Invalid request method.";
}

echo json_encode($response);
?>