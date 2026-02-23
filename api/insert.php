<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

$type = trim($_POST["type"] ?? "");
$date = trim($_POST["date"] ?? "");
$voucher_number = trim($_POST["voucher_number"] ?? "");
$account_head = trim($_POST["account_head"] ?? "");
$description = trim($_POST["description"] ?? "");
$amount = trim($_POST["amount"] ?? "");

if ($type === "" || $date === "" || $voucher_number === "" || $account_head === "" || $description === "" || $amount === "") {
    jsonError("All fields are required", 422);
}

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$stmt = $conn->prepare("INSERT INTO entry_table (type, date, voucher_number, account_head, description, amount) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ssssss", $type, $date, $voucher_number, $account_head, $description, $amount);

if ($stmt->execute()) {
    jsonResponse(["status" => "success", "message" => "Entry added successfully"]);
}

if ((int)$conn->errno === 1062) {
    jsonError("Voucher or receipt number already exists", 409);
}

jsonError("Failed to add entry", 500);
?>
