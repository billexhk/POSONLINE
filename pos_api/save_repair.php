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
    $id = $data['id'] ?? '';
    if (!$id) {
         throw new Exception("Repair ID is required");
    }

    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM repairs WHERE id = ?");
    $stmtCheck->execute([$id]);
    $exists = $stmtCheck->fetchColumn() > 0;

    // Helper to format dates or null
    $formatDate = function($dateStr) {
        return !empty($dateStr) ? $dateStr : null;
    };

    if ($exists) {
        $sql = "UPDATE repairs SET 
                type = ?, branch_id = ?, customer_id = ?, product_id = ?, 
                product_name = ?, serial_number = ?, problem_description = ?, 
                accessories = ?, supplier_id = ?, status = ?, 
                sent_date = ?, return_date = ?, completed_date = ?, 
                repair_cost = ?, repair_price = ?, notes = ?
                WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['type'],
            $data['branchId'],
            $data['customer']['id'] ?? $data['customerId'] ?? null,
            $data['productId'] ?? null,
            $data['productName'],
            $data['serialNumber'] ?? '',
            $data['problemDescription'] ?? '',
            $data['accessories'] ?? '',
            $data['supplierId'] ?? null,
            $data['status'],
            $formatDate($data['sentDate'] ?? null),
            $formatDate($data['returnDate'] ?? null),
            $formatDate($data['completedDate'] ?? null),
            $data['repairCost'] ?? 0,
            $data['repairPrice'] ?? 0,
            $data['notes'] ?? '',
            $id
        ]);
    } else {
        $sql = "INSERT INTO repairs (
            id, type, branch_id, customer_id, product_id, product_name, 
            serial_number, problem_description, accessories, supplier_id, 
            status, created_at, created_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id,
            $data['type'],
            $data['branchId'],
            $data['customer']['id'] ?? $data['customerId'] ?? null,
            $data['productId'] ?? null,
            $data['productName'],
            $data['serialNumber'] ?? '',
            $data['problemDescription'] ?? '',
            $data['accessories'] ?? '',
            $data['supplierId'] ?? null,
            $data['status'],
            $data['createdBy'] ?? 'System',
            $data['notes'] ?? ''
        ]);
    }

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
