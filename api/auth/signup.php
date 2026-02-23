<?php
require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

$fullName = trim($_POST["full_name"] ?? "");
$email = strtolower(trim($_POST["email"] ?? ""));
$password = $_POST["password"] ?? "";

if ($fullName === "" || $email === "" || $password === "") {
    jsonError("All fields are required", 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError("Enter a valid email address", 422);
}

if (strlen($password) < 8) {
    jsonError("Password must be at least 8 characters", 422);
}

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$requestedRole = normalizeRole(trim($_POST["role"] ?? "staff"));
if (!in_array($requestedRole, ["administrator", "staff"], true)) {
    jsonError("Invalid role", 422);
}

$role = "staff";
$countResult = $conn->query("SELECT COUNT(*) AS user_count FROM users");
$userCount = 0;
if ($countResult && ($row = $countResult->fetch_assoc())) {
    $userCount = (int)$row["user_count"];
}

if ($userCount === 0) {
    $role = "administrator";
} else {
    requireAdministrator();
    $role = $requestedRole;
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $conn->prepare(
    "INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)"
);
$stmt->bind_param("ssss", $fullName, $email, $passwordHash, $role);

if (!$stmt->execute()) {
    if ((int)$conn->errno === 1062) {
        jsonError("Email already registered", 409);
    }
    jsonError("Failed to create account", 500);
}

$userId = (int)$conn->insert_id;
$responseUser = [
    "id" => $userId,
    "full_name" => $fullName,
    "email" => $email,
    "role" => normalizeRole($role)
];

if ($userCount === 0) {
    startAppSession();
    session_regenerate_id(true);
    $_SESSION["user"] = $responseUser;
}

jsonResponse([
    "status" => "success",
    "message" => "Signup successful",
    "user" => $responseUser
]);
?>
