<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/db.php";
require_auth(['ADMIN','ACCOUNTANT']);

try {
    $statementId = isset($_GET["statement_id"]) ? $_GET["statement_id"] : null;
    $bankAccountId = isset($_GET["bank_account_id"]) ? $_GET["bank_account_id"] : null;
    $status = isset($_GET["status"]) ? $_GET["status"] : null;
    $confirmed = isset($_GET["confirmed"]) ? $_GET["confirmed"] : null;
    $dateFrom = isset($_GET["date_from"]) ? $_GET["date_from"] : null;
    $dateTo = isset($_GET["date_to"]) ? $_GET["date_to"] : null;

    if (!$statementId && !$bankAccountId) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing statement_id or bank_account_id"]);
        exit();
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bank_statement_lines (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            statement_id VARCHAR(50) NOT NULL,
            bank_account_id VARCHAR(50) NOT NULL,
            txn_date DATE NOT NULL,
            value_date DATE DEFAULT NULL,
            description VARCHAR(255) DEFAULT NULL,
            amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
            currency VARCHAR(10) NOT NULL DEFAULT 'TWD',
            balance_after DECIMAL(18,2) DEFAULT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'unmatched',
            confirmed TINYINT(1) NOT NULL DEFAULT 0,
            confirmed_at DATETIME DEFAULT NULL,
            confirmed_by VARCHAR(100) DEFAULT NULL,
            category VARCHAR(20) DEFAULT NULL,
            internal_txn_type VARCHAR(30) DEFAULT NULL,
            internal_txn_id VARCHAR(50) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_statement (statement_id),
            KEY idx_bank_date_status (bank_account_id, txn_date, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $sql = "SELECT * FROM bank_statement_lines";
    $where = [];
    $params = [];

    if ($statementId) {
        $where[] = "statement_id = ?";
        $params[] = $statementId;
    }

    if ($bankAccountId) {
        $where[] = "bank_account_id = ?";
        $params[] = $bankAccountId;
    }

    if ($status) {
        $where[] = "status = ?";
        $params[] = $status;
    }

    if ($confirmed !== null && $confirmed !== "") {
        if ($confirmed === "1" || strtolower($confirmed) === "true") {
            $where[] = "confirmed = 1";
        } elseif ($confirmed === "0" || strtolower($confirmed) === "false") {
            $where[] = "confirmed = 0";
        }
    }

    if ($dateFrom) {
        $where[] = "txn_date >= ?";
        $params[] = $dateFrom;
    }

    if ($dateTo) {
        $where[] = "txn_date <= ?";
        $params[] = $dateTo;
    }

    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }

    $sql .= " ORDER BY txn_date ASC, id ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $row["amount"] = isset($row["amount"]) ? (float)$row["amount"] : 0.0;
        if (isset($row["balance_after"])) {
            $row["balance_after"] = $row["balance_after"] !== null ? (float)$row["balance_after"] : null;
        }
        $row["confirmed"] = isset($row["confirmed"]) ? (bool)$row["confirmed"] : false;
    }

    echo json_encode([
        "success" => true,
        "lines" => $rows
    ]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    exit();
}
