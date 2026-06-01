export function toggleSection(sectionName) {
    const section = document.getElementById('section' + sectionName);
    if (section) {
        section.classList.toggle('collapsed');
    }
}

export function showAddForm(sectionName) {
    const form = document.getElementById('form' + sectionName);
    if (form) form.classList.add('active');
}

export function hideAddForm(sectionName) {
    const form = document.getElementById('form' + sectionName);
    if (form) form.classList.remove('active');
}