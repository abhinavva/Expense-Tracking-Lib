<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

$settingsFile = __DIR__ . "/../config/app_settings.json";

function loadSettings(string $path): array
{
    if (!file_exists($path)) {
        return [
            "currency" => "USD",
            "account_heads" => [],
            "form_fields" => []
        ];
    }

    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [
            "currency" => "USD",
            "account_heads" => [],
            "form_fields" => []
        ];
    }

    return $data;
}

function saveSettings(string $path, array $data): bool
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($path, $json) !== false;
}

$method = $_SERVER["REQUEST_METHOD"];

// GET — read settings (any authenticated user)
if ($method === "GET") {
    requireAuth();
    $settings = loadSettings($settingsFile);
    jsonResponse([
        "status" => "success",
        "currency" => $settings["currency"] ?? "USD",
        "currency_mode" => $settings["currency_mode"] ?? "symbol_only",
        "account_heads" => $settings["account_heads"] ?? [],
        "form_fields" => $settings["form_fields"] ?? []
    ]);
}

// POST — update settings (admin only)
if ($method === "POST") {
    requireAdministrator();

    $input = file_get_contents("php://input");
    $body = json_decode($input, true);

    if (!is_array($body)) {
        jsonError("Invalid JSON body", 422);
    }

    $settings = loadSettings($settingsFile);

    // Update currency
    if (isset($body["currency"]) && is_string($body["currency"])) {
        $allowed = ["USD", "EUR", "INR", "GBP", "JPY"];
        $cur = strtoupper(trim($body["currency"]));
        if (in_array($cur, $allowed, true)) {
            $settings["currency"] = $cur;
        }
    }

    // Update currency mode
    if (isset($body["currency_mode"]) && is_string($body["currency_mode"])) {
        $allowedModes = ["symbol_only", "convert"];
        $mode = trim($body["currency_mode"]);
        if (in_array($mode, $allowedModes, true)) {
            $settings["currency_mode"] = $mode;
        }
    }

    // Update account heads
    if (isset($body["account_heads"]) && is_array($body["account_heads"])) {
        $heads = [];
        foreach ($body["account_heads"] as $head) {
            $h = trim((string)$head);
            if ($h !== "" && !in_array($h, $heads, true)) {
                $heads[] = $h;
            }
        }
        $settings["account_heads"] = $heads;
    }

    // Update form fields
    if (isset($body["form_fields"]) && is_array($body["form_fields"])) {
        $fields = [];
        foreach ($body["form_fields"] as $field) {
            if (!is_array($field) || empty($field["key"])) {
                continue;
            }

            $fields[] = [
                "key" => trim((string)$field["key"]),
                "label" => trim((string)($field["label"] ?? $field["key"])),
                "type" => trim((string)($field["type"] ?? "textbox")),
                "visible" => (bool)($field["visible"] ?? true),
                "system" => (bool)($field["system"] ?? false)
            ];
        }
        $settings["form_fields"] = $fields;
    }

    if (!saveSettings($settingsFile, $settings)) {
        jsonError("Failed to save settings", 500);
    }

    jsonResponse([
        "status" => "success",
        "message" => "Settings updated successfully",
        "currency" => $settings["currency"],
        "currency_mode" => $settings["currency_mode"] ?? "symbol_only",
        "account_heads" => $settings["account_heads"],
        "form_fields" => $settings["form_fields"]
    ]);
}

jsonError("Method not allowed", 405);
?>
