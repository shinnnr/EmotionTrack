 window.onclick = function (event) {
        const loginModal = document.getElementById("loginModal");
        const signupModal = document.getElementById("signupModal");
        if (event.target === loginModal) {
            closeModal("loginModal");
        } else if (event.target === signupModal) {
            closeModal("signupModal");
        }
    };


function openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

function openSignupModal() {
    closeModal("loginModal");
    openModal("signupModal");
}

function switchToLogin() {
    closeModal("signupModal");
    openModal("loginModal");
}


function confirmLogout() {
    if (confirm("Are you sure you want to logout?")) {
        document.querySelector('.logout-container form').submit();
    }
}