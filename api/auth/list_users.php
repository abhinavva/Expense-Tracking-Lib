<?php
require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    jsonError("Method not allowed", 405);
}

requireAdministrator();

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

function bindDynamicParams(mysqli_stmt $stmt, string $types, array $params): void {
    if ($types === "" || count($params) === 0) {
        return;
    }

    $bindArgs = [$types];
    foreach ($params as $index => $value) {
        $bindArgs[] = &$params[$index];
    }
    call_user_func_array([$stmt, "bind_param"], $bindArgs);
}

$mode = strtolower(trim((string)($_GET["mode"] ?? "")));

if ($mode !== "table") {
    $result = $conn->query("SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC");
    $users = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $row["role"] = normalizeRole((string)$row["role"]);
            $users[] = $row;
        }
    }

    jsonResponse(["status" => "success", "users" => $users]);
}

$page = max(1, (int)($_GET["page"] ?? 1));
$limit = (int)($_GET["limit"] ?? 15);
$allowedLimits = [5, 15, 25, 50];
if (!in_array($limit, $allowedLimits, true)) {
    $limit = 15;
}

$search = trim((string)($_GET["search"] ?? ""));
$role = trim((string)($_GET["role"] ?? ""));
$status = trim((string)($_GET["status"] ?? ""));

$whereClauses = [];
$bindTypes = "";
$bindValues = [];

if ($search !== "") {
    $whereClauses[] = "(full_name LIKE ? OR email LIKE ?)";
    $searchLike = "%" . $search . "%";
    $bindTypes .= "ss";
    $bindValues[] = $searchLike;
    $bindValues[] = $searchLike;
}

if ($role !== "" && $role !== "all") {
    $normalizedRole = normalizeRole($role);
    if ($normalizedRole === "administrator" || $normalizedRole === "staff") {
        $whereClauses[] = "role = ?";
        $bindTypes .= "s";
        $bindValues[] = $normalizedRole;
    }
}

if ($status === "active" || $status === "inactive") {
    $whereClauses[] = "is_active = ?";
    $bindTypes .= "i";
    $bindValues[] = $status === "active" ? 1 : 0;
}

$whereSql = count($whereClauses) > 0 ? (" WHERE " . implode(" AND ", $whereClauses)) : "";

$summaryResult = $conn->query("
    SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN role = 'staff' THEN 1 ELSE 0 END) AS staff_users,
        SUM(CASE WHEN role = 'administrator' THEN 1 ELSE 0 END) AS admin_users
    FROM users
");
$summary = [
    "total_users" => 0,
    "active_users" => 0,
    "staff_users" => 0,
    "admin_users" => 0
];
if ($summaryResult) {
    $row = $summaryResult->fetch_assoc();
    if ($row) {
        $summary["total_users"] = (int)($row["total_users"] ?? 0);
        $summary["active_users"] = (int)($row["active_users"] ?? 0);
        $summary["staff_users"] = (int)($row["staff_users"] ?? 0);
        $summary["admin_users"] = (int)($row["admin_users"] ?? 0);
    }
}

$countSql = "SELECT COUNT(*) AS total_items FROM users" . $whereSql;
$countStmt = $conn->prepare($countSql);
if (!$countStmt) {
    jsonError("Failed to prepare users count query", 500);
}
bindDynamicParams($countStmt, $bindTypes, $bindValues);
$countStmt->execute();
$countResult = $countStmt->get_result();
$countRow = $countResult ? $countResult->fetch_assoc() : null;
$totalItems = (int)($countRow["total_items"] ?? 0);

$totalPages = max(1, (int)ceil($totalItems / $limit));
$page = min($page, $totalPages);
$offset = ($page - 1) * $limit;

$usersSql = "SELECT id, full_name, email, role, is_active, created_at FROM users" . $whereSql . " ORDER BY created_at DESC LIMIT ? OFFSET ?";
$usersStmt = $conn->prepare($usersSql);
if (!$usersStmt) {
    jsonError("Failed to prepare users list query", 500);
}
$usersBindTypes = $bindTypes . "ii";
$usersBindValues = $bindValues;
$usersBindValues[] = $limit;
$usersBindValues[] = $offset;
bindDynamicParams($usersStmt, $usersBindTypes, $usersBindValues);
$usersStmt->execute();
$result = $usersStmt->get_result();

$users = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row["role"] = normalizeRole((string)$row["role"]);
        $users[] = $row;
    }
}

jsonResponse([
    "status" => "success",
    "users" => $users,
    "total_items" => $totalItems,
    "page" => $page,
    "per_page" => $limit,
    "summary" => $summary
]);
?>
