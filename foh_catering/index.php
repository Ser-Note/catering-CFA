<?php
date_default_timezone_set('America/New_York');

$allOrders = [];

// --- Load CSV orders ---
$csvFile = '../previous_catering/catering.txt';
if (($handle = fopen($csvFile, "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== FALSE) {
        $allOrders[] = [
            'uid' => uniqid('csv_'),
            'id' => $data[0] ?? '',
            'date' => $data[1] ?? '',
            'team' => $data[2] ?? '',
            'sauces_dressings' => $data[5] ?? '',
            'sandwiches' => $data[3] ?? 'N/A',
            'food_items' => $data[4] ?? 'N/A',
            'hotbags' => $data[13] ?? 'N/A',
            'pickles' => $data[12] ?? 'N/A',
            'created_by' => $data[10] ?? '',
            'time' => $data[9] ?? '',
            'method' => $data[8] ?? '',
            'contact' => $data[10] ?? '',
            'phone' => $data[11] ?? ''
        ];
    }
    fclose($handle);
}

// --- Load JSON orders ---
$jsonFile ='../orders.json';
if (file_exists($jsonFile)) {
    $jsonData = json_decode(file_get_contents($jsonFile), true);
    foreach ($jsonData as $order) {
    $sandwichesList = [];
    $otherFoodItems = [];
    $drinkList = [];


// 0️⃣ Sanitize newlines in food items
foreach ($order['food_items'] as &$f) {
    if (is_array($f) && isset($f['item'])) {
        $f['item'] = str_replace(["\r", "\n"], ' ', $f['item']);
        $f['item'] = trim($f['item']);
    } elseif (is_string($f)) {
        $f = str_replace(["\r", "\n"], ' ', $f);
        $f = trim($f);
    }
}
unset($f);

// 1️⃣ Merge broken items (e.g., "S\nwich") — safer logic
$processedFoodItems = [];
$prev = null;

foreach ($order['food_items'] as $f) {
    if ($prev !== null) {
        if (
             is_array($f) && isset($f['item']) &&
        preg_match('/[a-zA-Z]$/', $prev['item']) &&
        preg_match('/^[a-z]/', $f['item']) &&
        // Only merge if both lines look like fragments (no known food keywords)
        !preg_match('/(tray|sandwich|wrap|salad|box|meal|nugget|drink|cookie|brownie|chicken|combo|pack)$/i', $prev['item']) &&
        !preg_match('/(tray|sandwich|wrap|salad|box|meal|nugget|drink|cookie|brownie|chicken|combo|pack)$/i', $f['item'])

        ) {
            // Only merge if previous doesn't end in a full food name
            $prev['item'] .= ' ' . $f['item'];
            $prev['item'] = preg_replace('/\s+/', ' ', $prev['item']);
            continue;
        } else {
            $processedFoodItems[] = $prev;
        }
    }
    $prev = $f;
}
if ($prev !== null) {
    $processedFoodItems[] = $prev;
}


// Optional: extra sanitation pass
foreach ($processedFoodItems as &$f) {
    if (isset($f['item'])) {
        $f['item'] = str_replace(["\r", "\n"], ' ', $f['item']);
        $f['item'] = trim($f['item']);
    }
}
unset($f);

// 2️⃣ Build meal boxes
$mealBoxList = [];
$boxMeal = null;

foreach ($processedFoodItems as $f) {
    $text = "{$f['qty']} x {$f['item']}";
    $lower = strtolower($f['item']);

    // Start a new box meal if it's packaged or pre-combined
    if (strpos($lower, 'packaged meal') !== false || strpos($lower, 'box meal') !== false || strpos($lower, ' w/') !== false) {
        if ($boxMeal !== null) {
            $mealBoxList[] = $boxMeal;
        }
        $boxMeal = [
            'main' => $text,
            'contents' => []
        ];
        continue;
    }

    // If currently building a box meal
    if ($boxMeal !== null) {
        // If this item is NOT a new main meal/tray, add it to box contents
        if (preg_match('/tray|packaged meal|box meal/i', $f['item'])) {
            // Next main meal found → close current box
            $mealBoxList[] = $boxMeal;
            $boxMeal = null;
        } else {
            // Add this item to the current box meal contents
            $boxMeal['contents'][] = $text;
            continue; // do NOT categorize into sandwiches/otherFood
        }
    }

    // Normal categorization for items not in a box meal
    if (stripos($f['item'], 'sandwich') !== false || stripos($f['item'], 'hot') !== false) {
        $sandwichesList[] = $text;
    } elseif (stripos($f['item'], 'cool') !== false || stripos($f['item'], 'cold') !== false || stripos($f['item'], 'chilled') !== false) {
        $otherFoodItems[] = $text . " (Cold)";
    } elseif (stripos($f['item'], 'cookie') !== false || stripos($f['item'], 'brownie') !== false || stripos($f['item'], 'dessert') !== false || stripos($f['item'], 'desserts') !== false) {
        $otherFoodItems[] = $text . " (Dessert)";
    } else {
        $otherFoodItems[] = $text;
    }
}

// Add any remaining box meal
if ($boxMeal !== null) {
    $mealBoxList[] = $boxMeal;
}

// Merge preformatted meal_boxes
if (!empty($order['meal_boxes'])) {
    foreach ($order['meal_boxes'] as $m) {
        $mealBoxList[] = [
            'main' => "{$m['qty']} x {$m['item']}",
            'contents' => []
        ];
    }
}

    // Format meal boxes as string for JS
    $mealBoxListFormatted = array_map(function($m) {
        if (empty($m['contents'])) return $m['main'];
        return $m['main'] . ' w/ ' . implode(', ', $m['contents']);
    }, $mealBoxList);

    // Assign to allOrders
    $allOrders[] = [
        'uid' => uniqid('json_'),
        'id' => $order['id'],
        'date' => $order['date'],
        'team' => $order['customer_name'],
        'sandwiches' => implode("<br>", $sandwichesList) ?: 'N/A',
        'food_items' => implode("<br>", $otherFoodItems) ?: 'N/A',
        'drinks' => implode("<br>", $drinkList) ?: 'N/A',
        'meal_boxes' => implode("<br>", $mealBoxListFormatted) ?: 'N/A',
        'hotbags' => 'N/A',
        'pickles' => !empty($sandwichesList) ? 'Yes' : 'No',
        'guest_count' => $order['guest_count'] ?? 'N/A',
        'paper_goods' => $order['paper_goods'] ?? 'No',
        'created_by' => $order['customer_email'],
        'time' => $order['time'],
        'method' => $order['order_type'],
        'contact' => $order['customer_name'],
        'phone' => $order['phone_number'],
        'sauces_dressings' => $order['sauces_dressings'] ?? 'N/A'
    ];
}

}

// --- Filter today's orders ---
$today = date('Y-m-d');
$todaysOrders = array_filter($allOrders, fn($row) => date('Y-m-d', strtotime($row['date'])) === $today);

// --- Sort by time ---
usort($todaysOrders, fn($a,$b) => strtotime($a['time']) <=> strtotime($b['time']));

// --- Time format helper ---
function formatTime($time24) {
    if (!$time24) return '';
    if (stripos($time24, 'am') !== false || stripos($time24, 'pm') !== false) return $time24;
    return date("g:i A", strtotime($time24));
}

// --- Tray sizes mapping ---
$traySizes = [
    'nuggets tray' => [
        'Small' => ['tray' => '10"', 'amount' => 64],
        'Medium' => ['tray' => '14"', 'amount' => 120],
        'Large' => ['tray' => '16"', 'amount' => 200],
    ],
    'strip tray' => [
        'Small' => ['tray' => '10"', 'amount' => 24],
        'Medium' => ['tray' => '10"', 'amount' => 45],
        'Large' => ['tray' => '10"', 'amount' => 75],
    ],
       'strips tray' => [
        'Small' => ['tray' => '10"', 'amount' => 24],
        'Medium' => ['tray' => '10"', 'amount' => 45],
        'Large' => ['tray' => '10"', 'amount' => 75],
    ],
    'cool wrap tray' => [
        'Small' => ['halves' => 6],
        'Medium' => ['halves' => 10],
        'Large' => ['halves' => 14],
    ],
    'cool wrap® tray' => [
        'Small' => ['halves' => 6],
        'Medium' => ['halves' => 10],
        'Large' => ['halves' => 14],
    ],
    'garden salad tray' => [
        'Small' => ['tray' => '10"', 'lettuce' => '2 oz', 'tomatoes' => 10],
        'Large' => ['tray' => '14"', 'lettuce' => '4 oz', 'tomatoes' => 20],
    ],
    'chocolate chunk cookie tray' => [
        'Small' => ['tray' => '10"', 'amount' => 12],
        'Large' => ['tray' => '14"', 'amount' => 24],
    ],
    'chocolate fudge brownie tray' => [
        'Small' => ['tray' => '10"', 'amount' => 12],
        'Large' => ['tray' => '14"', 'amount' => 24],
    ],
    'mixed cookie & brownie tray' => [
        'Small' => ['tray' => '10"', 'cookies' => 6, 'brownies' => 6],
        'Large' => ['tray' => '14"', 'cookies' => 12, 'brownies' => 12],
    ],
    'mac & cheese tray' => [
        'Small' => ['Aluminum Pan/Lid' => 'Half Size x1', 'Mac & Cheese' => 'Full Batch'],
        'Large' => ['Aluminum Pan/Lid' => 'Half Size x2', 'Mac & Cheese' => '2 Full Batches'],
    ],
    'chick-n-mini tray' => [
        '20' => ['tray' => '10"', 'amount' => 20],
        '40' => ['tray' => '14"', 'amount' => 40],
    ],
    'fruit tray' => [
        'Small' => ['tray' => '10"', 'bottom layer' => 'Red and Green Apples ~ 12oz, Mandarin Oranges ~ 6oz, Strawberry Halves ~ 6oz, Blueberries ~ 1.5', 'top layer' => 'Red and Green Apples ~ 12oz, Mandarin Oranges ~ 6oz, Strawberry Halves ~ 6oz, Blueberries ~ 1.5'],
        'Large' => ['tray' => '14"', 'bottom layer' => 'Red and Green Apples ~ 1lb 8oz, Mandarin Oranges ~ 13oz, Strawberry Halves ~ 13oz, Blueberries ~ 2', 'top layer' => 'Red and Green Apples ~ 1lb 8oz, Mandarin Oranges ~ 13oz, Strawberry Halves ~ 13oz, Blueberries ~ 2'],
    ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Front of House — Catering Orders</title>
<style>
body { font-family: Arial, sans-serif; background: #f7f7f7; margin:0; padding:0; }
header { background: #d32323; color:white; padding:15px; text-align:center; font-size:20px; }
.container { display:flex; height:calc(100vh - 60px); }
.orders { width:40%; border-right:1px solid #ccc; overflow-y:auto; background:white; }
.order { padding:10px; border-bottom:1px solid #eee; cursor:pointer; }
.order:hover { background:#f1f1f1; }
.details { width:60%; padding:20px; display:none; background:#fff; position:relative; overflow-y:auto; }
.details.active { display:block; }
.close-btn { position:absolute; top:10px; right:10px; color:red; font-size:20px; cursor:pointer; display:none; }
.details.active .close-btn { display:block; }
.back-btn { display:inline-block; margin:10px; padding:8px 12px; background:#c8102e; color:white; text-decoration:none; border-radius:8px; font-weight:bold; }
.refresh-btn { display:inline-block; margin:10px; padding:8px 12px; background:#c8102e; color:white; text-decoration:none; border-radius:8px; font-weight:bold; }

.highlight-field { background:#cce5ff; padding:2px 5px; border-radius:3px; }
.hot, .cold, .dessert, .drink, .box-meal {
    display:block; margin:4px 0; padding:6px 8px; border-radius:6px;
}
.hot { background:#fff59d; }
.cold { background:#81c784; }
.dessert { background:#e1bee7; }
.drink { background:#ff8a80; }
.box-meal { background:#ffe0b2; border-left:4px solid #ff9800; }
.tray-toggle { cursor:pointer; color:#1a73e8; font-weight:600; }
.tray-toggle .arrow { margin-left:6px; font-size:0.9em; }
.tray-details { margin-left:18px; font-size:0.95em; color:#333; display:none; padding:6px 8px; border-radius:4px; background:#f4f6f8; }
.utensils { background:#bbdefb; padding:6px 8px; border-radius:6px; margin:4px 0; display:block; }
.cheatsheet { border:1px solid #ccc; background:#fafafa; padding:10px; border-radius:8px; margin-bottom:10px; }
.cheatsheet span { display:inline-block; margin-right:10px; padding:4px 8px; border-radius:5px; font-size:13px; }
.sauce { 
    display:block; 
    margin:4px 0; 
    padding:6px 8px; 
    border-radius:6px; 
    background:#4dd0e1; /* light teal for sauces */
}
</style>
</head>
<body>
<header>
    Chick-fil-A FOH Orders — <?php echo date('l, F j, Y'); ?>
</header>

<a href="../options/" class="back-btn">⬅ Back to Options</a>

<a href="../foh_catering" class="refresh-btn">↻ Refresh Page</a>

<div class="container">
    <div class="orders">
        <?php if (empty($todaysOrders)): ?>
            <p style="padding:10px;">No catering orders for today.</p>
        <?php else: ?>
            <?php foreach ($todaysOrders as $order): ?>
                <div class="order" data-uid="<?php echo $order['uid']; ?>" data-order='<?php echo json_encode($order); ?>'>
                    <strong><?php echo htmlspecialchars($order['team']); ?></strong><br>
                    Time: <?php echo formatTime($order['time']); ?>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <div class="details" id="details">
        <span class="close-btn" onclick="closeDetails()">✖</span>
        <div id="detailsContent"></div>
    </div>
</div>

<script>
// make tray size data available to JS
const traySizes = <?php echo json_encode($traySizes); ?>;

const orders = document.querySelectorAll('.order');
const orderMap = {};
orders.forEach(order => orderMap[order.dataset.uid] = JSON.parse(order.dataset.order));
const details = document.getElementById('details');
const detailsContent = document.getElementById('detailsContent');

function closeDetails() {
    details.classList.remove('active');
    detailsContent.innerHTML = '';
}

orders.forEach(order => {
    order.addEventListener('click', () => {
        const data = orderMap[order.dataset.uid];
        details.classList.add('active');
       detailsContent.innerHTML = `
    <div class="cheatsheet">
        <strong>Color Key:</strong><br>
        <span class="hot">Hot Food</span>
        <span class="cold">Cold Food (incl. Salad & Wraps)</span>
        <span class="dessert">Dessert</span>
        <span class="drink">Drink</span>
        <span class="box-meal">Box Meal</span>
        <span class="sauce">Sauces/Dressings</span>
        <span class="utensils">Utensils</span>
        <span class="highlight-field">Order Info</span>
    </div>
    <h2>${escapeHtml(data.team)}</h2>
    <p><strong class="highlight-field">Order Type:</strong> ${escapeHtml(data.method)}</p>
    <p><strong class="highlight-field">Time:</strong> ${escapeHtml(formatTime(data.time))}</p>
    <p><strong>Sandwiches (Hot):</strong><br>${highlightItems(data.sandwiches)}</p>
    <p><strong>Other Food Items:</strong><br>${highlightItems(data.food_items)}</p>
    <p><strong>Box Meals:</strong><br>${formatBoxMeals(data.meal_boxes)}</p>
    <p><strong>Sauces:</strong><br>${formatSauces(data.sauces_dressings)}</p>
    <p><strong>Drinks:</strong><br>${highlightItems(data.drinks)}</p>
    <p><strong>Utensils:</strong><br>${getUtensils(data)}</p>
    <p><strong>Guest Count:</strong> ${escapeHtml(data.guest_count || 'N/A')}</p>
    <p><strong>Paper Goods:</strong> ${escapeHtml(data.paper_goods || 'N/A')}</p>
    <p><strong>Pickles on Side:</strong> ${escapeHtml(data.pickles)}</p>
    <p><strong>Hot Bag(s):</strong> ${escapeHtml(data.hotbags)}</p>
    <p><strong>Contact:</strong> ${escapeHtml(data.contact)} (${escapeHtml(data.phone)})</p>
    <p><strong>Created By:</strong> ${escapeHtml(data.created_by)}</p>
`;
    });
});

function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
}

// --- Highlight items and trays ---
function highlightItems(text) {
    if (!text || text === 'N/A') return '<em>None</em>';
    return text.split(/<br\s*\/?>|\n/).map(lineRaw => {
        const line = lineRaw.trim();
        if (!line) return '';
        const lower = line.toLowerCase();
        let trayHtml = '';
        for (const trayName in traySizes) {
            if (lower.includes(trayName)) {
                const sizeFound = Object.keys(traySizes[trayName]).find(size => new RegExp('\\b' + size + '\\b', 'i').test(line));
                if (sizeFound) {
                    const parts = [];
                    for (const [k, v] of Object.entries(traySizes[trayName][sizeFound])) {
                        parts.push(`${k}: ${v}`);
                    }
                    trayHtml = parts.join(' • ');
                }
                break;
            }
        }
        let itemClass = 'hot';
        if (/(cookie|brownie)/i.test(lower)) itemClass = 'dessert';
        else if (/(tea|lemonade|drink|soda|water|juice|milk)/i.test(lower)) itemClass = 'drink';
        else if (/(cold|cool|wrap|salad|kale|fruit)/i.test(lower)) itemClass = 'cold';
        if (lower.includes('tray') && trayHtml) {
            const idSafe = 'tray_' + Math.random().toString(36).slice(2,9);
            return `<div class="${itemClass}">
                        <div class="tray-toggle" onclick="toggleTrayDetails('${idSafe}', this)">
                            ${escapeHtml(line)} <span class="arrow" id="${idSafe}_arrow">▼</span>
                        </div>
                        <div id="${idSafe}" class="tray-details">${escapeHtml(trayHtml)}</div>
                    </div>`;
        }
        return `<div class="${itemClass}">${escapeHtml(line)}</div>`;
    }).join('');
}

function toggleTrayDetails(id, triggerEl) {
    const detailsEl = document.getElementById(id);
    const arrowEl = document.getElementById(id + '_arrow');
    if (!detailsEl) return;
    if (detailsEl.style.display === 'block') {
        detailsEl.style.display = 'none';
        if (arrowEl) arrowEl.textContent = '▼';
    } else {
        detailsEl.style.display = 'block';
        if (arrowEl) arrowEl.textContent = '▲';
    }
}

// --- Box meals formatter ---
function formatBoxMeals(text) {
    if (!text || text === 'N/A') return '<em>None</em>';
    return text.split(/<br\s*\/?>|\n/).map(lineRaw => {
        const line = lineRaw.trim();
        if (!line) return '';
        const match = line.match(/(\d+)\s*x\s*(.*)/i);
        const qty = match ? match[1] : '1';
        const item = match ? match[2] : line;
        const parts = item.split(/w\/|with/i);
        const main = parts[0].trim();
        const contentsPart = parts[1] ? parts[1].trim() : '';
        const contents = contentsPart
    ? contentsPart.split(/\s*(?:,|&|\band\b)\s*/i).map(s => s.trim()).filter(Boolean)
    : [];

        const mainLower = main.toLowerCase();
        let mainClass = 'hot';
        if (/(cookie|brownie)/i.test(mainLower)) mainClass = 'dessert';
        else if (/(tea|lemonade|drink|soda|water|juice|milk)/i.test(mainLower)) mainClass = 'drink';
        else if (/(cold|cool|wrap|salad|kale|fruit)/i.test(mainLower)) mainClass = 'cold';
        const subHTML = contents.map(sub => {
            const lc = sub.toLowerCase();
            let subClass = 'hot';
            if (/(cookie|brownie)/i.test(lc)) subClass = 'dessert';
            else if (/(tea|lemonade|drink|soda|water|juice|milk)/i.test(lc)) subClass = 'drink';
            else if (/(cold|cool|wrap|salad|kale|fruit)/i.test(lc)) subClass = 'cold';
            return `<div class="${subClass}">${escapeHtml(sub)}</div>`;
        }).join('');
        return `<div class="box-meal"><strong>${qty} x ${escapeHtml(main)}</strong>${subHTML}</div>`;
    }).join('');
}


// --- Sauces as dropdown ---
function formatSauces(data) {
    if (!data) return '<em>None</em>';

    let lines = [];

    // normalize array of objects or strings
    if (Array.isArray(data)) {
        data.forEach(s => {
            if (typeof s === 'object' && s !== null && 'item' in s) {
                lines.push(`${s.qty || 1} x ${s.item}`);
            } else if (typeof s === 'string') {
                lines.push(s);
            }
        });
    } else if (typeof data === 'string') {
        lines = data.split(/<br\s*\/?>|\n/).map(s => s.trim()).filter(Boolean);
    }

    if (lines.length === 0) return '<em>None</em>';

    // create a unique ID for the dropdown
    const idSafe = 'sauces_' + Math.random().toString(36).slice(2, 9);

    return `
        <div class="tray-toggle" onclick="toggleTrayDetails('${idSafe}', this)">
            Sauces/Dressings <span class="arrow" id="${idSafe}_arrow">▼</span>
        </div>
        <div id="${idSafe}" class="tray-details">
            ${lines.map(line => `<div class="sauce">${escapeHtml(line)}</div>`).join('')}
        </div>
    `;
}



// --- Utensils ---
function getUtensils(order) {
    const utensils = [];

    // Count trays: any line in sandwiches, food_items, or meal_boxes that contains "tray"
    let trayCount = 0;
    ['sandwiches', 'food_items', 'meal_boxes'].forEach(key => {
        if (order[key] && order[key] !== 'N/A') {
            trayCount += (order[key].match(/tray/gi) || []).length;
        }
    });

    if (trayCount > 0) utensils.push(`${trayCount} x Tongs`);

    // Plates: only if paper goods = yes
    if (order.paper_goods && order.paper_goods.toLowerCase() === 'yes') {
        let guestCount = parseInt(order.guest_count);
        if (isNaN(guestCount)) guestCount = 1; // fallback
        utensils.push(`${guestCount} x Plates`);
    }

    return utensils.map(u => `<div class="utensils">${escapeHtml(u)}</div>`).join('');
}

// --- Time format ---
function formatTime(time24) {
    if (!time24) return '';
    if (/am|pm/i.test(time24)) return time24;
    const d = new Date('1970-01-01T' + time24 + 'Z');
    return d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
}
</script>
</body>
</html>
