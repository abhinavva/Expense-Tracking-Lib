<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    jsonError("Method not allowed", 405);
}

requireAuth();

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$sql = "SELECT * FROM entry_table ORDER BY date DESC";
$result = $conn->query($sql);

$entries = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $entries[] = $row;
    }
}

jsonResponse($entries);
?>
