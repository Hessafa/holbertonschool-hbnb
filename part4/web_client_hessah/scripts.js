// ---------------------------------------------
// Utility: Get cookie by name
// ---------------------------------------------
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// ---------------------------------------------
// Utility: Get Place ID from URL
// ---------------------------------------------
function getPlaceIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// ---------------------------------------------
// Task 1: LOGIN Functionality
// ---------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://127.0.0.1:5000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    document.cookie = `token=${data.access_token}; path=/`;
                    window.location.href = 'index.html';
                } else {
                    const errorData = await response.json();
                    alert('Login failed: ' + (errorData.message || response.statusText));
                }
            } catch (error) {
                alert('Login error: ' + error.message);
            }
        });
    }

    if (document.getElementById('places-list')) {
        checkAuthenticationAndLoadPlaces();
        populatePriceFilter();
        setupPriceFilterListener();
    }

    if (document.getElementById('place-details')) {
        const placeId = getPlaceIdFromURL();
        checkAuthenticationAndLoadPlaceDetails(placeId);
        setupReviewSubmission(placeId);
    }

    if (document.getElementById('review-form') && window.location.pathname.includes('add_review.html')) {
        handleAddReviewPage();
    }
});

// ---------------------------------------------
// Task 2: Main Page (index.html)
// ---------------------------------------------
function checkAuthenticationAndLoadPlaces() {
    const token = getCookie('token');
    const loginLink = document.getElementById('login-link');

    if (!token) {
        loginLink.style.display = 'block';
    } else {
        loginLink.style.display = 'none';
        fetchPlaces(token);
    }
}

async function fetchPlaces(token) {
    try {
        const response = await fetch('http://127.0.0.1:5000/places', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch places.');
        }

        const data = await response.json();
        window.allPlaces = data;
        displayPlaces(data);
    } catch (error) {
        console.error('Error fetching places:', error);
    }
}

function displayPlaces(places) {
    const placesList = document.getElementById('places-list');
    placesList.innerHTML = '';

    places.forEach(place => {
        const placeDiv = document.createElement('div');
        placeDiv.classList.add('place');
        placeDiv.setAttribute('data-price', place.price);

        placeDiv.innerHTML = `
            <h3><a href="place.html?id=${place.id}">${place.name}</a></h3>
            <p>${place.description}</p>
            <p><strong>Location:</strong> ${place.location}</p>
            <p><strong>Price:</strong> $${place.price}</p>
        `;

        placesList.appendChild(placeDiv);
    });
}

function populatePriceFilter() {
    const priceFilter = document.getElementById('price-filter');
    if (!priceFilter) return;

    const options = [10, 50, 100, 'All'];

    options.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value === 'All' ? 'All Prices' : `$${value}`;
        priceFilter.appendChild(option);
    });
}

function setupPriceFilterListener() {
    const priceFilter = document.getElementById('price-filter');
    if (!priceFilter) return;

    priceFilter.addEventListener('change', (event) => {
        const selectedValue = event.target.value;
        const maxPrice = selectedValue === 'All' ? Infinity : parseFloat(selectedValue);

        const allPlacesDivs = document.querySelectorAll('#places-list .place');

        allPlacesDivs.forEach(placeDiv => {
            const price = parseFloat(placeDiv.getAttribute('data-price'));
            placeDiv.style.display = price <= maxPrice ? 'block' : 'none';
        });
    });
}

// ---------------------------------------------
// Task 3: Place Details Page (place.html)
// ---------------------------------------------
function checkAuthenticationAndLoadPlaceDetails(placeId) {
    const token = getCookie('token');
    const addReviewSection = document.getElementById('add-review');

    if (!token) {
        if (addReviewSection) addReviewSection.style.display = 'none';
        fetchPlaceDetails(null, placeId); // fetch without token
    } else {
        if (addReviewSection) addReviewSection.style.display = 'block';
        fetchPlaceDetails(token, placeId); // fetch with token
    }
}

async function fetchPlaceDetails(token, placeId) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/places/${placeId}`, {
            method: 'GET',
            headers: token ? {
                'Authorization': `Bearer ${token}`
            } : {}
        });

        if (!response.ok) {
            throw new Error('Failed to fetch place details.');
        }

        const place = await response.json();
        displayPlaceDetails(place);
    } catch (error) {
        console.error('Error fetching place details:', error);
    }
}

function displayPlaceDetails(place) {
    const placeDetails = document.getElementById('place-details');
    const reviewsSection = document.getElementById('reviews');
    placeDetails.innerHTML = '';
    reviewsSection.innerHTML = '';

    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
        <h2>${place.name}</h2>
        <p>${place.description}</p>
        <p><strong>Location:</strong> ${place.location}</p>
        <p><strong>Price:</strong> $${place.price}</p>
        <p><strong>Amenities:</strong> ${place.amenities.join(', ')}</p>
    `;
    placeDetails.appendChild(infoDiv);

    const reviewsTitle = document.createElement('h3');
    reviewsTitle.textContent = 'Reviews';
    reviewsSection.appendChild(reviewsTitle);

    if (place.reviews && place.reviews.length > 0) {
        place.reviews.forEach(review => {
            const reviewP = document.createElement('p');
            reviewP.textContent = `• ${review}`;
            reviewsSection.appendChild(reviewP);
        });
    } else {
        reviewsSection.innerHTML += '<p>No reviews yet.</p>';
    }
}

function setupReviewSubmission(placeId) {
    const form = document.getElementById('review-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = getCookie('token');
        const reviewText = document.getElementById('review-text')?.value?.trim();

        if (!reviewText || !token) return;

        try {
            const response = await fetch(`http://127.0.0.1:5000/places/${placeId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ review: reviewText })
            });

            if (!response.ok) {
                alert('Failed to submit review.');
                return;
            }

            alert('Review submitted!');
            location.reload();
        } catch (err) {
            console.error('Error submitting review:', err);
        }
    });
}

// ---------------------------------------------
// Task 4: Add Review Page (add_review.html)
// ---------------------------------------------
function handleAddReviewPage() {
    const token = checkAuthenticationRedirect();
    const placeId = getPlaceIdFromURL();
    populateRatingOptions();

    const form = document.getElementById('review-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const reviewText = document.getElementById('review').value.trim();
        const rating = document.getElementById('rating').value;

        if (!reviewText || !rating) {
            alert('Please enter both review and rating.');
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:5000/places/${placeId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify
