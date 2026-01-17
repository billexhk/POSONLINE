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
    $bankAccountId = isset($_GET["bank_account_id"]) ? $_GET["bank_account_id"] : null;
    $dateFrom = isset($_GET["date_from"]) ? $_GET["date_from"] : null;
    $dateTo = isset($_GET["date_to"]) ? $_GET["date_to"] : null;
    $limit = isset($_GET["limit"]) ? (int)$_GET["limit"] : 50;
    $offset = isset($_GET["offset"]) ? (int)$_GET["offset"] : 0;

    if ($limit <= 0) {
        $limit = 50;
    }
    if ($limit > 500) {
        $limit = 500;
    }
    if ($offset < 0) {
        $offset = 0;
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bank_statements (
            id VARCHAR(50) NOT NULL,
            bank_account_id VARCHAR(50) NOT NULL,
            statement_date_from DATE NOT NULL,
            statement_date_to DATE NOT NULL,
            source_type VARCHAR(50) DEFAULT 'manual',
            original_filename VARCHAR(255) DEFAULT NULL,
            imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            imported_by VARCHAR(100) DEFAULT NULL,
            PRIMARY KEY (id),
            KEY idx_bank_date (bank_account_id, statement_date_from, statement_date_to)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $sql = "SELECT * FROM bank_statements";
    $where = [];
    $params = [];

    if ($bankAccountId) {
        $where[] = "bank_account_id = ?";
        $params[] = $bankAccountId;
    }

    if ($dateFrom) {
        $where[] = "statement_date_to >= ?";
        $params[] = $dateFrom;
    }

    if ($dateTo) {
        $where[] = "statement_date_from <= ?";
        $params[] = $dateTo;
    }

    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }

    $sql .= " ORDER BY imported_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "statements" => $rows
    ]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    exit();
}
