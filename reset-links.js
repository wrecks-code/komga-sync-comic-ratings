// Replace with your Komga API key
const KOMGA_API_KEY = "YOUR_API_KEY_HERE";
const KOMGA_HOST = location.origin;

// Prompt for the Library ID
const libraryId = prompt("Enter the Library ID to update:");

if (!libraryId) {
  console.error("Library ID is required.");
} else {
  // Fetch all series in the specified library
  fetch(`${KOMGA_HOST}/api/v1/series?library_id=${libraryId}&page=0&size=9999`, {
    headers: { Authorization: `Bearer ${KOMGA_API_KEY}` }
  })
  .then(res => res.json())
  .then(data => {
    const seriesArr = data.content || [];
    console.log(`Found ${seriesArr.length} series in library ${libraryId}`);
    
    // Process series one by one
    function updateSeries(index) {
      if (index >= seriesArr.length) {
        console.log("All series updated.");
        return;
      }
      const series = seriesArr[index];
      const seriesId = series.id;
      
      // Fetch individual series metadata
      fetch(`${KOMGA_HOST}/api/v1/series/${seriesId}`, {
        headers: { Authorization: `Bearer ${KOMGA_API_KEY}` }
      })
      .then(res => res.json())
      .then(seriesData => {
        const links = seriesData.metadata.links || [];
        // Filter out links that have "User Rating" or "Critic Rating" in the label
        const filteredLinks = links.filter(link => {
          const label = link.label.toLowerCase();
          return !(label.includes("user rating") || label.includes("critic rating"));
        });
        
        // Only update if there was a change
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
              console.log(`Series ${seriesId} updated.`);
            } else {
              console.error(`Failed to update series ${seriesId}: ${resp.status}`);
            }
            updateSeries(index + 1);
          })
          .catch(err => {
            console.error(`Error updating series ${seriesId}:`, err);
            updateSeries(index + 1);
          });
        } else {
          console.log(`Series ${seriesId} already clean.`);
          updateSeries(index + 1);
        }
      })
      .catch(err => {
        console.error(`Error fetching series ${seriesId}:`, err);
        updateSeries(index + 1);
      });
    }
    updateSeries(0);
  })
  .catch(err => console.error("Error fetching series:", err));
}
