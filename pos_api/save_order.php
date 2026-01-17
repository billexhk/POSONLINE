<?php
// save_order.php
error_reporting(0);
ini_set('display_errors', '0');
if (function_exists('ob_start')) { ob_start(); }
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

    require_once __DIR__ . '/cogs_engine.php';

    // Detect if products table has stock_json column (for JSON stock updates)
    $hasJsonStock = false;
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM products LIKE 'stock_json'");
        if ($colCheck && $colCheck->rowCount() > 0) {
            $hasJsonStock = true;
        }
    } catch (Exception $e) {
        $hasJsonStock = false;
    }

    // Ensure orders table has business_date column for accounting day
    try {
        $colCheckBiz = $pdo->query("SHOW COLUMNS FROM orders LIKE 'business_date'");
        if ($colCheckBiz && $colCheckBiz->rowCount() === 0) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN business_date DATE NULL AFTER created_at");
        }
    } catch (Exception $e) {
    }

    // 讀取前端傳來的 JSON
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['id']) || !isset($data['items'])) {
        throw new Exception("Missing order data");
    }

    // 準備建立日結表 (如未存在) 及檢查是否已日結
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS daily_settlements (
            id VARCHAR(50) NOT NULL,
            branch_id VARCHAR(50) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total_orders INT NOT NULL DEFAULT 0,
            cash_in_drawer DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total_cogs DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            gross_profit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            net_profit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100) DEFAULT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
            PRIMARY KEY (id),
            UNIQUE KEY uniq_branch_period (branch_id, start_date, end_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $branchId = $data['branchId'] ?? null;
    $createdAt = isset($data['createdAt']) ? date('Y-m-d H:i:s', strtotime($data['createdAt'])) : date('Y-m-d H:i:s');
    $invoiceDate = substr($createdAt, 0, 10);

    // Determine business_date for accounting (day after last submitted settlement, otherwise invoice date)
    $businessDate = $invoiceDate;
    if ($branchId) {
        try {
            $stmtLast = $pdo->prepare("
                SELECT end_date 
                FROM daily_settlements 
                WHERE branch_id = ? AND status = 'SUBMITTED' 
                ORDER BY end_date DESC 
                LIMIT 1
            ");
            $stmtLast->execute([$branchId]);
            $last = $stmtLast->fetch(PDO::FETCH_ASSOC);
            if ($last && !empty($last['end_date'])) {
                $businessDate = date('Y-m-d', strtotime($last['end_date'] . ' +1 day'));
            }
        } catch (Exception $e) {
            $businessDate = $invoiceDate;
        }
    }

    if ($branchId && $businessDate) {
        $stmtLock = $pdo->prepare("
            SELECT COUNT(*) FROM daily_settlements
            WHERE branch_id = ?
              AND status = 'SUBMITTED'
              AND ? BETWEEN start_date AND end_date
            LIMIT 1
        ");
        $stmtLock->execute([$branchId, $businessDate]);
        if ($stmtLock->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => "此會計日期已完成日結，不能在 {$businessDate} 開新訂單。如需更改，請先解鎖該日日結。"
            ]);
            exit();
        }
    }

    // 確保 orders 資料表有稅務欄位
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM orders LIKE 'tax_rate'");
        if ($colCheck->rowCount() === 0) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER total_discount");
        }
    } catch (Exception $e) {
    }

    try {
        $colCheck2 = $pdo->query("SHOW COLUMNS FROM orders LIKE 'tax_amount'");
        if ($colCheck2->rowCount() === 0) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_amount");
        }
    } catch (Exception $e) {
    }

    // 開始交易 (Transaction)
    $pdo->beginTransaction();

    // 1. 檢查訂單編號是否重覆，如重覆則直接回傳錯誤讓前端提示
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE id = ?");
    $checkStmt->execute([$data['id']]);
    if ($checkStmt->fetchColumn() > 0) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(409); // Conflict
        echo json_encode(['success' => false, 'error' => "Order ID {$data['id']} already exists. Please regenerate a new ID."]);
        exit();
    }

    // 2. 插入訂單主表
    $stmtOrder = $pdo->prepare("INSERT INTO orders (id, branch_id, customer_id, subtotal, total_discount, tax_rate, tax_amount, total_amount, payment_method, status, cashier_name, created_at, business_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    // 取得第一筆付款方式作為代表 (簡化)
    $mainPayment = isset($data['payments'][0]['method']) ? $data['payments'][0]['method'] : 'Cash';

    // 訂單金額: 使用前端提供的 subtotal/totalDiscount/total/tax，若缺失則回退計算
    $subtotal = isset($data['subtotal']) ? (float)$data['subtotal'] : 0;
    $totalDiscount = isset($data['totalDiscount']) ? (float)$data['totalDiscount'] : 0;
    $taxRate = isset($data['taxRate']) ? (float)$data['taxRate'] : 0;
    $taxAmount = isset($data['taxAmount']) ? (float)$data['taxAmount'] : 0;
    $baseAmount = $subtotal - $totalDiscount;
    if ($taxAmount === 0 && $taxRate > 0 && $baseAmount !== 0) {
        $taxAmount = $baseAmount * ($taxRate / 100);
    }
    $orderTotal = isset($data['total']) ? (float)$data['total'] : ($baseAmount + $taxAmount);

    // 已付款金額: 將 payments 陣列中的金額加總 (用於訂金/部分付款)
    $paidAmount = 0;
    if (isset($data['payments']) && is_array($data['payments'])) {
        foreach ($data['payments'] as $p) {
            if (isset($p['amount'])) {
                $paidAmount += (float)$p['amount'];
            }
        }
    } else {
        // 沒有付款紀錄時，視為已付全數
        $paidAmount = $orderTotal;
    }
    
    $stmtOrder->execute([
        $data['id'],
        $data['branchId'],
        $data['customer']['id'] ?? null,
        $subtotal,
        $totalDiscount,
        $taxRate,
        $taxAmount,
        $paidAmount,
        $mainPayment,
        $data['status'],
        $data['cashierName'],
        $createdAt,
        $businessDate
    ]);

    // 3. 處理每一個商品
    // 確保 order_items 有 cost 欄位，用於保存當時的歷史成本
    try {
        $colCheckItemCost = $pdo->query("SHOW COLUMNS FROM order_items LIKE 'cost'");
        if ($colCheckItemCost->rowCount() === 0) {
            $pdo->exec("ALTER TABLE order_items ADD COLUMN cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER source_branch_id");
        }
    } catch (Exception $e) {
        // 如果檢查失敗，繼續處理，不中斷交易
    }

    $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, price, discount, source_branch_id, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    // 準備更新庫存的 SQL (針對 JSON 欄位更新比較複雜，這裡示範更新 JSON 裡的特定 Key)
    // 注意：MySQL 5.7+ 支援 JSON_SET。如果您的 MySQL 版本舊，邏輯會不同。
    // 這裡我們假設 stock_json 格式為 {"b1": 10, "b2": 5}
    
    foreach ($data['items'] as $item) {
        $itemCost = isset($item['cost']) ? (float)$item['cost'] : 0;

        $stmtItem->execute([
            $data['id'],
            $item['id'],
            $item['name'],
            $item['sku'],
            $item['quantity'],
            $item['price'],
            $item['discount'],
            $item['sourceBranchId'] ?? null,
            $itemCost
        ]);

        $branchKey = !empty($item['sourceBranchId']) ? $item['sourceBranchId'] : ($data['branchId'] ?? 'HEAD_OFFICE');
        $qtySold = (int)$item['quantity'];
        $prodId = $item['id'];

        if (!empty($item['trackStock']) && $hasJsonStock) {
            $jsonPath = '$."' . $branchKey . '"';

            $sql = "UPDATE products 
                    SET stock_json = JSON_SET(
                        COALESCE(stock_json, '{}'),
                        :jsonPath,
                        COALESCE(
                            CAST(JSON_UNQUOTE(JSON_EXTRACT(stock_json, :jsonPath2)) AS DECIMAL(18,2)),
                            0
                        ) - :qty
                    )
                    WHERE id = :pid";
            $stmtStock = $pdo->prepare($sql);
            $stmtStock->bindParam(':jsonPath', $jsonPath);
            $stmtStock->bindParam(':jsonPath2', $jsonPath);
            $stmtStock->bindParam(':qty', $qtySold, PDO::PARAM_INT);
            $stmtStock->bindParam(':pid', $prodId, PDO::PARAM_STR);
            $stmtStock->execute();
        }

        if (!empty($item['trackStock']) && $qtySold > 0) {
            $cogsCost = cogs_consume_layers($pdo, $prodId, $branchKey, $qtySold);
            cogs_log($pdo, $prodId, $branchKey, $qtySold, $cogsCost, 'SALE', $data['id']);
        }
    }

    // 提交交易
    $pdo->commit();

    if (function_exists('ob_get_length') && ob_get_length()) { ob_clean(); }
    echo json_encode(['success' => true, 'message' => 'Order saved and stock updated']);
    exit();

} catch (Exception $e) {
    // 發生錯誤，回滾所有操作
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    if (function_exists('ob_get_length') && ob_get_length()) { ob_clean(); }
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit();
}
?>
