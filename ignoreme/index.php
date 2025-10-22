<?php
$hostname = '{imap.gmail.com:993/imap/ssl}INBOX';
$username = 'zixxelz@gmail.com';
$password = 'stuq nrqt idzd tnnp'; // <-- 16-character app password

$inbox = imap_open($hostname, $username, $password) or die('Cannot connect to Gmail: ' . imap_last_error());

// Helper functions
function extract_between($text, $start, $end = null) {
    $pattern = '/' . preg_quote($start, '/') . '(.*?)' . ($end ? preg_quote($end, '/') : '$') . '/s';
    if (preg_match($pattern, $text, $matches)) return trim($matches[1]);
    return '';
}

function decodeBody($body, $encoding) {
    switch ($encoding) {
        case 1: case 2: return $body;
        case 3: return base64_decode($body);
        case 4: return quoted_printable_decode($body);
        default: return $body;
    }
}

function getMessageBody($inbox, $email_number) {
    $structure = imap_fetchstructure($inbox, $email_number);
    if (!isset($structure->parts)) {
        $body = imap_fetchbody($inbox, $email_number, 1);
        return decodeBody($body, $structure->encoding);
    }
    foreach ($structure->parts as $partNumber => $part) {
        if ($part->type == 0) {
            $body = imap_fetchbody($inbox, $email_number, $partNumber + 1);
            $text = decodeBody($body, $part->encoding);
            if (strtolower($part->subtype) == 'plain') return $text;
            elseif (strtolower($part->subtype) == 'html') {
                $text = preg_replace('/<(br|\/p)>/i', "\n", $text);
                return html_entity_decode(strip_tags($text));
            }
        }
    }
    return '';
}

function getLastOrderBlock($message) {
    if (preg_match_all('/Catering (Pickup|Delivery) Order for \d+/i', $message, $matches, PREG_OFFSET_CAPTURE)) {
        $lastMatch = end($matches[0]);
        $startPos = $lastMatch[1];
        return substr($message, $startPos);
    }
    return $message;
}

function getPickupOrDeliveryTime($message, $orderType) {
    $message = str_replace(["\r", "\t", "&nbsp;"], ' ', $message);
    $lines = preg_split("/\n/", $message);
    foreach ($lines as $i => $line) {
        if ($orderType === 'Pickup' && stripos($line, 'Pickup Time') !== false) {
            for ($j = $i+1; $j < count($lines); $j++) {
                $nextLine = trim($lines[$j]);
                if ($nextLine !== '') {
                    $parts = preg_split('/\s+at\s+/i', $nextLine);
                    $timePart = trim($parts[1] ?? $parts[0]);
                    $timePart = explode('*', $timePart)[0];
                    return trim($timePart);
                }
            }
        }
        if ($orderType === 'Delivery' && stripos($line, 'Delivery Time') !== false) {
            for ($j = $i+1; $j < count($lines); $j++) {
                $nextLine = trim($lines[$j]);
                if ($nextLine !== '') {
                    $parts = preg_split('/\s+at\s+/i', $nextLine);
                    $timePart = trim($parts[1] ?? $parts[0]);
                    $timePart = explode('*', $timePart)[0];
                    return trim($timePart);
                }
            }
        }
    }
    return '';
}

// Fetch emails
$emails = imap_search($inbox, 'SUBJECT "Incoming Catering Order"');
$orders = [];

if ($emails) {
    foreach ($emails as $email_number) {
        $message = getMessageBody($inbox, $email_number);
        $messageBlock = getLastOrderBlock($message);
        $orderType = (stripos($messageBlock, 'Pickup Order') !== false) ? 'Pickup' : 'Delivery';

        $customerBlock = extract_between($messageBlock, 'Customer Information', 'Item Name');
        $lines = array_values(array_filter(array_map('trim', explode("\n", $customerBlock))));
        $customerName = $lines[0] ?? '';
        $phone = $lines[1] ?? '';
        $emailAddress = $lines[2] ?? '';
        $guestCount = '';
        foreach ($lines as $line) {
            if (stripos($line, 'Guest Count') !== false) $guestCount = trim(str_replace('Guest Count:', '', $line));
        }

        $pickupTime = $deliveryTime = '';
        $paidStatus = 'Paid'; // Replace this with real extraction if your emails include unpaid/paid
        if ($orderType === 'Pickup') {
            $pickupTime = getPickupOrDeliveryTime($messageBlock, 'Pickup');
        } else {
            $deliveryTime = getPickupOrDeliveryTime($messageBlock, 'Delivery');
        }

        $itemBlock = extract_between($messageBlock, 'Item Name', 'Subtotal');
        $itemBlock = preg_replace('/\t+/', ' ', $itemBlock);
        $itemLines = preg_split('/\n+/', trim($itemBlock));
        $items = [];
        foreach ($itemLines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            if (preg_match('/^(.*?)(\d+)\s*\$?([\d.]+)?$/', $line, $m)) $items[] = trim($m[1]) . ' × ' . trim($m[2]);
        }
        $itemSummary = implode('; ', $items);

        preg_match('/Total\s*\$([\d.,]+)/', $messageBlock, $totalMatch);
        $total = $totalMatch[1] ?? '';

        $orders[] = [
            'customerName'=>$customerName,
            'phone'=>$phone,
            'email'=>$emailAddress,
            'guestCount'=>$guestCount,
            'items'=>$itemSummary,
            'total'=>$total,
            'orderType'=>$orderType,
            'pickupTime'=>$pickupTime,
            'deliveryTime'=>$deliveryTime,
            'paidStatus'=>$paidStatus
        ];

        imap_setflag_full($inbox, $email_number, "\\Seen");
    }
}

imap_close($inbox);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>FOH Catering Dashboard</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<h1>Front of House Catering Orders</h1>

<?php if(empty($orders)): ?>
<p style="text-align:center;">No new catering orders.</p>
<?php else: ?>
<?php foreach($orders as $order): ?>
<div class="order-card" onclick="toggleDetails(this)">
    <div class="order-header">
        <h2><?=htmlspecialchars($order['customerName'])?></h2>
        <span class="<?= strtolower($order['orderType']) ?>"><?=htmlspecialchars($order['orderType'])?></span>
    </div>
    <div class="order-summary">
        <?php if($order['orderType']==='Pickup'): ?>
            <div>Pickup Time: <?=htmlspecialchars($order['pickupTime'])?></div>
        <?php else: ?>
            <div>Delivery Time: <?=htmlspecialchars($order['deliveryTime'])?></div>
        <?php endif; ?>
        <div>Total: $<?=htmlspecialchars($order['total'])?></div>
        <div>Paid Status: <?=htmlspecialchars($order['paidStatus'])?></div>
    </div>
    <div class="order-details">
        <div><strong>Phone:</strong> <?=htmlspecialchars($order['phone'])?></div>
        <div><strong>Email:</strong> <?=htmlspecialchars($order['email'])?></div>
        <div><strong>Guest Count:</strong> <?=htmlspecialchars($order['guestCount'])?></div>
        <div><strong>Items & Sauces/Dressings:</strong>
            <ul class="items-list">
                <?php foreach(explode('; ', $order['items']) as $item): ?>
                    <li><?=htmlspecialchars($item)?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>

<script src="script.js"></script>
</body>
</html>
