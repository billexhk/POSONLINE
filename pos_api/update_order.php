<?php
// update_order.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';
require_auth(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'CASHIER']);

$host = 'localhost';
$db   = 'pos_system';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id'])) {
        throw new Exception("Missing order ID");
    }

    // 準備建立日結表 (如未存在) 及檢查該訂單所屬日期是否已日結
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

    // Ensure orders table has business_date column for accounting day
    try {
        $colCheckBiz = $pdo->query("SHOW COLUMNS FROM orders LIKE 'business_date'");
        if ($colCheckBiz && $colCheckBiz->rowCount() === 0) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN business_date DATE NULL AFTER created_at");
        }
    } catch (Exception $e) {
    }

    $stmtOrder = $pdo->prepare("SELECT branch_id, COALESCE(business_date, DATE(created_at)) AS order_date FROM orders WHERE id = ?");
    $stmtOrder->execute([$data['id']]);
    $orderRow = $stmtOrder->fetch(PDO::FETCH_ASSOC);

    if (!$orderRow) {
        throw new Exception("Order not found");
    }

    $branchId = $orderRow['branch_id'];
    $orderDate = $orderRow['order_date'];

    if ($branchId && $orderDate) {
        $stmtLock = $pdo->prepare("
            SELECT COUNT(*) FROM daily_settlements
            WHERE branch_id = ?
              AND status = 'SUBMITTED'
              AND ? BETWEEN start_date AND end_date
            LIMIT 1
        ");
        $stmtLock->execute([$branchId, $orderDate]);
        if ($stmtLock->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => "此日期 ({$orderDate}) 已完成日結，該日訂單不可再修改。如需修改，請先解鎖該日日結。"
            ]);
            exit();
        }
    }

    if ($branchId && isset($data['businessDate']) && $data['businessDate']) {
        $newBusinessDate = $data['businessDate'];
        $stmtLockNew = $pdo->prepare("
            SELECT COUNT(*) FROM daily_settlements
            WHERE branch_id = ?
              AND status = 'SUBMITTED'
              AND ? BETWEEN start_date AND end_date
            LIMIT 1
        ");
        $stmtLockNew->execute([$branchId, $newBusinessDate]);
        if ($stmtLockNew->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => "新會計日 ({$newBusinessDate}) 已完成日結，不能將訂單移入該期間。如需修改，請先解鎖相關日結。"
            ]);
            exit();
        }
    }

    $pdo->beginTransaction();

    // 1. Update basic fields (Status, Payments usually)
    // Note: We don't support full item editing here to avoid complex stock diffing for now.
    // If items need change, it's better to void and recreate.
    
    if (isset($data['businessDate']) && $data['businessDate']) {
        $stmtBiz = $pdo->prepare("UPDATE orders SET business_date = ? WHERE id = ?");
        $stmtBiz->execute([$data['businessDate'], $data['id']]);
    }

    if (isset($data['status'])) {
        $stmtStatus = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $stmtStatus->execute([$data['status'], $data['id']]);

        // If VOID, restore stock
        if ($data['status'] === 'VOID') {
            // Fetch items to restore
            $stmtItems = $pdo->prepare("SELECT product_id, quantity, source_branch_id FROM order_items WHERE order_id = ?");
            $stmtItems->execute([$data['id']]);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as $item) {
                // Restore stock logic (reverse of save_order)
                $branchKey = $item['source_branch_id'] ?? 'b1';
                $qty = $item['quantity'];

                // Check if product still exists
                $stmtCheck = $pdo->prepare("SELECT stock_json FROM products WHERE id = ?");
                $stmtCheck->execute([$item['product_id']]);
                $prod = $stmtCheck->fetch(PDO::FETCH_ASSOC);

                if ($prod) {
                    $jsonPath = '$."' . $branchKey . '"';
                     $sql = "UPDATE products 
                        SET stock_json = JSON_SET(COALESCE(stock_json, '{}'), :jsonPath, 
                            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(stock_json, :jsonPath2)), 0) + :qty
                        ) 
                        WHERE id = :pid";
                    $stmtStock = $pdo->prepare($sql);
                    $stmtStock->execute([
                        ':jsonPath' => $jsonPath,
                        ':jsonPath2' => $jsonPath,
                        ':qty' => $qty,
                        ':pid' => $item['product_id']
                    ]);
                }
            }
        }
    }

    // Handle Payments Update (e.g. Settle Balance)
    // 目前 orders 表只有一個 total_amount 欄位，我們用它來存「已付款總額」，
    // 而實際訂單總額使用 subtotal 與 total_discount 計算。
    if (isset($data['payments']) && is_array($data['payments']) && count($data['payments']) > 0) {
        $paidAmount = 0;
        $mainMethod = $data['payments'][0]['method'] ?? null;

        foreach ($data['payments'] as $p) {
            if (isset($p['amount'])) {
                $paidAmount += (float)$p['amount'];
            }
        }

        // 更新已付款金額與代表付款方式
        if ($mainMethod !== null) {
            $stmtPay = $pdo->prepare("UPDATE orders SET total_amount = ?, payment_method = ? WHERE id = ?");
            $stmtPay->execute([$paidAmount, $mainMethod, $data['id']]);
        } else {
            $stmtPay = $pdo->prepare("UPDATE orders SET total_amount = ? WHERE id = ?");
            $stmtPay->execute([$paidAmount, $data['id']]);
        }
    }

    $pdo->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
