import JSZip from "jszip";

export function initFaviconGenerator() {
  const dropZone = document.getElementById("favicon-drop-zone");
  const fileInput = document.getElementById(
    "favicon-file-input"
  ) as HTMLInputElement;
  const previewContainer = document.getElementById("favicon-preview-container");
  const originalPreview = document.getElementById(
    "favicon-original-preview"
  ) as HTMLImageElement;
  const faviconGrid = document.getElementById("favicon-grid");
  const resetBtn = document.getElementById("favicon-reset-btn");
  const downloadAllBtn = document.getElementById(
    "favicon-download-all-btn"
  ) as HTMLButtonElement;
  const htmlContainer = document.getElementById("favicon-html-container");
  const htmlCode = document.getElementById("favicon-html-code");
  const copyHtmlBtn = document.getElementById("favicon-copy-html-btn");
  const shapeSelect = document.getElementById(
    "favicon-shape"
  ) as HTMLSelectElement;

  // Manifest Inputs
  const manifestNameInput = document.getElementById(
    "manifest-name"
  ) as HTMLInputElement;
  const manifestShortNameInput = document.getElementById(
    "manifest-short-name"
  ) as HTMLInputElement;
  const manifestDescInput = document.getElementById(
    "manifest-description"
  ) as HTMLTextAreaElement;

  const themeColorInput = document.getElementById(
    "manifest-theme-color"
  ) as HTMLInputElement;
  const themeColorHex = document.getElementById(
    "manifest-theme-color-hex"
  ) as HTMLInputElement;

  const bgColorInput = document.getElementById(
    "manifest-bg-color"
  ) as HTMLInputElement;
  const bgColorHex = document.getElementById(
    "manifest-bg-color-hex"
  ) as HTMLInputElement;

  const tileColorInput = document.getElementById(
    "manifest-tile-color"
  ) as HTMLInputElement;
  const tileColorHex = document.getElementById(
    "manifest-tile-color-hex"
  ) as HTMLInputElement;

  const regenerateBtn = document.getElementById(
    "favicon-regenerate-btn"
  ) as HTMLButtonElement;

  if (!dropZone || !fileInput || !previewContainer || !faviconGrid || !resetBtn)
    return;

  const FAVICON_CONFIG = [
    { name: "favicon-16x16.png", size: 16, type: "image/png" },
    { name: "favicon-32x32.png", size: 32, type: "image/png" },
    { name: "favicon-48x48.png", size: 48, type: "image/png" },
    { name: "favicon-96x96.png", size: 96, type: "image/png" },
    { name: "apple-icon-152x152.png", size: 152, type: "image/png" },
    { name: "apple-icon-180x180.png", size: 180, type: "image/png" },
    { name: "android-icon-192x192.png", size: 192, type: "image/png" },
    { name: "android-chrome-512x512.png", size: 512, type: "image/png" },
    { name: "ms-icon-144x144.png", size: 144, type: "image/png" },
  ];

  const ICO_SIZES = [16, 32, 48];

  let currentFile: File | null = null;
  let generatedFiles: { name: string; blob: Blob }[] = [];

  // Sync Color Inputs
  function setupColorSync(picker: HTMLInputElement, hex: HTMLInputElement) {
    if (!picker || !hex) return;

    picker.addEventListener("input", () => {
      hex.value = picker.value;
    });

    hex.addEventListener("input", () => {
      if (/^#[0-9A-F]{6}$/i.test(hex.value)) {
        picker.value = hex.value;
      }
    });

    hex.addEventListener("blur", () => {
      if (!/^#[0-9A-F]{6}$/i.test(hex.value)) {
        hex.value = picker.value;
      }
    });
  }

  setupColorSync(themeColorInput, themeColorHex);
  setupColorSync(bgColorInput, bgColorHex);
  setupColorSync(tileColorInput, tileColorHex);

  // Handle click to browse
  dropZone.addEventListener("click", () => fileInput.click());

  // Handle file selection
  fileInput.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Handle shape change
  shapeSelect?.addEventListener("change", () => {
    if (currentFile) {
      generateFavicons(currentFile);
    }
  });

  // Handle regenerate
  regenerateBtn?.addEventListener("click", () => {
    if (currentFile) {
      generateFavicons(currentFile);
    }
  });

  // Handle drag and drop
  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", (e) => {
    // Only remove drag-over class if we're actually leaving the drop zone
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !dropZone.contains(relatedTarget)) {
      dropZone.classList.remove("drag-over");
    }
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      originalPreview.src = e.target?.result as string;
      dropZone?.classList.add("hidden");
      previewContainer?.classList.remove("hidden");

      // Set default name based on filename if empty
      if (!manifestNameInput.value) {
        const name = file.name.split(".")[0];
        manifestNameInput.value = name.charAt(0).toUpperCase() + name.slice(1);
        manifestShortNameInput.value =
          name.charAt(0).toUpperCase() + name.slice(1);
      }

      generateFavicons(file);
    };
    reader.readAsDataURL(file);
  }

  // Handle drag and drop on original preview to reset and upload new image
  originalPreview.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    originalPreview.classList.add("drag-over");
  });

  originalPreview.addEventListener("dragleave", () => {
    originalPreview.classList.remove("drag-over");
  });

  originalPreview.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    originalPreview.classList.remove("drag-over");

    if (e.dataTransfer?.files.length) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        // Reset state
        currentFile = null;
        generatedFiles = [];
        fileInput.value = "";
        faviconGrid.innerHTML = "";
        downloadAllBtn.classList.add("hidden");
        htmlContainer?.classList.add("hidden");

        // Handle new file
        handleFile(file);
      }
    }
  });

  async function generateFavicons(file: File) {
    faviconGrid!.innerHTML = "";
    generatedFiles = [];
    downloadAllBtn.classList.add("hidden");
    htmlContainer?.classList.add("hidden");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const mask = (shapeSelect?.value || "square") as
      | "square"
      | "rounded"
      | "circle";

    // 1. Generate PNGs
    for (const config of FAVICON_CONFIG) {
      const item = createGridItem(config.name, `${config.size}x${config.size}`);
      faviconGrid!.appendChild(item);

      try {
        const result = await window.electronAPI.resizeImage({
          buffer,
          width: config.size,
          height: config.size,
          fit: "contain",
          format: "png",
          mask,
        });

        if (result.success && result.buffer) {
          const blob = new Blob([result.buffer as any], { type: config.type });
          updateGridItem(item, blob, config.name);
          generatedFiles.push({ name: config.name, blob });
        }
      } catch (error) {
        console.error(`Error generating ${config.name}:`, error);
      }
    }

    // 2. Generate ICO
    const icoItem = createGridItem("favicon.ico", "Multi-size");
    faviconGrid!.appendChild(icoItem);

    try {
      const icoBuffers: Uint8Array[] = [];
      for (const size of ICO_SIZES) {
        const res = await window.electronAPI.resizeImage({
          buffer,
          width: size,
          height: size,
          fit: "contain",
          format: "png",
          mask,
        });
        if (res.success && res.buffer) {
          icoBuffers.push(new Uint8Array(res.buffer as any));
        }
      }

      const icoResult = await window.electronAPI.generateIco(icoBuffers);
      if (icoResult.success && icoResult.buffer) {
        const blob = new Blob([icoResult.buffer as any], {
          type: "image/x-icon",
        });
        updateGridItem(icoItem, blob, "favicon.ico");
        generatedFiles.push({ name: "favicon.ico", blob });
      }
    } catch (error) {
      console.error("Error generating favicon.ico:", error);
    }

    // 3. Generate Web Manifest
    const manifest = {
      name: manifestNameInput.value || "My App",
      short_name: manifestShortNameInput.value || "App",
      description: manifestDescInput.value || "My Application",
      icons: [
        {
          src: "/favicon-16x16.png",
          sizes: "16x16",
          type: "image/png",
        },
        {
          src: "/favicon-32x32.png",
          sizes: "32x32",
          type: "image/png",
        },
        {
          src: "/favicon-48x48.png",
          sizes: "48x48",
          type: "image/png",
        },
        {
          src: "/favicon-96x96.png",
          sizes: "96x96",
          type: "image/png",
        },
        {
          src: "/android-icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
      ],
      theme_color: themeColorInput.value,
      background_color: bgColorInput.value,
      display: "standalone",
      scope: "/",
      start_url: "/",
    };
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    generatedFiles.push({ name: "site.webmanifest", blob: manifestBlob });

    // 4. Update UI
    if (generatedFiles.length > 0) {
      downloadAllBtn.classList.remove("hidden");
      updateHtmlSnippet();
      htmlContainer?.classList.remove("hidden");
    }
  }

  function createGridItem(name: string, label: string) {
    const item = document.createElement("div");
    item.className = "favicon-item";
    item.innerHTML = `
      <div class="favicon-preview-box">
        <div class="spinner small"></div>
      </div>
      <div class="favicon-info">
        <span class="favicon-size">${label}</span>
        <span class="favicon-label">${name}</span>
      </div>
    `;
    return item;
  }

  function updateGridItem(item: HTMLElement, blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const previewBox = item.querySelector(".favicon-preview-box");
    if (previewBox) {
      previewBox.innerHTML = `<img src="${url}" alt="${fileName}" />`;
    }

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn secondary favicon-download-btn";
    downloadBtn.textContent = "Download";
    downloadBtn.onclick = () => downloadBlob(blob, fileName);
    item.appendChild(downloadBtn);
  }

  function updateHtmlSnippet() {
    if (!htmlCode) return;
    const snippet = `<!-- Favicon and Icons - Multiple formats for maximum compatibility -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />

<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
<link rel="manifest" href="/site.webmanifest" />

<link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png" />
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<meta name="msapplication-TileColor" content="${tileColorInput.value}" />
<meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
<meta name="theme-color" content="${themeColorInput.value}" />`;
    htmlCode.textContent = snippet;
  }

  async function downloadBlob(blob: Blob, fileName: string) {
    const savePath = await window.electronAPI.selectSavePath(fileName);
    if (savePath) {
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const result = await window.electronAPI.saveFile({
        filePath: savePath,
        buffer,
      });

      if (!result.success) {
        alert("Failed to save file: " + result.error);
      }
    }
  }

  downloadAllBtn.addEventListener("click", async () => {
    if (generatedFiles.length === 0) return;

    const zip = new JSZip();
    for (const file of generatedFiles) {
      zip.file(file.name, file.blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    await downloadBlob(content, "favicons.zip");
  });

  copyHtmlBtn?.addEventListener("click", () => {
    if (htmlCode) {
      navigator.clipboard.writeText(htmlCode.textContent || "");
      const originalText = copyHtmlBtn.textContent;
      copyHtmlBtn.textContent = "Copied!";
      setTimeout(() => {
        copyHtmlBtn.textContent = originalText;
      }, 2000);
    }
  });

  resetBtn.addEventListener("click", () => {
    currentFile = null;
    generatedFiles = [];
    fileInput.value = "";
    dropZone.classList.remove("hidden");
    previewContainer.classList.add("hidden");
    faviconGrid.innerHTML = "";
    downloadAllBtn.classList.add("hidden");
    htmlContainer?.classList.add("hidden");

    // Reset inputs
    manifestNameInput.value = "";
    manifestShortNameInput.value = "";
    manifestDescInput.value = "";
    themeColorInput.value = "#ffffff";
    themeColorHex.value = "#ffffff";
    bgColorInput.value = "#ffffff";
    bgColorHex.value = "#ffffff";
    tileColorInput.value = "#ffffff";
    tileColorHex.value = "#ffffff";
  });
}
