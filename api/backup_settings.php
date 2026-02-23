<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET" && $_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

$settingsFile = __DIR__ . "/../config/backup_settings.json";
$defaultBackupPath = "C:/fin_backup";

function normalizeBackupPath(string $path): string {
    $path = trim($path);
    $path = rtrim($path, "\\/");
    return $path;
}

function ensurePathAccessible(string $path): array {
    if ($path === "") {
        return [false, "Backup path cannot be empty."];
    }

    $isWindowsAbsolute = preg_match('/^[A-Za-z]:[\\\\\\/]/', $path) === 1;
    $isUnixAbsolute = strlen($path) > 0 && $path[0] === "/";
    if (!$isWindowsAbsolute && !$isUnixAbsolute) {
        return [false, "Please provide an absolute folder path."];
    }

    if (!is_dir($path)) {
        if (!mkdir($path, 0775, true)) {
            return [false, "Path does not exist and could not be created."];
        }
    }

    if (!is_writable($path)) {
        return [false, "Path is not writable by the server."];
    }

    return [true, ""];
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $configuredPath = "";
    if (is_file($settingsFile)) {
        $saved = json_decode((string)file_get_contents($settingsFile), true);
        if (is_array($saved) && !empty($saved["backup_root"])) {
            $configuredPath = normalizeBackupPath((string)$saved["backup_root"]);
        }
    }

    if ($configuredPath === "") {
        $configuredPath = $defaultBackupPath;
    }

    [$ok, $message] = ensurePathAccessible($configuredPath);
    if ($ok) {
        $settingsPayload = json_encode(["backup_root" => $configuredPath], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($settingsPayload !== false) {
            @file_put_contents($settingsFile, $settingsPayload);
        }
    }
    jsonResponse([
        "status" => "success",
        "backup_root" => $configuredPath,
        "accessible" => $ok,
        "message" => $ok ? "Backup path is accessible." : $message
    ]);
}

$payload = json_decode((string)file_get_contents("php://input"), true);
$backupRoot = is_array($payload) ? normalizeBackupPath((string)($payload["backup_root"] ?? "")) : "";
if ($backupRoot === "") {
    $backupRoot = $defaultBackupPath;
}
[$ok, $message] = ensurePathAccessible($backupRoot);
if (!$ok) {
    jsonError($message, 422);
}

$settingsPayload = json_encode(["backup_root" => $backupRoot], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
if ($settingsPayload === false || file_put_contents($settingsFile, $settingsPayload) === false) {
    jsonError("Failed to save backup settings.", 500);
}

jsonResponse([
    "status" => "success",
    "backup_root" => $backupRoot,
    "message" => "Backup path saved successfully."
]);
?>
