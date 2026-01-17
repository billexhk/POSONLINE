<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';
    require_auth();

    $pdo = getDB();

    $stmt = $pdo->query("SELECT * FROM products");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 格式化數據以符合 Frontend 的 TypeScript Interface
    $formatted = array_map(function($p) {
        return [
            'id' => $p['id'],
            'sku' => $p['sku'],
            'barcode' => $p['sku'], // 暫用 SKU
            'name' => $p['name'],
            'webName' => $p['web_name'] ?? '',
            'productUrl' => $p['product_url'] ?? '',
            'price' => (float)$p['price'],
            'webPrice' => isset($p['web_price']) ? (float)$p['web_price'] : 0,
            'cost' => (float)$p['cost'],
            'srp' => (float)$p['srp'],
            'category' => $p['category'],
            'brand' => $p['brand'],
            'description' => $p['description'] ?? '',
            'imageUrl' => $p['imageUrl'] ?? '',
            // 將 JSON 字串轉回 Object
            'stock' => json_decode($p['stock_json'] ?? '{}', true),
            'trackStock' => (bool)$p['trackStock'],
            'lowStockThreshold' => (int)$p['lowStockThreshold']
        ];
    }, $products);

    echo json_encode($formatted);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
