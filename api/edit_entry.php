<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

$entry_id = (int)($_POST["id"] ?? 0);
$type = trim($_POST["type"] ?? "");
$date = trim($_POST["date"] ?? "");
$voucher_number_input = trim($_POST["voucher_number"] ?? "");
$account_head = trim($_POST["account_head"] ?? "");
$description = trim($_POST["description"] ?? "");
$amount = trim($_POST["amount"] ?? "");

if ($entry_id <= 0 || $type === "" || $date === "" || $account_head === "" || $amount === "") {
    jsonError("Type, date, account head, and amount are required", 422);
}

$voucher_number = $voucher_number_input === "" ? null : $voucher_number_input;
$description = $description === "" ? null : $description;

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$stmt = $conn->prepare("UPDATE entry_table SET type=?, date=?, voucher_number=?, account_head=?, description=?, amount=? WHERE id=?");
$stmt->bind_param("ssssssi", $type, $date, $voucher_number, $account_head, $description, $amount, $entry_id);

if ($stmt->execute()) {
    jsonResponse(["status" => "success", "message" => "Entry updated successfully"]);
}

if ((int)$conn->errno === 1062) {
    jsonError("Voucher or receipt number already exists", 409);
}

jsonError("Failed to update entry", 500);
?>
