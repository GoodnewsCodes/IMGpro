"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bg_removal_1 = require("./features/bg-removal");
const image_conversion_1 = require("./features/image-conversion");
const image_resizing_1 = require("./features/image-resizing");
const color_tools_1 = require("./features/color-tools");
const image_manipulation_1 = require("./features/image-manipulation");
const favicon_generator_1 = require("./features/favicon-generator");
const optimization_1 = require("./features/optimization");
const settings_1 = require("./features/settings");
const lucide_1 = require("lucide");
// Initialize icons
(0, lucide_1.createIcons)({
    icons: {
        Palette: lucide_1.Palette,
        Scissors: lucide_1.Scissors,
        Ruler: lucide_1.Ruler,
        RefreshCw: lucide_1.RefreshCw,
        Image: lucide_1.Image,
        Upload: lucide_1.Upload,
        FlipHorizontal: lucide_1.FlipHorizontal,
        Globe: lucide_1.Globe,
        Menu: lucide_1.Menu,
        Home: lucide_1.Home,
        Zap: lucide_1.Zap,
        Crop: lucide_1.Crop,
        Settings: lucide_1.Settings,
    },
});
// Sidebar Toggle
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        // Optional: Save state to localStorage
        const isCollapsed = sidebar.classList.contains("collapsed");
        localStorage.setItem("sidebar-collapsed", isCollapsed.toString());
    });
    // Restore state
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState === "true") {
        sidebar.classList.add("collapsed");
    }
}
// Navigation
const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");
const toolCards = document.querySelectorAll(".tool-card");
function switchTab(tabId) {
    // Update nav items
    navItems.forEach((item) => {
        if (item.dataset.tab === tabId) {
            item.classList.add("active");
        }
        else {
            item.classList.remove("active");
        }
    });
    // Update content sections
    tabContents.forEach((content) => {
        if (content.id === `${tabId}-section`) {
            content.classList.remove("hidden");
        }
        else {
            content.classList.add("hidden");
        }
    });
}
// Add event listeners to nav items
navItems.forEach((item) => {
    item.addEventListener("click", () => {
        const tabId = item.dataset.tab;
        if (tabId)
            switchTab(tabId);
    });
});
// Add event listeners to tool cards on home page
toolCards.forEach((card) => {
    card.addEventListener("click", () => {
        const tabId = card.dataset.tab;
        if (tabId)
            switchTab(tabId);
    });
});
// Initialize features
document.addEventListener("DOMContentLoaded", () => {
    (0, bg_removal_1.initBgRemoval)();
    (0, image_conversion_1.initImageConversion)();
    (0, image_resizing_1.initImageResizing)();
    (0, color_tools_1.initColorTools)();
    (0, image_manipulation_1.initImageManipulation)();
    (0, favicon_generator_1.initFaviconGenerator)();
    (0, optimization_1.initOptimization)();
    (0, settings_1.initSettings)();
});
// Global Drag & Drop Visual Feedback
let dragCounter = 0;
document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    const activeDropZone = document.querySelector(".tab-content:not(.hidden) .upload-container");
    if (activeDropZone) {
        activeDropZone.classList.add("drag-active");
    }
});
document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        const activeDropZone = document.querySelector(".tab-content:not(.hidden) .upload-container");
        if (activeDropZone) {
            activeDropZone.classList.remove("drag-active");
        }
    }
});
document.addEventListener("dragover", (e) => {
    e.preventDefault();
});
document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    const activeDropZone = document.querySelector(".tab-content:not(.hidden) .upload-container");
    if (activeDropZone) {
        activeDropZone.classList.remove("drag-active");
    }
});
