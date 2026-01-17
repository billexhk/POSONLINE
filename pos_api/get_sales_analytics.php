<?php
// get_sales_analytics.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once 'db.php';
require_auth();

$ids = $_GET['ids'] ?? '';
if (!$ids) { 
    echo json_encode([]); 
    exit; 
}

$idArray = explode(',', $ids);
$placeholders = implode(',', array_fill(0, count($idArray), '?'));

try {
    // Calculate sales volume for these products
    // Only count SALES (orders)
    $sql = "SELECT 
                oi.product_id, 
                SUM(oi.quantity) as salesVolume
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status != 'VOID' AND oi.product_id IN ($placeholders)
            GROUP BY oi.product_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($idArray);
    $results = $stmt->fetchAll(PDO::FETCH_KEY_PAIR); // returns [productId => salesVolume]

    echo json_encode($results);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
