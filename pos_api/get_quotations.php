<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';
require_auth();

try {
    $pdo = getDB();

    $stmt = $pdo->query("SELECT * FROM quotations ORDER BY created_at DESC");
    $quotations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($quotations as &$q) {
        // Restore camelCase
        $q['branchId'] = $q['branch_id'];
        $q['customerId'] = $q['customer_id'];
        $q['totalDiscount'] = (float)$q['total_discount'];
        $q['subtotal'] = (float)$q['subtotal'];
        $q['total'] = (float)$q['total'];
        $q['createdAt'] = $q['created_at'];
        $q['validUntil'] = $q['valid_until'];
        $q['createdBy'] = $q['created_by'];
        
        if ($q['customer_json']) {
            $q['customer'] = json_decode($q['customer_json'], true);
        }
        
        // Fetch items
        $stmtItems = $pdo->prepare("SELECT * FROM quotation_items WHERE quotation_id = ?");
        $stmtItems->execute([$q['id']]);
        $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        
        $q['items'] = array_map(function($item) {
            return [
                'id' => $item['product_id'], // Map product_id back to id for CartItem interface
                'sku' => $item['sku'],
                'name' => $item['product_name'],
                'quantity' => (int)$item['quantity'],
                'price' => (float)$item['price'],
                'discount' => (float)$item['discount']
            ];
        }, $items);
    }

    echo json_encode($quotations);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
