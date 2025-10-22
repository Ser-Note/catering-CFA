<?php
// --- Gmail IMAP settings ---
$hostname = '{imap.gmail.com:993/imap/ssl/novalidate-cert}Catering';
$username = 'cfa02348@gmail.com';
$password = 'qyhjujpaqkvktube'; // 16-char app password
$debugMode = true;
$debugLog = __DIR__ . '/debug_log.txt';

// Connect to inbox
$inbox = imap_open($hostname, $username, $password) or die('Cannot connect: ' . imap_last_error());

// --- Helper Functions ---
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
    $text = '';
    if (!isset($structure->parts)) {
        $text = decodeBody(imap_fetchbody($inbox, $email_number, 1), $structure->encoding);
    } else {
        foreach ($structure->parts as $i => $part) {
            if ($part->type == 0) {
                $text = decodeBody(imap_fetchbody($inbox, $email_number, $i + 1), $part->encoding);
                if (strtolower($part->subtype) == 'plain') break;
            }
        }
    }
    if (stripos($text, '<html') !== false || stripos($text, '<body') !== false) {
        $text = preg_replace('/<(br|\/p)>/i', "\n", $text);
        $text = html_entity_decode(strip_tags($text));
    }
    // Normalize whitespace + remove weird Unicode spaces
    $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
    $text = preg_replace('/[^\PC\s]/u', '', $text);
    $text = str_replace(["\xC2\xA0", "\u{00A0}", "\xE2\x80\x83", "\xE2\x80\x82", "\xE2\x80\x84", "\xE2\x80\x85",
                         "\xE2\x80\x86", "\xE2\x80\x88", "\xE2\x80\x89", "\xE2\x80\x8A"], ' ', $text);
    return preg_replace("/\r\n|\r/", "\n", $text);
}

function extract_between($text, $start, $end = null) {
    $pattern = '/' . preg_quote($start, '/') . '(.*?)' . ($end ? preg_quote($end, '/') : '$') . '/s';
    return preg_match($pattern, $text, $matches) ? trim($matches[1]) : '';
}

function extract_items_block($text) {
    $patterns = [
        ['Item Name', 'Subtotal'],
        ['Item Name', 'Sub Total'],
        ['Item Name', 'Total'],
        ['Item Name', 'Tax'],
    ];
    foreach ($patterns as [$start, $end]) {
        $pattern = '/' . preg_quote($start, '/') . '(.*?)' . preg_quote($end, '/') . '/is';
        if (preg_match($pattern, $text, $m)) return trim($m[1]);
    }
    // fallback: Item Name to end
    if (preg_match('/Item Name(.*)$/is', $text, $m)) return trim($m[1]);
    return '';
}

function cleanField($str) {
    $str = preg_replace('/^\*+/', '', trim($str));
    return trim(preg_replace('/\s+/', ' ', $str));
}

function getOrderDateTime($message, $orderType) {
    $lines = preg_split("/\n/", str_replace(["\r", "\t", "&nbsp;"], ' ', $message));
    foreach ($lines as $i => $line) {
        if (($orderType === 'Pickup' && stripos($line, 'Pickup Time') !== false) ||
            ($orderType === 'Delivery' && stripos($line, 'Delivery Time') !== false)) {
            for ($j = $i + 1; $j < count($lines); $j++) {
                $nextLine = trim(preg_replace('/\*+/', '', $lines[$j]));
                if ($nextLine !== '') {
                    if (preg_match('/(?:(\w+)\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:at\s*)?([\d:]+\s*(?:am|pm)?)/i', $nextLine, $m)) {
                        $date = $m[1] ? "{$m[1]} {$m[2]}" : $m[2];
                        return ['date' => $date, 'time' => $m[3] ?? ''];
                    } else {
                        return ['date' => $nextLine, 'time' => ''];
                    }
                }
            }
        }
    }
    return ['date' => '', 'time' => ''];
}

// --- Fetch emails ---
$emails = imap_search($inbox, 'ALL');
$orders = [];
$id = 1;

if ($emails) {
    foreach ($emails as $email_number) {
        $header = imap_headerinfo($inbox, $email_number);
        if (stripos($header->subject ?? '', 'Incoming Catering Order') === false) continue;

        $message = getMessageBody($inbox, $email_number);
        $orderType = stripos($message, 'Pickup Order') !== false ? 'Pickup' : 'Delivery';
        $dt = getOrderDateTime($message, $orderType);
        $dateField = $dt['date'] ?: '*';
        $timeField = $dt['time'] ?: '*';

        $destination = 'N/A';
        if ($orderType === 'Delivery' && preg_match('/Delivery Address\s*[:\s]*\r?\n\s*([^\r\n]+)/i', $message, $destMatch)) {
            $destination = cleanField($destMatch[1]);
        }

        // --- Customer info ---
        $custBlock = extract_between($message, 'Customer Information', 'Item Name');
        $linesCust = array_filter(array_map('trim', preg_split("/\n/", $custBlock)));

        $customer_name = $phone_number = $customer_email = '';
        $guest_count = 'N/A';
        $paper_goods = 'No';

        foreach ($linesCust as $line) {
            $line = cleanField($line);
            if (stripos($line, 'Guest Count') !== false) $guest_count = cleanField(str_replace('Guest Count:', '', $line));
            elseif (stripos($line, 'Paper Goods') !== false) $paper_goods = cleanField(str_replace('Paper Goods:', '', $line));
            elseif (filter_var($line, FILTER_VALIDATE_EMAIL)) $customer_email = $line;
            elseif (preg_match('/^\+?\d{10,}/', preg_replace('/\D+/', '', $line))) $phone_number = $line;
            elseif (!$customer_name) $customer_name = $line;
        }

        // --- Items ---
        $itemsBlock = extract_items_block($message);
        $itemsBlock = mb_convert_encoding($itemsBlock, 'UTF-8', 'UTF-8');
        $itemsBlock = preg_replace('/[^\PC\s]/u', '', $itemsBlock);
        $itemsBlock = preg_replace("/[ \t]+/", " ", $itemsBlock);
        $itemsBlock = preg_replace("/\r\n|\r/", "\n", $itemsBlock);

        $rawLines = array_map('trim', explode("\n", $itemsBlock));
        $lines = [];
        foreach ($rawLines as $l) {
            if ($l === '') continue;
            $lh = strtolower(preg_replace('/\s+/', ' ', $l));
            if (in_array($lh, ['quantity qty price','quantity price','qty price'])) continue;
            if (preg_match('/^(subtotal|tax|total)\b/i', $l)) continue;
            $lines[] = $l;
        }

        $food_items = [];
        $drink_items = [];
        $sauces_dressings = [];

        $pushItem = function($name, $qty) use (&$food_items, &$drink_items, &$sauces_dressings) {
            $name = trim($name);
            if ($name === '') return;
            $qty = (int)$qty ?: 1;
            $lower = strtolower($name);
            if ((strpos($lower,'sauce')!==false || strpos($lower,'dressing')!==false ||
                 strpos($lower,'ketchup')!==false || strpos($lower,'mayo')!==false ||
                 strpos($lower,'honey')!==false || strpos($lower,'jam')!==false)
                && strpos($lower,'gallon')===false && strpos($lower,'chips')===false) {
                $sauces_dressings[] = ['item'=>$name,'qty'=>$qty];
            } elseif (strpos($lower,'gallon')!==false) {
                $drink_items[] = ['item'=>$name,'qty'=>$qty];
            } else {
                $food_items[] = ['item'=>$name,'qty'=>$qty];
            }
        };

        for ($i=0; $i<count($lines); $i++) {
            $line = $lines[$i];
            if (preg_match('/^(.*\S)\s+(\d+)\s*(?:\$[\d,.\-]+)?$/u', $line, $m)) {
                $pushItem($m[1], $m[2]); continue;
            }
            $name = $line; $qty = 1;
            if (($i+1)<count($lines) && preg_match('/^(\d+)(?:\s*\$[\d,.\-]+)?$/', $lines[$i+1], $qm)) {
                $qty = (int)$qm[1]; $i++;
            }
            if (!preg_match('/^\d+(?:\s*\$[\d,.\-]+)?$/', $name)) $pushItem($name,$qty);
        }

        preg_match('/Total\s*\$?([\d.,]+)/i', $message, $totalMatch);
        $total = '$'.($totalMatch[1] ?? '0.00');

        // --- Debug logging ---
        if ($debugMode && empty($food_items) && empty($drink_items) && empty($sauces_dressings)) {
            file_put_contents($debugLog, "FAILED PARSE: Order #$id\n$message\n\n", FILE_APPEND);
        }

        $orders[] = [
            'id' => $id++,
            'order_type' => $orderType,
            'date' => $dateField,
            'time' => $timeField,
            'destination' => $destination,
            'customer_name' => $customer_name ?: '*',
            'phone_number' => $phone_number ?: '*',
            'customer_email' => $customer_email ?: '*',
            'guest_count' => $guest_count ?: 'N/A',
            'paper_goods' => $paper_goods ?: 'No',
            'food_items' => $food_items,
            'drink_items' => $drink_items,
            'sauces_dressings' => $sauces_dressings,
            'total' => $total
        ];
    }
}

// --- Merge with existing JSON ---
$path = __DIR__ . '/../orders.json';
$existingOrders = file_exists($path) ? json_decode(file_get_contents($path), true) ?: [] : [];

foreach ($orders as $newOrder) {
    $exists = false;
    foreach ($existingOrders as $oldOrder) {
        if ($oldOrder['customer_email'] === $newOrder['customer_email'] &&
            $oldOrder['date'] === $newOrder['date'] &&
            $oldOrder['total'] === $newOrder['total']) { $exists = true; break; }
    }
    if (!$exists) $existingOrders[] = $newOrder;
}

// Reassign IDs
foreach ($existingOrders as $i => &$order) { $order['id'] = $i+1; }
unset($order);

// Save JSON
file_put_contents($path, json_encode($existingOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));

echo "<pre>Saved ".count($existingOrders)." total orders to $path\n";
print_r($orders);
echo "</pre>";

if (is_resource($inbox)) imap_close($inbox);
?>
