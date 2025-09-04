<?php
session_start();

if (!isset($_SESSION['id'])) {
    // Redirect to login if user is not logged in
    header("Location: login.php");
    exit();
}

$firstname = $_SESSION['firstname'];
$userId = $_SESSION['id'];

// Get emotions from the session or POST data
$emotions = [];
if (isset($_POST['emotions'])) {
    $emotions = json_decode($_POST['emotions'], true);
} elseif (isset($_SESSION['emotions'])) {
    $emotions = $_SESSION['emotions'];
}

// Store emotions in session for persistence
$_SESSION['emotions'] = $emotions;

// DASS-21 Questions and their subscales
$dass21_questions = [
    1 => ['text' => "I found it hard to wind down.", 'scale' => 'S'],
    2 => ['text' => "I was aware of dryness of my mouth.", 'scale' => 'A'],
    3 => ['text' => "I couldn't seem to experience any positive feeling at all.", 'scale' => 'D'],
    4 => ['text' => "I experienced breathing difficulty (e.g., excessively rapid breathing, shortness of breath for no reason).", 'scale' => 'A'],
    5 => ['text' => "I found it difficult to get started on things.", 'scale' => 'D'],
    6 => ['text' => "I tended to over-react to situations.", 'scale' => 'S'],
    7 => ['text' => "I experienced trembling (e.g., in the hands).", 'scale' => 'A'],
    8 => ['text' => "I felt that I was using a lot of nervous energy.", 'scale' => 'S'],
    9 => ['text' => "I was worried about situations in which I might panic and make a fool of myself.", 'scale' => 'A'],
    10 => ['text' => "I felt that I had nothing to look forward to.", 'scale' => 'D'],
    11 => ['text' => "I found myself getting agitated.", 'scale' => 'S'],
    12 => ['text' => "I found it difficult to relax.", 'scale' => 'S'],
    13 => ['text' => "I felt down-hearted and blue.", 'scale' => 'D'],
    14 => ['text' => "I was intolerant of anything that kept me from getting on with what I was doing.", 'scale' => 'S'],
    15 => ['text' => "I felt I was close to panic.", 'scale' => 'A'],
    16 => ['text' => "I was unable to experience any positive feeling at all.", 'scale' => 'D'],
    17 => ['text' => "I felt that I wasn't worth much as a person.", 'scale' => 'D'],
    18 => ['text' => "I felt that I was rather touchy.", 'scale' => 'S'],
    19 => ['text' => "I was aware of the action of my heart in the absence of physical exertion (e.g., sense of heart rate increase, heart missing a beat).", 'scale' => 'A'],
    20 => ['text' => "I felt scared without any good reason.", 'scale' => 'A'],
    21 => ['text' => "I felt that life was meaningless.", 'scale' => 'D']
];

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DASS-21 Assessment</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/png" href="clsu-logo.png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="../sidebar.css">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #005800; /* Deep Green background */
            transition: all 0.3s ease-in-out;
        }
        .container-dass {
            max-width: 960px;
            margin: 0 auto;
        }

        .radio-label {
            display: flex;
            align-items: center;
            padding: 12px;
            border: 2px solid #e5e7eb; /* gray-200 */
            border-radius: 12px;
            transition: all 0.3s ease;
            cursor: pointer;
            user-select: none;
            background-color: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .radio-label:hover {
            border-color: #fde047; /* yellow-300 */
            background-color: #fefce8; /* yellow-50 */
            transform: translateY(-2px);
            box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
        }
        .radio-label input[type="radio"] {
            display: none;
        }
        .radio-label input[type="radio"]:checked + .custom-radio {
            background-color: #fde047; /* yellow-300 */
            border-color: #d97706; /* amber-600 */
            transform: scale(1.1);
        }
        .radio-label input[type="radio"]:checked + .custom-radio::after {
            opacity: 1;
        }
        .custom-radio {
            width: 24px;
            height: 24px;
            border: 2px solid #9ca3af; /* gray-400 */
            border-radius: 50%;
            margin-right: 16px;
            position: relative;
            transition: all 0.3s ease;
            flex-shrink: 0;
        }
        .custom-radio::after {
            content: '';
            width: 12px;
            height: 12px;
            background: #d97706; /* amber-600 */
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
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
        @media (max-width: 1320px) {
            .sjc-logo {
                width: 150px;
                bottom: 15px;
                right: 15px;
                display: none;
            }
        }
        @media (max-width: 480px) {
            .sjc-logo {
                width: 100px;
                bottom: 10px;
                right: 10px;
                display: none;
            }
        }
    </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
    <!--  -->

    <div class="container-dass mt-20 p-8 bg-white rounded-3xl shadow-2xl space-y-10 border-4 border-yellow-400">

        <div class="bg-gradient-to-r from-yellow-100 to-white p-8 rounded-2xl shadow-inner border border-yellow-200 text-center">
            <h1 class="text-5xl font-extrabold text-gray-800 mb-4 leading-tight">
                <i class="fas fa-brain text-yellow-500 mr-3 animate-pulse"></i>
                DASS-21 Self-Assessment
            </h1>
            <p class="text-xl font-medium text-gray-600 mb-6">Hello, <?php echo htmlspecialchars($firstname); ?>!</p>
            <p class="text-lg text-gray-700 max-w-2xl mx-auto">
                Take a moment to reflect on your feelings over the past week. For each statement, please select the response that best describes your experience. There are no right or wrong answers, just your personal truth.
            </p>
            <div class="mt-6 flex flex-wrap justify-center gap-4 text-center text-sm font-semibold">
                <span class="bg-blue-100 text-blue-800 px-4 py-2 rounded-full shadow-sm">0: Not at all</span>
                <span class="bg-green-100 text-green-800 px-4 py-2 rounded-full shadow-sm">1: Some of the time</span>
                <span class="bg-orange-100 text-orange-800 px-4 py-2 rounded-full shadow-sm">2: A good part of the time</span>
                <span class="bg-red-100 text-red-800 px-4 py-2 rounded-full shadow-sm">3: Most of the time</span>
            </div>
        </div>

        <form action="metric.php" method="post" class="space-y-6">
            <input type="hidden" name="dass21_submission" value="1">
            <input type="hidden" name="emotions" value="<?php echo htmlspecialchars(json_encode($emotions)); ?>">
            <?php foreach ($dass21_questions as $q_num => $data): ?>
                <div class="bg-gray-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-[1.01] border-l-4 border-yellow-400">
                    <p class="text-xl font-semibold text-gray-800 mb-4">
                        <span class="text-2xl font-bold text-yellow-600 mr-2"><?php echo $q_num; ?>.</span>
                        <?php echo htmlspecialchars($data['text']); ?>
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label class="radio-label">
                            <input type="radio" name="q<?php echo $q_num; ?>" value="0" required>
                            <span class="custom-radio"></span>
                            <span class="text-gray-700">0 - Did not apply to me at all</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="q<?php echo $q_num; ?>" value="1" required>
                            <span class="custom-radio"></span>
                            <span class="text-gray-700">1 - Applied to me to some degree, or some of the time</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="q<?php echo $q_num; ?>" value="2" required>
                            <span class="custom-radio"></span>
                            <span class="text-gray-700">2 - Applied to me to a considerable degree, or a good part of time</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="q<?php echo $q_num; ?>" value="3" required>
                            <span class="custom-radio"></span>
                            <span class="text-gray-700">3 - Applied to me very much, or most of the time</span>
                        </label>
                    </div>
                </div>
            <?php endforeach; ?>

            <div class="flex justify-center mt-8">
                <button type="submit" class="px-8 py-4 bg-yellow-400 text-black font-bold text-lg rounded-xl shadow-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Submit Assessment</span>
                </button>
            </div>
        </form>

    </div>

    <img src="../sjc.png" alt="City High Logo" class="sjc-logo">
</body>
</html>
