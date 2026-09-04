/* =========================================================
   NEXORA 4.0
   REAL PLACES / GPS / MAP / HELPERS
========================================================= */

const SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

const TIMEOUT = 18000;

const state = {
  map: null,
  userLocation: null,
  userMarker: null,
  accuracyCircle: null,
  markers: [],
  places: [],
  helpers: JSON.parse(localStorage.getItem("nexora_helpers") || "[]"),
  favourites: JSON.parse(localStorage.getItem("nexora_favourites") || "[]")
};

const $ = id => document.getElementById(id);


/* =========================================================
   MAP
========================================================= */

function initMap() {

  state.map = L.map("map", {
    zoomControl: true
  }).setView([26.8467, 80.9462], 13);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(state.map);
}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(page) {

  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.remove("active");
  });

  const pageEl = $(`${page}Page`);

  if (pageEl) {
    pageEl.classList.add("active");
  }

  const button =
    document.querySelector(`.nav-btn[data-page="${page}"]`);

  if (button) {
    button.classList.add("active");
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
    if (state.map) state.map.invalidateSize();
  }, 200);
}


/* =========================================================
   GPS
========================================================= */

function locateUser() {

  if (!navigator.geolocation) {

    setStatus(
      "searchStatus",
      "GPS is not supported on this device."
    );

    return;
  }

  setLoading(true, "Getting your exact location...");

  navigator.geolocation.getCurrentPosition(

    position => {

      state.userLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      drawUserLocation();

      $("sideLocation").textContent =
        `${state.userLocation.lat.toFixed(5)}, ${state.userLocation.lon.toFixed(5)}`;

      $("topLocationText").textContent =
        "Location ready";

      $("mapStatus").textContent =
        "✓ Your current GPS location";

      setLoading(false);

      setStatus(
        "searchStatus",
        "Location ready. Search for anything nearby."
      );
    },

    error => {

      setLoading(false);

      let message =
        "Could not get your location.";

      if (error.code === 1) {
        message =
          "Location permission denied. Please allow location access.";
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


function drawUserLocation() {

  if (!state.userLocation || !state.map) return;

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

  state.userMarker =
    L.circleMarker(
      [lat, lon],
      {
        radius: 9,
        color: "#35f28a",
        fillColor: "#35f28a",
        fillOpacity: 1,
        weight: 3
      }
    )
    .addTo(state.map)
    .bindPopup("<b>YOU ARE HERE</b>");

  state.accuracyCircle =
    L.circle(
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


/* =========================================================
   SEARCH CATEGORY DATABASE
========================================================= */

const CATEGORY_TAGS = {

  pharmacy: [
    ["amenity", "pharmacy"],
    ["shop", "chemist"]
  ],

  hardware: [
    ["shop", "hardware"]
  ],

  grocery: [
    ["shop", "supermarket"],
    ["shop", "convenience"],
    ["shop", "grocery"]
  ],

  supermarket: [
    ["shop", "supermarket"]
  ],

  plumber: [
    ["craft", "plumber"]
  ],

  electrician: [
    ["craft", "electrician"]
  ],

  carpenter: [
    ["craft", "carpenter"]
  ],

  mechanic: [
    ["shop", "car_repair"],
    ["shop", "motorcycle_repair"],
    ["shop", "tyres"]
  ],

  restaurant: [
    ["amenity", "restaurant"],
    ["amenity", "fast_food"],
    ["amenity", "cafe"]
  ],

  cafe: [
    ["amenity", "cafe"]
  ],

  hospital: [
    ["amenity", "hospital"]
  ],

  clinic: [
    ["amenity", "clinic"],
    ["healthcare", "clinic"]
  ],

  hotel: [
    ["tourism", "hotel"],
    ["tourism", "guest_house"],
    ["tourism", "hostel"]
  ],

  bank: [
    ["amenity", "bank"]
  ],

  atm: [
    ["amenity", "atm"]
  ],

  fuel: [
    ["amenity", "fuel"]
  ],

  petrol: [
    ["amenity", "fuel"]
  ],

  salon: [
    ["shop", "hairdresser"],
    ["shop", "beauty"]
  ],

  electronics: [
    ["shop", "electronics"]
  ],

  mobile: [
    ["shop", "mobile_phone"]
  ],

  clothing: [
    ["shop", "clothes"]
  ],

  furniture: [
    ["shop", "furniture"]
  ],

  bakery: [
    ["shop", "bakery"]
  ],

  butcher: [
    ["shop", "butcher"]
  ],

  bicycle: [
    ["shop", "bicycle"]
  ],

  car: [
    ["shop", "car"]
  ],

  school: [
    ["amenity", "school"]
  ],

  college: [
    ["amenity", "college"]
  ],

  library: [
    ["amenity", "library"]
  ],

  police: [
    ["amenity", "police"]
  ],

  fire: [
    ["amenity", "fire_station"]
  ],

  post: [
    ["amenity", "post_office"]
  ],

  parking: [
    ["amenity", "parking"]
  ]

};


/* =========================================================
   SEARCH ALIASES
========================================================= */

const ALIASES = {

  chemist: "pharmacy",
  medical: "pharmacy",
  medicine: "pharmacy",
  drugstore: "pharmacy",

  "hardware shop": "hardware",
  "hardware store": "hardware",

  supermarket: "grocery",
  grocery: "grocery",
  groceries: "grocery",

  plumbing: "plumber",

  electrical: "electrician",

  carpentry: "carpenter",

  "car repair": "mechanic",
  "auto repair": "mechanic",
  "bike repair": "mechanic",

  food: "restaurant",

  restaurant: "restaurant",
  restaurants: "restaurant",

  petrol: "fuel",
  "petrol pump": "fuel",
  "gas station": "fuel",

  doctor: "clinic",

  doctors: "clinic",

  salon: "salon",
  barber: "salon",

  "mobile shop": "mobile",

  phone: "mobile",

  "clothing store": "clothing",
  clothes: "clothing",

  electronics: "electronics",

  "electronic shop": "electronics",

  atm: "atm",

  "cash machine": "atm",

  police: "police",

  school: "school",

  college: "college"
};


/* =========================================================
   NORMALIZE SEARCH
========================================================= */

function normalizeSearch(text) {

  text =
    text
      .toLowerCase()
      .trim();

  return ALIASES[text] || text;
}


/* =========================================================
   BUILD REAL OSM QUERY
========================================================= */

function buildQuery(searchText, radius) {

  const {
    lat,
    lon
  } = state.userLocation;

  const normalized =
    normalizeSearch(searchText);

  let clauses = [];

  /* CATEGORY SEARCH */

  if (CATEGORY_TAGS[normalized]) {

    CATEGORY_TAGS[normalized].forEach(
      ([key, value]) => {

        clauses.push(
          `nwr["${key}"="${value}"](around:${radius},${lat},${lon});`
        );

      }
    );

  }

  /* CUSTOM TEXT SEARCH */

  else {

    const safe =
      escapeRegex(searchText);

    clauses.push(`

      nwr["name"~"${safe}",i"]
      (around:${radius},${lat},${lon});

    `);

    clauses.push(`

      nwr["description"~"${safe}",i"]
      (around:${radius},${lat},${lon});

    `);

    clauses.push(`

      nwr["shop"~"${safe}",i"]
      (around:${radius},${lat},${lon});

    `);

    clauses.push(`

      nwr["craft"~"${safe}",i"]
      (around:${radius},${lat},${lon});

    `);

    clauses.push(`

      nwr["amenity"~"${safe}",i"]
      (around:${radius},${lat},${lon});

    `);
  }

  return `

[out:json][timeout:25];

(
${clauses.join("\n")}
);

out center tags;

  `;
}


/* =========================================================
   SEARCH
========================================================= */

async function searchPlaces() {

  if (!state.userLocation) {

    setStatus(
      "searchStatus",
      "First tap LOCATE ME and allow location access."
    );

    locateUser();

    return;
  }

  const search =
    $("searchInput")
      .value
      .trim();

  if (!search) {

    setStatus(
      "searchStatus",
      "Type a service such as plumber, pharmacy or hardware."
    );

    return;
  }

  const distance =
    Number(
      $("distanceFilter").value
    );

  const rating =
    Number(
      $("ratingFilter").value
    );

  const availability =
    $("availabilityFilter").value;

  const radius =
    distance * 1000;

  setLoading(
    true,
    "Finding real places nearby..."
  );

  setStatus(
    "searchStatus",
    "Searching real map data..."
  );

  clearMarkers();

  try {

    const query =
      buildQuery(
        search,
        radius
      );

    const data =
      await requestOverpass(query);

    let places =
      parseResults(
        data.elements || [],
        search
      );

    /* DISTANCE */

    places =
      places.filter(
        place =>
          place.distanceKm <= distance
      );

    /* RATING */

    if (rating > 0) {

      places =
        places.filter(
          place =>
            place.rating === null ||
            place.rating >= rating
        );

    }

    /* OPENING INFORMATION */

    if (availability === "known") {

      places =
        places.filter(
          place =>
            !!place.openingHours
        );

    }

    places =
      removeDuplicates(places);

    places.sort(
      (a,b) =>
        a.distanceKm -
        b.distanceKm
    );

    state.places =
      places.slice(0, 150);

    displayPlaces(
      state.places
    );

    drawMarkers(
      state.places
    );

    setLoading(false);

    if (!state.places.length) {

      setStatus(
        "searchStatus",
        "No mapped matches found. Try a larger distance."
      );

    } else {

      setStatus(
        "searchStatus",
        `✓ Found ${state.places.length} real mapped places`
      );

    }

  }

  catch(error) {

    console.error(error);

    setLoading(false);

    setStatus(
      "searchStatus",
      "Search servers are busy. Please press SEARCH again."
    );
  }
}


/* =========================================================
   OVERPASS REQUEST
========================================================= */

async function requestOverpass(query) {

  let lastError = null;

  for (const server of SERVERS) {

    try {

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () =>
            controller.abort(),
          TIMEOUT
        );

      const response =
        await fetch(
          server,
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

      clearTimeout(timer);

      if (!response.ok) {

        throw new Error(
          `Server returned ${response.status}`
        );

      }

      return await response.json();

    }

    catch(error) {

      lastError = error;

      console.log(
        "Trying next search server..."
      );
    }
  }

  throw lastError ||
    new Error("Search failed");
}


/* =========================================================
   PARSE RESULTS
========================================================= */

function parseResults(
  elements,
  searchText
) {

  const output = [];

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
      getType(
        tags,
        searchText
      );

    const address =
      getAddress(tags);

    const phone =
      tags.phone ||
      tags["contact:phone"] ||
      tags["contact:mobile"] ||
      "";

    const website =
      tags.website ||
      tags["contact:website"] ||
      "";

    const openingHours =
      tags.opening_hours ||
      "";

    const rating =
      getRating(tags);

    const distanceKm =
      calculateDistance(
        state.userLocation.lat,
        state.userLocation.lon,
        lat,
        lon
      );

    output.push({

      id:
        `${element.type}_${element.id}`,

      name,

      type,

      lat,

      lon,

      address,

      phone,

      website,

      openingHours,

      rating,

      distanceKm,

      tags

    });
  });

  return output;
}


/* =========================================================
   TYPE
========================================================= */

function getType(tags, search) {

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

  return search;
}


function formatType(value) {

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}


/* =========================================================
   ADDRESS
========================================================= */

function getAddress(tags) {

  if (tags["addr:full"])
    return tags["addr:full"];

  const parts = [];

  [
    "addr:housenumber",
    "addr:street",
    "addr:suburb",
    "addr:city",
    "addr:state",
    "addr:postcode"
  ].forEach(key => {

    if (tags[key])
      parts.push(tags[key]);

  });

  return parts.join(", ");
}


/* =========================================================
   RATING
========================================================= */

function getRating(tags) {

  const value =
    tags.rating ||
    tags["contact:rating"];

  if (!value)
    return null;

  const rating =
    parseFloat(value);

  return Number.isFinite(rating)
    ? rating
    : null;
}


/* =========================================================
   DISTANCE
========================================================= */

function calculateDistance(
  lat1,
  lon1,
  lat2,
  lon2
) {

  const R = 6371;

  const dLat =
    (lat2 - lat1) *
    Math.PI / 180;

  const dLon =
    (lon2 - lon1) *
    Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}


/* =========================================================
   DUPLICATES
========================================================= */

function removeDuplicates(places) {

  const seen =
    new Set();

  return places.filter(place => {

    const key =
      `${place.name.toLowerCase()}-${place.lat.toFixed(4)}-${place.lon.toFixed(4)}`;

    if (seen.has(key))
      return false;

    seen.add(key);

    return true;
  });
}


/* =========================================================
   DISPLAY
========================================================= */

function displayPlaces(places) {

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
          Try increasing the distance or using another category.
        </p>

      </div>

    `;

    return;
  }

  list.innerHTML =
    places
      .map(placeCard)
      .join("");

  list
    .querySelectorAll(".place-card")
    .forEach(card => {

      card.onclick = event => {

        if (
          event.target.closest(".mini-btn")
        )
          return;

        const place =
          state.places.find(
            p =>
              p.id ===
              card.dataset.id
          );

        if (place)
          openPlace(place);
      };
    });

  list
    .querySelectorAll(".save-place")
    .forEach(button => {

      button.onclick = event => {

        event.stopPropagation();

        const place =
          findPlace(
            button.dataset.id
          );

        if (place)
          addHelper(place);
      };
    });

  list
    .querySelectorAll(".direction-place")
    .forEach(button => {

      button.onclick = event => {

        event.stopPropagation();

        const place =
          findPlace(
            button.dataset.id
          );

        if (place)
          directions(place);
      };
    });
}


/* =========================================================
   CARD
========================================================= */

function placeCard(place) {

  const distance =
    place.distanceKm < 1
      ? `${Math.round(place.distanceKm * 1000)} m`
      : `${place.distanceKm.toFixed(1)} km`;

  const rating =
    place.rating !== null
      ? `★ ${place.rating}`
      : "★ Rating unavailable";

  return `

    <article
      class="place-card"
      data-id="${escapeHTML(place.id)}"
    >

      <div class="place-top">

        <div class="place-icon">
          ${icon(place.type)}
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
            : `<br>📍 Address unavailable`
        }

        ${
          place.openingHours
            ? `<br>🕐 ${escapeHTML(place.openingHours)}`
            : ""
        }

      </div>

      <div class="place-actions">

        <button
          class="mini-btn save-place"
          data-id="${escapeHTML(place.id)}"
        >
          ＋ SAVE
        </button>

        <button
          class="mini-btn direction-place"
          data-id="${escapeHTML(place.id)}"
        >
          ↗ DIRECTIONS
        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   MAP MARKERS
========================================================= */

function drawMarkers(places) {

  clearMarkers();

  places.forEach(place => {

    const marker =
      L.marker(
        [place.lat, place.lon]
      ).addTo(state.map);

    marker.bindPopup(`

      <b>${escapeHTML(place.name)}</b>
      <br>
      ${escapeHTML(place.type)}
      <br>
      ${place.distanceKm.toFixed(1)} km away

    `);

    marker.on(
      "click",
      () => openPlace(place)
    );

    state.markers.push(marker);
  });
}


function clearMarkers() {

  state.markers.forEach(
    marker =>
      state.map.removeLayer(marker)
  );

  state.markers = [];
}


/* =========================================================
   PLACE DETAILS
========================================================= */

function openPlace(place) {

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
      ${icon(place.type)}
    </div>

    <div class="detail-type">
      ${escapeHTML(place.type)}
    </div>

    <h2 class="detail-title">
      ${escapeHTML(place.name)}
    </h2>

    <div class="detail-row">

      <span>📍</span>

      <div>

        <strong>LOCATION</strong>

        <p>
          ${escapeHTML(distance)} away
          <br>
          ${
            place.address
              ? escapeHTML(place.address)
              : "Address unavailable"
          }
        </p>

      </div>

    </div>

    <div class="detail-row">

      <span>★</span>

      <div>

        <strong>RATING</strong>

        <p>
          ${escapeHTML(rating)}
        </p>

      </div>

    </div>

    <div class="detail-row">

      <span>🕐</span>

      <div>

        <strong>OPENING HOURS</strong>

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
        id="detailSave"
      >
        ＋ ADD TO MY HELPERS
      </button>

      <button
        class="secondary-btn"
        id="detailDirections"
      >
        ↗ DIRECTIONS
      </button>

    </div>

    ${
      place.phone
        ? `

          <button
            class="favorite-btn"
            id="detailCall"
            style="width:100%;margin-top:8px;"
          >
            ☎ CALL
          </button>

        `
        : ""
    }

    <button
      class="favorite-btn"
      id="detailFavourite"
      style="width:100%;margin-top:8px;"
    >
      ★ ADD TO FAVOURITES
    </button>

  `;

  $("placeModal")
    .classList
    .add("open");

  $("detailSave").onclick =
    () => addHelper(place);

  $("detailDirections").onclick =
    () => directions(place);

  if (place.phone) {

    $("detailCall").onclick =
      () => {

        window.location.href =
          `tel:${place.phone}`;

      };
  }

  $("detailFavourite").onclick =
    () => addFavourite(place);
}


/* =========================================================
   DIRECTIONS
========================================================= */

function directions(place) {

  let url;

  if (state.userLocation) {

    url =
      `https://www.google.com/maps/dir/?api=1&origin=${state.userLocation.lat},${state.userLocation.lon}&destination=${place.lat},${place.lon}`;

  } else {

    url =
      `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;

  }

  window.open(
    url,
    "_blank"
  );
}


/* =========================================================
   HELPERS
========================================================= */

function addHelper(place) {

  if (
    state.helpers.some(
      h => h.sourceId === place.id
    )
  ) {

    alert(
      "Already saved in My Helpers."
    );

    return;
  }

  state.helpers.unshift({

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
      place.openingHours

  });

  localStorage.setItem(
    "nexora_helpers",
    JSON.stringify(state.helpers)
  );

  renderHelpers();

  closeModal("placeModal");

  alert(
    `${place.name} added to My Helpers.`
  );
}


function renderHelpers(filter = "") {

  const list =
    $("helpersList");

  let helpers =
    [...state.helpers];

  if (filter) {

    const q =
      filter.toLowerCase();

    helpers =
      helpers.filter(
        h =>
          `${h.name} ${h.service} ${h.area}`
            .toLowerCase()
            .includes(q)
      );
  }

  if (!helpers.length) {

    list.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">♙</div>

        <h3>No saved helpers</h3>

        <p>
          Search for a place and press
          ADD TO MY HELPERS.
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
          data-id="${helper.id}"
        >

          <div class="place-icon">
            ${icon(helper.service)}
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
                    class="mini-btn helper-call"
                  >
                    ☎ CALL
                  </button>
               
