function loadFavorites() {
  const container = document.getElementById("favorites-list");

  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  container.innerHTML = "";

  if (favorites.length === 0) {
    container.innerHTML = "<p>No favorites yet ❤️</p>";
    return;
  }

  favorites.forEach(property => {
    const div = document.createElement("div");
    div.classList.add("card");

    div.innerHTML = `
      <img src="${property.image || 'https://via.placeholder.com/300'}" />
      <h3>${property.title}</h3>
      <p>${property.location}</p>
      <p>R ${property.price}</p>
      <p>${property.type}</p>
      <button class="remove-btn">Remove</button>
    `;

    // Remove from favorites
    div.querySelector(".remove-btn").addEventListener("click", () => {
      let updated = favorites.filter(fav => fav._id !== property._id);

      localStorage.setItem("favorites", JSON.stringify(updated));

      loadFavorites(); // refresh page
    });

    container.appendChild(div);
  });
}

loadFavorites();