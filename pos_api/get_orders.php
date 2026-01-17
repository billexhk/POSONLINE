<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';
require_auth();

try {
    $pdo = getDB();

    // Fetch orders with customer details (simple join or just fetch orders)
    // For simplicity, we just fetch orders and their items.
    
    $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100");
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch items for each order
    foreach ($orders as &$order) {
        // 先從 order_items 取出，如有 cost 就用歷史成本；舊資料則 fallback 去 products.cost
        $stmtItems = $pdo->prepare("
            SELECT 
                oi.*, 
                p.cost AS product_cost 
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $stmtItems->execute([$order['id']]);
        $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        // Map DB fields to frontend CartItem-like structure so descriptions show correctly
        $order['items'] = array_map(function($item) {
            $historicalCost = 0.0;
            if (isset($item['cost']) && $item['cost'] !== null) {
                $historicalCost = (float)$item['cost'];
            } elseif (isset($item['product_cost']) && $item['product_cost'] !== null) {
                $historicalCost = (float)$item['product_cost'];
            }

            return [
                'id' => $item['product_id'],
                'sku' => $item['sku'],
                'name' => $item['product_name'],
                'description' => $item['product_name'],
                'price' => isset($item['price']) ? (float)$item['price'] : 0,
                'discount' => isset($item['discount']) ? (float)$item['discount'] : 0,
                'quantity' => isset($item['quantity']) ? (int)$item['quantity'] : 0,
                'sourceBranchId' => $item['source_branch_id'] ?? null,
                'cost' => $historicalCost,
                // Provide empty stock object to avoid runtime errors when editing orders
                'stock' => new stdClass()
            ];
        }, $items);

        // Reconstruct payments array (目前 DB 只有 payment_method + total_amount)
        // total_amount 代表「已付款金額」
        $paidAmount = isset($order['total_amount']) ? (float)$order['total_amount'] : 0;
        $order['payments'] = [
            [
                'method' => $order['payment_method'],
                'amount' => $paidAmount
            ]
        ];

        // Format numeric fields
        $subtotal = isset($order['subtotal']) ? (float)$order['subtotal'] : 0;
        $totalDiscount = isset($order['total_discount']) ? (float)$order['total_discount'] : 0;
        $taxRate = isset($order['tax_rate']) ? (float)$order['tax_rate'] : 0;
        $taxAmount = isset($order['tax_amount']) ? (float)$order['tax_amount'] : 0;
        if ($taxAmount === 0 && $taxRate > 0) {
            $base = $subtotal - $totalDiscount;
            $taxAmount = $base * ($taxRate / 100);
        }
        $total = $subtotal - $totalDiscount + $taxAmount;

        $order['subtotal'] = $subtotal;
        $order['totalDiscount'] = $totalDiscount;
        $order['taxRate'] = $taxRate;
        $order['taxAmount'] = $taxAmount;
        $order['total'] = $total;
        $order['createdAt'] = $order['created_at'];
        $order['branchId'] = $order['branch_id'];
        $order['cashierName'] = $order['cashier_name'];
        $order['businessDate'] = isset($order['business_date']) && $order['business_date'] !== null
            ? $order['business_date']
            : substr($order['created_at'], 0, 10);
        
        // Fetch customer info if exists
        if ($order['customer_id']) {
            $stmtCust = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
            $stmtCust->execute([$order['customer_id']]);
            $customer = $stmtCust->fetch(PDO::FETCH_ASSOC);
            if ($customer) {
                 $order['customer'] = $customer;
            }
        }
    }

    echo json_encode($orders);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
