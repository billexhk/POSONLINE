<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';
require_auth(['ADMIN','MANAGER','ACCOUNTANT']);

try {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid JSON payload"]);
        exit();
    }

    $branchId = $data['branch_id'] ?? null;
    $startDate = $data['start_date'] ?? null;
    $endDate = $data['end_date'] ?? null;

    if (!$branchId || !$startDate || !$endDate) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
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

    $pdo->beginTransaction();

    $totalRevenue = isset($data['total_revenue']) ? (float)$data['total_revenue'] : 0.0;
    $totalOrders = isset($data['total_orders']) ? (int)$data['total_orders'] : 0;
    $cashInDrawer = isset($data['cash_in_drawer']) ? (float)$data['cash_in_drawer'] : 0.0;
    $totalCogs = isset($data['total_cogs']) ? (float)$data['total_cogs'] : 0.0;
    $totalExpenses = isset($data['total_expenses']) ? (float)$data['total_expenses'] : 0.0;
    $grossProfit = isset($data['gross_profit']) ? (float)$data['gross_profit'] : ($totalRevenue - $totalCogs);
    $netProfit = isset($data['net_profit']) ? (float)$data['net_profit'] : ($grossProfit - $totalExpenses);
    $createdBy = $data['created_by'] ?? 'System';

    $stmtCheck = $pdo->prepare("SELECT * FROM daily_settlements WHERE branch_id = ? AND start_date = ? AND end_date = ? LIMIT 1");
    $stmtCheck->execute([$branchId, $startDate, $endDate]);
    $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if ($existing && $existing['status'] === 'SUBMITTED') {
        $pdo->rollBack();
        http_response_code(409);
        $existing['total_revenue'] = (float)$existing['total_revenue'];
        $existing['cash_in_drawer'] = (float)$existing['cash_in_drawer'];
        $existing['total_cogs'] = (float)$existing['total_cogs'];
        $existing['total_expenses'] = (float)$existing['total_expenses'];
        $existing['gross_profit'] = (float)$existing['gross_profit'];
        $existing['net_profit'] = (float)$existing['net_profit'];
        $existing['total_orders'] = (int)$existing['total_orders'];

        echo json_encode([
            "success" => false,
            "code" => "ALREADY_SUBMITTED",
            "settlement" => $existing
        ]);
        exit();
    }

    if ($existing && $existing['status'] !== 'SUBMITTED') {
        $id = $existing['id'];
        $stmtUpdate = $pdo->prepare("
            UPDATE daily_settlements
            SET
                total_revenue = ?,
                total_orders = ?,
                cash_in_drawer = ?,
                total_cogs = ?,
                total_expenses = ?,
                gross_profit = ?,
                net_profit = ?,
                created_by = ?,
                status = 'SUBMITTED',
                created_at = NOW()
            WHERE id = ?
        ");
        $stmtUpdate->execute([
            $totalRevenue,
            $totalOrders,
            $cashInDrawer,
            $totalCogs,
            $totalExpenses,
            $grossProfit,
            $netProfit,
            $createdBy,
            $id
        ]);
    } else {
        $id = $data['id'] ?? ('SET-' . uniqid());

        $stmtInsert = $pdo->prepare("
            INSERT INTO daily_settlements (
                id,
                branch_id,
                start_date,
                end_date,
                total_revenue,
                total_orders,
                cash_in_drawer,
                total_cogs,
                total_expenses,
                gross_profit,
                net_profit,
                created_by,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmtInsert->execute([
            $id,
            $branchId,
            $startDate,
            $endDate,
            $totalRevenue,
            $totalOrders,
            $cashInDrawer,
            $totalCogs,
            $totalExpenses,
            $grossProfit,
            $netProfit,
            $createdBy,
            'SUBMITTED'
        ]);
    }

    $stmtGet = $pdo->prepare("SELECT * FROM daily_settlements WHERE id = ? LIMIT 1");
    $stmtGet->execute([$id]);
    $row = $stmtGet->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();

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
        "settlement" => $row
    ]);
    exit();
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    exit();
}
