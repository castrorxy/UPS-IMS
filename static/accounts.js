const accountModal = document.getElementById("accountModal");
const closeAccountModal = document.getElementById("closeAccountModal");
const accountEditForm = document.getElementById("accountEditForm");

function openAccountModal(data) {
  if (!accountModal || !accountEditForm) return;
  accountEditForm.reset();
  accountEditForm.elements.id.value = data.id || "";
  accountEditForm.elements.name.value = data.name || "";
  accountEditForm.elements.username.value = data.username || "";
  accountEditForm.elements.role.value = data.role || "staff";
  accountModal.classList.add("show");
  accountModal.setAttribute("aria-hidden", "false");
}

function closeAccountModalView() {
  if (!accountModal) return;
  accountModal.classList.remove("show");
  accountModal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll(".edit-account").forEach((button) => {
  button.addEventListener("click", () => {
    openAccountModal({
      id: button.dataset.id,
      name: button.dataset.name,
      username: button.dataset.username,
      role: button.dataset.role,
    });
  });
});

if (closeAccountModal) {
  closeAccountModal.addEventListener("click", closeAccountModalView);
}

if (accountModal) {
  accountModal.addEventListener("click", (event) => {
    if (event.target === accountModal) closeAccountModalView();
  });
}

function togglePasswordVisibility(button) {
  const field = button.closest(".password-field");
  if (!field) return;
  const input = field.querySelector("input");
  if (!input) return;
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
}

document.querySelectorAll(".eye-btn").forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});
