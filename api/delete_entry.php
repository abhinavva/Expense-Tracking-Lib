<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

$entry_id = (int)($_POST["id"] ?? 0);
if ($entry_id <= 0) {
    jsonError("Entry id required", 422);
}

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$stmt = $conn->prepare("DELETE FROM entry_table WHERE id=?");
$stmt->bind_param("i", $entry_id);

if ($stmt->execute()) {
    jsonResponse(["status" => "success", "message" => "Entry deleted successfully"]);
}

jsonError("Failed to delete entry", 500);
?>
