<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Edit Catering</title>
<link rel="stylesheet" href="newCatering.css">
<link rel="icon" type="image/x-icon" href="../images/cfalogo.ico">
<script src="editCatering.js" defer></script>
</head>
<body>
<div class="container">
<h2>FUNDRAISER SANDWICH ORDER FORM & INVOICE</h2>
<img src="../images/cfalogo.webp" alt="CFA Logo" class="logo">
<h3>Chick-Fil-A Exeter</h3>
<p>4675 Perkiomen Avenue, Reading, PA 19606</p>
<p>610-779-5995</p>

<form id="editForm" method="POST">
<input type="hidden" name="id" value="<?= $editId ?>">

<!-- Order type -->
<div class="orderType">
<label><input type="radio" name="orderType" value="pickup" <?= $selectedRow[7]=='pickup'?'checked':'' ?>> Pick-up</label>
<label><input type="radio" name="orderType" value="delivery" <?= $selectedRow[7]=='delivery'?'checked':'' ?>> Delivery</label>
</div>

<!-- Date & Time -->
<input type="date" name="orderDate" id="orderDate" value="<?= $selectedRow[1] ?>" required>
<input type="text" name="dayOfWeek" id="dayOfWeek" value="" readonly>
<input type="time" name="timeOfDay" id="timeOfDay" value="<?= $selectedRow[8] ?>">

<!-- Organization Info -->
<input type="text" name="organization" value="<?= trim($selectedRow[2],'"') ?>" required>
<input type="text" name="contactName" value="<?= trim($selectedRow[9],'"') ?>" required>
<input type="text" name="contactPhone" value="<?= trim($selectedRow[10],'"') ?>" required>

<!-- Sandwiches & Other Items -->
<input type="number" name="numSandwiches" id="numSandwiches" value="<?= $selectedRow[3] ?>" required>
<div id="otherItemsContainer">
<textarea name="otherItems"><?= trim($selectedRow[4],'"') ?></textarea>
</div>

<!-- Sauces -->
<label for="sauces">Sauces:</label>
<select name="sauces[]" id="sauces" multiple size="6">
<?php
    $allSauces = [
        "bbq",
        "chick fil a",
        "garden herb ranch",
        "honey mustard",
        "honey roasted bbq",
        "ketchup",
        "mayonnaise",
        "polynesian",
        "sweet and spicy siracha",
        "zesty buffalo"
    ];
    $selectedSauces = array_map('trim', explode(';', trim($selectedRow[5], '"')));
    foreach ($allSauces as $sauce) {
        $isSelected = in_array($sauce, $selectedSauces) ? 'selected' : '';
        echo "<option value=\"$sauce\" $isSelected>" . ucfirst($sauce) . "</option>";
    }
?>
</select>

<!-- Pickles & Hot Bags -->
<select name="pickles">
<option value="yes" <?= $selectedRow[11]=='yes'?'selected':'' ?>>Yes</option>
<option value="no" <?= $selectedRow[11]=='no'?'selected':'' ?>>No</option>
</select>
<input type="number" name="numBags" value="<?= $selectedRow[12] ?>" min="0">

<!-- Paid -->
<select name="paid">
<option value="0" <?= $selectedRow[6]=='0'?'selected':'' ?>>No</option>
<option value="1" <?= $selectedRow[6]=='1'?'selected':'' ?>>Yes</option>
</select>

<!-- Actions -->
<button type="submit">Save Changes</button>
<button type="submit" name="action" value="delete" onclick="return confirm('Are you sure you want to delete this order?');">Delete Order</button>
<button type="button" id="goBackBtn">← Go Back</button>

</form>
</div>
</body>
</html>
