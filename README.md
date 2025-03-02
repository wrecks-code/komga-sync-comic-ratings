# Komga Comic Ratings Sync from ComicBookRoundup

Effortlessly sync comic ratings from [ComicBookRoundup](https://comicbookroundup.com/) directly into your [Komga](https://komga.org/) library. This userscript automates the process of fetching critic and user ratings, saving them as metadata links within Komga, enhancing your comic management experience.

## 🚀 Key Features

* **Single Series Sync:** Update ratings for individual series with a click.
  
     ![Series Sync Animation](https://github.com/user-attachments/assets/90ca0b12-673a-4828-88be-fe11495196f2)
* **Bulk Library Sync:** Process entire libraries with a live progress counter.
  
     ![Bulk Library Sync Animation](https://github.com/user-attachments/assets/351cdb2a-3c95-4141-b099-130ad11c1902)
* **Detailed Logging:** Monitor progress and troubleshoot with comprehensive console logs (F12 - > Console, Filter: komga). 
  
     ![Detailed Logs Animation](https://github.com/user-attachments/assets/2a438b07-5062-4f81-b3b1-d42bc8e4f328)
* **New Feature:** Add your own Rating! It also gets saved as a link in Komga.

     ![OwnRatingAnimation](https://github.com/user-attachments/assets/55ffe7c9-4a27-4600-bcc8-7887ee634e93)

* **Optional:** Install the show-ratings-in-library.js as well if you want to see these ratings in your library view (it only shows the one with higher review count, and your personal rating if it exists).
     ![LibraryView](https://github.com/user-attachments/assets/bcb10148-19c0-4c8b-86b4-0a75797c5abf)


## ⚙️ Requirements

* A running [Komga](https://komga.org/) instance with API access enabled.
* A valid Komga API key.
* A userscript manager.
  
## 🔧 Installation

1. **Install a Userscript Manager:**  
   Choose and install one of the following:
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. **Add the Script:**  
   Create a new userscript in your chosen manager and copy-paste the contents of this repository's script.

3. **Configure the Script:**
   - Replace the URL at the top of the script with your Komga URL:
     ```js
     // @match        https://komga.org/*
     ```
   - Replace the placeholder API key at the top of the script:
     ```js
     const KOMGA_API_KEY = "YOUR_API_KEY_HERE";
     ```

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

* **[Komga](https://komga.org/):** For a powerful comic management platform.
* **[ComicBookRoundup](https://comicbookroundup.com/):** For comprehensive comic ratings.
* **[komf](https://github.com/Snd-R/komf):** Komga and Kavita Metadata Fetcher
