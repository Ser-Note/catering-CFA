// --- DOM elements ---
const orders = document.querySelectorAll('.order');
const orderMap = {};
const details = document.getElementById('details');
const detailsContent = document.getElementById('detailsContent');

// --- Build orderMap ---
orders.forEach(order => {
    try {
        orderMap[order.dataset.uid] = JSON.parse(order.dataset.order);
    } catch (e) {
        console.error('Failed to parse order JSON', e, order.dataset.order);
    }
});

// --- UI: create a "Show completed" filter control inserted above details ---
(function createFilterControl(){
    const wrapper = document.createElement('div');
    wrapper.id = 'orders-filter-controls';
    wrapper.style.margin = '8px 0';
    
    // Determine the completion field based on viewMode
    const completedField = (typeof viewMode !== 'undefined' && viewMode === 'foh') ? 'completed_foh' : 'completed_boh';
    
    wrapper.innerHTML = `
        <label style="font-weight:600; margin-right:12px;"><input type="checkbox" id="showCompletedCb"> Show completed orders</label>
    `;
    if (details && details.parentNode) details.parentNode.insertBefore(wrapper, details);
    const cb = document.getElementById('showCompletedCb');
    let showCompleted = false;
    cb.addEventListener('change', () => {
        showCompleted = cb.checked;
        orders.forEach(o => {
            try {
                const d = orderMap[o.dataset.uid];
                if (d && d[completedField]) {
                    o.style.display = showCompleted ? '' : 'none';
                }
            } catch (e) {}
        });
    });
})();

// --- Close details ---
function closeDetails() {
    details.classList.remove('active');
    detailsContent.innerHTML = '';
}

// --- Click handler for orders ---
orders.forEach(order => {
    order.addEventListener('click', () => {
        const data = orderMap[order.dataset.uid];
        if (!data) return;
        details.classList.add('active');
        detailsContent.innerHTML = renderOrderDetails(data);
    });
});

// --- Add per-order Paid and Completed controls (persist via POST /orders/update) ---
(function attachControlsToOrders(){
    // Determine the completion field based on viewMode
    const completedField = (typeof viewMode !== 'undefined' && viewMode === 'foh') ? 'completed_foh' : 'completed_boh';
    const completedLabel = (typeof viewMode !== 'undefined' && viewMode === 'foh') ? 'Completed (FOH)' : 'Completed (BOH)';
    
    orders.forEach(order => {
        const data = orderMap[order.dataset.uid];
        if (!data) return;

        // container for controls
        const ctrl = document.createElement('div');
        ctrl.className = 'order-controls';
        ctrl.style.display = 'flex';
        ctrl.style.gap = '8px';
        ctrl.style.alignItems = 'center';
        ctrl.style.marginTop = '6px';

        // Paid checkbox
        const paidLabel = document.createElement('label');
        paidLabel.style.fontSize = '12px';
        const paidCb = document.createElement('input');
        paidCb.type = 'checkbox';
        paidCb.checked = !!data.paid;
        paidCb.className = 'paid-toggle';
        paidLabel.appendChild(paidCb);
        paidLabel.appendChild(document.createTextNode(' Paid'));

        // Completed checkbox (acts like a slide/complete toggle)
        const compLabel = document.createElement('label');
        compLabel.style.fontSize = '12px';
        const compCb = document.createElement('input');
        compCb.type = 'checkbox';
        compCb.checked = !!data[completedField];
        compCb.className = 'completed-toggle';
        compLabel.appendChild(compCb);
        compLabel.appendChild(document.createTextNode(' ' + completedLabel));

        ctrl.appendChild(paidLabel);
        ctrl.appendChild(compLabel);

        // append controls to order element (if not already appended)
        if (!order.querySelector('.order-controls')) order.appendChild(ctrl);

        // update display for completed
        const showCompletedCb = document.getElementById('showCompletedCb');
        if (data[completedField] && showCompletedCb && !showCompletedCb.checked) {
            order.style.display = 'none';
        }

        // helper to determine source and id
        let parsedSource = 'json'; // default fallback
        if (order.dataset.uid) {
            if (order.dataset.uid.indexOf('json_') === 0) {
                parsedSource = 'email';
            } else if (order.dataset.uid.indexOf('catering_') === 0) {
                parsedSource = 'catering';
            }
        }
        const orderId = data.id || (order.dataset.uid || '').replace(/^(json_|catering_|csv_)/, '');

        function persistUpdate(newPaid, newCompletedValue){
            const updatePayload = { source: parsedSource, id: orderId, paid: newPaid };
            // Add the appropriate completion field based on viewMode
            if (completedField === 'completed_foh') {
                updatePayload.completed_foh = newCompletedValue;
            } else {
                updatePayload.completed_boh = newCompletedValue;
            }
            
            fetch('/orders/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            }).then(r => r.json()).then(j => {
                if (!j || !j.success) console.error('Failed updating order', j);
            }).catch(err => console.error('Update error', err));
        }

        paidCb.addEventListener('change', (e) => {
            data.paid = e.target.checked;
            persistUpdate(data.paid, data[completedField]);
            // small visual cue
            if (data.paid) order.classList.add('paid'); else order.classList.remove('paid');
        });

        compCb.addEventListener('change', (e) => {
            data[completedField] = e.target.checked;
            persistUpdate(data.paid, data[completedField]);
            // hide if completed and filter says hide
            const showCompleted = document.getElementById('showCompletedCb') && document.getElementById('showCompletedCb').checked;
            if (data[completedField] && !showCompleted) order.style.display = 'none';
            if (!data[completedField]) order.style.display = '';
            if (data[completedField]) order.classList.add('completed'); else order.classList.remove('completed');
        });

        // --- Touch/swipe handlers for iPad: swipe right = toggle Paid, swipe left = toggle Completed ---
        (function addSwipeHandlers(){
            let touchStartX = 0, touchStartY = 0, touchCurrentX = 0, touching = false;
            order.addEventListener('touchstart', (ev) => {
                const t = ev.touches[0];
                touchStartX = t.clientX; touchStartY = t.clientY; touchCurrentX = touchStartX; touching = true;
                order.style.transition = 'none';
            }, { passive: true });

            order.addEventListener('touchmove', (ev) => {
                if (!touching) return;
                const t = ev.touches[0];
                const dx = t.clientX - touchStartX;
                const dy = t.clientY - touchStartY;
                // only treat horizontal swipes
                if (Math.abs(dx) > Math.abs(dy)) {
                    ev.preventDefault();
                    touchCurrentX = t.clientX;
                    order.style.transform = `translateX(${dx}px)`;
                    order.style.opacity = `${Math.max(0.6, 1 - Math.abs(dx)/400)}`;
                }
            }, { passive: false });

            order.addEventListener('touchend', () => {
                touching = false;
                const dx = touchCurrentX - touchStartX;
                const threshold = 100; // px required to trigger action
                // animate back to place
                order.style.transition = 'transform 200ms ease, opacity 200ms ease';
                order.style.transform = '';
                order.style.opacity = '';

                if (dx > threshold) {
                    // swipe right -> toggle Paid
                    data.paid = !data.paid;
                    paidCb.checked = data.paid;
                    persistUpdate(data.paid, data[completedField]);
                    order.classList.toggle('paid', data.paid);
                    // quick flash to indicate action
                    try { order.animate([{ background: data.paid ? '#e6ffed' : '#fff' }, { background: '' }], { duration: 400 }); } catch (e) {}
                } else if (dx < -threshold) {
                    // swipe left -> toggle Completed
                    data[completedField] = !data[completedField];
                    compCb.checked = data[completedField];
                    persistUpdate(data.paid, data[completedField]);
                    order.classList.toggle('completed', data[completedField]);
                    const showCompleted = document.getElementById('showCompletedCb') && document.getElementById('showCompletedCb').checked;
                    if (data[completedField] && !showCompleted) order.style.display = 'none';
                    if (!data[completedField]) order.style.display = '';
                    try { order.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 300 }); } catch (e) {}
                }
            }, { passive: true });
        })();
    });
})();

// --- Render order details HTML ---
function renderOrderDetails(data) {
    return `
        <div class="cheatsheet">
            <strong>📋 Color-Coded Item Guide:</strong><br>
            <span class="hot">🔥 Hot Food</span>
            <span class="cold">❄️ Cold Food</span>
            <span class="dessert">🍪 Dessert</span>
            <span class="drink">🥤 Drink</span>
            <span class="box-meal">📦 Box Meal</span>
            <span class="sauce">🥫 Sauces</span>
            <span class="utensils">🍴 Utensils</span>
        </div>
        
        <h2>📝 ${escapeHtml(data.team)}</h2>
        
        <div style="background: #fff3e0; padding: 14px; border-radius: 8px; margin-bottom: 16px; border-left: 5px solid #ff9800;">
            <p style="margin: 4px 0;"><strong class="highlight-field">⏰ TIME:</strong> <span style="font-size: 20px; font-weight: 700; color: #d32323;">${escapeHtml(formatTime(data.time))}</span></p>
            <p style="margin: 4px 0;"><strong class="highlight-field">📍 ORDER TYPE:</strong> <span style="font-size: 18px; font-weight: 600;">${escapeHtml(data.method)}</span></p>
            <p style="margin: 4px 0;"><strong class="highlight-field">👥 GUEST COUNT:</strong> <span style="font-size: 18px; font-weight: 600;">${escapeHtml(data.guest_count || 'N/A')}</span></p>
            ${data.delivery_address && data.delivery_address !== 'N/A' ? `<p style="margin: 4px 0;"><strong class="highlight-field">🚚 DELIVERY ADDRESS:</strong> <span style="font-size: 15px; font-weight: 600;">${escapeHtml(data.delivery_address)}</span></p>` : ''}
        </div>
        
        ${data.special_instructions && data.special_instructions.trim() ? `
        <div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 5px solid #ffc107; border: 2px solid #ffc107;">
            <p style="margin: 0;"><strong style="color: #856404; font-size: 18px; text-transform: uppercase;">⚠️ SPECIAL INSTRUCTIONS:</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600; color: #856404; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(data.special_instructions)}</p>
        </div>
        ` : ''}

        <div style="border: 2px solid #e0e0e0; padding: 16px; border-radius: 8px; background: #fafafa; margin-bottom: 16px;">
            <p><strong>🔥 HOT SANDWICHES:</strong></p>
            <div style="margin-left: 10px;">${highlightItems(data.sandwiches)}</div>
            
            <p style="margin-top: 16px;"><strong>🍽️ OTHER FOOD ITEMS:</strong></p>
            <div style="margin-left: 10px;">${highlightItems(data.food_items)}</div>
            
            <p style="margin-top: 16px;"><strong>📦 BOX MEALS:</strong></p>
            <div style="margin-left: 10px;">${formatBoxMeals(data.meal_boxes)}</div>
            
            <p style="margin-top: 16px;"><strong>🥤 DRINKS:</strong></p>
            <div style="margin-left: 10px;">${highlightItems(data.drinks)}</div>
            
            <p style="margin-top: 16px;"><strong>🥫 SAUCES & DRESSINGS:</strong></p>
            <div style="margin-left: 10px;">${formatSauces(data.sauces_dressings)}</div>
            
            <p style="margin-top: 16px;"><strong>🍴 UTENSILS & SUPPLIES:</strong></p>
            <div style="margin-left: 10px;">${getUtensils(data)}</div>
        </div>

        <div style="background: #e8f5e9; padding: 14px; border-radius: 8px; border-left: 5px solid #4caf50;">
            <p style="margin: 6px 0;"><strong>📄 Paper Goods:</strong> ${escapeHtml(data.paper_goods || 'N/A')}</p>
            <p style="margin: 6px 0;"><strong>🥒 Pickles on Side:</strong> ${escapeHtml(data.pickles)}</p>
            <p style="margin: 6px 0;"><strong>🔥 Hot Bag(s):</strong> ${escapeHtml(data.hotbags)}</p>
        </div>

        <div style="background: #e3f2fd; padding: 14px; border-radius: 8px; margin-top: 16px; border-left: 5px solid #2196f3;">
            <p style="margin: 6px 0;"><strong>📞 Contact:</strong> ${escapeHtml(data.contact)}</p>
            <p style="margin: 6px 0;"><strong>☎️ Phone:</strong> ${formatPhoneLink(data.phone)}</p>
            <p style="margin: 6px 0;"><strong>👤 Created By:</strong> ${formatEmailLink(data.created_by)}</p>
        </div>
    `;
}

// --- Utility functions ---
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, m =>
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]
    );
}

function formatTime(time24) {
  if (!time24) return '';
  if (/am|pm/i.test(time24)) return time24; // already formatted

  // ✅ ensure correct parsing even for 24-hour values
  const [hours, minutes] = time24.split(':').map(Number);
  const d = new Date();
  d.setHours(hours);
  d.setMinutes(minutes || 0);

  // ✅ return formatted in "1:30 PM" format
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

// --- Format phone number as clickable tel: link ---
function formatPhoneLink(phone) {
    if (!phone || phone === 'N/A' || phone === '*') return escapeHtml(phone || 'N/A');
    
    // Clean phone number for tel: link (remove formatting characters)
    const cleanPhone = String(phone).replace(/[^\d+]/g, '');
    
    return `<a href="tel:${cleanPhone}" style="color: #1976d2; text-decoration: none; font-weight: 600; border-bottom: 2px solid #1976d2; padding-bottom: 2px;">${escapeHtml(phone)}</a>`;
}

// --- Format email as clickable mailto: link ---
function formatEmailLink(email) {
    if (!email || email === 'N/A') return escapeHtml(email || 'N/A');
    
    // Check if it looks like an email
    if (/@/.test(email)) {
        return `<a href="mailto:${escapeHtml(email)}" style="color: #1976d2; text-decoration: none; font-weight: 600; border-bottom: 2px solid #1976d2; padding-bottom: 2px;">${escapeHtml(email)}</a>`;
    }
    
    return escapeHtml(email);
}


// --- Highlight items and tray logic ---
function highlightItems(text) {
    if (!text || text === 'N/A') return '<em>None</em>';

    // Preserve content inside parentheses so inner newlines/commas (e.g. "1/2 Sweet Tea\n1/2 Lemonade")
    // don't get split into separate items. We replace commas/newlines inside parentheses
    // with safe placeholders, split, then restore them.
    const COMMA_TOKEN = '<<__COMMA__>>';
    const pre = String(text).replace(/\(([^)]+)\)/g, (m, inner) => {
        const cleaned = inner
            .replace(/,/g, COMMA_TOKEN)            // protect commas inside parens
            .replace(/<br\s*\/??>|\r?\n|\n/g, ' ') // convert inner breaks to spaces
            .replace(/\s+/g, ' ')                 // collapse extra whitespace
            .trim();
        return '(' + cleaned + ')';
    });

    const lines = pre.split(/<br\s*\/??>|\n|,/).map(s => s.trim()).filter(Boolean).map(s => s.replace(new RegExp(COMMA_TOKEN, 'g'), ','));

    return lines.map(line => {
        const lower = line.toLowerCase();
        let trayHtml = '';

        // Check if line contains tray info
        for (const trayName in traySizes) {
            if (lower.includes(trayName)) {
                const sizeFound = Object.keys(traySizes[trayName]).find(size =>
                    new RegExp('\\b' + size + '\\b', 'i').test(line)
                );
                if (sizeFound) {
                    trayHtml = Object.entries(traySizes[trayName][sizeFound])
                                     .map(([k,v]) => `${k}: ${v}`).join(' • ');
                }
                break;
            }
        }

        const itemClass = classifyItem(line);

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

// --- Box meals formatting ---
function formatBoxMeals(text) {
    if (!text || text === 'N/A') return '<em>None</em>';
    
    const lines = text.split(/<br\s*\/?>|\n/).map(s => s.trim()).filter(Boolean);
    
    return lines.map(lineRaw => {
        const line = lineRaw.trim();
        if (!line) return '';
        
        // Match patterns like "25 x Packaged Meal w/ chips, cookies" or just "25 x Packaged Meal"
        const match = line.match(/(\d+)\s*x\s*(.*)/i);
        const qty = match ? match[1] : '1';
        const item = match ? match[2] : line;
        
        // Split on "w/" or "with" to separate main item from contents
        const parts = item.split(/\s*(?:w\/|with)\s*/i);
        const main = parts[0].trim();
        const contentsPart = parts[1] ? parts[1].trim() : '';
        
        // Parse contents - split on commas, "and", or "&"
        const contents = contentsPart
            ? contentsPart.split(/\s*(?:,|&|\band\b)\s*/i)
                .map(s => s.trim())
                .filter(Boolean)
            : [];

        // Classify main item - default to 'box-meal' for anything in this section
        const mainLower = main.toLowerCase();
        let mainClass = 'box-meal';
        
        // Only override if it's clearly not a meal/box/package
        if (!/(meal|box|boxed|package|packaged)/i.test(mainLower)) {
            if (/(cookie|brownie)/i.test(mainLower)) mainClass = 'dessert';
            else if (/(tea|lemonade|drink|soda|water|juice|milk|coffee)/i.test(mainLower)) mainClass = 'drink';
            else if (/(cold|subs|chilled|cool|wrap|salad|kale|fruit)/i.test(mainLower)) mainClass = 'cold';
            else if (/(hot|sandwich|nugget|strip|chicken)/i.test(mainLower)) mainClass = 'hot';
        }
        
        // Build HTML for contents
        const subHTML = contents.map(sub => {
            const lc = sub.toLowerCase();
            let subClass = 'hot';
            if (/(cookie|brownie)/i.test(lc)) subClass = 'dessert';
            else if (/(tea|lemonade|drink|soda|water|juice|milk|coffee)/i.test(lc)) subClass = 'drink';
            else if (/(cold|subs|chilled|cool|wrap|salad|kale|fruit)/i.test(lc)) subClass = 'cold';
            else if (/(chip)/i.test(lc)) subClass = 'cold'; // chips are cold items
            return `<div class="${subClass}" style="margin-left: 20px; font-size: 14px;">• ${escapeHtml(sub)}</div>`;
        }).join('');
        
        return `<div class="${mainClass}"><strong>${qty} x ${escapeHtml(main)}</strong>${subHTML}</div>`;
    }).join('');
}

// --- Sauces formatting ---
function formatSauces(data) {
  if (!data) return '<em>None</em>';
  let lines = [];

  if (Array.isArray(data)) {
    // Handle array of sauce objects or strings
    data.forEach(s => {
      if (s && typeof s === 'object' && 'item' in s) lines.push(`${s.qty || 1} x ${s.item}`);
      else if (typeof s === 'string') lines.push(s);
    });
  } 
  else if (typeof data === 'object') {
    // ✅ Handle object form (e.g., { "Barbecue": 2, "Polynesian": 1 })
    Object.entries(data).forEach(([name, amount]) => {
      lines.push(`${name} x${amount}`);
    });
  } 
  else if (typeof data === 'string') {
    // Handle plain string or HTML-like text
    lines = data.split(/<br\s*\/?>|\n/).map(s => s.trim()).filter(Boolean);
  }

  if (!lines.length) return '<em>None</em>';

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
    let trayCount = 0;
    ['sandwiches','food_items','meal_boxes'].forEach(key => {
        if (order[key] && order[key] !== 'N/A') {
            // Split into lines/items
            const items = String(order[key]).split(/<br\s*\/??>|\n|,/).map(s => s.trim()).filter(Boolean);
            items.forEach(item => {
                if (/tray/i.test(item)) {
                    // Try to extract quantity (e.g. '2 Large Nugget Trays')
                    const qtyMatch = item.match(/^(\d+)\s*x?\s*/i);
                    let qty = 1;
                    if (qtyMatch) {
                        qty = parseInt(qtyMatch[1], 10) || 1;
                    }
                    trayCount += qty;
                }
            });
        }
    });
    if (trayCount) utensils.push(`${trayCount} x Tongs`);
    if (order.paper_goods && order.paper_goods.toLowerCase() === 'yes') {
        let guestCount = parseInt(order.guest_count) || 1;
        utensils.push(`${guestCount} x Plates`);
    }
    return utensils.map(u => `<div class="utensils">${escapeHtml(u)}</div>`).join('');
}

// --- Item classification ---
function classifyItem(text) {
    const lower = text.toLowerCase();
    if (/(cookie|brownie)/i.test(lower)) return 'dessert';
    if (/(tea|lemonade|drink|soda|water|juice|milk|coffee)/i.test(lower)) return 'drink';
    if (/(cold|subs|parfait|chilled|cool|wrap|salad|kale|fruit)/i.test(lower)) return 'cold';
    return 'hot';
}

// --- Toggle tray details ---
function toggleTrayDetails(id, triggerEl) {
    const detailsEl = document.getElementById(id);
    const arrowEl = document.getElementById(id + '_arrow');
    if (!detailsEl) return;
    const isVisible = detailsEl.style.display === 'block';
    detailsEl.style.display = isVisible ? 'none' : 'block';
    if (arrowEl) arrowEl.textContent = isVisible ? '▼' : '▲';
}
