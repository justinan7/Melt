(function () {
  "use strict";

  // Elements
  var setupScreen = document.getElementById("setup");
  var timerScreen = document.getElementById("timer");
  var doneScreen = document.getElementById("done");
  var timeDisplay = document.getElementById("time-left");
  var ringProgress = document.getElementById("ring-progress");
  var btnPause = document.getElementById("btn-pause");
  var btnCancel = document.getElementById("btn-cancel");
  var btnReset = document.getElementById("btn-reset");
  var customInput = document.getElementById("custom-minutes");
  var customStart = document.getElementById("custom-start");

  // Ring circumference (2 * PI * r where r=90)
  var CIRCUMFERENCE = 2 * Math.PI * 90;
  ringProgress.style.strokeDasharray = CIRCUMFERENCE;

  // State
  var totalSeconds = 0;
  var remainingSeconds = 0;
  var timerInterval = null;
  var paused = false;
  var endTime = 0;

  // --- Screen transitions ---
  function showScreen(screen) {
    setupScreen.classList.remove("active");
    timerScreen.classList.remove("active");
    doneScreen.classList.remove("active");
    screen.classList.add("active");
  }

  // --- Timer display ---
  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function updateDisplay() {
    timeDisplay.textContent = formatTime(remainingSeconds);
    var progress = 1 - remainingSeconds / totalSeconds;
    ringProgress.style.strokeDashoffset = CIRCUMFERENCE * progress;
  }

  // --- Timer controls ---
  function startTimer(minutes) {
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    paused = false;
    btnPause.textContent = "Pause";
    endTime = Date.now() + totalSeconds * 1000;
    updateDisplay();
    showScreen(timerScreen);

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
    showScreen(doneScreen);

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }

  function togglePause() {
    if (paused) {
      // Resuming — recalculate end time
      endTime = Date.now() + remainingSeconds * 1000;
      paused = false;
      btnPause.textContent = "Pause";
    } else {
      paused = true;
      btnPause.textContent = "Resume";
    }
  }

  function cancel() {
    clearInterval(timerInterval);
    timerInterval = null;
    showScreen(setupScreen);
  }

  function reset() {
    showScreen(setupScreen);
  }

  // --- Event listeners ---
  // Preset buttons
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
    if (e.key === "Enter") {
      customStart.click();
    }
  });

  // Timer controls
  btnPause.addEventListener("click", togglePause);
  btnCancel.addEventListener("click", cancel);
  btnReset.addEventListener("click", reset);

  // Prevent pull-to-refresh on mobile
  document.body.addEventListener("touchmove", function (e) {
    if (!e.target.closest("input")) {
      e.preventDefault();
    }
  }, { passive: false });

  // Keep screen awake via Wake Lock API
  var wakeLock = null;

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (_) {
      // Wake Lock not available or denied — no problem
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && timerInterval && !paused) {
      requestWakeLock();
    }
  });

  // Request wake lock when timer starts (patched into startTimer)
  var _origStart = startTimer;
  startTimer = function (minutes) {
    _origStart(minutes);
    requestWakeLock();
  };

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
})();
