const payBtn = document.querySelector('.btn-buy');

payBtn.addEventListener('click', () => {
    fetch('/stripe-checkout', {
        method: 'post',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
            items: JSON.parse(localStorage.getItem('cartItems')), // Fixed to 'items'
        }),
    })
    .then((res) => {
        if (!res.ok) {
            throw new Error('Network response was not ok');
        }
        return res.json();
    })
    .then((data) => {
        location.href = data.url; // Redirect to Stripe Checkout
        clearCart();
    })
    .catch((err) => console.error('Error fetching:', err));
});
