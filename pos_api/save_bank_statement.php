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

    $bankAccountId = $data["bankAccountId"] ?? null;
    $lines = $data["lines"] ?? null;

    if (!$bankAccountId || !is_array($lines) || count($lines) === 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing bankAccountId or lines"]);
        exit();
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

    $statementId = isset($data["id"]) && $data["id"] !== "" ? $data["id"] : ("BS-" . uniqid());

    $dateFrom = $data["statementDateFrom"] ?? null;
    $dateTo = $data["statementDateTo"] ?? null;

    if (!$dateFrom || !$dateTo) {
        $dates = [];
        foreach ($lines as $line) {
            if (!empty($line["txnDate"])) {
                $dates[] = $line["txnDate"];
            }
        }
        if (count($dates) > 0) {
            sort($dates);
            $dateFrom = $dateFrom ?: $dates[0];
            $dateTo = $dateTo ?: $dates[count($dates) - 1];
        } else {
            $today = date("Y-m-d");
            $dateFrom = $dateFrom ?: $today;
            $dateTo = $dateTo ?: $today;
        }
    }

    $sourceType = $data["sourceType"] ?? "manual";
    $originalFilename = $data["originalFilename"] ?? null;
    $importedBy = $data["importedBy"] ?? "System";

    $pdo->beginTransaction();

    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM bank_statements WHERE id = ?");
    $stmtCheck->execute([$statementId]);
    if ((int)$stmtCheck->fetchColumn() > 0) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "error" => "Bank statement ID already exists",
            "id" => $statementId
        ]);
        exit();
    }

    $stmtInsertStatement = $pdo->prepare("
        INSERT INTO bank_statements (
            id,
            bank_account_id,
            statement_date_from,
            statement_date_to,
            source_type,
            original_filename,
            imported_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    $stmtInsertStatement->execute([
        $statementId,
        $bankAccountId,
        $dateFrom,
        $dateTo,
        $sourceType,
        $originalFilename,
        $importedBy
    ]);

    $stmtInsertLine = $pdo->prepare("
        INSERT INTO bank_statement_lines (
            statement_id,
            bank_account_id,
            txn_date,
            value_date,
            description,
            amount,
            currency,
            balance_after
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $inserted = 0;
    foreach ($lines as $line) {
        $txnDate = $line["txnDate"] ?? null;
        if (!$txnDate) {
            continue;
        }
        $valueDate = $line["valueDate"] ?? null;
        $description = $line["description"] ?? null;
        $amount = isset($line["amount"]) ? (float)$line["amount"] : 0.0;
        $currency = $line["currency"] ?? ($data["currency"] ?? "TWD");
        $balanceAfter = isset($line["balanceAfter"]) ? (float)$line["balanceAfter"] : null;

        $stmtInsertLine->execute([
            $statementId,
            $bankAccountId,
            $txnDate,
            $valueDate,
            $description,
            $amount,
            $currency,
            $balanceAfter
        ]);
        $inserted++;
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "id" => $statementId,
        "bankAccountId" => $bankAccountId,
        "statementDateFrom" => $dateFrom,
        "statementDateTo" => $dateTo,
        "insertedLines" => $inserted
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
