<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/db.php';
require_auth();

try {
    $pdo = getDB();
    $productId = $_GET['productId'] ?? null;
    $batchId = $_GET['batchId'] ?? null;

    if ($batchId) {
        $stmt = $pdo->prepare("SELECT * FROM stock_in_records WHERE batch_id = ? ORDER BY created_at DESC");
        $stmt->execute([$batchId]);
        $records = $stmt->fetchAll();
    } elseif ($productId) {
        $stmt = $pdo->prepare("SELECT * FROM stock_in_records WHERE product_id = ? ORDER BY created_at DESC");
        $stmt->execute([$productId]);
        $records = $stmt->fetchAll();
    } else {
        $stmt = $pdo->query("SELECT * FROM stock_in_records ORDER BY created_at DESC");
        $records = $stmt->fetchAll();
    }

    $mappedRecords = array_map(function($record) {
        return [
            'id' => $record['id'],
            'batchId' => $record['batch_id'] ?? null,
            'date' => $record['date'],
            'productId' => $record['product_id'],
            'productName' => $record['product_name'],
            'supplierId' => $record['supplier_id'],
            'supplierName' => $record['supplier_name'],
            'supplierDocNo' => $record['supplier_doc_no'] ?? null,
            'quantity' => (int)$record['quantity'],
            'unitCost' => (float)$record['unit_cost'],
            'totalCost' => (float)$record['total_cost'],
            'branchId' => $record['branch_id'],
            'performedBy' => $record['performed_by'],
            'status' => $record['status']
        ];
    }, $records);

    echo json_encode($mappedRecords);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
