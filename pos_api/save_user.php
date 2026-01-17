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
require_auth(['ADMIN','MANAGER']);

$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->id) || 
    !isset($data->username) || 
    !isset($data->name) || 
    !isset($data->role) || 
    !isset($data->branchId)
) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Incomplete data"]);
    exit;
}

try {
    $pdo->beginTransaction();

    $currentRole = isset($_SESSION['user']['role']) ? $_SESSION['user']['role'] : null;

    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$data->id]);
    $existingRole = $stmt->fetchColumn();

    if ($existingRole !== false) {
        if ($currentRole === 'MANAGER' && $existingRole === 'ADMIN') {
            $pdo->rollBack();
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Forbidden"]);
            exit;
        }
        if ($currentRole === 'MANAGER' && isset($data->role) && $data->role === 'ADMIN') {
            $pdo->rollBack();
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Forbidden"]);
            exit;
        }

        $sql = "UPDATE users SET username = ?, name = ?, role = ?, branch_id = ? WHERE id = ?";
        $params = [$data->username, $data->name, $data->role, $data->branchId, $data->id];
        
        if (isset($data->password) && !empty($data->password)) {
            $sql = "UPDATE users SET username = ?, name = ?, role = ?, branch_id = ?, password = ? WHERE id = ?";
            $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);
            $params = [$data->username, $data->name, $data->role, $data->branchId, $hashed_password, $data->id];
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } else {
        if ($currentRole === 'MANAGER' && $data->role === 'ADMIN') {
            $pdo->rollBack();
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Forbidden"]);
            exit;
        }

        if (!isset($data->password) || empty($data->password)) {
             throw new Exception("Password is required for new users");
        }
        
        $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("INSERT INTO users (id, username, password, name, role, branch_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$data->id, $data->username, $hashed_password, $data->name, $data->role, $data->branchId]);
    }

    $pdo->commit();
    echo json_encode(["success" => true]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
