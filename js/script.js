class MediaPlayer {
  constructor() {
    this.vol = 0.2;
    this.currentMediaFile = null;
    this.currentIndex = -1;
    this.paths = [];
    this.cardsCount = 0;
    this.cardElements = []; // Store card elements for easier access
    this.currentPlayingCard = null; // Track currently playing card
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.elements = {
      cardContainer: document.querySelector(".cardsContainer"),
      cardTemplate: document.querySelector(".card"),
      playBtn: document.querySelector(".playPauseBtn"),
      nextBtn: document.querySelector(".nextBtn"),
      prevBtn: document.querySelector(".prevBtn"),
      elapsedTime: document.querySelector(".elapsedTime"),
      totalTime: document.querySelector(".totalTime"),
      contentRange: document.querySelector("#contentRange"),
      contentRangeContainer: document.querySelector("#playSeekbar"),
      volumeBar: document.querySelector("#volumeRange"),
      volumeSeekBar: document.querySelector("#volumeSeekbar"),
      propertiesSection: document.querySelector("#propertiesSection"),
      hamburgerIcon: document.querySelector("#hamburgerIcon"),
    };

    this.elements.cardTemplate.style.display = "none";
  }

  formatSecondsToMinutes(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min; // Fixed random range calculation
  }

  async loadContent() {
    try {
      const response = await fetch("./content");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentValue = await response.text();
      const contentDiv = document.createElement("div");
      contentDiv.innerHTML = contentValue;
      return contentDiv.getElementsByTagName("a");
    } catch (error) {
      console.error("Failed to load content:", error);
      return [];
    }
  }

  createMediaCards(anchorTags) {
    const cardElements = [];
    for (const element of anchorTags) {
      if (this.isMediaFile(element.href)) {
        const elementInnerText = element.innerText.split(".")[0];
        const newCard = this.createCard(elementInnerText, element.href);
        this.paths.push(element.href);
        cardElements.push(newCard);
      }
    }
    return cardElements;
  }

  isMediaFile(href) {
    const mediaExtensions = [
      ".mp3",
      ".wav",
      ".ogg",
      ".m4a",
      ".flac",
      ".mkv",
      ".mp4",
      ".webm",
      ".avi",
    ];
    return mediaExtensions.some((ext) => href.toLowerCase().endsWith(ext));
  }

  createCard(title, path) {
    const newElement = this.elements.cardTemplate.cloneNode(true);
    newElement.style.display = "flex";
    newElement.querySelector(".cardTitle").innerText = title;
    newElement.querySelector(".cardPath").href = path;
    this.elements.cardContainer.appendChild(newElement);
    return newElement;
  }

  updateCardVisualState(index) {
    // Remove playing-card class from all cards
    this.cardElements.forEach((card) => {
      card.classList.remove("playing-card");
    });

    // Add playing-card class to current card
    if (index >= 0 && index < this.cardElements.length) {
      this.cardElements[index].classList.add("playing-card");
      this.currentPlayingCard = this.cardElements[index];
    }
  }

  playMedia(index) {
    if (index < 0 || index >= this.paths.length) {
      console.warn("Invalid media index:", index);
      return;
    }

    // Stop current media if playing
    if (this.currentMediaFile) {
      this.currentMediaFile.pause();
      this.currentMediaFile.removeEventListener(
        "timeupdate",
        this.timeUpdateHandler
      );
      this.currentMediaFile.removeEventListener("ended", this.endedHandler);
    }

    this.currentIndex = index;
    this.currentMediaFile = new Audio(this.paths[index]);
    this.currentMediaFile.volume = this.vol;

    // Create bound event handlers to avoid memory leaks
    this.timeUpdateHandler = () => {
      this.elements.elapsedTime.innerText = this.formatSecondsToMinutes(
        this.currentMediaFile.currentTime
      );
      this.elements.totalTime.innerText = this.formatSecondsToMinutes(
        this.currentMediaFile.duration
      );

      if (this.currentMediaFile.duration > 0) {
        this.elements.contentRange.style.width =
          (this.currentMediaFile.currentTime / this.currentMediaFile.duration) *
            100 +
          "%";
      }
    };

    this.endedHandler = () => {
      this.playNext();
    };

    this.currentMediaFile.addEventListener(
      "timeupdate",
      this.timeUpdateHandler
    );
    this.currentMediaFile.addEventListener("ended", this.endedHandler);

    this.currentMediaFile.play().catch((error) => {
      console.error("Error playing media:", error);
    });

    this.elements.playBtn.src = "./assets/icons/pause.png";
    this.updateCardVisualState(index); // Update card visual state
  }

  playNext() {
    if (this.currentIndex < this.paths.length - 1) {
      this.playMedia(this.currentIndex + 1);
    }
  }

  playPrevious() {
    if (this.currentIndex > 0) {
      this.playMedia(this.currentIndex - 1);
    }
  }

  togglePlayPause() {
    if (this.currentMediaFile) {
      if (this.currentMediaFile.paused) {
        this.currentMediaFile.play().catch((error) => {
          console.error("Error resuming media:", error);
        });
        this.elements.playBtn.src = "./assets/icons/pause.png";
      } else {
        this.currentMediaFile.pause();
        this.elements.playBtn.src = "./assets/icons/play.png";
      }
    } else if (this.cardsCount > 0) {
      this.playMedia(this.randomNumber(0, this.cardsCount - 1));
    }
  }

  updateVolumeUI() {
    // Update volume bar width
    this.elements.volumeBar.style.width = this.vol * 100 + "%";

    // Update volume seekbar color based on volume level
    let color;
    if (this.vol >= 0 && this.vol <= 0.7) {
      color = "blue";
    } else if (this.vol > 0.7 && this.vol <= 1) {
      color = "red";
    }
    this.elements.volumeBar.style.backgroundColor = color;
  }

  handleVolumeChange(event) {
    const rect = this.elements.volumeSeekBar.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));

    this.vol = Math.round(percentage * 10) / 10; // Round to 1 decimal place

    if (this.currentMediaFile) {
      this.currentMediaFile.volume = this.vol;
    }

    this.updateVolumeUI();
  }

  adjustVolume(delta) {
    this.vol = Math.max(0, Math.min(1, this.vol + delta));
    this.vol = Math.round(this.vol * 10) / 10; // Round to 1 decimal place

    if (this.currentMediaFile) {
      this.currentMediaFile.volume = this.vol;
    }

    this.updateVolumeUI();
  }

  handleKeyboardControls(event) {
    const keyHandlers = {
      Space: (e) => {
        e.preventDefault();
        this.togglePlayPause();
      },
      ArrowRight: (e) => {
        e.preventDefault();
        this.playNext();
      },
      ArrowLeft: (e) => {
        e.preventDefault();
        this.playPrevious();
      },
      ArrowUp: (e) => {
        e.preventDefault();
        this.adjustVolume(0.1);
      },
      ArrowDown: (e) => {
        e.preventDefault();
        this.adjustVolume(-0.1);
      },
    };

    if (keyHandlers[event.code]) {
      keyHandlers[event.code](event);
    }
  }

  setupEventListeners() {
    this.elements.playBtn.addEventListener("click", () =>
      this.togglePlayPause()
    );

    this.elements.nextBtn.addEventListener("click", () => this.playNext());

    this.elements.prevBtn.addEventListener("click", () => this.playPrevious());

    this.elements.contentRangeContainer.addEventListener("click", (event) => {
      if (this.currentMediaFile && this.currentMediaFile.duration) {
        const rect =
          this.elements.contentRangeContainer.getBoundingClientRect();
        const percentage = (event.clientX - rect.left) / rect.width;
        const newTime = Math.max(
          0,
          Math.min(
            this.currentMediaFile.duration,
            percentage * this.currentMediaFile.duration
          )
        );
        this.currentMediaFile.currentTime = newTime;
      }
    });

    this.elements.volumeSeekBar.addEventListener("click", (e) =>
      this.handleVolumeChange(e)
    );

    document.addEventListener("keydown", (e) => this.handleKeyboardControls(e));
  }

  async initialize() {
    const anchorTags = await this.loadContent();
    this.cardElements = this.createMediaCards(anchorTags);
    this.cardsCount = this.cardElements.length;

    if (this.cardsCount === 0) {
      console.warn("No media files found");
      return;
    }

    this.cardElements.forEach((card, index) => {
      card.addEventListener("click", () => {
        this.playMedia(index);
      });
    });

    this.updateVolumeUI();
  }
}

// Initialize the media player
(async () => {
  const player = new MediaPlayer();
  await player.initialize();
})();

// Side Menu Toggle - Fixed selector inconsistency
const hamburgerIcon = document.querySelector("#hamburger-icon");
const crossIcon = document.querySelector("#close-btn");
const sideMenu = document.querySelector("#propertiesSection");

hamburgerIcon.addEventListener("click", () => {
  crossIcon.style.display = "block";
  sideMenu.style.transform = "translateX(0)";
});

crossIcon.addEventListener("click", () => {
  sideMenu.style.transform = "translateX(-200%)";
});
