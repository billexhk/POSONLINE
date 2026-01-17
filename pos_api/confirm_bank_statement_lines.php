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

    $lineIds = isset($data["lineIds"]) && is_array($data["lineIds"]) ? $data["lineIds"] : [];
    if (empty($lineIds)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing lineIds"]);
        exit();
    }

    $confirmedFlag = $data["confirmed"] ?? true;
    $confirmed = ($confirmedFlag === false || $confirmedFlag === 0 || $confirmedFlag === "0" || $confirmedFlag === "false") ? 0 : 1;
    $confirmedBy = $data["confirmedBy"] ?? "System";

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

    $placeholders = [];
    $params = [];
    foreach ($lineIds as $id) {
        $id = (int)$id;
        if ($id > 0) {
            $placeholders[] = "?";
            $params[] = $id;
        }
    }

    if (empty($placeholders)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "No valid lineIds"]);
        exit();
    }

    if ($confirmed === 1) {
        $sql = "UPDATE bank_statement_lines SET confirmed = 1, confirmed_at = NOW(), confirmed_by = ? WHERE id IN (" . implode(",", $placeholders) . ")";
        array_unshift($params, $confirmedBy);
    } else {
        $sql = "UPDATE bank_statement_lines SET confirmed = 0, confirmed_at = NULL, confirmed_by = NULL WHERE id IN (" . implode(",", $placeholders) . ")";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $affected = $stmt->rowCount();

    echo json_encode([
        "success" => true,
        "affected" => $affected
    ]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    exit();
}
