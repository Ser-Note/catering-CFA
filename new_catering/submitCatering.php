<?php
session_start();
$csvFile = '../previous_catering/catering.txt';

// Collect form data
$date         = $_POST['orderDate'] ?? '';   
$org          = $_POST['organization'] ?? '';
$sandwiches   = intval($_POST['numSandwiches'] ?? 0);
$other        = $_POST['other'] ?? '';
$orderType    = $_POST['orderType'] ?? '';
$timeOfDay    = $_POST['timeOfDay'] ?? '';   
$contactName  = $_POST['contactName'] ?? '';
$contactPhone = $_POST['contactPhone'] ?? '';
$pickles      = $_POST['pickles'] ?? 'no';
$numBags      = $_POST['numBags'] ?? 0;      
$paid         = isset($_POST['paid']) ? 1 : 0;

// ✅ Get sauces (as comma-separated string)
$sauces = '';
if (!empty($_POST['sauces']) && is_array($_POST['sauces'])) {
    $sauces = implode(', ', $_POST['sauces']);
}

// --- Cost calculation ---
// sandwiches are still $5 each
$cost = $sandwiches * 5;

// now parse "item: qty" instead of repeated names
if (!empty($other)) {
    $items = explode(';', $other);
    foreach ($items as $item) {
        $parts = explode(':', $item);
        if (count($parts) === 2) {
            $qty = intval(trim($parts[1]));
            $cost += $qty * 3; // $3 per "other" item
        }
    }
}

// --- Get new ID ---
$rows = [];
if (($handle = fopen($csvFile, "r")) !== FALSE) {
    while (($data = fgetcsv($handle)) !== FALSE) {
        $rows[] = $data;
    }
    fclose($handle);
}
$newId = count($rows) + 1;

// --- Get creator from session ---
$creator = '';
if (isset($_SESSION['firstName'], $_SESSION['lastName'])) {
    $creator = $_SESSION['firstName'] . ' ' . $_SESSION['lastName'];
}

// --- Save row ---
$newRow = [
    $newId,
    $date,
    $org,
    $sandwiches,
    $other,        // keep "item: qty" format
    $sauces,    
    $cost,
    $paid,
    $orderType,
    $timeOfDay,
    $contactName,
    $contactPhone,
    $pickles,
    $numBags,
    $creator
];

$fp = fopen($csvFile, "a");
fputcsv($fp, $newRow);
fclose($fp);

// Redirect back
header("Location: ../options/");
exit;
?>
