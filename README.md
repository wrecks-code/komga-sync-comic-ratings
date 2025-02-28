# komga-sync-comic-ratings

A userscript for syncing comic ratings from ComicBookRoundup into Komga. It fetches critic and user ratings for individual series or entire libraries via the Komga API, updates metadata, and provides real-time progress indicators and error handling.

## Features

- **Single Series Sync:** Fetch ratings for an individual series and update its metadata.
- **Bulk Library Sync:** Process all series in a library with a real-time progress counter.
- **API Integration:** Communicate directly with the Komga API for data retrieval and updates.
- **Robust Error Handling:** Logs errors and API key issues for easier troubleshooting.
- **Customizable:** Easily configure your Komga API key and target URL via the script header.

## Requirements

- A running [Komga](https://komga.org/) instance with API access enabled.
- A valid Komga API key.
- A userscript manager such as [Tampermonkey](https://www.tampermonkey.net/), [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/), or [Violentmonkey](https://violentmonkey.github.io/).

## Installation

1. **Install a Userscript Manager:**  
   Choose and install one of the following:
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. **Add the Script:**  
   Create a new userscript in your chosen manager and copy-paste the contents of this repository's script.

3. **Configure the Script:**  
   - Replace the placeholder API key at the top of the script:
     ```js
     const KOMGA_API_KEY = "YOUR_API_KEY_HERE";
     ```
   - Ensure the `@match` directive matches your Komga web URL (e.g., `https://comics.speedpoop.com/*`).

## Usage

- **On a Series Page:**  
  Navigate to a specific series page in Komga. Click the **Fetch Ratings** button to retrieve and sync ratings for that series.

- **On a Library Series Page:**  
  Visit your library’s series view. Click the **Fetch All Ratings** button to process all series within the library. Watch the progress counter update in real time.

## Configuration

- **Komga API Key:**  
  Set your API key in the script header.

- **URL Matching:**  
  Modify the `@match` directive if your Komga instance is hosted at a different URL.

## Troubleshooting

- **No Ratings Found:**  
  Verify that the comic title and release year align with the data on ComicBookRoundup. Inaccurate titles may lead to no matches.

- **API Key Issues:**  
  If you encounter API key errors, confirm that:
  - Your API key is correct.
  - Your Komga instance requires API key authentication for the endpoints used.

- **Script Not Executing:**  
  Ensure your userscript manager is enabled and that the script is active on the target site.

## Contributing

Contributions, suggestions, and improvements are welcome! Feel free to fork the repository and submit pull requests for features, bug fixes, or enhanced error handling.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- **[Komga](https://komga.org/):** For providing a fantastic comic management platform.
- **[ComicBookRoundup](https://comicbookroundup.com/):** For their comprehensive comic ratings and reviews.
