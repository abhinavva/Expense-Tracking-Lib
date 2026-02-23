<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

$voucher_number = trim($_POST["voucher_number"] ?? "");
if ($voucher_number === "") {
    jsonError("Voucher number required", 422);
}

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$stmt = $conn->prepare("DELETE FROM entry_table WHERE voucher_number=?");
$stmt->bind_param("s", $voucher_number);

if ($stmt->execute()) {
    jsonResponse(["status" => "success", "message" => "Entry deleted successfully"]);
}

jsonError("Failed to delete entry", 500);
?>
