<?php
$jsonFile = __DIR__ . '/../orders.json';

// Ensure file exists
if (!file_exists($jsonFile)) {
    file_put_contents($jsonFile, json_encode([], JSON_PRETTY_PRINT));
}

$data = json_decode(file_get_contents($jsonFile), true) ?? [];

// Handle delete request
if (isset($_GET['delete'])) {
    $deleteIndex = intval($_GET['delete']);
    if (isset($data[$deleteIndex])) {
        array_splice($data, $deleteIndex, 1); // Remove the order
        // Reorder IDs
        foreach ($data as $i => &$order) {
            $order['id'] = $i + 1;
        }
        unset($order);
        file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT));
        header("Location: " . $_SERVER['PHP_SELF'] . "?page=" . (isset($_GET['page']) ? intval($_GET['page']) : 1));
        exit;
    }
}

// Sort by ID ascending
usort($data, function($a, $b) {
    return ($a['id'] ?? 0) <=> ($b['id'] ?? 0);
});

// Pagination setup
$perPage = 5;
$total = count($data);
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$start = ($page - 1) * $perPage;
$paginated = array_slice($data, $start, $perPage);

// Handle save/update
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $index = intval($_POST['index']);

    // Update fields
    $data[$index]['order_type'] = $_POST['order_type'];
    $data[$index]['date'] = $_POST['date'];
    $data[$index]['time'] = $_POST['time'];
    $data[$index]['destination'] = $_POST['destination'];
    $data[$index]['customer_name'] = $_POST['customer_name'];
    $data[$index]['phone_number'] = $_POST['phone_number'];
    $data[$index]['customer_email'] = $_POST['customer_email'];
    $data[$index]['guest_count'] = $_POST['guest_count'];
    $data[$index]['paper_goods'] = $_POST['paper_goods'];
    $data[$index]['total'] = $_POST['total'];

    // Parse food, drink, sauce arrays
    $data[$index]['food_items'] = [];
    if(isset($_POST['food_items'])){
        foreach ($_POST['food_items'] as $i => $item) {
            if (trim($item) !== '') {
                $data[$index]['food_items'][] = [
                    'item' => trim($item),
                    'qty' => intval($_POST['food_qty'][$i])
                ];
            }
        }
    }

    $data[$index]['drink_items'] = [];
    if(isset($_POST['drink_items'])){
        foreach ($_POST['drink_items'] as $i => $item) {
            if (trim($item) !== '') {
                $data[$index]['drink_items'][] = [
                    'item' => trim($item),
                    'qty' => intval($_POST['drink_qty'][$i])
                ];
            }
        }
    }

    $data[$index]['sauces_dressings'] = [];
    if(isset($_POST['sauce_items'])){
        foreach ($_POST['sauce_items'] as $i => $item) {
            if (trim($item) !== '') {
                $data[$index]['sauces_dressings'][] = [
                    'item' => trim($item),
                    'qty' => intval($_POST['sauce_qty'][$i])
                ];
            }
        }
    }

    file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT));
    header("Location: " . $_SERVER['PHP_SELF'] . "?page=$page&saved=1");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Edit Catering Orders (JSON)</title>
<style>
body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
h1 { text-align:center; color:#c8102e; }
table { width:100%; border-collapse: collapse; background:#fff; margin-bottom:20px; }
th, td { border:1px solid #ddd; padding:8px 10px; text-align:left; }
th { background:#c8102e; color:white; }
tr:nth-child(even) { background:#f2f2f2; }
button { background:#c8102e; color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; }
button:hover { background:#a50c23; }
.pagination { text-align:center; }
.pagination a { padding:8px 12px; margin:2px; background:#c8102e; color:white; border-radius:4px; text-decoration:none; }
.pagination a:hover { background:#a50c23; }
form { background:#fff; padding:15px; border-radius:8px; box-shadow:0 0 5px rgba(0,0,0,0.1); margin-bottom:20px; }
input[type=text], input[type=number] { padding:4px; margin:4px; width:250px; }
label { margin-right:10px; display:inline-block; }
.item-row { display:flex; align-items:center; margin-bottom:5px; }
.item-row input[type=text] { width:400px; margin-right:8px; }
.remove-item { background:red; padding:2px 6px; margin-left:6px; border-radius:4px; }
.remove-item:hover { background:#a00; }
.back-btn {
    display: inline-block;
    background-color: #c8102e;   /* Chick-fil-A red */
    color: white;
    text-decoration: none;
    padding: 8px 18px;
    border-radius: 8px;
    font-weight: bold;
    transition: background-color 0.3s ease, transform 0.2s ease;
    margin-bottom: 15px;
}

.back-btn:hover {
    background-color: #a50c23;   /* Slightly darker red */
    transform: scale(1.05);       /* Subtle zoom effect */
}
</style>
</head>
<body>

<h1>Catering Orders (JSON)</h1>

<a class="back-btn" href="../options/">⬅ Back to Options</a>

<?php if (isset($_GET['saved'])): ?>
<p style="text-align:center;color:green;font-weight:bold;">✅ Order updated successfully!</p>
<?php endif; ?>

<table>
<tr>
    <th>ID</th>
    <th>Customer</th>
    <th>Date</th>
    <th>Time</th>
    <th>Total</th>
    <th>Action</th>
</tr>

<?php foreach ($paginated as $index => $order): ?>
<tr>
    <td><?= htmlspecialchars($order['id']) ?></td>
    <td><?= htmlspecialchars($order['customer_name']) ?></td>
    <td><?= htmlspecialchars($order['date']) ?></td>
    <td><?= htmlspecialchars($order['time']) ?></td>
    <td><?= htmlspecialchars($order['total']) ?></td>
    <td>
        <button onclick="toggleForm(<?= $index + $start ?>)">Edit</button>
        <a href="?delete=<?= $index + $start ?>&page=<?= $page ?>" onclick="return confirm('Are you sure you want to delete this order?');" style="background:red;padding:6px 12px;color:white;border-radius:6px;text-decoration:none;">Delete</a>
    </td>
</tr>

<tr id="form<?= $index + $start ?>" style="display:none;">
<td colspan="6">
    <form method="POST">
        <input type="hidden" name="index" value="<?= $index + $start ?>">
        <label>Order Type: <input type="text" name="order_type" value="<?= htmlspecialchars($order['order_type']) ?>"></label>
        <label>Date: <input type="text" name="date" value="<?= htmlspecialchars($order['date']) ?>"></label>
        <label>Time: <input type="text" name="time" value="<?= htmlspecialchars($order['time']) ?>"></label><br>
        <label>Destination: <input type="text" name="destination" value="<?= htmlspecialchars($order['destination']) ?>"></label><br>
        <label>Customer Name: <input type="text" name="customer_name" value="<?= htmlspecialchars($order['customer_name']) ?>"></label>
        <label>Phone: <input type="text" name="phone_number" value="<?= htmlspecialchars($order['phone_number']) ?>"></label><br>
        <label>Email: <input type="text" name="customer_email" value="<?= htmlspecialchars($order['customer_email']) ?>"></label><br>
        <label>Guest Count: <input type="text" name="guest_count" value="<?= htmlspecialchars($order['guest_count']) ?>"></label>
        <label>Paper Goods: <input type="text" name="paper_goods" value="<?= htmlspecialchars($order['paper_goods']) ?>"></label><br>
        <label>Total: <input type="text" name="total" value="<?= htmlspecialchars($order['total']) ?>"></label><br>

        <h4>Food Items:</h4>
        <div id="food<?= $index + $start ?>">
            <?php foreach ($order['food_items'] as $i => $item): ?>
            <div class="item-row">
                <input type="text" name="food_items[]" value="<?= htmlspecialchars($item['item']) ?>">
                <input type="number" name="food_qty[]" value="<?= htmlspecialchars($item['qty']) ?>">
                <button type="button" class="remove-item" onclick="removeRow(this)">❌</button>
            </div>
            <?php endforeach; ?>
            <div class="item-row"><input type="text" name="food_items[]" placeholder="Add item"><input type="number" name="food_qty[]" placeholder="Qty"></div>
        </div>

        <h4>Drink Items:</h4>
        <div id="drink<?= $index + $start ?>">
            <?php foreach ($order['drink_items'] as $i => $item): ?>
            <div class="item-row">
                <input type="text" name="drink_items[]" value="<?= htmlspecialchars($item['item']) ?>">
                <input type="number" name="drink_qty[]" value="<?= htmlspecialchars($item['qty']) ?>">
                <button type="button" class="remove-item" onclick="removeRow(this)">❌</button>
            </div>
            <?php endforeach; ?>
            <div class="item-row"><input type="text" name="drink_items[]" placeholder="Add drink"><input type="number" name="drink_qty[]" placeholder="Qty"></div>
        </div>

        <h4>Sauces/Dressings:</h4>
        <div id="sauce<?= $index + $start ?>">
            <?php foreach ($order['sauces_dressings'] as $i => $item): ?>
            <div class="item-row">
                <input type="text" name="sauce_items[]" value="<?= htmlspecialchars($item['item']) ?>">
                <input type="number" name="sauce_qty[]" value="<?= htmlspecialchars($item['qty']) ?>">
                <button type="button" class="remove-item" onclick="removeRow(this)">❌</button>
            </div>
            <?php endforeach; ?>
            <div class="item-row"><input type="text" name="sauce_items[]" placeholder="Add sauce"><input type="number" name="sauce_qty[]" placeholder="Qty"></div>
        </div>

        <br>
        <button type="submit">💾 Save Changes</button>
    </form>
</td>
</tr>
<?php endforeach; ?>
</table>

<div class="pagination">
<?php
$totalPages = ceil($total / $perPage);
for ($i = 1; $i <= $totalPages; $i++):
?>
    <a href="?page=<?= $i ?>" <?= $i==$page ? 'style="background:#a50c23;"' : '' ?>><?= $i ?></a>
<?php endfor; ?>
</div>

<script>
function toggleForm(i) {
    const el = document.getElementById('form' + i);
    el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
}

function removeRow(button) {
    button.parentNode.remove();
}
</script>

</body>
</html>
