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
require_auth(['ADMIN', 'MANAGER']);

$data = json_decode(file_get_contents("php://input"));

if (isset($data->id)) {
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        if ($stmt->execute([$data->id])) {
            echo json_encode(["success" => true, "message" => "Category deleted."]);
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
