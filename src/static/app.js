document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("activity-search");
  const sortSelect = document.getElementById("activity-sort");
  const categorySelect = document.getElementById("activity-category");

  let allActivities = {};

  function getSortedActivities(entries) {
    const sortBy = sortSelect.value;
    return entries.sort(([nameA, detailsA], [nameB, detailsB]) => {
      if (sortBy === "availability") {
        const availableA = detailsA.max_participants - detailsA.participants.length;
        const availableB = detailsB.max_participants - detailsB.participants.length;
        return availableB - availableA;
      }

      if (sortBy === "participants") {
        return detailsA.participants.length - detailsB.participants.length;
      }

      if (sortBy === "schedule") {
        return detailsA.schedule.localeCompare(detailsB.schedule);
      }

      return nameA.localeCompare(nameB);
    });
  }

  function filterActivities() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;

    const filtered = Object.entries(allActivities).filter(([name, details]) => {
      if (category !== "all" && details.category !== category) {
        return false;
      }
      return (
        name.toLowerCase().includes(query) ||
        details.description.toLowerCase().includes(query) ||
        details.schedule.toLowerCase().includes(query)
      );
    });

    return getSortedActivities(filtered);
  }

  function renderActivities(entries) {
    activitiesList.innerHTML = "";

    if (entries.length === 0) {
      activitiesList.innerHTML = "<p>No activities match your filters.</p>";
      return;
    }

    entries.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Category:</strong> ${details.category}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  function populateActivityOptions() {
    activitySelect.innerHTML = `
      <option value="">-- Select an activity --</option>
    `;

    Object.keys(allActivities).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
    populateCategoryOptions();
  }

  function populateCategoryOptions() {
    const categories = new Set();
    Object.values(allActivities).forEach((details) => {
      if (details.category) {
        categories.add(details.category);
      }
    });
    categorySelect.innerHTML = "<option value=\"all\">All categories</option>";
    Array.from(categories)
      .sort()
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
  }

  function updateActivityDisplay() {
    renderActivities(filterActivities());
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      allActivities = activities;
      populateActivityOptions();
      updateActivityDisplay();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  searchInput.addEventListener("input", updateActivityDisplay);
  categorySelect.addEventListener("change", updateActivityDisplay);
  sortSelect.addEventListener("change", updateActivityDisplay);

  fetchActivities();
});
