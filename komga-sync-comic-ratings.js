// ==UserScript==
// @name         Komga - Sync Comic Ratings (from ComicBookRoundup)
// @namespace    wreck.userscripts.komga.rating
// @version      1.0
// @description  Fetches comic ratings from comicbookroundup.com and syncs them into Komga metadata using the API
// @grant        GM_xmlhttpRequest
// @connect      comicbookroundup.com
// @author       wrecks-code
// @match        https://comics.domain.com/*
// ==/UserScript==

(function() {
  'use strict';

  // !!! Paste your Komga API Key AND the URL in @match up top!
  const KOMGA_API_KEY = "YOUR_API_KEY_HERE";
  // !!!

  // This doesn't have to be changed
  const CBR_SEARCH_URL = "https://comicbookroundup.com/search_results.php?f_search=";
  const KOMGA_HOST = location.origin;

  /**
   * (1) Routing Helpers
   */
  function isSeriesPage() {
    return location.pathname.startsWith("/series/");
  }

  function isLibrarySeriesPage() {
    // e.g. /libraries/<ID>/series
    return /^\/libraries\/[^/]+\/series/.test(location.pathname);
  }

  function getSeriesId() {
    // /series/<id>
    return location.pathname.split("/")[2];
  }

  function getLibraryIdFromPath() {
    // /libraries/<libraryId>/series
    return location.pathname.split("/")[2];
  }

  /**
   * (2) Insert/Remove Buttons
   */
  function insertFetchSingleButton() {
    const downloadBtn = document.querySelector("a[title='Download series']");
    if (!downloadBtn) return;
    if (document.getElementById("fetch-ratings-button")) return;

    const parentDiv = downloadBtn.closest(".col");
    if (!parentDiv) return;

    const fetchButton = document.createElement("button");
    fetchButton.id = "fetch-ratings-button";
    fetchButton.classList.add("v-btn", "v-btn--is-elevated", "v-btn--has-bg", "theme--dark", "v-size--small");
    fetchButton.style.marginLeft = "10px";
    fetchButton.innerHTML = `
      <span class="v-btn__content">
        <i aria-hidden="true" class="v-icon notranslate v-icon--left mdi mdi-star-outline theme--dark" style="font-size:16px;"></i>
        Fetch Ratings
      </span>`;
    fetchButton.onclick = () => fetchRatingsForSeries(getSeriesId(), fetchButton);

    parentDiv.appendChild(fetchButton);
  }

  let fetchProcessActive = false; // Global flag to track fetching state

  function insertFetchAllButton() {
    // Locate the "mdi-view-grid-plus" button inside the toolbar
    const gridBtnIcon = document.querySelector('button.v-btn > span.v-btn__content > i.mdi-view-grid-plus');
    if (!gridBtnIcon) return;

    // Get the button itself (not just the icon)
    const gridBtn = gridBtnIcon.closest("button.v-btn");
    if (!gridBtn) return;

    // Check if our elements are already inserted
    if (document.getElementById("fetch-all-ratings-button")) return;

    // Create a wrapper div to hold both status counter and button
    const wrapper = document.createElement("div");
    wrapper.id = "fetch-all-ratings-wrapper";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px"; // Space between counter and button

    // Create the progress counter
    const status = document.createElement("span");
    status.id = "fetch-status";
    status.style.fontSize = "14px";
    status.style.color = "#ffffff"; // Keep consistent with dark theme
    status.style.display = "none"; // Hidden until needed
    status.innerText = "0/0"; // Default

    // Create the button
    const btn = document.createElement("button");
    btn.id = "fetch-all-ratings-button";
    btn.className = "v-btn v-btn--icon v-btn--round theme--dark v-size--default";
    btn.title = "Fetch All Ratings";

    btn.innerHTML = `
        <span class="v-btn__content">
            <i id="fetch-icon" aria-hidden="true" class="v-icon notranslate mdi mdi-star theme--dark" style="font-size:22px;"></i>
        </span>`;

    // Append the counter and button to the wrapper
    wrapper.appendChild(status);
    wrapper.appendChild(btn);

    // Insert the wrapper before the grid button (keeping structure clean)
    const parentContainer = gridBtn.parentElement;
    if (parentContainer) {
      parentContainer.insertBefore(wrapper, gridBtn);
    }

    // Handle click event with a loading spinner and progress counter
    btn.addEventListener("click", () => {
      const libraryId = getLibraryIdFromPath();
      const icon = btn.querySelector("#fetch-icon");

      // Show spinner and progress counter
      icon.classList.add("mdi-loading", "mdi-spin");
      status.style.display = "inline"; // Show progress counter

      fetchAllRatingsInLibrary(libraryId, (current, total) => {
        // Update progress status
        status.innerText = `${current}/${total}`;

        // If complete, restore original icon
        if (current >= total) {
          icon.classList.remove("mdi-loading", "mdi-spin");
          status.style.display = "none"; // Hide progress counter
        }
      });
    });
  }

  function removeFetchSingleButton() {
    const btn = document.getElementById("fetch-ratings-button");
    if (btn) btn.remove();
  }

  function removeFetchAllButton() {
    const btn = document.getElementById("fetch-all-ratings-button");
    if (btn) btn.remove();
  }

  /**
   * (3) SPA route detection
   */
  let prevPath = location.pathname;
  setInterval(() => {
    const currentPath = location.pathname;
    if (currentPath !== prevPath) {
      prevPath = currentPath;
      handleRouteChange();
    }
    handleRouteChange();
  }, 1000);

  function handleRouteChange() {
    if (isSeriesPage()) {
      removeFetchAllButton();
      insertFetchSingleButton();
    } else if (isLibrarySeriesPage()) {
      removeFetchSingleButton();
      insertFetchAllButton();
    } else {
      removeFetchSingleButton();
      removeFetchAllButton();
    }
  }

  // On load
  handleRouteChange();

  /******************************************************
   * (A) Single-series routine
   ******************************************************/
  function fetchRatingsForSeries(seriesId, button) {
    button.innerText = "Fetching...";

    fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}`, {
      headers: { Authorization: `Bearer ${KOMGA_API_KEY}` }
    })
    .then(r => r.json())
    .then(series => {
      // (A1) figure out the year
      let releaseYear = series.metadata?.releaseYear;
      if (!releaseYear || releaseYear === 0) {
        const dateStr = series.booksMetadata?.releaseDate;
        if (dateStr) {
          const m = dateStr.match(/^(\d{4})/);
          if (m) {
            releaseYear = parseInt(m[1], 10);
          }
        }
      }

      // (A2) prefer metadata.title if present, else fallback to series.name
      let rawTitle = series.metadata?.title || series.name;

      // remove trailing (YYYY)
      rawTitle = rawTitle.replace(/\(\d{4}\)\s*$/, "");
      const finalTitle = rawTitle.trim();

      searchComicBookRoundup(finalTitle, releaseYear, bestUrl => {
        if (!bestUrl) {
          button.innerText = "Fetch Ratings";
          return;
        }

        // Now scrape from matched CBR page
        fetchComicRatings(bestUrl, (criticRating, userRating, criticReviews, userReviews) => {
          addLinkToSeries(
            seriesId,
            "Critic Rating",
            `${criticRating} (${criticReviews} review${criticReviews === 1 ? "" : "s"})`,
            bestUrl,
            "Critic Rating",
            () => {
              addLinkToSeries(
                seriesId,
                "User Rating",
                `${userRating} (${userReviews} review${userReviews === 1 ? "" : "s"})`,
                bestUrl,
                "User Rating",
                () => {
                  console.log(`✅ Ratings for ${finalTitle} (${releaseYear}) updated!`);
                  button.innerText = "Fetch Ratings";
                }
              );
            }
          );
        });
      });
    })
    .catch(err => {
      console.error("❌ Error fetching Komga series:", err);
      button.innerText = "Fetch Ratings";
    });
  }

  /******************************************************
   * (B) Library-wide routine
   ******************************************************/
  function fetchAllRatingsInLibrary(libraryId, progressCallback) {
    const url = `${KOMGA_HOST}/api/v1/series?library_id=${libraryId}&page=0&size=9999`;
    fetch(url, { headers: { Authorization: `Bearer ${KOMGA_API_KEY}` } })
      .then(r => r.json())
      .then(data => {
        const seriesArr = data.content || [];
        console.log(`📚 Library ID: ${libraryId} → Found ${seriesArr.length} series to process!`);

        if (!seriesArr.length) {
          progressCallback(0, 0);
          return;
        }

        let index = 0;
        function processNext() {
          if (index >= seriesArr.length) {
            progressCallback(seriesArr.length, seriesArr.length);
            console.log("All series processed!");
            return;
          }
          progressCallback(index + 1, seriesArr.length);
          const s = seriesArr[index];
          index++;
          fetchRatingsForSingleSeriesObj(s, () => {
            processNext();
          });
        }

        processNext();
      })
      .catch(err => {
        console.error("❌ Error fetching library series:", err);
        progressCallback(0, 0);
      });
  }

  function fetchRatingsForSingleSeriesObj(seriesObj, doneCallback) {
    // (B1) figure out year
    let releaseYear = seriesObj.metadata?.releaseYear;
    if (!releaseYear || releaseYear === 0) {
      const dateStr = seriesObj.booksMetadata?.releaseDate;
      if (dateStr) {
        const m = dateStr.match(/^(\d{4})/);
        if (m) {
          releaseYear = parseInt(m[1], 10);
        }
      }
    }

    // (B2) prefer metadata.title else fallback to series.name
    let rawTitle = seriesObj.metadata?.title || seriesObj.name;
    rawTitle = rawTitle.replace(/\(\d{4}\)\s*$/, "");
    const finalTitle = rawTitle.trim();

    searchComicBookRoundup(finalTitle, releaseYear, bestUrl => {
      if (!bestUrl) {
        doneCallback();
        return;
      }

      fetchComicRatings(bestUrl, (criticRating, userRating, criticReviews, userReviews) => {
        addLinkToSeries(
          seriesObj.id,
          "Critic Rating",
          `${criticRating} (${criticReviews} review${criticReviews === 1 ? "" : "s"})`,
          bestUrl,
          "Critic Rating",
          () => {
            addLinkToSeries(
              seriesObj.id,
              "User Rating",
              `${userRating} (${userReviews} review${userReviews === 1 ? "" : "s"})`,
              bestUrl,
              "User Rating",
              () => {
                doneCallback();
              }
            );
          }
        );
      });
    });
  }

  /******************************************************
   * (C) fetchComicRatings + Searching + Matching
   ******************************************************/
  /**
   * Grabs Critic/User rating from the chosen CBR page, ignoring color
   */
  function fetchComicRatings(comicUrl, callback) {
    if (!comicUrl) {
      callback("N/A", "N/A", 0, 0);
      return;
    }

    GM_xmlhttpRequest({
      method: "GET",
      url: comicUrl,
      onload: (response) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.responseText, "text/html");

        const criticEl = doc.querySelector(".review.green, .review.yellow, .review.red, .review.grey");
        const userEl   = doc.querySelector(".user-review.green, .user-review.yellow, .user-review.red, .user-review.grey");

        let criticRating = criticEl
          ? criticEl.textContent.replace("Critic Rating", "").trim()
          : "N/A";
        let userRating = userEl
          ? userEl.textContent.replace("User Rating", "").trim()
          : "N/A";

        let criticReviews = parseInt(
          doc.querySelector("span[itemprop='votes']")?.textContent.trim() || "0",
          10
        );

        let userReviews = 0;
        const userReviewsEl = [...doc.querySelectorAll("strong")]
          .find(e => e.textContent.includes("User Reviews:"));
        if (userReviewsEl) {
          userReviews = parseInt(userReviewsEl.nextSibling.textContent.trim() || "0", 10);
        }

        callback(criticRating, userRating, criticReviews, userReviews);
      }
    });
  }

  function searchComicBookRoundup(komgaTitle, komgaYear, callback) {
    console.log(`🔍 Searching ComicBookRoundup for: "${komgaTitle}" (Year: ${komgaYear || "N/A"})`);
    GM_xmlhttpRequest({
      method: "GET",
      url: `${CBR_SEARCH_URL}${encodeURIComponent(komgaTitle)}`,
      onload: (response) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.responseText, "text/html");

        let anchors = doc.querySelectorAll("tr.search_results td.current a");
        if (!anchors.length) {
          console.log(`❌ No results found on ComicBookRoundup for: "${komgaTitle}".`);
          callback(null);
          return;
        }

        anchors = Array.from(anchors).slice(0, 15);

        const rowTitles = anchors.map(a => ({
          text: a.textContent.trim(),
          href: a.getAttribute("href")
        }));

        const { bestMatch, bestScore } = findBestCbrMatch(komgaTitle, komgaYear, rowTitles);
        if (!bestMatch) {
          console.log(`⚠️ No strong match for "${komgaTitle}" (Year: ${komgaYear || "N/A"}); closest: "${rowTitles[0]?.text || "N/A"}" (Year: ${parseYearFromTitle(rowTitles[0]?.text) || "N/A"}, score: ${bestScore.toFixed(2)}). Skipping.`);
          callback(null);
        } else {
          const fullUrl = "https://comicbookroundup.com" + bestMatch.href;
          console.log(`✅ Best match: "${bestMatch.text}" (Score: ${bestScore.toFixed(2)}) 🔗 ${fullUrl}`);
          callback(fullUrl);
        }
      }
    });
  }

  function findBestCbrMatch(kTitle, kYear, rowArr) {
    let bestMatch = null;
    let bestScore = -999;

    rowArr.forEach(r => {
      const cYear = parseYearFromTitle(r.text);
      const score = computeMatchScore(kTitle, kYear, r.text, cYear);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { text: r.text, href: r.href, score };
      }
    });

    const THRESHOLD = 0.5;
    if (bestScore < THRESHOLD) {
      return { bestMatch: null, bestScore };
    }
    return { bestMatch, bestScore };
  }

  function computeMatchScore(kTitle, kYear, cTitle, cYear) {
    const normK = normalizeTitle(kTitle);
    const normC = normalizeTitle(cTitle);

    let textSim = jaccardSimilarity(normK, normC);
    if (textSim === 0) return -999; // skip zero-overlap

    let score = textSim;

    if (normK === normC) {
      score += 1.0;
    } else if (normK.includes(normC) || normC.includes(normK)) {
      score += 0.2;
    }

    if (kYear && cYear) {
      const diff = Math.abs(cYear - kYear);
      if (diff === 0) {
        score += 0.5;
      } else if (diff === 1) {
        score += 0.2;
      } else if (diff >= 10) {
        score -= diff * 0.15;
      } else {
        score -= diff * 0.1;
      }
    }
    return score;
  }

  function parseYearFromTitle(str) {
    const m = str.match(/\((\d{4})\)\s*$/);
    return m ? parseInt(m[1], 10) : null;
  }

  function normalizeTitle(str) {
    return str
      .toLowerCase()
      .replace(/[':;#"!\?\(\)\[\]\-\.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function jaccardSimilarity(a, b) {
    const setA = new Set(a.split(" "));
    const setB = new Set(b.split(" "));
    const inter = [...setA].filter(x => setB.has(x)).length;
    const uni   = new Set([...setA, ...setB]).size;
    return uni ? inter / uni : 0;
  }

  /******************************************************
   * (D) Patch Komga
   ******************************************************/
  function addLinkToSeries(seriesId, label, linkLabel, linkUrl, labelCheck, callback = () => {}) {
    fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}`, {
      headers: { Authorization: `Bearer ${KOMGA_API_KEY}` }
    })
    .then(r => r.json())
    .then(series => {
      let existingLinks = series.metadata.links || [];
      existingLinks = existingLinks.filter(link => !link.label.startsWith(labelCheck));

      const newLink = {
        label: `${label}: ${linkLabel}`,
        url: linkUrl
      };
      existingLinks.push(newLink);

      fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}/metadata`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${KOMGA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ links: existingLinks })
      })
      .then(resp => {
        if (resp.ok) {
          callback();
        } else {
          console.error(`❌ Failed to update link: ${resp.status}`);
          callback("Failed");
        }
      })
      .catch(err => {
        console.error("❌ Error updating metadata:", err);
        callback("Error");
      });
    })
    .catch(err => {
      console.error("❌ Error fetching series from Komga:", err);
      callback("Error");
    });
  }

})();
