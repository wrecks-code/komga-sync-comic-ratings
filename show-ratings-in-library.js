// ==UserScript==
// @name         Komga - Show Ratings in Library View (Optimized)
// @namespace    http://speedpoop.com
// @version      1.3.3
// @description  Displays a compact rating display (e.g. "★9.0(89) ⭑8.1(10) ★7") on each library series card using cached API responses and smart DOM observation. Built-in rating links are hidden.
// @match        https://komga.org/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const KOMGA_API_KEY  = "YOUR_API_KEY_HERE";
  const KOMGA_HOST     = location.origin;
  const seriesCache    = {};

  // --- DOM Query Helpers ---
  function getLibraryCards() {
    return document.querySelectorAll('.item-card.v-card.v-card--link.v-sheet.theme--dark');
  }
  function getDownloadButton() {
    return document.querySelector("a[title='Download series']");
  }
  function getLinksRow() {
    return Array.from(document.querySelectorAll("div.row.align-center.text-caption"))
      .find(row => {
        const firstCol = row.querySelector("div.text-uppercase");
        return firstCol && firstCol.textContent.trim().toUpperCase() === "LINKS";
      });
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
      clearLibraryRatings(); // Remove old ratings displays
      enhanceLibrarySeriesCards();
      hideRatingLinksRow();
    }
  }
  function clearLibraryRatings() {
    getLibraryCards().forEach(card => {
      delete card.dataset.ratingsDisplayed;
      const oldDisplay = card.querySelector('.modern-rating-display');
      if (oldDisplay) oldDisplay.remove();
    });
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
      if (card.dataset.ratingsDisplayed === "true") return;
      const link = card.querySelector('a[href^="/series/"]');
      if (!link) return;
      const parts = link.getAttribute('href').split('/');
      if (parts.length < 3) return;
      const seriesId = parts[2];
      card.dataset.ratingsDisplayed = "true";
      fetchSeriesAndDisplayRatings(seriesId, card);
    });
  }

  function fetchSeriesAndDisplayRatings(seriesId, cardElem) {
    if (seriesCache[seriesId]) {
      processSeries(seriesCache[seriesId], seriesId, cardElem);
      return;
    }
    const url = `${KOMGA_HOST}/api/v1/series/${seriesId}`;
    fetch(url, { headers: { Authorization: `Bearer ${KOMGA_API_KEY}` } })
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
    const display = buildModernRatingDisplay(criticLink, userLink, yourLink);
    if (display) {
      display.classList.add('modern-rating-display');
      const vCardText = cardElem.querySelector('.v-card__text');
      if (vCardText) {
        // Center the display and add extra top margin.
        vCardText.style.textAlign = "center";
        display.style.marginTop = "8px";
        vCardText.appendChild(display);
      }
    }
    hideRatingLinksRow();
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
    if (!chosenData) return null;

    function parseYourRating(linkObj) {
      const parts = linkObj.label.split(":");
      if (parts.length < 2) return null;
      const rating = parseInt(parts[1].trim(), 10);
      return isNaN(rating) ? null : rating;
    }
    const yourRating = yourLink ? parseYourRating(yourLink) : null;

    // Build rating display container.
    const container = document.createElement('div');
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.gap = "6px";
    container.style.backgroundColor = "rgba(0,0,0,0.15)";
    container.style.padding = "4px 8px";
    container.style.borderRadius = "4px";
    container.style.fontSize = "0.9rem";
    // Build chosen rating element.
    const ratingEl = document.createElement('span');
    ratingEl.title = chosenType === "C" ? "Critic Rating" : "User Rating";
    ratingEl.style.display = 'inline-flex';
    ratingEl.style.alignItems = 'center';
    const iconEl = document.createElement('i');
    iconEl.className = chosenType === "C" ? "v-icon mdi mdi-star" : "v-icon mdi mdi-account-star";
    iconEl.style.fontSize = "1rem";
    iconEl.style.marginRight = "4px";
    ratingEl.appendChild(iconEl);
    ratingEl.appendChild(document.createTextNode(`${chosenData.rating}(${chosenData.reviews})`));
    container.appendChild(ratingEl);
    // Add your rating element if available.
    if (yourRating != null) {
      const yourEl = document.createElement('span');
      yourEl.title = "Your Rating";
      yourEl.style.display = 'inline-flex';
      yourEl.style.alignItems = 'center';
      const yourIcon = document.createElement('i');
      yourIcon.className = "v-icon mdi mdi-star";
      yourIcon.style.fontSize = "1rem";
      yourIcon.style.marginRight = "4px";
      yourEl.appendChild(yourIcon);
      yourEl.appendChild(document.createTextNode(yourRating));
      container.appendChild(yourEl);
    }
    return container;
  }

  // Hide built-in rating links and hide the entire LINKS row if no non-rating links remain.
  function hideRatingLinksRow() {
    const linksRow = getLinksRow();
    if (!linksRow) return;
    const links = linksRow.querySelectorAll("a.v-chip.v-chip--clickable.v-chip--link");
    let visibleCount = 0;
    links.forEach(link => {
      const txt = link.textContent.trim();
      if (txt.startsWith("Critic Rating:") ||
          txt.startsWith("User Rating:") ||
          txt.startsWith("Your Rating:")) {
        link.style.display = "none";
      } else if (window.getComputedStyle(link).display !== "none") {
        visibleCount++;
      }
    });
    if (visibleCount === 0) {
      linksRow.style.display = "none";
    }
  }

  // --- SPA Route Handling ---
  function handleRouteChange() {
    if (/^\/libraries\/[^/]+\/series/.test(location.pathname)) {
      clearLibraryRatings();
      enhanceLibrarySeriesCards();
      hideRatingLinksRow();
    }
  }
  function clearLibraryRatings() {
    getLibraryCards().forEach(card => {
      delete card.dataset.ratingsDisplayed;
      const oldDisplay = card.querySelector('.modern-rating-display');
      if (oldDisplay) oldDisplay.remove();
    });
  }

  // --- Initial Run ---
  handleRouteChange();

})();
