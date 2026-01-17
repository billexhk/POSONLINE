<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

require_auth();

$data = json_decode(file_get_contents("php://input"));

if (isset($data->id)) {
    try {
        $pdo = getDB();

        // Check if product is used in order_items (optional safety check)
        // If you want to strictly prevent delete, uncomment below:
        /*
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM order_items WHERE product_id = ?");
        $stmtCheck->execute([$data->id]);
        if ($stmtCheck->fetchColumn() > 0) {
             throw new Exception("Cannot delete product: It has been used in orders.");
        }
        */

        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        if ($stmt->execute([$data->id])) {
            echo json_encode(["success" => true, "message" => "Product deleted."]);
        } else {
            echo json_encode(["success" => false, "error" => "Delete failed."]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "error" => "No ID provided."]);
}
?>
