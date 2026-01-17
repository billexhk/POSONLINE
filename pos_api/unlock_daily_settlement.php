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
    $role = $data['role'] ?? null;

    if (!$branchId || !$startDate || !$endDate || !$role) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        exit();
    }

    if ($role !== 'MANAGER' && $role !== 'ADMIN') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Permission denied"]);
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

    $stmt = $pdo->prepare("SELECT * FROM daily_settlements WHERE branch_id = ? AND start_date = ? AND end_date = ? LIMIT 1");
    $stmt->execute([$branchId, $startDate, $endDate]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["success" => false, "code" => "NOT_FOUND", "error" => "Settlement not found"]);
        exit();
    }

    if ($row['status'] !== 'SUBMITTED') {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(["success" => false, "code" => "NOT_LOCKED", "error" => "Settlement is not locked"]);
        exit();
    }

    $stmtUpdate = $pdo->prepare("UPDATE daily_settlements SET status = 'UNLOCKED' WHERE id = ?");
    $stmtUpdate->execute([$row['id']]);

    $stmtGet = $pdo->prepare("SELECT * FROM daily_settlements WHERE id = ? LIMIT 1");
    $stmtGet->execute([$row['id']]);
    $updated = $stmtGet->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();

    if ($updated) {
        $updated['total_revenue'] = (float)$updated['total_revenue'];
        $updated['cash_in_drawer'] = (float)$updated['cash_in_drawer'];
        $updated['total_cogs'] = (float)$updated['total_cogs'];
        $updated['total_expenses'] = (float)$updated['total_expenses'];
        $updated['gross_profit'] = (float)$updated['gross_profit'];
        $updated['net_profit'] = (float)$updated['net_profit'];
        $updated['total_orders'] = (int)$updated['total_orders'];
    }

    echo json_encode([
        "success" => true,
        "settlement" => $updated
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
