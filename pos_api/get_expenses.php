<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';
require_auth();

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sqlCreate = "CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(50) PRIMARY KEY,
        branch_id VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        expense_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $pdo->exec($sqlCreate);

    $branch_id = $_GET['branch_id'] ?? 'ALL';
    $start_date = $_GET['start_date'] ?? null;
    $end_date = $_GET['end_date'] ?? null;

    $sql = "SELECT * FROM expenses WHERE 1=1";
    $params = [];

    if ($branch_id !== 'ALL') {
        $sql .= " AND branch_id = ?";
        $params[] = $branch_id;
    }

    if ($start_date && $end_date) {
        $sql .= " AND expense_date BETWEEN ? AND ?";
        $params[] = $start_date;
        $params[] = $end_date;
    }

    $sql .= " ORDER BY expense_date DESC, created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $mapped = [];
    foreach ($rows as $exp) {
        $mapped[] = [
            'id' => $exp['id'],
            'branchId' => $exp['branch_id'],
            'category' => $exp['category'],
            'amount' => isset($exp['amount']) ? (float)$exp['amount'] : 0.0,
            'description' => $exp['description'],
            'expenseDate' => $exp['expense_date'],
            'createdAt' => $exp['created_at'],
            'createdBy' => $exp['created_by'],
        ];
    }

    echo json_encode($mapped);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
