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

if (isset($data->name)) {
    try {
        $pdo = getDB();
        
        $id = isset($data->id) ? $data->id : 'br' . time();
        $name = trim($data->name);

        // Check if exists (by ID)
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM brands WHERE id = ?");
        $stmtCheck->execute([$id]);
        $exists = $stmtCheck->fetchColumn() > 0;

        if ($exists) {
            $stmt = $pdo->prepare("UPDATE brands SET name = ? WHERE id = ?");
            $stmt->execute([$name, $id]);
            $msg = "Brand updated.";
        } else {
             // Check duplicate name
             $stmtName = $pdo->prepare("SELECT COUNT(*) FROM brands WHERE name = ?");
             $stmtName->execute([$name]);
             if ($stmtName->fetchColumn() > 0) {
                  throw new Exception("Brand '$name' already exists.");
             }

            $stmt = $pdo->prepare("INSERT INTO brands (id, name) VALUES (?, ?)");
            $stmt->execute([$id, $name]);
            $msg = "Brand created.";
        }

        echo json_encode(["success" => true, "message" => $msg]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "error" => "Name is required."]);
}
?>
