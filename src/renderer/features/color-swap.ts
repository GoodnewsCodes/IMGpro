export function initColorSwap() {
  const dropZone = document.getElementById("swap-drop-zone");
  const fileInput = document.getElementById(
    "swap-file-input",
  ) as HTMLInputElement;
  const previewContainer = document.getElementById("swap-preview-container");
  const canvas = document.getElementById("swap-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const colorASwatch = document.getElementById("swap-color-a-swatch");
  const colorAHex = document.getElementById(
    "swap-color-a-hex",
  ) as HTMLInputElement;

  const colorBSwatch = document.getElementById("swap-color-b-swatch");
  const colorBHex = document.getElementById(
    "swap-color-b-hex",
  ) as HTMLInputElement;

  const toleranceSlider = document.getElementById(
    "swap-tolerance-slider",
  ) as HTMLInputElement;
  const toleranceValue = document.getElementById("swap-tolerance-value");

  const swapBtn = document.getElementById("swap-btn") as HTMLButtonElement;
  const downloadBtn = document.getElementById(
    "swap-download-btn",
  ) as HTMLButtonElement;
  const resetBtn = document.getElementById(
    "swap-reset-btn",
  ) as HTMLButtonElement;

  if (!dropZone || !fileInput || !canvas || !swapBtn) return;

  const resultPreview = document.getElementById(
    "swap-result-preview",
  ) as HTMLImageElement;
  const resultWrapper = document.getElementById("swap-result-wrapper");
  const loadingOverlay = document.getElementById("swap-loading-overlay");

  let originalImage: HTMLImageElement | null = null;
  let colorA = { r: 0, g: 0, b: 0 };
  let colorB = { r: 255, g: 255, b: 255 };
  let pickingMode: "A" | "B" = "A"; // Which color we are currently picking

  // Sync color input and hex text for Color B

  toleranceSlider?.addEventListener("input", () => {
    if (toleranceValue) toleranceValue.textContent = toleranceSlider.value;
  });

  // Upload Logic
  dropZone?.addEventListener("click", () => fileInput.click());

  dropZone?.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone?.addEventListener("dragleave", (e) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !dropZone.contains(relatedTarget)) {
      dropZone.classList.remove("drag-over");
    }
  });

  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        previewContainer?.classList.remove("hidden");
        dropZone?.classList.add("hidden");
        canvas.style.cursor = "crosshair";
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Handle drag and drop on canvas
  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvas.classList.add("drag-over");
  });

  canvas.addEventListener("dragleave", () => {
    canvas.classList.remove("drag-over");
  });

  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvas.classList.remove("drag-over");

    if (e.dataTransfer?.files.length) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        resetState();
        handleFile(file);
      }
    }
  });

  // Color Picking Logic
  // Allow user to select which color they are picking
  colorASwatch?.parentElement?.addEventListener("click", () => {
    pickingMode = "A";
    highlightActivePicker();
  });

  colorBSwatch?.parentElement?.addEventListener("click", () => {
    pickingMode = "B";
    highlightActivePicker();
  });

  function highlightActivePicker() {
    const rowA = colorASwatch?.parentElement;
    const rowB = colorBSwatch?.parentElement;

    if (pickingMode === "A") {
      rowA?.classList.add("active-picker");
      rowB?.classList.remove("active-picker");
    } else {
      rowA?.classList.remove("active-picker");
      rowB?.classList.add("active-picker");
    }
  }

  // Initialize highlight
  highlightActivePicker();

  canvas.addEventListener("click", (e) => {
    if (!ctx || !originalImage) return;

    // Get the bounding rectangle of the canvas on screen
    const rect = canvas.getBoundingClientRect();

    // Calculate the scale factors between the displayed size and the actual canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Calculate the actual x and y coordinates on the canvas
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Ensure coordinates are within bounds
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    const rgb = { r: pixel[0], g: pixel[1], b: pixel[2] };

    if (pickingMode === "A") {
      colorA = rgb;
      if (colorASwatch) colorASwatch.style.backgroundColor = hex;
      if (colorAHex) colorAHex.value = hex.toUpperCase();
    } else {
      colorB = rgb;
      if (colorBSwatch) colorBSwatch.style.backgroundColor = hex;
      if (colorBHex) colorBHex.value = hex.toUpperCase();
    }
  });

  function rgbToHex(r: number, g: number, b: number) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  // Swap Logic
  swapBtn.addEventListener("click", () => {
    if (!ctx || !originalImage) return;

    loadingOverlay?.classList.remove("hidden");
    resultWrapper?.classList.remove("hidden");
    swapBtn.disabled = true;

    setTimeout(() => {
      try {
        const tolerance = parseInt(toleranceSlider.value);

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx || !originalImage) return;

        const width = tempCanvas.width;
        const height = tempCanvas.height;

        tempCtx.drawImage(originalImage, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // 1. Create masks for both colors
        const maskA = new Float32Array(width * height);
        const maskB = new Float32Array(width * height);

        const normalizedTolerance = (tolerance / 100) * 442;
        const feather = 5;
        const lowerBound = Math.max(0, normalizedTolerance - feather);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Distance to Color A
          const diffA = Math.sqrt(
            Math.pow(r - colorA.r, 2) +
              Math.pow(g - colorA.g, 2) +
              Math.pow(b - colorA.b, 2),
          );

          // Distance to Color B
          const diffB = Math.sqrt(
            Math.pow(r - colorB.r, 2) +
              Math.pow(g - colorB.g, 2) +
              Math.pow(b - colorB.b, 2),
          );

          // Mask A
          if (diffA <= normalizedTolerance) {
            let alpha = 1;
            if (diffA > lowerBound) {
              alpha =
                1 - (diffA - lowerBound) / (normalizedTolerance - lowerBound);
            }
            maskA[i / 4] = alpha;
          } else {
            maskA[i / 4] = 0;
          }

          // Mask B
          if (diffB <= normalizedTolerance) {
            let alpha = 1;
            if (diffB > lowerBound) {
              alpha =
                1 - (diffB - lowerBound) / (normalizedTolerance - lowerBound);
            }
            maskB[i / 4] = alpha;
          } else {
            maskB[i / 4] = 0;
          }
        }

        // 2. Apply spatial smoothing
        const smoothedMaskA = new Float32Array(width * height);
        const smoothedMaskB = new Float32Array(width * height);
        const radius = 1;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let sumA = 0;
            let sumB = 0;
            let count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const idx = ny * width + nx;
                  sumA += maskA[idx];
                  sumB += maskB[idx];
                  count++;
                }
              }
            }
            const idx = y * width + x;
            smoothedMaskA[idx] = sumA / count;
            smoothedMaskB[idx] = sumB / count;
          }
        }

        // 3. Apply the swap
        for (let i = 0; i < data.length; i += 4) {
          const alphaA = smoothedMaskA[i / 4];
          const alphaB = smoothedMaskB[i / 4];

          if (alphaA > 0 || alphaB > 0) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            let targetR = r;
            let targetG = g;
            let targetB = b;

            // If it matches A, it should go to B
            if (alphaA > alphaB) {
              targetR = colorB.r * alphaA + r * (1 - alphaA);
              targetG = colorB.g * alphaA + g * (1 - alphaA);
              targetB = colorB.b * alphaA + b * (1 - alphaA);
            }
            // If it matches B, it should go to A
            else if (alphaB > alphaA) {
              targetR = colorA.r * alphaB + r * (1 - alphaB);
              targetG = colorA.g * alphaB + g * (1 - alphaB);
              targetB = colorA.b * alphaB + b * (1 - alphaB);
            }

            data[i] = targetR;
            data[i + 1] = targetG;
            data[i + 2] = targetB;
          }
        }

        tempCtx.putImageData(imageData, 0, 0);
        resultPreview.src = tempCanvas.toDataURL();
        downloadBtn.classList.remove("hidden");
      } catch (error) {
        console.error(error);
        alert("An error occurred during color swapping.");
      } finally {
        loadingOverlay?.classList.add("hidden");
        swapBtn.disabled = false;
      }
    }, 50);
  });

  // Download Logic
  downloadBtn.addEventListener("click", async () => {
    if (!resultPreview.src) return;

    const savePath =
      await window.electronAPI.selectSavePath("swapped_image.png");
    if (savePath) {
      const response = await fetch(resultPreview.src);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const result = await window.electronAPI.saveFile({
        filePath: savePath,
        buffer,
      });

      if (!result.success) {
        alert("Failed to save file: " + result.error);
      }
    }
  });

  function resetState() {
    originalImage = null;
    if (fileInput) fileInput.value = "";
    if (resultPreview) resultPreview.src = "";
    previewContainer?.classList.add("hidden");
    dropZone?.classList.remove("hidden");
    downloadBtn.classList.add("hidden");
    resultWrapper?.classList.add("hidden");

    if (colorASwatch) colorASwatch.style.backgroundColor = "#000000";
    if (colorAHex) colorAHex.value = "#000000";
    colorA = { r: 0, g: 0, b: 0 };

    // Reset B to white default
    if (colorBSwatch) colorBSwatch.style.backgroundColor = "#FFFFFF";
    if (colorBHex) colorBHex.value = "#FFFFFF";
    colorB = { r: 255, g: 255, b: 255 };

    pickingMode = "A";
    highlightActivePicker();
  }

  // Reset Logic
  resetBtn.addEventListener("click", resetState);
}
