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
$fromDate = is_array($payload) ? trim((string)($payload["from_date"] ?? "")) : "";
$toDate = is_array($payload) ? trim((string)($payload["to_date"] ?? "")) : "";

if (($fromDate !== "" && $toDate === "") || ($fromDate === "" && $toDate !== "")) {
    jsonError("Both from_date and to_date are required for date-wise export.", 422);
}
if ($fromDate !== "" && $toDate !== "") {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        jsonError("Invalid date format. Use YYYY-MM-DD.", 422);
    }
    if ($fromDate > $toDate) {
        jsonError("from_date cannot be later than to_date.", 422);
    }
}

function xmlEscape(string $value): string
{
    return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, "UTF-8");
}

function fetchEntryRowsByRange(mysqli $conn, string $fromDate, string $toDate): array
{
    if ($fromDate === "" || $toDate === "") {
        $result = $conn->query(
            "SELECT id, type, date, voucher_number, account_head, description, amount
             FROM entry_table
             ORDER BY date ASC, id ASC"
        );
        if (!$result) {
            throw new RuntimeException("Failed to read entries for export.");
        }

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        return $rows;
    }

    $stmt = $conn->prepare(
        "SELECT id, type, date, voucher_number, account_head, description, amount
         FROM entry_table
         WHERE date BETWEEN ? AND ?
         ORDER BY date ASC, id ASC"
    );
    if (!$stmt) {
        throw new RuntimeException("Failed to prepare export query.");
    }
    $stmt->bind_param("ss", $fromDate, $toDate);
    $stmt->execute();
    $result = $stmt->get_result();
    if (!$result) {
        throw new RuntimeException("Failed to read entries for export.");
    }

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    return $rows;
}

function normalizeTallyDate(string $dateValue): string
{
    return str_replace("-", "", $dateValue);
}

try {
    $entries = fetchEntryRowsByRange($conn, $fromDate, $toDate);
    if (count($entries) === 0) {
        jsonError("No entries found for the selected period.", 404);
    }

    $messages = [];
    $exportedCount = 0;

    foreach ($entries as $entry) {
        $type = strtolower(trim((string)($entry["type"] ?? "")));
        $dateValue = trim((string)($entry["date"] ?? ""));
        $amountValue = (float)($entry["amount"] ?? 0);

        if (($type !== "income" && $type !== "expenditure") || $dateValue === "" || $amountValue <= 0) {
            continue;
        }

        $voucherType = $type === "income" ? "Receipt" : "Payment";
        $voucherNumber = trim((string)($entry["voucher_number"] ?? ""));
        $accountHead = trim((string)($entry["account_head"] ?? ""));
        $description = trim((string)($entry["description"] ?? ""));

        if ($accountHead === "") {
            $accountHead = $type === "income" ? "Income" : "Expense";
        }

        $narrationParts = [];
        if ($voucherNumber !== "") {
            $narrationParts[] = "Ref: " . $voucherNumber;
        }
        if ($description !== "") {
            $narrationParts[] = $description;
        }
        $narration = implode(" | ", $narrationParts);

        $absAmount = number_format(abs($amountValue), 2, ".", "");
        if ($type === "income") {
            $headAmount = "-" . $absAmount;
            $headIsPositive = "Yes";
            $cashAmount = $absAmount;
            $cashIsPositive = "No";
        } else {
            $headAmount = $absAmount;
            $headIsPositive = "No";
            $cashAmount = "-" . $absAmount;
            $cashIsPositive = "Yes";
        }

        $tallyDate = normalizeTallyDate($dateValue);
        $voucherNumberXml = xmlEscape($voucherNumber);
        $narrationXml = xmlEscape($narration);
        $accountHeadXml = xmlEscape($accountHead);
        $remoteId = "EXPTRACK-" . (string)($entry["id"] ?? $exportedCount + 1);

        $messages[] = "            <TALLYMESSAGE xmlns:UDF=\"TallyUDF\">\n" .
            "                <VOUCHER REMOTEID=\"" . xmlEscape($remoteId) . "\" VCHKEY=\"" . xmlEscape($remoteId) . "\" VCHTYPE=\"" . $voucherType . "\" ACTION=\"Create\" OBJVIEW=\"Accounting Voucher View\">\n" .
            "                    <DATE>" . $tallyDate . "</DATE>\n" .
            "                    <VOUCHERTYPENAME>" . $voucherType . "</VOUCHERTYPENAME>\n" .
            "                    <VOUCHERNUMBER>" . $voucherNumberXml . "</VOUCHERNUMBER>\n" .
            "                    <EFFECTIVEDATE>" . $tallyDate . "</EFFECTIVEDATE>\n" .
            "                    <NARRATION>" . $narrationXml . "</NARRATION>\n" .
            "                    <ALLLEDGERENTRIES.LIST>\n" .
            "                        <LEDGERNAME>" . $accountHeadXml . "</LEDGERNAME>\n" .
            "                        <ISDEEMEDPOSITIVE>" . $headIsPositive . "</ISDEEMEDPOSITIVE>\n" .
            "                        <AMOUNT>" . $headAmount . "</AMOUNT>\n" .
            "                    </ALLLEDGERENTRIES.LIST>\n" .
            "                    <ALLLEDGERENTRIES.LIST>\n" .
            "                        <LEDGERNAME>Cash</LEDGERNAME>\n" .
            "                        <ISDEEMEDPOSITIVE>" . $cashIsPositive . "</ISDEEMEDPOSITIVE>\n" .
            "                        <AMOUNT>" . $cashAmount . "</AMOUNT>\n" .
            "                    </ALLLEDGERENTRIES.LIST>\n" .
            "                </VOUCHER>\n" .
            "            </TALLYMESSAGE>";

        $exportedCount++;
    }

    if ($exportedCount === 0) {
        jsonError("No valid entries found for Tally export.", 422);
    }

    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" .
        "<ENVELOPE>\n" .
        "    <HEADER>\n" .
        "        <TALLYREQUEST>Import Data</TALLYREQUEST>\n" .
        "    </HEADER>\n" .
        "    <BODY>\n" .
        "        <IMPORTDATA>\n" .
        "            <REQUESTDESC>\n" .
        "                <REPORTNAME>Vouchers</REPORTNAME>\n" .
        "            </REQUESTDESC>\n" .
        "            <REQUESTDATA>\n" .
        implode("\n", $messages) . "\n" .
        "            </REQUESTDATA>\n" .
        "        </IMPORTDATA>\n" .
        "    </BODY>\n" .
        "</ENVELOPE>\n";

    $periodTag = ($fromDate !== "" && $toDate !== "")
        ? ("range_" . $fromDate . "_to_" . $toDate)
        : "all_dates";
    $filename = "tally_export_" . $periodTag . "_" . date("Y-m-d_H-i-s") . ".xml";

    header("Content-Type: application/xml; charset=UTF-8");
    header("Content-Disposition: attachment; filename=\"" . $filename . "\"");
    echo $xml;
    exit;
} catch (Throwable $e) {
    jsonError($e->getMessage(), 500);
}
?>
