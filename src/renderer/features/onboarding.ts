export function initOnboarding() {
  const overlay = document.getElementById("onboarding-overlay");
  const steps = document.querySelectorAll(".onboarding-step");
  const dots = document.querySelectorAll(".dot");
  const nextBtn = document.getElementById("onboarding-next");
  const prevBtn = document.getElementById("onboarding-prev");
  const finishBtn = document.getElementById("onboarding-finish");
  const skipBtn = document.getElementById("onboarding-skip");

  let currentStep = 1;
  const totalSteps = steps.length;

  // Check if onboarding has been completed
  const onboardingCompleted = localStorage.getItem("onboarding-completed");
  if (onboardingCompleted === "true") {
    overlay?.classList.add("hidden");
    return;
  }

  // Wait for the logo image to load before showing the onboarding
  const logoImg = document.querySelector(
    '.onboarding-step[data-step="1"] img'
  ) as HTMLImageElement;

  const showOverlay = () => {
    overlay?.classList.remove("hidden");
  };

  if (logoImg) {
    if (logoImg.complete) {
      showOverlay();
    } else {
      logoImg.addEventListener("load", showOverlay);
      logoImg.addEventListener("error", showOverlay); // Show anyway if it fails
    }
  } else {
    showOverlay();
  }

  function updateUI() {
    // Update steps
    steps.forEach((step) => {
      const stepNum = parseInt((step as HTMLElement).dataset.step || "0");
      if (stepNum === currentStep) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });

    // Update dots
    dots.forEach((dot, index) => {
      if (index + 1 === currentStep) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });

    // Update buttons
    if (currentStep === 1) {
      prevBtn?.classList.add("hidden");
    } else {
      prevBtn?.classList.remove("hidden");
    }

    if (currentStep === totalSteps) {
      nextBtn?.classList.add("hidden");
      finishBtn?.classList.remove("hidden");
    } else {
      nextBtn?.classList.remove("hidden");
      finishBtn?.classList.add("hidden");
    }
  }

  nextBtn?.addEventListener("click", () => {
    if (currentStep < totalSteps) {
      currentStep++;
      updateUI();
    }
  });

  prevBtn?.addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep--;
      updateUI();
    }
  });

  function completeOnboarding() {
    localStorage.setItem("onboarding-completed", "true");
    overlay?.classList.add("hidden");
  }

  finishBtn?.addEventListener("click", completeOnboarding);
  skipBtn?.addEventListener("click", completeOnboarding);

  // Initialize UI
  updateUI();
}
