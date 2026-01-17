<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once 'db.php';
require_auth();

try {
    $stmt = $pdo->query("SELECT * FROM transfers ORDER BY created_at DESC");
    $transfers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Map to frontend types if necessary (snake_case to camelCase)
    $mappedTransfers = array_map(function($t) {
        return [
            'id' => $t['id'],
            'productId' => $t['product_id'],
            'productName' => $t['product_name'],
            'productSku' => $t['product_sku'],
            'fromBranchId' => $t['from_branch_id'],
            'toBranchId' => $t['to_branch_id'],
            'quantity' => (int)$t['quantity'],
            'remark' => $t['remark'] ?? null,
            'status' => $t['status'],
            'createdAt' => $t['created_at'],
            'createdBy' => $t['created_by']
        ];
    }, $transfers);

    echo json_encode($mappedTransfers);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
