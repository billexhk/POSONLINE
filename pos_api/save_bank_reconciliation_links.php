<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/db.php";
require_auth(['ADMIN','ACCOUNTANT']);

try {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid JSON payload"]);
        exit();
    }

    $lineId = isset($data["lineId"]) ? (int)$data["lineId"] : 0;
    if ($lineId <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing or invalid lineId"]);
        exit();
    }

    $links = isset($data["links"]) && is_array($data["links"]) ? $data["links"] : [];
    $status = $data["status"] ?? null;
    $category = $data["category"] ?? null;

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

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bank_reconciliation_links (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            line_id BIGINT UNSIGNED NOT NULL,
            internal_txn_type VARCHAR(30) NOT NULL,
            internal_txn_id VARCHAR(50) NOT NULL,
            amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_line (line_id),
            KEY idx_internal (internal_txn_type, internal_txn_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $stmtCheck = $pdo->prepare("SELECT * FROM bank_statement_lines WHERE id = ? LIMIT 1");
    $stmtCheck->execute([$lineId]);
    $line = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$line) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Bank statement line not found"]);
        exit();
    }

    $pdo->beginTransaction();

    $stmtDelete = $pdo->prepare("DELETE FROM bank_reconciliation_links WHERE line_id = ?");
    $stmtDelete->execute([$lineId]);

    $mainInternalType = null;
    $mainInternalId = null;

    if (!empty($links)) {
        $stmtInsert = $pdo->prepare("
            INSERT INTO bank_reconciliation_links (
                line_id,
                internal_txn_type,
                internal_txn_id,
                amount
            ) VALUES (?, ?, ?, ?)
        ");

        foreach ($links as $index => $link) {
            $txnType = $link["internalTxnType"] ?? null;
            $txnId = $link["internalTxnId"] ?? null;
            if (!$txnType || !$txnId) {
                continue;
            }
            $amount = isset($link["amount"]) ? (float)$link["amount"] : 0.0;

            $stmtInsert->execute([
                $lineId,
                $txnType,
                $txnId,
                $amount
            ]);

            if ($index === 0) {
                $mainInternalType = $txnType;
                $mainInternalId = $txnId;
            }
        }
    }

    if (!$status) {
        $status = !empty($links) ? "matched" : "unmatched";
    }

    $stmtUpdate = $pdo->prepare("
        UPDATE bank_statement_lines
        SET status = ?, category = ?, internal_txn_type = ?, internal_txn_id = ?
        WHERE id = ?
    ");

    $stmtUpdate->execute([
        $status,
        $category,
        $mainInternalType,
        $mainInternalId,
        $lineId
    ]);

    $pdo->commit();

    $stmtResult = $pdo->prepare("SELECT * FROM bank_statement_lines WHERE id = ? LIMIT 1");
    $stmtResult->execute([$lineId]);
    $updatedLine = $stmtResult->fetch(PDO::FETCH_ASSOC);

    if ($updatedLine) {
        $updatedLine["amount"] = isset($updatedLine["amount"]) ? (float)$updatedLine["amount"] : 0.0;
        if (isset($updatedLine["balance_after"])) {
            $updatedLine["balance_after"] = $updatedLine["balance_after"] !== null ? (float)$updatedLine["balance_after"] : null;
        }
        $updatedLine["confirmed"] = isset($updatedLine["confirmed"]) ? (bool)$updatedLine["confirmed"] : false;
    }

    $stmtLinks = $pdo->prepare("SELECT * FROM bank_reconciliation_links WHERE line_id = ?");
    $stmtLinks->execute([$lineId]);
    $savedLinks = $stmtLinks->fetchAll(PDO::FETCH_ASSOC);

    foreach ($savedLinks as &$l) {
        $l["amount"] = isset($l["amount"]) ? (float)$l["amount"] : 0.0;
    }

    echo json_encode([
        "success" => true,
        "line" => $updatedLine,
        "links" => $savedLinks
    ]);
    exit();
} catch (Exception $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    exit();
}
