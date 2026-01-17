<?php
// save_customer.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_auth();

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['id']) || !isset($data['name'])) {
        throw new Exception("Missing required fields (id, name)");
    }

    // Check if exists
    $stmtCheck = $conn->prepare("SELECT id FROM customers WHERE id = ?");
    $stmtCheck->bind_param("s", $data['id']);
    $stmtCheck->execute();
    $result = $stmtCheck->get_result();
    $exists = $result->num_rows > 0;
    $stmtCheck->close();

    $points = isset($data['points']) ? (int)$data['points'] : 0;
    
    // Prepare nullable fields
    $companyName = $data['companyName'] ?? null;
    $address = $data['address'] ?? null;
    $remark = $data['remark'] ?? null;
    $phone = $data['phone'] ?? null;
    $email = $data['email'] ?? null;
    $tier = $data['tier'] ?? 'General';

    if ($exists) {
        // UPDATE
        $sql = "UPDATE customers SET 
                name = ?, companyName = ?, address = ?, remark = ?, 
                phone = ?, email = ?, points = ?, tier = ?
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssssssiss", 
            $data['name'], $companyName, $address, $remark, 
            $phone, $email, $points, $tier, 
            $data['id']
        );
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Customer updated successfully']);
        } else {
            throw new Exception("Update failed: " . $stmt->error);
        }
    } else {
        // INSERT
        $sql = "INSERT INTO customers 
                (id, name, companyName, address, remark, phone, email, points, tier) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssssssiss", 
            $data['id'], $data['name'], $companyName, $address, $remark, 
            $phone, $email, $points, $tier
        );

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Customer created successfully']);
        } else {
            throw new Exception("Insert failed: " . $stmt->error);
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
