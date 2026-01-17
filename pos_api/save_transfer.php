<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db.php';
require_auth();

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

try {
    // If it's a batch update or single update of status
    // Or creation of new transfer
    
    // Check if ID exists to determine update vs insert
    // But frontend logic for Transfers might separate creation and status update
    // Let's assume the payload contains the full transfer object or a list
    
    // Actually, save_transfer.php usually handles one record.
    // If id exists in DB, update. Else insert.
    
    $id = $data['id'] ?? '';
    if (!$id) {
         throw new Exception("Transfer ID is required");
    }

    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM transfers WHERE id = ?");
    $stmtCheck->execute([$id]);
    $exists = $stmtCheck->fetchColumn() > 0;

    $remark = $data['remark'] ?? null;

    if ($exists) {
        $sql = "UPDATE transfers SET 
                status = ?, 
                product_id = ?, 
                product_name = ?, 
                product_sku = ?, 
                from_branch_id = ?, 
                to_branch_id = ?, 
                quantity = ?, 
                remark = ?
                WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['status'],
            $data['productId'],
            $data['productName'],
            $data['productSku'],
            $data['fromBranchId'],
            $data['toBranchId'],
            $data['quantity'],
            $remark,
            $id
        ]);
    } else {
        $sql = "INSERT INTO transfers (id, product_id, product_name, product_sku, from_branch_id, to_branch_id, quantity, status, remark, created_at, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id,
            $data['productId'],
            $data['productName'],
            $data['productSku'],
            $data['fromBranchId'],
            $data['toBranchId'],
            $data['quantity'],
            $data['status'],
            $remark,
            $data['createdBy'] ?? 'System'
        ]);
    }

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
