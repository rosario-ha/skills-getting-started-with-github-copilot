document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset activity select (avoid duplicated options)
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            <ul class="participants-list"></ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Populate participants list
        const participantsUl = activityCard.querySelector('.participants-list');
        if (details.participants && details.participants.length > 0) {
          details.participants.forEach((p) => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            const span = document.createElement('span');
            span.textContent = p;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-participant';
            deleteBtn.title = 'Remove participant';
            deleteBtn.innerHTML = '&times;';

            deleteBtn.addEventListener('click', async () => {
              // disable button to prevent double clicks
              deleteBtn.disabled = true;
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(p)}`,
                  { method: 'DELETE' }
                );

                if (res.ok) {
                  // remove the list item
                  participantsUl.removeChild(li);

                  // update availability text
                  const availabilityP = activityCard.querySelector('.availability');
                  const remaining = details.max_participants - participantsUl.querySelectorAll('.participant-item:not(.empty)').length;
                  availabilityP.innerHTML = `<strong>Availability:</strong> ${remaining} spots left`;

                  // if no participants left, show placeholder
                  if (participantsUl.children.length === 0) {
                    const emptyLi = document.createElement('li');
                    emptyLi.className = 'participant-item empty';
                    emptyLi.textContent = 'No participants yet';
                    participantsUl.appendChild(emptyLi);
                  }
                } else {
                  const err = await res.json();
                  alert(err.detail || 'Failed to remove participant');
                  deleteBtn.disabled = false;
                }
              } catch (e) {
                console.error('Error removing participant:', e);
                alert('Failed to remove participant');
                deleteBtn.disabled = false;
              }
            });

            li.appendChild(span);
            li.appendChild(deleteBtn);
            participantsUl.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.className = 'participant-item empty';
          li.textContent = 'No participants yet';
          participantsUl.appendChild(li);
        }
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
