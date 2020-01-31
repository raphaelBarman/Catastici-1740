var DEFAULT_DELAY = 100;
mapboxgl.accessToken = 'pk.eyJ1IjoicmFwaGFlbGJhcm1hbiIsImEiOiJjanR2emFpcDAxdzRtNDRwY2s5ZjdyOWZuIn0.3oA9tF27p0sOAK3rr-21cQ';
var map = new mapboxgl.Map({
    container: 'map',
    center: [12.3345898, 45.4371908],
    zoom: 13.15,
    style: 'mapbox://styles/raphaelbarman/ck3iirjgp1heq1coajdyt1ue7'
});

map.addControl(new mapboxgl.NavigationControl());

function normalize(string) {
    return string.toLowerCase().trim();
}

function queryToPrefix(query, prefix) {
    var tokens = lunr.tokenizer(query).map(token => prefix + ":" + token);
    return tokens.join(" ");
}

function mergeResults(...searchResults) {
    var orderedResults = searchResults.length === 1 ? searchResults : searchResults.sort((a, b) => a.length-b.length);
    orderedResults = orderedResults.map(results => results.reduce(function (map, result) {
        map[result.ref] = result.score;
        return map;
    }, {}));

    const shortest = orderedResults[0];
    const set = new Set();
    const finalResults = [];

    Object.keys(shortest).forEach(key => {
        let tmpVal = 0;
        let every = true;
        for (let i=1; i < orderedResults.length; ++i){
            if(orderedResults[i].hasOwnProperty(key)) {
                tmpVal += orderedResults[i][key];
                continue;
            };
            every = false;
            break;
        }

        if(every && !set.has(key)) {
            set.add(key);
            tmpVal += shortest[key];
            finalResults.push([key, tmpVal]);
        }
    });


    return finalResults.sort((a,b) => a[1]-b[1]).map(res => parseInt(res[0]));
}

function valOrEmpty(val) {
    if (val === undefined || val === 'NaN') {
        return "";
    } else {
        return val;
    }
}

function delay(fn, ms) {
    let timer = 0;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(fn.bind(this, ...args), ms || 0);
    };
}

function getHeight(elements) {
    var height = 0;
    elements.forEach(element => height += element.getBoundingClientRect().height);
    return height;
}

function featureToCard(feature) {
    var properties = feature.properties;
    var card = document.createElement("div");
    card.className = 'card';
    card.id = "card-" + properties.idx;
    var cardBody = document.createElement("div");
    cardBody.className = 'card-body';

    var cardTitle = document.createElement("h6");
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

    var place = document.createElement('div');
    place.innerHTML = '<i class="las la-map-marker"></i> ' + valOrEmpty(properties.place);

    cardBody.appendChild(document.createElement('hr'));
    cardBody.appendChild(place);

    var rentNapo = document.createElement('div');
    rentNapo.className = 'row';

    var rent = document.createElement('div');
    rent.className = 'col text-center';
    var rentVal = valOrEmpty(properties.an_rendi);
    if (rentVal.length != 0) rent.innerHTML = '<i class="las la-coins"></i> ' + rentVal;
    rentNapo.appendChild(rent);

    var idNapo = document.createElement('div');
    idNapo.className = 'col text-center';
    var idNapoVal = valOrEmpty(properties.id_napo);
    if (idNapoVal.length != 0) idNapo.innerHTML = '<i class="las la-map"></i> ' + idNapoVal;
    rentNapo.appendChild(idNapo);

    cardBody.appendChild(document.createElement('hr'));
    cardBody.appendChild(rentNapo);


    card.appendChild(cardBody);
    return card;
}


var num_cards = 8;
var dataGlobal;
var globalIndex;

var index;
fetch('search_index.json').then(res => res.json()).then(res => {
    index = lunr.Index.load(res);
});

map.on('load', function() {
    map.addSource('catastici_vec', {
        type: "vector",
        url: "mapbox://raphaelbarman.ck3ihdp1i25xa2umtmt15sgjy-33yp7",
    });

    fetch("catastici_1740_all_categories.geojson").then(res => res.json()).then(function(data) {

        dataGlobal = data;
        var dataProperties = {};

        data['features'].forEach(function (feature) {
            dataProperties[feature.properties.idx] = feature;
        });

        var current_offset = 0;
        var features = [];
        var results_div = $(".results")[0];
        var resultsContainer = $("#results-container")[0];


        //var index = lunr(function() {
        //    // Use italian tokenizer
        //    this.use(lunr.it);

        //    // tweak similarity, c.f. https://lunrjs.com/guides/customising.html#similarity-tuning
        //    this.k1(1.5); // Make frequent word still count
        //    this.b(0); // Do not boost based on length of document

        //    // Define the fields
        //    this.ref('idx');
        //    this.field('owner_name');
        //    this.field('ten_name');
        //    this.field('function');
        //    this.field('place');
        //    
        //    // Add to the index
        //    data['features'].forEach( function (feature) {
        //        this.add(feature.properties);
        //    }, this);
        //});


        function updateFeatures(new_features) {
            features = new_features;

            addCards(features.slice(0, num_cards*2));
            resultsContainer.scrollTo(0,0);
        }

        function addCards(features) {
            results_div.innerHTML = "";
            features.forEach(function(feature) {
                var card = featureToCard(feature);
                results_div.appendChild(card);
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

        resultsContainer.addEventListener('scroll', function() {
            var maxOffset = Math.floor(features.length / num_cards);
            var new_offset = 0;
            if (resultsContainer.scrollTop + resultsContainer.clientHeight >= resultsContainer.scrollHeight) {
                new_offset = Math.min(current_offset+1, maxOffset);
                if (new_offset != current_offset) {
                    current_offset = new_offset;
                    addCards(features.slice((current_offset)*num_cards, (current_offset+2)*num_cards));
                    resultsContainer.scrollTo(0, resultsContainer.scrollTopMax - getHeight($('.results > ').toArray().slice(8,16)));
                }
            } else if (resultsContainer.scrollTop <= 0) {
                new_offset = Math.max(current_offset-1, 0);
                if (new_offset != current_offset) {
                    current_offset = new_offset;
                    addCards(features.slice((current_offset)*num_cards, (current_offset+2)*num_cards));
                    resultsContainer.scrollTo(0, getHeight($('.results > :lt(8)').toArray())+2);
                }

            }
        });

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
                updateFeatures(features);
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

            updateFeatures(features);

        }));

        map.on('mouseleave', 'clusters', function() {
            map.getCanvas().style.cursor = '';
        });

        var filter_props = {
            'search': '',
            'owner': '',
            'tenant': '',
            'function': '',
            'place': '',
            'category': 'all',
            'min_rent': NaN,
            'max_rent': NaN
        };

        function filter() {
            var search = filter_props.search;
            var owner = filter_props.owner;
            var tenant = filter_props.tenant;
            var function_ = filter_props.function;
            var place = filter_props.place;
            var category = filter_props.category;
            var min_rent = filter_props.min_rent;
            var max_rent = filter_props.max_rent;

            var filteredData = {
                "type": 'FeatureCollection'
            };
            var filteredFeatures = [];

            var searchResults = [];

            if (advancedSearchEnabled) {
                owner = queryToPrefix(owner, 'owner_name');
                tenant = queryToPrefix(tenant, 'ten_name');
                function_ = queryToPrefix(function_, 'function');
                place = queryToPrefix(place, 'place');

                var ownerResults = index.search(owner);
                var tenantResults = index.search(tenant);
                var functionResults = index.search(function_);
                var placeResults = index.search(place);

                searchResults = mergeResults(ownerResults, tenantResults, functionResults, placeResults);
            } else {
               searchResults = index.search(search).map(res => parseInt(res.ref));;
            }

            
            searchResults.forEach(idx => {
                var feature = dataProperties[idx];
                if ((isNaN(min_rent) || feature.properties['an_rendi'] >= min_rent) &&
                    (isNaN(max_rent) || feature.properties['an_rendi'] <= max_rent) &&
                    (category === 'all' || feature.properties['categories'].includes(category)))
                    filteredFeatures.push(feature);
            });

            $("#num-results")[0].innerHTML = (filteredFeatures.length === 0 ? "No results" : filteredFeatures.length + " results");
 //filteredFeatures = filteredFeatures.filter(function(feature) {
            //    var properties = feature['properties'];

            //    return (searchResults.includes(properties.idx)) &&
            //        (isNaN(min_rent) || properties['an_rendi'] >= min_rent) &&
            //        (isNaN(max_rent) || properties['an_rendi'] <= max_rent);

            //    //return (owner === '' || normalize(properties['owner_name']).includes(owner)) &&
            //    //    (tenant === '' || normalize(properties['ten_name']).includes(tenant)) &&
            //    //    (category === 'all' || properties['categories'].includes(category)) &&
            //    //    (isNaN(min_rent) || properties['an_rendi'] >= min_rent) &&
            //    //    (isNaN(max_rent) || properties['an_rendi'] <= max_rent);
            //});


            filteredData['features'] = filteredFeatures;

            map.getSource('catastici').setData(filteredData);

            updateFeatures(filteredFeatures);
        }

        $("#function-categories").change((e) => {
            var category = e.target.value;
            filter_props.category = category;
            filter();
        });

        $("#search").keyup(delay(function(e) {
            filter_props.search = e.target.value;
            filter();
        }, DEFAULT_DELAY));

        var advancedSearchEnabled = false;

        $("#button-advanced-search").click(() => {
            advancedSearchEnabled = !advancedSearchEnabled;
            console.log(advancedSearchEnabled);
            if (advancedSearchEnabled) {
                $("#search").attr('disabled', 'disabled');
                $("#search").val('');
                filter_props.search = '';

                //$("#filter-owner-name-input").val('');
                //$("#filter-tenant-name-input").val('');
                //$("#filter-function-input").val('');
                //$("#filter-place-input").val('');
                filter_props.owner = '';
                filter_props.tenant = '';
                filter_props.function = '';
                filter_props.place = '';

            } else {
                $("#search").removeAttr('disabled');
            }
            filter();
        });

        $("#filter-owner-name-input").keyup(delay(function(e) {
            filter_props.owner = e.target.value;
            filter();
        }, DEFAULT_DELAY));

        $("#filter-tenant-name-input").keyup(delay(function(e) {
            filter_props.tenant = e.target.value;
            filter();
        }, DEFAULT_DELAY));

        $("#filter-function-input").keyup(delay(function(e) {
            filter_props.function = e.target.value;
            filter();
        }, DEFAULT_DELAY));

        $("#filter-place-input").keyup(delay(function(e) {
            filter_props.place = e.target.value;
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
