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

function getTotalsMap(mysqli $conn, string $sql, string $types, array $params): array {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return [];
    }

    bindDynamicParams($stmt, $types, $params);
    $stmt->execute();
    $result = $stmt->get_result();
    $totals = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $head = (string)($row["account_head"] ?? "Other");
            $totals[$head] = (float)($row["total_amount"] ?? 0);
        }
    }
    return $totals;
}

$selectedMonth = trim((string)($_GET["month"] ?? ""));
if (!preg_match('/^\d{4}-\d{2}$/', $selectedMonth)) {
    $selectedMonth = date("Y-m");
}

$requestedFyStart = (int)($_GET["fy_start"] ?? 0);
$fyResult = $conn->query("
    SELECT DISTINCT
        CASE WHEN MONTH(date) >= 4 THEN YEAR(date) ELSE YEAR(date) - 1 END AS fy_start
    FROM entry_table
    ORDER BY fy_start DESC
");
$fyOptions = [];
if ($fyResult) {
    while ($row = $fyResult->fetch_assoc()) {
        $fy = (int)($row["fy_start"] ?? 0);
        if ($fy > 0) {
            $fyOptions[] = $fy;
        }
    }
}

$currentFyStart = (int)date("Y");
if ((int)date("n") < 4) {
    $currentFyStart -= 1;
}
if (!in_array($currentFyStart, $fyOptions, true)) {
    $fyOptions[] = $currentFyStart;
}
rsort($fyOptions);

$selectedFyStart = in_array($requestedFyStart, $fyOptions, true) ? $requestedFyStart : $currentFyStart;
$fyFrom = sprintf("%04d-04-01", $selectedFyStart);
$fyTo = sprintf("%04d-03-31", $selectedFyStart + 1);

$monthlyIncome = getTotalsMap(
    $conn,
    "SELECT account_head, SUM(amount) AS total_amount FROM entry_table WHERE type = 'Income' AND DATE_FORMAT(date, '%Y-%m') = ? GROUP BY account_head ORDER BY total_amount DESC",
    "s",
    [$selectedMonth]
);
$monthlyExpense = getTotalsMap(
    $conn,
    "SELECT account_head, SUM(amount) AS total_amount FROM entry_table WHERE type = 'Expenditure' AND DATE_FORMAT(date, '%Y-%m') = ? GROUP BY account_head ORDER BY total_amount DESC",
    "s",
    [$selectedMonth]
);
$fyIncome = getTotalsMap(
    $conn,
    "SELECT account_head, SUM(amount) AS total_amount FROM entry_table WHERE type = 'Income' AND date BETWEEN ? AND ? GROUP BY account_head ORDER BY total_amount DESC",
    "ss",
    [$fyFrom, $fyTo]
);
$fyExpense = getTotalsMap(
    $conn,
    "SELECT account_head, SUM(amount) AS total_amount FROM entry_table WHERE type = 'Expenditure' AND date BETWEEN ? AND ? GROUP BY account_head ORDER BY total_amount DESC",
    "ss",
    [$fyFrom, $fyTo]
);

jsonResponse([
    "status" => "success",
    "selected_month" => $selectedMonth,
    "selected_fy_start" => $selectedFyStart,
    "fy_options" => $fyOptions,
    "monthly_income" => $monthlyIncome,
    "monthly_expense" => $monthlyExpense,
    "fy_income" => $fyIncome,
    "fy_expense" => $fyExpense
]);
?>
