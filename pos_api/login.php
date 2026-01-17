<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';

try {
    $pdo = getDB();

    $data = json_decode(file_get_contents("php://input"), true);
    if (!is_array($data)) {
        $data = [];
    }
    if (isset($_POST['username'])) {
        $data['username'] = $_POST['username'];
    }
    if (isset($_POST['password'])) {
        $data['password'] = $_POST['password'];
    }
    
    if (!isset($data['username']) || !isset($data['password'])) {
        throw new Exception("Missing credentials");
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$data['username']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($data['password'], $user['password'])) {
        unset($user['password']);
        session_regenerate_id(true);

        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'role' => $user['role'],
            'branch_id' => $user['branch_id']
        ];

        $csrfToken = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $csrfToken;

        echo json_encode([
            'success' => true,
            'user' => $_SESSION['user'],
            'token' => $csrfToken
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
