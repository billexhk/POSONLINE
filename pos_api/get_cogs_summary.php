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
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
    $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;
    $branchId = isset($_GET['branch_id']) ? $_GET['branch_id'] : null;

    $where = "WHERE source_type = 'SALE'";
    $params = [];

    if (!empty($startDate) && !empty($endDate)) {
        $where .= " AND DATE(created_at) BETWEEN ? AND ?";
        $params[] = $startDate;
        $params[] = $endDate;
    } elseif (!empty($startDate)) {
        $where .= " AND DATE(created_at) >= ?";
        $params[] = $startDate;
    } elseif (!empty($endDate)) {
        $where .= " AND DATE(created_at) <= ?";
        $params[] = $endDate;
    }

    if (!empty($branchId) && $branchId !== 'ALL') {
        $where .= " AND branch_id = ?";
        $params[] = $branchId;
    }

    $sql = "SELECT branch_id, SUM(total_cost) AS total_cogs, SUM(quantity) AS total_qty
            FROM inventory_cogs_log
            {$where}
            GROUP BY branch_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($rows);
    exit();
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'inventory_cogs_log') !== false) {
        echo json_encode([]);
        exit();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit();
}
