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

$payloadRaw = file_get_contents("php://input");
$payload = json_decode($payloadRaw, true);
$deleteAfterBackup = is_array($payload) && !empty($payload["delete_after_backup"]);
$fromDate = is_array($payload) ? trim((string)($payload["from_date"] ?? "")) : "";
$toDate = is_array($payload) ? trim((string)($payload["to_date"] ?? "")) : "";
$settingsFile = __DIR__ . "/../config/backup_settings.json";
$defaultBackupRoot = "C:/fin_backup";

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

function writeCsvFile(string $path, array $headers, array $rows): void {
    $handle = fopen($path, "w");
    if ($handle === false) {
        throw new RuntimeException("Could not create backup file: " . $path);
    }

    fputcsv($handle, $headers);
    foreach ($rows as $row) {
        $line = [];
        foreach ($headers as $header) {
            $line[] = $row[$header] ?? "";
        }
        fputcsv($handle, $line);
    }
    fclose($handle);
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

    $backupsRoot = "";
    if (is_file($settingsFile)) {
        $settings = json_decode((string)file_get_contents($settingsFile), true);
        if (is_array($settings) && !empty($settings["backup_root"])) {
            $backupsRoot = rtrim((string)$settings["backup_root"], "\\/");
        }
    }
    if ($backupsRoot === "") {
        $backupsRoot = rtrim($defaultBackupRoot, "\\/");
        $settingsPayload = json_encode(["backup_root" => $backupsRoot], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($settingsPayload !== false) {
            @file_put_contents($settingsFile, $settingsPayload);
        }
    }
    if (!is_dir($backupsRoot)) {
        if (!mkdir($backupsRoot, 0775, true)) {
            throw new RuntimeException("Backup path is not accessible or could not be created.");
        }
    }
    if (!is_writable($backupsRoot)) {
        throw new RuntimeException("Backup path is not writable. Please change backup path.");
    }

    $timestamp = date("Y-m-d_H-i-s");
    $periodTag = ($fromDate !== "" && $toDate !== "")
        ? ("range_" . $fromDate . "_to_" . $toDate)
        : "all_dates";
    $randomSuffix = bin2hex(random_bytes(3));
    $folderName = "backup_" . $periodTag . "_" . $timestamp . "_" . $randomSuffix;
    $backupDir = $backupsRoot . DIRECTORY_SEPARATOR . $folderName;
    if (!mkdir($backupDir, 0775, true)) {
        throw new RuntimeException("Could not create backup directory.");
    }

    writeCsvFile(
        $backupDir . DIRECTORY_SEPARATOR . "entries.csv",
        ["id", "type", "date", "voucher_number", "account_head", "description", "amount", "created_at", "updated_at"],
        $entriesRows
    );
    writeCsvFile(
        $backupDir . DIRECTORY_SEPARATOR . "users.csv",
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
    file_put_contents(
        $backupDir . DIRECTORY_SEPARATOR . "summary.json",
        json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
    );

    $deletedEntries = 0;
    if ($deleteAfterBackup) {
        $conn->begin_transaction();
        if ($fromDate !== "" && $toDate !== "") {
            $deleteStmt = $conn->prepare("DELETE FROM entry_table WHERE date BETWEEN ? AND ?");
            if (!$deleteStmt) {
                $conn->rollback();
                throw new RuntimeException("Backup created but failed to prepare delete query.");
            }
            $deleteStmt->bind_param("ss", $fromDate, $toDate);
            $deleteResult = $deleteStmt->execute();
            if (!$deleteResult) {
                $conn->rollback();
                throw new RuntimeException("Backup created but failed to delete backed-up entries.");
            }
            $deletedEntries = (int)$deleteStmt->affected_rows;
        } else {
            $deleteResult = $conn->query("DELETE FROM entry_table");
            if (!$deleteResult) {
                $conn->rollback();
                throw new RuntimeException("Backup created but failed to delete backed-up entries.");
            }
            $deletedEntries = (int)$conn->affected_rows;
        }
        $conn->commit();
    }

    jsonResponse([
        "status" => "success",
        "backup_folder" => $folderName,
        "backup_path" => $backupDir,
        "entries_count" => count($entriesRows),
        "users_count" => count($usersRows),
        "deleted_entries" => $deletedEntries,
        "backup_period_label" => ($fromDate !== "" && $toDate !== "") ? ($fromDate . " to " . $toDate) : "All dates"
    ]);
} catch (Throwable $e) {
    jsonError($e->getMessage(), 500);
}
?>
