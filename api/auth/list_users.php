<?php
require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$result = $conn->query("SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC");
$users = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row["role"] = normalizeRole((string)$row["role"]);
        $users[] = $row;
    }
}

jsonResponse(["status" => "success", "users" => $users]);
?>
