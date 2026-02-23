<?php
require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

$email = strtolower(trim($_POST["email"] ?? ""));
$password = $_POST["password"] ?? "";

if ($email === "" || $password === "") {
    jsonError("Email and password are required", 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError("Enter a valid email address", 422);
}

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$stmt = $conn->prepare(
    "SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1"
);
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user || !password_verify($password, $user["password_hash"])) {
    jsonError("Invalid email or password", 401);
}

if ((int)$user["is_active"] !== 1) {
    jsonError("Account is inactive", 403);
}

startAppSession();
session_regenerate_id(true);
$_SESSION["user"] = [
    "id" => (int)$user["id"],
    "full_name" => $user["full_name"],
    "email" => $user["email"],
    "role" => normalizeRole($user["role"])
];

jsonResponse([
    "status" => "success",
    "message" => "Login successful",
    "user" => $_SESSION["user"]
]);
?>
