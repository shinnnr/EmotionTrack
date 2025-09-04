<?php
session_start();
if (!isset($_SESSION['id'])) {
    // Optional: redirect to login page if not logged in
    header("Location: index.php");
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emotion Track - For SJCNHS Students</title>

    <!-- Fonts & Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <!-- CSS -->
    <link rel="stylesheet" href="description.css">
    <link rel="stylesheet" href="sidebar.css">

    <link rel="icon" type="image/png" href="sjc.png">
</head>

<body>

    <!-- Sidebar -->
    <div id="sidebar" class="sidebar">
        <a href="home.php">🏠 Home</a>
        <a href="profile.php">🙍 Profile</a>
        <a href="consultation.php">🧑‍⚕️ Consult</a>
        <a href="description.php">🌍 Website Description</a>
        <a href="#" onclick="logoutUser()">🔒 Logout</a>
    </div>

    <!-- Sidebar Toggle Button -->
    <button id="toggleSidebar" class="toggle-btn">☰</button>

    <!-- Logo -->
    <img src="sjc.png" alt="City High Logo" class="sjc-logo">

    <div class="container">
        <h1>Welcome to Emotion Track!</h1>
        <div class="description-section">
            <p>
                Hello San Jose City National High School Senior High students! We understand that school life can bring a mix of emotions, and taking care of
                your mental well-being is essential. That's why we've developed Emotion Track, a web-based tool designed
                just for you.
            </p>
            <p>
                Emotion Track provides a safe and easy way to monitor your emotions, helping you to recognize patterns
                and understand what might be influencing how you feel. By logging your moods and reflecting on your
                emotional health, you can gain valuable insights into your well-being.
            </p>
        </div>

        <h1>Contact SJCNHS - SHS Guidance Office</h1>
        <p>
            If you need support or have any inquiries, you can reach the SJCNHS - SHS Guidance Office through the following channels:
        </p>
        <div class="contact-info">
            <div class="contact-item">
                <span class="contact-symbol"><i class="fab fa-facebook-square"></i></span>
                <div class="contact-details">
                    <p>
                        <b>Facebook:</b> <a href="https://facebook.com/SJCNHS-SHSGuidanceOffice" target="_blank">SJCNHS - SHS Guidance Center</a> <br>
                        <i class="example-text">Example: You can send us a direct message for quick inquiries.</i>
                    </p>
                </div>
            </div>
            <div class="contact-item">
                <span class="contact-symbol"><i class="fas fa-envelope-square"></i></span>
                <div class="contact-details">
                    <p>
                        <b>Email:</b> <a href="mailto:guidanceoffice@sjcnhs-shs.edu.ph">guidanceoffice@sjcnhs-shs.edu.ph</a> <br>
                        <i class="example-text">Example: For detailed concerns or appointment requests, please email us.</i>
                    </p>
                </div>
            </div>
            <div class="contact-item">
                <span class="contact-symbol"><i class="fas fa-map-marker-alt"></i></span>
                <div class="contact-details">
                    <p>
                        <b>Visit Us:</b> Guidance Office Room, San Jose City National High School - Senior High School, San Jose City,
                        Nueva Ecija
                        <br>
                        <i class="example-text">Example: Our office is open from Monday to Friday, 8:00 AM to 5:00 PM.</i>
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- JS for Sidebar & Logout -->
    <script>
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggleSidebar');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        function logoutUser() {
            if (confirm("Are you sure you want to log out?")) {
                alert('Logout Successful');
                window.location.href = "../logout.php";
            }
        }
    </script>

</body>
</html>
