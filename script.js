// Modal elements
const modal = document.getElementById('amendmentModal');
const openBtn = document.getElementById('openAmendmentBtn');
const closeBtn = document.querySelector('.close');

// Event listeners for modal
openBtn.onclick = () => {
    modal.style.display = "block";
};

closeBtn.onclick = () => {
    modal.style.display = "none";
};

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
};
