<?php
session_start();
include '../db/db_connect.php'; // Ensure correct database connection path

// Check if user is logged in
if (!isset($_SESSION["id"])) {
    echo "<p class='text-center text-red-500 font-semibold mt-10'>Please <a href='home.php?login=1' class='text-blue-600 hover:underline'>log in</a> to view this page.</p>";
    exit;
}

// [Keep all existing PHP logic unchanged - only updating HTML/CSS]

// Handle DASS-21 submission FIRST, if it exists
if (isset($_POST['dass21_submission'])) {
    $answers = [];
    for ($i = 1; $i <= 21; $i++) {
        if (isset($_POST["q$i"])) {
            $answers[$i] = (int) $_POST["q$i"];
        }
    }
    $_SESSION['dass21_answers'] = $answers;

    if (isset($_POST['emotions'])) {
        $emotionsJson = $_POST['emotions'];
        $emotions = json_decode($emotionsJson, true);
        if (is_array($emotions) && !empty($emotions)) {
            $_SESSION['emotions'] = $emotions;
        }
    }

} elseif (isset($_POST['emotions'])) {
    $emotionsJson = $_POST['emotions'];
    $emotions = json_decode($emotionsJson, true);

    if (!is_array($emotions) || empty($emotions)) {
        header('Location: home.php');
        exit();
    }
    $_SESSION['emotions'] = $emotions;

    unset($_SESSION['dass21_answers']);

} elseif (!isset($_SESSION['emotions'])) {
    header('Location: home.php');
    exit();
}

$emotions = $_SESSION['emotions'];
$emotionsJson = json_encode($emotions);

// [Keep all existing emoji and color arrays unchanged]
$emojis = [
    'Excited' => '🤩',
    'Grateful' => '🙏',
    'Lonely' => '😔',
    'Proud' => '😌',
    'Content' => '🙂',
    'Loved' => '❤️',
    'Hopeful' => '🌟',
    'Peaceful' => '🕊️',
    'Inspired' => '💡',
    'Confident' => '💪',
    'Joyful' => '😁',
    'Guilty' => '😞',
    'Frustrated' => '😠',
    'Embarrassed' => '😳',
    'Hopeless' => '😞',
    'Disappointed' => '😢',
    'Overwhelmed' => '😩',
    'Nervous' => '😰',
    'Resentful' => '😤',
    'Insecure' => '😟',
    'Sad' => '😢',
    'Stressed' => '🤯',
    'Anxious' => '😨',
    'Confused' => '😕',
    'Angry' => '😡',
    'Afraid' => '😱',
    'Jealous' => '😒',
    'Tired' => '😴',
];

$colors = [
    'Excited' => '#FFD700',
    'Grateful' => '#FFB6C1',
    'Lonely' => '#708090',
    'Proud' => '#FFA500',
    'Content' => '#87CEFA',
    'Loved' => '#FF69B4',
    'Hopeful' => '#32CD32',
    'Peaceful' => '#00CED1',
    'Inspired' => '#8A2BE2',
    'Confident' => '#DC143C',
    'Joyful' => '#FFD700',
    'Guilty' => '#D2691E',
    'Frustrated' => '#FF4500',
    'Embarrassed' => '#FF6347',
    'Hopeless' => '#2F4F4F',
    'Disappointed' => '#A9A9A9',
    'Overwhelmed' => '#8B0000',
    'Nervous' => '#4682B4',
    'Resentful' => '#556B2F',
    'Insecure' => '#4B0082',
    'Sad' => '#808080',
    'Stressed' => '#D3D3D3',
    'Anxious' => '#B0C4DE',
    'Confused' => '#ADD8E6',
    'Angry' => '#FF0000',
    'Afraid' => '#000000',
    'Jealous' => '#008000',
    'Tired' => '#8B4513',
];

$emotionDisplay = '';
$primaryColor = '#808080';

foreach ($emotions as $emotion) {
    if (array_key_exists($emotion, $emojis)) {
        $emotionDisplay .= $emojis[$emotion] . ' ';
        if ($primaryColor === '#808080' && array_key_exists($emotion, $colors)) {
            $primaryColor = $colors[$emotion];
        }
    } else {
        $emotionDisplay .= '❓ ';
    }
}

$quizCompleted = isset($_SESSION['dass21_answers']) && count($_SESSION['dass21_answers']) === 21;
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MindTrack - Mental Health Logging</title>
    <!-- REMOVED: Tailwind CDN -->
    <!-- ADDED: Local CSS -->
    <link rel="stylesheet" href="local-styles.css">
    <link rel="stylesheet" href="metric.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/png" href="sjc.png">
    <style>
        /* Custom styles for this page */
        .submit-btn {
            background-color: <?php echo $primaryColor; ?>;
        }

        .submit-btn:hover {
            filter: brightness(0.9);
        }

        input[type="range"]::-webkit-slider-thumb {
            background: <?php echo $primaryColor; ?>;
        }

        input[type="range"]::-moz-range-thumb {
            background: <?php echo $primaryColor; ?>;
        }

        input:focus,
        textarea:focus,
        select:focus {
            border-color: <?php echo $primaryColor; ?>;
            box-shadow: 0 0 0 3px <?php echo $primaryColor; ?>60;
        }

        .text-primary-color {
            color: <?php echo $primaryColor; ?>;
        }
    </style>
</head>

<body class="min-h-screen flex items-center justify-center p-4">

    <!-- Keep all existing modals and PHP content unchanged -->
    <div id="confirmExitModal"
        class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center hidden z-[10001]">
        <div class="bg-white p-8 rounded-xl shadow-xl text-center max-w-sm w-11/12 mx-auto">
            <p class="text-xl font-semibold mb-6 text-gray-800">Are you sure you want to go back? All the values you
                entered will be lost.</p>
            <div class="flex justify-center space-x-4">
                <button id="confirmExitYes"
                    class="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md">Yes,
                    Exit</button>
                <button id="confirmExitNo"
                    class="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors duration-200 shadow-md">No,
                    Stay</button>
            </div>
        </div>
    </div>

    <a href="#" id="backButton"
        class="btn btn-yellow fixed top-4 left-4 shadow-lg z-50 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>Back</span>
    </a>

    <div class="wrapper flex w-full">
        <?php include 'sidebar.php'; ?>

        <div class="content flex-grow flex flex-col items-center justify-center p-4 min-h-screen">
            <img src="sjc.png" alt="City High Logo" class="sjc-logo">

            <form action="process_log.php" method="post"
                class="w-full max-w-4xl animate-fadeIn">
                <input type="hidden" name="emotions" value='<?php echo htmlspecialchars($emotionsJson); ?>'>
                <input type="hidden" name="dass21_answers"
                    value='<?php echo htmlspecialchars(json_encode($_SESSION['dass21_answers'] ?? [])); ?>'>

                <div class="container-wrapper grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <!-- Emotion Display Container -->
                    <div class="container bg-white p-6 rounded-2xl shadow-xl">
                        <div class="text-6xl mb-4 p-2 rounded-full bg-blue-50 transition-transform hover:scale-110">
                            <?php echo $emotionDisplay; ?>
                        </div>
                        <h2 class="text-2xl font-bold mb-4 text-primary-color">Rate How You Are Feeling</h2>
                        <label for="energyRange" class="block text-gray-700 font-medium mb-2">Energy Level</label>
                        <input type="range" name="energy" id="energyRange" min="0" max="10" value="5" step="1"
                            class="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer"
                            oninput="updateEnergy(this.value)">
                        <span id="energyValue" class="mt-2 block text-lg font-semibold text-gray-800">5</span>
                    </div>

                    <!-- Sleep Container -->
                    <div class="container bg-white p-6 rounded-2xl shadow-xl">
                        <h2 class="text-2xl font-bold mb-4 text-primary-color">Sleep & Well-being</h2>
                        <label for="sleepInput" class="block text-gray-700 font-medium mb-2">Hours Slept</label>
                        <input type="number" name="sleep" id="sleepInput" min="0" max="24" step="1" required
                            class="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg text-center">
                    </div>

                    <!-- Triggers Container -->
                    <div class="container bg-white p-6 rounded-2xl shadow-xl">
                        <h2 class="text-2xl font-bold mb-4 text-primary-color">Additional Insights</h2>
                        <label for="triggersSelect" class="block text-gray-700 font-medium mb-2">What influenced your mood?</label>
                        <select name="triggers" id="triggersSelect" class="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="Work">Work</option>
                            <option value="School">School</option>
                            <option value="Family">Family</option>
                            <option value="Friends">Friends</option>
                            <option value="Health">Health</option>
                            <option value="Others">Others</option>
                        </select>
                        <input type="text" id="othersTriggerInput" name="triggers_others" placeholder="Please specify"
                            class="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg mt-3" style="display: none;">
                    </div>

                    <!-- Coping Container -->
                    <div class="container bg-white p-6 rounded-2xl shadow-xl">
                        <h2 class="text-2xl font-bold mb-4 text-primary-color">Self-Care & Coping</h2>
                        <label for="copingSelect" class="block text-gray-700 font-medium mb-2">How did you manage your emotions?</label>
                        <select name="coping" id="copingSelect" class="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="Deep breathing">Deep breathing</option>
                            <option value="Exercise">Exercise</option>
                            <option value="Listening to music">Listening to music</option>
                            <option value="Talking to friends">Talking to friends</option>
                            <option value="Journaling">Journaling</option>
                            <option value="Meditation">Meditation</option>
                            <option value="Others">Others</option>
                        </select>
                        <input type="text" id="othersCopingInput" name="coping_others" placeholder="Please specify"
                            class="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg mt-3" style="display: none;">
                    </div>

                    <!-- Gratitude Container -->
                    <div class="container bg-white p-6 rounded-2xl shadow-xl">
                        <h2 class="text-2xl font-bold mb-4 text-primary-color">Gratitude & Reflection</h2>
                        <label for="gratitudeInput" class="block text-gray-700 font-medium mb-2">What are you grateful for today?</label>
                        <textarea name="gratitude" id="gratitudeInput" rows="4" placeholder="Reflect on the good things in your life..."
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"></textarea>
                    </div>

                    <!-- DASS-21 Container -->
                    <div class="container bg-white p-6 rounded-2xl shadow-xl">
                        <h2 class="text-2xl font-bold mb-4 text-primary-color">Mental Health Assessment</h2>
                        <?php if ($quizCompleted): ?>
                            <p class="text-gray-700 mb-4">✅ DASS-21 completed</p>
                            <p class="text-sm text-gray-600">Your assessment has been recorded and will be included in your results.</p>
                        <?php else: ?>
                            <p class="text-gray-700 mb-4">Take the DASS-21 assessment for deeper insights</p>
                            <button type="button" id="openQuizBtn" class="btn btn-primary">
                                Take DASS-21 Assessment
                            </button>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="text-center">
                    <button type="submit" class="submit-btn btn text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                        🎯 Complete Your Daily Check-In
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- DASS-21 Quiz Modal (keep existing modal HTML) -->
    <div id="quizModal" class="quiz-modal">
        <div class="quiz-content">
            <button class="close-btn" onclick="closeQuiz()">&times;</button>
            <h2>DASS-21 Assessment</h2>
            <p>Please rate how much each statement applied to you over the past week.</p>
            <div class="quiz-body" id="quizBody">
                <!-- Quiz content will be loaded here -->
            </div>
        </div>
    </div>

    <script>
        // Keep all existing JavaScript unchanged
        function updateEnergy(value) {
            document.getElementById('energyValue').textContent = value;
        }

        // Trigger/Coping dropdown handlers
        document.getElementById('triggersSelect').addEventListener('change', function() {
            const othersInput = document.getElementById('othersTriggerInput');
            if (this.value === 'Others') {
                othersInput.style.display = 'block';
                othersInput.required = true;
            } else {
                othersInput.style.display = 'none';
                othersInput.required = false;
                othersInput.value = '';
            }
        });

        document.getElementById('copingSelect').addEventListener('change', function() {
            const othersInput = document.getElementById('othersCopingInput');
            if (this.value === 'Others') {
                othersInput.style.display = 'block';
                othersInput.required = true;
            } else {
                othersInput.style.display = 'none';
                othersInput.required = false;
                othersInput.value = '';
            }
        });

        // Back button confirmation
        document.getElementById('backButton').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('confirmExitModal').classList.remove('hidden');
        });

        document.getElementById('confirmExitYes').addEventListener('click', function() {
            window.location.href = 'home.php';
        });

        document.getElementById('confirmExitNo').addEventListener('click', function() {
            document.getElementById('confirmExitModal').classList.add('hidden');
        });

        // DASS-21 Quiz functionality (keep existing)
        // [Keep all existing quiz JavaScript]
    </script>

</body>
</html>