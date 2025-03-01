# Komga Comic Ratings Sync from ComicBookRoundup

Effortlessly sync comic ratings from [ComicBookRoundup](https://comicbookroundup.com/) directly into your [Komga](https://komga.org/) library. This userscript automates the process of fetching critic and user ratings, saving them as metadata links within Komga, enhancing your comic management experience.

![Komga Ratings Screenshot](https://github.com/user-attachments/assets/24f791ad-dc5f-442a-9c50-5c6efb1afd4f)

## 🚀 Key Features

* **New Feature: Add your own Rating! It also gets saved as a link in Komga.
    * ![Animation](https://github.com/user-attachments/assets/55ffe7c9-4a27-4600-bcc8-7887ee634e93)


* **Single Series Sync:** Update ratings for individual series with a click.
  
    * ![Single Series Sync Animation](https://github.com/user-attachments/assets/95b31ee6-2a57-478f-8f57-69a6e68d5517)
* **Bulk Library Sync:** Process entire libraries with a live progress counter.
  
    * ![Bulk Library Sync Animation](https://github.com/user-attachments/assets/82d895b2-ceb1-4eae-afa8-8d74eeca8bf8)
* **Detailed Logging:** Monitor progress and troubleshoot with comprehensive console logs.
  
    * ![Detailed Logs Animation](https://github.com/user-attachments/assets/70341cc7-2c45-4b73-8413-7c3143d0940a)
* **Seamless Komga API Integration:** Direct communication for efficient data exchange.

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

## 🛠️ Usage

* **Single Series Sync:**
    * Navigate to a series page in your Komga library.
    * Click the "Fetch Ratings" button that appears.
      
    ![image](https://github.com/user-attachments/assets/5165aaa3-51eb-4702-b0c6-21c1d4a36b1b)

* **Bulk Library Sync:**
    * Navigate to a library page in your Komga library.
    * Click the Star Icon button that appears in the top right.
      
    ![image](https://github.com/user-attachments/assets/8d6db02d-dce7-4099-b8b5-cf3db9df5aa5)

* **Monitor the progress in the console (F12).**

## ⚠️ Troubleshooting

* **Ratings not updating:**
    * Verify that your Komga API key is correct.
    * Check your browser's console (F12) for error messages.
    * Verify that your Komga URL is correct.
* **Script not running:**
    * Ensure your userscript manager is enabled.
    * Confirm that the `@match` URL in the script matches your Komga URL.

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

* **[Komga](https://komga.org/):** For a powerful comic management platform.
* **[ComicBookRoundup](https://comicbookroundup.com/):** For comprehensive comic ratings.
* **[komf](https://github.com/Snd-R/komf):** Komga and Kavita Metadata Fetcher
