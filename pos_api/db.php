<?php
$isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "pos_system";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("PDO Connection failed: " . $e->getMessage());
}

function getDB() {
    global $pdo;
    return $pdo;
}

function require_auth($allowedRoles = null) {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        return;
    }

    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }

    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $headerToken = null;
    foreach ($headers as $key => $value) {
        if (strcasecmp($key, 'X-Auth-Token') === 0) {
            $headerToken = $value;
            break;
        }
    }

    if (!isset($_SESSION['csrf_token']) || !$headerToken || !hash_equals($_SESSION['csrf_token'], $headerToken)) {
        http_response_code(401);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }

    if ($allowedRoles !== null) {
        $userRole = isset($_SESSION['user']['role']) ? $_SESSION['user']['role'] : null;
        $roles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];
        if (!in_array($userRole, $roles, true)) {
            http_response_code(403);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode(['success' => false, 'error' => 'Forbidden']);
            exit();
        }
    }
}
?>
