<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once 'db.php';
require_auth();

$productId = $_GET['productId'] ?? null;

if (!$productId) {
    echo json_encode([]);
    exit;
}

try {
    $movements = [];

    // 1. Sales (Orders)
    // Only include orders that are NOT voided
    $sqlSales = "SELECT 
            o.created_at as date, 
            'SALE' as type, 
            o.id as referenceId, 
            oi.source_branch_id as branchId, 
            -oi.quantity as quantity, 
            'System' as performedBy 
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id = ? AND o.status != 'VOID'";
    $stmt = $pdo->prepare($sqlSales);
    $stmt->execute([$productId]);
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($sales) $movements = array_merge($movements, $sales);

    // 2. Stock In
    $sqlStockIn = "SELECT 
            created_at as date, 
            'STOCK_IN' as type, 
            id as referenceId, 
            branch_id as branchId, 
            quantity, 
            performed_by as performedBy 
        FROM stock_in_records 
        WHERE product_id = ? AND status = 'COMPLETED'";
    $stmt = $pdo->prepare($sqlStockIn);
    $stmt->execute([$productId]);
    $stockIns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($stockIns) $movements = array_merge($movements, $stockIns);

    // 3. Transfers (Out) - Deduct from Source
    // Only if not Cancelled
    $sqlTransOut = "SELECT 
            created_at as date, 
            'TRANSFER_OUT' as type, 
            id as referenceId, 
            from_branch_id as branchId, 
            -quantity as quantity, 
            created_by as performedBy 
        FROM transfers 
        WHERE product_id = ? AND status != 'CANCELLED'";
    $stmt = $pdo->prepare($sqlTransOut);
    $stmt->execute([$productId]);
    $transOut = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($transOut) $movements = array_merge($movements, $transOut);

    // 4. Transfers (In) - Add to Destination
    // Only if Completed
    $sqlTransIn = "SELECT 
            created_at as date, 
            'TRANSFER_IN' as type, 
            id as referenceId, 
            to_branch_id as branchId, 
            quantity, 
            created_by as performedBy 
        FROM transfers 
        WHERE product_id = ? AND status = 'COMPLETED'";
    $stmt = $pdo->prepare($sqlTransIn);
    $stmt->execute([$productId]);
    $transIn = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($transIn) $movements = array_merge($movements, $transIn);

    // Sort by date desc
    usort($movements, function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });

    echo json_encode($movements);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
