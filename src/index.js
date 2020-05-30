// Styling
import "./scss/style.scss"
import "mapbox-gl/dist/mapbox-gl.css"
// Packages
import mapbox from "mapbox-gl"

// FUNCTION: Create
export function create(target, layers) {
  if (
    target === undefined ||
    layers.length === undefined ||
    layers.length < 1
  ) {
    return
  }

  const targetElement = 
    typeof target === "string" ? document.querySelector(target) : target

  const bounds = getBounds(getAllCoords(layers))

  mapbox.accessToken =
    "pk.eyJ1Ijoidi1tdG9tIiwiYSI6ImNqcm90dGN1ejBobWY0NHJxa3NnMnY5ODkifQ.8i5ISQiZx3iRP2nUNTznJg"
  const map = new mapbox.Map({
    container: targetElement,
    style: "mapbox://styles/mapbox/outdoors-v10",
    center: bounds.getCenter(),
    zoom: 12,
  })
  map.fitBounds(bounds, { duration: 0, padding: 45 })

  map.on('load', () => {
    layers.forEach(layer => {
      const { name } = layer
      map.loadImage(layer.icon, (err, img) => {
        if (err) throw err
        // Add image-icon
        map.addImage(name, img)
        // Add layers as source
        map.addSource(name, formatToGeoJson(layer.points))
        // Display points
        map.addLayer({
          'id': `${name}-layer`,
          'type': 'circle',
          'source': name,
          'type': 'symbol',
          'layout': {
            'icon-image': name,
            'icon-size': layer.iconSize
          }
        })
        // Listen if layer get clicked
        map.on('click', `${name}-layer`, e => {
          const coordinates = e.features[0].geometry.coordinates.slice()
          const info = e.features[0].properties

          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          const template = `
            <div class="tdb-map-popup">
              <h3>${info.text}</h3>
              <p>${info.address}</p>
              ${info.link !== 'null' ? `<a ${layer.targetBlank ? 'target="_blank"' : ''} href="${info.link}">Meer info</a>` : ''}
            </div>
          `

          new mapbox.Popup({ offset: [0, -layer.popupOffset], closeButton: false })
            .setLngLat(coordinates)
            .setHTML(template)
            .addTo(map)
        })
        // Show pointer on hover
        map.on('mouseenter', `${name}-layer`, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', `${name}-layer`, () => {
          map.getCanvas().style.cursor = ''
        })

      })
    })
  })
  
}

const getBounds = coords =>
  coords.reduce(function (bounds, coord) {
    return bounds.extend(coord);
  }, new mapbox.LngLatBounds(coords[0], coords[0]))

const getAllCoords = layers => {
  let allCoords = []
  layers.forEach(layer => {
    const layerCoords = layer.points.map(point => {
      return [ point.lon, point.lat ]
    })
    allCoords = [...allCoords, ...layerCoords]
  })
  return allCoords
}

const formatToGeoJson = points => {
  return {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: points.map(point => {
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [ point.lon, point.lat ]
          },
          properties: {
            address: point.address,
            link: point.link,
            text: point.text
          }
        }
      })
    }
  }
}