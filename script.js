document.addEventListener('DOMContentLoaded', () => {
  const connectButton = document.getElementById('connect-button');
  const midiOutputSelect = document.getElementById('midi-output');
  const statusDisplay = document.getElementById('status');
  const gridContainer = document.getElementById('grid');
  const scoreDisplay = document.getElementById('score-display'); // Correctly referencing the scoreboard

  // New elements
  const timerSelect = document.getElementById('timer-select');
  const startButton = document.getElementById('start-button');
  const resetButton = document.getElementById('reset-button');
  const timerDisplay = document.getElementById('timer-display');

  // Initialize MIDI Output
  let midiOutput = null;

  // Define the MIDI note mapping for the 8x8 grid based on Launchpad X's Programmer Mode
  const midiNoteMapping = [];
  const startingNote = 11; // Starting at note 11
  const endingNote = 88;    // Ending at note 88
  const rowIncrement = 10;  // Each row increments by 10 notes

  // Define the desired colors and their corresponding velocity values
  const colorMap = [
    { hex: '#f090ae', velocity: 10 }, // Light Pink
    { hex: '#f59383', velocity: 20 }, // Coral
    { hex: '#ea9e5e', velocity: 30 }, // Orange
    { hex: '#d0ae4e', velocity: 40 }, // Gold
    { hex: '#a8bd61', velocity: 50 }, // Lime Green
    { hex: '#76c788', velocity: 60 }, // Medium Green
    { hex: '#41cbb5', velocity: 70 }, // Teal
    { hex: '#33c6dc', velocity: 80 }, // Sky Blue
    { hex: '#62bbf7', velocity: 90 }, // Blue
    { hex: '#94adff', velocity: 100 }, // Light Blue
    { hex: '#bea0f3', velocity: 110 }, // Lavender
    { hex: '#dd95d6', velocity: 120 }, // Pink Purple
  ];

  // **Fixed Row Order for Correct Orientation**
  for (let row = 7; row >= 0; row--) { // Start from row 7 (top) to row 0 (bottom)
    for (let col = 0; col < 8; col++) {
      const note = startingNote + row * rowIncrement + col;
      if (note <= endingNote) { // Ensure note number is valid
        midiNoteMapping.push(note);
      }
    }
  }

  console.log("MIDI Note Mapping:", midiNoteMapping);

  // Create grid squares dynamically
  midiNoteMapping.forEach(note => {
    const square = document.createElement('div');
    square.classList.add('square');
    square.dataset.note = note;
    gridContainer.appendChild(square);
  });

  // Function to populate MIDI Output Select Dropdown
  function populateMIDIDevices(midiAccess) {
    const outputs = Array.from(midiAccess.outputs.values());
    midiOutputSelect.innerHTML = ''; // Clear existing options

    outputs.forEach((output, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.text = `${output.name} (${output.manufacturer})`;
      midiOutputSelect.appendChild(option);
    });

    if (outputs.length > 0) {
      midiOutputSelect.selectedIndex = 0;
      midiOutput = outputs[0];
      console.log("Default MIDI Output Selected:", midiOutput.name);
      statusDisplay.innerText = `Connected to: ${midiOutput.name}`;
      // Automatically switch to Programmer Mode
      switchToProgrammerMode();
      // Introduce a delay to ensure Launchpad is ready
      setTimeout(() => {
        clearAllPads();
        // **Start Freeplay Mode Instead of Continuous Game**
        startFreeplay(); // New function for freeplay mode
      }, 500); // 500ms delay
    } else {
      statusDisplay.innerText = "No MIDI Output Devices Found.";
    }
  }

  // Function to send a MIDI message
  function sendMIDIMessage(message) {
    if (midiOutput) {
      try {
        const uint8Message = new Uint8Array(message); // Convert to Uint8Array
        midiOutput.send(uint8Message);
        console.log("Sent MIDI Message:", message);
      } catch (error) {
        console.error("Failed to send MIDI message:", error);
        alert("Failed to send MIDI message. Ensure SysEx access is enabled.");
      }
    } else {
      console.warn("MIDI Output not connected.");
    }
  }

  // Function to switch Launchpad X to Programmer Mode
  function switchToProgrammerMode() {
    // SysEx message to switch to Programmer Mode
    const sysExProgrammerMode = [
      0xF0, 0x00, 0x20, 0x29, 0x02, 0x0C, 0x0E, 0x01, 0xF7
    ];
    sendMIDIMessage(sysExProgrammerMode);
    console.log("Switched to Programmer Mode.");
  }

  // Function to switch Launchpad X to Live Mode (if needed)
  function switchToLiveMode() {
    // SysEx message to switch to Live Mode
    const sysExLiveMode = [
      0xF0, 0x00, 0x20, 0x29, 0x02, 0x0C, 0x0E, 0x00, 0xF7
    ];
    sendMIDIMessage(sysExLiveMode);
    console.log("Switched to Live Mode.");
  }

  // Function to turn off all Launchpad pads
  function clearAllPads() {
    midiNoteMapping.forEach(note => {
      turnOffButton(note);
    });
    console.log("All Launchpad pads have been turned off.");
  }

  // Function to light up a Launchpad button with specific color
  function lightButton(note, velocity, channel = 1) { // Accept velocity as a parameter
    let statusByte;
    switch (channel) {
      case 1: // Static Color
        statusByte = 0x90; // 144
        break;
      case 2: // Flashing Color
        statusByte = 0x91; // 145
        break;
      case 3: // Pulsing Color
        statusByte = 0x92; // 146
        break;
      default:
        statusByte = 0x90; // Default to Static Color
    }
    const noteOn = [statusByte, note, velocity];
    sendMIDIMessage(noteOn);
  }

  // Function to turn off a Launchpad button
  function turnOffButton(note) {
    // Note Off message: 0x80 (128) + note + velocity 0
    const noteOff = [0x80, note, 0];
    sendMIDIMessage(noteOff);
  }

  // Function to select and illuminate a random button with a random color
  let currentActiveNote = null;

  function selectRandomButton() {
    // If there's a currently active button, ensure it's turned off
    if (currentActiveNote !== null) {
      turnOffButton(currentActiveNote);
      removeWebActive(currentActiveNote);
    }

    // Select a random note from the mapping
    const randomIndex = Math.floor(Math.random() * midiNoteMapping.length);
    const selectedNote = midiNoteMapping[randomIndex];
    currentActiveNote = selectedNote;

    // Select a random color from the colorMap
    const selectedColor = getRandomColor();

    // Illuminate the selected button on Launchpad with the selected color's velocity
    lightButton(selectedNote, selectedColor.velocity, 1); // Channel 1 for Static Color

    // Illuminate the corresponding square on the web grid with the selected color
    const square = document.querySelector(`.square[data-note="${selectedNote}"]`);
    if (square) {
      square.classList.add('active-web');
      square.style.backgroundColor = selectedColor.hex; // Set the web grid's color
    }

    console.log(`Selected Note: ${selectedNote}, Color: ${selectedColor.hex}`);
  }

  // Function to get a random color from the colorMap
  function getRandomColor() {
    const randomIndex = Math.floor(Math.random() * colorMap.length);
    return colorMap[randomIndex];
  }

  // Function to remove active state from web grid
  function removeWebActive(note) {
    const square = document.querySelector(`.square[data-note="${note}"]`);
    if (square) {
      square.classList.remove('active-web');
      square.style.backgroundColor = '#333333'; // Reset to default color
    }
  }

  // Function to handle incoming MIDI messages
  function handleMIDIMessage(message) {
    const [status, note, velocity] = message.data;

    const command = status & 0xf0;
    const channel = status & 0x0f;

    if (command === 0x90 && velocity > 0) { // Note On
      console.log(`Button Pressed: ${note}`);

      if (note === currentActiveNote) {
        // User pressed the active button
        console.log("Correct Button Pressed!");

        // Update score
        updateScore();

        // Turn off the button on Launchpad
        turnOffButton(note);

        // Remove active state from web grid
        removeWebActive(note);

        // Select a new random button
        selectRandomButton();
      } else {
        console.log("Wrong Button Pressed!");
        // Optionally, handle incorrect presses (e.g., decrement score)
      }
    }
  }

  // Function to initialize MIDI
  function initMIDI() {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({ sysex: true }) // Request SysEx access
        .then(midiAccess => {
          console.log('MIDI Access Granted:', midiAccess);
          populateMIDIDevices(midiAccess);

          // Listen for MIDI messages from all inputs
          const inputs = midiAccess.inputs.values();
          for (let input of inputs) {
            console.log('Connected MIDI Input:', input.name);
            input.onmidimessage = handleMIDIMessage;
          }

          // Handle any future MIDI inputs/outputs
          midiAccess.onstatechange = (e) => {
            const port = e.port;
            console.log('MIDI Port State Change:', port.name, port.state);
            if (port.type === "input" && port.state === "connected") {
              port.onmidimessage = handleMIDIMessage;
              console.log('New MIDI Input Connected:', port.name);
            }

            if (port.type === "output") {
              // Update MIDI output devices in the dropdown
              populateMIDIDevices(midiAccess);
            }
          };

          // **Switch to Programmer Mode**
          switchToProgrammerMode();

          // **Wait for a short delay to ensure Launchpad X is in Programmer Mode**
          setTimeout(() => {
            // **Clear all pads before starting freeplay**
            clearAllPads();

            // **Start Freeplay Mode Instead of Continuous Game**
            startFreeplay(); // New function for freeplay
          }, 500); // 500ms delay; adjust if necessary
        })
        .catch(err => {
          console.error("Failed to get MIDI access", err);
          alert("Could not access your MIDI devices. Ensure SysEx access is enabled and the device is connected.");
        });
    } else {
      alert("Web MIDI API is not supported in this browser.");
    }
  }

  // Function to update score
  let score = 0;

  function updateScore() {
    score++;
    if (scoreDisplay) { // Ensure scoreDisplay exists
      scoreDisplay.innerText = `Score: ${score}`;
    } else {
      console.error("Score Display Element Not Found.");
    }
  }

  // Timer variables
  let timer = null;
  let timeRemaining = 0;

  // Function to pad numbers with leading zeros
  function pad(num) {
    return num < 10 ? '0' + num : num;
  }

  // Function to update timer display
  function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerDisplay.innerText = `Time: ${pad(minutes)}:${pad(seconds)}`;
  }

  // Function to handle countdown
  function countdown() {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timer);
      endGame();
    }
  }

  // **New Function: Start Freeplay Mode**
  function startFreeplay() {
    // Ensure no timers or intervals are running
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    // Reset score
    score = 0;
    updateScore();

    // Reset timer display (optional in freeplay)
    timerDisplay.innerText = `Time: --:--`; // Indicate no timer

    // Clear any existing active buttons
    clearAllPads();

    // Select the first random button
    selectRandomButton();

    console.log("Freeplay mode started.");
  }

  // Function to start the game with countdown (Timed Game)
  function startGame() {
    // Disable the start and reset buttons during the countdown
    startButton.disabled = true;
    resetButton.disabled = true;
    timerSelect.disabled = true;

    // Initiate the digit countdown on Launchpad
    initiateLaunchpadCountdown()
      .then(() => {
        // After countdown, start the game
        // Reset score
        score = 0;
        updateScore();

        // Get selected timer value
        timeRemaining = parseInt(timerSelect.value);

        // Update timer display
        updateTimerDisplay();

        // Start countdown
        if (timer) {
          clearInterval(timer);
        }
        timer = setInterval(countdown, 1000);

        // Initial button selection
        selectRandomButton();

        // Enable the reset button during the game
        resetButton.disabled = false;

        console.log("Timed gameplay started.");
      })
      .catch(err => {
        console.error("Error during Launchpad countdown:", err);
        // Re-enable the start button and timer select in case of error
        startButton.disabled = false;
        resetButton.disabled = false;
        timerSelect.disabled = false;
      });
  }

  // Function to end the game
  function endGame() {
    // Flash all buttons
    flashAllButtons();

    // Enable the start button and timer select
    startButton.disabled = false;
    timerSelect.disabled = false;
    resetButton.disabled = false;

    // Optionally, display a game over message
    console.log("Game Over!");
  }

  // Function to flash all Launchpad buttons
  function flashAllButtons() {
    let flashInterval = 100; // milliseconds
    let flashCount = 0;
    const maxFlashes = 20; // Total flashes

    const flashTimer = setInterval(() => {
      midiNoteMapping.forEach(note => {
        const color = getRandomColor();
        lightButton(note, color.velocity, 2); // Channel 2 for flashing
      });
      flashCount++;
      if (flashCount >= maxFlashes) {
        clearInterval(flashTimer);
        clearAllPads();
      }
    }, flashInterval);
  }

  // Function to initiate the digit countdown on Launchpad
  function initiateLaunchpadCountdown() {
    const digits = [5, 4, 3, 2, 1];
    const digitPatterns = {
      5: [11, 12, 13, 14, 25, 35, 44, 43, 42, 41, 51, 61, 71, 72, 73, 74, 75, 76],
      4: [14, 24, 34, 44, 35, 36, 33, 32, 31, 41, 51, 61, 71],
      3: [21, 12, 13, 14, 25, 35, 44, 43, 55, 65, 74, 73, 72, 61],
      2: [11, 12, 13, 14, 15, 21, 32, 43, 54, 65, 74, 73, 72, 61],
      1: [11, 12, 13, 14, 15, 23, 33, 43, 53, 63, 73, 62, 61]
    };

    // Define a function to convert button numbers to Launchpad note numbers
    function getNoteFromButton(buttonNumber) {
      const buttonStr = buttonNumber.toString();
      const row = parseInt(buttonStr.charAt(0)) - 1; // 1-8 to 0-7
      const col = parseInt(buttonStr.charAt(1)) - 1; // 1-8 to 0-7
      const actualRow = row; // **Fixed: Removed row inversion**
      const note = startingNote + actualRow * rowIncrement + col;
      return note;
    }

    return new Promise((resolve, reject) => {
      let currentDigitIndex = 0;

      function displayNextDigit() {
        if (currentDigitIndex >= digits.length) {
          resolve();
          return;
        }

        const digit = digits[currentDigitIndex];
        const pattern = digitPatterns[digit];

        if (!pattern) {
          console.error(`No pattern defined for digit ${digit}`);
          reject(`No pattern defined for digit ${digit}`);
          return;
        }

        // Light up the digit pattern
        pattern.forEach(buttonNumber => {
          const note = getNoteFromButton(buttonNumber);
          lightButton(note, 100, 1); // Use a consistent color/velocity for countdown
        });

        // Update timer display on web interface
        timerDisplay.innerText = `Get Ready: ${digit}`;

        // After 1 second, clear the digit and proceed to the next
        setTimeout(() => {
          // Clear the digit pattern
          pattern.forEach(buttonNumber => {
            const note = getNoteFromButton(buttonNumber);
            turnOffButton(note);
          });

          currentDigitIndex++;
          displayNextDigit();
        }, 1000);
      }

      displayNextDigit();
    });
  }

  // **New Function: Start Freeplay Mode**
  function startFreeplay() {
    // Ensure no timers or intervals are running
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    // Reset score
    score = 0;
    updateScore();

    // Reset timer display (optional in freeplay)
    timerDisplay.innerText = `Time: --:--`; // Indicate no timer

    // Clear any existing active buttons
    clearAllPads();

    // Select the first random button
    selectRandomButton();

    console.log("Freeplay mode started.");
  }

  // **Adjust Existing Function: Start Continuous Game**
  // This function remains unchanged and is used for timed games
  function startContinuousGame() {
    // This function is no longer called automatically
    // It can be triggered manually if needed
    // For this example, we'll leave it as is
  }

  // Function to reset the game
  function resetGame() {
    // Clear any active timers
    if (timer) {
      clearInterval(timer);
      timer = null;
    }


    // Reset score
    score = 0;
    updateScore();

    // Reset timer display
    timerDisplay.innerText = `Time: 00:00`;

    // Clear Launchpad grid
    clearAllPads();

    // Re-enable controls
    startButton.disabled = false;
    timerSelect.disabled = false;
    resetButton.disabled = false;

    // **Restart Freeplay Mode After Reset**
    startFreeplay();

    console.log("Game has been reset.");
  }

  // Function to flash a digit on Launchpad
  function flashDigit(digit) {
    // Placeholder if you want additional flashing effects
    // Currently handled in initiateLaunchpadCountdown
  }

  // Add event listener to the connect button
  connectButton.addEventListener('click', () => {
    // Initialize MIDI connections
    initMIDI();
    // Disable the connect button to prevent multiple initializations
    connectButton.disabled = true;
    connectButton.innerText = "MIDI Connected";
  });

  // Add event listener to MIDI Output Selector
  midiOutputSelect.addEventListener('change', () => {
    const selectedIndex = midiOutputSelect.selectedIndex;
    const midiAccessPromise = navigator.requestMIDIAccess({ sysex: true });
    midiAccessPromise.then(midiAccess => {
      const outputs = Array.from(midiAccess.outputs.values());
      if (selectedIndex >= 0 && selectedIndex < outputs.length) {
        midiOutput = outputs[selectedIndex];
        console.log("MIDI Output Changed to:", midiOutput.name);
        statusDisplay.innerText = `Connected to: ${midiOutput.name}`;
        // Switch to Programmer Mode with the new output
        switchToProgrammerMode();
        // **Wait for a short delay to ensure Launchpad X is in Programmer Mode**
        setTimeout(() => {
          // **Clear all pads before starting freeplay with the new output**
          clearAllPads();
          // **Start Freeplay Mode Instead of Continuous Game**
          startFreeplay(); // New function for freeplay
        }, 500); // 500ms delay; adjust if necessary
      } else {
        midiOutput = null;
        console.warn("Selected MIDI Output not found.");
        statusDisplay.innerText = "Selected MIDI Output not found.";
      }
    }).catch(err => {
      console.error("Failed to get MIDI access during output change", err);
      alert("Could not access your MIDI devices. Ensure SysEx access is enabled and the device is connected.");
    });
  });

  // **Modify Existing Event Listener for Start Button**
  startButton.addEventListener('click', () => {
    // Start timed gameplay instead of continuous freeplay
    startGame();
    // Disable the start button to prevent multiple starts
    startButton.disabled = true;
    timerSelect.disabled = true;
    resetButton.disabled = false;
  });

  // Add event listener to the reset button
  resetButton.addEventListener('click', resetGame);
});
