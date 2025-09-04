<?php
session_start();

$firstname = "Student"; // Default placeholder for non-logged-in users
$id = null; // Initialize id to null
$role = null; // Default role
$isLoggedIn = 'false'; // Default to false

// Check if session variables are set
if (isset($_SESSION['firstname']) && isset($_SESSION['id']) && isset($_SESSION['role'])) {
    $firstname = $_SESSION['firstname'];
    $id = $_SESSION['id'];
    $role = $_SESSION['role'];
    $isLoggedIn = 'true';
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SJCNHS - SHS Emotion Tracker</title>

    <script>
        var isLoggedIn = <?php echo json_encode($isLoggedIn); ?>;
        var userRole = <?php echo json_encode($role); ?>;
        console.log("User login status:", isLoggedIn, "Role:", userRole);
    </script>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="index.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <link rel="icon" type="image/png" href="student/sjc.png">
</head>

<body>
    <img src="sjc.png" alt="City High Logo" class="sjc-logo">

    <div class="container">
        <h1>Welcome to the SJCNHS - SHS Emotion Track</h1>
        <p>
            This platform offers a safe space for San Jose City National High School - Senior High School students like you 
            to reflect on your emotional experiences. You're invited to gently explore and acknowledge the range of emotions you feel. 
            By choosing emotions that resonate with you, you can begin to better understand your emotional landscape and discover helpful ways 
            to support your overall well-being.
        </p>

        <p>
            What's more, this platform also provides a convenient way to connect with our Guidance Office online. We understand that sometimes 
            it's not possible to visit in person, and we want to ensure you always have access to the support you need. Now, you can consult and 
            communicate with our guidance counselors remotely, making it easier than ever to get the help and advice you appreciate, 
            all from the comfort of your home.
        </p>    
        <br>

        <?php if ($isLoggedIn === 'true') { ?>
            <?php if ($role === 'admin') { ?>
                <a href="admin/index.php" class="cta-button">Go to Admin Panel</a>
            <?php } else { ?>
                <a href="student/home.php" class="cta-button">Track Your Emotions Now!</a>
            <?php } ?>
        <?php } else { ?>
            <p>Please log in to track your emotions.</p>
            <a href="#" class="cta-button" onclick="openModal('loginModal')">Login</a>
        <?php } ?>
    </div>

    <!-- Login Modal -->
    <div id="loginModal" class="modal" style="display:none;">
        <div class="modal-content">
            <span class="close" onclick="closeModal('loginModal')">&times;</span>
            <h2 style="color: black;">Login</h2>
            <form id="loginForm" method="post" action="login.php">
                <label for="email" style="color: black; font-weight: bold;">Email:</label>
                <input type="text" id="email" name="email" placeholder="Email" style="color: black;" required>
                <label for="password" style="color: black; font-weight: bold;">Password:</label>
                <div>
                    <input type="password" id="password" name="password" placeholder="Password" style="color: black;" required>
                    <i class="fas fa-eye" id="password-toggle"
                        style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer;"></i>
                </div>
                <br>
                <button type="submit">Login</button>
                <br><br>
                <button type="button" onclick="openSignupModal()">Signup</button>
            </form>
        </div>
    </div>

    <!-- Signup Modal -->
    <div id="signupModal" class="modal" style="display:none;">
        <div class="modal-content">
            <span class="close" onclick="closeModal('signupModal')">&times;</span>
            <h2 style="color: black;">Sign Up</h2>

            <form id="signupForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="firstName">First Name:</label>
                        <input type="text" id="firstName" name="first_name" placeholder="First Name" required>
                    </div>
                    <div class="form-group">
                        <label for="lastName">Last Name:</label>
                        <input type="text" id="lastName" name="last_name" placeholder="Last Name" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="signupEmail">Email:</label>
                        <input type="text" id="signupEmail" name="email" placeholder="Mobile number or email" required>
                    </div>
                    <div class="form-group">
                        <label for="signupPassword">New password:</label>
                        <div style="position: relative;">
                            <input type="password" id="signupPassword" name="password" placeholder="New password" required>
                            <i class="fas fa-eye" id="signupPassword-toggle" 
                                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer;"></i>
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="birthday">Birthday:</label>
                        <input type="date" id="birthday" name="birthday" required>
                    </div>
                </div>

                <div class="form-full-width">
                    <label for="strand">Strand:</label>
                    <select id="strand" name="strand" required>
                        <option value="">Select your strand</option>
                        <option value="STEM">STEM</option>
                        <option value="ABM">ABM</option>
                        <option value="HUMSS">HUMSS</option>
                        <option value="GAS">GAS</option>
                        <option value="TVL">TVL</option>
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="grade">Grade:</label>
                        <select id="grade" name="grade" required>
                            <option value="">Select your grade</option>
                            <option value="11">Grade 11</option>
                            <option value="12">Grade 12</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="section">Section:</label>
                        <input type="text" id="section" name="section" placeholder="e.g., A, Diamond" required>
                    </div>
                </div>
                <p class="privacy-note">By clicking Sign Up, you agree to our <a href="#">Terms</a>. Learn how we collect, use and share your data in our <a href="#">Data Policy</a> and how we use cookies and similar technology in our <a href="#">Cookies Policy</a>. You may receive SMS Notifications from us and can opt out any time.</p>

                <button type="submit">Sign Up</button>
                <p style="text-align: center; margin-top: 15px; color: black;">Already have an account? <a href="#" onclick="switchToLogin()">Log In</a></p>
            </form>
        </div>
    </div>

    <script>
        $(document).ready(function () {
            // login submit handler
            $("#loginForm").submit(function (e) {
                e.preventDefault();
                $.ajax({
                    type: "POST",
                    url: "login.php",
                    data: $(this).serialize(),
                    dataType: "json",
                    success: function (response) {
                        console.log("Server Response:", response);
                        if (response.status === "success") {
                            alert("✅ Login Successful! Welcome, " + response.firstname + "!");
                            closeModal("loginModal");

                            setTimeout(function () {
                                if (response.role === "admin") {
                                    window.location.href = "admin/index.php";
                                } else if (response.role === "student") {
                                    window.location.href = "student/home.php";
                                } else {
                                    alert("⚠ Unknown role. Please contact support.");
                                }
                            }, 500);
                        } else {
                            alert("❌ " + response.message);
                        }
                    },
                    error: function (xhr, status, error) {
                        console.log("AJAX Error: ", status, error);
                        console.log("Server Response: ", xhr.responseText);
                        alert("⚠ Something went wrong! " + xhr.responseText);
                    }
                });
            });

            // signup submit handler
            $("#signupForm").submit(function (e) {
                e.preventDefault();
                $.ajax({
                    type: "POST",
                    url: "signup.php",
                    data: $(this).serialize(),
                    dataType: "json",
                    success: function (response) {
                        console.log("Server Response:", response);
                        if (response.status === "success") {
                            alert("✅ Signup Successful! Redirecting to login...");
                            closeModal('signupModal');
                            setTimeout(function () {
                                openModal('loginModal');
                            }, 500);
                        } else {
                            alert("❌ " + response.message);
                        }
                    },
                    error: function (xhr, status, error) {
                        console.log("AJAX Error: ", status, error);
                        console.log("Server Response: ", xhr.responseText);
                        alert("⚠ Something went wrong! " + xhr.responseText);
                    }
                });
            });

            // Modal Open/Close Functions
            window.openModal = function (modalId) {
                $("#" + modalId).css("display", "flex");
                $("body").css("overflow", "hidden");
            };

            window.closeModal = function (modalId) {
                $("#" + modalId).css("display", "none");
                $("body").css("overflow", "auto");
            };

            window.openSignupModal = function () {
                closeModal('loginModal');
                openModal('signupModal');
            };

            window.switchToLogin = function () {
                closeModal('signupModal');
                openModal('loginModal');
            };

            // Password Toggle Functionality for Login Modal
            const passwordInput = document.getElementById('password');
            const passwordToggle = document.getElementById('password-toggle');

            if (passwordToggle && passwordInput) {
                passwordToggle.addEventListener('click', function () {
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        this.classList.remove('fa-eye');
                        this.classList.add('fa-eye-slash');
                    } else {
                        passwordInput.type = 'password';
                        this.classList.remove('fa-eye-slash');
                        this.classList.add('fa-eye');
                    }
                });
            }

            // Password Toggle Functionality for Signup Modal
            const signupPasswordInput = document.getElementById('signupPassword');
            const signupPasswordToggle = document.getElementById('signupPassword-toggle');

            if (signupPasswordToggle && signupPasswordInput) {
                signupPasswordToggle.addEventListener('click', function () {
                    if (signupPasswordInput.type === 'password') {
                        signupPasswordInput.type = 'text';
                        this.classList.remove('fa-eye');
                        this.classList.add('fa-eye-slash');
                    } else {
                        signupPasswordInput.type = 'password';
                        this.classList.remove('fa-eye-slash');
                        this.classList.add('fa-eye');
                    }
                });
            }
        });
    </script>
</body>

</html>
