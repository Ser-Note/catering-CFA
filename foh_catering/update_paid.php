<?php

if (!isset($_POST['id']) || !isset($_POST['paid'])) {
    http_response_code(400);
    echo "Missing parameters";
    exit;
}

$id = $_POST['id'];
$paid = $_POST['paid'] === 'Paid' ? 1 : 0;
$csvFile = '../previous_catering/catering.txt';

// Read CSV
$rows = [];
if (($handle = fopen($csvFile, "r")) !== FALSE) {
    while (($data = fgetcsv($handle)) !== FALSE) {
        if ($data[0] == $id) {
            $data[7] = $paid; // update index 7 for Paid/Not Paid
        }
        $rows[] = $data;
    }
    fclose($handle);
}

// Write CSV back
if (($handle = fopen($csvFile, "w")) !== FALSE) {
    foreach ($rows as $row) {
        fputcsv($handle, $row);
    }
    fclose($handle);
}

echo "Success";
?>