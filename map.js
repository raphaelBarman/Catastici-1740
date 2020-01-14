var DEFAULT_DELAY = 100;
mapboxgl.accessToken = 'pk.eyJ1IjoicmFwaGFlbGJhcm1hbiIsImEiOiJjanR2emFpcDAxdzRtNDRwY2s5ZjdyOWZuIn0.3oA9tF27p0sOAK3rr-21cQ';
var map = new mapboxgl.Map({
    container: 'map',
    center: [12.3345898, 45.4371908],
    zoom: 13.15,
    style: 'mapbox://styles/raphaelbarman/ck3iirjgp1heq1coajdyt1ue7'
});

function normalize(string) {
    return string.toLowerCase().trim();
}

function valOrEmpty(val) {
    if (val === undefined || val === 'NaN') {
        return "";
    } else {
        return val;
    }
}

function delay(fn, ms) {
    let timer = 0
    return function(...args) {
        clearTimeout(timer)
        timer = setTimeout(fn.bind(this, ...args), ms || 0)
    }
}

function featureToCard(feature) {
    var properties = feature.properties;
    var card = document.createElement("div");
    card.className = 'card';
    card.id = "card-" + properties.idx;
    var cardBody = document.createElement("div");
    cardBody.className = 'card-body';

    var cardTitle = document.createElement("h5");
    cardTitle.className = 'card-title';
    cardTitle.innerHTML = valOrEmpty(properties.owner_name);
    cardBody.appendChild(cardTitle);

    var cardSubtitle = document.createElement("h6");
    cardSubtitle.className = 'card-subtitle mb-2 text-muted';
    cardSubtitle.innerHTML = valOrEmpty(properties.ten_name);
    cardBody.appendChild(cardSubtitle);

    var cardText = document.createElement('p');
    cardText.className = 'card-text';
    cardText.innerHTML = valOrEmpty(properties.function);
    cardBody.appendChild(cardText);

    var listInfo = document.createElement('ul');
    listInfo.className = 'list-group list-group-flush';

    var rent = document.createElement('li');
    rent.className = 'list-group-item';
    rent.innerHTML = valOrEmpty(properties.an_rendi);
    if (rent.innerHTML.length !== 0) listInfo.appendChild(rent);

    var idNapo = document.createElement('li');
    idNapo.className = 'list-group-item';
    idNapo.innerHTML = valOrEmpty(properties.id_napo);
    if (idNapo.innerHTML.length !== 0) listInfo.appendChild(idNapo);

    var place = document.createElement('li');
    place.className = 'list-group-item';
    place.innerHTML = valOrEmpty(properties.place);
    if (place.innerHTML.length !== 0) listInfo.appendChild(place);

    cardBody.appendChild(listInfo);

    card.appendChild(cardBody);
    return card;
}


map.on('load', function() {
    map.addSource('catastici_vec', {
        type: "vector",
        url: "mapbox://raphaelbarman.ck3ihdp1i25xa2umtmt15sgjy-33yp7",
    });

    fetch("catastici_1740_davide_categories_epsg4326.geojson").then(res => res.json()).then(function(data) {

        function createCards(features){
            var results = $('.results')[0];
            results.innerHTML = "";
            features.forEach(function(feature) {
                var card = featureToCard(feature);
                results.appendChild(card);
            });

            $(".card").click(function (e) {
                var featureIdx = parseInt(e.currentTarget.id.split('-')[1]);
                console.log(featureIdx);
                var features = data['features'].filter(feature => feature.properties.idx === featureIdx);
 	              if (features.length !== 0){
                    map.easeTo({center: features[0].geometry.coordinates, zoom: 20});
                }
            });
        }

        map.addSource('catastici', {
            type: "geojson",
            data: data,
            cluster: true,
            clusterMaxZoom: 22,
            clusterRadius: 30
        });

        //map.addLayer({
        //    "id": "catastici",
        //    "type": "circle",
        //    "source": "catastici",
        //    "source-layer": "Catastici_1740",
        //    "paint": {
        //        "circle-color": "rgba(0,0,0,1)"
        //    }
        //});

        map.addLayer({
            id: "clusters",
            type: "circle",
            source: "catastici",
            filter: ["has", "point_count"],
            paint: {
                // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
                // with three steps to implement three types of circles:
                //   * Blue, 20px circles when point count is less than 100
                //   * Yellow, 30px circles when point count is between 100 and 750
                //   * Pink, 40px circles when point count is greater than or equal to 750
                "circle-color": [
                    "step",
                    ["get", "point_count"],
                    "#dfe5ee",
                    20,
                    "#bfcbde",
                    100,
                    "#a0b1cd"
                ],
                "circle-radius": [
                    "step",
                    ["get", "point_count"],
                    20,
                    20,
                    30,
                    100,
                    40
                ]
            }
        });

        map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "catastici",
            filter: ["has", "point_count"],
            layout: {
                "text-field": "{point_count_abbreviated}",
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-size": 12
            }
        });

        map.addLayer({
            id: "unclustered-point",
            type: "circle",
            source: "catastici",
            filter: ["!", ["has", "point_count"]],
            paint: {
                "circle-color": "#11b4da",
                "circle-radius": 4,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#fff"
            }
        });

        map.on('click', 'unclustered-point', function(e) {
            // set bbox as 5px reactangle area around clicked point
            var bbox = [
                [e.point.x - 5, e.point.y - 5],
                [e.point.x + 5, e.point.y + 5]
            ];
            var features = map.queryRenderedFeatures(bbox, {
                layers: ['unclustered-point']
            });
            var clickPoint = turf.point([e.lngLat.lng, e.lngLat.lat]);
            console.log(turf.nearestPoint(clickPoint, turf.featureCollection(features)));
        });

        // inspect a cluster on click
        map.on('click', 'clusters', function(e) {
            var features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });
            var clusterId = features[0].properties.cluster_id;
            map.getSource('catastici').getClusterExpansionZoom(clusterId, function(err, zoom) {
                if (err)
                    return;

                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            });
        });

        map.on('mouseenter', 'clusters', function() {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('click', 'clusters', delay(function(e) {
            // set bbox as 5px reactangle area around clicked point
            var bbox = [
                [e.point.x - 5, e.point.y - 5],
                [e.point.x + 5, e.point.y + 5]
            ];
            var features = map.queryRenderedFeatures(bbox, {
                layers: ['clusters']
            });
            var clickPoint = turf.point([e.lngLat.lng, e.lngLat.lat]);
            var nearestFeature = turf.nearestPoint(clickPoint, turf.featureCollection(features));

            var clusterId = nearestFeature.properties.cluster_id;

            map.getSource('catastici').getClusterLeaves(clusterId, 10000, 0, function(error, features) {
                createCards(features);
            });

        }, DEFAULT_DELAY));

        map.on('click', 'unclustered-point', delay(function(e) {
            // set bbox as 5px reactangle area around clicked point
            var bbox = [
                [e.point.x - 5, e.point.y - 5],
                [e.point.x + 5, e.point.y + 5]
            ];
            var features = map.queryRenderedFeatures(bbox, {
                layers: ['unclustered-point']
            });

            createCards(features);

        }));

        map.on('mouseleave', 'clusters', function() {
            map.getCanvas().style.cursor = '';
        });

        var filter_props = {
            'owner': '',
            'tenant': '',
            'category': 'all',
            'min_rent': NaN,
            'max_rent': NaN
        };

        function filter() {
            var owner = filter_props.owner;
            var tenant = filter_props.tenant;
            var category = filter_props.category;
            var min_rent = filter_props.min_rent;
            var max_rent = filter_props.max_rent;

            var filteredData = {
                "type": 'FeatureCollection'
            };
            var filteredFeatures = data['features'];

            filteredFeatures = filteredFeatures.filter(function(feature) {
                var properties = feature['properties'];

                return (owner === '' || normalize(properties['owner_name']).includes(owner)) &&
                    (tenant === '' || normalize(properties['ten_name']).includes(tenant)) &&
                    (category === 'all' || properties['categories'].includes(category)) &&
                    (isNaN(min_rent) || properties['an_rendi'] >= min_rent) &&
                    (isNaN(max_rent) || properties['an_rendi'] <= max_rent);
            });


            filteredData['features'] = filteredFeatures;

            map.getSource('catastici').setData(filteredData);

            createCards(filteredFeatures);
        }

        $("input[name=categoryRadios]").change(function() {
            var category = this.value;
            filter_props.category = category;
            filter();
        });

        $("#filter-owner-name-input").keyup(delay(function(e) {
            filter_props.owner = normalize(e.target.value);
            filter();
        }, DEFAULT_DELAY));

        $("#filter-tenant-name-input").keyup(delay(function(e) {
            filter_props.tenant = normalize(e.target.value);
            filter();
        }, DEFAULT_DELAY));

        $("#min-rent-input").keyup(delay(function(e) {
            filter_props.min_rent = parseFloat(e.target.value);
            filter();
        }, DEFAULT_DELAY));

        $("#max-rent-input").keyup(delay(function(e) {
            filter_props.max_rent = parseFloat(e.target.value);
            filter();
        }, DEFAULT_DELAY));


        filter();

    });
});
