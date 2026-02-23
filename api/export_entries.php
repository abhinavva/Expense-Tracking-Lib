<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

requireAuth();

$from_date = trim($_POST["from_date"] ?? "");
$to_date = trim($_POST["to_date"] ?? "");
if ($from_date === "" || $to_date === "") {
    jsonError("From and To dates are required", 422);
}

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

header("Content-Type: text/csv");
header("Content-Disposition: attachment; filename=\"entries_" . $from_date . "_to_" . $to_date . ".csv\"");

$output = fopen("php://output", "w");
fputcsv($output, ["Type", "Date", "Voucher Number", "Account Head", "Description", "Amount"]);

$stmt = $conn->prepare(
    "SELECT type, date, voucher_number, account_head, description, amount
     FROM entry_table
     WHERE date BETWEEN ? AND ?"
);
$stmt->bind_param("ss", $from_date, $to_date);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    fputcsv($output, $row);
}

fclose($output);
$conn->close();
exit;
?>
