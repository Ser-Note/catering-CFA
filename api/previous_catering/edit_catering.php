<?php
session_start();
$csvFile = './catering.txt';

// Load rows
$rows = [];
if (($handle = fopen($csvFile, "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== FALSE) {
        $rows[] = array_map("trim", $data);
    }
    fclose($handle);
}

// Pagination
$perPage = 5;
$total = count($rows);
$page = isset($_GET['page']) ? max(1,intval($_GET['page'])) : 1;
$start = ($page-1)*$perPage;
$displayRows = array_slice($rows, $start, $perPage);

// Handle edit/delete
$message = "";
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = intval($_POST['id']);
    $action = $_POST['action'];

    if ($id < 1 || $id > count($rows)) {
        $message = "Invalid ID.";
    } else {
        if ($action === 'delete') {
            array_splice($rows, $id-1, 1);
            foreach($rows as $index => &$row) $row[0] = $index + 1;
            $message = "Order deleted successfully.";
        } elseif ($action === 'edit') {
            // Update editable fields
            $rows[$id-1][1] = $_POST['date'] ?? $rows[$id-1][1];
            $rows[$id-1][2] = $_POST['org'] ?? $rows[$id-1][2];
            $rows[$id-1][3] = intval($_POST['sandwiches'] ?? $rows[$id-1][3]);
            $rows[$id-1][4] = $_POST['other'] ?? $rows[$id-1][4];

            // Recalculate cost (correctly summing other-item quantities)
            $sandwiches = intval($_POST['sandwiches'] ?? $rows[$id-1][3]);

            $otherRaw = $_POST['other'] ?? ($rows[$id-1][4] ?? '');
            $otherRaw = trim($otherRaw);
            $otherEntries = $otherRaw === '' ? [] : array_filter(array_map('trim', explode(';', $otherRaw)));

            $otherCount = 0;
            foreach ($otherEntries as $entry) {
                if ($entry === '') continue;
                if (strpos($entry, ':') !== false) {
                    $parts = explode(':', $entry, 2);
                    $qty = intval(trim($parts[1]));
                    $otherCount += $qty;
                } else {
                    $otherCount += 1;
                }
            }

            $rows[$id-1][6] = ($sandwiches * 5) + ($otherCount * 3);
            $rows[$id-1][7] = isset($_POST['paid']) ? 1 : 0;
            $rows[$id-1][8] = $_POST['orderType'] ?? $rows[$id-1][7];
            $rows[$id-1][9] = $_POST['timeOfDay'] ?? $rows[$id-1][8];
            $rows[$id-1][10] = $_POST['contactName'] ?? $rows[$id-1][9];
            $rows[$id-1][11] = $_POST['contactPhone'] ?? $rows[$id-1][10];
            $rows[$id-1][12] = $_POST['pickles'] ?? $rows[$id-1][11];
            $rows[$id-1][13] = $_POST['numBags'] ?? $rows[$id-1][13];

            // Save sauces
            if (isset($_POST['sauces']) && is_array($_POST['sauces'])) {
                $rows[$id-1][5] = implode(';', $_POST['sauces']);
            } else {
                $rows[$id-1][5] = '';
            }

            // Ensure creator/editor columns exist
            $creatorIndex = 14;
            $editorIndex = 15;
            while (count($rows[$id-1]) <= $editorIndex) $rows[$id-1][] = '';

            // Add editor if someone is logged in
            if (isset($_SESSION['firstName'], $_SESSION['lastName'])) {
                $rows[$id-1][$editorIndex] = $_SESSION['firstName'] . ' ' . $_SESSION['lastName'];
            }

            $message = "Order updated successfully.";
        }

        // Save rows back to CSV
        $fp = fopen($csvFile, 'w');
        foreach($rows as $row) fputcsv($fp, $row);
        fclose($fp);

        header("Location: edit_catering.php?page=$page&msg=".urlencode($message));
        exit;
    }
}

if(isset($_GET['msg'])) $message = $_GET['msg'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Edit/Delete Catering Orders</title>
<link rel="stylesheet" href="../login/login.css">
<link rel="icon" type="image/x-icon" href="../images/cfalogo.ico">
<style>
.container { max-width:1000px;margin:40px auto;background:#fff;padding:20px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.15);}
h2 { text-align:center; color:#c8102e; }
table { width:100%; border-collapse:collapse; margin-top:20px; }
th, td { border:1px solid #ddd; padding:10px; text-align:center; }
th { background:#c8102e; color:#fff; }
tr:nth-child(even) { background:#f9f9f9; }
.actions button { margin:2px; padding:6px 12px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; }
.edit-btn { background:#007bff; color:white; }
.delete-btn { background:#dc3545; color:white; }
.edit-form { display:none; margin-top:10px; padding:10px; border:1px solid #ddd; border-radius:6px; background:#f9f9f9; }
.edit-form input[type="text"], .edit-form input[type="number"], .edit-form input[type="date"], .edit-form select { padding:6px; margin:4px; border:1px solid #ccc; border-radius:6px; }
.message { text-align:center; margin-top:15px; font-weight:bold; color:green; }
.pagination { text-align:center; margin-top:15px; }
.pagination a { margin:0 10px; text-decoration:none; font-weight:bold; color:#c8102e; }
.back-link { display:block; text-align:center; margin-top:20px; color:#c8102e; font-weight:bold; text-decoration:none; }
ul { padding-left:20px; }
</style>
</head>
<body>
<div class="container">
<h2>Edit/Delete Catering Orders</h2>

<?php if(!empty($displayRows)): ?>
<table>
<thead>
<tr>
<th>ID</th><th>Date</th><th>Organization/Person</th><th>Sandwiches</th><th>Other Items</th><th>Sauces</th><th>Cost ($)</th><th>Paid?</th><th>Actions</th>
</tr>
</thead>
<tbody>
<?php foreach($displayRows as $row): ?>
<tr>
<td><?=htmlspecialchars($row[0])?></td>
<td><?=htmlspecialchars($row[1])?></td>
<td><?=htmlspecialchars($row[2])?></td>
<td><?=htmlspecialchars($row[3])?></td>
<td><?php if(!empty($row[4])) { $items=explode(';',$row[4]); echo implode(', ',$items);} ?></td>
<td><?php if(!empty($row[5])) { $sauces=explode(';',$row[5]); echo implode(', ',$sauces);} ?></td>
<td><?=htmlspecialchars($row[6])?></td>
<td><?= $row[7]==1?"Yes":"No" ?></td>
<td class="actions">
<button class="edit-btn" onclick="toggleEditForm(<?= $row[0] ?>)">Edit</button>
<form method="post" style="display:inline;">
<input type="hidden" name="id" value="<?= $row[0] ?>">
<input type="hidden" name="action" value="delete">
<button type="submit" class="delete-btn" onclick="return confirm('Delete this order?')">Delete</button>
</form>
</td>
</tr>

<tr id="edit-form-<?= $row[0] ?>" class="edit-form">
<td colspan="9">
<form method="post" oninput="updateCost(<?= $row[0] ?>)">
<input type="hidden" name="id" value="<?= $row[0] ?>">
<input type="hidden" name="action" value="edit">

<label>Date:</label>
<input type="date" name="date" value="<?=htmlspecialchars($row[1])?>">

<label>Organization Name:</label>
<input type="text" name="org" value="<?=htmlspecialchars($row[2])?>">

<label>Sandwiches:</label>
<input type="number" id="sandwiches-<?=$row[0]?>" name="sandwiches" value="<?=htmlspecialchars($row[3])?>" min="0">

<label>Other Items:</label>
<div style="display:flex; gap:10px; align-items:center;">
<select id="other-item-<?=$row[0]?>">
<option value="">-- Select Item --</option>
<option value="12-ct nugget">12-ct nugget</option>
<option value="8-ct nugget">8-ct nugget</option>
<option value="grilled 8-ct nugget">Grilled 8-ct nugget</option>
<option value="grilled 12-ct nugget">Grilled 12-ct nugget</option>
<option value="grilled sandwich">Grilled sandwich</option>
<option value="spicy sandwich">Spicy sandwich</option>
<option value="4-ct strip">4-ct strip</option>
</select>
<input type="number" id="other-qty-<?=$row[0]?>" placeholder="Qty" min="0">
<button type="button" onclick="addOtherItem(<?=$row[0]?>)">Add</button>
</div>
<ul id="other-list-<?=$row[0]?>">
<?php if(!empty($row[4])) { $items=explode(';',$row[4]); foreach($items as $item) echo "<li>".htmlspecialchars($item)."</li>"; } ?>
</ul>
<input type="hidden" name="other" id="hidden-other-<?=$row[0]?>" value="<?=htmlspecialchars($row[4])?>">

<label>Sauces:</label>
<div style="display:flex; gap:10px; flex-wrap:wrap;">
<?php 
$allSauces = [
    "bbq","chick fil a","garden herb ranch","honey mustard",
    "honey roasted bbq","ketchup","mayonnaise","polynesian",
    "sweet and spicy sriracha","zesty buffalo"
];
$selectedSauces = !empty($row[5]) ? explode(';', strtolower($row[5])) : [];
$selectedSauces = array_map('trim', $selectedSauces);

foreach ($allSauces as $sauce): ?>
<label style="margin-right:10px;">
    <input type="checkbox" name="sauces[]" value="<?=htmlspecialchars($sauce)?>"
    <?= in_array(strtolower(trim($sauce)), $selectedSauces) ? 'checked' : '' ?>>
    <?=ucfirst($sauce)?>
</label>
<?php endforeach; ?>
</div>

<label>Order Type:</label>
<select name="orderType">
<option value="pickup" <?=isset($row[8])&&$row[8]=="pickup"?"selected":""?>>Pick-up</option>
<option value="delivery" <?=isset($row[8])&&$row[8]=="delivery"?"selected":""?>>Delivery</option>
</select>

<label>Time of Day:</label>
<input type="text" name="timeOfDay" value="<?=htmlspecialchars($row[9]??'')?>">

<label>Contact Name:</label>
<input type="text" name="contactName" value="<?=htmlspecialchars($row[10]??'')?>">

<label>Contact Phone:</label>
<input type="text" name="contactPhone" value="<?=htmlspecialchars($row[11]??'')?>">

<label>Pickles on side:</label>
<select name="pickles">
<option value="yes" <?=isset($row[12])&&$row[12]=="yes"?"selected":""?>>Yes</option>
<option value="no" <?=isset($row[12])&&$row[12]=="no"?"selected":""?>>No</option>
</select>

<label>Number of Hotbags:</label>
<input type="number" name="numBags" value="<?=htmlspecialchars($row[13]??'')?>" min="0">

<label>Cost ($):</label>
<input type="text" id="cost-<?=$row[0]?>" name="cost" value="<?=htmlspecialchars($row[6])?>">

<label>Paid:</label>
<input type="checkbox" name="paid" <?= $row[7]==1?"checked":"" ?>>

<button type="submit" class="edit-btn">Save</button>
</form>
</td>
</tr>
<?php endforeach; ?>
</tbody>
</table>

<?php else: ?>
<p style="text-align:center;color:red;">No catering records found.</p>
<?php endif; ?>

<div class="pagination">
<?php if($page>1): ?><a href="?page=<?=$page-1?>">← Previous</a><?php endif;?>
<?php if($start+$perPage<$total): ?><a href="?page=<?=$page+1?>">Next →</a><?php endif;?>
</div>

<?php if($message): ?><p class="message"><?=htmlspecialchars($message)?></p><?php endif;?>
<a href="./" class="back-link">← Back to Previous Orders</a>
</div>

<script>
function toggleEditForm(id){
    const row=document.getElementById("edit-form-"+id);
    row.style.display=(row.style.display==="table-row")?"none":"table-row";
}
function updateCost(id){
  const sandwiches = parseInt(document.getElementById("sandwiches-"+id).value) || 0;
  const raw = (document.getElementById("hidden-other-"+id).value || '').trim();
  let otherCount = 0;
  if (raw !== '') {
    const parts = raw.split(';').map(s => s.trim()).filter(Boolean);
    parts.forEach(entry => {
      const colon = entry.indexOf(':');
      if (colon !== -1) {
        const qty = parseInt(entry.slice(colon+1).trim()) || 0;
        otherCount += qty;
      } else {
        otherCount += 1;
      }
    });
  }
  const cost = (sandwiches * 5) + (otherCount * 3);
  document.getElementById("cost-"+id).value = cost.toFixed(2);
}

function addOtherItem(id){
    const itemSelect=document.getElementById("other-item-"+id);
    const qtyInput=document.getElementById("other-qty-"+id);
    const itemName=itemSelect.value;
    const qty=parseInt(qtyInput.value)||0;

    if(!itemName||qty<=0){
        alert("Select item and enter quantity");
        return;
    }

    const hiddenInput=document.getElementById("hidden-other-"+id);
    let existing=hiddenInput.value?hiddenInput.value.split(';'):[];
    let updated=[];
    let found=false;

    existing.forEach(entry=>{
        const parts=entry.split(':');
        const name=parts[0].trim();
        const count=parseInt(parts[1]||1);
        if(name===itemName){
            updated.push(name+": "+(count+qty));
            found=true;
        } else {
            updated.push(entry);
        }
    });

    if(!found) updated.push(itemName+": "+qty);
    hiddenInput.value=updated.join(';');

    const ul=document.getElementById("other-list-"+id);
    ul.innerHTML="";
    updated.forEach(entry=>{
        const li=document.createElement("li");
        li.textContent=entry;
        ul.appendChild(li);
    });

    itemSelect.value="";
    qtyInput.value="";
    updateCost(id);
}
</script>
</body>
</html>
