import { initBgRemoval } from "./features/bg-removal";
import { initImageConversion } from "./features/image-conversion";
import { initImageResizing } from "./features/image-resizing";
import { initColorTools } from "./features/color-tools";
import { initColorSwap } from "./features/color-swap";
import { initImageManipulation } from "./features/image-manipulation";
import { initFaviconGenerator } from "./features/favicon-generator";
import { initOptimization } from "./features/optimization";
import { initSettings } from "./features/settings";
import { initOnboarding } from "./features/onboarding";
import {
  createIcons,
  Palette,
  Scissors,
  Ruler,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  FlipHorizontal,
  Globe,
  Menu,
  Home,
  Zap,
  Crop,
  Settings,
  Info,
  ExternalLink,
  Search,
  User,
  Repeat,
  Film,
  Video,
  Sparkles,
  Download,
} from "lucide";

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

function switchTab(tabId: string) {
  // Update nav items
  navItems.forEach((item) => {
    if ((item as HTMLElement).dataset.tab === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update content sections
  tabContents.forEach((content) => {
    if (content.id === `${tabId}-section`) {
      content.classList.remove("hidden");
    } else {
      content.classList.add("hidden");
    }
  });
}

// Add event listeners to nav items
navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const tabId = (item as HTMLElement).dataset.tab;
    if (tabId) switchTab(tabId);
  });
});

// Add event listeners to tool cards on home page
toolCards.forEach((card) => {
  card.addEventListener("click", () => {
    const tabId = (card as HTMLElement).dataset.tab;
    if (tabId) switchTab(tabId);
  });
});

/**
 * Loads images that were deferred with data-src
 */
function loadMainAppImages() {
  const images = document.querySelectorAll("img[data-src]");
  images.forEach((img) => {
    const htmlImg = img as HTMLImageElement;
    if (htmlImg.dataset.src) {
      htmlImg.src = htmlImg.dataset.src;
      htmlImg.removeAttribute("data-src");
    }
  });
}

// Initialize features
document.addEventListener("DOMContentLoaded", () => {
  // Initialize icons
  createIcons({
    icons: {
      Palette,
      Scissors,
      Ruler,
      RefreshCw,
      Image: ImageIcon,
      Upload,
      FlipHorizontal,
      Globe,
      Menu,
      Home,
      Zap,
      Crop,
      Settings,
      Info,
      ExternalLink,
      Search,
      User,
      Repeat,
      Film,
      Video,
      Sparkles,
      Download,
    },
  });

  initBgRemoval();
  initImageConversion();
  initImageResizing();
  initColorTools();
  initColorSwap();
  initImageManipulation();
  initFaviconGenerator();
  initOptimization();
  initSettings();
  initOnboarding();

  // Start loading main app images in the background
  // This satisfies the requirement to load onboarding first, then main app assets
  setTimeout(loadMainAppImages, 500);
});

// Global Drag & Drop Visual Feedback
let dragCounter = 0;

document.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;

  const activeDropZone = document.querySelector(
    ".tab-content:not(.hidden) .upload-container",
  );

  if (activeDropZone) {
    activeDropZone.classList.add("drag-active");
  }
});

document.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;

  if (dragCounter === 0) {
    const activeDropZone = document.querySelector(
      ".tab-content:not(.hidden) .upload-container",
    );
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

  const activeDropZone = document.querySelector(
    ".tab-content:not(.hidden) .upload-container",
  );
  if (activeDropZone) {
    activeDropZone.classList.remove("drag-active");
  }
});
