<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db.php';
require_auth();

try {
    $stmt = $pdo->query("SELECT id, name, code FROM branches");
    $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($branches);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
