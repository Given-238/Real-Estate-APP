let properties = [];
let userFavorites = [];

// =======================
// GLOBAL LOADING STATE
// =======================
function showLoading(containerId) {
  document.getElementById(containerId).innerHTML = `
    <div class="loading">
      <p>Loading properties...</p>
    </div>
  `;
}
// =======================
// DOM ELEMENTS
// =======================
const searchInput = document.getElementById("search");
const typeFilter = document.getElementById("typeFilter");
const priceFilter = document.getElementById("priceFilter");

// =======================
// FETCH USER FAVORITES (FOR HEART STATE)
// =======================
async function fetchFavorites() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch("http://localhost:5000/favorites", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    userFavorites = data.map(f => f.propertyId._id);

  } catch (err) {
    console.error("Error fetching favorites:", err);
  }
}

// =======================
// FETCH PROPERTIES
// =======================
async function fetchProperties() {
  try {
    const search = searchInput.value;
    const type = typeFilter.value;
    const price = priceFilter.value;

    const url = `http://localhost:5000/properties?search=${search}&type=${type}&price=${price}`;

    // ✨ Loading skeleton
    showLoading("properties");

    const res = await fetch(url);
    properties = await res.json();

    await fetchFavorites(); // 🔥 important

    displayProperties(properties);

  } catch (error) {
    console.error("Error fetching properties:", error);
  }
}

// =======================
// DISPLAY PROPERTIES
// =======================
function displayProperties(data) {
  const container = document.getElementById("properties");
  container.innerHTML = "";

  data.forEach(property => {
    const div = document.createElement("div");
    div.classList.add("card");

    // ❤️ Check if saved
    const isSaved = userFavorites.includes(property._id);

    div.innerHTML = `
      <div class="img-container">
        <img src="${property.image || 'https://via.placeholder.com/300'}"onerror="this.src='https://via.placeholder.com/300'"/>

        <!-- ❤️ HEART -->
        <span class="heart">
          ${isSaved ? "❤️" : "🤍"}
        </span>
      </div>

      <h3>${property.title}</h3>
      <p>${property.location}</p>
      <p>R ${property.price}</p>
      <p>${property.type}</p>
    `;

    // ❤️ HEART CLICK (TOGGLE)
    const heart = div.querySelector(".heart");

    heart.addEventListener("click", async (e) => {
      e.stopPropagation();

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please login first");
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            propertyId: property._id
          })
        });

        const data = await res.json();

        heart.innerText = data.liked ? "❤️" : "🤍";

      } catch (err) {
        console.error(err);
      }
    });

    // 🔥 CLICK CARD → DETAILS
    div.addEventListener("click", () => {
      window.location.href = `details.html?id=${property._id}`;
    });

    container.appendChild(div);
  });
}

// =======================
// EVENTS
// =======================
searchInput.addEventListener("input", fetchProperties);
typeFilter.addEventListener("change", fetchProperties);
priceFilter.addEventListener("change", fetchProperties);

// =======================
// INITIAL LOAD
// =======================
fetchProperties();



