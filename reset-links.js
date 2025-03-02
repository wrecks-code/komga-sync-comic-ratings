(function() {
  'use strict';

  // Replace with your Komga API key.
  const KOMGA_API_KEY = "YOUR_API_KEY_HERE";
  const KOMGA_HOST = location.origin;
  
  // Cache API responses keyed by seriesId (if needed in future)
  const seriesCache = {};

  // Extract library ID from URL. Expecting URL format: /libraries/<libraryId>/series
  const libraryIdMatch = location.pathname.match(/^\/libraries\/([^/]+)\/series/);
  if (!libraryIdMatch) {
    console.error("❌ Not in a library view. Aborting reset.");
    return;
  }
  const libraryId = libraryIdMatch[1];
  console.log(`🔍 Using library ID: ${libraryId}`);

  // Fetch all series in the library.
  fetch(`${KOMGA_HOST}/api/v1/series?library_id=${libraryId}&page=0&size=9999`, {
    headers: { Authorization: `Bearer ${KOMGA_API_KEY}` }
  })
  .then(res => res.json())
  .then(data => {
    const seriesArr = data.content || [];
    console.log(`🔍 Found ${seriesArr.length} series in library ${libraryId}`);
    
    // Process series one by one.
    function updateSeries(index) {
      if (index >= seriesArr.length) {
        console.log("✅ All series updated.");
        return;
      }
      const series = seriesArr[index];
      const seriesId = series.id;
      
      // Fetch individual series metadata.
      fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}`, {
        headers: { Authorization: `Bearer ${KOMGA_API_KEY}` }
      })
      .then(res => res.json())
      .then(seriesData => {
        const links = seriesData.metadata.links || [];
        // Remove links that include "User Rating" or "Critic Rating" (case-insensitive).
        const filteredLinks = links.filter(link => {
          const label = link.label.toLowerCase();
          return !(label.includes("user rating") || label.includes("critic rating"));
        });
        
        // Ensure a "Your Rating" link exists. If missing, add one with a default value of 0.
        if (!filteredLinks.some(link => link.label.toLowerCase().includes("your rating"))) {
          filteredLinks.push({ label: "Your Rating: 0", url: location.href });
        }
        
        // Only update if changes were made.
        if (filteredLinks.length !== links.length) {
          fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}/metadata`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${KOMGA_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ links: filteredLinks })
          })
          .then(resp => {
            if (resp.ok) {
              console.log(`✅ Series ${seriesId} updated.`);
            } else {
              console.error(`❌ Failed to update series ${seriesId}: ${resp.status}`);
            }
            updateSeries(index + 1);
          })
          .catch(err => {
            console.error(`❌ Error updating series ${seriesId}:`, err);
            updateSeries(index + 1);
          });
        } else {
          console.log(`ℹ️ Series ${seriesId} already clean.`);
          updateSeries(index + 1);
        }
      })
      .catch(err => {
        console.error(`❌ Error fetching series ${seriesId}:`, err);
        updateSeries(index + 1);
      });
    }
    updateSeries(0);
  })
  .catch(err => console.error("❌ Error fetching series:", err));
})();
