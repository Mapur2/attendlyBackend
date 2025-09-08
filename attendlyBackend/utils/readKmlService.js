const fs = require("fs");
const { DOMParser } = require("xmldom");
const togeojson = require("@mapbox/togeojson");

const readKmlFile = async (path) => {
    // 1. Read KML file
    const kmlData = fs.readFileSync(path, "utf8");

    // 2. Parse into GeoJSON
    const dom = new DOMParser().parseFromString(kmlData);
    const geojson = togeojson.kml(dom);

    if (!geojson.features || geojson.features.length === 0) {
        throw new ApiError(400, "No features found in KML file");
    }

    // 3. Extract campuses
    const campuses = geojson.features.map((feature) => {
        const name = feature.properties.name || "Unnamed Campus";
        const coordinates = feature.geometry.coordinates;
        return { name, coordinates };
    });

    fs.unlinkSync(path)

    return campuses;
}

module.exports = readKmlFile;