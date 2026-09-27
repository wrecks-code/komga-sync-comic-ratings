# Komga Comic Ratings Sync from ComicBookRoundup

Sync comic ratings from [ComicBookRoundup](https://comicbookroundup.com/) directly into your [Komga](https://komga.org/) library. This userscript fetches critic and user ratings, saves them as metadata links in Komga, and shows them on your library cards.

[![Install](https://img.shields.io/badge/Install-komga--comic--ratings.user.js-2ea44f?style=for-the-badge)](https://raw.githubusercontent.com/wrecks-code/komga-sync-comic-ratings/main/komga-comic-ratings.user.js)

Needs [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/). Click the button, confirm, done: it works out of the box on addresses starting with `komga.` or on port `25600`, and updates itself. Other addresses: see [Installation](#-installation).

## ✨ What's new in 2.x

* **Works with Komga's new UI** (`/next`) as well as the classic one, in any theme and any language (fixes #1).
* **One script, one-click install, automatic updates.** The library view and the "remove all ratings" tool are built in.
* **No API key needed.** The old `KOMGA_API_KEY` setting never did anything; Komga authenticates you through your login.
* **Much better matching:** the right volume for series like *Batman (2016)*, story arcs and omnibuses (*Batman: Year One*, *Old Man Logan*) matched via their trade paperbacks, and fewer wrong matches.
* **Fix a match once and it sticks:** refreshes reuse the saved link. Shift+click to search again.

Upgrading from 1.x? Remove the old `Komga - Sync Comic Ratings` and `Komga - Show Ratings in Library View` scripts, install the new one, then **Shift+click** the ★ next to your library name once to redo all matches with the new matching.

## 🚀 Key Features

* **Single Series Sync:** Update ratings for individual series with a click.
  
     ![Series Sync Animation](https://github.com/user-attachments/assets/90ca0b12-673a-4828-88be-fe11495196f2)
* **Bulk Library Sync:** Process entire libraries with a live progress counter.
  
     ![Bulk Library Sync Animation](https://github.com/user-attachments/assets/351cdb2a-3c95-4141-b099-130ad11c1902)
* **Detailed Logging:** Monitor progress and troubleshoot with comprehensive console logs (F12 - > Console, Filter: komga). 
  
     ![Detailed Logs Animation](https://github.com/user-attachments/assets/2a438b07-5062-4f81-b3b1-d42bc8e4f328)
* **Your Own Rating:** Rate a series with 1–10 stars; it gets saved as a link in Komga too.

     ![OwnRatingAnimation](https://github.com/user-attachments/assets/55ffe7c9-4a27-4600-bcc8-7887ee634e93)

* **Library View:** Ratings show up on every series card in the library.

     ![image](https://github.com/user-attachments/assets/647ac1cb-670f-4882-97df-2505bc8040ed)


## ⚙️ Requirements

* A running [Komga](https://komga.org/) instance (tested with 1.27). Works in both the classic web UI and the new UI (`/next`), in any theme and language.
* Being logged into Komga in the same browser. The script uses your session, no API key needed.
* [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/). Greasemonkey 4 is not supported.
  
## 🔧 Installation

1. **Install the script:** with Tampermonkey or Violentmonkey installed, open [komga-comic-ratings.user.js](https://raw.githubusercontent.com/wrecks-code/komga-sync-comic-ratings/main/komga-comic-ratings.user.js) and confirm the install. Updates arrive automatically.

2. **Komga on a different address?** It runs out of the box when your Komga address starts with `komga.` (e.g. `https://komga.example.com`) or uses the default port `25600`. For anything else, add your address as a *user match* once (don't edit the code, updates would overwrite it):
   - **Tampermonkey:** Dashboard → the script → *Settings* → *Includes/Excludes* → *User matches* → add `https://comics.example.com/*`
   - **Violentmonkey:** Dashboard → edit the script → *Settings* tab → add `https://comics.example.com/*` under the `@match` rules, keeping the original ones

   Then reload Komga.

## 🎯 Matching

The script searches ComicBookRoundup by series title, using the year from the title, the folder name (`Batman (2016)`) or the books' release date to pick the right volume. Story arcs and omnibuses that CBR only lists as trade paperbacks (e.g. *Batman: Year One*, *Old Man Logan*) are matched against the parent series' trades; multi-volume sets are combined.

Once a series has a ComicBookRoundup link, refreshes reuse it instead of searching again. To fix a wrong or missing match, edit the series in Komga and set the `Critic Rating` link to the correct CBR page (series or trade), then fetch again. **Shift+click** either fetch button to ignore saved links and search from scratch.

## 🧹 Removing all ratings

Open a library in Komga, click your userscript manager's icon, and choose **Remove all ratings in this library**. It removes every `Critic Rating`, `User Rating` and `Your Rating` link after asking to confirm.

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

* **[Komga](https://komga.org/):** For a powerful comic management platform.
* **[ComicBookRoundup](https://comicbookroundup.com/):** For comprehensive comic ratings.
* **[komf](https://github.com/Snd-R/komf):** Komga and Kavita Metadata Fetcher
