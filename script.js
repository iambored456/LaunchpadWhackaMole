// script.js

document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connect-button');
    const midiOutputSelect = document.getElementById('midi-output');
    const statusDisplay = document.getElementById('status');
    const gridContainer = document.getElementById('grid');
    const scoreDisplay = document.getElementById('score-display'); // Correctly referencing the scoreboard

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

    // **Reversed Row Order for Correct Orientation**
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
          selectRandomButton();
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
              // **Clear all pads before starting the game**
              clearAllPads();

              // **Start the game by selecting the first random button**
              selectRandomButton();
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
            // **Clear all pads before starting the game with the new output**
            clearAllPads();
            // **Restart the game with the new output**
            selectRandomButton();
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
});
