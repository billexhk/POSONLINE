<?php
require_once 'db.php';

try {
    $pdo->beginTransaction();

    // Create branches table
    $sql = "CREATE TABLE IF NOT EXISTS `branches` (
        `id` varchar(50) NOT NULL,
        `name` varchar(100) NOT NULL,
        `code` varchar(20) NOT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    $pdo->exec($sql);

    // Check if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM branches");
    $count = $stmt->fetchColumn();

    if ($count == 0) {
        // Insert default branches from mockData
        $sql = "INSERT INTO branches (id, name, code) VALUES 
        ('b1', '旺角總店 (Mong Kok)', 'MK'),
        ('b2', '深水埗分店 (SSP)', 'SSP'),
        ('b3', '灣仔分店 (Wan Chai)', 'WC')";
        $pdo->exec($sql);
        echo "Branches table created and initialized.";
    } else {
        echo "Branches table already exists and has data.";
    }

    $pdo->commit();

} catch (PDOException $e) {
    $pdo->rollBack();
    echo "Error: " . $e->getMessage();
}
?>
