<?php
// PHP session start and database connection
session_start();
include '../db/db_connect.php'; // Ensure this path is correct for your environment

// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo "<p class='text-center text-red-500 font-semibold mt-10'>Please <a href='home.php?login=1' class='text-blue-600 hover:underline'>log in</a> to view your profile.</p>";
    exit;
}
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

$dass_answers = [];

if (isset($_POST['dass21_submit'])) {
    // Answers came as individual q1..q21 inputs
    for ($i = 1; $i <= 21; $i++) {
        if (isset($_POST["q$i"])) {
            $dass_answers[$i] = (int)$_POST["q$i"];
        }
    }
} elseif (!empty($_POST['dass21_answers'])) {
    // Answers came as a JSON string from metric.php
    $tmp = json_decode($_POST['dass21_answers'], true);
    if (is_array($tmp)) {
        // Ensure keys are 1..21 ints
        for ($i = 1; $i <= 21; $i++) {
            $dass_answers[$i] = isset($tmp[$i]) ? (int)$tmp[$i] : 0;
        }
    }
}

// Define severity function


if (!empty($dass_answers)) {
    $userId = $_SESSION['id'];

    $depression_items = [3, 5, 10, 13, 16, 17, 21];
    $anxiety_items    = [2, 4, 7, 9, 15, 19, 20];
    $stress_items     = [1, 6, 8, 11, 12, 14, 18];

    $sumD = $sumA = $sumS = 0;
    foreach ($dass_answers as $q_num => $score) {
        if (in_array($q_num, $depression_items, true)) $sumD += (int)$score;
        if (in_array($q_num, $anxiety_items, true))    $sumA += (int)$score;
        if (in_array($q_num, $stress_items, true))     $sumS += (int)$score;
    }

    $depression_final_score = $sumD * 2;
    $anxiety_final_score    = $sumA * 2;
    $stress_final_score     = $sumS * 2;

    // (keep your get_dass_severity function as-is)
    $depression_severity = get_dass_severity($depression_final_score, 'D');
    $anxiety_severity    = get_dass_severity($anxiety_final_score, 'A');
    $stress_severity     = get_dass_severity($stress_final_score, 'S');

    // Save to DB (your existing prepared statement)
    $stmt = $conn->prepare("INSERT INTO dass21_results (user_id, depression_score, anxiety_score, stress_score, depression_severity, anxiety_severity, stress_severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
    $stmt->bind_param("iiiisss", $userId, $depression_final_score, $anxiety_final_score, $stress_final_score, $depression_severity, $anxiety_severity, $stress_severity);

    if ($stmt->execute()) {
        $dass21_message = "Your DASS-21 scores have been recorded successfully!";
    } else {
        $dass21_message = "Error saving DASS-21 scores: " . $stmt->error;
    }
    $stmt->close();

    // Canonical session structure expected by your UI:
    $_SESSION['dass21_results'] = [
        'depression_score'   => $depression_final_score,
        'anxiety_score'      => $anxiety_final_score,
        'stress_score'       => $stress_final_score,
        'depression_severity'=> $depression_severity,
        'anxiety_severity'   => $anxiety_severity,
        'stress_severity'    => $stress_severity,
        'message'            => $dass21_message
    ];
}


// Handle mood logging form submission
if (isset($_POST['emotions'])) {
    // Retrieve and sanitize POST data
    $user_id = $_SESSION['id'];
    $emotionsJson = $_POST['emotions'];
    $emotions = json_decode($emotionsJson, true); // Decode JSON string to array
    $sleep = filter_input(INPUT_POST, 'sleep', FILTER_SANITIZE_NUMBER_INT);
    $energy = filter_input(INPUT_POST, 'energy', FILTER_SANITIZE_NUMBER_INT);
    $triggers = filter_input(INPUT_POST, 'triggers', FILTER_SANITIZE_SPECIAL_CHARS);
    $coping = filter_input(INPUT_POST, 'coping', FILTER_SANITIZE_SPECIAL_CHARS);
    $gratitude = filter_input(INPUT_POST, 'gratitude', FILTER_SANITIZE_SPECIAL_CHARS);

    // Default values for optional fields if not provided
    $coping = $coping ? $coping : 'None';
    $gratitude = $gratitude ? $gratitude : '';

    $timestamp = date("Y-m-d H:i:s");

    // Start transaction for atomicity
    $conn->begin_transaction();
    $insertSuccess = true;

    // Insert each emotion with the current timestamp
    foreach ($emotions as $emotion) {
        // Prepare and bind parameters for security
        $stmt = $conn->prepare("INSERT INTO mood_logs (id, emotion, sleep, energy, triggers, coping, gratitude, log_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isiissss", $user_id, $emotion, $sleep, $energy, $triggers, $coping, $gratitude, $timestamp);

        // Execute statement and check for errors
        if (!$stmt->execute()) {
            error_log("Error logging data: " . $stmt->error); // Log error instead of echoing
            $insertSuccess = false;
            break; // Exit loop on first error
        }
        $stmt->close();
    }

    // Commit or rollback transaction
    if ($insertSuccess) {
        $conn->commit();
    } else {
        $conn->rollback();
        echo "<p>An error occurred while logging your mood. Please try again.</p>";
        exit;
    }

    // Select all entries with the same timestamp for this user.
    // This is to retrieve all logged emotions for the *current* log entry
    $stmt = $conn->prepare("SELECT emotion, sleep, energy, triggers, coping, gratitude, log_date FROM mood_logs WHERE id = ? AND log_date = ?");
    $stmt->bind_param("is", $user_id, $timestamp);
    $stmt->execute();
    $result = $stmt->get_result();

    $latestLogs = [];
    while ($row = $result->fetch_assoc()) {
        $latestLogs[] = $row;
    }

    $stmt->close();
    
    // Store mood results for display
    $_SESSION['mood_results'] = $latestLogs;
    $_SESSION['mood_timestamp'] = $timestamp;
}

$conn->close();

// Process the fetched data for display and advice generation
if (!empty($latestLogs)) {
    $firstLog = $latestLogs[0]; // All entries share sleep, energy, triggers, coping, gratitude, log_date for this specific log.
    $emotionsList = implode(", ", array_column($latestLogs, 'emotion'));

    $timestampObj = strtotime($firstLog['log_date']);
    $formattedTime = date("h:i A", $timestampObj);

    if (date("Y-m-d") == date("Y-m-d", $timestampObj)) {
        $formattedDate = "Today at $formattedTime";
    } elseif (date("Y-m-d", strtotime("yesterday")) == date("Y-m-d", $timestampObj)) {
        $formattedDate = "Yesterday at $formattedTime";
    } else {
        $formattedDate = date("l, F j, Y", $timestampObj);
    }
} else {
    echo "<p>No logs found for this entry.</p>";
    exit;
}

// Advice generation logic (improved for clarity and formatting)
$advice = "";

// Define emoji mapping for emotions
$emojis = [
    'Excited' => '🤩', 'Grateful' => '🙏', 'Lonely' => '😔', 'Proud' => '😌',
    'Content' => '🙂', 'Loved' => '❤️', 'Hopeful' => '🌟', 'Peaceful' => '🕊️',
    'Inspired' => '💡', 'Confident' => '💪', 'Joyful' => '😁', 'Guilty' => '😞',
    'Frustrated' => '😠', 'Embarrassed' => '😳', 'Hopeless' => '😞',
    'Disappointed' => '😢', 'Overwhelmed' => '😩', 'Nervous' => '😰',
    'Resentful' => '😤', 'Insecure' => '😟', 'Sad' => '😢', 'Stressed' => '😫',
    'Anxious' => '😨', 'Confused' => '😕', 'Angry' => '😡', 'Afraid' => '😱',
    'Jealous' => '😒', 'Tired' => '😴',
];

// Categorize emotions for advice
$negativeEmotions = ["sad", "angry", "anxious", "stressed", "frustrated", "overwhelmed", "guilty", "lonely", "embarrassed", "hopeless", "disappointed", "nervous", "resentful", "insecure", "confused", "afraid", "jealous", "tired"];
$positiveEmotions = ["happy", "joyful", "content", "grateful", "excited", "peaceful", "proud", "loved", "hopeful", "inspired", "confident"];

$emotionArray = array_column($latestLogs, 'emotion'); // Get all emotions logged for this timestamp

// --- Start building the interactive advice content ---
$advice .= "<div class='space-y-4'>"; // Container for all advice cards

// Emotion Advice Card
$advice .= "<div class='bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-start space-x-4'>";
$advice .= "<div class='flex-shrink-0 text-5xl p-3 rounded-full bg-yellow-50 text-yellow-600'>😊</div>"; // General emotion icon
$advice .= "<div>";
$advice .= "<h3 class='font-bold text-xl text-gray-800 mb-2'>Your Emotions</h3>";
$advice .= "<ul class='list-none p-0 m-0 space-y-2'>";
foreach ($emotionArray as $emotion) {
    $emoji = isset($emojis[$emotion]) ? $emojis[$emotion] : '';
    $lowerEmotion = strtolower($emotion);
    $advice .= "<li class='flex items-center text-lg'>";
    $advice .= "<span class='text-2xl mr-2'>" . $emoji . "</span>";
    if (in_array($lowerEmotion, $negativeEmotions)) {
        $advice .= "<span class='text-red-700 font-medium'>Feeling $emotion:</span> That's completely valid, and it's okay to feel this way. Remember, these feelings are temporary. Consider practicing deep breathing or mindfulness to help manage them, or talk to a trusted friend or family member.";
    } elseif (in_array($lowerEmotion, $positiveEmotions)) {
        $advice .= "<span class='text-green-700 font-medium'>Feeling $emotion:</span> That's wonderful! Keep doing what brings you joy and positivity. Your positive mindset is a strength, and it's something to be celebrated. Continue to cherish these moments!";
    } else {
        $advice .= "<span class='text-yellow-700 font-medium'>Feeling $emotion:</span> Taking some time to reflect on what might be causing this emotion could provide valuable insights into your well-being. Journaling or quiet contemplation can be helpful.";
    }
    $advice .= "</li>";
}
$advice .= "</ul>";
$advice .= "</div>";
$advice .= "</div>"; // End Emotion Advice Card

// Sleep Advice Card
$sleepPercentage = min(max(($firstLog['sleep'] / 9) * 100, 0), 100); // Target 9 hours for 100%
$sleepBarColor = ($firstLog['sleep'] >= 7 && $firstLog['sleep'] <= 9) ? 'bg-green-500' : 'bg-red-500';

$advice .= "<div class='bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-start space-x-4'>";
$advice .= "<div class='flex-shrink-0 text-5xl p-3 rounded-full bg-blue-50 text-blue-600'>😴</div>"; // Sleep icon
$advice .= "<div>";
$advice .= "<h3 class='font-bold text-xl text-gray-800 mb-2'>Sleep Insights</h3>";
$advice .= "<p class='text-gray-700 text-base mb-2'>You reported **" . $firstLog['sleep'] . " hours** of sleep.</p>";
$advice .= "<div class='w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2'>";
$advice .= "<div class='" . $sleepBarColor . " h-full rounded-full' style='width: " . $sleepPercentage . "%;'></div>";
$advice .= "</div>";
if ($firstLog['sleep'] < 7) {
    $advice .= "<p class='text-gray-700 text-base'>It's important to aim for 7-9 hours for optimal health. Try establishing a consistent bedtime routine to improve your sleep quality. Even small changes can make a big difference, like winding down an hour before bed.</p>";
} elseif ($firstLog['sleep'] > 9) {
    $advice .= "<p class='text-gray-700 text-base'>While rest is important, sometimes excessive sleep can indicate other underlying issues. Make sure you're maintaining a balanced lifestyle, including regular activity and healthy eating habits. If this persists, consider consulting a professional.</p>";
} else {
    $advice .= "<p class='text-gray-700 text-base'>You're getting a healthy amount of sleep. That's excellent! Keep up the good work. Prioritizing sleep is a great way to support your overall well-being and energy levels.</p>";
}
$advice .= "</div>";
$advice .= "</div>"; // End Sleep Advice Card

// Energy Advice Card
$energyPercentage = min(max(($firstLog['energy'] / 10) * 100, 0), 100);
$energyBarColor = ($firstLog['energy'] >= 7) ? 'bg-purple-500' : (($firstLog['energy'] >= 4) ? 'bg-orange-400' : 'bg-red-500');

$advice .= "<div class='bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-start space-x-4'>";
$advice .= "<div class='flex-shrink-0 text-5xl p-3 rounded-full bg-purple-50 text-purple-600'>⚡</div>"; // Energy icon
$advice .= "<div>";
$advice .= "<h3 class='font-bold text-xl text-gray-800 mb-2'>Energy Levels</h3>";
$advice .= "<p class='text-gray-700 text-base mb-2'>Your energy level is **" . $firstLog['energy'] . "/10**.</p>";
$advice .= "<div class='w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2'>";
$advice .= "<div class='" . $energyBarColor . " h-full rounded-full' style='width: " . $energyPercentage . "%;'></div>";
$advice .= "</div>";
if ($firstLog['energy'] < 5) {
    $advice .= "<p class='text-gray-700 text-base'>It's understandable to feel low on energy sometimes. Consider incorporating light exercise, staying hydrated, and eating nutritious meals to give yourself a boost. Remember to prioritize rest and be kind to yourself during this time.</p>";
} elseif ($firstLog['energy'] > 5) {
    $advice .= "<p class='text-gray-700 text-base'>That's fantastic! Use this energy to engage in activities you enjoy and find fulfilling. Channel this positive energy into productivity or hobbies you love. It's great that you're feeling so energetic.</p>";
} else {
    $advice .= "<p class='text-gray-700 text-base'>Maintaining a balanced lifestyle is key to keeping your energy levels stable. Small, consistent habits like regular breaks, healthy snacks, and mindful movement can make a big difference.</p>";
}
$advice .= "</div>";
$advice .= "</div>"; // End Energy Advice Card

// Triggers Advice Card
$advice .= "<div class='bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-start space-x-4'>";
$advice .= "<div class='flex-shrink-0 text-5xl p-3 rounded-full bg-orange-50 text-orange-600'>🤯</div>"; // Triggers icon
$advice .= "<div>";
$advice .= "<h3 class='font-bold text-xl text-gray-800 mb-2'>Understanding Your Triggers</h3>";
$advice .= "<p class='text-gray-700 text-base'>Regarding your trigger **" . htmlspecialchars($firstLog['triggers']) . "**, it's helpful to identify patterns and develop strategies to minimize their impact. If possible, avoiding them is ideal. If not, learning coping methods like deep breathing, journaling, or seeking support can be very beneficial. You're taking an important step in managing your well-being.</p>";
$advice .= "</div>";
$advice .= "</div>"; // End Triggers Advice Card

// Coping Advice Card
$advice .= "<div class='bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-start space-x-4'>";
$advice .= "<div class='flex-shrink-0 text-5xl p-3 rounded-full bg-teal-50 text-teal-600'>🧘‍♀️</div>"; // Coping icon
$advice .= "<div>";
$advice .= "<h3 class='font-bold text-xl text-gray-800 mb-2'>Self-Care & Coping Strategies</h3>";
$advice .= "<p class='text-gray-700 text-base'>Your coping mechanism **" . htmlspecialchars($firstLog['coping']) . "** is an important tool for managing stress. Continue practicing self-care and finding healthy ways to cope. Remember, you're doing a great job taking care of yourself and building resilience.</p>";
$advice .= "</div>";
$advice .= "</div>"; // End Coping Advice Card

// Gratitude Advice Card
$advice .= "<div class='bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-start space-x-4'>";
$advice .= "<div class='flex-shrink-0 text-5xl p-3 rounded-full bg-pink-50 text-pink-600'>✨</div>"; // Gratitude icon
$advice .= "<div>";
$advice .= "<h3 class='font-bold text-xl text-gray-800 mb-2'>Cultivating Gratitude</h3>";
if (!empty($firstLog['gratitude'])) {
    $advice .= "<p class='text-gray-700 text-base'>You're grateful for: **\"" . htmlspecialchars($firstLog['gratitude']) . "\"**. Expressing gratitude is a powerful practice. Continuing to reflect on the positive aspects of your life can bring a sense of peace and contentment. Consider starting a gratitude journal if you haven't already!</p>";
} else {
    $advice .= "<p class='text-gray-700 text-base'>Consider starting a gratitude practice. Even small moments of gratitude, like appreciating a sunny day or a kind word, can significantly improve your well-being. It's a gentle and effective way to cultivate positivity in your daily life.</p>";
}
$advice .= "</div>";
$advice .= "</div>"; // End Gratitude Advice Card

$advice .= "</div>"; // End Container for all advice cards

// Prepare data for JavaScript
$logData = [
    'emotions' => array_column($latestLogs, 'emotion'),
    'sleep' => (int)$firstLog['sleep'], // Ensure numeric type for JS
    'energy' => (int)$firstLog['energy'], // Ensure numeric type for JS
    'triggers' => htmlspecialchars($firstLog['triggers']),
    'coping' => htmlspecialchars($firstLog['coping']),
    'gratitude' => htmlspecialchars($firstLog['gratitude']),
    'formattedDate' => htmlspecialchars($formattedDate),
    'advice' => $advice, // Pass the pre-formatted HTML advice
    'dass21_results' => isset($_SESSION['dass21_results']) ? $_SESSION['dass21_results'] : null
];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MindTrack - Your Insights</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Inter Font from Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/png" href="sjc.png">
    <style>
        /* Custom CSS for specific animations and overriding Tailwind if necessary */
        body {
            font-family: 'Inter', sans-serif;
            background: #005800; /* Original background color */
            transition: all 0.3s ease-in-out;
        }

        /* Fade-in Animation for the main container */
        @keyframes fadeIn {
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .animate-fadeIn {
            animation: fadeIn 0.8s ease-in-out forwards;
        }

        /* Back Button custom styling not easily replicated by Tailwind alone */
        .back-button {
            transition: all 0.3s ease-in-out;
            box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
            border: 2px solid transparent;
        }
        .back-button:hover {
            background-color: #cdae00;
            color: white;
            transform: scale(1.1);
            border: 2px solid white;
        }
        .back-button:active {
            transform: scale(0.95);
        }

        /* Modal specific styling that complements Tailwind */
        .modal-content {
            /* Max height and overflow for scrollable content */
            max-height: 90vh; /* Adjust as needed */
            overflow-y: auto;
            -webkit-overflow-scrolling: touch; /* Smooth scrolling for iOS */
        }
        .modal-content::-webkit-scrollbar {
            width: 8px;
        }
        .modal-content::-webkit-scrollbar-thumb {
            background-color: #cbd5e0; /* Gray-300 */
            border-radius: 4px;
        }
        .modal-content::-webkit-scrollbar-track {
            background-color: #f7fafc; /* Gray-100 */
        }

        /* SJC Logo Positioning and Responsiveness */
        .sjc-logo {
            position: fixed;
            bottom: 20px;
            right: 20px;
            opacity: 0.5;
            width: 200px;
            height: auto;
            z-index: 0; /* Ensure it stays behind main content */
            pointer-events: none; /* Allows clicks on elements behind it */
            transition: width 0.3s ease, bottom 0.3s ease, right 0.3s ease;
        }
        @media (max-width: 768px) {
            .sjc-logo {
                width: 150px;
                bottom: 15px;
                right: 15px;
            }
        }
        @media (max-width: 480px) {
            .sjc-logo {
                width: 100px;
                bottom: 10px;
                right: 10px;
            }
        }

        /* Mascot styling (kept from original as no mascot image was provided) */
        /* Assuming a mascot div will be added or removed later if needed */
        .mascot {
            position: fixed;
            bottom: -80px;
            left: -80px;
            width: 450px;
            height: auto;
            animation: mascotDiagonalMove 3s infinite alternate ease-in-out, mascotBounce 2s infinite ease-in-out;
        }
        @keyframes mascotDiagonalMove {
            0% { transform: rotate(15deg) translate(0, 0); }
            50% { transform: rotate(10deg) translate(10px, -10px); }
            100% { transform: rotate(15deg) translate(0, 0); }
        }
        @keyframes mascotBounce {
            0%, 100% { transform: translateY(0) rotate(15deg); }
            50% { transform: translateY(-10px) rotate(15deg); }
        }
        @media (min-width: 1024px) {
            .mascot { width: 500px; bottom: -90px; left: -90px; }
        }
        @media (max-width: 1023px) {
            .mascot { width: 350px; bottom: -70px; left: -70px; }
        }
        @media (max-width: 768px) {
            .mascot { width: 250px; bottom: -50px; left: -50px; }
        }
        @media (max-width: 480px) {
            .mascot { width: 180px; bottom: -30px; left: -30px; }
        }

        /* No hover effect needed for mascot as it's always animated */
        .mascot:hover {
            transform: none;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4">
    <!-- Custom Confirmation Modal for Back Button -->
    <div id="confirmBackModal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center hidden z-[10001]">
        <div class="bg-white p-8 rounded-xl shadow-xl text-center max-w-sm w-11/12 mx-auto">
            <p class="text-xl font-semibold mb-6 text-gray-800">You will be redirected to the homepage. Do you want to proceed?</p>
            <div class="flex justify-center space-x-4">
                <button id="confirmYes" class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 shadow-md">Yes</button>
                <button id="confirmNo" class="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md">No</button>
            </div>
        </div>
    </div>

    <!-- Back Button -->
    <a href="#" id="backButton" class="back-button absolute top-4 left-4 p-3 rounded-xl bg-yellow-400 text-black font-bold shadow-lg hover:bg-yellow-500 transition-transform duration-300 flex items-center space-x-2 z-50">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>Back</span>
    </a>

    <?php include 'sidebar.php'; ?>
    <img src="sjc.png" alt="City High Logo" class="sjc-logo">

    <!-- Main Content Container -->
    <div class="container bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl opacity-0 transform translate-y-5 animate-fadeIn mt-20 md:mt-0">
        <h1 class="text-4xl font-extrabold text-gray-800 mb-6 text-center leading-tight">Your Daily Insights</h1>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <!-- Latest Log Details Section -->
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-lg border border-blue-200">
                <h2 class="text-2xl font-bold text-blue-700 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Your Latest Log
                </h2>
                <p class="text-gray-700 mb-2"><strong class="font-semibold text-blue-800">Logged On:</strong> <span id="logDate" class="text-gray-600"></span></p>

                <div class="mb-4">
                    <p class="text-gray-700 font-semibold mb-2 text-blue-800">Emotions:</p>
                    <div id="emotionsDisplay" class="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <!-- Emotion tags will be dynamically inserted here by JavaScript -->
                    </div>
                </div>

                <p class="text-gray-700 mb-2"><strong class="font-semibold text-blue-800">Triggers:</strong> <span id="triggers" class="text-gray-600"></span></p>
                <p class="text-gray-700 mb-2"><strong class="font-semibold text-blue-800">Self-Care & Coping:</strong> <span id="coping" class="text-gray-600"></span></p>
                <p class="text-gray-700 mb-2"><strong class="font-semibold text-blue-800">Gratitude:</strong> <span id="gratitude" class="text-gray-600"></span></p>
            </div>

            <!-- Visualizations Section for Sleep & Energy -->
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-lg flex flex-col justify-between border border-purple-200">
                <div>
                    <h2 class="text-2xl font-bold text-purple-700 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7 4v16M17 4v16M4 8h4m-4 4h4m-4 4h4M16 8h4m-4 4h4m-4 4h4M3 21h18a2 2 0 002-2V5a2 2 0 00-2-2H3a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Your Key Metrics
                    </h2>

                    <!-- Sleep Gauge -->
                    <div class="mb-6">
                        <p class="text-gray-700 font-semibold mb-2 text-purple-800">Sleep Hours (Target 7-9):</p>
                        <div class="w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
                            <div id="sleepGaugeFill" class="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out" style="width: 0%;"></div>
                        </div>
                        <p id="sleepText" class="text-sm text-gray-500 mt-2 text-center"></p>
                    </div>

                    <!-- Energy Gauge -->
                    <div>
                        <p class="text-gray-700 font-semibold mb-2 text-purple-800">Energy Level (1-10 Scale):</p>
                        <div class="w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
                            <div id="energyGaugeFill" class="bg-gradient-to-r from-pink-400 to-pink-600 h-full rounded-full transition-all duration-700 ease-out" style="width: 0%;"></div>
                        </div>
                        <p id="energyText" class="text-sm text-gray-500 mt-2 text-center"></p>
                    </div>
                </div>

                <!-- View Personalized Tips Button -->
                <div class="mt-8">
                    <button id="tipsBtn" class="w-full px-6 py-3 rounded-xl bg-yellow-400 text-black font-bold shadow-lg hover:bg-yellow-500 transition-colors duration-300 transform hover:scale-105 flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <span>View Personalized Tips</span>
                   </button>
                </div>            </div>
        </div>

        <!-- DASS-21 Results Section -->
        <?php if (isset($_SESSION['dass21_results'])): ?>
        <div class="mt-8 bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-lg border border-green-200">
            <h2 class="text-2xl font-bold text-green-700 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                DASS-21 Assessment Results
            </h2>
            <p class="text-green-600 mb-4"><?php echo htmlspecialchars($_SESSION['dass21_results']['message']); ?></p>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-white p-4 rounded-lg shadow-md text-center">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Depression</h3>
        <p class="text-2xl font-bold text-green-700 mb-1">
            <?php echo htmlspecialchars($_SESSION['dass21_results']['depression_score']); ?>
        </p>
        <p class="text-sm text-gray-600 mb-1">
            Severity: <span class="font-semibold"><?php echo htmlspecialchars($_SESSION['dass21_results']['depression_severity']); ?></span>
        </p>
    </div>
    <div class="bg-white p-4 rounded-lg shadow-md text-center">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Anxiety</h3>
        <p class="text-2xl font-bold text-green-700 mb-1">
            <?php echo htmlspecialchars($_SESSION['dass21_results']['anxiety_score']); ?>
        </p>
        <p class="text-sm text-gray-600 mb-1">
            Severity: <span class="font-semibold"><?php echo htmlspecialchars($_SESSION['dass21_results']['anxiety_severity']); ?></span>
        </p>
    </div>
    <div class="bg-white p-4 rounded-lg shadow-md text-center">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Stress</h3>
        <p class="text-2xl font-bold text-green-700 mb-1">
            <?php echo htmlspecialchars($_SESSION['dass21_results']['stress_score']); ?>
        </p>
        <p class="text-sm text-gray-600 mb-1">
            Severity: <span class="font-semibold"><?php echo htmlspecialchars($_SESSION['dass21_results']['stress_severity']); ?></span>
        </p>
    </div>
    </div> <!-- End grid -->
    </div> <!-- End DASS-21 Results Section -->
    <?php endif; ?>
    
    <!-- Personalized Tips Modal -->
    <div id="tipsModal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center hidden z-[10000]">
        <div class="modal-content bg-white p-8 rounded-2xl shadow-2xl w-11/12 max-w-3xl mx-auto relative transform scale-95 opacity-0 animate-modalPopUp">
            <span class="close absolute top-4 right-4 text-gray-500 text-4xl font-bold cursor-pointer hover:text-gray-700 transition-colors">&times;</span>
            <h2 class="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-4 text-center">Personalized Tips for You</h2>
            <div id="adviceContent" class="text-gray-700 leading-relaxed text-lg">
                <!-- Advice will be loaded here by JS -->
            </div>
        </div>
    </div>

    <!-- Modal Pop-Up Animation -->
    <style>
        @keyframes modalPopUp {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        #tipsModal .modal-content {
            animation: modalPopUp 0.3s ease-out forwards;
        }
    </style>

    <!-- SJC Logo -->
    <!-- <img src="sjc.png" alt="City High Logo" class="sjc-logo"> -->

    <!-- JavaScript for dynamic content and interactivity -->
    <script>
        // Inject PHP data into JavaScript
        const logData = <?php echo json_encode($logData); ?>;

        // Emojis mapping (copied from PHP to be available client-side)
        const emojis = {
            'Excited': '🤩', 'Grateful': '🙏', 'Lonely': '😔', 'Loved': '❤️',
            'Proud': '😌', 'Content': '🙂', 'Hopeful': '🌟', 'Peaceful': '🕊️',
            'Inspired': '💡', 'Confident': '💪', 'Joyful': '😁', 'Guilty': '�',
            'Frustrated': '😠', 'Embarrassed': '😳', 'Hopeless': '😞',
            'Disappointed': '😢', 'Overwhelmed': '😩', 'Nervous': '😰',
            'Resentful': '😤', 'Insecure': '😟', 'Sad': '😢', 'Stressed': '😫',
            'Anxious': '😨', 'Confused': '😕', 'Angry': '😡', 'Afraid': '😱',
            'Jealous': '😒', 'Tired': '😴',
        };

        document.addEventListener('DOMContentLoaded', () => {
            // Populate Latest Log Details
            document.getElementById('logDate').textContent = logData.formattedDate;
            document.getElementById('triggers').textContent = logData.triggers;
            document.getElementById('coping').textContent = logData.coping;
            document.getElementById('gratitude').textContent = logData.gratitude;

            // Display Emotions with Emojis and engaging styling
            const emotionsDisplay = document.getElementById('emotionsDisplay');
            if (logData.emotions && logData.emotions.length > 0) {
                logData.emotions.forEach(emotion => {
                    const emoji = emojis[emotion] || '';
                    const emotionTag = document.createElement('span');
                    // Use a gradient background and shadow for a more pleasing look
                    emotionTag.className = 'px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full shadow-sm text-sm font-medium flex items-center justify-center space-x-1 hover:scale-105 transition-transform duration-200 cursor-pointer';
                    emotionTag.innerHTML = `<span class="text-xl">${emoji}</span><span>${emotion}</span>`;
                    emotionsDisplay.appendChild(emotionTag);
                });
            } else {
                emotionsDisplay.innerHTML = '<span class="text-gray-500 italic">No emotions logged.</span>';
            }


            // Sleep Gauge Visualization
            const sleepHours = logData.sleep;
            const maxSleepHours = 10; // Max visual scale for sleep
            let sleepPercentage = (sleepHours / maxSleepHours) * 100;
            // Cap sleep percentage at 100% to prevent overflow if hours > maxSleepHours
            sleepPercentage = Math.min(Math.max(sleepPercentage, 0), 100);

            const sleepGaugeFill = document.getElementById('sleepGaugeFill');
            sleepGaugeFill.style.width = `${sleepPercentage}%`;
            document.getElementById('sleepText').textContent = `${sleepHours} hours logged`;


            // Energy Gauge Visualization (1-10 scale)
            const energyLevel = logData.energy;
            const maxEnergyLevel = 10; // Max scale for energy
            let energyPercentage = (energyLevel / maxEnergyLevel) * 100;
            // Cap energy percentage at 100%
            energyPercentage = Math.min(Math.max(energyPercentage, 0), 100);

            const energyGaugeFill = document.getElementById('energyGaugeFill');
            energyGaugeFill.style.width = `${energyPercentage}%`;
            document.getElementById('energyText').textContent = `Level ${energyLevel}/10`;


            // --- Modal Functionality for Personalized Tips ---
            const tipsModal = document.getElementById('tipsModal');
            const tipsBtn = document.getElementById('tipsBtn');
            const closeTipsSpan = tipsModal.querySelector('.close');
            const adviceContentDiv = document.getElementById('adviceContent');

            // Set the advice content from PHP
            adviceContentDiv.innerHTML = logData.advice;

            tipsBtn.onclick = function() {
                tipsModal.classList.remove('hidden'); // Show modal
            }

            closeTipsSpan.onclick = function() {
                tipsModal.classList.add('hidden'); // Hide modal
            }

            // Close modal when clicking outside of it
            window.onclick = function(event) {
                if (event.target === tipsModal) {
                    tipsModal.classList.add('hidden');
                }
                if (event.target === confirmBackModal) { // Also handle the back confirmation modal
                    confirmBackModal.classList.add('hidden');
                }
            }

            // --- Custom Confirmation Modal for Back Button ---
            const backButton = document.getElementById('backButton');
            const confirmBackModal = document.getElementById('confirmBackModal');
            const confirmYes = document.getElementById('confirmYes');
            const confirmNo = document.getElementById('confirmNo');

            backButton.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior
                confirmBackModal.classList.remove('hidden'); // Show confirmation modal
            });

            confirmYes.addEventListener('click', () => {
                window.location.href = "home.php"; // Redirect if 'Yes' is clicked
            });

            confirmNo.addEventListener('click', () => {
                confirmBackModal.classList.add('hidden'); // Hide confirmation modal if 'No' is clicked
            });
        });
    </script>
</body>
</html>