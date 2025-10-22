<?php
// Path to employee file
$file = "../login/employee.txt";

// Load employees
$employees = [];
if (file_exists($file)) {
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        list($id, $fname, $lname) = explode(",", $line);
        $employees[] = ["id" => (int)$id, "fname" => $fname, "lname" => $lname];
    }
}

// Handle add employee
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["add"])) {
    $fname = trim($_POST["fname"]);
    $lname = trim($_POST["lname"]);

    $fname = strtolower($fname);
    $lname = strtolower($lname);

    if ($fname && $lname) {
        $newId = count($employees) + 1;
        $entry = "$newId,$fname,$lname\n";

        if (filesize($file) > 0) {
            file_put_contents($file, $entry, FILE_APPEND);
        } else {
            file_put_contents($file, $entry);
        }

        header("Location: " . $_SERVER["PHP_SELF"]);
        exit;
    }
}

// Handle delete employee (and reindex IDs)
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["delete"])) {
    $deleteId = (int)$_POST["delete"];

    $employees = array_filter($employees, function($emp) use ($deleteId) {
        return $emp["id"] !== $deleteId;
    });

    $newData = "";
    $newId = 1;
    foreach ($employees as $emp) {
        $newData .= $newId . "," . $emp["fname"] . "," . $emp["lname"] . "\n";
        $newId++;
    }

    file_put_contents($file, $newData);

    header("Location: " . $_SERVER["PHP_SELF"]);
    exit;
}

// Reload after add/delete
$employees = [];
if (file_exists($file)) {
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        list($id, $fname, $lname) = explode(",", $line);
        $employees[] = ["id" => (int)$id, "name" => $fname . " " . $lname];
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Chick-fil-A Employee Manager</title>
    <link rel="stylesheet" href="style.css">
    <script src="script.js" defer></script>
    <link rel="icon" type="image/x-icon" href="../images/cfalogo.ico">
</head>
<body>
    <div class="logo">
        <img src="../images/cfalogo.webp" alt="Chick-fil-A Logo" class="logo">
    </div>

    <div class="container">
        <a href="../options/" class="back-btn">← Back</a>

        <h1>Chick-fil-A Employee Manager</h1>

        <form method="POST" class="add-form">
            <input type="text" name="fname" placeholder="First Name" required>
            <input type="text" name="lname" placeholder="Last Name" required>
            <button type="submit" name="add">Add Employee</button>
        </form>

        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Employee Name</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($employees)): ?>
                    <?php foreach ($employees as $emp): ?>
                        <tr>
                            <td><?= htmlspecialchars($emp["id"]) ?></td>
                            <td><?= htmlspecialchars($emp["name"]) ?></td>
                            <td>
                                <form method="POST" onsubmit="return confirmDelete();">
                                    <button type="submit" name="delete" value="<?= $emp['id'] ?>">Delete</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr><td colspan="3">No employees yet.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</body>
</html>
