<?php
session_start();

// Get POST values
$firstName = trim($_POST['firstName'] ?? '');
$lastName  = trim($_POST['lastName'] ?? '');

// CSV file path for employees
$csvFile = './employee.txt';
$found = false;

// Open CSV and check each row
if (($handle = fopen($csvFile, 'r')) !== FALSE) {
    while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== FALSE) {
        // Assuming first column = ID, second = First Name, third = Last Name
        if (strcasecmp($data[1], $firstName) === 0 && strcasecmp($data[2], $lastName) === 0) {
            $found = true;
            break;
        }
    }
    fclose($handle);
}

if ($found) {
    // Store in session
    $_SESSION['firstName'] = $firstName;
    $_SESSION['lastName']  = $lastName;

    // Record check-in
    $checkFile = './checkIn.txt';
    $checkRows = [];
    if (file_exists($checkFile) && ($handle = fopen($checkFile, 'r')) !== FALSE) {
        while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== FALSE) {
            $checkRows[] = $data;
        }
        fclose($handle);
    }

    // Determine next ID
    $nextId = count($checkRows) > 0 ? intval($checkRows[count($checkRows)-1][0]) + 1 : 1;

    // Set timezone to Eastern
    date_default_timezone_set('America/New_York');
    $date = date('Y/m/d');
    $time = date('H:i');

    // Append new check-in
    $fp = fopen($checkFile, 'a');
    fputcsv($fp, [$nextId, strtolower($firstName), strtolower($lastName), $date, $time]);
    fclose($fp);

    // Redirect to options page
    header("Location: ../options/");
    exit();
} else {
    echo "<p style='color:red; text-align:center; margin-top:20px;'>Login failed. Name not found.</p>";
    echo "<p style='text-align:center;'><a href='login.html'>Go back to login</a></p>";
}
?>
