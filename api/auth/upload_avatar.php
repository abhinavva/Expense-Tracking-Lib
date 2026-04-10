<?php
require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

$currentAdmin = requireAdministrator();

$userId = (int)($_POST["user_id"] ?? 0);
if ($userId <= 0) {
    jsonError("user_id is required", 422);
}

$action = trim($_POST["action"] ?? "upload");

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

// Verify user exists
$check = $conn->prepare("SELECT id, profile_image FROM users WHERE id = ?");
$check->bind_param("i", $userId);
$check->execute();
$result = $check->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    jsonError("User not found", 404);
}

$uploadDir = __DIR__ . "/../../uploads/avatars/";

if ($action === "remove") {
    // Delete existing file
    if (!empty($user["profile_image"])) {
        $oldPath = $uploadDir . basename($user["profile_image"]);
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }

    $stmt = $conn->prepare("UPDATE users SET profile_image = NULL WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();

    jsonResponse(["status" => "success", "message" => "Profile image removed", "profile_image" => null]);
}

// Upload new image
if (!isset($_FILES["profile_image"]) || $_FILES["profile_image"]["error"] !== UPLOAD_ERR_OK) {
    jsonError("No valid file uploaded", 422);
}

$file = $_FILES["profile_image"];

// Validate file type
$allowedTypes = ["image/jpeg", "image/png", "image/webp"];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file["tmp_name"]);

if (!in_array($mimeType, $allowedTypes, true)) {
    jsonError("Only JPG, PNG and WebP images are allowed", 422);
}

// Validate file size (max 2MB)
if ($file["size"] > 2 * 1024 * 1024) {
    jsonError("Image must be under 2MB", 422);
}

// Create upload directory
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Delete old file if exists
if (!empty($user["profile_image"])) {
    $oldPath = $uploadDir . basename($user["profile_image"]);
    if (file_exists($oldPath)) {
        unlink($oldPath);
    }
}

// Generate unique filename
$ext = match($mimeType) {
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp",
    default => "jpg"
};
$filename = "avatar_" . $userId . "_" . bin2hex(random_bytes(8)) . "." . $ext;
$destPath = $uploadDir . $filename;

if (!move_uploaded_file($file["tmp_name"], $destPath)) {
    jsonError("Failed to save image", 500);
}

$relativePath = "uploads/avatars/" . $filename;
$stmt = $conn->prepare("UPDATE users SET profile_image = ? WHERE id = ?");
$stmt->bind_param("si", $relativePath, $userId);
$stmt->execute();

jsonResponse([
    "status" => "success",
    "message" => "Profile image updated",
    "profile_image" => $relativePath
]);
?>
