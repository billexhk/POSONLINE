<?php
// save_supplier.php
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

require_once __DIR__ . '/db.php';
require_auth();

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id']) || !isset($data['name'])) {
        throw new Exception("Missing required fields");
    }

    // Check exist
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM suppliers WHERE id = ?");
    $stmtCheck->execute([$data['id']]);
    $exists = $stmtCheck->fetchColumn() > 0;

    $contactPerson = $data['contactPerson'] ?? '';
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? '';
    $address = $data['address'] ?? '';

    if ($exists) {
        $sql = "UPDATE suppliers SET name=?, contact_person=?, email=?, phone=?, address=? WHERE id=?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$data['name'], $contactPerson, $email, $phone, $address, $data['id']]);
    } else {
        $sql = "INSERT INTO suppliers (id, name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$data['id'], $data['name'], $contactPerson, $email, $phone, $address]);
    }

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
