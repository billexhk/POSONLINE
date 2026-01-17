<?php

function cogs_get_method(): string {
    return 'FIFO';
}

function cogs_add_layer(PDO $pdo, string $productId, string $branchId, float $qty, float $unitCost, string $sourceType, string $sourceId): void {
    if ($qty <= 0 || $unitCost < 0) {
        return;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO inventory_cost_layers (product_id, branch_id, total_qty, remaining_qty, unit_cost, source_type, source_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $stmt->execute([
        $productId,
        $branchId,
        $qty,
        $qty,
        $unitCost,
        $sourceType,
        $sourceId
    ]);
}

function cogs_consume_layers(PDO $pdo, string $productId, string $branchId, float $qtyNeeded): float {
    if ($qtyNeeded <= 0) {
        return 0.0;
    }

    $method = cogs_get_method();
    $orderBy = $method === 'LIFO'
        ? "created_at DESC, id DESC"
        : "created_at ASC, id ASC";

    $stmt = $pdo->prepare(
        "SELECT id, remaining_qty, unit_cost
         FROM inventory_cost_layers
         WHERE product_id = ? AND branch_id = ? AND remaining_qty > 0
         ORDER BY {$orderBy}
         FOR UPDATE"
    );
    $stmt->execute([$productId, $branchId]);
    $layers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $remaining = $qtyNeeded;
    $totalCost = 0.0;

    foreach ($layers as $layer) {
        if ($remaining <= 0) {
            break;
        }

        $layerQty = (float)$layer['remaining_qty'];
        if ($layerQty <= 0) {
            continue;
        }

        $take = min($remaining, $layerQty);
        $cost = $take * (float)$layer['unit_cost'];
        $totalCost += $cost;
        $remaining -= $take;

        $newRemaining = $layerQty - $take;
        $upd = $pdo->prepare("UPDATE inventory_cost_layers SET remaining_qty = ? WHERE id = ?");
        $upd->execute([$newRemaining, $layer['id']]);
    }

    return $totalCost;
}

function cogs_log(PDO $pdo, string $productId, string $branchId, float $qty, float $totalCost, string $sourceType, string $sourceId): void {
    if ($qty == 0) {
        return;
    }

    $unitCost = $qty != 0 ? $totalCost / $qty : 0.0;

    $stmt = $pdo->prepare(
        "INSERT INTO inventory_cogs_log (product_id, branch_id, quantity, total_cost, unit_cost, source_type, source_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $stmt->execute([
        $productId,
        $branchId,
        $qty,
        $totalCost,
        $unitCost,
        $sourceType,
        $sourceId
    ]);
}

