<?php
// save_quotation.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'localhost';
$db   = 'pos_system';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id']) || !isset($data['items'])) {
        throw new Exception("Missing required fields");
    }

    $pdo->beginTransaction();

    // Check if exists
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM quotations WHERE id = ?");
    $stmtCheck->execute([$data['id']]);
    $exists = $stmtCheck->fetchColumn() > 0;

    $customerId = $data['customer']['id'] ?? null;
    $customerJson = isset($data['customer']) ? json_encode($data['customer']) : null;
    
    if ($exists) {
        $sql = "UPDATE quotations SET 
                branch_id=?, customer_id=?, customer_json=?, subtotal=?, total_discount=?, total=?, status=?, valid_until=?, created_by=? 
                WHERE id=?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['branchId'], $customerId, $customerJson, 
            $data['subtotal'], $data['totalDiscount'], $data['total'], 
            $data['status'], $data['validUntil'], $data['createdBy'],
            $data['id']
        ]);
        
        // Delete old items
        $pdo->prepare("DELETE FROM quotation_items WHERE quotation_id = ?")->execute([$data['id']]);
    } else {
        $sql = "INSERT INTO quotations 
                (id, branch_id, customer_id, customer_json, subtotal, total_discount, total, status, valid_until, created_at, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['id'], $data['branchId'], $customerId, $customerJson, 
            $data['subtotal'], $data['totalDiscount'], $data['total'], 
            $data['status'], $data['validUntil'], $data['createdAt'], $data['createdBy']
        ]);
    }

    // Insert items
    $stmtItem = $pdo->prepare("INSERT INTO quotation_items (quotation_id, product_id, product_name, sku, quantity, price, discount) VALUES (?, ?, ?, ?, ?, ?, ?)");
    foreach ($data['items'] as $item) {
        $stmtItem->execute([
            $data['id'],
            $item['id'],
            $item['name'],
            $item['sku'],
            $item['quantity'],
            $item['price'],
            $item['discount']
        ]);
    }

    $pdo->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
