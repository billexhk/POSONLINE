<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/db.php';
require_auth();

try {
    $pdo = getDB();
    // Fetch all purchase orders
    $stmt = $pdo->query("SELECT * FROM purchase_orders ORDER BY created_at DESC");
    $orders = $stmt->fetchAll();

    // For each order, fetch items
    foreach ($orders as &$order) {
        $stmtItems = $pdo->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ?");
        $stmtItems->execute([$order['id']]);
        $items = $stmtItems->fetchAll();
        
        // Map database fields to frontend types
        $order['supplierId'] = $order['supplier_id'];
        $order['supplierName'] = $order['supplier_name'];
        $order['branchId'] = $order['branch_id'];
        $order['totalAmount'] = (float)$order['total_amount'];
        $order['expectedDate'] = $order['expected_date'];
        $order['createdAt'] = $order['created_at'];
        $order['createdBy'] = $order['created_by'];
        
        unset($order['supplier_id']);
        unset($order['supplier_name']);
        unset($order['branch_id']);
        unset($order['total_amount']);
        unset($order['expected_date']);
        unset($order['created_at']);
        unset($order['created_by']);

        $order['items'] = array_map(function($item) {
            return [
                'id' => $item['id'], // keep DB id if needed, or ignore
                'productId' => $item['product_id'],
                'productName' => $item['product_name'],
                'sku' => $item['sku'],
                'quantity' => (int)$item['quantity'],
                'unitCost' => (float)$item['unit_cost'],
                'totalCost' => (float)$item['total_cost']
            ];
        }, $items);
    }

    echo json_encode($orders);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
