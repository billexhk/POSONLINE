<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once 'db.php';
require_auth();

try {
    // Join customers and suppliers for names? 
    // Or just fetch raw and let frontend map if needed.
    // The table has some redundancy (supplier_name isn't in table, but frontend type has it).
    // The table has `customer_id` and `supplier_id`.
    // Let's fetch and maybe join to get names if they are not stored.
    // Actually, repairs table doesn't store customer name directly, only ID.
    // But `type` can be STOCK (no customer).
    
    $sql = "SELECT r.*, c.name as customer_name, s.name as supplier_name 
            FROM repairs r 
            LEFT JOIN customers c ON r.customer_id = c.id 
            LEFT JOIN suppliers s ON r.supplier_id = s.id 
            ORDER BY r.created_at DESC";
            
    $stmt = $pdo->query($sql);
    $repairs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $mappedRepairs = array_map(function($r) {
        return [
            'id' => $r['id'],
            'type' => $r['type'],
            'branchId' => $r['branch_id'],
            'customerId' => $r['customer_id'],
            // Map customer object if needed by frontend, or just name
            // Frontend type RepairTicket has `customer?: Customer`.
            // We can construct a minimal customer object.
            'customer' => $r['customer_id'] ? [
                'id' => $r['customer_id'],
                'name' => $r['customer_name'] ?? 'Unknown'
            ] : null,
            
            'productId' => $r['product_id'],
            'productName' => $r['product_name'],
            'productSku' => '', // Not in DB, maybe optional
            'serialNumber' => $r['serial_number'] ?? '',
            'problemDescription' => $r['problem_description'],
            'accessories' => $r['accessories'],
            'supplierId' => $r['supplier_id'],
            'supplierName' => $r['supplier_name'],
            'status' => $r['status'],
            'createdAt' => $r['created_at'],
            'sentDate' => $r['sent_date'],
            'returnDate' => $r['return_date'],
            'completedDate' => $r['completed_date'],
            'repairCost' => (float)$r['repair_cost'],
            'repairPrice' => (float)$r['repair_price'],
            'createdBy' => $r['created_by'],
            'notes' => $r['notes']
        ];
    }, $repairs);

    echo json_encode($mappedRepairs);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
