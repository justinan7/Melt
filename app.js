(function () {
  "use strict";

  // --- Themes ---
  // Each theme defines a color ramp (fraction → rgb), background, and done flash colors.
  var THEMES = {
    sunrise: {
      // Green → Yellow → Orange → Red
      color: function (f) {
        if (f > 0.5) {
          var t = (f - 0.5) / 0.5;
          return rgb(lerp(255, 76, t), lerp(235, 175, t), lerp(59, 80, t));
        }
        var t2 = f / 0.5;
        return rgb(lerp(244, 255, t2), lerp(67, 235, t2), lerp(54, 59, t2));
      },
      done: ["#ff6b35", "#ffeb3b", "#4CAF50"]
    },
    ice: {
      // White/ice-blue → Sky blue → Deep blue
      color: function (f) {
        if (f > 0.5) {
          var t = (f - 0.5) / 0.5;
          return rgb(lerp(100, 232, t), lerp(181, 244, t), lerp(246, 248, t));
        }
        var t2 = f / 0.5;
        return rgb(lerp(21, 100, t2), lerp(101, 181, t2), lerp(192, 246, t2));
      },
      done: ["#e8f4f8", "#64B5F6", "#1565C0"]
    },
    lava: {
      // Bright orange → Dark red → Near black
      color: function (f) {
        if (f > 0.5) {
          var t = (f - 0.5) / 0.5;
          return rgb(lerp(211, 255, t), lerp(47, 109, t), lerp(47, 0, t));
        }
        var t2 = f / 0.5;
        return rgb(lerp(49, 211, t2), lerp(27, 47, t2), lerp(0, 47, t2));
      },
      done: ["#FF6D00", "#D32F2F", "#FF8F00"]
    },
    ocean: {
      // Bright cyan → Teal → Deep navy
      color: function (f) {
        if (f > 0.5) {
          var t = (f - 0.5) / 0.5;
          return rgb(lerp(0, 77, t), lerp(137, 208, t), lerp(123, 225, t));
        }
        var t2 = f / 0.5;
        return rgb(lerp(13, 0, t2), lerp(33, 137, t2), lerp(55, 123, t2));
      },
      done: ["#4DD0E1", "#00897B", "#0D47A1"]
    }
  };

  function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function rgb(r, g, b) {
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  // --- Elements ---
  var setupScreen = document.getElementById("setup");
  var visualTimerScreen = document.getElementById("visual-timer");
  var classicTimerScreen = document.getElementById("timer");
  var doneVisualScreen = document.getElementById("done-visual");
  var doneClassicScreen = document.getElementById("done");

  var visualFill = document.getElementById("visual-fill");
  var visualCancel = document.getElementById("visual-cancel");
  var doneFlash = document.getElementById("done-flash");

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
  var themePicker = document.getElementById("theme-picker");

  // Ring circumference
  var CIRCUMFERENCE = 2 * Math.PI * 90;
  ringProgress.style.strokeDasharray = CIRCUMFERENCE;

  // --- State ---
  var totalSeconds = 0;
  var remainingSeconds = 0;
  var timerInterval = null;
  var paused = false;
  var endTime = 0;
  var mode = "visual";
  var currentTheme = "sunrise";
  var doneFlashInterval = null;

  // Restore saved preferences
  try {
    var saved = localStorage.getItem("melt-theme");
    if (saved && THEMES[saved]) currentTheme = saved;
    var savedMode = localStorage.getItem("melt-mode");
    if (savedMode === "classic" || savedMode === "visual") mode = savedMode;
  } catch (_) {}

  // Apply saved mode to UI
  if (mode === "classic") {
    modeClassicBtn.classList.add("active");
    modeVisualBtn.classList.remove("active");
  }

  // Apply saved theme to UI
  var swatches = themePicker.querySelectorAll(".theme-swatch");
  for (var si = 0; si < swatches.length; si++) {
    swatches[si].classList.toggle("active", swatches[si].getAttribute("data-theme") === currentTheme);
  }

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
    try { localStorage.setItem("melt-mode", mode); } catch (_) {}
  });

  modeClassicBtn.addEventListener("click", function () {
    mode = "classic";
    modeClassicBtn.classList.add("active");
    modeVisualBtn.classList.remove("active");
    try { localStorage.setItem("melt-mode", mode); } catch (_) {}
  });

  // --- Theme picker ---
  themePicker.addEventListener("click", function (e) {
    var btn = e.target.closest(".theme-swatch");
    if (!btn) return;
    var theme = btn.getAttribute("data-theme");
    if (!THEMES[theme]) return;

    currentTheme = theme;
    var all = themePicker.querySelectorAll(".theme-swatch");
    for (var i = 0; i < all.length; i++) {
      all[i].classList.toggle("active", all[i] === btn);
    }
    try { localStorage.setItem("melt-theme", theme); } catch (_) {}
  });

  // --- Timer display ---
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
      visualFill.style.background = THEMES[currentTheme].color(fraction);
    } else {
      timeDisplay.textContent = formatTime(remainingSeconds);
      ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
    }
  }

  // --- Done flash animation (JS-driven for theme colors) ---
  function startDoneFlash() {
    var colors = THEMES[currentTheme].done;
    var idx = 0;
    doneFlash.style.background = colors[0];

    doneFlashInterval = setInterval(function () {
      idx = (idx + 1) % colors.length;
      doneFlash.style.background = colors[idx];
    }, 200);
  }

  function stopDoneFlash() {
    if (doneFlashInterval) {
      clearInterval(doneFlashInterval);
      doneFlashInterval = null;
    }
    doneFlash.style.background = "transparent";
  }

  // --- Timer controls ---
  function startTimer(minutes) {
    totalSeconds = Math.round(minutes * 60);
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
      startDoneFlash();
      showScreen(doneVisualScreen);
    } else {
      showScreen(doneClassicScreen);
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }

  // --- Pause / Resume ---
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
    stopDoneFlash();
    showScreen(setupScreen);
  }

  // --- Event listeners ---
  var presets = document.querySelectorAll(".preset");
  for (var i = 0; i < presets.length; i++) {
    presets[i].addEventListener("click", function () {
      startTimer(parseInt(this.getAttribute("data-minutes"), 10));
    });
  }

  customStart.addEventListener("click", function () {
    var val = parseFloat(customInput.value);
    if (val > 0 && val <= 180) {
      startTimer(val);
      customInput.value = "";
    }
  });

  customInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") customStart.click();
  });

  btnPause.addEventListener("click", togglePause);
  btnCancel.addEventListener("click", cancel);
  btnReset.addEventListener("click", reset);

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
