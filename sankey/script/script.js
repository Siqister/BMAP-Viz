/* Part 6 Rearranging DOM */


/*Start by setting up the canvas */
var margin = {t:100,r:300,b:100,l:300};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

var sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(10)
    .size([width,height]);
var path = sankey.link();

var nodes1 = [], links = [];
nodes = ["Walk","Bike","Public Transit","Auto","Other","School","Travel-related","Personal/Household Errands and Shopping","Entertainment (dining, recreational, social)","Medical","Civic"];

/* Acquire and parse data */
d3.csv('data/non_work_by_mode_2.csv', parse, dataLoaded);

function dataLoaded(err,rows){

    console.log(links);
    nodes.forEach(function(node){
        nodes1.push({'name':node})
    })
    console.log(nodes1);

    sankey
        .nodes(nodes1)
        .links(links)
        .layout(32);


    draw();
}

function draw(){



    var link = canvas.append('g').selectAll('.link')
        .data(links)
        .enter()
        .append('path')
        .attr('class','link')
        .attr('d',path)
        .style('stroke-width',function(d){return d.dy})
        .style('fill','none')
        .style('stroke','black')
        .style('stroke-opacity',.5);
    var node = canvas.append('g').selectAll('node')
        .data(nodes1)
        .enter()
        .append('g')
        .attr('class','node')
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

    node.append('rect')
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth());
    node.append('text')
        .text(function(d){return d.name});

}

function parse(row,i){
    //@param row is each unparsed row from the dataset
    var mode = row['Mode'];
    delete row['Mode'];

    for(var key in row){
        links.push({
            source:nodes.indexOf(key),
            target:nodes.indexOf(mode),
            value:+row[key]
        })
    }
}