<?php
// submit_order.php - accepts JSON POST from frontend and appends to orders.json
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_json']);
    exit;
}

$ordersFile = __DIR__ . '/../orders.json';
$orders = [];
if (file_exists($ordersFile)) {
    $json = file_get_contents($ordersFile);
    $orders = json_decode($json, true) ?: [];
}

// compute new id
$maxId = 0;
foreach ($orders as $o) {
    if (isset($o['id']) && is_numeric($o['id']) && $o['id'] > $maxId) $maxId = (int)$o['id'];
}
$newId = $maxId + 1;
$data['id'] = $newId;

// ensure total is a string with dollar sign
if (isset($data['total'])) {
    if (!is_string($data['total'])) {
        $data['total'] = '$' . number_format(floatval($data['total']), 2);
    }
}

$orders[] = $data;
// write back safely using file locking
$fp = fopen($ordersFile, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['error' => 'cannot_open_orders_file']);
    exit;
}
flock($fp, LOCK_EX);
fseek($fp, 0);
ftruncate($fp, 0);
fwrite($fp, json_encode($orders, JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['success' => true, 'id' => $newId]);

?>