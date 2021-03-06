var saveSvgAsPng = require("save-svg-as-png")
var d3 = Object.assign({}, require("d3"), require("d3-geo"), require("d3-geo-projection"));
var topojson = require("topojson")


var pic_number = 0;
var start_ap = "NRT",
    end_ap = "ZRH";

var width = 500,
    height = 350;

var pi = Math.PI,
    radians = pi / 180,
    degrees = 180 / pi;

var current_point = 0;
var start_time  = Date.UTC(2017, 11, 18, 2, 0, 0);
var end_time  = Date.UTC(2017, 11, 18, 14, 30, 0);

var projection = d3.geoWinkel3()
    .translate([width / 2, height / 2])
    .scale(100)
    .precision(.1);

var interval_time = 4;
var update_seconds = 0.05;
var deriv_delta = 0.001;

var path = d3.geoPath()
    .projection(projection);
var circle = d3.geoCircle();
var graticule = d3.geoGraticule();

var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("id", "d3div");

d3.json("/data/world-50m.json", function(error, world) {
    if (error) throw error;

    svg.append("path")
        .datum(topojson.feature(world, world.objects.land))
        .attr("class", "land")
        .attr("d", path);

    svg.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path);

    d3.csv("/data/airports.min.csv",
        function(d){
            return {iata: d.IATA, lat: +d.Latitude, lon: +d.Longitude}
        },
        function(error, data) {
            if (error) throw error;

            var ap_highlights_data = data.filter(function(d) {return d.iata === start_ap})
                .concat(data.filter(function(d) {return d.iata === end_ap}));

            var geo_line = ap_highlights_data.map(function(d) { return [d.lon, d.lat]});

            var airports_highlight = svg.selectAll("circle.ap-hl")
                .data(ap_highlights_data)
                .enter()
                .append("circle")
                .attr("cx", function(d) {return projection([d.lon, d.lat])[0]} )
                .attr("cy", function(d) {return projection([d.lon, d.lat])[1]} )
                .attr("r", 3.0)
                .attr("class", "ap-hl")
                .style("fill", "red");

            var flightpath = svg.append("path")
                .datum({type: "LineString", coordinates: geo_line})
                .attr("d", path)
                .attr("class", "flightpath");
            //flightpath = svg.select("path.flightpath");

            var l = flightpath.node().getTotalLength();
            var points_along_path = [0];
            var flightpoints = svg.selectAll("g.flightpoints")
                .data(points_along_path)
                .enter()
                .append("g")
                .attr("class", "flightpoints")
                .attr("transform", function (t) {
                    // Get the orientation along the path by taking the derivative in "screen coordinates",
                    // then rotate this group by deg
                    var p1 = flightpath.node().getPointAtLength(t * l);
                    var p2 = flightpath.node().getPointAtLength((t + deriv_delta) * l);
                    var deg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 90;
                    return "translate(" + p1.x + "," + p1.y + ") rotate(" + deg + ")"
                });

            flightpoints.append("image")
                .attr("xlink:href", "/data/Aircraft_Airport_ecomo.svg")
                .attr("width", 16)
                .attr("height", 16)
                .attr("x", -8)
                .attr("y", -8)
                .attr("class", "flightpic");

            var night = svg.append("path")
                .attr("class", "solar-terminator")
                .attr("d", path);

            draw_solar_terminator(start_time);

            window.setInterval(update_flightpoint, update_seconds * 1000);
        });
});

function update_flightpoint() {
    current_point +=  update_seconds / interval_time;
    if (current_point > 1) { current_point -= 1}

    var flightpath = svg.select("path.flightpath");
    var l = flightpath.node().getTotalLength();

    d3.selectAll("g.flightpoints")
        .data([current_point])
        .attr("transform", function (t) {
            var p1 = flightpath.node().getPointAtLength(t * l);
            var p2 = flightpath.node().getPointAtLength((t + deriv_delta) * l);
            var deg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 90;
            return "translate(" + p1.x + "," + p1.y + ") rotate(" + deg + ")"
        });

    var delta = end_time - start_time;
    draw_solar_terminator(start_time + current_point * delta);

    //savepic();
}

function draw_solar_terminator(date_to_draw) {
    var solar = d3.select(".solar-terminator");
    solar.datum(circle.center(antipode(solarPosition(date_to_draw))))
        .attr("d", path);
};

//function savepic() {
//    number_string = (pic_number + "").padStart(3, "0");
//    saveSvgAsPng(document.getElementById("d3div"), "diagram" + number_string + ".png", {backgroundColor: "white"});
//    pic_number = pic_number + 1;
//}

//Verbatim from http://bl.ocks.org/mbostock/4597134
function antipode(position) {
    return [position[0] + 180, -position[1]];
}

function solarPosition(time) {
    var centuries = (time - Date.UTC(2000, 0, 1, 12)) / 864e5 / 36525, // since J2000
        longitude = (d3.utcDay.floor(time) - time) / 864e5 * 360 - 180;
    return [
        longitude - equationOfTime(centuries) * degrees,
        solarDeclination(centuries) * degrees
    ];
}

// Equations based on NOAA’s Solar Calculator; all angles in radians.
// http://www.esrl.noaa.gov/gmd/grad/solcalc/

function equationOfTime(centuries) {
    var e = eccentricityEarthOrbit(centuries),
        m = solarGeometricMeanAnomaly(centuries),
        l = solarGeometricMeanLongitude(centuries),
        y = Math.tan(obliquityCorrection(centuries) / 2);
    y *= y;
    return y * Math.sin(2 * l)
        - 2 * e * Math.sin(m)
        + 4 * e * y * Math.sin(m) * Math.cos(2 * l)
        - 0.5 * y * y * Math.sin(4 * l)
        - 1.25 * e * e * Math.sin(2 * m);
}

function solarDeclination(centuries) {
    return Math.asin(Math.sin(obliquityCorrection(centuries)) * Math.sin(solarApparentLongitude(centuries)));
}

function solarApparentLongitude(centuries) {
    return solarTrueLongitude(centuries) - (0.00569 + 0.00478 * Math.sin((125.04 - 1934.136 * centuries) * radians)) * radians;
}

function solarTrueLongitude(centuries) {
    return solarGeometricMeanLongitude(centuries) + solarEquationOfCenter(centuries);
}

function solarGeometricMeanAnomaly(centuries) {
    return (357.52911 + centuries * (35999.05029 - 0.0001537 * centuries)) * radians;
}

function solarGeometricMeanLongitude(centuries) {
    var l = (280.46646 + centuries * (36000.76983 + centuries * 0.0003032)) % 360;
    return (l < 0 ? l + 360 : l) / 180 * pi;
}

function solarEquationOfCenter(centuries) {
    var m = solarGeometricMeanAnomaly(centuries);
    return (Math.sin(m) * (1.914602 - centuries * (0.004817 + 0.000014 * centuries))
        + Math.sin(m + m) * (0.019993 - 0.000101 * centuries)
        + Math.sin(m + m + m) * 0.000289) * radians;
}

function obliquityCorrection(centuries) {
    return meanObliquityOfEcliptic(centuries) + 0.00256 * Math.cos((125.04 - 1934.136 * centuries) * radians) * radians;
}

function meanObliquityOfEcliptic(centuries) {
    return (23 + (26 + (21.448 - centuries * (46.8150 + centuries * (0.00059 - centuries * 0.001813))) / 60) / 60) * radians;
}

function eccentricityEarthOrbit(centuries) {
    return 0.016708634 - centuries * (0.000042037 + 0.0000001267 * centuries);
}

