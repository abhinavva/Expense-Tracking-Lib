<?php
function normalizeRole(string $role): string
{
    if ($role === "admin") {
        return "administrator";
    }
    return $role;
}

function startAppSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        "lifetime" => 0,
        "path" => "/",
        "httponly" => true,
        "samesite" => "Lax"
    ]);

    session_start();
}

function jsonResponse(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header("Content-Type: application/json");
    echo json_encode($payload);
    exit;
}

function jsonError(string $message, int $statusCode = 400): void
{
    jsonResponse(["status" => "error", "message" => $message], $statusCode);
}

function currentUser(): ?array
{
    startAppSession();
    if (!isset($_SESSION["user"])) {
        return null;
    }

    $_SESSION["user"]["role"] = normalizeRole((string)($_SESSION["user"]["role"] ?? ""));
    return $_SESSION["user"];
}

function requireAuth(): array
{
    $user = currentUser();
    if ($user === null) {
        jsonError("Unauthorized", 401);
    }

    return $user;
}

function requireRole(array $allowedRoles): array
{
    $user = requireAuth();
    $allowed = array_map("normalizeRole", $allowedRoles);
    $role = normalizeRole((string)($user["role"] ?? ""));
    $user["role"] = $role;
    if (!in_array($role, $allowed, true)) {
        jsonError("Forbidden", 403);
    }

    return $user;
}

function requireAdministrator(): array
{
    return requireRole(["administrator"]);
}
?>
