<?php
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    jsonError("Method not allowed", 405);
}

requireAuth();

try {
    $conn = getDbConnection();
} catch (RuntimeException $e) {
    jsonError("Could not connect to database", 500);
}

$mode = strtolower(trim((string)($_GET["mode"] ?? "")));

if ($mode !== "table") {
    $sql = "SELECT * FROM entry_table ORDER BY date DESC, id DESC";
    $result = $conn->query($sql);

    $entries = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $entries[] = $row;
        }
    }

    jsonResponse($entries);
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

$page = max(1, (int)($_GET["page"] ?? 1));
$limit = (int)($_GET["limit"] ?? 15);
$allowedLimits = [5, 15, 25, 50];
if (!in_array($limit, $allowedLimits, true)) {
    $limit = 15;
}

$search = trim((string)($_GET["search"] ?? ""));
$type = trim((string)($_GET["type"] ?? ""));
$accountHead = trim((string)($_GET["account_head"] ?? ""));
$fromDate = trim((string)($_GET["from_date"] ?? ""));
$toDate = trim((string)($_GET["to_date"] ?? ""));

$whereClauses = [];
$bindTypes = "";
$bindValues = [];

if ($search !== "") {
    $whereClauses[] = "(voucher_number LIKE ? OR description LIKE ? OR account_head LIKE ?)";
    $searchLike = "%" . $search . "%";
    $bindTypes .= "sss";
    $bindValues[] = $searchLike;
    $bindValues[] = $searchLike;
    $bindValues[] = $searchLike;
}

if ($type !== "" && $type !== "all") {
    $normalizedType = strtolower($type) === "income" ? "Income" : (strtolower($type) === "expenditure" ? "Expenditure" : "");
    if ($normalizedType !== "") {
        $whereClauses[] = "type = ?";
        $bindTypes .= "s";
        $bindValues[] = $normalizedType;
    }
}

if ($accountHead !== "") {
    $whereClauses[] = "account_head LIKE ?";
    $bindTypes .= "s";
    $bindValues[] = "%" . $accountHead . "%";
}

if ($fromDate !== "") {
    $whereClauses[] = "date >= ?";
    $bindTypes .= "s";
    $bindValues[] = $fromDate;
}

if ($toDate !== "") {
    $whereClauses[] = "date <= ?";
    $bindTypes .= "s";
    $bindValues[] = $toDate;
}

$whereSql = count($whereClauses) > 0 ? (" WHERE " . implode(" AND ", $whereClauses)) : "";

$summarySql = "
    SELECT
        COUNT(*) AS total_entries,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'Expenditure' THEN amount ELSE 0 END), 0) AS total_expenditure
    FROM entry_table
" . $whereSql;
$summaryStmt = $conn->prepare($summarySql);
if (!$summaryStmt) {
    jsonError("Failed to prepare summary query", 500);
}
bindDynamicParams($summaryStmt, $bindTypes, $bindValues);
$summaryStmt->execute();
$summaryResult = $summaryStmt->get_result();
$summaryRow = $summaryResult ? $summaryResult->fetch_assoc() : null;

$totalItems = (int)($summaryRow["total_entries"] ?? 0);
$totalIncome = (float)($summaryRow["total_income"] ?? 0);
$totalExpenditure = (float)($summaryRow["total_expenditure"] ?? 0);
$netBalance = $totalIncome - $totalExpenditure;

$totalPages = max(1, (int)ceil($totalItems / $limit));
$page = min($page, $totalPages);
$offset = ($page - 1) * $limit;

$entriesSql = "SELECT * FROM entry_table" . $whereSql . " ORDER BY date DESC, id DESC LIMIT ? OFFSET ?";
$entriesStmt = $conn->prepare($entriesSql);
if (!$entriesStmt) {
    jsonError("Failed to prepare entries query", 500);
}
$entryBindTypes = $bindTypes . "ii";
$entryBindValues = $bindValues;
$entryBindValues[] = $limit;
$entryBindValues[] = $offset;
bindDynamicParams($entriesStmt, $entryBindTypes, $entryBindValues);
$entriesStmt->execute();
$entriesResult = $entriesStmt->get_result();

$entries = [];
if ($entriesResult) {
    while ($row = $entriesResult->fetch_assoc()) {
        $entries[] = $row;
    }
}

jsonResponse([
    "status" => "success",
    "items" => $entries,
    "total_items" => $totalItems,
    "page" => $page,
    "per_page" => $limit,
    "summary" => [
        "total_entries" => $totalItems,
        "total_income" => $totalIncome,
        "total_expenditure" => $totalExpenditure,
        "net_balance" => $netBalance
    ]
]);
?>
