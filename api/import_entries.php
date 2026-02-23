<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$rawBody = file_get_contents("php://input");
$payload = json_decode($rawBody, true);
if (!is_array($payload) || !isset($payload["entries"]) || !is_array($payload["entries"])) {
    jsonError("Invalid payload", 422);
}

$entries = $payload["entries"];
if (count($entries) === 0) {
    jsonError("No entries provided", 422);
}

function normalizeType(string $type): ?string {
    $normalized = strtolower(trim($type));
    if ($normalized === "income") {
        return "Income";
    }
    if ($normalized === "expenditure" || $normalized === "expense") {
        return "Expenditure";
    }
    return null;
}

function normalizeDateValue(string $dateValue): ?string {
    $dateValue = trim($dateValue);
    if ($dateValue === "") {
        return null;
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateValue)) {
        return $dateValue;
    }

    $timestamp = strtotime($dateValue);
    if ($timestamp === false) {
        return null;
    }
    return date("Y-m-d", $timestamp);
}

function normalizeAmountValue($amountValue): ?string {
    $value = trim((string)$amountValue);
    if ($value === "") {
        return null;
    }
    $value = str_replace(",", "", $value);
    if (!is_numeric($value)) {
        return null;
    }
    $amount = (float)$value;
    if ($amount < 0) {
        return null;
    }
    return number_format($amount, 2, ".", "");
}

$stmt = $conn->prepare("INSERT INTO entry_table (type, date, voucher_number, account_head, description, amount) VALUES (?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    jsonError("Failed to prepare import statement", 500);
}

$inserted = 0;
$duplicates = 0;
$invalid = 0;
$errors = 0;
$errorRows = [];

$conn->begin_transaction();
foreach ($entries as $index => $rawEntry) {
    $rowNo = $index + 2;
    if (!is_array($rawEntry)) {
        $invalid += 1;
        if (count($errorRows) < 20) {
            $errorRows[] = ["row" => $rowNo, "message" => "Row payload is invalid."];
        }
        continue;
    }

    $type = normalizeType((string)($rawEntry["type"] ?? ""));
    $date = normalizeDateValue((string)($rawEntry["date"] ?? ""));
    $voucherNumber = trim((string)($rawEntry["voucher_number"] ?? ""));
    $accountHead = trim((string)($rawEntry["account_head"] ?? ""));
    $description = trim((string)($rawEntry["description"] ?? ""));
    $amount = normalizeAmountValue($rawEntry["amount"] ?? "");

    if ($type === null || $date === null || $voucherNumber === "" || $accountHead === "" || $description === "" || $amount === null) {
        $invalid += 1;
        if (count($errorRows) < 20) {
            $errorRows[] = ["row" => $rowNo, "message" => "Missing or invalid required columns."];
        }
        continue;
    }

    $stmt->bind_param("ssssss", $type, $date, $voucherNumber, $accountHead, $description, $amount);
    if ($stmt->execute()) {
        $inserted += 1;
        continue;
    }

    if ((int)$stmt->errno === 1062) {
        $duplicates += 1;
        continue;
    }

    $errors += 1;
    if (count($errorRows) < 20) {
        $errorRows[] = ["row" => $rowNo, "message" => $stmt->error ?: "Unknown database error."];
    }
}
$conn->commit();

jsonResponse([
    "status" => "success",
    "message" => "Import completed.",
    "stats" => [
        "received" => count($entries),
        "inserted" => $inserted,
        "duplicates" => $duplicates,
        "invalid" => $invalid,
        "errors" => $errors
    ],
    "errors" => $errorRows
]);
?>
