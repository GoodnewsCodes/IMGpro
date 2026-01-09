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

  if (!dropZone || !fileInput || !previewContainer || !faviconGrid || !resetBtn)
    return;

  const FAVICON_CONFIG = [
    { name: "favicon-16x16.png", size: 16, type: "image/png" },
    { name: "favicon-32x32.png", size: 32, type: "image/png" },
    { name: "apple-touch-icon.png", size: 180, type: "image/png" },
    { name: "android-chrome-192x192.png", size: 192, type: "image/png" },
    { name: "android-chrome-512x512.png", size: 512, type: "image/png" },
  ];

  const ICO_SIZES = [16, 32, 48];

  let currentFile: File | null = null;
  let generatedFiles: { name: string; blob: Blob }[] = [];

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
      generateFavicons(file);
    };
    reader.readAsDataURL(file);
  }

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
      name: "App Name",
      short_name: "App",
      icons: [
        {
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone",
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
    const snippet = `<!-- Favicon links -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">`;
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
  });
}
