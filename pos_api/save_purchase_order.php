<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$host = 'localhost';
$db   = 'pos_system';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Check if PO exists
    $stmt = $pdo->prepare("SELECT id FROM purchase_orders WHERE id = ?");
    $stmt->execute([$data['id']]);
    $exists = $stmt->fetch();

    $supplierId = $data['supplierId'] ?? '';
    $supplierName = $data['supplierName'] ?? '';
    $branchId = $data['branchId'] ?? '';
    $status = $data['status'] ?? 'DRAFT';
    $expectedDate = isset($data['expectedDate']) && $data['expectedDate'] !== '' ? $data['expectedDate'] : null;
    $totalAmount = $data['totalAmount'] ?? 0;
    $createdAt = $data['createdAt'] ?? date('Y-m-d H:i:s');
    $createdBy = $data['createdBy'] ?? 'System';

    if ($exists) {
        // Update
        $stmtUpdate = $pdo->prepare("UPDATE purchase_orders SET 
            supplier_id = ?, 
            supplier_name = ?, 
            branch_id = ?, 
            status = ?, 
            expected_date = ?, 
            total_amount = ?
            WHERE id = ?");
        $stmtUpdate->execute([
            $supplierId, $supplierName, $branchId, $status, $expectedDate, $totalAmount, $data['id']
        ]);

        // Delete existing items
        $stmtDeleteItems = $pdo->prepare("DELETE FROM purchase_order_items WHERE purchase_order_id = ?");
        $stmtDeleteItems->execute([$data['id']]);

    } else {
        // Insert
        $stmtInsert = $pdo->prepare("INSERT INTO purchase_orders 
            (id, supplier_id, supplier_name, branch_id, status, expected_date, total_amount, created_at, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtInsert->execute([
            $data['id'], $supplierId, $supplierName, $branchId, $status, $expectedDate, $totalAmount, $createdAt, $createdBy
        ]);
    }

    // Insert items
    if (isset($data['items']) && is_array($data['items'])) {
        $stmtItem = $pdo->prepare("INSERT INTO purchase_order_items 
            (purchase_order_id, product_id, product_name, sku, quantity, unit_cost, total_cost) 
            VALUES (?, ?, ?, ?, ?, ?, ?)");

        foreach ($data['items'] as $item) {
            $stmtItem->execute([
                $data['id'],
                $item['productId'],
                $item['productName'],
                $item['sku'],
                $item['quantity'],
                $item['unitCost'],
                $item['totalCost']
            ]);
        }
    }

    $pdo->commit();
    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['error' => $e->getMessage()]);
}
?>
