<?php
session_start();

if (isset($_SESSION['firstname'])) {
    $firstname = $_SESSION['firstname'];
    $id = $_SESSION['id'];
    $isLoggedIn = 'true';
} else {
    $firstname = "Student!";
    $isLoggedIn = 'false';
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emotion Selection</title>

    <script>
        var isLoggedIn = <?php echo json_encode($isLoggedIn); ?>;
        console.log("User login status:", isLoggedIn);
    </script>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <link rel="stylesheet" href="home.css">
    <link rel="icon" type="image/png" href="sjc.png">
</head>

<body>
     
    <?php include 'sidebar.php'; ?> 
    <br><br>
    <img src="sjc.png" alt="City High Logo" class="sjc-logo">

    <form id="emotionForm" action="metric.php" method="post">
        <input type="hidden" name="emotions" id="selectedEmotions">
        <h2><?php echo "Hello there, " . htmlspecialchars($firstname) . "!"; ?>, How Are You Feeling Today?</h2>
        <h4>(You can choose as many emotions you are feeling right now)</h4>

        <div class="emotion-filter-buttons">
            <button type="button" id="positiveButton">Positive</button>
            <button type="button" id="negativeButton">Negative</button>
        </div>

        <div class="emotion-container">
            <div class="positive-emotions">
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Excited" class="emotion-button excited-button"
                        style="background: #FFD700;">Excited</button>
                    <div class="emoji excited">🤩</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Grateful" class="emotion-button grateful-button"
                        style="background: #FFB6C1;">Grateful</button>
                    <div class="emoji grateful">🙏</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Proud" class="emotion-button proud-button"
                        style="background: #FFA500;">Proud</button>
                    <div class="emoji proud">😌</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Content" class="emotion-button content-button"
                        style="background: #87CEFA;">Content</button>
                    <div class="emoji content">🙂</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Loved" class="emotion-button loved-button"
                        style="background: #FF69B4;">Loved</button>
                    <div class="emoji loved">❤️</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Hopeful" class="emotion-button hopeful-button"
                        style="background: #32CD32;">Hopeful</button>
                    <div class="emoji hopeful">🌟</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Peaceful" class="emotion-button peaceful-button"
                        style="background: #00CED1;">Peaceful</button>
                    <div class="emoji peaceful">🕊️</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Inspired" class="emotion-button inspired-button"
                        style="background: #8A2BE2;">Inspired</button>
                    <div class="emoji inspired">💡</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Confident" class="emotion-button confident-button"
                        style="background: #DC143C;">Confident</button>
                    <div class="emoji confident">💪</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Joyful" class="emotion-button joyful-button"
                        style="background: #FFD700;">Joyful</button>
                    <div class="emoji joyful">😁</div>
                </div>
            </div>

            <div class="negative-emotions" style="display: none;">
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Lonely" class="emotion-button lonely-button"
                        style="background: #708090;">Lonely</button>
                    <div class="emoji lonely">😔</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Guilty" class="emotion-button guilty-button"
                        style="background: #D2691E;">Guilty</button>
                    <div class="emoji guilty">😞</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Frustrated" class="emotion-button frustrated-button"
                        style="background: #FF4500;">Frustrated</button>
                    <div class="emoji frustrated">😠</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Embarrassed" class="emotion-button embarrassed-button"
                        style="background: #FF6347;">Embarrassed</button>
                    <div class="emoji embarrassed">😳</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Hopeless" class="emotion-button hopeless-button"
                        style="background: #2F4F4F;">Hopeless</button>
                    <div class="emoji hopeless">😞</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Disappointed" class="emotion-button disappointed-button"
                        style="background: #A9A9A9;">Disappointed</button>
                    <div class="emoji disappointed">😢</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Overwhelmed" class="emotion-button overwhelmed-button"
                        style="background: #8B0000;">Overwhelmed</button>
                    <div class="emoji overwhelmed">😩</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Nervous" class="emotion-button nervous-button"
                        style="background: #4682B4;">Nervous</button>
                    <div class="emoji nervous">😰</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Resentful" class="emotion-button resentful-button"
                        style="background: #556B2F;">Resentful</button>
                    <div class="emoji resentful">😤</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Insecure" class="emotion-button insecure-button"
                        style="background: #4B0082;">Insecure</button>
                    <div class="emoji insecure">😟</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Sad" class="emotion-button sad-button"
                        style="background: #808080;">Sad</button>
                    <div class="emoji sad">😢</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Stressed" class="emotion-button stressed-button"
                        style="background: #D3D3D3;">Stressed</button>
                    <div class="emoji stressed">😫</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Anxious" class="emotion-button anxious-button"
                        style="background: #B0C4DE;">Anxious</button>
                    <div class="emoji anxious">😨</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Confused" class="emotion-button confused-button"
                        style="background: #ADD8E6;">Confused</button>
                    <div class="emoji confused">😕</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Angry" class="emotion-button angry-button"
                        style="background: #FF0000;">Angry</button>
                    <div class="emoji angry">😡</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Afraid" class="emotion-button afraid-button"
                        style="background: #000000;">Afraid</button>
                    <div class="emoji afraid">😱</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Jealous" class="emotion-button jealous-button"
                        style="background: #008000;">Jealous</button>
                    <div class="emoji jealous">😒</div>
                </div>
                <div class="emotion-wrapper">
                    <button type="button" name="emotion" value="Tired" class="emotion-button tired-button"
                        style="background: #8B4513;">Tired</button>
                    <div class="emoji tired">😴</div>
                </div>
            </div>

            <div class="emotion-wrapper">
                <button type="button" class="emotion-button others-button" style="background: #808080;"
                    id="othersButton">Others</button>
                <div class="emoji others">📝</div>
            </div>
            <div id="otherEmotionInput" style="display: none;">
                <input type="text" name="otherEmotion" id="otherEmotionText" placeholder="Enter your emotion">
            </div>
        </div>
        <button type="submit" id="submitEmotions">Submit Emotions</button>
    </form>

    <script>
        $(document).ready(function () {
            let selectedEmotions = [];

            $(".emotion-button").click(function () {
                if ($(this).attr('id') === 'othersButton') {
                    $("#otherEmotionInput").toggle();
                } else {
                    $(this).toggleClass("selected");
                    let emotion = $(this).attr("value");
                    if ($(this).hasClass("selected")) {
                        selectedEmotions.push(emotion);
                    } else {
                        selectedEmotions = selectedEmotions.filter(e => e !== emotion);
                    }
                }
            });

            $("#submitEmotions").click(function () {
                let otherEmotion = $("#otherEmotionText").val().trim();
                if (otherEmotion !== "") {
                    selectedEmotions.push(otherEmotion);
                }
                if (selectedEmotions.length > 0) {
                    $("#selectedEmotions").val(JSON.stringify(selectedEmotions));
                    $("#emotionForm").submit();
                } else {
                    alert("Please select at least one emotion.");
                }
            });

            $("#positiveButton").click(function () {
                $(".positive-emotions").show();
                $(".negative-emotions").hide();
            });

            $("#negativeButton").click(function () {
                $(".positive-emotions").hide();
                $(".negative-emotions").show();
            });
        });
        $(document).ready(function () {
            $(".emotion-filter-buttons button").click(function () {
                $(".emotion-filter-buttons button").removeClass("active-filter");
                $(this).addClass("active-filter");

                if ($(this).attr("id") === "positiveButton") {
                    $(".positive-emotions").show();
                    $(".negative-emotions").hide();
                } else {
                    $(".positive-emotions").hide();
                    $(".negative-emotions").show();
                }
            });

            // Set 'Positive' as default active
            $("#positiveButton").addClass("active-filter");
        });
    </script>
</body>

</html>