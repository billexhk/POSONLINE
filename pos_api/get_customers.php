<?php
// get_customers.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db.php';

require_auth();

try {
    $stmt = $conn->prepare("SELECT * FROM customers");
    $stmt->execute();
    $result = $stmt->get_result();
    $customers = [];

    while ($row = $result->fetch_assoc()) {
        $customers[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'companyName' => $row['companyName'],
            'address' => $row['address'],
            'remark' => $row['remark'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'points' => (int)$row['points'],
            'tier' => $row['tier']
        ];
    }

    echo json_encode($customers);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
