// ==UserScript==
// @name         Komga - Comic Ratings (from ComicBookRoundup)
// @namespace    wreck.userscripts.komga.rating
// @version      2.2
// @description  Syncs ComicBookRoundup critic and user ratings into Komga, lets you rate series yourself, and shows ratings on library cards
// @author       wrecks-code, Fontler
// @include      /^https?:\/\/komga\.[^\/]+\//
// @include      /^https?:\/\/[^\/]+:25600\//
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      comicbookroundup.com
// @downloadURL  https://raw.githubusercontent.com/wrecks-code/komga-sync-comic-ratings/main/komga-comic-ratings.user.js
// @updateURL    https://raw.githubusercontent.com/wrecks-code/komga-sync-comic-ratings/main/komga-comic-ratings.user.js
// ==/UserScript==

// Runs on hosts starting with "komga." and on Komga's default port 25600.
// Other addresses: add a "User match" in your userscript manager (see README)
// instead of editing the lines above, so updates keep it.

(function() {
  'use strict';

  // Requests use your logged-in Komga session, no API key needed.

  // This doesn't have to be changed
  const CBR_SEARCH_URL = "https://comicbookroundup.com/search-results?keyword=";
  const KOMGA_HOST = location.origin;

  /**
   * (0) UI helpers
   *
   * Komga ships two web UIs: the classic one (Vuetify 2, "theme--dark") and the
   * new one opened via /next (Vuetify 3, "v-theme--dark"). Both use the same
   * URL paths, so we tell them apart by the DOM. Nothing here relies on
   * translated text, so any language and theme works.
   */
  function isNextUI() {
    return !!document.querySelector(".v-application[class*='v-theme--']");
  }

  const ICONS = {
    star: "M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z",
    starOutline: "M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z",
    loading: "M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"
  };

  function svgIcon(path, size) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.style.fill = "currentColor";
    svg.style.flexShrink = "0";
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", path);
    svg.appendChild(p);
    return svg;
  }

  function setIcon(svg, path, spinning = false) {
    svg.firstChild.setAttribute("d", path);
    svg.classList.toggle("komga-ratings-spin", spinning);
  }

  const style = document.createElement("style");
  style.textContent = `
    @keyframes komga-ratings-spin { to { transform: rotate(360deg); } }
    .komga-ratings-spin { animation: komga-ratings-spin 1s linear infinite; }
  `;
  document.head.appendChild(style);

  // Build a button that copies the classes of an existing Komga button, so it
  // picks up the active theme and style automatically.
  function makeButtonLike(template, iconSize, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = template.className;
    if (template.getAttribute("style")) btn.setAttribute("style", template.getAttribute("style"));
    const icon = svgIcon(ICONS.starOutline, iconSize);

    if (isNextUI()) {
      btn.innerHTML = `<span class="v-icon-btn__overlay"></span><span class="v-icon-btn__underlay"></span><div class="v-icon-btn__content"></div>`;
      btn.querySelector(".v-icon-btn__content").appendChild(icon);
    } else {
      btn.innerHTML = `<span class="v-btn__content"></span>`;
      const content = btn.querySelector(".v-btn__content");
      content.appendChild(icon);
      if (label) {
        icon.style.marginRight = "8px";
        content.appendChild(document.createTextNode(label));
      }
    }
    return { btn, icon };
  }

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

  // The new UI also has virtual views like /libraries/pinned/series.
  // Loaded lazily so it also works when the script starts on the login page.
  let libraryIds = null;
  let libraryIdsLoading = false;
  function loadLibraryIds() {
    libraryIdsLoading = true;
    fetch(`${KOMGA_HOST}/api/v1/libraries`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(libs => { libraryIds = libs.map(l => l.id); })
      .catch(err => console.error("❌ Error fetching Komga libraries:", err))
      .finally(() => { libraryIdsLoading = false; });
  }

  // Series-page anchor: the row of action buttons below the title.
  function getSeriesButtonRow() {
    if (isNextUI()) {
      return document.querySelector("main [action]")?.closest(".d-flex") || null;
    }
    const downloadBtn = document.querySelector("a[href$='/api/v1/series/" + getSeriesId() + "/file']");
    return downloadBtn?.closest(".row") || null;
  }

  /**
   * (2) Insert/Remove Buttons
   */
  function insertFetchSingleButton() {
    const buttonRow = getSeriesButtonRow();
    if (!buttonRow) return;

    let template, container;
    if (isNextUI()) {
      template = buttonRow.querySelector(".v-icon-btn");
      container = buttonRow;
    } else {
      template = buttonRow.querySelector("a.v-btn");
      container = template?.closest(".col");
    }
    if (!template || !container) return;

    const existing = document.getElementById("fetch-ratings-button");
    if (existing && container.contains(existing)) {
      // Follow theme switches.
      existing.className = template.className;
      return;
    }
    if (existing) existing.remove();

    const { btn, icon } = makeButtonLike(template, isNextUI() ? 24 : 16, "Fetch Ratings");
    btn.id = "fetch-ratings-button";
    btn.title = "Fetch ratings from ComicBookRoundup (Shift+click: search again, ignoring the saved link)";
    if (!isNextUI()) btn.style.marginLeft = "10px";
    btn.onclick = (event) => fetchRatingsForSeries(getSeriesId(), btn, icon, event.shiftKey);

    container.appendChild(btn);
  }

  let fetchProcessActive = false; // Global flag to track fetching state

  function insertFetchAllButton() {
    if (!libraryIds) {
      if (!libraryIdsLoading) loadLibraryIds();
      return;
    }
    if (!libraryIds.includes(getLibraryIdFromPath())) return;

    let template, anchor;
    if (isNextUI()) {
      // The "⋮" library menu button next to the library name.
      template = document.querySelector("header.v-toolbar .v-toolbar__prepend .v-icon-btn");
      anchor = template;
    } else {
      const gridBtn = document.querySelector("button.v-btn i.mdi-view-grid-plus")?.closest("button.v-btn");
      template = gridBtn;
      anchor = gridBtn;
    }
    if (!template || !anchor) return;

    const existing = document.getElementById("fetch-all-ratings-button");
    if (existing) {
      // Follow theme switches.
      existing.className = template.className;
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.id = "fetch-all-ratings-wrapper";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";

    const status = document.createElement("span");
    status.id = "fetch-status";
    status.style.fontSize = "14px";
    status.style.display = fetchProcessActive ? "inline" : "none";
    status.innerText = "0/0";

    const { btn, icon } = makeButtonLike(template, isNextUI() ? 24 : 22);
    btn.id = "fetch-all-ratings-button";
    btn.title = "Fetch All Ratings (Shift+click: search again, ignoring saved links)";
    btn.removeAttribute("aria-haspopup");

    wrapper.appendChild(status);
    wrapper.appendChild(btn);

    if (isNextUI()) {
      anchor.after(wrapper);
    } else {
      anchor.parentElement.insertBefore(wrapper, anchor);
    }

    btn.addEventListener("click", (event) => {
      if (fetchProcessActive) return;
      fetchProcessActive = true;
      setIcon(icon, ICONS.loading, true);
      status.style.display = "inline";

      fetchAllRatingsInLibrary(getLibraryIdFromPath(), event.shiftKey, (current, total) => {
        const liveStatus = document.getElementById("fetch-status");
        if (liveStatus) liveStatus.innerText = `${current}/${total}`;

        if (current >= total) {
          fetchProcessActive = false;
          const liveIcon = document.querySelector("#fetch-all-ratings-button svg");
          if (liveIcon) setIcon(liveIcon, ICONS.starOutline);
          if (liveStatus) liveStatus.style.display = "none";
        }
      });
    });
  }

  function removeFetchSingleButton() {
    const btn = document.getElementById("fetch-ratings-button");
    if (btn) btn.remove();
  }

  function removeFetchAllButton() {
    const wrapper = document.getElementById("fetch-all-ratings-wrapper");
    if (wrapper) wrapper.remove();
  }

  /**
   * Insert/Remove Rating Row
   *
   * Inserts a row of 10 clickable stars next to the series action buttons and
   * loads any saved rating.
   */
  function insertRatingRow() {
    const seriesId = getSeriesId();
    const existing = document.getElementById("user-rating-row");
    if (existing) {
      // The SPA can reuse the page when moving between series.
      if (existing.dataset.seriesId === seriesId && existing.isConnected) return;
      existing.remove();
    }

    const buttonRow = getSeriesButtonRow();
    if (!buttonRow) return;

    const ratingRow = document.createElement("div");
    ratingRow.id = "user-rating-row";
    ratingRow.dataset.seriesId = seriesId;
    ratingRow.style.display = "flex";
    ratingRow.style.alignItems = "center";
    ratingRow.style.padding = "4px 0";

    let currentRating = 0;
    const stars = [];
    function updateStars(rating) {
      stars.forEach((star, index) => {
        setIcon(star, index < rating ? ICONS.star : ICONS.starOutline);
      });
    }

    for (let i = 1; i <= 10; i++) {
      const star = svgIcon(ICONS.starOutline, 20);
      star.style.cursor = "pointer";
      star.style.marginRight = "2px";

      star.addEventListener("mouseover", () => {
        updateStars(i);
      });
      star.addEventListener("mouseout", () => {
        updateStars(currentRating);
      });
      star.addEventListener("click", () => {
        currentRating = i;
        updateStars(currentRating);
        // Save the rating immediately as an integer.
        addLinkToSeries(
          seriesId,
          "Your Rating",
          currentRating.toString(),
          location.href,
          "Your Rating",
          () => {
            console.log("Rating saved:", currentRating);
          }
        );
      });

      stars.push(star);
      ratingRow.appendChild(star);
    }

    if (isNextUI()) {
      buttonRow.after(ratingRow);
    } else {
      ratingRow.className = "row align-center";
      ratingRow.style.padding = "4px 12px";
      buttonRow.parentNode.insertBefore(ratingRow, buttonRow);
    }

    // Load any saved rating from Komga metadata.
    fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}`)
    .then(r => r.json())
    .then(series => {
      const ratingLink = series.metadata?.links?.find(link => link.label.startsWith("Your Rating:"));
      if (ratingLink) {
        // Expecting a label like "Your Rating: 5"
        const parts = ratingLink.label.split(":");
        if (parts.length > 1) {
          const savedRating = parseInt(parts[1].trim(), 10);
          if (!isNaN(savedRating)) {
            currentRating = savedRating;
            updateStars(currentRating);
          }
        }
      }
    })
    .catch(err => {
      console.error("Error fetching series metadata for rating:", err);
    });
  }

  function removeRatingRow() {
    const row = document.getElementById("user-rating-row");
    if (row) row.remove();
  }

  /**
   * (3) SPA route detection
   */
  setInterval(handleRouteChange, 1000);

  function handleRouteChange() {
    if (isSeriesPage()) {
      removeFetchAllButton();
      insertRatingRow();
      insertFetchSingleButton();
    } else if (isLibrarySeriesPage()) {
      removeFetchSingleButton();
      removeRatingRow();
      insertFetchAllButton();
    } else {
      removeFetchSingleButton();
      removeFetchAllButton();
      removeRatingRow();
    }
  }

  // On load
  handleRouteChange();

  /******************************************************
   * (A) Single-series routine
   ******************************************************/
  function fetchRatingsForSeries(seriesId, button, icon, forceSearch) {
    if (button.disabled) return;
    button.disabled = true;
    setIcon(icon, ICONS.loading, true);
    const done = () => {
      button.disabled = false;
      setIcon(icon, ICONS.starOutline);
    };

    fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}`)
    .then(r => r.json())
    .then(series => {
      fetchRatingsForSingleSeriesObj(series, done, forceSearch);
    })
    .catch(err => {
      console.error("❌ Error fetching Komga series:", err);
      done();
    });
  }

  /******************************************************
   * (B) Library-wide routine
   ******************************************************/
  function fetchAllRatingsInLibrary(libraryId, forceSearch, progressCallback) {
    const url = `${KOMGA_HOST}/api/v1/series?library_id=${libraryId}&page=0&size=9999`;
    fetch(url)
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
          }, forceSearch);
        }
        processNext();
      })
      .catch(err => {
        console.error("❌ Error fetching library series:", err);
        progressCallback(0, 0);
      });
  }

  function fetchRatingsForSingleSeriesObj(seriesObj, doneCallback, forceSearch = false) {
    // Komga has no series year field. Collect every year hint: "(2016)" in the
    // title or folder name, and the books' release date (often a reprint date).
    const years = [];
    for (const str of [seriesObj.metadata?.title, seriesObj.name]) {
      const y = str && parseYearFromTitle(str);
      if (y) years.push(y);
    }
    const dateMatch = seriesObj.booksMetadata?.releaseDate?.match(/^(\d{4})/);
    if (dateMatch) years.push(parseInt(dateMatch[1], 10));
    const releaseYear = years.length ? [...new Set(years)].join("/") : "N/A";

    // Prefer metadata.title, fallback to series.name.
    let rawTitle = seriesObj.metadata?.title || seriesObj.name;
    rawTitle = rawTitle.replace(/\(\d{4}\)\s*$/, "");
    const finalTitle = rawTitle.trim();

    // Reuse a ComicBookRoundup link already on the series, so a match you
    // corrected by hand in Komga sticks. Shift+click searches again.
    const savedLink = forceSearch ? null : (seriesObj.metadata?.links || [])
      .map(link => link.url)
      .find(url => /^https?:\/\/(www\.)?comicbookroundup\.com\/comic-books\/(reviews|trades)\//.test(url || ""));
    const lookup = savedLink ? refreshSavedLink(savedLink) : findRatings(finalTitle, years);

    lookup
      .then(found => {
        if (!found) {
          doneCallback();
          return;
        }
        const { url, criticRating, userRating, criticReviews, userReviews } = found;
        addLinkToSeries(
          seriesObj.id,
          "Critic Rating",
          `${criticRating} (${criticReviews} review${criticReviews === 1 ? "" : "s"})`,
          url,
          "Critic Rating",
          () => {
            addLinkToSeries(
              seriesObj.id,
              "User Rating",
              `${userRating} (${userReviews} review${userReviews === 1 ? "" : "s"})`,
              url,
              "User Rating",
              () => {
                console.log(`✅ Ratings for ${finalTitle} (${releaseYear}) updated!`);
                doneCallback();
              }
            );
          }
        );
      })
      .catch(err => {
        console.error(`❌ Error fetching ratings for ${finalTitle}:`, err);
        doneCallback();
      });
  }

  /******************************************************
   * (C) fetchComicRatings + Searching + Matching
   ******************************************************/
  // One GM request per URL per page load: bulk runs hit the same parent
  // series (e.g. "Batman") for many trades.
  const pageCache = new Map();
  function fetchDocument(url) {
    if (!pageCache.has(url)) {
      pageCache.set(url, new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          onload: (response) => resolve(new DOMParser().parseFromString(response.responseText, "text/html")),
          onerror: (err) => {
            pageCache.delete(url);
            reject(err);
          }
        });
      }));
    }
    return pageCache.get(url);
  }

  async function fetchComicRatings(comicUrl) {
    const doc = await fetchDocument(comicUrl);
    const aggregateRating = getAggregateRatingFromJsonLd(doc);
    const criticSummary = getRatingSummary(doc, "Critic Rating");
    const userSummary = getRatingSummary(doc, "User Rating");
    return {
      url: comicUrl,
      criticRating: criticSummary.rating || aggregateRating.rating || "N/A",
      userRating: userSummary.rating || "N/A",
      criticReviews: criticSummary.reviews || aggregateRating.reviews || 0,
      userReviews: userSummary.reviews || 0
    };
  }

  function getRatingSummary(doc, label) {
    const sections = Array.from(doc.querySelectorAll(".review-section > div"));
    const section = sections.find(el => {
      const heading = el.querySelector("h2");
      return heading && heading.textContent.trim().toLowerCase() === label.toLowerCase();
    });

    if (!section) {
      return { rating: null, reviews: 0 };
    }

    const rating = section.querySelector(".review span")?.textContent.trim() || null;
    const reviewText = section.querySelector(".review-count")?.textContent || "";
    const reviews = parseReviewCount(reviewText);
    return { rating, reviews };
  }

  function getAggregateRatingFromJsonLd(doc) {
    const scripts = Array.from(doc.querySelectorAll("script"));
    for (const script of scripts) {
      const text = script.textContent.trim();
      if (!text || !text.includes("AggregateRating")) continue;

      try {
        const data = JSON.parse(text);
        const aggregate = Array.isArray(data)
          ? data.find(item => item?.["@type"] === "AggregateRating")
          : data;

        if (aggregate?.["@type"] === "AggregateRating") {
          return {
            rating: aggregate.ratingValue ? String(aggregate.ratingValue).trim() : null,
            reviews: parseReviewCount(aggregate.ratingCount || aggregate.reviewCount || "")
          };
        }
      } catch (err) {
        console.warn("Unable to parse ComicBookRoundup AggregateRating JSON-LD:", err);
      }
    }

    return { rating: null, reviews: 0 };
  }

  function parseReviewCount(value) {
    const match = String(value).replace(/,/g, "").match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  async function searchCbr(query) {
    const doc = await fetchDocument(`${CBR_SEARCH_URL}${encodeURIComponent(query)}`);
    // Results are alphabetical, not by relevance, so callers check all of them.
    return Array.from(doc.querySelectorAll("tr.search_results td.current a")).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute("href")
    }));
  }

  // Order: a series with exactly our title, then a trade paperback (story arcs
  // and omnibuses like "Batman: Year One" only exist as trades on CBR), then
  // the closest series.
  async function findRatings(komgaTitle, komgaYears) {
    const cleanedTitle = normalizeTitle(komgaTitle);
    const yearText = komgaYears.join("/") || "N/A";
    console.log(`🔍 Searching ComicBookRoundup for: "${cleanedTitle}" (Year: ${yearText})`);

    const rows = await searchCbr(cleanedTitle);
    const { bestMatch, bestScore } = findBestCbrMatch(komgaTitle, komgaYears, rows);
    const exact = bestMatch && normalizeTitle(bestMatch.text, false) === normalizeTitle(komgaTitle, false);

    if (!exact) {
      const trade = await findTrade(komgaTitle);
      if (trade) return trade;
    }
    if (!bestMatch) {
      console.log(`⚠️ No match for "${komgaTitle}" (Year: ${yearText}) among ${rows.length} results. Skipping.`);
      return null;
    }
    const fullUrl = "https://comicbookroundup.com" + bestMatch.href;
    console.log(`✅ Best match: "${bestMatch.text}" (Score: ${bestScore.toFixed(2)}) 🔗 ${fullUrl}`);
    return fetchComicRatings(fullUrl);
  }

  async function refreshSavedLink(url) {
    console.log(`🔁 Using saved link for refresh: ${url}`);
    const trade = url.match(/^(https?:\/\/[^/]+)\/comic-books\/trades\/(.+)\/[^/]+\/?$/);
    if (!trade) return fetchComicRatings(url);
    // Trade: re-read the parent's trade list so multi-volume sets are
    // combined again, not just volume 1.
    const doc = await fetchDocument(`${trade[1]}/comic-books/reviews/${trade[2]}`);
    const trades = parseTrades(doc);
    const saved = trades.find(t => t.url.replace(/^https?:\/\/(www\.)?/, "") === url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""));
    if (!saved) return fetchComicRatings(url);
    const key = tradeKey(saved.name);
    return combineTrades([saved, ...trades.filter(t => t !== saved && tradeKey(t.name) === key)]);
  }

  function tradeKey(str) {
    return normalizeTitle(str.replace(/^vol\.?\s*\d+\s*:?\s*/i, "").replace(/\s*vol\.?\s*\d+\s*$/i, ""), false)
      .split(" ")
      .filter(word => word !== "by")
      .join(" ");
  }

  async function findTrade(komgaTitle) {
    // "Batman: Year One" -> parent "Batman", trade "Year One".
    const parts = komgaTitle.match(/^(.+?)(?:\s*:\s*|\s+-\s+|\s+(?=by\s))(.+)$/i);
    if (!parts) return null;
    const parentTitle = normalizeTitle(parts[1], false);
    const wanted = tradeKey(parts[2]);
    if (!parentTitle || !wanted) return null;

    const parents = (await searchCbr(parentTitle))
      .filter(r => normalizeTitle(r.text, false) === parentTitle)
      .slice(0, 8);
    const wantedTokens = wanted.split(" ");
    let best = null;
    for (const parent of parents) {
      let doc;
      try {
        doc = await fetchDocument("https://comicbookroundup.com" + parent.href);
      } catch (err) {
        continue;
      }
      for (const trade of parseTrades(doc)) {
        const key = tradeKey(trade.name);
        const tokens = key.split(" ");
        const recall = wantedTokens.filter(t => tokens.includes(t)).length / wantedTokens.length;
        const precision = tokens.filter(t => wantedTokens.includes(t)).length / tokens.length;
        const score = key === wanted ? 2 : (recall >= 0.75 && precision >= 0.5 ? recall + precision - 1 : -1);
        if (score < 0.25) continue;
        if (!best || score > best.score) {
          best = { score, key, parent: parent.text, trades: [trade] };
        } else if (score === best.score && key === best.key && parent.text === best.parent) {
          // Multi-volume sets, e.g. "Vol. 1/2/3: By Grant Morrison Omnibus".
          best.trades.push(trade);
        }
      }
    }
    if (!best) return null;
    console.log(`✅ Trade match: "${best.parent}" → ${best.trades.map(t => `"${t.name}"`).join(" + ")} 🔗 ${best.trades[0].url}`);
    return combineTrades(best.trades);
  }

  function parseTrades(doc) {
    return Array.from(doc.querySelectorAll("#trades tbody tr")).map(tr => {
      const link = tr.querySelector("a[href*='/trades/']");
      if (!link) return null;
      const part = selector => ({
        rating: tr.querySelector(`${selector} .review span`)?.textContent.trim() || "N/A",
        reviews: parseReviewCount(tr.querySelector(`${selector} .review-count`)?.textContent || "")
      });
      return {
        name: link.textContent.trim(),
        url: "https://comicbookroundup.com" + link.getAttribute("href"),
        critic: part(".critic-rating"),
        user: part(".user-rating")
      };
    }).filter(Boolean);
  }

  // Review-weighted average across the volumes of a set.
  function combineTrades(trades) {
    function combine(key) {
      const rated = trades.filter(t => !isNaN(parseFloat(t[key].rating)));
      if (!rated.length) return { rating: "N/A", reviews: 0 };
      if (rated.length === 1) return rated[0][key];
      let sum = 0, weight = 0, reviews = 0;
      for (const t of rated) {
        const w = t[key].reviews || 1;
        sum += parseFloat(t[key].rating) * w;
        weight += w;
        reviews += t[key].reviews;
      }
      return { rating: (sum / weight).toFixed(1), reviews };
    }
    const critic = combine("critic");
    const user = combine("user");
    return {
      url: trades[0].url,
      criticRating: critic.rating,
      userRating: user.rating,
      criticReviews: critic.reviews,
      userReviews: user.reviews
    };
  }

  function findBestCbrMatch(kTitle, kYears, rowArr) {
    let bestMatch = null;
    let bestScore = -999;
    // CBR leaves the year off the first series of a name ("Batman" is the 1940
    // run, later ones are "Batman (2016)"), so an undated entry predates its
    // dated namesakes.
    const earliestDated = {};
    rowArr.forEach(r => {
      const y = parseYearFromTitle(r.text);
      const key = normalizeTitle(r.text, false);
      if (y && (!earliestDated[key] || y < earliestDated[key])) earliestDated[key] = y;
    });
    rowArr.forEach(r => {
      const cYear = parseYearFromTitle(r.text);
      const beforeYear = cYear ? null : earliestDated[normalizeTitle(r.text, false)] || null;
      const score = computeMatchScore(kTitle, kYears, r.text, cYear, beforeYear);
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

  function computeMatchScore(kTitle, kYears, cTitle, cYear, beforeYear = null) {
    // Try the full title first, then without a trailing "by <creator>" credit
    // ("Venom by Donny Cates" -> "Venom"), keeping "Gotham by Gaslight" intact.
    const normC = normalizeTitle(cTitle, false);
    return Math.max(
      scoreNormalized(normalizeTitle(kTitle, false), normC, kYears, cYear, beforeYear),
      scoreNormalized(normalizeTitle(kTitle), normC, kYears, cYear, beforeYear)
    );
  }

  function scoreNormalized(normK, normC, kYears, cYear, beforeYear) {
    const queryTokens = normK.split(" ");
    const candidateTokens = normC.split(" ");
    const intersectionCount = queryTokens.filter(token => candidateTokens.includes(token)).length;
    const recall = intersectionCount / queryTokens.length;
    if (recall < 0.8) return -999;
    const textSim = jaccardSimilarity(normK, normC);
    if (textSim < 0.3) return -999;
    let yearDiff = null;
    if (kYears.length && cYear) {
      yearDiff = Math.min(...kYears.map(y => Math.abs(y - cYear)));
    } else if (kYears.length && beforeYear) {
      yearDiff = Math.min(...kYears.map(y => Math.max(0, y - (beforeYear - 1))));
    }

    if (normK === normC) {
      // Exact title: the year only picks between same-named series. A reprint
      // year far off never disqualifies an exact title.
      if (yearDiff === null) return 2.5;
      return 2 + Math.max(0, 1 - yearDiff * 0.1);
    }

    let score = textSim;
    if (normK.includes(normC) || normC.includes(normK)) {
      score += 0.2;
    }
    if (kYears.length) {
      if (cYear) {
        if (yearDiff === 0) {
          if (textSim >= 0.5) score += 0.5;
        } else if (yearDiff === 1) {
          if (textSim >= 0.5) score += 0.2;
        } else {
          return -999;
        }
      } else {
        // Undated CBR entry: only accept it if it adds no words to our title
        // ("Arkham Asylum: Living Hell" for "Batman Arkham Asylum: Living
        // Hell", but not "Batman: Year One Hundred" for "Batman: Year One").
        if (!candidateTokens.every(token => queryTokens.includes(token))) return -999;
        score -= 0.1;
      }
    }
    return score;
  }

  function parseYearFromTitle(str) {
    const m = str.match(/\((\d{4})\)\s*$/);
    return m ? parseInt(m[1], 10) : null;
  }

  function normalizeTitle(str, stripCreator = true) {
    return str
      .toLowerCase()
      .replace(/['\u2019]/g, "")
      .replace(/&/g, " and ")
      .replace(/\b(the|a|an)\b\s*/g, "")
      .replace(/\(\d{4}\)\s*$/, "")
      .replace(/\b(new edition|deluxe edition|master edition|(?:dc )?essential edition|deluxe|\d+(?:st|nd|rd|th) anniversary(?: edition)?|anniversary edition|omnibus|compendium|(?:complete|ultimate) collection)\b/gi, "")
      .replace(stripCreator ? /\bby\b.*$/i : /$^/, "")
      .replace(/[:;#"!\?\(\)\[\]\.,\/]/g, " ")
      .replace(/(\s)-(\s)/g, "$1 $2")
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
    fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}`)
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
        headers: { "Content-Type": "application/json" },
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

/******************************************************
 * Ratings on library cards
 ******************************************************/
(function() {
  'use strict';

  // Requests use your logged-in Komga session, no API key needed.
  const KOMGA_HOST     = location.origin;
  const seriesCache    = {};

  const ICONS = {
    star: "M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z",
    accountStar: "M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12M5,13.28L7.45,14.77L6.8,11.96L9,10.08L6.11,9.83L5,7.19L3.87,9.83L1,10.08L3.18,11.96L2.5,14.77L5,13.28Z"
  };

  function svgIcon(path) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.width = "1rem";
    svg.style.height = "1rem";
    svg.style.fill = "currentColor";
    svg.style.marginRight = "4px";
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", path);
    svg.appendChild(p);
    return svg;
  }

  // --- DOM Query Helpers ---
  // Works in both the classic UI (.item-card, Vuetify 2) and the new UI (/next, Vuetify 3).
  function getLibraryCards() {
    return Array.from(document.querySelectorAll('.v-card'))
      .filter(card => card.querySelector('a[href^="/series/"]'));
  }

  // Where to put the rating display inside a card.
  function getCardTextTarget(card) {
    return card.querySelector('.v-card__text') || card.querySelector('.v-card-subtitle');
  }

  // --- Debounce Utility ---
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // --- Route & Mutation Handling ---
  const handleRouteChangeDebounced = debounce(handleRouteChange, 500);
  function handleRouteChange() {
    if (/^\/libraries\/[^/]+\/series/.test(location.pathname)) {
      enhanceLibrarySeriesCards();
    }
  }

  // Observe the document body for mutations.
  const observer = new MutationObserver(handleRouteChangeDebounced);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", handleRouteChangeDebounced);
  window.addEventListener("hashchange", handleRouteChangeDebounced);
  setInterval(handleRouteChangeDebounced, 2000);

  // --- Enhance Library Series Cards ---
  function enhanceLibrarySeriesCards() {
    const cards = getLibraryCards();
    cards.forEach(card => {
      const link = card.querySelector('a[href^="/series/"]');
      if (!link) return;
      const parts = link.getAttribute('href').split('/');
      if (parts.length < 3) return;
      const seriesId = parts[2];
      // Cards get reused for other series when sorting/filtering.
      if (card.dataset.ratingsSeriesId === seriesId) return;
      card.dataset.ratingsSeriesId = seriesId;
      const oldDisplay = card.querySelector('.modern-rating-display');
      if (oldDisplay) oldDisplay.remove();
      fetchSeriesAndDisplayRatings(seriesId, card);
    });
  }

  function fetchSeriesAndDisplayRatings(seriesId, cardElem) {
    if (seriesCache[seriesId]) {
      processSeries(seriesCache[seriesId], seriesId, cardElem);
      return;
    }
    const url = `${KOMGA_HOST}/api/v1/series/${seriesId}`;
    fetch(url)
      .then(r => r.json())
      .then(series => {
        seriesCache[seriesId] = series;
        processSeries(series, seriesId, cardElem);
      })
      .catch(err => {
        console.error(`Error fetching series metadata for id=${seriesId}`, err);
      });
  }

  function processSeries(series, seriesId, cardElem) {
    const links = series.metadata.links || [];
    const criticLink = links.find(x => x.label.startsWith("Critic Rating"));
    const userLink   = links.find(x => x.label.startsWith("User Rating"));
    const yourLink   = links.find(x => x.label.startsWith("Your Rating"));
    if (!criticLink && !userLink && !yourLink) return;
    if (cardElem.dataset.ratingsSeriesId !== seriesId) return;
    if (cardElem.querySelector('.modern-rating-display')) return;
    const display = buildModernRatingDisplay(criticLink, userLink, yourLink);
    if (display) {
      const target = getCardTextTarget(cardElem);
      if (target) {
        // Center the display and add extra top margin.
        const wrapper = document.createElement('div');
        wrapper.className = 'modern-rating-display';
        wrapper.style.textAlign = "center";
        wrapper.style.padding = "0 8px 8px";
        display.style.marginTop = "8px";
        wrapper.appendChild(display);
        target.after(wrapper);
      }
    }
  }

  /**
   * Builds a modern, compact rating display as a plain div.
   * It selects the rating (critic or user) with more reviews and adds your rating if available.
   */
  function buildModernRatingDisplay(criticLink, userLink, yourLink) {
    function parseRatingLink(linkObj) {
      let raw = linkObj.label;
      raw = raw.replace(/\bAvg\.\b/gi, "");
      const ratingMatch = raw.match(/:\s*([\d.]+)/);
      if (!ratingMatch) return null;
      const ratingVal = ratingMatch[1].trim();
      if (ratingVal === "N/A") return null;
      const reviewsMatch = raw.match(/\(\s*(\d+)\s*(?:reviews?)?\s*\)/i);
      if (!reviewsMatch) return null;
      return { rating: ratingVal, reviews: parseInt(reviewsMatch[1], 10) };
    }
    const criticData = criticLink ? parseRatingLink(criticLink) : null;
    const userData   = userLink ? parseRatingLink(userLink) : null;
    let chosenData = null;
    let chosenType = "";
    if (criticData && userData) {
      chosenData = (criticData.reviews >= userData.reviews) ? criticData : userData;
      chosenType = (criticData.reviews >= userData.reviews) ? "C" : "U";
    } else if (criticData) {
      chosenData = criticData;
      chosenType = "C";
    } else if (userData) {
      chosenData = userData;
      chosenType = "U";
    }

    function parseYourRating(linkObj) {
      const parts = linkObj.label.split(":");
      if (parts.length < 2) return null;
      const rating = parseInt(parts[1].trim(), 10);
      return isNaN(rating) ? null : rating;
    }
    const yourRating = yourLink ? parseYourRating(yourLink) : null;
    if (!chosenData && yourRating == null) return null;

    // Build rating display container.
    const container = document.createElement('div');
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.gap = "6px";
    container.style.backgroundColor = "rgba(128,128,128,0.15)";
    container.style.padding = "4px 8px";
    container.style.borderRadius = "4px";
    container.style.fontSize = "0.9rem";
    // Build chosen rating element.
    if (chosenData) {
      const ratingEl = document.createElement('span');
      ratingEl.title = chosenType === "C" ? "Critic Rating" : "User Rating";
      ratingEl.style.display = 'inline-flex';
      ratingEl.style.alignItems = 'center';
      ratingEl.appendChild(svgIcon(chosenType === "C" ? ICONS.star : ICONS.accountStar));
      ratingEl.appendChild(document.createTextNode(`${chosenData.rating}(${chosenData.reviews})`));
      container.appendChild(ratingEl);
    }
    // Add your rating element if available.
    if (yourRating != null) {
      const yourEl = document.createElement('span');
      yourEl.title = "Your Rating";
      yourEl.style.display = 'inline-flex';
      yourEl.style.alignItems = 'center';
      yourEl.appendChild(svgIcon(ICONS.star));
      yourEl.appendChild(document.createTextNode(yourRating));
      container.appendChild(yourEl);
    }
    return container;
  }

  // --- Initial Run ---
  handleRouteChange();

})();

/******************************************************
 * Remove all ratings (userscript manager menu)
 ******************************************************/
(function() {
  'use strict';

  const RATING_PREFIXES = ["critic rating:", "user rating:", "your rating:"];

  GM_registerMenuCommand("Remove all ratings in this library", async () => {
    const match = location.pathname.match(/^\/libraries\/([^/]+)\/series/);
    if (!match) {
      alert("Open a library's series view in Komga first.");
      return;
    }
    if (!confirm("Remove all Critic, User and Your Rating links from every series in this library?")) return;

    const data = await (await fetch(`${location.origin}/api/v1/series?library_id=${match[1]}&page=0&size=9999`)).json();
    let changed = 0;
    for (const series of data.content || []) {
      const links = series.metadata.links || [];
      const kept = links.filter(link => !RATING_PREFIXES.some(p => link.label.toLowerCase().trim().startsWith(p)));
      if (kept.length === links.length) continue;
      const resp = await fetch(`${location.origin}/api/v1/series/${series.id}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: kept })
      });
      if (resp.ok) changed++;
      else console.error(`❌ Failed to update series ${series.id}: ${resp.status}`);
    }
    alert(`Removed ratings from ${changed} series.`);
  });
})();
