// References
const sandwichesInput = document.getElementById('numSandwiches');
const amountDueInput = document.getElementById('amountDue');
const orderDateInput = document.getElementById('orderDate');
const dayOfWeekInput = document.getElementById('dayOfWeek');
const otherItemsContainer = document.getElementById('otherItemsContainer');
const addItemBtn = document.getElementById('addItemBtn');
const cateringForm = document.getElementById('cateringForm');
const goBackBtn = document.getElementById('goBackBtn');
const hiddenOther = document.getElementById('hiddenOther');

// Add initial row
function addOtherRow(item = '', qty = 0) {
    const newRow = document.createElement('div');
    newRow.classList.add('other-item-row');
    newRow.innerHTML = `
        <select class="otherItemSelect">
            <option value="">-- Select Item --</option>
            <option value="12-ct nugget">12-ct nugget</option>
            <option value="8-ct nugget">8-ct nugget</option>
            <option value="grilled 8-ct nugget">Grilled 8-ct nugget</option>
            <option value="grilled 12-ct nugget">Grilled 12-ct nugget</option>
            <option value="grilled sandwich">Grilled Sandwich</option>
            <option value="spicy sandwich">Spicy Sandwich</option>
            <option value="4-ct strip">4-ct strip</option>
        </select>
        <input type="number" class="otherItemQty" min="0" value="${qty}">
        <button type="button" class="removeItemBtn">Remove</button>
    `;
    if(item) newRow.querySelector('.otherItemSelect').value = item;
    otherItemsContainer.appendChild(newRow);
}

// Add first empty row
addOtherRow();

// Event listeners
addItemBtn.addEventListener('click', () => addOtherRow());
otherItemsContainer.addEventListener('click', e => {
    if(e.target.classList.contains('removeItemBtn')) {
        e.target.parentElement.remove();
        calculateAmount();
    }
});

function calculateAmount() {
    const sandwiches = parseInt(sandwichesInput.value) || 0;
    let otherTotal = 0;
    otherItemsContainer.querySelectorAll('.other-item-row').forEach(row => {
        const item = row.querySelector('.otherItemSelect').value;
        const qty = parseInt(row.querySelector('.otherItemQty').value) || 0;
        if(item && qty > 0) otherTotal += qty * 3;
    });
    amountDueInput.value = (sandwiches * 5 + otherTotal).toFixed(2);
}
sandwichesInput.addEventListener('input', calculateAmount);
otherItemsContainer.addEventListener('input', calculateAmount);

// Day of week in Eastern Time
orderDateInput.addEventListener('change', () => {
    if(!orderDateInput.value) return;
    const date = new Date(orderDateInput.value + 'T00:00:00-04:00');
    dayOfWeekInput.value = date.toLocaleDateString('en-US', { weekday: 'long' });
});

// Go back
goBackBtn.addEventListener('click', () => window.history.back());

// Form submission
cateringForm.addEventListener('submit', e => {
    e.preventDefault();

    // Build other items string in "item: qty" format
    let otherItemsArray = [];
    otherItemsContainer.querySelectorAll('.other-item-row').forEach(row => {
        const item = row.querySelector('.otherItemSelect').value;
        const qty = parseInt(row.querySelector('.otherItemQty').value) || 0;
        if(item && qty > 0) {
            otherItemsArray.push(`${item}: ${qty}`);
        }
    });
    hiddenOther.value = otherItemsArray.join('; ');

    cateringForm.submit(); // now submits normally to PHP
});

// Initialize calculation
calculateAmount();
