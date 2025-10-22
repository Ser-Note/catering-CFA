<?php
$csvFile = './catering.txt';
$rows = [];
if (($handle = fopen($csvFile, "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== FALSE) {
        $rows[] = array_map('trim', $data);
    }
    fclose($handle);
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$selected = null;
foreach ($rows as $row) {
    if ($row[0] == $id) {
        $selected = $row;
        break;
    }
}

if (!$selected) die("Invalid ID.");

// Pre-fill variables
$orderDate     = $selected[1];
$orgName       = trim($selected[2],'"');
$numSandwiches = $selected[3];
$otherItems    = trim($selected[4],'"');
$sauces        = trim($selected[5],'"');   // ✅ NEW sauces field
$cost          = $selected[6];
$paid          = $selected[7];
$orderType     = $selected[8];
$timeOfDay     = $selected[9];
$contactName   = trim($selected[10],'"');
$contactPhone  = trim($selected[11],'"');
$pickles       = $selected[12];
$numBags       = $selected[13];
$creator       = $selected[14] ?? '';      // safeguard in case old rows don’t have it
?>
