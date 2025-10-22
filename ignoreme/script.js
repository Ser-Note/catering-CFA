function toggleDetails(el) {
    let details = el.querySelector('.order-details');
    if(details.style.display === 'block') details.style.display = 'none';
    else details.style.display = 'block';
}
