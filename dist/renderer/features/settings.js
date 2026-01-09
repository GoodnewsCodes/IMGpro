"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSettings = initSettings;
exports.getSettings = getSettings;
const DEFAULT_SETTINGS = {
    theme: "light",
    defaultFormat: "png",
    defaultQuality: 100,
};
function initSettings() {
    const settingsSection = document.getElementById("settings-section");
    if (!settingsSection)
        return;
    // Load settings
    let settings = DEFAULT_SETTINGS;
    const savedSettings = localStorage.getItem("imgpro-settings");
    if (savedSettings) {
        try {
            settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        }
        catch (e) {
            console.error("Failed to parse settings", e);
        }
    }
    // Apply theme
    applyTheme(settings.theme);
    // UI Elements
    const themeSelect = document.getElementById("theme-select");
    const defaultFormatSelect = document.getElementById("default-format-select");
    const defaultQualitySlider = document.getElementById("default-quality-slider");
    const defaultQualityValue = document.getElementById("default-quality-value");
    const saveSettingsBtn = document.getElementById("save-settings-btn");
    // Set initial UI values
    if (themeSelect)
        themeSelect.value = settings.theme;
    if (defaultFormatSelect)
        defaultFormatSelect.value = settings.defaultFormat;
    if (defaultQualitySlider) {
        defaultQualitySlider.value = settings.defaultQuality.toString();
        if (defaultQualityValue)
            defaultQualityValue.textContent = settings.defaultQuality.toString();
    }
    // Event Listeners
    defaultQualitySlider?.addEventListener("input", () => {
        if (defaultQualityValue)
            defaultQualityValue.textContent = defaultQualitySlider.value;
    });
    saveSettingsBtn?.addEventListener("click", () => {
        const newSettings = {
            theme: themeSelect.value,
            defaultFormat: defaultFormatSelect.value,
            defaultQuality: parseInt(defaultQualitySlider.value),
        };
        localStorage.setItem("imgpro-settings", JSON.stringify(newSettings));
        applyTheme(newSettings.theme);
        alert("Settings saved successfully!");
    });
    // remove.bg API Key Management
    const removeBgKeyInput = document.getElementById("remove-bg-key-input");
    const saveApiKeyBtn = document.getElementById("save-api-key-btn");
    if (removeBgKeyInput && saveApiKeyBtn) {
        // Load existing key
        window.electronAPI.getRemoveBgKey().then((key) => {
            if (key) {
                removeBgKeyInput.value = key;
            }
        });
        saveApiKeyBtn.addEventListener("click", async () => {
            const key = removeBgKeyInput.value.trim();
            if (!key) {
                alert("Please enter an API key.");
                return;
            }
            const result = await window.electronAPI.setRemoveBgKey(key);
            if (result.success) {
                alert("API key saved securely!");
            }
            else {
                alert("Failed to save API key: " + result.error);
            }
        });
    }
}
function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark-theme");
    }
    else {
        document.body.classList.remove("dark-theme");
    }
}
function getSettings() {
    const savedSettings = localStorage.getItem("imgpro-settings");
    if (savedSettings) {
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        }
        catch (e) {
            return DEFAULT_SETTINGS;
        }
    }
    return DEFAULT_SETTINGS;
}
