<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    header("Content-Type: application/json");
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

requireAdministrator();

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$payloadRaw = file_get_contents("php://input");
$payload = json_decode($payloadRaw, true);
$deleteAfterBackup = is_array($payload) && !empty($payload["delete_after_backup"]);
$fromDate = is_array($payload) ? trim((string)($payload["from_date"] ?? "")) : "";
$toDate = is_array($payload) ? trim((string)($payload["to_date"] ?? "")) : "";

if (($fromDate !== "" && $toDate === "") || ($fromDate === "" && $toDate !== "")) {
    jsonError("Both from_date and to_date are required for date-wise backup.", 422);
}
if ($fromDate !== "" && $toDate !== "") {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        jsonError("Invalid date format. Use YYYY-MM-DD.", 422);
    }
    if ($fromDate > $toDate) {
        jsonError("from_date cannot be later than to_date.", 422);
    }
}

function csvFromRows(array $headers, array $rows): string {
    $out = fopen("php://temp", "r+");
    if ($out === false) {
        throw new RuntimeException("Could not create temp stream.");
    }
    fputcsv($out, $headers);
    foreach ($rows as $row) {
        $line = [];
        foreach ($headers as $header) {
            $line[] = $row[$header] ?? "";
        }
        fputcsv($out, $line);
    }
    rewind($out);
    $content = stream_get_contents($out);
    fclose($out);
    return $content;
}

function fetchRows(mysqli $conn, string $sql): array {
    $result = $conn->query($sql);
    if (!$result) {
        throw new RuntimeException("Failed to read backup data.");
    }
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    return $rows;
}

function fetchEntryRowsByRange(mysqli $conn, string $fromDate, string $toDate): array {
    if ($fromDate === "" || $toDate === "") {
        return fetchRows(
            $conn,
            "SELECT id, type, date, voucher_number, account_head, description, amount, created_at, updated_at
             FROM entry_table
             ORDER BY date DESC, id DESC"
        );
    }
    $stmt = $conn->prepare(
        "SELECT id, type, date, voucher_number, account_head, description, amount, created_at, updated_at
         FROM entry_table
         WHERE date BETWEEN ? AND ?
         ORDER BY date DESC, id DESC"
    );
    if (!$stmt) {
        throw new RuntimeException("Failed to prepare entry backup query.");
    }
    $stmt->bind_param("ss", $fromDate, $toDate);
    $stmt->execute();
    $result = $stmt->get_result();
    if (!$result) {
        throw new RuntimeException("Failed to read entry backup data.");
    }
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    return $rows;
}

try {
    $entriesRows = fetchEntryRowsByRange($conn, $fromDate, $toDate);
    $usersRows = fetchRows(
        $conn,
        "SELECT id, full_name, email, role, is_active, created_at, updated_at
         FROM users
         ORDER BY created_at DESC, id DESC"
    );

    $timestamp = date("Y-m-d_H-i-s");
    $periodTag = ($fromDate !== "" && $toDate !== "")
        ? ("range_" . $fromDate . "_to_" . $toDate)
        : "all_dates";
    $zipFilename = "backup_" . $periodTag . "_" . $timestamp . ".zip";

    $entriesCsv = csvFromRows(
        ["id", "type", "date", "voucher_number", "account_head", "description", "amount", "created_at", "updated_at"],
        $entriesRows
    );
    $usersCsv = csvFromRows(
        ["id", "full_name", "email", "role", "is_active", "created_at", "updated_at"],
        $usersRows
    );
    $summary = [
        "created_at" => date(DATE_ATOM),
        "entries_count" => count($entriesRows),
        "users_count" => count($usersRows),
        "delete_after_backup" => $deleteAfterBackup,
        "from_date" => $fromDate,
        "to_date" => $toDate,
        "period_label" => ($fromDate !== "" && $toDate !== "") ? ($fromDate . " to " . $toDate) : "All dates"
    ];
    $summaryJson = json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    if (!class_exists("ZipArchive")) {
        throw new RuntimeException("ZipArchive is not available. Cannot create download backup.");
    }

    $zipPath = tempnam(sys_get_temp_dir(), "backup_");
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($zipPath);
        throw new RuntimeException("Could not create backup archive.");
    }
    $zip->addFromString("entries.csv", $entriesCsv);
    $zip->addFromString("users.csv", $usersCsv);
    $zip->addFromString("summary.json", $summaryJson);
    $zip->close();

    $deletedEntries = 0;
    if ($deleteAfterBackup) {
        $conn->begin_transaction();
        if ($fromDate !== "" && $toDate !== "") {
            $deleteStmt = $conn->prepare("DELETE FROM entry_table WHERE date BETWEEN ? AND ?");
            if (!$deleteStmt) {
                $conn->rollback();
                @unlink($zipPath);
                throw new RuntimeException("Backup created but failed to prepare delete query.");
            }
            $deleteStmt->bind_param("ss", $fromDate, $toDate);
            if (!$deleteStmt->execute()) {
                $conn->rollback();
                @unlink($zipPath);
                throw new RuntimeException("Backup created but failed to delete backed-up entries.");
            }
            $deletedEntries = (int)$deleteStmt->affected_rows;
        } else {
            if (!$conn->query("DELETE FROM entry_table")) {
                $conn->rollback();
                @unlink($zipPath);
                throw new RuntimeException("Backup created but failed to delete backed-up entries.");
            }
            $deletedEntries = (int)$conn->affected_rows;
        }
        $conn->commit();
    }

    header("Content-Type: application/zip");
    header("Content-Disposition: attachment; filename=\"" . $zipFilename . "\"");
    header("Content-Length: " . filesize($zipPath));
    readfile($zipPath);
    @unlink($zipPath);
    exit;
} catch (Throwable $e) {
    if (isset($zipPath) && is_file($zipPath)) {
        @unlink($zipPath);
    }
    jsonError($e->getMessage(), 500);
}
?>
