(function () {
  "use strict";

  // --- Elements ---
  var setupScreen = document.getElementById("setup");
  var visualTimerScreen = document.getElementById("visual-timer");
  var classicTimerScreen = document.getElementById("timer");
  var doneVisualScreen = document.getElementById("done-visual");
  var doneClassicScreen = document.getElementById("done");

  var visualFill = document.getElementById("visual-fill");
  var visualCancel = document.getElementById("visual-cancel");

  var timeDisplay = document.getElementById("time-left");
  var ringProgress = document.getElementById("ring-progress");
  var btnPause = document.getElementById("btn-pause");
  var btnCancel = document.getElementById("btn-cancel");
  var btnReset = document.getElementById("btn-reset");
  var btnResetVisual = document.getElementById("btn-reset-visual");
  var customInput = document.getElementById("custom-minutes");
  var customStart = document.getElementById("custom-start");

  var modeVisualBtn = document.getElementById("mode-visual");
  var modeClassicBtn = document.getElementById("mode-classic");

  // Ring circumference
  var CIRCUMFERENCE = 2 * Math.PI * 90;
  ringProgress.style.strokeDasharray = CIRCUMFERENCE;

  // --- State ---
  var totalSeconds = 0;
  var remainingSeconds = 0;
  var timerInterval = null;
  var paused = false;
  var endTime = 0;
  var mode = "visual"; // "visual" or "classic"

  var allScreens = [setupScreen, visualTimerScreen, classicTimerScreen, doneVisualScreen, doneClassicScreen];

  // --- Screen transitions ---
  function showScreen(screen) {
    for (var i = 0; i < allScreens.length; i++) {
      allScreens[i].classList.remove("active");
    }
    screen.classList.add("active");
  }

  // --- Mode toggle ---
  modeVisualBtn.addEventListener("click", function () {
    mode = "visual";
    modeVisualBtn.classList.add("active");
    modeClassicBtn.classList.remove("active");
  });

  modeClassicBtn.addEventListener("click", function () {
    mode = "classic";
    modeClassicBtn.classList.add("active");
    modeVisualBtn.classList.remove("active");
  });

  // --- Color interpolation for visual bar ---
  // Green → Yellow → Orange → Red as time depletes
  function fillColor(fraction) {
    // fraction: 1 = full time left, 0 = no time left
    var r, g, b;
    if (fraction > 0.5) {
      // Green to Yellow (1.0 → 0.5)
      var t = (fraction - 0.5) / 0.5;
      r = Math.round(255 * (1 - t) + 76 * t);
      g = Math.round(235 * (1 - t) + 175 * t);
      b = Math.round(59 * (1 - t) + 80 * t);
    } else {
      // Yellow to Red (0.5 → 0.0)
      var t2 = fraction / 0.5;
      r = Math.round(244 * (1 - t2) + 255 * t2);
      g = Math.round(67 * (1 - t2) + 235 * t2);
      b = Math.round(54 * (1 - t2) + 59 * t2);
    }
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  // --- Timer display (classic) ---
  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function updateDisplay() {
    var fraction = remainingSeconds / totalSeconds;

    if (mode === "visual") {
      var pct = (fraction * 100).toFixed(2);
      visualFill.style.height = pct + "%";
      visualFill.style.background = fillColor(fraction);
    } else {
      timeDisplay.textContent = formatTime(remainingSeconds);
      ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
    }
  }

  // --- Timer controls ---
  function startTimer(minutes) {
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    paused = false;

    if (mode === "visual") {
      visualTimerScreen.classList.remove("paused");
      showScreen(visualTimerScreen);
    } else {
      btnPause.textContent = "Pause";
      showScreen(classicTimerScreen);
    }

    endTime = Date.now() + totalSeconds * 1000;
    updateDisplay();
    timerInterval = setInterval(tick, 250);
  }

  function tick() {
    if (paused) return;

    var now = Date.now();
    remainingSeconds = Math.max(0, Math.round((endTime - now) / 1000));
    updateDisplay();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      finish();
    }
  }

  function finish() {
    if (mode === "visual") {
      showScreen(doneVisualScreen);
    } else {
      showScreen(doneClassicScreen);
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }

  // --- Pause / Resume ---
  // Classic mode
  function togglePause() {
    if (paused) {
      endTime = Date.now() + remainingSeconds * 1000;
      paused = false;
      btnPause.textContent = "Pause";
    } else {
      paused = true;
      btnPause.textContent = "Resume";
    }
  }

  // Visual mode: tap anywhere to pause/resume
  visualFill.addEventListener("click", function () {
    if (paused) {
      endTime = Date.now() + remainingSeconds * 1000;
      paused = false;
      visualTimerScreen.classList.remove("paused");
    } else {
      paused = true;
      visualTimerScreen.classList.add("paused");
    }
  });

  function cancel() {
    clearInterval(timerInterval);
    timerInterval = null;
    showScreen(setupScreen);
  }

  function reset() {
    showScreen(setupScreen);
  }

  // --- Event listeners ---
  // Presets
  var presets = document.querySelectorAll(".preset");
  for (var i = 0; i < presets.length; i++) {
    presets[i].addEventListener("click", function () {
      startTimer(parseInt(this.getAttribute("data-minutes"), 10));
    });
  }

  // Custom input
  customStart.addEventListener("click", function () {
    var val = parseInt(customInput.value, 10);
    if (val > 0 && val <= 180) {
      startTimer(val);
      customInput.value = "";
    }
  });

  customInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") customStart.click();
  });

  // Classic controls
  btnPause.addEventListener("click", togglePause);
  btnCancel.addEventListener("click", cancel);
  btnReset.addEventListener("click", reset);

  // Visual controls
  visualCancel.addEventListener("click", function (e) {
    e.stopPropagation();
    cancel();
  });
  btnResetVisual.addEventListener("click", reset);

  // Prevent pull-to-refresh
  document.body.addEventListener("touchmove", function (e) {
    if (!e.target.closest("input")) {
      e.preventDefault();
    }
  }, { passive: false });

  // --- Wake Lock ---
  var wakeLock = null;

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (_) {}
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && timerInterval && !paused) {
      requestWakeLock();
    }
  });

  // Patch startTimer to request wake lock
  var _origStart = startTimer;
  startTimer = function (minutes) {
    _origStart(minutes);
    requestWakeLock();
  };

  // --- Service Worker ---
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
})();
