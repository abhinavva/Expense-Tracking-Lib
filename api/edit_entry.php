<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

$original_voucher_number = trim($_POST["original_voucher_number"] ?? "");
$type = trim($_POST["type"] ?? "");
$date = trim($_POST["date"] ?? "");
$voucher_number = trim($_POST["voucher_number"] ?? "");
$account_head = trim($_POST["account_head"] ?? "");
$description = trim($_POST["description"] ?? "");
$amount = trim($_POST["amount"] ?? "");

if ($original_voucher_number === "" || $type === "" || $date === "" || $voucher_number === "" || $account_head === "" || $description === "" || $amount === "") {
    jsonError("All fields are required", 422);
}

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$stmt = $conn->prepare("UPDATE entry_table SET type=?, date=?, voucher_number=?, account_head=?, description=?, amount=? WHERE voucher_number=?");
$stmt->bind_param("sssssss", $type, $date, $voucher_number, $account_head, $description, $amount, $original_voucher_number);

if ($stmt->execute()) {
    jsonResponse(["status" => "success", "message" => "Entry updated successfully"]);
}

if ((int)$conn->errno === 1062) {
    jsonError("Voucher or receipt number already exists", 409);
}

jsonError("Failed to update entry", 500);
?>
