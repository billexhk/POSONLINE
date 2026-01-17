<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db.php';
require_auth(['ADMIN']);

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON or missing ID']);
    exit;
}

try {
    $id = $data['id'];

    // Optional: Check if branch is in use (e.g. has orders, users)
    // For simplicity, we just delete. Database constraints might fail if foreign keys exist.
    // Ideally we should soft delete (status = 'INACTIVE') but user asked for delete.
    
    $stmt = $pdo->prepare("DELETE FROM branches WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        // If no row deleted, maybe ID not found
        echo json_encode(['success' => false, 'error' => 'Branch not found']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
