// ==UserScript==
// @name         Komga - Show Ratings in Library View (Optimized)
// @namespace    http://speedpoop.com
// @version      2.0
// @description  Displays a compact rating display (e.g. "★9.0(89) ★7") on each library series card using cached API responses and smart DOM observation.
// @match        https://komga.org/*
// @grant        none
// ==/UserScript==

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
