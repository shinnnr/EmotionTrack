<?php
session_start();

if (!isset($_SESSION['id'])) {
    header("Location: login.php");
    exit();
}

$userId = $_SESSION['id'];

// DASS-21 Item to Subscale Mapping
$depression_items = [3, 5, 10, 13, 16, 17, 21];
$anxiety_items = [2, 4, 7, 9, 15, 19, 20];
$stress_items = [1, 6, 8, 11, 12, 14, 18];

$dass21_scores = [
    'D' => 0,
    'A' => 0,
    'S' => 0
];

// Collect responses and calculate raw scores
foreach ($_POST as $key => $value) {
    if (strpos($key, 'q') === 0) {
        $q_num = (int) substr($key, 1); // Extract question number

        // Ensure value is a valid integer between 0 and 3
        $score = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 3]]);
        if ($score === false) {
            // Handle invalid input, perhaps redirect back or show error
            echo "Error: Invalid score for question " . $q_num;
            exit();
        }

        if (isset($_POST["q$q_num"]) && in_array($q_num, $depression_items)) {
            $dass21_scores['D'] += $score;
        } elseif (in_array($q_num, $anxiety_items)) {
            $dass21_scores['A'] += $score;
        } elseif (in_array($q_num, $stress_items)) {
            $dass21_scores['S'] += $score;
        }
    }
}

// Multiply by 2 for DASS-21 scores
$depression_final_score = $dass21_scores['D'] * 2;
$anxiety_final_score = $dass21_scores['A'] * 2;
$stress_final_score = $dass21_scores['S'] * 2;

// DASS-21 Severity Thresholds
function get_dass_severity($score, $scale_type) {
    $thresholds = [
        'D' => ['Normal' => [0, 9], 'Mild' => [10, 13], 'Moderate' => [14, 20], 'Severe' => [21, 27], 'Extremely Severe' => [28, 100]],
        'A' => ['Normal' => [0, 7], 'Mild' => [8, 9], 'Moderate' => [10, 14], 'Severe' => [15, 19], 'Extremely Severe' => [20, 100]],
        'S' => ['Normal' => [0, 14], 'Mild' => [15, 18], 'Moderate' => [19, 25], 'Severe' => [26, 33], 'Extremely Severe' => [34, 100]]
    ];

    foreach ($thresholds[$scale_type] as $severity => $range) {
        if ($score >= $range[0] && $score <= $range[1]) {
            return $severity;
        }
    }
    return "N/A"; // Should not happen with comprehensive ranges
}

$depression_severity = get_dass_severity($depression_final_score, 'D');
$anxiety_severity = get_dass_severity($anxiety_final_score, 'A');
$stress_severity = get_dass_severity($stress_final_score, 'S');

require '../db/db_connect.php';

// Prepare and bind (recommended for security to prevent SQL injection)
$stmt = $conn->prepare("INSERT INTO dass21_results (user_id, depression_score, anxiety_score, stress_score, depression_severity, anxiety_severity, stress_severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
$stmt->bind_param("iiiisss", $userId, $depression_final_score, $anxiety_final_score, $stress_final_score, $depression_severity, $anxiety_severity, $stress_severity);

if ($stmt->execute()) {
    // Successfully saved
    $message = "Your DASS-21 scores have been recorded successfully!";
} else {
    // Error saving
    $message = "Error saving DASS-21 scores: " . $stmt->error;
}

$stmt->close();
$conn->close();

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DASS-21 Results</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="home.css"> <link rel="icon" type="image/png" href="clsu-logo.png">
    <style>
        .results-container {
            max-width: 800px;
            margin: 50px auto;
            padding: 30px;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .results-container h2 {
            color: #333;
            margin-bottom: 25px;
        }
        .score-display {
            display: flex;
            justify-content: space-around;
            margin-top: 30px;
            flex-wrap: wrap;
        }
        .score-box {
            background-color: #e8f5e9; /* Light green for positive/neutral feedback */
            padding: 20px;
            border-radius: 8px;
            width: 30%; /* Adjust as needed */
            margin: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        .score-box h3 {
            color: #2e7d32; /* Dark green */
            margin-top: 0;
            margin-bottom: 10px;
        }
        .score-box p {
            font-size: 1.2em;
            color: #555;
            margin-bottom: 5px;
        }
        .score-box .severity {
            font-weight: bold;
            font-size: 1.3em;
            padding: 5px 10px;
            border-radius: 4px;
        }
        /* Severity specific colors */
        .severity-Normal { background-color: #c8e6c9; color: #2e7d32; }
        .severity-Mild { background-color: #fffde7; color: #f9a825; }
        .severity-Moderate { background-color: #ffe0b2; color: #ef6c00; }
        .severity-Severe { background-color: #ffccbc; color: #d84315; }
        .severity-Extremely.Severe { background-color: #ef9a9a; color: #c62828; }

        .disclaimer {
            margin-top: 40px;
            font-size: 0.9em;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <?php include '../sidebar.php'; ?> 
    <br><br>
    <img src="sjc.png" alt="City High Logo" class="sjc-logo">

    <div class="results-container">
        <h2>Your DASS-21 Assessment Results</h2>
        <p><?php echo htmlspecialchars($message); ?></p>

        <div class="score-display">
            <div class="score-box">
                <h3>Depression</h3>
                <p>Score: <?php echo $depression_final_score; ?></p>
                <p class="severity severity-<?php echo str_replace(' ', '', $depression_severity); ?>"><?php echo $depression_severity; ?></p>
            </div>
            <div class="score-box">
                <h3>Anxiety</h3>
                <p>Score: <?php echo $anxiety_final_score; ?></p>
                <p class="severity severity-<?php echo str_replace(' ', '', $anxiety_severity); ?>"><?php echo $anxiety_severity; ?></p>
            </div>
            <div class="score-box">
                <h3>Stress</h3>
                <p>Score: <?php echo $stress_final_score; ?></p>
                <p class="severity severity-<?php echo str_replace(' ', '', $stress_severity); ?>"><?php echo $stress_severity; ?></p>
            </div>
        </div>

        <p class="disclaimer">
            The DASS-21 is a screening tool and is not a substitute for professional clinical diagnosis. If you are experiencing high levels of depression, anxiety, or stress, please consider consulting a qualified mental health professional.
        </p>

        <p><a href="../home.php">Return to Home</a></p>
    </div>

</body>
</html>