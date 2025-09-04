<?php
session_start();
include 'db/db_connect.php'; // Adjust this to your actual database connection file

$user_id = $_SESSION['id']; // Ensure the user is logged in

// Fetch the last 7 emotion logs
$query = "SELECT emotion, sleep, triggers, coping, gratitude FROM mood_logs WHERE id = ? ORDER BY log_date DESC LIMIT 7";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$emotions = [];
$sleep_hours = [];
$triggers = [];
$copings = [];
$gratitudes = [];

while ($row = $result->fetch_assoc()) {
    $emotions[] = $row['emotion'];
    $sleep_hours[] = $row['sleep'];
    $triggers[] = $row['triggers'];
    $copings[] = $row['coping'];
    $gratitudes[] = $row['gratitude'];
}

// Determine the most common emotion
$most_common_emotion = array_search(max(array_count_values($emotions)), array_count_values($emotions));

// Calculate average sleep
$total_sleep = array_sum($sleep_hours);
$sleep_count = count($sleep_hours);
$average_sleep = $sleep_count > 0 ? round($total_sleep / $sleep_count, 1) : 0; // Round to 1 decimal place

$sleep_advice = "";
if ($average_sleep < 7) {
    $sleep_advice = "You need more sleep to maintain a healthy balance.";
} elseif ($average_sleep > 9) {
    $sleep_advice = "You might be oversleeping, try to regulate your sleep schedule.";
} else {
    $sleep_advice = "Your sleep pattern is within the healthy range.";
}

// Determine most frequent trigger and coping mechanism
$most_common_trigger = array_search(max(array_count_values($triggers)), array_count_values($triggers));
$most_common_coping = array_search(max(array_count_values($copings)), array_count_values($copings));

// Get the most recent gratitude log
$latest_gratitude = end($gratitudes);

// Format the response
$response = [
    "emotion" => $most_common_emotion,
    "average_sleep" => $average_sleep,
    "sleep_advice" => $sleep_advice,
    "trigger" => $most_common_trigger,
    "coping" => $most_common_coping,
    "gratitude" => $latest_gratitude
];

echo json_encode($response);
?>