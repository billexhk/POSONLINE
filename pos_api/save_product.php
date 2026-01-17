<?php
// save_product.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';
require_auth();

$host = 'localhost';
$db   = 'pos_system';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['id']) || !isset($data['sku']) || !isset($data['name'])) {
        throw new Exception("Missing required fields (id, sku, name)");
    }

    // Check for duplicate SKU
    $stmtSku = $pdo->prepare("SELECT COUNT(*) FROM products WHERE sku = ? AND id != ?");
    $stmtSku->execute([$data['sku'], $data['id']]);
    if ($stmtSku->fetchColumn() > 0) {
        throw new Exception("SKU '{$data['sku']}' already exists.");
    }

    // 檢查 ID 是否存在
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM products WHERE id = ?");
    $stmtCheck->execute([$data['id']]);
    $exists = $stmtCheck->fetchColumn() > 0;

    // 準備數據 (處理 Boolean 和 JSON)
    $stockJson = json_encode($data['stock'] ?? new stdClass());
    $trackStock = isset($data['trackStock']) ? (int)$data['trackStock'] : 1;
    $cost = isset($data['cost']) ? (float)$data['cost'] : 0;
    $price = isset($data['price']) ? (float)$data['price'] : 0;
    $webPrice = isset($data['webPrice']) ? (float)$data['webPrice'] : 0;
    $srp = isset($data['srp']) ? (float)$data['srp'] : 0;
    $lowStock = isset($data['lowStockThreshold']) ? (int)$data['lowStockThreshold'] : 0;
    $webName = isset($data['webName']) ? $data['webName'] : '';
    $productUrl = isset($data['productUrl']) ? $data['productUrl'] : '';

    if ($exists) {
        // UPDATE
        $sql = "UPDATE products SET 
                sku = ?, name = ?, web_name = ?, product_url = ?, price = ?, web_price = ?, cost = ?, srp = ?, 
                category = ?, brand = ?, description = ?, imageUrl = ?, 
                stock_json = ?, trackStock = ?, lowStockThreshold = ?
                WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['sku'], $data['name'], $webName, $productUrl, $price, $webPrice, $cost, $srp,
            $data['category'] ?? 'General', $data['brand'] ?? 'Generic', $data['description'] ?? '', $data['imageUrl'] ?? '',
            $stockJson, $trackStock, $lowStock,
            $data['id']
        ]);
        $message = "Product updated successfully";
    } else {
        // INSERT
        $sql = "INSERT INTO products 
                (id, sku, name, web_name, product_url, price, web_price, cost, srp, category, brand, description, imageUrl, stock_json, trackStock, lowStockThreshold) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['id'], $data['sku'], $data['name'], $webName, $productUrl, $price, $webPrice, $cost, $srp,
            $data['category'] ?? 'General', $data['brand'] ?? 'Generic', $data['description'] ?? '', $data['imageUrl'] ?? '',
            $stockJson, $trackStock, $lowStock
        ]);
        $message = "Product created successfully";
    }

    echo json_encode(['success' => true, 'message' => $message]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
