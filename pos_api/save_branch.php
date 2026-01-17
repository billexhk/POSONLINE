<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';
require_auth(['ADMIN']);

$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->id) || 
    !isset($data->name) || 
    !isset($data->code)
) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Incomplete data"]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Check if exists
    $stmt = $pdo->prepare("SELECT id FROM branches WHERE id = ?");
    $stmt->execute([$data->id]);
    $exists = $stmt->fetchColumn();

    if ($exists) {
        // Update
        $stmt = $pdo->prepare("UPDATE branches SET name = ?, code = ? WHERE id = ?");
        $stmt->execute([$data->name, $data->code, $data->id]);
    } else {
        // Insert
        $stmt = $pdo->prepare("INSERT INTO branches (id, name, code) VALUES (?, ?, ?)");
        $stmt->execute([$data->id, $data->name, $data->code]);
    }

    $pdo->commit();
    echo json_encode(["success" => true]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
