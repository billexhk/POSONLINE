<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_auth(['ADMIN','MANAGER','ACCOUNTANT']);

$data = json_decode(file_get_contents("php://input"), true);

$id = $data['id'] ?? null;
$branchId = $data['branchId'] ?? ($data['branch_id'] ?? null);
$category = $data['category'] ?? null;
$amount = isset($data['amount']) ? (float)$data['amount'] : null;
$expenseDate = $data['expenseDate'] ?? ($data['expense_date'] ?? null);
$description = $data['description'] ?? '';
$createdBy = $data['createdBy'] ?? ($data['created_by'] ?? 'System');

if (
    !$id ||
    !$branchId ||
    !$category ||
    $amount === null ||
    !$expenseDate
) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing required fields"]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO expenses (id, branch_id, category, amount, description, expense_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            branch_id = VALUES(branch_id),
            category = VALUES(category),
            amount = VALUES(amount),
            description = VALUES(description),
            expense_date = VALUES(expense_date),
            created_by = VALUES(created_by)
    ");

    $stmt->execute([
        $id,
        $branchId,
        $category,
        $amount,
        $description,
        $expenseDate,
        $createdBy
    ]);

    echo json_encode(["success" => true, "message" => "Expense saved successfully"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
