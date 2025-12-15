// Sidebar state
// Default to true, but check localStorage
let sidebarExpanded = localStorage.getItem('sidebarExpanded') !== 'false';

// Initialize UI on load
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('backdrop');
    if (!sidebar || !backdrop) return;

    // Apply initial state
    const isMobile = window.innerWidth < 1024;

    // Set data attribute
    sidebar.dataset.expanded = sidebarExpanded;

    if (isMobile) {
        if (sidebarExpanded) {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            backdrop.classList.remove('hidden');
        } else {
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
            backdrop.classList.add('hidden');
        }
    } else {
        // Desktop
        if (sidebarExpanded) {
            sidebar.classList.remove('lg:w-0');
            sidebar.classList.add('lg:w-60');
        } else {
            sidebar.classList.remove('lg:w-60');
            sidebar.classList.add('lg:w-0');
        }
    }
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('backdrop');

    if (!sidebar || !backdrop) return;

    // Add transitions on first toggle interaction
    sidebar.classList.add('transition-all', 'duration-300', 'ease-in-out');

    const isMobile = window.innerWidth < 1024;

    sidebarExpanded = !sidebarExpanded;

    // Save state
    localStorage.setItem('sidebarExpanded', sidebarExpanded);

    sidebar.dataset.expanded = sidebarExpanded;

    if (isMobile) {
        if (sidebarExpanded) {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            backdrop.classList.remove('hidden');
        } else {
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
            backdrop.classList.add('hidden');
        }
    } else {
        if (sidebarExpanded) {
            sidebar.classList.remove('lg:w-0');
            sidebar.classList.add('lg:w-60');
        } else {
            sidebar.classList.remove('lg:w-60');
            sidebar.classList.add('lg:w-0');
        }
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('backdrop');

    if (!sidebar || !backdrop) return;

    const isMobile = window.innerWidth < 1024;

    if (!isMobile && sidebarExpanded) {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        backdrop.classList.add('hidden');
    } else if (isMobile && !sidebarExpanded) {
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
    }
});
