<?php
require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

$currentAdmin = requireAdministrator();

$userId = (int)($_POST["user_id"] ?? 0);
$fullName = trim($_POST["full_name"] ?? "");
$email = strtolower(trim($_POST["email"] ?? ""));
$role = normalizeRole(trim($_POST["role"] ?? ""));
$isActiveRaw = trim($_POST["is_active"] ?? "1");
$password = $_POST["password"] ?? "";

if ($userId <= 0 || $fullName === "" || $email === "" || $role === "") {
    jsonError("user_id, full_name, email and role are required", 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError("Enter a valid email address", 422);
}

if (!in_array($role, ["administrator", "staff"], true)) {
    jsonError("Invalid role", 422);
}

$isActive = ($isActiveRaw === "0") ? 0 : 1;
if ((int)$currentAdmin["id"] === $userId && ($role !== "administrator" || $isActive !== 1)) {
    jsonError("You cannot remove your own administrator access", 422);
}

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

if ($password !== "" && strlen($password) < 8) {
    jsonError("Password must be at least 8 characters", 422);
}

if ($password === "") {
    $stmt = $conn->prepare("UPDATE users SET full_name=?, email=?, role=?, is_active=? WHERE id=?");
    $stmt->bind_param("sssii", $fullName, $email, $role, $isActive, $userId);
} else {
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("UPDATE users SET full_name=?, email=?, password_hash=?, role=?, is_active=? WHERE id=?");
    $stmt->bind_param("ssssii", $fullName, $email, $passwordHash, $role, $isActive, $userId);
}

if (!$stmt->execute()) {
    if ((int)$conn->errno === 1062) {
        jsonError("Email already exists", 409);
    }
    jsonError("Failed to update user", 500);
}

jsonResponse(["status" => "success", "message" => "User updated successfully"]);
?>
