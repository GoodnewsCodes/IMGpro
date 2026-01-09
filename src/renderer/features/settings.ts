export interface Settings {
  theme: "dark" | "light";
  defaultFormat: string;
  defaultQuality: number;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  defaultFormat: "png",
  defaultQuality: 100,
};

export function initSettings() {
  const settingsSection = document.getElementById("settings-section");
  if (!settingsSection) return;

  // Load settings
  let settings: Settings = DEFAULT_SETTINGS;
  const savedSettings = localStorage.getItem("imgpro-settings");
  if (savedSettings) {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
  }

  // Apply theme
  applyTheme(settings.theme);

  // UI Elements
  const themeSelect = document.getElementById(
    "theme-select"
  ) as HTMLSelectElement;
  const defaultFormatSelect = document.getElementById(
    "default-format-select"
  ) as HTMLSelectElement;
  const defaultQualitySlider = document.getElementById(
    "default-quality-slider"
  ) as HTMLInputElement;
  const defaultQualityValue = document.getElementById("default-quality-value");
  const saveSettingsBtn = document.getElementById("save-settings-btn");

  // Set initial UI values
  if (themeSelect) themeSelect.value = settings.theme;
  if (defaultFormatSelect) defaultFormatSelect.value = settings.defaultFormat;
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
    const newSettings: Settings = {
      theme: themeSelect.value as "dark" | "light",
      defaultFormat: defaultFormatSelect.value,
      defaultQuality: parseInt(defaultQualitySlider.value),
    };

    localStorage.setItem("imgpro-settings", JSON.stringify(newSettings));
    applyTheme(newSettings.theme);
    alert("Settings saved successfully!");
  });

  // remove.bg API Key Management
  const removeBgKeyInput = document.getElementById(
    "remove-bg-key-input"
  ) as HTMLInputElement;
  const saveApiKeyBtn = document.getElementById("save-api-key-btn");

  if (removeBgKeyInput && saveApiKeyBtn) {
    // Load existing key
    window.electronAPI.getRemoveBgKey().then((key: string | null) => {
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
      } else {
        alert("Failed to save API key: " + result.error);
      }
    });
  }
}

function applyTheme(theme: "dark" | "light") {
  if (theme === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

export function getSettings(): Settings {
  const savedSettings = localStorage.getItem("imgpro-settings");
  if (savedSettings) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}
