<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';
require_auth();

try {
    $branchId = isset($_GET['branch_id']) ? $_GET['branch_id'] : null;
    $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
    $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;

    if (!$branchId || !$startDate || !$endDate) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing required parameters"]);
        exit();
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS daily_settlements (
            id VARCHAR(50) NOT NULL,
            branch_id VARCHAR(50) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total_orders INT NOT NULL DEFAULT 0,
            cash_in_drawer DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total_cogs DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            gross_profit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            net_profit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100) DEFAULT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
            PRIMARY KEY (id),
            UNIQUE KEY uniq_branch_period (branch_id, start_date, end_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $stmt = $pdo->prepare("SELECT * FROM daily_settlements WHERE branch_id = ? AND start_date = ? AND end_date = ? AND status = 'SUBMITTED' LIMIT 1");
    $stmt->execute([$branchId, $startDate, $endDate]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $row['total_revenue'] = (float)$row['total_revenue'];
        $row['cash_in_drawer'] = (float)$row['cash_in_drawer'];
        $row['total_cogs'] = (float)$row['total_cogs'];
        $row['total_expenses'] = (float)$row['total_expenses'];
        $row['gross_profit'] = (float)$row['gross_profit'];
        $row['net_profit'] = (float)$row['net_profit'];
        $row['total_orders'] = (int)$row['total_orders'];
    }

    echo json_encode([
        "success" => true,
        "settlement" => $row ?: null
    ]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    exit();
}
