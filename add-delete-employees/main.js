async function fetchEmployees() {
  const res = await fetch('/api/employees');
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

function render(employees) {
  const tbody = document.getElementById('tbody');
  if (!employees.length) {
    tbody.innerHTML = '<tr><td colspan="3">No employees yet.</td></tr>';
    return;
  }
  tbody.innerHTML = employees.map(emp => `
    <tr>
      <td>${emp.id}</td>
      <td>${escapeHtml(emp.name)}</td>
      <td><button data-id="${emp.id}" class="del">Delete</button></td>
    </tr>
  `).join('');

  // attach delete handlers
  tbody.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      if (!confirm('Are you sure you want to delete this employee?')) return;
      try {
        const resp = await fetch('/api/employees/' + encodeURIComponent(id), { method: 'DELETE' });
        if (!resp.ok) throw new Error('Delete failed');
        await load();
      } catch (err) {
        alert('Failed to delete');
        console.error(err);
      }
    });
  });
}

function escapeHtml(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c])); }

async function load(){
  try{
    const list = await fetchEmployees();
    render(list);
  }catch(e){
    document.getElementById('tbody').innerHTML = '<tr><td colspan="3">Failed to load employees</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addForm');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    if (!fname || !lname) return;
    try {
      const resp = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fname, lname })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Add failed');
      form.reset();
      // If server returned a temp password (new users.json flow), show it to admin
      if (data.tempPassword && data.username) {
        // show alert and a persistent one-time box on the page
        alert(`Created user: ${data.username}\nTemporary password: ${data.tempPassword}\n\nPlease copy this password and deliver it securely to the user.`);
        // insert a visible box at top of container
        const container = document.querySelector('.container');
        let box = document.getElementById('tempCredBox');
        if (!box) {
          box = document.createElement('div');
          box.id = 'tempCredBox';
          box.style.background = '#fff3cd';
          box.style.border = '1px solid #ffeeba';
          box.style.padding = '10px';
          box.style.marginBottom = '12px';
          container.insertBefore(box, container.firstChild);
        }
        box.innerText = `Created user: ${data.username} — Temporary password: ${data.tempPassword}`;
      }
      await load();
    } catch (err) {
      alert('Failed to add');
      console.error(err);
    }
  });

  load();
});
