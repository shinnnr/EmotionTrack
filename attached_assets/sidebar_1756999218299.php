<?php
if (!isset($_SESSION['id'])) {
    return;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Navigation</title>
    <link rel="stylesheet" href="sidebar.css">
    <script defer src="script.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function () {
            const sidebar = document.getElementById("sidebar");
            const toggleButtons = document.querySelectorAll(".toggle-btn");

            if (!sidebar || toggleButtons.length === 0) {
                console.error("Sidebar or toggle buttons not found!");
                return;
            }

            function toggleSidebar() {
                sidebar.classList.toggle("open");
                sidebar.classList.toggle("collapsed");
            }

            // For large screens - show sidebar normally, no burger menu needed
            function handleResize() {
                if (window.innerWidth >= 1024) {
                    // On large screens: show sidebar normally, hide toggle buttons
                    sidebar.classList.add("desktop-mode");
                    sidebar.classList.remove("collapsed");
                    sidebar.classList.add("open");
                    toggleButtons.forEach(btn => btn.style.display = "none");
                } else {
                    // On small screens: use burger menu
                    sidebar.classList.remove("desktop-mode");
                    sidebar.classList.add("collapsed");
                    sidebar.classList.remove("open");
                    toggleButtons.forEach(btn => btn.style.display = "flex");
                }
            }

            // Initial check
            handleResize();
            
            // Listen for resize events
            window.addEventListener('resize', handleResize);

            // Attach event listeners to toggle buttons (only works on mobile)
            toggleButtons.forEach(button => {
                button.addEventListener("click", toggleSidebar);
            });
        });

        // Logout function
        function logoutUser() {
            if (confirm("Are you sure you want to log out?")) {
                alert('Logout Successful');
                window.location.href = "../logout.php";
            }
        }
    </script>
</head>

<body>
    <div class="sidebar collapsed" id="sidebar">
        <button class="toggle-btn mobile-only" id="toggleButton">☰</button>
        <br>
        <a href="home.php">🏠 Home</a>
        <a href="profile.php">🙍 Profile</a>
        <a href="consultation.php">🧑‍⚕️ Consult</a> 
        <a href="description.php">🌍 Website Description</a>
        <a href="#" onclick="logoutUser()" class="logout-btn">🔒 Logout</a>
    </div>

    <button class="toggle-btn mobile-only" id="outsideToggle">☰</button>
</body>
</html>