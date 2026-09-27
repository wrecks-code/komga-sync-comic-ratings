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

**Upgrading from 2.0 or older?** Remove the old `Komga - Sync Comic Ratings` and `Komga - Show Ratings in Library View` scripts first; this one replaces both. The old `KOMGA_API_KEY` setting is gone too, Komga never read it.

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
