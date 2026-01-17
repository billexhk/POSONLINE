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

require_once __DIR__ . '/cogs_engine.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Check if record exists
    $stmt = $pdo->prepare("SELECT * FROM stock_in_records WHERE id = ?");
    $stmt->execute([$data['id']]);
    $existingRecord = $stmt->fetch();

    $productId = $data['productId'];
    $branchId = $data['branchId'];
    $quantity = (int)$data['quantity'];
    $status = $data['status'] ?? 'COMPLETED';
    $supplierDocNo = $data['supplierDocNo'] ?? null;
    $batchId = $data['batchId'] ?? null;
    
    $stockChange = 0;

    if ($existingRecord) {
        $oldStatus = $existingRecord['status'];
        if ($oldStatus === 'COMPLETED' && $status === 'VOID') {
            $stockChange = -$quantity;
        } elseif ($oldStatus === 'VOID' && $status === 'COMPLETED') {
            $stockChange = $quantity;

            $unitCost = isset($existingRecord['unit_cost']) ? (float)$existingRecord['unit_cost'] : 0.0;
            if ($quantity > 0 && $unitCost >= 0) {
                cogs_add_layer($pdo, $productId, $branchId, $quantity, $unitCost, 'STOCK_IN', $data['id']);
            }
        }

        $stmtUpdate = $pdo->prepare("UPDATE stock_in_records SET status = ?, supplier_doc_no = ? WHERE id = ?");
        $stmtUpdate->execute([$status, $supplierDocNo, $data['id']]);
    } else {
        if ($status === 'COMPLETED') {
            $stockChange = $quantity;
        }

        $stmtInsert = $pdo->prepare("INSERT INTO stock_in_records 
            (id, batch_id, date, product_id, product_name, supplier_id, supplier_name, supplier_doc_no, quantity, unit_cost, total_cost, branch_id, performed_by, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmtInsert->execute([
            $data['id'],
            $batchId,
            $data['date'],
            $productId,
            $data['productName'],
            $data['supplierId'],
            $data['supplierName'],
            $supplierDocNo,
            $quantity,
            $data['unitCost'],
            $data['totalCost'],
            $branchId,
            $data['performedBy'],
            $status,
            date('Y-m-d H:i:s')
        ]);

        if ($status === 'COMPLETED') {
            $unitCost = isset($data['unitCost']) ? (float)$data['unitCost'] : 0.0;
            if ($quantity > 0 && $unitCost >= 0) {
                cogs_add_layer($pdo, $productId, $branchId, $quantity, $unitCost, 'STOCK_IN', $data['id']);
            }
        }
    }

    // Update Product Stock if needed
    if ($stockChange != 0) {
        $stmtProduct = $pdo->prepare("SELECT stock_json FROM products WHERE id = ? FOR UPDATE");
        $stmtProduct->execute([$productId]);
        $product = $stmtProduct->fetch();

        if ($product) {
            $stockData = json_decode($product['stock_json'] ?? '{}', true);
            if (!is_array($stockData)) $stockData = [];

            $currentStock = isset($stockData[$branchId]) ? (int)$stockData[$branchId] : 0;
            $newStock = $currentStock + $stockChange;
            $stockData[$branchId] = $newStock;

            $newStockJson = json_encode($stockData);

            $stmtUpdateProduct = $pdo->prepare("UPDATE products SET stock_json = ? WHERE id = ?");
            $stmtUpdateProduct->execute([$newStockJson, $productId]);
        }
    }

    $pdo->commit();
    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['error' => $e->getMessage()]);
}
?>
