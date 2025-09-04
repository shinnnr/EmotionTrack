<?php
session_start();
header('Content-Type: application/json');

$response = ['isLoggedIn' => isset($_SESSION['firstname'])];

echo json_encode($response);
?>
