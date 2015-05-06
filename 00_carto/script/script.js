//Global data variables
//TODO: trip totals actually include cities in Suffolk that are not Boston, but ok for now
var cityTripTotal = 0,
    cityWorkerTotal = 0, //cityWorkerTotal = cityTripTotal + work from home
    tractMetadata = d3.map();

//Global visual variables
var margin = {t:120,r:150,b:80,l:200};

var yPadding = 5,
    scaleY = d3.scale.linear(),
    scaleColor = d3.scale.linear().domain([0,.4]).range(['white','red']);
var fisheye = d3.fisheye.circular()
    .radius(60);

var format = d3.format('%.1')

//map projections
var projection = d3.geo.mercator();

var path = d3.geo.path()
    .projection(projection);

//global events
var dispatch = d3.dispatch('chartHover','mapHover','out');

//On window load...
    $(window).on('load',function(e){
        $('#intro').modal();
    });


//Load data
d3.csv("data/tract_metadata.csv", parseMeta, function(err,meta){
    queue()
        .defer(d3.csv, "data/ACS_13_5YR_B08303_with_ann.csv", parseTime)
        .defer(d3.csv, "data/ACS_13_5YR_B08301_with_ann.csv", parseMode)
        .defer(d3.json, "data/tracts.geojson")
        .defer(d3.json, "data/neighborhoods.geojson")
        .await(dataLoaded);

    //Arm global menu bar
    $('.meta .refresh').on('click',function(e){
        e.preventDefault();
        location.reload();
    });
})

function dataLoaded(err, time, mode, tractGeo, hoodGeo){

    drawTimeChart(time,d3.select('#commute-time'));
    drawMap(tractGeo,hoodGeo,time,d3.select('#choropleth'));

    $('.canvas').removeClass('loading');
}

function drawTimeChart(tracts,ctx){
    //visual variables specific to this viz
    var width = $('#commute-time').width() - margin.r - margin.l,
        height = $('#commute-time').height() - margin.t - margin.b;
    var cellWidth = width/8;

    var canvas = ctx
        .append('svg')
        .attr('width',width+margin.r+margin.l)
        .attr('height',height + margin.t + margin.b)
        .append('g')
        .attr('class','canvas chart')
        .attr('transform','translate('+margin.l+','+margin.t+')');
    var tooltip = ctx.select('.custom-tooltip');
    var visualTarget = canvas.append('rect')
        .attr('class','target')
        .style('fill','none')
        .style('stroke-width','1.5px')
        .style('stroke','#0092c8')
        .style('opacity',0)

    var rangeLabels = canvas.selectAll('.range-label')
        .data(tracts[0].timeShares)
        .enter()
        .append('text')
        .attr('class','range-label')
        .text(function(d){return d.time})
        .attr('transform',function(d,i){
            var x = i*cellWidth + cellWidth/2;
            return 'translate('+x+',0)rotate(-45)'
        })
        .attr('dy',-3);

    //Nest tracts by neighborhoods
    //And remove those in HI
    //Compute neighorhood trip total
    var hoods = d3.nest()
        .key(function(d){return d.neighborhood})
        .map(tracts,d3.map);
    hoods.remove('Harbor Islands');

    hoods = hoods.entries();
    hoods
        .sort(function(a,b){
            if(a.key > b.key){
                return 1
            }else if(a.key < b.key){
                return -1;
            }
        });
    hoods.forEach(function(h){
        h.total = 0;
        h.value.forEach(function(tract){
            h.total += tract.total;
        });
    });

    //Set up the scales
    scaleY
        .domain([0,cityTripTotal])
        .range([0,height-(hoods.length-1)*yPadding]);


    //Start drawings
    var node = canvas.selectAll('.node')
        .data(chartLayout(hoods),function(d){return d.key});
    var nodeEnter = node.enter()
        .insert('g','.target')
        .attr('class',function(d){
            if(d.depth == 0){ return 'node share'}
            else if(d.depth == 1){return 'node tract'}
            else{return 'node neighborhood'}
        })
        .attr('transform',function(d){
            return 'translate('+d.x+','+d.y+')';
        });
    nodeEnter.filter(function(d){return d.depth == 2; })
        .append('text')
        .text(function(d){
            return d.key;
        })
        .attr('text-anchor','end')
        .attr('dy',10)
        .attr('dx',-5);
    var shareNode = nodeEnter.filter(function(d){return d.depth == 0; })
        .append('rect')
        .on('mouseover',onShareEnter)
        .on('mousemove',onShareHover)
        .on('mouseout',onShareOut)
        .attr('width',0)
        .attr('height',function(d){return d.dy;})
        .style('fill','white');
    shareNode
        .transition()
        .duration(400)
        .attr('width',function(d){return d.dx;})
        .style('fill',function(d){
            return scaleColor(d.share);
        });

    canvas.on('mousemove',function(){
        fisheye.focus(d3.mouse(this));

        node.each(function(d){
            d.fisheye = fisheye(d);
            })
            .attr('transform',function(d){
                return 'translate('+d.fisheye.x+','+d.fisheye.y+')';
            });

        shareNode
            .attr('width',function(d){return d.dx * d.fisheye.z;})
            .attr('height',function(d){return d.dy * d.fisheye.z;})
    })

    function onShareEnter(s){
        dispatch.chartHover(s); //globally broadcast the id of the tract

        //position visual target
        visualTarget
            .attr('x',s.x-5)
            .attr('y',s.y-5)
            .attr('width',s.dx+10)
            .attr('height',s.dy+10)
            .transition()
            .style('opacity',1)

        //highlight range label
        rangeLabels
            .style('font-weight','normal')
            .style('fill',null)
            .filter(function(d){
                return d.tIndex == s.tIndex;
            })
            .style('font-weight','bold')
            .style('fill','black');

        tooltip.selectAll('p')
            .remove();
        tooltip
            .transition()
            .style('opacity',1);
        tooltip
            .append('p')
            .html((function(){
                if(s.subNeighborhood){
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.subNeighborhood+', '+s.neighborhood+')';
                }else{
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.neighborhood+')';
                }
            })())
        tooltip
            .append('p')
            .html((function(){
                return '<span class="data">'+s.trip+'</span> workers (<span class="data">'+format(s.share)+'</span>) have commutes in the '+s.time+' minute range';
            })())
    }
    function onShareHover(){
        var xy = d3.mouse(ctx.node());
        tooltip
            .style('left',xy[0]-90+'px')
            .style('bottom',(height+250-xy[1])+'px');
    }
    function onShareOut(){
        dispatch.out();
    }

    dispatch.on('mapHover',function(tractId,tIndex){
        var s;
        node.filter(function(d){
            return d.key == tractId+'-'+tIndex;
            })
            .each(function(d){
                s = d;
            });

        visualTarget
            .attr('x',s.x-5)
            .attr('y',s.y-5)
            .attr('width',s.dx+10)
            .attr('height',s.dy+10)
            .transition()
            .style('opacity',1)

        tooltip.selectAll('p')
            .remove();        
        tooltip
            .transition()
            .style('opacity',1);
        tooltip
            .style('left',s.x+s.dx/2+margin.l-90+'px')
            .style('bottom',(height+margin.b-s.y+50)+'px');
        tooltip
            .append('p')
            .html((function(){
                if(s.subNeighborhood){
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.subNeighborhood+', '+s.neighborhood+')';
                }else{
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.neighborhood+')';
                }
            })())
        tooltip
            .append('p')
            .html((function(){
                return '<span class="data">'+s.trip+'</span> workers (<span class="data">'+format(s.share)+'</span>) have commutes in the '+s.time+' minute range';
            })());
    })
    dispatch.on('out.chart',function(){
        tooltip
            .transition()
            .style('opacity',0);
        visualTarget
            .transition()
            .style('opacity',0);
    })

    function chartLayout(hoods){
        //a modified hierarchical layout
        //hoods -> tracts -> shares
        //returns a flat array of positions
        var positions = [],
            currentY = 0;

        hoods.forEach(function(h){
            h.x = 0;
            h.y = currentY;
            h.depth = 2;
            positions.push(h);

            var currentY2 = 0;
            h.value.forEach(function(t){
                t.x = 0;
                t.y = currentY2 + currentY;
                t.depth = 1;
                t.key = t.geoid;
                positions.push(t);

                var currentX = 0;
                t.timeShares.forEach(function(s,i){
                    s.x = currentX;
                    s.y = currentY2 + currentY;
                    s.dx = cellWidth;
                    s.dy = scaleY(t.total);
                    s.depth = 0;

                    positions.push(s);

                    currentX += cellWidth;
                })

                currentY2 += scaleY(t.total);
            })

            currentY += yPadding + scaleY(h.total);
        })

        return positions;
    }

}

function drawMap(tractGeo,hoodGeo,data,ctx){
    //Update width, height and projection, append all static elements
    var width = $('#choropleth').width() - margin.r - margin.l,
        height = $('#choropleth').height() - margin.t - margin.b;

    projection
        .center([-71.095190,42.314796])
        .scale(170000)
        .translate([width/2,height/2])
        .precision(.1)

    var canvas = ctx
        .append('svg')
        .attr('width',width+margin.r+margin.l)
        .attr('height',height + margin.t + margin.b)
        .append('g')
        .attr('class','canvas map')
        .attr('transform','translate('+margin.l+','+margin.t+')');
    var tooltip = ctx.select('.custom-tooltip');
    var visualTarget = canvas.append('g')
        .attr('class','target')
        .style('opacity',0);
    visualTarget.append('svg:image')
        .attr('xlink:href','assets/pin-02.svg')
        .attr('width',16)
        .attr('height',30)
        .attr('x',-8)
        .attr('y',-30);
    var metainfo = ctx.select('.canvas-meta').select('.cat');
    var legend = ctx.select('.canvas-meta')
        .append('svg')
        .attr('width',width/2)
        .attr('height',30);
    legend.selectAll('.legend-cat')
        .data([0,.05,.1,.15,.2])
        .enter()
        .append('rect')
        .attr('x',function(d,i){
            return i*width/20
        })
        .attr('width',width/20)
        .attr('height',4)
        .style('fill',function(d){
            return scaleColor(d);
        });
    legend.append('text')
        .text('0%')
        .attr('y',20);
    legend.append('text')
        .text('20%')
        .attr('y',20)
        .attr('x',width/4)
        .attr('text-anchor','end')
    legend
        .append('rect')
        .attr('width',width/20)
        .attr('height',4)
        .style('fill','rgb(50,50,50)')
        .attr('x',width*6/20);
    legend.append('text')
        .text('No data')
        .attr('y',20)
        .attr('x',width*6/20);



    //clean up data
    var _data = d3.map(data, function(d){return d.geoid2;})

    //variable for displaying current time share, by default showing "under 5"
    var tIndex = 0;

    //Draw tracts
    var tracts = canvas.selectAll('.tract')
        .data(tractGeo.features, function(d){return d.properties.GEOID10;});
    var tractsEnter = tracts
        .enter()
        .insert('path','.target')
        .attr('class','tract')
        .attr('d',path)
        .on('mouseenter',onTractEnter)
        .on('mousemove',onTractMove)
        .on('mouseleave',onTractLeave);
    tracts
        .style('fill',function(d){
            var t = _data.get(d.properties.GEOID10);
            if(!t){return 'rgb(50,50,50)';}
            return scaleColor(t.timeShares[tIndex].share);
        })

    //non-interactive neighborhood overlay
    var hoods = canvas.selectAll('.hood')
        .data(hoodGeo.features)
        .enter()
        .insert('path','.target')
        .attr('class','hood')
        .attr('d',path)
        .style('fill','none')
        .style('stroke','rgb(245,245,245)')
        .style('stroke-width','1.5px');

    function onTractEnter(d){
        //Get data, populate tooltip
        var t = _data.get(d.properties.GEOID10); //tract csv data
        if(!t){return;}

        var xy = path.centroid(d);

        //emit event back to chart; d -> geojson feature data
        dispatch.mapHover(d.properties.GEOID10,tIndex);

        var s = t.timeShares[tIndex];

        //Populate tooltip content
        tooltip.selectAll('p')
            .remove();
        tooltip
            .transition()
            .style('opacity',1);
        tooltip
            .append('p')
            .html((function(){
                if(s.subNeighborhood){
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.subNeighborhood+', '+s.neighborhood+')';
                }else{
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.neighborhood+')';
                }
            })())
        tooltip
            .append('p')
            .html((function(){
                return '<span class="data">'+s.trip+'</span> workers (<span class="data">'+format(s.share)+'</span>) have commutes in the '+s.time+' minute range';
            })());

        //Move visual target
        visualTarget
            .attr('transform','translate('+xy[0]+','+xy[1]+')')
            .transition()
            .style('opacity',1)

    }
    function onTractMove(d){
        var xy = d3.mouse(ctx.node());
        tooltip
            .style('left',xy[0]-90+'px')
            .style('bottom',(height+250-xy[1])+'px');
    }
    function onTractLeave(d){
        dispatch.out(); //this takes care of both map and chart
    }

    dispatch.on('chartHover',function(s){
        //update the current time share to display, would also need to update text
        tIndex = s.tIndex;
        metainfo.html(s.time);


        tracts
            .transition()
            .style('fill',function(d){
                var t = _data.get(d.properties.GEOID10);
                if(!t){return 'rgb(50,50,50)';}
                return scaleColor(t.timeShares[tIndex].share);
            })

        var xy;
        var target = tracts.filter(function(t){
                return t.properties.GEOID10 == s.geoid2;
            })
            .each(function(t){
                xy = path.centroid(t);
            })

        //display info in tooltip
        tooltip.selectAll('p')
            .remove();        
        tooltip
            .transition()
            .style('opacity',1);
        tooltip
            .style('left',xy[0]+margin.l-90+'px')
            .style('bottom',(height+margin.b-xy[1]+50)+'px');
        tooltip
            .append('p')
            .html((function(){
                if(s.subNeighborhood){
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.subNeighborhood+', '+s.neighborhood+')';
                }else{
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.neighborhood+')';
                }
            })())
        tooltip
            .append('p')
            .html((function(){
                return '<span class="data">'+s.trip+'</span> workers (<span class="data">'+format(s.share)+'</span>) have commutes in the '+s.time+' minute range';
            })())

        //Move visual target
        visualTarget
            .attr('transform','translate('+xy[0]+','+xy[1]+')')
            .transition()
            .style('opacity',1)


    });
    dispatch.on('out.map',function(){
        tooltip
            .transition()
            .style('opacity',0);
        visualTarget
            .transition()
            .style('opacity',0);
    })

}

function parseTime(d){
    //each newRow represents a census tract
    var newRow = {};

    newRow.displayName = d['GEO.display-label'];
    newRow.geoid = d['GEO.id'];
    newRow.geoid2 = d['GEO.id2'];
    newRow.total = +d.Total;
    newRow.timeShares = [];

    //Grab metadata from the global metadata map
    var m = tractMetadata.get(newRow.geoid);
    if(m == undefined || newRow.total == 0){
        //if no metadata, means tract is outside of Boston
        //if total for the tract is 0, ignore
        return;
    }else{
        newRow.neighborhood = m.neighborhood;
        newRow.subNeighborhood = m.subNeighborhood;
    }

    delete d['GEO.display-label'];
    delete d['GEO.id'];
    delete d['GEO.id2'];
    delete d.Total;

    var tIndex = 0;
    for(var key in d){
        if(newRow.total != 0){
            newRow.timeShares.push({
                displayName: newRow.displayName,
                neighborhood: newRow.neighborhood,
                subNeighborhood: newRow.subNeighborhood,
                geoid2:newRow.geoid2,
                key:newRow.geoid2+'-'+tIndex,
                time:key,
                tIndex:tIndex,
                trip:+d[key],
                share:+d[key]/newRow.total
            })
        }

        tIndex += 1;
    }

    cityTripTotal += newRow.total;

    return newRow;
}
function parseMode(d){
    return d;
}
function parseMeta(d){
    tractMetadata.set(
        d['GEO.id'],
        {
            neighborhood: d.Neighborhood,
            subNeighborhood: d['Sub-Neighborhood']?d['Sub-Neighborhood']:undefined
        }
    )
}