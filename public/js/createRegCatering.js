document.addEventListener('DOMContentLoaded', () => {

  const state = {
    step: 1, steps: 8, order_type: null,
    date: null, time: null, destination: 'N/A',
    customer_name: '', phone_number: '', customer_email: '',
    guest_count: 'N/A', paper_goods: 'No', special_instructions: '',
    food_items: [], drink_items: [], sauces_dressings: [],
    meal_boxes: [], total: 0.00, prices: {}
  };

  const pricesPath = '/data/catering_cost.json';
  const stepsEls = document.querySelectorAll('.form-step');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  fetch(pricesPath)
    .then(r => { if (!r.ok) throw new Error('prices'); return r.json(); })
    .then(j => {
      state.prices = j;
      renderFood();
      renderDrinks();
      renderSauces();
      renderBoxMeals();
      updateProgress();
    })
    .catch(() => {
      const el = document.getElementById('menuList');
      if (el) el.innerHTML = '<p class="muted">no menu found</p>';
    });

  /* ------------------ RENDER FOOD ------------------ */
  function renderFood() {
  const menuList = document.getElementById('menuList');
  if (!menuList) return;
  const side = (state.order_type === 'Delivery') ? 'delivery' : 'pickup';
  const priceList = state.prices[side] || {};

  const foodOrder = ['trays', 'entrees', 'salads', 'sides', 'desserts'];
  let html = '';

  foodOrder.forEach(cat => {
    const catItems = priceList[cat];
    if (!catItems) return;

    // Special handling for 'trays' to group by entrée type
    if (cat === 'trays') {
      const entreeMap = {};

      Object.keys(catItems).forEach(fullName => {
        // Group by base item name (before size or descriptor)
        // Example: "Small Nugget Tray" -> "Nugget"
        let base = fullName
          .replace(/small|medium|large/i, '')
          .replace(/tray/i, '')
          .replace(/chilled/i, '')
          .replace(/20|40/i, '')
          .trim();

        // Capitalize just in case
        base = base.charAt(0).toUpperCase() + base.slice(1);

        if (!entreeMap[base]) entreeMap[base] = [];
        entreeMap[base].push({
          name: fullName,
          price: parseFloat(catItems[fullName]) || 0
        });
      });

      // Now build accordion for trays grouped by entrée
      for (const base in entreeMap) {
        const items = entreeMap[base];
        const groupHtml = items.map(item => `
          <div class="menu-item">
            <div class="menu-left"><strong>${item.name}</strong><div class="muted">$${item.price.toFixed(2)}</div></div>
            <div class="qty-wrap">
              <select data-key="${item.name}">
                ${Array.from({ length: 51 }, (_, i) => `<option value="${i}">${i}</option>`).join('')}
              </select>
              <button class="btn add-item" data-key="${item.name}" data-cat="${cat}">add</button>
            </div>
          </div>`).join('');

        html += `
          <div class="accordion">
            <div class="accordion-toggle">${base} Trays</div>
            <div class="accordion-panel">${groupHtml}</div>
          </div>`;
      }

    } else {
      // Standard rendering for other categories
      let catHtml = '';
      for (const key in catItems) {
        const price = parseFloat(catItems[key]);
        if (isNaN(price)) continue;

        catHtml += `
          <div class="menu-item">
            <div class="menu-left"><strong>${key}</strong><div class="muted">$${price.toFixed(2)}</div></div>
            <div class="qty-wrap">
              <select data-key="${key}">
                ${Array.from({ length: 51 }, (_, i) => `<option value="${i}">${i}</option>`).join('')}
              </select>
              <button class="btn add-item" data-key="${key}" data-cat="${cat}">add</button>
            </div>
          </div>`;
      }

      html += `
        <div class="accordion">
          <div class="accordion-toggle">${capitalize(cat)}</div>
          <div class="accordion-panel">${catHtml}</div>
        </div>`;
    }
  });

  menuList.innerHTML = html;
  wireAccordions();
}


  /* ------------------ RENDER BOX MEALS (entree first, then box meals) ------------------ */
  function renderBoxMeals() {
    const area = document.getElementById('mealBoxArea');
    if (!area) return;

    const side = (state.order_type === 'Delivery') ? 'delivery' : 'pickup';
    const priceList = state.prices[side] || {};
    const boxes = priceList['box meals'] || {};

    if (!Object.keys(boxes).length) {
      area.innerHTML = '<p class="muted">no meal box options available</p>';
      return;
    }

    // Group box meals by entrée (before first colon or first word if no colon)
    const entreeMap = {};
    Object.keys(boxes).forEach(fullName => {
      const parts = fullName.split('w/').map(p => p.trim());
      const entree = parts[0]; // entrée type
      if (!entreeMap[entree]) entreeMap[entree] = [];
      entreeMap[entree].push({ name: fullName, price: parseFloat(boxes[fullName]) || 0 });
    });

    // Build HTML
    let html = '';
    for (const entree in entreeMap) {
      html += `
        <div class="meal-entree">
          <button type="button" class="entree-toggle btn">${entree}</button>
          <div class="entree-panel" style="display:none; margin-left:10px;">
            ${entreeMap[entree].map(box => `
              <div class="menu-item">
                <div class="menu-left"><strong>${box.name}</strong><div class="muted">$${box.price.toFixed(2)}</div></div>
                <div class="qty-wrap">
                  <select data-key="${box.name}">
                    ${Array.from({length: 51}, (_, i) => `<option value="${i}">${i}</option>`).join('')}
                  </select>
                  <button class="btn add-item" data-key="${box.name}" data-cat="box meals">add</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    area.innerHTML = html;

    // Wire toggle buttons
    document.querySelectorAll('.entree-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.nextElementSibling;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });
    });
  }

  /* ------------------ RENDER DRINKS ------------------ */
  function renderDrinks() {
    const drinksList = document.getElementById('drinksList');
    if (!drinksList) return;

    const side = (state.order_type === 'Delivery') ? 'delivery' : 'pickup';
    const priceList = state.prices[side] || {};
    const drinks = priceList['drinks'] || {};

    let html = '';
    for (const key in drinks) {
      const price = parseFloat(drinks[key]);
      if (isNaN(price)) continue;
      html += `
        <div class="menu-item">
          <div class="menu-left"><strong>${key}</strong><div class="muted">$${price.toFixed(2)}</div></div>
          <div class="qty-wrap">
            <select data-key="${key}">
              ${Array.from({ length: 51 }, (_, i) => `<option value="${i}">${i}</option>`).join('')}
            </select>
            <button class="btn add-item" data-key="${key}" data-cat="drinks">add</button>
          </div>
        </div>`;
    }

    drinksList.innerHTML = html;
  }

  /* ------------------ RENDER SAUCES ------------------ */
  function renderSauces() {
    const saucesList = document.getElementById('saucesList');
    if (!saucesList) return;

    const side = (state.order_type === 'Delivery') ? 'delivery' : 'pickup';
    const priceList = state.prices[side] || {};
    const sauces = priceList['sauces & dressings'] || {};

    let html = '';
    for (const key in sauces) {
      const price = parseFloat(sauces[key]);
      if (isNaN(price)) continue;
      html += `
        <div class="menu-item">
          <div class="menu-left"><strong>${key}</strong><div class="muted">$${price.toFixed(2)}</div></div>
          <div class="qty-wrap">
            <select data-key="${key}">
              ${Array.from({ length: 51 }, (_, i) => `<option value="${i}">${i}</option>`).join('')}
            </select>
            <button class="btn add-item" data-key="${key}" data-cat="sauces & dressings">add</button>
          </div>
        </div>`;
    }

    saucesList.innerHTML = html;
  }

  /* ------------------ HELPERS ------------------ */
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function wireAccordions() {
    document.querySelectorAll('.accordion-toggle').forEach(btn => {
      btn.removeEventListener('click', accordionToggle);
      btn.addEventListener('click', accordionToggle);
    });
  }

  function accordionToggle(e) {
    const panel = e.currentTarget.nextElementSibling;
    if (!panel) return;
    panel.classList.toggle('open');
    panel.style.maxHeight = panel.classList.contains('open') ? (panel.scrollHeight + 40) + 'px' : '0';
  }

  /* ------------------ EVENT HANDLERS ------------------ */
  document.addEventListener('click', e => {
    if (e.target.closest('.btn-next')) nextStep();
    if (e.target.closest('.btn-back')) prevStep();

    if (e.target.closest('.choice-btn')) {
      const b = e.target.closest('.choice-btn');
      state.order_type = b.dataset.type;
      document.querySelectorAll('.choice-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      renderFood();
      renderDrinks();
      renderSauces();
      renderBoxMeals();
      updateProgress();
    }

    if (e.target.closest('.add-item')) {
      const btn = e.target.closest('.add-item');
      const key = btn.dataset.key;
      const cat = btn.dataset.cat;
      const qtyEl = btn.parentElement.querySelector('select');
      const qty = parseInt(qtyEl.value || '0', 10);
      if (qty > 0) {
        addItemToCart(key, qty, cat);
        qtyEl.value = 0; // reset qty after adding
      }
    }
  });

  // Update input fields in state when changed
const inputBindings = [
  { id: 'customer_name', key: 'customer_name' },
  { id: 'phone_number', key: 'phone_number' },
  { id: 'customer_email', key: 'customer_email' },
  { id: 'destination', key: 'destination' },
  { id: 'date', key: 'date' },
  { id: 'time', key: 'time' },
  { id: 'guest_count', key: 'guest_count' },
  { id: 'special_instructions', key: 'special_instructions' }
];

// radio buttons require separate handling:
document.querySelectorAll('input[name="paper_goods"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.checked) {
      state.paper_goods = e.target.value;
      console.log('Paper goods updated to:', state.paper_goods);
    }
  });
});


  inputBindings.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      // Initialize state value
      state[key] = el.value;

      el.addEventListener('input', (e) => {
        state[key] = e.target.value;
      });
    }
  });

  /* ------------------ ADD ITEM ------------------ */
 function addItemToCart(key, qty, cat) {
  const side = (state.order_type === 'Delivery') ? 'delivery' : 'pickup';
  const priceList = state.prices[side] || {};
  const catPrices = priceList[cat] || {};
  const unit = parseFloat(catPrices[key]);
  if (isNaN(unit)) return;

  let list;
  if (cat === 'drinks') list = state.drink_items;
  else if (cat === 'sauces & dressings' || cat === 'sauces') list = state.sauces_dressings;
  else if (cat === 'box meals') list = state.meal_boxes; // ✅ added this line
  else list = state.food_items;

  const existing = list.find(i => i.item === key);
  if (existing) existing.qty += qty;
  else list.push({ item: key, qty });

  state.total = round2(state.total + unit * qty);
  updateLiveTotal();
}



  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function updateLiveTotal() {
  const el = document.getElementById('liveTotal');
  if (!el) return;

  const side = (state.order_type === 'Delivery') ? 'delivery' : 'pickup';
  const priceList = state.prices[side] || {};

  let total = 0;

  // Step 1: Recalculate free sauces earned from trays
  let freeSaucesEarned = 0;
  state.food_items.forEach(({ item, qty }) => {
    if (/nugget|strip/i.test(item)) {
      if (/large/i.test(item)) freeSaucesEarned += 2 * qty;
      else if (/medium|small/i.test(item)) freeSaucesEarned += 1 * qty;
    }
  });

  // Step 2: Helper to calculate subtotal
  const sumCategory = (items, catName) => {
    const catPrices = priceList[catName] || {};
    let subtotal = 0;

    items.forEach(({ item, qty }) => {
      const price = parseFloat(catPrices[item]) || 0;

      if ((catName === 'sauces & dressings' || catName === 'sauces') && freeSaucesEarned > 0) {
        const freeToApply = Math.min(qty, freeSaucesEarned);
        const paidQty = qty - freeToApply;
        freeSaucesEarned -= freeToApply;
        subtotal += paidQty * price;
      } else {
        subtotal += qty * price;
      }
    });

    return subtotal;
  };

  total += sumCategory(state.food_items, 'trays');
  total += sumCategory(state.food_items, 'entrees');
  total += sumCategory(state.food_items, 'salads');
  total += sumCategory(state.food_items, 'sides');
  total += sumCategory(state.food_items, 'desserts');
  total += sumCategory(state.meal_boxes, 'box meals');
  total += sumCategory(state.drink_items, 'drinks');
  total += sumCategory(state.sauces_dressings, 'sauces & dressings');

  // Store base total (no tax)
  state.total = round2(total);

  // Check if tax is applied
  const taxBox = document.getElementById('applyTax');
  let displayTotal = state.total;
  if (taxBox && taxBox.checked) {
    displayTotal = round2(state.total * 1.06);
  }

  el.textContent = '$' + displayTotal.toFixed(2);
}



  /* ------------------ STEPS ------------------ */
  function updateProgress() {
    const pct = (state.step - 1) / (state.steps - 1) * 100;
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = `step ${state.step} of ${state.steps}`;
    stepsEls.forEach(s => s.classList.remove('active'));
    const cur = document.querySelector(`.form-step[data-step="${state.step}"]`);
    if (cur) cur.classList.add('active');
  }

  function nextStep() {
    if (state.step < state.steps) state.step++;
    updateProgress();
    if (state.step === 7) renderSummary();
  }

  function prevStep() {
    if (state.step > 1) state.step--;
    updateProgress();
  }

  /* ------------------ SUMMARY ------------------ */
  function renderSummary() {
    const area = document.getElementById('summaryArea');
    if (!area) return;
    let html = `<p><strong>Order Type:</strong> ${state.order_type || 'Pickup'}</p>`;
    html += `<h4>Food</h4>${renderList(state.food_items)}`;
    html += `<h4>Box Meals</h4>${renderList(state.meal_boxes)}`;
    html += `<h4>Drinks</h4>${renderList(state.drink_items)}`;
    html += `<h4>Sauces</h4>${renderList(state.sauces_dressings)}`;
    html += `<p><strong>Total:</strong> $${state.total.toFixed(2)}</p>`;
    area.innerHTML = html;
  }

  function renderList(list) {
    if (!list.length) return '<p class="muted">none</p>';
    return '<ul>' + list.map(i => `<li>${i.item} x ${i.qty}</li>`).join('') + '</ul>';
  }

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';

  // This parses the date as local, not UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day); // month is 0-indexed

  if (isNaN(d)) return 'N/A';

  const options = { weekday: 'long', month: 'numeric', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', options);
}
  function formatTime(timeStr) {
    if (!timeStr) return 'N/A';
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h);
    if (isNaN(hour) || !m) return 'N/A';
    const ampm = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12 || 12;
    return `${hour}:${m}${ampm}`; // e.g. 3:30pm
  }

  function formatTotal(n) {
    return '$' + n.toFixed(2);
  }

document.addEventListener('change', (e) => {
  if (e.target.id === 'applyTax') {
    updateLiveTotal(); // re-run total update when toggled
  }
});

  // ------------------ SUBMIT ORDER ------------------
  const submitBtn = document.getElementById('submitBtn');
  const submitStatus = document.getElementById('submitStatus');

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      submitStatus.textContent = 'Submitting...';

      // Check if tax is applied
      const taxBox = document.getElementById('applyTax');
      let finalTotal = state.total;
      if (taxBox && taxBox.checked) {
        finalTotal = round2(state.total * 1.06);
      }

      // Prepare payload (match backend schema exactly)
      const payload = {
        order_type: state.order_type || 'Pickup',
        date: state.date || new Date().toISOString().split('T')[0], // Keep raw date format (YYYY-MM-DD)
        time: state.time || 'N/A', // Keep raw time format (HH:MM)
        destination: state.destination || 'N/A',
        customer_name: state.customer_name || 'N/A',
        phone_number: state.phone_number || 'N/A',
        customer_email: state.customer_email || 'N/A',
        guest_count: state.guest_count || 'N/A',
        paper_goods: state.paper_goods || 'No',
        special_instructions: state.special_instructions || '',
        food_items: state.food_items,
        meal_boxes: state.meal_boxes,
        drink_items: state.drink_items,
        sauces_dressings: state.sauces_dressings,
        total: '$' + finalTotal.toFixed(2)
      };

     fetch('/catering/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

        .then(r => r.json())
        .then(resp => {
          if (resp.success) {
            submitStatus.textContent = `Order submitted! Your order ID is ${resp.id}.`;
            resetOrder();
          } else {
            submitStatus.textContent = 'Error submitting order: ' + (resp.error || 'unknown');
          }
        })
        .catch(err => {
          submitStatus.textContent = 'Network error: ' + err.message;
        });
    });
  }

  // Optional: reset state after successful order
  function resetOrder() {
    state.step = 1;
    state.order_type = null;
    state.date = null;
    state.time = null;
    state.destination = 'N/A';
    state.customer_name = '';
    state.phone_number = '';
    state.customer_email = '';
    state.guest_count = 'N/A';
    state.paper_goods = 'No';
    state.special_instructions = '';
    state.food_items = [];
    state.meal_boxes = [];
    state.drink_items = [];
    state.sauces_dressings = [];
    state.total = 0.00;

    // Reset inputs visually
    inputBindings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) {
        if (id === 'guest_count') el.value = 'N/A';
        else if (id === 'paper_goods') el.value = 'No';
        else el.value = '';
      }
    });

    // Reset choice buttons
    document.querySelectorAll('.choice-btn').forEach(x => x.classList.remove('selected'));

    updateLiveTotal();
    updateProgress();
    renderFood();
    renderDrinks();
    renderSauces();
    renderBoxMeals();
  }

});
