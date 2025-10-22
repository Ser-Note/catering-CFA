<?php
$type = $_GET['type'] ?? '';

$csvFile = './catering.txt';

if (($handle = fopen($csvFile, 'r')) !== FALSE) {
    echo "<h2>" . ucfirst($type) . " Catering Orders</h2><ul>";
    while (($data = fgetcsv($handle)) !== FALSE) {
        $data = array_map('trim', $data);
        echo "<li>" . implode(" | ", $data) . "</li>";
    }
    echo "</ul>";
    fclose($handle);
} else {
    echo "Could not open catering.txt";
}
?>