/* =========================================================
   NEXORA
   REAL WORLD PLACES + GPS + HELPERS
========================================================= */


/* =========================
   CONFIGURATION
========================= */

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

const SEARCH_TIMEOUT = 25000;


/* =========================
   APP STATE
========================= */

const state = {

  userLocation: null,

  map: null,

  userMarker: null,

  accuracyCircle: null,

  placeMarkers: [],

  places: [],

  helpers: JSON.parse(
    localStorage.getItem("nexora_helpers") || "[]"
  ),

  favourites: JSON.parse(
    localStorage.getItem("nexora_favourites") || "[]"
  )

};


/* =========================
   DOM
========================= */

const $ = id => document.getElementById(id);


/* =========================
   MAP INITIALIZATION
========================= */

function initializeMap() {

  state.map = L.map("map", {
    zoomControl: true
  }).setView([26.8467, 80.9462], 13);


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }
  ).addTo(state.map);

}


/* =========================
   NAVIGATION
========================= */

function showPage(page) {

  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });


  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });


  const pageElement = $(`${page}Page`);

  if (pageElement) {
    pageElement.classList.add("active");
  }


  const navButton = document.querySelector(
    `.nav-btn[data-page="${page}"]`
  );

  if (navButton) {
    navButton.classList.add("active");
  }


  const titles = {
    home: "Find what you need. Nearby.",
    explore: "Explore real places around you.",
    helpers: "Your personal helper network.",
    saved: "Your favourite places."
  };


  $("pageTitle").textContent =
    titles[page] || titles.home;


  setTimeout(() => {

    if (state.map) {
      state.map.invalidateSize();
    }

  }, 200);

}


/* =========================
   LOCATION
========================= */

function locateUser() {

  if (!navigator.geolocation) {

    setStatus(
      "searchStatus",
      "Your browser does not support GPS location."
    );

    return;

  }


  setLoading(
    true,
    "Getting your exact location..."
  );


  navigator.geolocation.getCurrentPosition(

    position => {

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;


      state.userLocation = {
        lat,
        lon,
        accuracy
      };


      updateUserLocationOnMap();


      setLoading(false);


      $("sideLocation").textContent =
        `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

      $("topLocationText").textContent =
        "Location ready";


      $("mapStatus").textContent =
        "✓ Exact GPS location detected";


      setStatus(
        "searchStatus",
        "Location ready. Now search for any service or place."
      );

    },


    error => {

      setLoading(false);


      let message =
        "Unable to get your location.";


      if (error.code === 1) {
        message =
          "Location permission was denied. Please allow location access.";
      }

      if (error.code === 2) {
        message =
          "Your location could not be determined.";
      }

      if (error.code === 3) {
        message =
          "Location request timed out. Try again.";
      }


      $("mapStatus").textContent = message;

      setStatus(
        "searchStatus",
        message
      );

    },


    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }

  );

}


/* =========================
   SHOW USER LOCATION
========================= */

function updateUserLocationOnMap() {

  if (!state.userLocation || !state.map) {
    return;
  }


  const {
    lat,
    lon,
    accuracy
  } = state.userLocation;


  if (state.userMarker) {
    state.map.removeLayer(state.userMarker);
  }


  if (state.accuracyCircle) {
    state.map.removeLayer(state.accuracyCircle);
  }


  state.userMarker = L.circleMarker(
    [lat, lon],
    {
      radius: 9,
      color: "#35f28a",
      fillColor: "#35f28a",
      fillOpacity: .9,
      weight: 3
    }
  )
  .addTo(state.map)
  .bindPopup("<b>You are here</b>");


  state.accuracyCircle = L.circle(
    [lat, lon],
    {
      radius: Math.min(accuracy || 30, 1000),
      color: "#35f28a",
      fillColor: "#35f28a",
      fillOpacity: .05,
      weight: 1
    }
  )
  .addTo(state.map);


  state.map.setView(
    [lat, lon],
    15
  );

}


/* =========================
   SEARCH TERMS
========================= */

function getSearchTerms(input) {

  const text =
    input
      .toLowerCase()
      .trim();


  const aliases = {

    pharmacy: [
      "pharmacy",
      "chemist",
      "drugstore",
      "medical"
    ],

    "hardware shop": [
      "hardware",
      "hardware shop",
      "hardware store"
    ],

    hardware: [
      "hardware",
      "hardware shop",
      "hardware store"
    ],

    plumber: [
      "plumber",
      "plumbing"
    ],

    electrician: [
      "electrician",
      "electrical"
    ],

    carpenter: [
      "carpenter",
      "carpentry"
    ],

    mechanic: [
      "mechanic",
      "car repair",
      "motorcycle repair",
      "auto repair"
    ],

    grocery: [
      "grocery",
      "supermarket",
      "convenience",
      "food"
    ],

    restaurant: [
      "restaurant",
      "cafe",
      "fast food"
    ],

    hospital: [
      "hospital",
      "clinic",
      "healthcare"
    ],

    hotel: [
      "hotel",
      "guest house",
      "hostel"
    ],

    electrician: [
      "electrician",
      "electrical"
    ]

  };


  if (aliases[text]) {
    return aliases[text];
  }


  return [text];

}


/* =========================
   CATEGORY QUERY
========================= */

function categoryQuery(searchText, lat, lon, radius) {

  const text =
    searchText.toLowerCase().trim();


  let clauses = [];


  function add(tags) {

    tags.forEach(tag => {

      clauses.push(
        `nwr["${tag}"](around:${radius},${lat},${lon});`
      );

    });

  }


  if (
    text.includes("pharmacy") ||
    text.includes("chemist") ||
    text.includes("medical") ||
    text.includes("drug")
  ) {

    add([
      "amenity=pharmacy",
      "shop=chemist"
    ]);

  }


  else if (
    text.includes("hardware")
  ) {

    add([
      "shop=hardware"
    ]);

  }


  else if (
    text.includes("grocery") ||
    text.includes("supermarket") ||
    text.includes("convenience")
  ) {

    add([
      "shop=supermarket",
      "shop=convenience",
      "shop=grocery"
    ]);

  }


  else if (
    text.includes("restaurant")
  ) {

    add([
      "amenity=restaurant",
      "amenity=fast_food",
      "amenity=cafe"
    ]);

  }


  else if (
    text.includes("hospital") ||
    text.includes("clinic")
  ) {

    add([
      "amenity=hospital",
      "amenity=clinic",
      "healthcare=clinic"
    ]);

  }


  else if (
    text.includes("hotel")
  ) {

    add([
      "tourism=hotel",
      "tourism=guest_house",
      "tourism=hostel"
    ]);

  }


  else if (
    text.includes("mechanic") ||
    text.includes("repair")
  ) {

    add([
      "shop=car_repair",
      "shop=motorcycle",
      "shop=tyres",
      "craft=repair"
    ]);

  }


  else if (
    text.includes("electrician")
  ) {

    add([
      "craft=electrician"
    ]);

  }


  else if (
    text.includes("plumber")
  ) {

    add([
      "craft=plumber"
    ]);

  }


  else if (
    text.includes("carpenter")
  ) {

    add([
      "craft=carpenter"
    ]);

  }


  return clauses.join("\n");

}


/* =========================
   EVERYTHING QUERY
========================= */

function everythingQuery(lat, lon, radius) {

  return `

    nwr["name"](around:${radius},${lat},${lon});

    nwr["shop"](around:${radius},${lat},${lon});

    nwr["amenity"](around:${radius},${lat},${lon});

    nwr["craft"](around:${radius},${lat},${lon});

    nwr["tourism"](around:${radius},${lat},${lon});

    nwr["healthcare"](around:${radius},${lat},${lon});

    nwr["office"](around:${radius},${lat},${lon});

  `;

}


/* =========================
   BUILD OVERPASS QUERY
========================= */

function buildOverpassQuery(
  searchText,
  radius
) {

  const {
    lat,
    lon
  } = state.userLocation;


  let queryBody;


  if (
    !searchText ||
    searchText === "everything" ||
    searchText === "all"
  ) {

    queryBody =
      everythingQuery(
        lat,
        lon,
        radius
      );

  }

  else {

    const category =
      categoryQuery(
        searchText,
        lat,
        lon,
        radius
      );


    const terms =
      getSearchTerms(searchText);


    const regex =
      terms
        .map(escapeRegex)
        .join("|");


    queryBody = `

      ${category}

      nwr[
        "name"~"${regex}",i
      ](around:${radius},${lat},${lon});

      nwr[
        "description"~"${regex}",i
      ](around:${radius},${lat},${lon});

    `;

  }


  return `

[out:json][timeout:25];

(
  ${queryBody}
);

out center tags;

  `;

}


/* =========================
   ESCAPE REGEX
========================= */

function escapeRegex(text) {

  return text.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

}


/* =========================
   SEARCH
========================= */

async function searchPlaces() {

  if (!state.userLocation) {

    setStatus(
      "searchStatus",
      "First tap LOCATE ME and allow GPS permission."
    );

    locateUser();

    return;

  }


  const searchText =
    $("searchInput")
      .value
      .trim();


  if (!searchText) {

    setStatus(
      "searchStatus",
      "Type something like plumber, pharmacy or hardware shop."
    );

    return;

  }


  const distance =
    Number(
      $("distanceFilter").value
    );


  const radius =
    distance * 1000;


  const minRating =
    Number(
      $("ratingFilter").value
    );


  const availability =
    $("availabilityFilter").value;


  setLoading(
    true,
    "Searching real places nearby..."
  );


  setStatus(
    "searchStatus",
    "Searching OpenStreetMap data..."
  );


  clearPlaceMarkers();


  try {

    const query =
      buildOverpassQuery(
        searchText,
        radius
      );


    const data =
      await fetchOverpassWithRetry(
        query
      );


    let places =
      parsePlaces(
        data.elements || [],
        searchText
      );


    places =
      places.filter(place => {

        if (
          place.distanceKm >
          distance
        ) {
          return false;
        }


        if (
          minRating > 0 &&
          place.rating !== null &&
          place.rating < minRating
        ) {
          return false;
        }


        if (
          availability === "known" &&
          !place.openingHours
        ) {
          return false;
        }


        return true;

      });


    places =
      removeDuplicates(
        places
      );


    places.sort(
      (a,b) =>
        a.distanceKm -
        b.distanceKm
    );


    places =
      places.slice(0,100);


    state.places =
      places;


    displayPlaces(
      places
    );


    drawPlaceMarkers(
      places
    );


    setLoading(false);


    if (places.length === 0) {

      setStatus(
        "searchStatus",
        "No matching mapped places were found in this area. Try a larger distance or another search."
      );

    }

    else {

      setStatus(
        "searchStatus",
        `Found ${places.length} real mapped place${places.length === 1 ? "" : "s"}.`
      );

    }

  }

  catch(error) {

    console.error(error);


    setLoading(false);


    setStatus(
      "searchStatus",
      "Search failed. The public map server may be busy. Please try SEARCH again."
    );

  }

}


/* =========================
   OVERPASS RETRY
========================= */

async function fetchOverpassWithRetry(query) {

  let lastError;


  for (
    let i = 0;
    i < OVERPASS_SERVERS.length;
    i++
  ) {

    try {

      const controller =
        new AbortController();


      const timeout =
        setTimeout(
          () => controller.abort(),
          SEARCH_TIMEOUT
        );


      const response =
        await fetch(
          OVERPASS_SERVERS[i],
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8"
            },

            body:
              "data=" +
              encodeURIComponent(query),

            signal:
              controller.signal
          }
        );


      clearTimeout(timeout);


      if (!response.ok) {

        throw new Error(
          `HTTP ${response.status}`
        );

      }


      return await response.json();

    }

    catch(error) {

      lastError = error;

      console.warn(
        "Overpass server failed:",
        OVERPASS_SERVERS[i],
        error
      );

    }

  }


  throw lastError ||
    new Error("All search servers failed.");

}


/* =========================
   PARSE PLACES
========================= */

function parsePlaces(
  elements,
  searchText
) {

  const results = [];


  elements.forEach(element => {

    const tags =
      element.tags || {};


    const lat =
      element.lat ??
      element.center?.lat;


    const lon =
      element.lon ??
      element.center?.lon;


    if (
      typeof lat !== "number" ||
      typeof lon !== "number"
    ) {
      return;
    }


    const name =
      tags.name ||
      tags["name:en"] ||
      tags.operator ||
      "Unnamed place";


    const type =
      detectType(
        tags,
        searchText
      );


    const rating =
      getRating(tags);


    const address =
      getAddress(tags);


    const phone =
      tags.phone ||
      tags["contact:phone"] ||
      "";


    const website =
      tags.website ||
      tags["contact:website"] ||
      "";


    const openingHours =
      tags.opening_hours ||
      "";


    const distanceKm =
      haversine(
        state.userLocation.lat,
        state.userLocation.lon,
        lat,
        lon
      );


    results.push({

      id:
        `${element.type}_${element.id}`,

      osmType:
        element.type,

      osmId:
        element.id,

      name,

      type,

      lat,

      lon,

      rating,

      address,

      phone,

      website,

      openingHours,

      distanceKm,

      tags

    });

  });


  return results;

}


/* =========================
   TYPE DETECTION
========================= */

function detectType(
  tags,
  searchText
) {

  if (tags.shop)
    return formatType(tags.shop);

  if (tags.amenity)
    return formatType(tags.amenity);

  if (tags.craft)
    return formatType(tags.craft);

  if (tags.healthcare)
    return formatType(tags.healthcare);

  if (tags.tourism)
    return formatType(tags.tourism);

  if (tags.office)
    return formatType(tags.office);

  return searchText || "Place";

}


/* =========================
   TYPE FORMAT
========================= */

function formatType(value) {

  return String(value)
    .replace(/_/g," ")
    .replace(/\b\w/g,c =>
      c.toUpperCase()
    );

}


/* =========================
   RATING
========================= */

function getRating(tags) {

  const value =
    tags.rating ||
    tags.stars ||
    tags["contact:rating"];


  if (!value) {
    return null;
  }


  const number =
    parseFloat(value);


  if (
    Number.isNaN(number)
  ) {
    return null;
  }


  return number;

}


/* =========================
   ADDRESS
========================= */

function getAddress(tags) {

  if (tags["addr:full"])
    return tags["addr:full"];


  const parts = [];


  if (tags["addr:housenumber"])
    parts.push(
      tags["addr:housenumber"]
    );


  if (tags["addr:street"])
    parts.push(
      tags["addr:street"]
    );


  if (tags["addr:suburb"])
    parts.push(
      tags["addr:suburb"]
    );


  if (tags["addr:city"])
    parts.push(
      tags["addr:city"]
    );


  if (tags["addr:postcode"])
    parts.push(
      tags["addr:postcode"]
    );


  return parts.join(", ");

}


/* =========================
   HAVERSINE
========================= */

function haversine(
  lat1,
  lon1,
  lat2,
  lon2
) {

  const R =
    6371;


  const dLat =
    (lat2-lat1) *
    Math.PI / 180;


  const dLon =
    (lon2-lon1) *
    Math.PI / 180;


  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) ** 2;


  return (
    2 *
    R *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1-a)
    )
  );

}


/* =========================
   DUPLICATES
========================= */

function removeDuplicates(
  places
) {

  const seen =
    new Set();


  return places.filter(place => {

    const key =
      `${place.name.toLowerCase()}_${place.lat.toFixed(4)}_${place.lon.toFixed(4)}`;


    if (seen.has(key)) {
      return false;
    }


    seen.add(key);

    return true;

  });

}


/* =========================
   DISPLAY RESULTS
========================= */

function displayPlaces(
  places
) {

  $("resultCount").textContent =
    `${places.length} ${places.length === 1 ? "place" : "places"}`;


  const list =
    $("resultsList");


  if (!places.length) {

    list.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">⌕</div>

        <h3>No places found</h3>

        <p>
          Try increasing the distance or searching
          for another category.
        </p>

      </div>

    `;

    return;

  }


  list.innerHTML =
    places.map(
      placeCardHTML
    ).join("");


  list
    .querySelectorAll(".place-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              ".mini-btn"
            )
          ) {
            return;
          }


          const place =
            state.places.find(
              p =>
                p.id ===
                card.dataset.id
            );


          if (place) {
            openPlaceModal(
              place
            );
          }

        }
      );

    });


  list
    .querySelectorAll(
      "[data-action='direction']"
    )
    .forEach(btn => {

      btn.addEventListener(
        "click",
        event => {

          event.stopPropagation();


          const place =
            findPlace(
              btn.dataset.id
            );


          if (place) {
            openDirections(
              place
            );
          }

        }
      );

    });


  list
    .querySelectorAll(
      "[data-action='save']"
    )
    .forEach(btn => {

      btn.addEventListener(
        "click",
        event => {

          event.stopPropagation();


          const place =
            findPlace(
              btn.dataset.id
            );


          if (place) {

            addPlaceToHelpers(
              place
            );

          }

        }
      );

    });

}


/* =========================
   PLACE CARD
========================= */

function placeCardHTML(
  place
) {

  const icon =
    iconForType(
      place.type
    );


  const rating =
    place.rating !== null
      ? `★ ${place.rating}`
      : "★ Rating unavailable";


  const distance =
    place.distanceKm < 1
      ? `${Math.round(place.distanceKm * 1000)} m`
      : `${place.distanceKm.toFixed(1)} km`;


  return `

    <article
      class="place-card"
      data-id="${escapeHTML(place.id)}"
    >

      <div class="place-top">

        <div class="place-icon">
          ${icon}
        </div>

        <div>

          <div class="place-name">
            ${escapeHTML(place.name)}
          </div>

          <div class="place-type">
            ${escapeHTML(place.type)}
          </div>

        </div>

      </div>


      <div class="place-meta">

        ${rating}
        &nbsp; • &nbsp;
        ${distance}

        ${
          place.address
            ? `<br>📍 ${escapeHTML(place.address)}`
            : ""
        }

      </div>


      <div class="place-actions">

        <button
          class="mini-btn"
          data-action="save"
          data-id="${escapeHTML(place.id)}"
        >
          ＋ SAVE
        </button>

        <button
          class="mini-btn"
          data-action="direction"
          data-id="${escapeHTML(place.id)}"
        >
          ↗ DIRECTIONS
        </button>

      </div>

    </article>

  `;

}


/* =========================
   MAP MARKERS
========================= */

function drawPlaceMarkers(
  places
) {

  clearPlaceMarkers();


  places.forEach(place => {

    const marker =
      L.marker(
        [place.lat,place.lon]
      )
      .addTo(state.map);


    marker.bindPopup(`

      <b>
        ${escapeHTML(place.name)}
      </b>

      <br>

      ${escapeHTML(place.type)}

      <br>

      ${
        place.distanceKm.toFixed(1)
      } km away

    `);


    marker.on(
      "click",
      () => {

        openPlaceModal(
          place
        );

      }
    );


    state.placeMarkers.push(
      marker
    );

  });

}


/* =========================
   CLEAR MARKERS
========================= */

function clearPlaceMarkers() {

  if (!state.map) {
    return;
  }


  state.placeMarkers.forEach(
    marker => {
      state.map.removeLayer(
        marker
      );
    }
  );


  state.placeMarkers = [];

}


/* =========================
   PLACE MODAL
========================= */

function openPlaceModal(
  place
) {

  const icon =
    iconForType(
      place.type
    );


  const rating =
    place.rating !== null
      ? `★ ${place.rating}`
      : "Rating unavailable";


  const distance =
    place.distanceKm < 1
      ? `${Math.round(place.distanceKm * 1000)} metres`
      : `${place.distanceKm.toFixed(2)} km`;


  $("placeDetails").innerHTML = `

    <div class="detail-icon">
      ${icon}
    </div>

    <div class="detail-type">
      ${escapeHTML(place.type)}
    </div>

    <h2 class="detail-title">
      ${escapeHTML(place.name)}
    </h2>


    <div class="detail-row">

      <span>★</span>

      <div>
        <strong>RATING</strong>
        <p>${escapeHTML(rating)}</p>
      </div>

    </div>


    <div class="detail-row">

      <span>📍</span>

      <div>
        <strong>DISTANCE / LOCATION</strong>

        <p>
          ${escapeHTML(distance)}
          ${
            place.address
              ? `<br>${escapeHTML(place.address)}`
              : ""
          }
        </p>

      </div>

    </div>


    <div class="detail-row">

      <span>🕐</span>

      <div>
        <strong>OPENING INFORMATION</strong>

        <p>
          ${
            place.openingHours
              ? escapeHTML(place.openingHours)
              : "Opening hours unavailable"
          }
        </p>

      </div>

    </div>


    <div class="detail-row">

      <span>☎</span>

      <div>
        <strong>PHONE</strong>

        <p>
          ${
            place.phone
              ? escapeHTML(place.phone)
              : "Phone number unavailable"
          }
        </p>

      </div>

    </div>


    ${
      place.website
        ? `

        <div class="detail-row">

          <span>🌐</span>

          <div>

            <strong>WEBSITE</strong>

            <p>
              ${escapeHTML(place.website)}
            </p>

          </div>

        </div>

        `
        : ""
    }


    <div class="detail-actions">

      <button
        class="primary-btn"
        id="detailSaveBtn"
      >
        ＋ ADD TO MY HELPERS
      </button>

      <button
        class="secondary-btn"
        id="detailDirectionBtn"
      >
        ↗ DIRECTIONS
      </button>

    </div>


    ${
      place.phone
        ? `

        <button
          class="favorite-btn"
          id="detailCallBtn"
          style="width:100%;margin-top:8px;"
        >
          ☎ CALL
        </button>

        `
        : ""
    }


    <button
      class="favorite-btn"
      id="detailFavoriteBtn"
      style="width:100%;margin-top:8px;"
    >
      ★ ADD TO FAVOURITES
    </button>

  `;


  $("placeModal")
    .classList
    .add("open");


  $("detailSaveBtn")
    .onclick = () => {

      addPlaceToHelpers(
        place
      );

    };


  $("detailDirectionBtn")
    .onclick = () => {

      openDirections(
        place
      );

    };


  if (place.phone) {

    $("detailCallBtn")
      .onclick = () => {

        window.location.href =
          `tel:${place.phone}`;

      };

  }


  $("detailFavoriteBtn")
    .onclick = () => {

      addFavourite(
        place
      );

    };


  setTimeout(() => {

    if (state.map) {

      state.map.setView(
        [place.lat,place.lon],
        Math.max(
          state.map.getZoom(),
          16
        )
      );

    }

  },100);

}


/* =========================
   FIND PLACE
========================= */

function findPlace(id) {

  return state.places.find(
    place =>
      place.id === id
  );

}


/* =========================
   DIRECTIONS
========================= */

function openDirections(
  place
) {

  let url;


  if (state.userLocation) {

    url =
      `https://www.google.com/maps/dir/?api=1&origin=${state.userLocation.lat},${state.userLocation.lon}&destination=${place.lat},${place.lon}`;

  }

  else {

    url =
      `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;

  }


  window.open(
    url,
    "_blank"
  );

}


/* =========================
   ADD TO HELPERS
========================= */

function addPlaceToHelpers(
  place
) {

  const exists =
    state.helpers.some(
      helper =>
        helper.sourceId ===
        place.id
    );


  if (exists) {

    alert(
      "This place is already in My Helpers."
    );

    return;

  }


  const helper = {

    id:
      Date.now().toString(),

    sourceId:
      place.id,

    name:
      place.name,

    service:
      place.type,

    phone:
      place.phone,

    area:
      place.address,

    notes:
      "",

    lat:
      place.lat,

    lon:
      place.lon,

    rating:
      place.rating,

    website:
      place.website,

    openingHours:
      place.openingHours,

    createdAt:
      new Date().toISOString()

  };


  state.helpers.unshift(
    helper
  );


  saveHelpers();


  renderHelpers();


  closeModal(
    "placeModal"
  );


  alert(
    `${place.name} was added to My Helpers.`
  );

}


/* =========================
   HELPERS
========================= */

function renderHelpers(
  filter = ""
) {

  const list =
    $("helpersList");


  let helpers =
    [...state.helpers];


  if (filter) {

    const query =
      filter.toLowerCase();


    helpers =
      helpers.filter(
        helper =>
          `${helper.name} ${helper.service} ${helper.area}`
            .toLowerCase()
            .includes(query)
      );

  }


  if (!helpers.length) {

    list.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">♙</div>

        <h3>No saved helpers yet</h3>

        <p>
          Search for a real place and tap
          "Add to My Helpers".
        </p>

      </div>

    `;

    return;

  }


  list.innerHTML =
    helpers.map(
      helper => `

      <article
        class="saved-card"
        data-helper-id="${helper.id}"
      >

        <div class="place-icon">
          ${iconForType(helper.service)}
        </div>

        <h3>
          ${escapeHTML(helper.name)}
        </h3>

        <div class="service">
          ${escapeHTML(helper.service || "Helper")}
        </div>

        ${
          helper.area
            ? `<p>📍 ${escapeHTML(helper.area)}</p>`
            : ""
        }

        ${
          helper.phone
            ? `<p>☎ ${escapeHTML(helper.phone)}</p>`
            : ""
        }

        ${
          helper.rating !== null &&
          helper.rating !== undefined
            ? `<p>★ ${helper.rating}</p>`
            : ""
        }

        <div class="saved-actions">

          ${
            helper.phone
              ? `

              <button
                class="mini-btn call-helper"
              >
                ☎ CALL
              </button>

              `
              : ""
          }

          ${
            helper.lat &&
            helper.lon
              ? `

              <button
                class="mini-btn direction-helper"
              >
                ↗ MAP
              </button>

              `
              : ""
          }

          <button
            class="mini-btn delete-helper"
          >
            DELETE
          </button>

        </div>

      </article>

    `
    ).join("");


  list
    .querySelectorAll(".saved-card")
    .forEach(card => {

      const id =
        card.dataset.helperId;


      const helper =
        state.helpers.find(
          h => h.id === id
        );


      if (!helper) return;


      const call =
        card.querySelector(
          ".call-helper"
        );


      if (call) {

        call.onclick = () => {

          window.location.href =
            `tel:${helper.phone}`;

        };

      }


      const map =
        card.querySelector(
          ".direction-helper"
        );


      if (map) {

        map.onclick = () => {

          window.open(
            `https://www.google.com/maps/search/?api=1&query=${helper.lat},${helper.lon}`,
            "_blank"
          );

        };

      }


      const del =
        card.querySelector(
          ".delete-helper"
        );


      del.onclick = () => {

        state.helpers =
          state.helpers.filter(
            h => h.id !== id
          );


        saveHelpers();

        renderHelpers();

      };

    });

}


/* =========================
   SAVE HELPERS
========================= */

function saveHelpers() {

  localStorage.setItem(
    "nexora_helpers",
    JSON.stringify(
      state.helpers
    )
  );

}


/* =========================
   FAVOURITES
========================= */

function addFavourite(
  place
) {

  const exists =
    state.favourites.some(
      item =>
        item.id === place.id
    );


  if (exists) {

    alert(
      "Already in Favourites."
    );

    return;

  }


  state.favourites.unshift(
    place
  );


  localStorage.setItem(
    "nexora_favourites",
    JSON.stringify(
      state.favourites
    )
  );


  renderFavourites();


  alert(
    `${place.name} added to Favourites.`
  );

}


function renderFavourites() {

  const list =
    $("favouritesList");


  if (!state.favourites.length) {

    list.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">★</div>

        <h3>No favourites</h3>

        <p>
          Open a place and tap
          "Add to Favourites".
        </p>

      </div>

    `;

    return;

  }


  list.innerHTML =
    state.favourites
      .map(
        place => `

        <article class="saved-card">

          <div class="place-icon">
            ${iconForType(place.type)}
          </div>

          <h3>
            ${escapeHTML(place.name)}
          </h3>

          <div class="service">
            ${escapeHTML(place.type)}
          </div>

          <p>
            📍
            ${
              place.address
                ? escapeHTML(place.address)
                : "Location available on map"
            }
          </p>

          <div class="saved-actions">

            <button
              class="mini-btn favourite-open"
              data-id="${escapeHTML(place.id)}"
            >
              OPEN
            </button>

            <button
              class="mini-btn favourite-remove"
              data-id="${escapeHTML(place.id)}"
            >
              REMOVE
            </button>

          </div>

        </article>

      `
      )
      .join("");


  list
    .querySelectorAll(
      ".favourite-open"
    )
    .forEach(button => {

      button.onclick = () => {

        const place =
          state.favourites.find(
            p =>
              p.id ===
              button.dataset.id
          );


        if (place) {
          openPlaceModal(
            place
          );
        }

      };

    });


  list
    .querySelectorAll(
      ".favourite-remove"
    )
    .forEach(button => {

      button.onclick = () => {

        state.favourites =
          state.favourites.filter(
            p =>
              p.id !==
              button.dataset.id
          );


        localStorage.setItem(
          "nexora_favourites",
          JSON.stringify(
            state.favourites
          )
        );


        renderFavourites();

      };

    });

}


/* =========================
   ADD MANUAL HELPER
========================= */

function openManualHelper() {

  $("helperForm").reset();

  $("helperModal")
    .classList
    .add("open");

}


/* =========================
   MANUAL HELPER FORM
========================= */

$("helperForm").addEventListener(
  "submit",
  event => {

    event.preventDefault();


    const helper = {

      id:
        Date.now().toString(),

      sourceId:
        null,

      name:
        $("helperName").value.trim(),

      service:
        $("helperService").value.trim(),

      phone:
        $("helperPhone").value.trim(),

      area:
        $("helperArea").value.trim(),

      notes:
        $("helperNotes").value.trim(),

      lat:
        null,

      lon:
        null,

      rating:
        null,

      website:
        "",

      openingHours:
        "",

      createdAt:
        new Date().toISOString()

    };


    state.helpers.unshift(
      helper
    );


    saveHelpers();

    renderHelpers();

    closeModal(
      "helperModal"
    );

  }
);


/* =========================
   ICONS
========================= */

function iconForType(
  type = ""
) {

  const t =
    type.toLowerCase();


  if (
    t.includes("pharmacy") ||
    t.includes("chemist")
  )
    return "💊";


  if (
    t.includes("hardware")
  )
    return "🛠️";


  if (
    t.includes("plumb")
  )
    return "🔧";


  if (
    t.includes("electric")
  )
    return "⚡";


  if (
    t.includes("mechanic") ||
    t.includes("repair") ||
    t.includes("car")
  )
    return "🔩";


  if (
    t.includes("grocery") ||
    t.includes("supermarket") ||
    t.includes("convenience")
  )
    return "🛒";


  if (
    t.includes("restaurant") ||
    t.includes("cafe")
  )
    return "🍽️";


  if (
    t.includes("hospital") ||
    t.includes("clinic") ||
    t.includes("health")
  )
    return "🏥";


  if (
    t.includes("hotel")
  )
    return "🏨";


  if (
    t.includes("carpenter")
  )
    return "🪚";


  return "📍";

}


/* =========================
   UI HELPERS
========================= */

function setLoading(
  show,
  text = ""
) {

  if (show) {

    $("loadingScreen")
      .classList
      .add("show");


    if (text) {

      $("loadingText")
        .textContent = text;

    }

  }

  else {

    $("loadingScreen")
      .classList
      .remove("show");

  }

}


function setStatus(
  id,
  text
) {

  const element =
    $(id);


  if (element) {
    element.textContent =
      text;
  }

}


function closeModal(
  id
) {

  $(id)
    .classList
    .remove("open");

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(
  value
) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================
   EVENTS
========================= */

document
  .querySelectorAll(".nav-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        showPage(
          button.dataset.page
        );

      }
    );

  });


$("startExploreBtn")
  .onclick = () => {

    showPage("explore");

    if (!state.userLocation) {
      locateUser();
    }

  };


$("topLocateBtn")
  .onclick =
  locateUser;


$("locateBtn")
  .onclick =
  locateUser;


$("mapLocateBtn")
  .onclick =
  locateUser;


$("searchBtn")
  .onclick =
  searchPlaces;


$("searchInput")
  .addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        searchPlaces();

      }

    }
  );


$("clearSearch")
  .onclick = () => {

    $("searchInput").value = "";

    state.places = [];

    clearPlaceMarkers();

    $("resultCount").textContent =
      "0 places";

    $("resultsList").innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">⌕</div>

        <h3>Search nearby</h3>

        <p>
          Enter a service or category above.
        </p>

      </div>

    `;

  };


document
  .querySelectorAll(
    ".suggestions button"
  )
  .forEach(button => {

    button.onclick = () => {

      $("searchInput").value =
        button.dataset.search;

      searchPlaces();

    };

  });


document
  .querySelectorAll(
    ".category-card"
  )
  .forEach(button => {

    button.onclick = () => {

      showPage("explore");


      $("searchInput").value =
        button.dataset.category;


      if (!state.userLocation) {

        locateUser();

      }

      else {

        searchPlaces();

      }

    };

  });


$("addHelperBtn")
  .onclick =
  openManualHelper;


$("helperSearch")
  .addEventListener(
    "input",
    event => {

      renderHelpers(
        event.target.value
      );

    }
  );


document
  .querySelectorAll(
    "[data-close]"
  )
  .forEach(button => {

    button.onclick = () => {

      closeModal(
        button.dataset.close
      );

    };

  });


document
  .querySelectorAll(".modal")
  .forEach(modal => {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {

          modal.classList.remove(
            "open"
          );

        }

      }
    );

  });


/* =========================
   START
========================= */

initializeMap();

renderHelpers();

renderFavourites();

showPage("home");
