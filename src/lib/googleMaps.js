/**
 * Google Maps Places API utility
 * Replaces AI-based venue search with real Places data
 */

// Wait for Google Maps JS API to load
function waitForGoogle(timeout = 15000) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve()
      return
    }
    const start = Date.now()
    const check = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(check)
        resolve()
      } else if (Date.now() - start > timeout) {
        clearInterval(check)
        reject(new Error('Google Maps failed to load'))
      }
    }, 100)
  })
}

// Singleton service instances
let _autocompleteService = null
let _placesServiceNode = null
let _placesService = null

async function getAutocompleteService() {
  await waitForGoogle()
  if (!_autocompleteService) {
    _autocompleteService = new window.google.maps.places.AutocompleteService()
  }
  return _autocompleteService
}

async function getPlacesService() {
  await waitForGoogle()
  if (!_placesService) {
    // PlacesService requires a DOM node or map instance
    _placesServiceNode = document.createElement('div')
    const map = new window.google.maps.Map(_placesServiceNode, {
      center: { lat: 44.05, lng: -121.31 }, // Central Oregon
      zoom: 10,
    })
    _placesService = new window.google.maps.places.PlacesService(map)
  }
  return _placesService
}

// Parse city and state from address_components array
function parseAddressComponents(components = []) {
  let city = ''
  let state = ''
  let zip = ''
  for (const comp of components) {
    if (comp.types.includes('locality')) city = comp.long_name
    if (comp.types.includes('administrative_area_level_1')) state = comp.short_name
    if (comp.types.includes('postal_code')) zip = comp.long_name
  }
  return { city, state, zip }
}

/**
 * Get autocomplete predictions for a venue name search
 * Returns: [{ placeId, name, address, description }]
 */
export async function getVenuePredictions(query) {
  try {
    const service = await getAutocompleteService()
    return new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input: query,
          types: ['establishment'],
          componentRestrictions: { country: 'us' },
        },
        (predictions, status) => {
          const OK = window.google.maps.places.PlacesServiceStatus.OK
          if (status === OK && predictions?.length) {
            resolve(
              predictions.map((p) => ({
                placeId: p.place_id,
                name: p.structured_formatting?.main_text || p.description,
                address: p.structured_formatting?.secondary_text || '',
                description: p.description,
              }))
            )
          } else {
            resolve([])
          }
        }
      )
    })
  } catch {
    return []
  }
}

/**
 * Get full details for a place by placeId
 * Returns: { name, address, city, state, phone, website, rating, totalRatings } or null
 */
export async function getPlaceDetails(placeId) {
  try {
    const service = await getPlacesService()
    return new Promise((resolve) => {
      service.getDetails(
        {
          placeId,
          fields: [
            'name',
            'formatted_address',
            'formatted_phone_number',
            'website',
            'address_components',
            'rating',
            'user_ratings_total',
            'business_status',
          ],
        },
        (place, status) => {
          const OK = window.google.maps.places.PlacesServiceStatus.OK
          if (status === OK && place) {
            const { city, state } = parseAddressComponents(place.address_components)
            resolve({
              name:         place.name || '',
              address:      place.formatted_address || '',
              city,
              state,
              phone:        place.formatted_phone_number || '',
              website:      place.website || '',
              rating:       place.rating || null,
              totalRatings: place.user_ratings_total || 0,
              isOpen:       place.business_status === 'OPERATIONAL',
            })
          } else {
            resolve(null)
          }
        }
      )
    })
  } catch {
    return null
  }
}

/**
 * Look up a business by name (for vendors) — returns phone + website + address
 * Returns: { name, address, city, state, phone, website, rating, totalRatings } or null
 */
export async function lookupBusinessByName(businessName, categoryHint = '') {
  try {
    const service = await getPlacesService()
    const query = [businessName, categoryHint, 'Oregon'].filter(Boolean).join(' ')

    const placeId = await new Promise((resolve) => {
      service.textSearch(
        { query },
        (results, status) => {
          const OK = window.google.maps.places.PlacesServiceStatus.OK
          if (status === OK && results?.length) {
            resolve(results[0].place_id)
          } else {
            resolve(null)
          }
        }
      )
    })

    if (!placeId) return null
    return getPlaceDetails(placeId)
  } catch {
    return null
  }
}

/**
 * Look up a venue by name (text search) — replaces the AI lookup edge function
 * Returns: { name, address, city, state, website } or null
 */
export async function lookupVenueByName(venueName, cityHint = '', stateHint = '') {
  try {
    const service = await getPlacesService()
    const query = [venueName, cityHint, stateHint].filter(Boolean).join(', ')

    // Step 1: text search to find the place_id
    const placeId = await new Promise((resolve) => {
      service.textSearch(
        { query },
        (results, status) => {
          const OK = window.google.maps.places.PlacesServiceStatus.OK
          if (status === OK && results?.length) {
            resolve(results[0].place_id)
          } else {
            resolve(null)
          }
        }
      )
    })

    if (!placeId) return null

    // Step 2: get full details including address_components
    return getPlaceDetails(placeId)
  } catch {
    return null
  }
}
