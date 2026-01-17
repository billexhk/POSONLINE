<?php
require_once __DIR__ . '/db.php';

try {
    // Add columns if they don't exist
    $columnsToAdd = [
        "ADD COLUMN source_type VARCHAR(50) DEFAULT 'SALE'",
        "ADD COLUMN source_id VARCHAR(100)",
        "ADD COLUMN unit_cost DECIMAL(18, 6)",
        "MODIFY COLUMN order_id VARCHAR(64) NULL",
        "MODIFY COLUMN order_item_id BIGINT UNSIGNED NULL"
    ];

    foreach ($columnsToAdd as $alterCmd) {
        try {
            $pdo->exec("ALTER TABLE inventory_cogs_log $alterCmd");
            echo "Executed: $alterCmd <br>";
        } catch (PDOException $e) {
            // Ignore error if column already exists or other non-fatal error
            echo "Info: " . $e->getMessage() . " <br>";
        }
    }

    echo "Table inventory_cogs_log updated successfully.";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
