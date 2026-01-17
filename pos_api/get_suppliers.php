<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';
require_auth();

try {
    $pdo = getDB();

    $stmt = $pdo->query("SELECT * FROM suppliers ORDER BY name ASC");
    $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // CamelCase mapping if needed, but simple fields match well enough usually
    // DB: contact_person -> Frontend: contactPerson
    $mapped = [];
    foreach($suppliers as $s) {
        $s['contactPerson'] = $s['contact_person'];
        unset($s['contact_person']);
        $mapped[] = $s;
    }

    echo json_encode($mapped);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
